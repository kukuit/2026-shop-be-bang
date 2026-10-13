'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CapsuleCollider, CuboidCollider, Physics, RigidBody } from '@react-three/rapier'
import { Float, Html, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import type { RapierRigidBody } from '@react-three/rapier'
import PlayerOneModel from './PlayerOneModel'
import type { CharacterMotionRef } from '../demo-3d/_components/character/types'
import { CAMERA_CONFIG } from '@/lib/control-3d/camera-config'
import { CONTROL_LEVELS, isCooldownReady, MONSTER_CONFIG, nextCooldownAt, PLAYER_CONFIG, WEAPON_CONFIG } from '@/lib/control-3d/game-rules.mjs'
import type { ControlLevelConfig, EnemyState, GameStatus, PlayerInput } from '@/lib/control-3d/types'

export type ShotTrace = { id: number; from: [number, number, number]; to: [number, number, number] }
export type WorldEffect = { id: number; kind: 'hit' | 'death' | 'gate'; position: [number, number, number] }

type Props = {
  levelIndex: number
  gameStatus: GameStatus
  respawnToken: number
  enemies: EnemyState[]
  localInputRef: React.MutableRefObject<PlayerInput>
  remoteInputRef: React.MutableRefObject<PlayerInput>
  remoteConnectedRef: React.MutableRefObject<boolean>
  mouseLookRef: React.MutableRefObject<{ x: number; y: number }>
  aimModeRef: React.MutableRefObject<boolean>
  canShootRef: React.MutableRefObject<boolean>
  onWaveTrigger: () => void
  onGateEnter: () => void
  onEnemyAttack: (damage: number) => void
  onEnemyHit: (id: string, position: [number, number, number]) => void
  onShot: (trace: Omit<ShotTrace, 'id'>) => void
  onReload: () => void
  onEmptyFire: () => void
  onCanvasCreated: (canvas: HTMLCanvasElement) => void
  shots: ShotTrace[]
  effects: WorldEffect[]
  shotVersion: number
}

type TargetMap = React.MutableRefObject<Map<string, THREE.Object3D>>
type BlockerSet = React.MutableRefObject<Set<THREE.Object3D>>
type SceneRegistry = { objects: THREE.Object3D[]; roots: Set<THREE.Object3D> }
type FoliageEntry = { root: THREE.Object3D; setOccluded: (occluded: boolean) => void }
type FoliageRegistry = { scene: SceneRegistry; entries: Map<THREE.Object3D, FoliageEntry> }
type MaterialSlot = { mesh: THREE.Mesh; original: THREE.Material | THREE.Material[]; originals: THREE.Material[]; copies: THREE.Material[] }
const SHOW_CAMERA_DEBUG = process.env.NODE_ENV === 'development'

const CAMERA_RAY_OFFSETS = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const
const CAMERA_COLLISION_FALLBACKS = [
  { side: 0.78, up: 0.12 },
  { side: -0.78, up: 0.12 },
  { side: 1.05, up: 0.28 },
  { side: -1.05, up: 0.28 },
  { side: 1.8, up: 0.35 },
  { side: -1.8, up: 0.35 },
  { side: 0, up: 2.1 },
] as const

function registerSceneObject(registry: SceneRegistry, object: THREE.Object3D | null) {
  if (!object || registry.roots.has(object)) return
  registry.roots.add(object)
  registry.objects.push(object)
  return () => {
    registry.roots.delete(object)
    const index = registry.objects.indexOf(object)
    if (index >= 0) registry.objects.splice(index, 1)
  }
}

function registerWeaponBlocker(registry: BlockerSet, object: THREE.Object3D | null) {
  if (!object || registry.current.has(object)) return
  registry.current.add(object)
  return () => { registry.current.delete(object) }
}

function registerFoliage(registry: FoliageRegistry, root: THREE.Object3D | null) {
  if (!root || registry.entries.has(root)) return
  const meshMaterials: MaterialSlot[] = []
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    const original = mesh.material
    const originals = Array.isArray(original) ? original : [original]
    meshMaterials.push({ mesh, original, originals, copies: originals.map((material) => material.clone()) })
  })

  let isOccluded = false
  const entry: FoliageEntry = {
    root,
    setOccluded(occluded) {
      if (isOccluded === occluded) return
      isOccluded = occluded
      for (const item of meshMaterials) {
        if (!occluded) {
          item.mesh.material = item.original
          continue
        }
        item.mesh.material = Array.isArray(item.original) ? item.copies : item.copies[0]
        item.copies.forEach((material, index) => {
          material.transparent = true
          material.opacity = item.originals[index].opacity * 0.2
          material.depthWrite = false
          material.needsUpdate = true
        })
      }
    },
  }
  registry.scene.objects.push(root)
  registry.scene.roots.add(root)
  registry.entries.set(root, entry)
  return () => {
    entry.setOccluded(false)
    registry.entries.delete(root)
    registry.scene.roots.delete(root)
    const index = registry.scene.objects.indexOf(root)
    if (index >= 0) registry.scene.objects.splice(index, 1)
    meshMaterials.forEach((item) => item.copies.forEach((material) => material.dispose()))
  }
}

function dampAngle(current: number, target: number, smoothness: number, delta: number) {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  return current + difference * (1 - Math.exp(-smoothness * delta))
}

function isFiniteVector3(value: THREE.Vector3) {
  return Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z)
}

function cameraOverlapsSolid(position: THREE.Vector3, blockers: SceneRegistry, bounds: THREE.Box3, sphere: THREE.Sphere) {
  sphere.center.copy(position)
  for (const object of blockers.objects) {
    object.updateWorldMatrix(true, true)
    bounds.setFromObject(object)
    if (bounds.intersectsSphere(sphere)) return true
  }
  return false
}

function getEnemyId(object: THREE.Object3D | null) {
  let current = object
  while (current) {
    if (typeof current.userData.enemyId === 'string') return current.userData.enemyId as string
    current = current.parent
  }
  return null
}

function collectOccludedFoliage(
  origin: THREE.Vector3,
  target: THREE.Vector3,
  registry: FoliageRegistry,
  raycaster: THREE.Raycaster,
  direction: THREE.Vector3,
  hits: THREE.Intersection[],
  occluded: Set<FoliageEntry>,
) {
  direction.subVectors(target, origin)
  const distance = direction.length()
  if (distance <= 0.001) return
  direction.multiplyScalar(1 / distance)
  raycaster.set(origin, direction)
  raycaster.far = distance
  hits.length = 0
  raycaster.intersectObjects(registry.scene.objects, true, hits)
  for (const hit of hits) {
    let object: THREE.Object3D | null = hit.object
    while (object && !registry.entries.has(object)) object = object.parent
    if (object) {
      const entry = registry.entries.get(object)
      if (entry) occluded.add(entry)
    }
  }
}

const START_POSITION = new THREE.Vector3(0, 0.96, -24)
const LEVEL_PALETTES: Record<ControlLevelConfig['theme'], { grass: string; path: string; leaf: string; stone: string; sky: string }> = {
  forest: { grass: '#6f9e57', path: '#c4a16b', leaf: '#39814a', stone: '#697c55', sky: '#a9d7e0' },
  'deep-forest': { grass: '#466f52', path: '#957e5e', leaf: '#286349', stone: '#536b58', sky: '#8bb7b7' },
  stone: { grass: '#91a46d', path: '#9c9882', leaf: '#537c51', stone: '#778381', sky: '#b5c7ce' },
  ruins: { grass: '#7b9168', path: '#a39779', leaf: '#426849', stone: '#8b8879', sky: '#b2c6c7' },
  citadel: { grass: '#8f8c6c', path: '#b5a689', leaf: '#50614e', stone: '#7b7779', sky: '#a9b7c5' },
}

export default function GameWorld(props: Props) {
  const targetRefs = useRef(new Map<string, THREE.Object3D>())
  const blockerRefs = useRef(new Set<THREE.Object3D>())
  const aimTargetRef = useRef(new THREE.Vector3())
  const cameraBlockers = useMemo<SceneRegistry>(() => ({ objects: [], roots: new Set() }), [])
  const foliage = useMemo<FoliageRegistry>(() => ({ scene: { objects: [], roots: new Set() }, entries: new Map() }), [])
  const playerPositionRef = useRef(new THREE.Vector3(0, START_POSITION.y, START_POSITION.z))
  const muzzleRef = useRef<THREE.Group>(null)
  const level = CONTROL_LEVELS[props.levelIndex]
  return <Canvas
    shadows
    dpr={[1, 1.4]}
    camera={{ position: [CAMERA_CONFIG.shoulderOffset, CAMERA_CONFIG.pivotHeight + CAMERA_CONFIG.cameraRaise + 0.4, START_POSITION.z - CAMERA_CONFIG.distance], fov: CAMERA_CONFIG.fov, near: CAMERA_CONFIG.near, far: CAMERA_CONFIG.far }}
    gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
    onCreated={({ gl, camera }) => {
      props.onCanvasCreated(gl.domElement)
      camera.lookAt(CAMERA_CONFIG.shoulderOffset, CAMERA_CONFIG.pivotHeight, START_POSITION.z)
      camera.updateMatrixWorld()
    }}
    onContextMenu={(event) => event.preventDefault()}
  >
    <color attach="background" args={[level.theme === 'citadel' ? '#a9b7c5' : '#a9d7e0']} />
    <fog attach="fog" args={[level.theme === 'citadel' ? '#9daab6' : '#9ccad1', 36, 92]} />
    <ambientLight intensity={1.25} />
    <hemisphereLight args={['#d9f4ff', '#4a6645', 1.25]} />
    <directionalLight position={[-12, 22, -10]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={34} shadow-camera-bottom={-34} shadow-bias={-0.0003} />
    <Physics gravity={[0, -18, 0]} timeStep={1 / 60} interpolate>
      <WorldStage key={props.levelIndex} levelIndex={props.levelIndex} gateOpen={props.gameStatus === 'LEVEL_CLEAR'} blockersRef={blockerRefs} cameraBlockers={cameraBlockers} foliage={foliage} />
      <PlayerController {...props} aimTargetRef={aimTargetRef} playerPositionRef={playerPositionRef} muzzleRef={muzzleRef} cameraBlockers={cameraBlockers} foliage={foliage} />
      {props.enemies.map((enemy) => <Monster key={enemy.id} enemy={enemy} active={props.gameStatus === 'PLAYING'} playerPositionRef={playerPositionRef} obstacles={level.obstacles} targetRefs={targetRefs} onAttack={props.onEnemyAttack} />)}
      <Gate levelIndex={props.levelIndex} open={props.gameStatus === 'LEVEL_CLEAR'} cameraBlockers={cameraBlockers} blockersRef={blockerRefs} />
      <WeaponLoop {...props} aimTargetRef={aimTargetRef} cameraBlockers={cameraBlockers} targetRefs={targetRefs} blockerRefs={blockerRefs} muzzleRef={muzzleRef} />
      {props.shots.map((shot) => <ShotTracer key={shot.id} shot={shot} />)}
      {props.effects.map((effect) => <Effect key={effect.id} effect={effect} />)}
    </Physics>
    <Sparkles count={24} scale={[13, 4, 52]} position={[0, 4, 0]} size={2} speed={0.18} opacity={0.28} color="#fff4b0" />
  </Canvas>
}

function WorldStage({ levelIndex, gateOpen, blockersRef, cameraBlockers, foliage }: { levelIndex: number; gateOpen: boolean; blockersRef: BlockerSet; cameraBlockers: SceneRegistry; foliage: FoliageRegistry }) {
  const level = CONTROL_LEVELS[levelIndex]
  const palettes = LEVEL_PALETTES[level.theme as ControlLevelConfig['theme']]
  const terrain = useRef<THREE.Group>(null)
  const roadside = useMemo(() => Array.from({ length: 20 }, (_, index) => ({
    side: index % 2 ? 1 : -1,
    z: -29 + index * 3.1,
    x: 9.8 + (index % 3) * 0.9,
    size: 0.78 + (index % 4) * 0.16,
  })), [])

  useEffect(() => {
    const removeCameraTerrain = registerSceneObject(cameraBlockers, terrain.current)
    const removeWeaponTerrain = registerWeaponBlocker(blockersRef, terrain.current)
    return () => { removeCameraTerrain?.(); removeWeaponTerrain?.() }
  }, [blockersRef, cameraBlockers])

  return <group>
    <RigidBody type="fixed" colliders={false} position={[0, -0.3, 0]}><CuboidCollider args={[34, 0.3, 38]} /></RigidBody>
    <group ref={terrain}>
      <mesh receiveShadow position={[0, -0.31, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[180, 180]} /><meshStandardMaterial color={palettes.grass} roughness={1} />
      </mesh>
      <mesh receiveShadow position={[0, -0.1, 0]}>
        <boxGeometry args={[16, 0.22, 60]} /><meshStandardMaterial color={palettes.path} roughness={0.94} />
      </mesh>
      <mesh receiveShadow position={[0, 0.02, -1]}>
        <boxGeometry args={[8.8, 0.035, 48]} /><meshStandardMaterial color={level.theme === 'stone' ? '#b5b1a2' : '#d3b980'} roughness={0.9} />
      </mesh>
    </group>
    {[-1, 1].map((side) => <group key={side}>
      <RigidBody type="fixed" colliders={false} position={[side * 8.5, 1.25, 0]}><CuboidCollider args={[0.38, 1.25, 31]} /></RigidBody>
      <CameraWall side={side} color={palettes.stone} cameraBlockers={cameraBlockers} blockersRef={blockersRef} />
      <mesh position={[side * 9, 0.14, 0]}><boxGeometry args={[2, 0.22, 62]} /><meshStandardMaterial color={palettes.leaf} roughness={1} /></mesh>
    </group>)}
    <RigidBody type="fixed" colliders={false} position={[0, 1, -30.4]}><CuboidCollider args={[8.5, 1, 0.5]} /></RigidBody>
    <RigidBody type="fixed" colliders={false} position={[0, 0.15, 31.8]}><CuboidCollider args={[8.5, 0.3, 0.4]} /></RigidBody>
    {roadside.map((item, index) => <TreeDecoration key={index} x={item.side * item.x} z={item.z} size={item.size} leaf={palettes.leaf} cameraBlockers={cameraBlockers} foliage={foliage} />)}
    {level.obstacles.map((obstacle, index) => <WorldObstacle key={`${level.seed}-${index}`} obstacle={obstacle} palette={palettes} blockersRef={blockersRef} cameraBlockers={cameraBlockers} foliage={foliage} />)}
    <mesh position={[0, 0.03, -24.5]}><ringGeometry args={[1.1, 1.28, 32]} /><meshBasicMaterial color="#76e5e9" transparent opacity={0.58} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 0.02, -7]}><ringGeometry args={[4.9, 5.05, 48]} /><meshBasicMaterial color="#f5d977" transparent opacity={0.65} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 5.1, 5]}><sphereGeometry args={[0.3, 8, 6]} /><meshBasicMaterial color={palettes.sky} transparent opacity={0.38} /></mesh>
    {!gateOpen && <mesh position={[0, 0.16, 25.9]}><ringGeometry args={[2.7, 2.84, 48]} /><meshBasicMaterial color="#ee6e57" transparent opacity={0.52} side={THREE.DoubleSide} /></mesh>}
  </group>
}

function CameraWall({ side, color, cameraBlockers, blockersRef }: { side: number; color: string; cameraBlockers: SceneRegistry; blockersRef: BlockerSet }) {
  const wall = useRef<THREE.Group>(null)
  useEffect(() => {
    const removeCameraWall = registerSceneObject(cameraBlockers, wall.current)
    const removeWeaponWall = registerWeaponBlocker(blockersRef, wall.current)
    return () => { removeCameraWall?.(); removeWeaponWall?.() }
  }, [blockersRef, cameraBlockers])
  return <group ref={wall} position={[side * 8.5, 1.25, 0]}>
    <mesh castShadow receiveShadow><boxGeometry args={[0.72, 2.5, 62]} /><meshStandardMaterial color={color} flatShading roughness={0.96} /></mesh>
  </group>
}

function TreeDecoration({ x, z, size, leaf, cameraBlockers, foliage }: { x: number; z: number; size: number; leaf: string; cameraBlockers: SceneRegistry; foliage: FoliageRegistry }) {
  const trunk = useRef<THREE.Group>(null)
  const leaves = useRef<THREE.Group>(null)
  useEffect(() => registerSceneObject(cameraBlockers, trunk.current), [cameraBlockers])
  useEffect(() => registerFoliage(foliage, leaves.current), [foliage])
  return <group position={[x, 0, z]} scale={size}>
    <group ref={trunk}><mesh castShadow position={[0, 1.2, 0]}><cylinderGeometry args={[0.28, 0.45, 2.4, 6]} /><meshStandardMaterial color="#765137" flatShading roughness={1} /></mesh></group>
    <group ref={leaves}>
      <mesh castShadow position={[0, 3.05, 0]}><dodecahedronGeometry args={[1.45, 0]} /><meshStandardMaterial color={leaf} flatShading roughness={1} /></mesh>
      <mesh castShadow position={[-0.52, 2.48, 0.1]} scale={0.74}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial color={leaf} flatShading roughness={1} /></mesh>
      <mesh castShadow position={[0.52, 2.5, -0.1]} scale={0.7}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial color={leaf} flatShading roughness={1} /></mesh>
    </group>
  </group>
}

function WorldObstacle({ obstacle, palette, blockersRef, cameraBlockers, foliage }: { obstacle: (typeof CONTROL_LEVELS)[number]['obstacles'][number]; palette: { stone: string; leaf: string }; blockersRef: BlockerSet; cameraBlockers: SceneRegistry; foliage: FoliageRegistry }) {
  const group = useRef<THREE.Group>(null)
  const cameraSolid = useRef<THREE.Group>(null)
  const leaves = useRef<THREE.Group>(null)
  const isTree = obstacle.kind === 'tree'
  const isTall = obstacle.kind === 'tree' || obstacle.kind === 'pillar'
  useEffect(() => {
    const value = group.current
    const blockers = blockersRef.current
    if (value) blockers.add(value)
    return () => { if (value) blockers.delete(value) }
  }, [blockersRef])
  useEffect(() => registerSceneObject(cameraBlockers, cameraSolid.current), [cameraBlockers])
  useEffect(() => isTree ? registerFoliage(foliage, leaves.current) : undefined, [foliage, isTree])
  const height = isTall ? 3 : 1.3
  return <RigidBody type="fixed" colliders={false} position={[obstacle.x, 0, obstacle.z]}>
    <CuboidCollider args={[obstacle.radius * 0.58, height / 2, obstacle.radius * 0.58]} position={[0, height / 2, 0]} />
    <group ref={group}>
      <group ref={cameraSolid}>
        {isTree ? <mesh castShadow position={[0, 1, 0]}><cylinderGeometry args={[0.25, 0.36, 2, 6]} /><meshStandardMaterial color="#755239" flatShading /></mesh>
          : obstacle.kind === 'pillar' ? <>
            <mesh castShadow position={[0, 1.45, 0]}><cylinderGeometry args={[0.5, 0.64, 2.9, 6]} /><meshStandardMaterial color={palette.stone} flatShading /></mesh>
            <mesh position={[0, 3.02, 0]}><boxGeometry args={[1.35, 0.25, 1.35]} /><meshStandardMaterial color="#d1c299" flatShading /></mesh>
          </> : obstacle.kind === 'crate' ? <mesh castShadow position={[0, 0.67, 0]} rotation={[0.04, 0.2, 0]}><boxGeometry args={[1.3, 1.3, 1.3]} /><meshStandardMaterial color="#88613d" flatShading /></mesh>
            : <mesh castShadow position={[0, 0.62, 0]} rotation={[0.14, 0.2, 0.08]}><dodecahedronGeometry args={[0.85, 0]} /><meshStandardMaterial color={palette.stone} flatShading roughness={1} /></mesh>}
      </group>
      {isTree && <group ref={leaves}>
        <mesh castShadow position={[0, 2.75, 0]}><dodecahedronGeometry args={[1.1, 0]} /><meshStandardMaterial color={palette.leaf} flatShading /></mesh>
      </group>}
    </group>
  </RigidBody>
}

function PlayerController({ levelIndex, gameStatus, respawnToken, localInputRef, remoteInputRef, remoteConnectedRef, mouseLookRef, aimModeRef, playerPositionRef, muzzleRef, aimTargetRef, cameraBlockers, foliage, shotVersion, onWaveTrigger, onGateEnter }: Props & { aimTargetRef: React.MutableRefObject<THREE.Vector3>; playerPositionRef: React.MutableRefObject<THREE.Vector3>; muzzleRef: React.MutableRefObject<THREE.Group | null>; cameraBlockers: SceneRegistry; foliage: FoliageRegistry }) {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<THREE.Group>(null)
  const yaw = useRef(0)
  const pitch = useRef(0)
  const cameraYaw = useRef(0)
  const cameraPitch = useRef(0)
  const cameraTarget = useRef(new THREE.Vector3())
  const desiredCamera = useRef(new THREE.Vector3())
  const cameraSafePosition = useRef(new THREE.Vector3())
  const cameraLookTarget = useRef(new THREE.Vector3())
  const cameraHorizontalForward = useRef(new THREE.Vector3())
  const cameraForward = useRef(new THREE.Vector3())
  const cameraWorldUp = useRef(new THREE.Vector3())
  const cameraRight = useRef(new THREE.Vector3())
  const cameraOffsetDirection = useRef(new THREE.Vector3())
  const cameraCollisionUp = useRef(new THREE.Vector3())
  const cameraRayOrigin = useRef(new THREE.Vector3())
  const playerBase = useRef(new THREE.Vector3())
  const occlusionDirection = useRef(new THREE.Vector3())
  const occlusionHits = useRef<THREE.Intersection[]>([])
  const collisionHits = useRef<THREE.Intersection[]>([])
  const currentOccluded = useRef(new Set<FoliageEntry>())
  const nextOccluded = useRef(new Set<FoliageEntry>())
  const collisionBounds = useRef(new THREE.Box3())
  const collisionSphere = useRef(new THREE.Sphere(new THREE.Vector3(), CAMERA_CONFIG.collisionRadius))
  const cameraCollisionRaycaster = useMemo(() => new THREE.Raycaster(), [])
  const foliageRaycaster = useMemo(() => new THREE.Raycaster(), [])
  const cameraMode = useRef<{ distance: number; shoulderOffset: number; fov: number }>({ distance: CAMERA_CONFIG.distance, shoulderOffset: CAMERA_CONFIG.shoulderOffset, fov: CAMERA_CONFIG.fov })
  const jumpWasDown = useRef(false)
  const waveTriggered = useRef(false)
  const gateTriggered = useRef(false)
  const motion: CharacterMotionRef = useRef({ speed: 0, verticalVelocity: 0, grounded: true, jumpStarted: false, justLanded: false })
  const cameraDistance = useRef<number>(CAMERA_CONFIG.distance)
  const cameraDebug = useRef<HTMLPreElement>(null)
  const debugMuzzlePosition = useRef(new THREE.Vector3())
  const characterVisibilityDistance = useRef<number>(CAMERA_CONFIG.distance)
  const { camera } = useThree()

  useEffect(() => {
    if (!body.current) return
    body.current.setTranslation(START_POSITION, true)
    body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
    yaw.current = 0
    pitch.current = CAMERA_CONFIG.initialPitch
    cameraYaw.current = 0
    cameraPitch.current = CAMERA_CONFIG.initialPitch
    cameraDistance.current = CAMERA_CONFIG.distance
    cameraMode.current.distance = CAMERA_CONFIG.distance
    cameraMode.current.shoulderOffset = CAMERA_CONFIG.shoulderOffset
    cameraMode.current.fov = CAMERA_CONFIG.fov
    currentOccluded.current.forEach((entry) => entry.setOccluded(false))
    nextOccluded.current.forEach((entry) => entry.setOccluded(false))
    currentOccluded.current.clear()
    nextOccluded.current.clear()
    waveTriggered.current = false
    gateTriggered.current = false
  }, [levelIndex, respawnToken])

  useEffect(() => () => {
    currentOccluded.current.forEach((entry) => entry.setOccluded(false))
    nextOccluded.current.forEach((entry) => entry.setOccluded(false))
    currentOccluded.current.clear()
    nextOccluded.current.clear()
  }, [])

  useFrame((state, delta) => {
    const rigidBody = body.current
    if (!rigidBody) return
    const dt = Math.min(delta, 0.04)
    const remote = remoteConnectedRef.current
    const input = remote ? remoteInputRef.current : localInputRef.current
    const position = rigidBody.translation()
    const active = gameStatus === 'PLAYING' || gameStatus === 'LEVEL_CLEAR'

    if (active && remote) {
      // The phone controller sends horizontal drag with the opposite screen-space sign; camera yaw increases toward world +X.
      yaw.current -= input.aimX * PLAYER_CONFIG.rotationSpeed * dt
      pitch.current = THREE.MathUtils.clamp(pitch.current - input.aimY * PLAYER_CONFIG.rotationSpeed * dt, CAMERA_CONFIG.minPitch, CAMERA_CONFIG.maxPitch)
    } else if (!remote) {
      const look = mouseLookRef.current
      if (active) {
        // Match the player's observed mouse direction: moving right turns the view to the right.
        yaw.current -= look.x
        pitch.current = THREE.MathUtils.clamp(pitch.current - look.y, CAMERA_CONFIG.minPitch, CAMERA_CONFIG.maxPitch)
      }
      look.x = 0
      look.y = 0
    }
    yaw.current = Math.atan2(Math.sin(yaw.current), Math.cos(yaw.current))

    const velocity = rigidBody.linvel()
    if (active) {
      const forwardX = Math.sin(yaw.current), forwardZ = Math.cos(yaw.current)
      const rightX = -Math.cos(yaw.current), rightZ = Math.sin(yaw.current)
      let moveX = rightX * input.moveX + forwardX * input.moveY
      let moveZ = rightZ * input.moveX + forwardZ * input.moveY
      const length = Math.hypot(moveX, moveZ)
      if (length > 1) { moveX /= length; moveZ /= length }
      const grounded = position.y <= 1.08
      const jumpPressed = input.jump && !jumpWasDown.current
      if (jumpPressed && grounded) {
        rigidBody.setLinvel({ x: moveX * PLAYER_CONFIG.moveSpeed, y: PLAYER_CONFIG.jumpForce, z: moveZ * PLAYER_CONFIG.moveSpeed }, true)
        motion.current.jumpStarted = true
        motion.current.grounded = false
      } else {
        rigidBody.setLinvel({ x: moveX * PLAYER_CONFIG.moveSpeed, y: velocity.y, z: moveZ * PLAYER_CONFIG.moveSpeed }, true)
        motion.current.jumpStarted = false
        motion.current.grounded = grounded
      }
      jumpWasDown.current = input.jump
      motion.current.speed = Math.hypot(moveX, moveZ) * PLAYER_CONFIG.moveSpeed
      motion.current.verticalVelocity = velocity.y
      if (visual.current) visual.current.rotation.y = yaw.current

      if (!waveTriggered.current && position.z >= -7) {
        waveTriggered.current = true
        onWaveTrigger()
      }
      if (!gateTriggered.current && position.z >= 24.1 && gameStatus === 'LEVEL_CLEAR') {
        gateTriggered.current = true
        onGateEnter()
      }
    } else {
      rigidBody.setLinvel({ x: 0, y: velocity.y, z: 0 }, true)
      motion.current.speed = 0
      jumpWasDown.current = input.jump
    }

    const hasValidPlayerPosition = Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z)
    if (hasValidPlayerPosition) playerPositionRef.current.set(position.x, position.y, position.z)
    const safePlayer = hasValidPlayerPosition ? position : playerPositionRef.current
    const safeX = Number.isFinite(safePlayer.x) ? safePlayer.x : START_POSITION.x
    const safeY = Number.isFinite(safePlayer.y) ? safePlayer.y : START_POSITION.y
    const safeZ = Number.isFinite(safePlayer.z) ? safePlayer.z : START_POSITION.z
    const groundY = safeY - START_POSITION.y
    playerBase.current.set(safeX, groundY, safeZ)
    cameraTarget.current.set(safeX, groundY + CAMERA_CONFIG.pivotHeight, safeZ)

    const aiming = !remote && aimModeRef.current
    const targetDistance = aiming ? CAMERA_CONFIG.aimDistance : CAMERA_CONFIG.distance
    const targetShoulder = aiming ? CAMERA_CONFIG.aimShoulderOffset : CAMERA_CONFIG.shoulderOffset
    const targetFov = aiming ? CAMERA_CONFIG.aimFov : CAMERA_CONFIG.fov
    const transitionLambda = Math.log(100) / CAMERA_CONFIG.aimTransitionTime
    cameraMode.current.distance = THREE.MathUtils.damp(cameraMode.current.distance, targetDistance, transitionLambda, dt)
    cameraMode.current.shoulderOffset = THREE.MathUtils.damp(cameraMode.current.shoulderOffset, targetShoulder, transitionLambda, dt)
    cameraMode.current.fov = THREE.MathUtils.damp(cameraMode.current.fov, targetFov, transitionLambda, dt)
    const perspectiveCamera = camera as THREE.PerspectiveCamera
    if (Math.abs(perspectiveCamera.fov - cameraMode.current.fov) > 0.001) {
      perspectiveCamera.fov = cameraMode.current.fov
      perspectiveCamera.updateProjectionMatrix()
    }

    const rotateSmoothness = 1 / CAMERA_CONFIG.rotationSmoothTime
    cameraYaw.current = dampAngle(cameraYaw.current, yaw.current, rotateSmoothness, dt)
    cameraPitch.current = THREE.MathUtils.damp(cameraPitch.current, pitch.current, rotateSmoothness, dt)
    cameraPitch.current = THREE.MathUtils.clamp(cameraPitch.current, CAMERA_CONFIG.minPitch, CAMERA_CONFIG.maxPitch)
    const cosPitch = Math.cos(cameraPitch.current)
    cameraHorizontalForward.current.set(Math.sin(cameraYaw.current), 0, Math.cos(cameraYaw.current))
    cameraRight.current.set(Math.cos(cameraYaw.current), 0, -Math.sin(cameraYaw.current))
    cameraForward.current.set(cameraHorizontalForward.current.x * cosPitch, Math.sin(cameraPitch.current), cameraHorizontalForward.current.z * cosPitch).normalize()
    cameraWorldUp.current.crossVectors(cameraForward.current, cameraRight.current).normalize()

    // The +Z camera basis puts P1 on screen-right when the camera sits on world-right.
    desiredCamera.current.copy(cameraTarget.current)
      .addScaledVector(cameraForward.current, -cameraMode.current.distance)
      .addScaledVector(cameraRight.current, cameraMode.current.shoulderOffset)
      .addScaledVector(cameraWorldUp.current, CAMERA_CONFIG.cameraRaise)
    cameraOffsetDirection.current.subVectors(desiredCamera.current, cameraTarget.current)
    const desiredDistance = THREE.MathUtils.clamp(cameraOffsetDirection.current.length(), CAMERA_CONFIG.minDistance, CAMERA_CONFIG.maxDistance)
    if (desiredDistance > 0.001) cameraOffsetDirection.current.multiplyScalar(1 / desiredDistance)
    else cameraOffsetDirection.current.set(0, 0, -1)
    desiredCamera.current.copy(cameraTarget.current).addScaledVector(cameraOffsetDirection.current, desiredDistance)
    desiredCamera.current.y = Math.max(0.3, desiredCamera.current.y)
    cameraOffsetDirection.current.subVectors(desiredCamera.current, cameraTarget.current).normalize()
    cameraCollisionUp.current.crossVectors(cameraRight.current, cameraOffsetDirection.current).normalize()

    let safeDistance = desiredDistance
    let cameraBlocked = false
    cameraCollisionRaycaster.far = desiredDistance + CAMERA_CONFIG.collisionPadding
    for (const [rightAmount, upAmount] of CAMERA_RAY_OFFSETS) {
      cameraRayOrigin.current.copy(cameraTarget.current)
        .addScaledVector(cameraRight.current, rightAmount * CAMERA_CONFIG.collisionRadius)
        .addScaledVector(cameraCollisionUp.current, upAmount * CAMERA_CONFIG.collisionRadius)
      cameraCollisionRaycaster.set(cameraRayOrigin.current, cameraOffsetDirection.current)
      collisionHits.current.length = 0
      cameraCollisionRaycaster.intersectObjects(cameraBlockers.objects, true, collisionHits.current)
      const nearestHit = collisionHits.current[0]
      if (nearestHit && nearestHit.distance < safeDistance + CAMERA_CONFIG.collisionPadding) {
        safeDistance = Math.min(safeDistance, Math.max(CAMERA_CONFIG.minDistance, nearestHit.distance - CAMERA_CONFIG.collisionPadding))
        cameraBlocked = true
      }
    }

    if (cameraBlocked) cameraDistance.current = Math.min(cameraDistance.current, safeDistance)
    else cameraDistance.current = THREE.MathUtils.damp(cameraDistance.current, desiredDistance, 1 / CAMERA_CONFIG.positionSmoothTime, dt)
    cameraDistance.current = THREE.MathUtils.clamp(cameraDistance.current, CAMERA_CONFIG.minDistance, CAMERA_CONFIG.maxDistance)
    cameraSafePosition.current.copy(cameraTarget.current).addScaledVector(cameraOffsetDirection.current, cameraDistance.current)
    cameraSafePosition.current.y = Math.max(0.3, cameraSafePosition.current.y)
    collisionSphere.current.radius = CAMERA_CONFIG.collisionRadius
    let endpointBlocked = cameraOverlapsSolid(cameraSafePosition.current, cameraBlockers, collisionBounds.current, collisionSphere.current)
    if (endpointBlocked) {
      cameraBlocked = true
      for (let attempt = 0; attempt < 10 && cameraDistance.current > CAMERA_CONFIG.minDistance; attempt += 1) {
        cameraDistance.current = Math.max(CAMERA_CONFIG.minDistance, cameraDistance.current - CAMERA_CONFIG.collisionPadding)
        cameraSafePosition.current.copy(cameraTarget.current).addScaledVector(cameraOffsetDirection.current, cameraDistance.current)
        cameraSafePosition.current.y = Math.max(0.3, cameraSafePosition.current.y)
        endpointBlocked = cameraOverlapsSolid(cameraSafePosition.current, cameraBlockers, collisionBounds.current, collisionSphere.current)
        if (!endpointBlocked) break
      }
    }

    if (!Number.isFinite(cameraDistance.current)) cameraDistance.current = CAMERA_CONFIG.distance
    const currentCameraDistance = camera.position.distanceTo(cameraTarget.current)
    const invalidCamera = !isFiniteVector3(camera.position) || !Number.isFinite(currentCameraDistance)
      || currentCameraDistance > CAMERA_CONFIG.maxDistance + CAMERA_CONFIG.shoulderOffset + CAMERA_CONFIG.cameraRaise + 0.8
    if (endpointBlocked) {
      let foundRecoveryPosition = false
      CAMERA_COLLISION_FALLBACKS.forEach(({ side, up }) => {
        if (foundRecoveryPosition) return
        cameraSafePosition.current.copy(cameraTarget.current)
          .addScaledVector(cameraOffsetDirection.current, CAMERA_CONFIG.minDistance)
          .addScaledVector(cameraRight.current, side)
          .addScaledVector(cameraWorldUp.current, up)
        if (!cameraOverlapsSolid(cameraSafePosition.current, cameraBlockers, collisionBounds.current, collisionSphere.current)) {
          cameraDistance.current = cameraSafePosition.current.distanceTo(cameraTarget.current)
          endpointBlocked = false
          foundRecoveryPosition = true
        }
      })
    }

    const followAlpha = 1 - Math.exp(-dt / CAMERA_CONFIG.positionSmoothTime)
    if (!isFiniteVector3(cameraSafePosition.current)) {
      cameraSafePosition.current.set(safeX, groundY + CAMERA_CONFIG.pivotHeight, safeZ)
        .addScaledVector(cameraWorldUp.current, CAMERA_CONFIG.cameraRaise)
        .addScaledVector(cameraRight.current, cameraMode.current.shoulderOffset)
        .addScaledVector(cameraForward.current, -CAMERA_CONFIG.minDistance)
    }
    if (invalidCamera) camera.position.copy(cameraSafePosition.current)
    else camera.position.lerp(cameraSafePosition.current, followAlpha)
    camera.position.y = Math.max(0.3, camera.position.y)
    if (cameraOverlapsSolid(camera.position, cameraBlockers, collisionBounds.current, collisionSphere.current)) {
      camera.position.copy(cameraSafePosition.current)
    }
    characterVisibilityDistance.current = camera.position.distanceTo(cameraTarget.current)
    cameraLookTarget.current.copy(camera.position).addScaledVector(cameraForward.current, CAMERA_CONFIG.aimLookDistance)
    camera.lookAt(cameraLookTarget.current)
    camera.updateMatrixWorld()
    camera.getWorldDirection(cameraForward.current)
    cameraWorldUp.current.crossVectors(cameraForward.current, cameraRight.current).normalize()
    cameraLookTarget.current.copy(aimTargetRef.current)
    if (visual.current) visual.current.rotation.y = Math.atan2(cameraForward.current.x, cameraForward.current.z)

    if (SHOW_CAMERA_DEBUG && cameraDebug.current) {
      muzzleRef.current?.getWorldPosition(debugMuzzlePosition.current)
      cameraDebug.current.textContent = [
        `camera distance: ${cameraDistance.current.toFixed(2)} | shoulder: ${cameraMode.current.shoulderOffset.toFixed(2)} | mode: ${aiming ? 'aim' : 'explore'} | collision: ${cameraBlocked || endpointBlocked ? 'yes' : 'no'}`,
        `pivot: ${cameraTarget.current.x.toFixed(2)}, ${cameraTarget.current.y.toFixed(2)}, ${cameraTarget.current.z.toFixed(2)}`,
        `camera: ${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}`,
        `aim target: ${aimTargetRef.current.x.toFixed(2)}, ${aimTargetRef.current.y.toFixed(2)}, ${aimTargetRef.current.z.toFixed(2)}`,
        `muzzle: ${debugMuzzlePosition.current.x.toFixed(2)}, ${debugMuzzlePosition.current.y.toFixed(2)}, ${debugMuzzlePosition.current.z.toFixed(2)}`,
      ].join('\n')
    }

    nextOccluded.current.clear()
    collectOccludedFoliage(camera.position, cameraTarget.current, foliage, foliageRaycaster, occlusionDirection.current, occlusionHits.current, nextOccluded.current)
    collectOccludedFoliage(camera.position, cameraLookTarget.current, foliage, foliageRaycaster, occlusionDirection.current, occlusionHits.current, nextOccluded.current)
    currentOccluded.current.forEach((entry) => {
      if (!nextOccluded.current.has(entry)) entry.setOccluded(false)
    })
    nextOccluded.current.forEach((entry) => {
      if (!currentOccluded.current.has(entry)) entry.setOccluded(true)
    })
    const previousOcclusion = currentOccluded.current
    currentOccluded.current = nextOccluded.current
    nextOccluded.current = previousOcclusion
  })

  return <>
    {SHOW_CAMERA_DEBUG && <Html fullscreen style={{ pointerEvents: 'none' }}>
      <pre ref={cameraDebug} style={{ position: 'absolute', top: 10, left: 10, margin: 0, padding: '7px 9px', borderRadius: 6, color: '#dff8ff', background: '#102330d9', font: '10px/1.45 monospace', pointerEvents: 'none' }} />
    </Html>}
    <RigidBody ref={body} type="dynamic" colliders={false} position={[0, START_POSITION.y, START_POSITION.z]} enabledRotations={[false, false, false]} linearDamping={8} angularDamping={10} ccd>
      <CapsuleCollider args={[0.53, 0.4]} friction={0.05} restitution={0} />
      <group ref={visual} position-y={-START_POSITION.y}>
        <PlayerOneModel motion={motion} cameraDistance={characterVisibilityDistance} fadeStartDistance={CAMERA_CONFIG.fadeStartDistance} fadeEndDistance={CAMERA_CONFIG.fadeEndDistance} muzzleRef={muzzleRef} shotVersion={shotVersion} />
      </group>
    </RigidBody>
  </>
}

function Monster({ enemy, active, playerPositionRef, obstacles, targetRefs, onAttack }: { enemy: EnemyState; active: boolean; playerPositionRef: React.MutableRefObject<THREE.Vector3>; obstacles: (typeof CONTROL_LEVELS)[number]['obstacles']; targetRefs: TargetMap; onAttack: (damage: number) => void }) {
  const group = useRef<THREE.Group>(null)
  const hpFill = useRef<THREE.Mesh>(null)
  const tellRing = useRef<THREE.Mesh>(null)
  const attackAt = useRef(0)
  const tellUntil = useRef(0)
  const tellActive = useRef(false)
  const flashUntil = useRef(0)
  const previousHealth = useRef(enemy.health)
  const config = MONSTER_CONFIG[enemy.kind]
  const colorMaterial = useRef<THREE.MeshStandardMaterial>(null)
  const healthPercent = enemy.health / enemy.maxHealth

  useEffect(() => {
    const target = group.current
    const targets = targetRefs.current
    if (target) {
      target.userData.enemyId = enemy.id
      targets.set(enemy.id, target)
    }
    return () => { if (targets.get(enemy.id) === target) targets.delete(enemy.id) }
  }, [enemy.id, targetRefs])

  useEffect(() => {
    if (enemy.health < previousHealth.current) flashUntil.current = performance.now() + 110
    previousHealth.current = enemy.health
  }, [enemy.health])

  useFrame((state, delta) => {
    const model = group.current
    if (!model) return
    const dt = Math.min(delta, 0.04)
    const now = state.clock.elapsedTime
    if (colorMaterial.current) colorMaterial.current.emissiveIntensity = performance.now() < flashUntil.current ? 0.75 : 0.02
    if (tellRing.current) {
      tellRing.current.visible = tellActive.current
      tellRing.current.scale.setScalar(tellActive.current ? 1 + Math.sin(now * 13) * 0.07 : 1)
    }
    if (!active) return
    const player = playerPositionRef.current
    const dx = player.x - model.position.x
    const dz = player.z - model.position.z
    const distance = Math.hypot(dx, dz)
    model.rotation.y = Math.atan2(dx, dz)

    if (distance > config.attackRange) {
      tellActive.current = false
      const moveDistance = Math.min(config.speed * dt, Math.max(0, distance - config.attackRange * 0.8))
      const stepX = distance > 0 ? dx / distance * moveDistance : 0
      const stepZ = distance > 0 ? dz / distance * moveDistance : 0
      let nextX = THREE.MathUtils.clamp(model.position.x + stepX, -7.2, 7.2)
      let nextZ = THREE.MathUtils.clamp(model.position.z + stepZ, -28, 22.8)
      for (const obstacle of obstacles) {
        const gap = Math.hypot(nextX - obstacle.x, nextZ - obstacle.z)
        if (gap < obstacle.radius + 0.7) { nextX = model.position.x; nextZ = model.position.z; break }
      }
      model.position.x = nextX
      model.position.z = nextZ
      return
    }

    if (enemy.kind === 'boss' && now >= attackAt.current && !tellActive.current) {
      tellActive.current = true
      tellUntil.current = now + (MONSTER_CONFIG.boss.telegraph ?? 0.7)
      attackAt.current = now + config.attackCooldown
    }
    if (enemy.kind === 'boss' && tellActive.current && now >= tellUntil.current) {
      tellActive.current = false
      onAttack(config.damage)
    } else if (enemy.kind !== 'boss' && now >= attackAt.current) {
      attackAt.current = now + config.attackCooldown
      onAttack(config.damage)
    }
  })

  const scale = config.scale
  const boss = enemy.kind === 'boss'
  const fast = enemy.kind === 'fast'
  return <group ref={group} position={[enemy.x, 0, enemy.z]} scale={scale}>
    <mesh castShadow position={[0, 0.83, 0]}>
      {boss ? <dodecahedronGeometry args={[0.8, 1]} /> : <capsuleGeometry args={[fast ? 0.36 : 0.46, 0.62, 4, 7]} />}
      <meshStandardMaterial ref={colorMaterial} color={config.tint} roughness={0.82} flatShading emissive="#ff5638" emissiveIntensity={0.02} />
    </mesh>
    <mesh castShadow position={[0, 1.68, 0.06]}><icosahedronGeometry args={[boss ? 0.63 : 0.49, 1]} /><meshStandardMaterial color={fast ? '#c696e8' : boss ? '#8d4f53' : '#b7b664'} flatShading roughness={0.7} /></mesh>
    <mesh position={[0.17, 1.72, 0.48]}><sphereGeometry args={[boss ? 0.12 : 0.075, 7, 6]} /><meshBasicMaterial color="#ffec8a" /></mesh>
    <mesh position={[-0.17, 1.72, 0.48]}><sphereGeometry args={[boss ? 0.12 : 0.075, 7, 6]} /><meshBasicMaterial color="#ffec8a" /></mesh>
    {fast ? <>
      {[-0.3, 0.3].map((x) => <mesh key={x} castShadow position={[x, 2.12, 0.05]} rotation={[0, 0, x * -0.55]}><coneGeometry args={[0.17, 0.7, 5]} /><meshStandardMaterial color="#6c51b8" flatShading /></mesh>)}
    </> : <>
      {[-0.38, 0.38].map((x) => <mesh key={x} castShadow position={[x, 2.04, 0.02]} rotation={[0, 0, x * -0.3]}><coneGeometry args={[0.2, boss ? 0.88 : 0.5, 5]} /><meshStandardMaterial color={boss ? '#e9a352' : '#b7a05c'} flatShading /></mesh>)}
    </>}
    <group position={[0, boss ? 3.18 : 2.53, 0]}>
      <mesh><planeGeometry args={[1.2, 0.13]} /><meshBasicMaterial color="#421f27" side={THREE.DoubleSide} /></mesh>
      <mesh ref={hpFill} position={[-(1 - healthPercent) * 0.58, 0, 0.012]} scale-x={Math.max(0.01, healthPercent)}><planeGeometry args={[1.14, 0.075]} /><meshBasicMaterial color={boss ? '#ffd361' : '#7ff075'} side={THREE.DoubleSide} /></mesh>
    </group>
    {boss && <mesh ref={tellRing} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} visible={false}>
      <ringGeometry args={[1.15, 1.35, 32]} /><meshBasicMaterial color="#ff6655" transparent opacity={0.78} side={THREE.DoubleSide} />
    </mesh>}
  </group>
}

function Gate({ levelIndex, open, cameraBlockers, blockersRef }: { levelIndex: number; open: boolean; cameraBlockers: SceneRegistry; blockersRef: BlockerSet }) {
  const frame = useRef<THREE.Group>(null)
  useEffect(() => {
    const removeCameraGate = registerSceneObject(cameraBlockers, frame.current)
    const removeWeaponGate = registerWeaponBlocker(blockersRef, frame.current)
    return () => { removeCameraGate?.(); removeWeaponGate?.() }
  }, [blockersRef, cameraBlockers])
  const color = open ? '#6ef6ba' : '#e87162'
  return <group position={[0, 0, 26.2]}>
    {!open && <RigidBody type="fixed" colliders={false} position={[0, 1.85, 0]}><CuboidCollider args={[3.35, 1.8, 0.26]} /></RigidBody>}
    <group ref={frame}>
      <mesh castShadow position={[-4, 2.1, 0]}><boxGeometry args={[0.65, 4.2, 0.8]} /><meshStandardMaterial color="#64594f" flatShading /></mesh>
      <mesh castShadow position={[4, 2.1, 0]}><boxGeometry args={[0.65, 4.2, 0.8]} /><meshStandardMaterial color="#64594f" flatShading /></mesh>
      <mesh castShadow position={[0, 4.25, 0]}><boxGeometry args={[8.65, 0.7, 0.9]} /><meshStandardMaterial color="#8f7760" flatShading /></mesh>
      {!open && <>
        {[-2.3, -0.8, 0.8, 2.3].map((x) => <mesh key={x} castShadow position={[x, 1.85, 0]}><boxGeometry args={[0.16, 3.55, 0.5]} /><meshStandardMaterial color="#73594b" metalness={0.28} roughness={0.55} /></mesh>)}
        <mesh castShadow position={[0, 0.14, 0]}><boxGeometry args={[6.6, 0.28, 0.56]} /><meshStandardMaterial color="#73594b" /></mesh>
      </>}
    </group>
    <mesh position={[0, 2.15, -0.38]}><planeGeometry args={[6.5, 3.6]} /><meshBasicMaterial color={color} transparent opacity={open ? 0.26 : 0.08} side={THREE.DoubleSide} /></mesh>
    <pointLight position={[0, 2.2, -0.3]} color={color} intensity={open ? 3 : 0.5} distance={14} />
    <Float speed={open ? 1.8 : 0.6} floatIntensity={0.18} rotationIntensity={0.04}>
      <mesh position={[0, 4.9, -0.2]}><octahedronGeometry args={[0.34, 0]} /><meshStandardMaterial color={open ? '#ffe483' : '#776a60'} emissive={open ? '#a56e2c' : '#000000'} emissiveIntensity={open ? 0.65 : 0} flatShading /></mesh>
    </Float>
    {open && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}><ringGeometry args={[2.5, 3.2, 40]} /><meshBasicMaterial color="#7cf6ba" transparent opacity={0.7} side={THREE.DoubleSide} /></mesh>}
    <mesh position={[0, 5.8, 0]}><sphereGeometry args={[0.001, 4, 3]} /><meshBasicMaterial color={levelIndex === 4 ? '#ffd66d' : '#ffffff'} /></mesh>
  </group>
}

function WeaponLoop({ gameStatus, localInputRef, remoteInputRef, remoteConnectedRef, canShootRef, onEnemyHit, onShot, onReload, onEmptyFire, aimTargetRef, cameraBlockers, targetRefs, blockerRefs, muzzleRef }: Props & { aimTargetRef: React.MutableRefObject<THREE.Vector3>; cameraBlockers: SceneRegistry; targetRefs: TargetMap; blockerRefs: BlockerSet; muzzleRef: React.MutableRefObject<THREE.Group | null> }) {
  const { camera } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const muzzleRaycaster = useMemo(() => new THREE.Raycaster(), [])
  const centerNdc = useMemo(() => new THREE.Vector2(0, 0), [])
  const nextShotAt = useRef(0)
  const reloadWasDown = useRef(false)
  const emptySoundAt = useRef(0)
  const muzzleDirection = useRef(new THREE.Vector3())
  const start = useRef(new THREE.Vector3())
  const end = useRef(new THREE.Vector3())
  useFrame((state) => {
    const remote = remoteConnectedRef.current
    const input = remote ? remoteInputRef.current : localInputRef.current
    if (input.reload && !reloadWasDown.current) onReload()
    reloadWasDown.current = input.reload
    const targets = Array.from(targetRefs.current.values())
    const blockers = Array.from(new Set([...Array.from(blockerRefs.current), ...cameraBlockers.objects]))
    const hittable = [...blockers, ...targets]

    // Ray A: the center of the camera defines the exact world point under the fixed crosshair.
    raycaster.setFromCamera(centerNdc, camera)
    raycaster.far = WEAPON_CONFIG.range
    const aimHit = raycaster.intersectObjects(hittable, true)[0]
    aimTargetRef.current.copy(raycaster.ray.origin).addScaledVector(raycaster.ray.direction, WEAPON_CONFIG.range)
    if (aimHit) aimTargetRef.current.copy(aimHit.point)

    if (gameStatus !== 'PLAYING' || !input.fire || !isCooldownReady(state.clock.elapsedTime, nextShotAt.current)) return
    nextShotAt.current = nextCooldownAt(state.clock.elapsedTime, WEAPON_CONFIG.fireRateSeconds)
    if (!canShootRef.current) {
      if (state.clock.elapsedTime >= emptySoundAt.current) { emptySoundAt.current = state.clock.elapsedTime + 0.8; onEmptyFire() }
      return
    }

    if (muzzleRef.current) muzzleRef.current.getWorldPosition(start.current)
    else start.current.copy(camera.position)
    end.current.copy(aimTargetRef.current)

    // Ray B: only the muzzle ray can hit an enemy or blocker and produce damage.
    const aimDistance = start.current.distanceTo(end.current)
    let actualHit: THREE.Intersection | undefined
    if (aimDistance > 0.001) {
      muzzleDirection.current.subVectors(end.current, start.current).normalize()
      muzzleRaycaster.set(start.current, muzzleDirection.current)
      muzzleRaycaster.far = Math.min(WEAPON_CONFIG.range, aimDistance)
      actualHit = muzzleRaycaster.intersectObjects(hittable, true)[0]
      if (actualHit) end.current.copy(actualHit.point)
      else end.current.copy(start.current).addScaledVector(muzzleDirection.current, muzzleRaycaster.far)
    }

    const destination: [number, number, number] = [end.current.x, end.current.y, end.current.z]
    onShot({ from: [start.current.x, start.current.y, start.current.z], to: destination })
    const enemyId = getEnemyId(actualHit?.object ?? null)
    if (enemyId) onEnemyHit(enemyId, destination)
  })
  return null
}

function ShotTracer({ shot }: { shot: ShotTrace }) {
  const geometry = useMemo(() => {
    const value = new THREE.BufferGeometry()
    value.setFromPoints([new THREE.Vector3(...shot.from), new THREE.Vector3(...shot.to)])
    return value
  }, [shot])
  const line = useRef<THREE.LineSegments>(null)
  const life = useRef(0.11)
  useFrame((_, delta) => {
    life.current -= delta
    const material = line.current?.material
    if (material instanceof THREE.Material && 'opacity' in material) material.opacity = THREE.MathUtils.clamp(life.current / 0.11, 0, 1)
  })
  useEffect(() => () => geometry.dispose(), [geometry])
  return <lineSegments ref={line} geometry={geometry}><lineBasicMaterial color="#fff59d" transparent opacity={0.95} depthWrite={false} /></lineSegments>
}

function Effect({ effect }: { effect: WorldEffect }) {
  const group = useRef<THREE.Group>(null)
  const life = useRef(0.42)
  const material = useRef<THREE.MeshBasicMaterial>(null)
  const duration = effect.kind === 'death' ? 0.58 : 0.32
  useFrame((_, delta) => {
    life.current -= delta
    const progress = THREE.MathUtils.clamp(1 - life.current / duration, 0, 1)
    if (group.current) group.current.scale.setScalar(0.3 + progress * (effect.kind === 'death' ? 2.2 : 1.05))
    if (material.current) material.current.opacity = 1 - progress
  })
  const color = effect.kind === 'death' ? '#b9f276' : effect.kind === 'gate' ? '#8effd7' : '#fff29a'
  return <group ref={group} position={effect.position}>
    <mesh><icosahedronGeometry args={[0.5, 0]} /><meshBasicMaterial ref={material} color={color} transparent opacity={0.9} depthWrite={false} /></mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]}><ringGeometry args={[0.42, 0.57, 12]} /><meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} /></mesh>
  </group>
}

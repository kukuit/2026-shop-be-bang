'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Billboard, Html, Sparkles } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider, CapsuleCollider, type RapierRigidBody } from '@react-three/rapier'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { MoveInput, PortalInfo } from './types'
import { PORTALS } from './types'
import styles from './demo.module.css'

type Props = { move: MoveInput; jumpVersion: number; soundOn: boolean; onPortalChange: (portal: PortalInfo | null) => void; onCameraGestureStart: () => void }

export default function GameWorld(props: Props) {
  return <Canvas shadows camera={{ position: [0, 6, 10], fov: 55 }} dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: 'high-performance' }}>
    <color attach="background" args={['#87d9ff']} /><fog attach="fog" args={['#bceaff', 24, 65]} />
    <ambientLight intensity={1.7} /><directionalLight position={[8, 14, 5]} intensity={2.3} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-far={45} />
    <Suspense fallback={null}><WorldContents {...props} /></Suspense>
  </Canvas>
}

function WorldContents({ move, jumpVersion, soundOn, onPortalChange }: Props) {
  const player = useRef<RapierRigidBody>(null)
  const keys = useRef(new Set<string>())
  const cameraYaw = useRef(0)
  const [cameraDrag, setCameraDrag] = useState(false)
  const lastPortal = useRef<string | null>(null)
  const { camera, gl } = useThree()

  useEffect(() => {
    const down = (event: KeyboardEvent) => keys.current.add(event.key.toLowerCase())
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase())
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  useEffect(() => {
    const el = gl.domElement
    const start = (event: PointerEvent) => { if (event.pointerType === 'mouse' && event.button === 0) setCameraDrag(true) }
    const stop = () => setCameraDrag(false)
    const movePointer = (event: PointerEvent) => { if (cameraDrag) cameraYaw.current -= event.movementX * 0.004 }
    el.addEventListener('pointerdown', start); window.addEventListener('pointerup', stop); window.addEventListener('pointermove', movePointer)
    return () => { el.removeEventListener('pointerdown', start); window.removeEventListener('pointerup', stop); window.removeEventListener('pointermove', movePointer) }
  }, [gl, cameraDrag])

  useEffect(() => {
    const el = gl.domElement
    let previous: { x: number; y: number } | null = null
    const start = (event: PointerEvent) => { if (event.pointerType !== 'mouse' && event.clientX > window.innerWidth * 0.42) previous = { x: event.clientX, y: event.clientY } }
    const moveTouch = (event: PointerEvent) => { if (!previous || event.pointerType === 'mouse') return; cameraYaw.current -= (event.clientX - previous.x) * 0.006; previous = { x: event.clientX, y: event.clientY } }
    const end = () => { previous = null }
    el.addEventListener('pointerdown', start); el.addEventListener('pointermove', moveTouch); el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end)
    return () => { el.removeEventListener('pointerdown', start); el.removeEventListener('pointermove', moveTouch); el.removeEventListener('pointerup', end); el.removeEventListener('pointercancel', end) }
  }, [gl])

  useEffect(() => {
    if (!jumpVersion || !player.current) return
    const velocity = player.current.linvel()
    if (Math.abs(velocity.y) < 0.12) player.current.applyImpulse({ x: 0, y: 5.7, z: 0 }, true)
  }, [jumpVersion])

  const spawn = useMemo(() => ({ x: 0, z: 8 }), [])
  useFrame((_, delta) => {
    const body = player.current
    if (!body) return
    const forward = Number(keys.current.has('w') || keys.current.has('arrowup')) - Number(keys.current.has('s') || keys.current.has('arrowdown')) + move.z
    const right = Number(keys.current.has('d') || keys.current.has('arrowright')) - Number(keys.current.has('a') || keys.current.has('arrowleft')) + move.x
    const input = new THREE.Vector2(right, forward).clampLength(0, 1)
    const direction = new THREE.Vector3(input.x, 0, -input.y).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw.current)
    const velocity = body.linvel()
    const smoothing = 1 - Math.exp(-12 * Math.min(delta, 0.05))
    body.setLinvel({ x: THREE.MathUtils.lerp(velocity.x, direction.x * 5.6, smoothing), y: velocity.y, z: THREE.MathUtils.lerp(velocity.z, direction.z * 5.6, smoothing) }, true)
    const position = body.translation()
    const target = new THREE.Vector3(position.x, position.y + 1.25, position.z)
    const behind = new THREE.Vector3(0, 4.1, 8.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw.current)
    camera.position.lerp(target.clone().add(behind), 1 - Math.exp(-4 * Math.min(delta, 0.05)))
    camera.lookAt(target)
    if (input.lengthSq() > 0.04) body.setRotation({ x: 0, y: Math.atan2(direction.x, direction.z), z: 0, w: 1 }, true)
    const active = PORTALS.find((portal) => {
      const p = portalPosition(portal.id)
      return Math.hypot(position.x - p[0], position.z - p[2]) < 3.2
    }) ?? null
    if (lastPortal.current !== (active?.id ?? null)) { lastPortal.current = active?.id ?? null; onPortalChange(active) }
  })

  return <>
    <Physics gravity={[0, -9.81, 0]} timeStep="vary">
      <Environment />
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[80, 0.3, 80]} position={[0, -0.3, 0]} friction={1} /></RigidBody>
      <RigidBody ref={player} colliders={false} position={[spawn.x, 1.1, spawn.z]} enabledRotations={[false, false, false]} linearDamping={0.8}>
        <CapsuleCollider args={[0.58, 0.37]} friction={0} />
        <CappyCharacter moving={move.x !== 0 || move.z !== 0} />
      </RigidBody>
      <SceneryColliders />
      <Portal id="vietnamese" position={[-8, 0, 0]} />
      <Portal id="math" position={[8, 0, 0]} />
      <Portal id="english" position={[0, 0, -10]} />
      <Portal id="home" position={[0, 0, 15]} />
    </Physics>
    <Html fullscreen><div className={styles.aimReticle} aria-hidden="true" /></Html>
    {soundOn && <AmbientSfx />}
  </>
}

function portalPosition(id: string): [number, number, number] { return id === 'math' ? [8, 0, 0] : id === 'vietnamese' ? [-8, 0, 0] : id === 'english' ? [0, 0, -10] : [0, 0, 15] }

function Environment() {
  return <>
    <group position={[0, -0.08, 0]}><mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[160, 160]} /><meshStandardMaterial color="#7bd78a" roughness={1} /></mesh></group>
    <mesh receiveShadow position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[4.2, 5.6, 48]} /><meshStandardMaterial color="#ead792" /></mesh>
    <Road position={[0, 0.025, 0]} scale={[1, 1, 1]} rotation={[0, 0, Math.PI / 2]} />
    <Road position={[0, 0.03, -5]} scale={[1, 1, 1]} rotation={[-Math.PI / 2, 0, 0]} />
    <mesh position={[-15, 0.06, -2]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[3.7, 12]} /><meshStandardMaterial color="#54c9eb" /></mesh>
    <Sparkles count={35} scale={[32, 7, 32]} size={2.2} speed={0.25} color="#fff4a8" />
    <TreeCluster />
    <FenceRow start={[-13, 0, 8]} end={[-5, 0, 8]} /><FenceRow start={[5, 0, 8]} end={[13, 0, 8]} />
    <House position={[0, 0, 18]} />
    <Cloud position={[-13, 12, -16]} scale={1.4} /><Cloud position={[14, 10, -19]} scale={1.1} /><Cloud position={[22, 14, 9]} scale={0.8} />
    <WorldSign />
  </>
}

function Road({ position, scale, rotation }: { position: [number, number, number]; scale: [number, number, number]; rotation: [number, number, number] }) {
  return <mesh position={position} scale={scale} rotation={rotation} receiveShadow><planeGeometry args={[4, 12]} /><meshStandardMaterial color="#eecb8c" /></mesh>
}

function TreeCluster() {
  const trees = useMemo(() => Array.from({ length: 35 }, (_, i) => {
    const angle = i * 2.399, radius = 14 + (i % 5) * 2.2
    return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [number, number, number]
  }), [])
  return <>{trees.map((position, index) => <Tree key={index} position={position} index={index} />)}</>
}

function Tree({ position, index }: { position: [number, number, number]; index: number }) {
  const colors = ['#35b978', '#58c96f', '#89d66c', '#20aa83']
  return <group position={position} scale={0.72 + (index % 4) * 0.1}>
    <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.32, 1.35, 0.32]} position={[0, 1.35, 0]} /></RigidBody>
    <mesh castShadow position={[0, 0.8, 0]}><cylinderGeometry args={[0.17, 0.3, 1.7, 6]} /><meshStandardMaterial color="#8b583a" /></mesh>
    <mesh castShadow position={[0, 2, 0]}><coneGeometry args={[1.05, 2.1, 7]} /><meshStandardMaterial color={colors[index % colors.length]} flatShading /></mesh>
    <mesh castShadow position={[0, 2.75, 0]}><coneGeometry args={[0.72, 1.6, 7]} /><meshStandardMaterial color={colors[(index + 1) % colors.length]} flatShading /></mesh>
  </group>
}

function FenceRow({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  const count = 7
  return <group>{Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1), x = THREE.MathUtils.lerp(start[0], end[0], t), z = THREE.MathUtils.lerp(start[2], end[2], t)
    return <group key={i} position={[x, 0, z]}><mesh castShadow position={[0, 0.48, 0]}><boxGeometry args={[0.18, 0.9, 0.18]} /><meshStandardMaterial color="#fff0cb" /></mesh>
      {i < count - 1 && <mesh position={[(end[0] - start[0]) / (count - 1) / 2, 0.56, 0]}><boxGeometry args={[1.2, 0.12, 0.12]} /><meshStandardMaterial color="#eea355" /></mesh>}</group>
  })}</group>
}

function House({ position }: { position: [number, number, number] }) {
  return <group position={position}><mesh castShadow position={[0, 1.5, 0]}><boxGeometry args={[5, 3, 4]} /><meshStandardMaterial color="#fff0ce" /></mesh>
    <mesh castShadow position={[0, 3.6, 0]}><coneGeometry args={[3.8, 2, 4]} /><meshStandardMaterial color="#ed795f" /></mesh>
    <mesh position={[0, 0.9, 2.03]}><boxGeometry args={[1.2, 1.8, 0.12]} /><meshStandardMaterial color="#915537" /></mesh>
    <PortalRing color="#ffbd52" position={[0, 0.15, 2.15]} scale={0.8} /></group>
}

function Cloud({ position, scale }: { position: [number, number, number]; scale: number }) {
  return <group position={position} scale={scale}><mesh position={[-0.65, 0, 0]}><icosahedronGeometry args={[0.85, 1]} /><meshStandardMaterial color="white" /></mesh><mesh position={[0.3, 0.25, 0]}><icosahedronGeometry args={[1.05, 1]} /><meshStandardMaterial color="white" /></mesh><mesh position={[1, 0, 0]}><icosahedronGeometry args={[0.7, 1]} /><meshStandardMaterial color="white" /></mesh></group>
}

function Portal({ id, position }: { id: PortalInfo['id']; position: [number, number, number] }) {
  const portal = PORTALS.find((item) => item.id === id)!
  const size = id === 'home' ? 1.15 : 1
  return <group position={position}>
    <PortalRing color={portal.color} position={[0, 1.55, 0]} scale={size} />
    <mesh position={[0, 1.58, -0.13]}><circleGeometry args={[0.82 * size, 32]} /><meshBasicMaterial color={portal.color} transparent opacity={0.35} side={THREE.DoubleSide} /></mesh>
    <Billboard position={[0, 3.2, 0]}><Html center distanceFactor={13} occlude={false}>
      <div className={styles.portalSign} style={{ ['--portal-color' as string]: portal.color }}><span>{id === 'math' ? '✦' : id === 'vietnamese' ? 'Aa' : id === 'english' ? '☄' : '⌂'}</span>{portal.title}</div>
    </Html></Billboard>
    <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.18, 1.3, 0.42]} position={[0, 1.2, 0]} /></RigidBody>
  </group>
}

function PortalRing({ color, position, scale }: { color: string; position: [number, number, number]; scale: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => { if (ref.current) ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05 })
  return <mesh ref={ref} position={position} scale={scale} castShadow><torusGeometry args={[1, 0.14, 8, 32]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} metalness={0.12} roughness={0.3} /></mesh>
}

function CappyCharacter({ moving }: { moving: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((state) => { if (ref.current) ref.current.position.y = moving ? Math.sin(state.clock.elapsedTime * 11) * 0.055 : 0 })
  return <group ref={ref}>
    <mesh castShadow position={[0, 0.95, 0]}><capsuleGeometry args={[0.43, 0.55, 5, 8]} /><meshStandardMaterial color="#c7793f" flatShading /></mesh>
    <mesh castShadow position={[0, 1.85, 0]}><icosahedronGeometry args={[0.57, 2]} /><meshStandardMaterial color="#d89555" flatShading /></mesh>
    <mesh castShadow position={[-0.47, 2.05, 0]} rotation={[0, 0, 0.2]}><coneGeometry args={[0.18, 0.62, 6]} /><meshStandardMaterial color="#d89555" /></mesh>
    <mesh castShadow position={[0.47, 2.05, 0]} rotation={[0, 0, -0.2]}><coneGeometry args={[0.18, 0.62, 6]} /><meshStandardMaterial color="#d89555" /></mesh>
    <mesh position={[-0.2, 1.9, 0.49]}><sphereGeometry args={[0.075, 8, 8]} /><meshStandardMaterial color="#2b2525" /></mesh>
    <mesh position={[0.2, 1.9, 0.49]}><sphereGeometry args={[0.075, 8, 8]} /><meshStandardMaterial color="#2b2525" /></mesh>
    <mesh castShadow position={[-0.57, 1.06, 0]} rotation={[0, 0, -0.35]}><capsuleGeometry args={[0.15, 0.53, 3, 6]} /><meshStandardMaterial color="#d89555" /></mesh>
    <mesh castShadow position={[0.57, 1.06, 0]} rotation={[0, 0, 0.35]}><capsuleGeometry args={[0.15, 0.53, 3, 6]} /><meshStandardMaterial color="#d89555" /></mesh>
    <mesh castShadow position={[-0.24, 0.22, 0.06]}><capsuleGeometry args={[0.17, 0.35, 3, 6]} /><meshStandardMaterial color="#664532" /></mesh>
    <mesh castShadow position={[0.24, 0.22, 0.06]}><capsuleGeometry args={[0.17, 0.35, 3, 6]} /><meshStandardMaterial color="#664532" /></mesh>
  </group>
}

function SceneryColliders() {
  return <>
    <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.35, 0.45, 0.35]} position={[-3.3, 0.45, 3]} /><CuboidCollider args={[0.35, 0.45, 0.35]} position={[3.3, 0.45, 3]} /></RigidBody>
    <RigidBody type="fixed" colliders={false}><CuboidCollider args={[3.2, 0.6, 3.2]} position={[-15, 0.45, -2]} /></RigidBody>
  </>
}

function WorldSign() {
  return <Billboard position={[0, 5.5, 0]}><Html center distanceFactor={14}>
    <div className={styles.worldSign}><span>✦</span><strong>CAPPY WORLD</strong><small>CHỌN MỘT CỔNG ĐỂ KHÁM PHÁ</small></div>
  </Html></Billboard>
}

function AmbientSfx() { return null }

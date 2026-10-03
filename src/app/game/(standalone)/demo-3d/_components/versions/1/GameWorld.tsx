'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Billboard, Html, Sparkles } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { MoveInput, PortalInfo } from './types'
import { PORTALS } from './types'
import { CAMERA_PRESETS, type CameraMode } from './camera-config'
import ThirdPersonCameraController from './ThirdPersonCameraController'
import PlayerController from './PlayerController'
import { DEFAULT_PLAYER_SLOT, resolveCharacterSlot } from './character/slots'
import styles from './demo.module.css'

type Props = { move: MoveInput; jumpVersion: number; soundOn: boolean; cameraMode: CameraMode; onPortalChange: (portal: PortalInfo | null) => void }

export default function GameWorld(props: Props) {
  return <Canvas shadows camera={{ position: [0, 6, 10], fov: 55 }} dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: 'high-performance' }}>
    <color attach="background" args={['#87d9ff']} /><fog attach="fog" args={['#bceaff', 24, 65]} />
    <ambientLight intensity={1.7} /><directionalLight position={[8, 14, 5]} intensity={2.3} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-far={45} />
    <Suspense fallback={null}><WorldContents {...props} /></Suspense>
  </Canvas>
}

function WorldContents({ move, jumpVersion, soundOn, cameraMode, onPortalChange }: Props) {
  const { character } = resolveCharacterSlot(DEFAULT_PLAYER_SLOT)
  const player = useRef<RapierRigidBody>(null)
  const cameraDistance = useRef(CAMERA_PRESETS.normal.distance)
  const cameraYaw = useRef(0)

  return <>
    <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60}>
      <Environment />
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[80, 0.3, 80]} position={[0, -0.3, 0]} friction={1} /></RigidBody>
      <PlayerController playerRef={player} move={move} jumpVersion={jumpVersion} cameraMode={cameraMode} cameraDistance={cameraDistance} onPortalChange={onPortalChange} />
      <ThirdPersonCameraController target={player} yaw={cameraYaw} mode={cameraMode} cameraDistance={cameraDistance} characterCamera={character.camera} />
      <SceneryColliders />
      <Portal id="vietnamese" position={[-8, 0, 0]} />
      <Portal id="math" position={[8, 0, 0]} />
      <Portal id="english" position={[0, 0, -10]} />
      <Portal id="home" position={[0, 0, 15]} />
    </Physics>
    {soundOn && <AmbientSfx />}
  </>
}

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
      <div className={styles.portalSign} data-camera-ignore style={{ ['--portal-color' as string]: portal.color }}><span>{id === 'math' ? '✦' : id === 'vietnamese' ? 'Aa' : id === 'english' ? '☄' : '⌂'}</span>{portal.title}</div>
    </Html></Billboard>
    <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.18, 1.3, 0.42]} position={[0, 1.2, 0]} /></RigidBody>
  </group>
}

function PortalRing({ color, position, scale }: { color: string; position: [number, number, number]; scale: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => { if (ref.current) ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05 })
  return <mesh ref={ref} position={position} scale={scale} castShadow><torusGeometry args={[1, 0.14, 8, 32]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} metalness={0.12} roughness={0.3} /></mesh>
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

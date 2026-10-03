'use client'

import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, CylinderCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useRef } from 'react'
import type { MutableRefObject } from 'react'
import * as THREE from 'three'
import { useDemo3DGame } from '../GameShell'
import { ENGLISH_STEPS, ENGLISH_WORLD_CONFIG } from './english-world.config'
import EnglishRocket from './EnglishRocket'

const LAUNCH = ENGLISH_WORLD_CONFIG.launch
const ROCKET_X = LAUNCH.x - 1.4
const LAUNCH_DECK_TOP = LAUNCH.top + 0.05
const ROCKET_STAND_TOP = LAUNCH_DECK_TOP + 0.38
const ROCKET_BASE_Y = ROCKET_STAND_TOP - 0.125

export default function EnglishLaunch({ playerRef, onInteractionChange }: {
  playerRef: MutableRefObject<RapierRigidBody | null>
  onInteractionChange?: (inside: boolean) => void
}) {
  const { englishLaunchStage } = useDemo3DGame()
  const rocket = useRef<THREE.Group>(null)
  const lastStage = useRef(englishLaunchStage)
  const stageStarted = useRef(0)
  const launchStarted = useRef(0)
  const boardingStart = useRef(new THREE.Vector3())
  const wasNear = useRef(false)

  useFrame((state) => {
    const body = playerRef.current
    const time = state.clock.elapsedTime
    if (englishLaunchStage !== lastStage.current) {
      lastStage.current = englishLaunchStage
      stageStarted.current = time
      if (englishLaunchStage === 'launching') launchStarted.current = time
      if (englishLaunchStage === 'boarding' && body) {
        const position = body.translation()
        boardingStart.current.set(position.x, position.y, position.z)
      }
    }
    if (body && englishLaunchStage === 'boarding') {
      const t = THREE.MathUtils.smoothstep((time - stageStarted.current) / 0.5, 0, 1)
      body.setTranslation({
        x: THREE.MathUtils.lerp(boardingStart.current.x, ROCKET_X + 1.1, t),
        y: THREE.MathUtils.lerp(boardingStart.current.y, ROCKET_STAND_TOP + 1.23, t) + Math.sin(t * Math.PI) * 0.35,
        z: THREE.MathUtils.lerp(boardingStart.current.z, LAUNCH.z, t),
      }, true)
    }
    if (rocket.current) {
      const rising = englishLaunchStage === 'launching' || englishLaunchStage === 'transitioning'
      const t = rising ? Math.max(0, time - launchStarted.current) : 0
      rocket.current.position.y = ROCKET_BASE_Y + (rising ? Math.min(8, t * t * 7) : 0)
      rocket.current.rotation.z = rising ? Math.sin(time * 32) * 0.025 : 0
    }
    if (!body || englishLaunchStage) {
      if (wasNear.current) { wasNear.current = false; onInteractionChange?.(false) }
      return
    }
    const position = body.translation()
    const near = Math.hypot(position.x - ROCKET_X, position.z - LAUNCH.z) < 2.5 && position.y > LAUNCH.top + 0.9
    if (near !== wasNear.current) { wasNear.current = near; onInteractionChange?.(near) }
  })

  return <>
    {ENGLISH_STEPS.map((step, index) => <RigidBody key={index} type="fixed" colliders={false} position={[step.x, step.top - 0.3, step.z]}>
      <mesh castShadow receiveShadow><cylinderGeometry args={[1.4, 1.5, 0.6, 7]} /><meshStandardMaterial color="#8e83ae" roughness={0.94} flatShading /></mesh>
      <mesh position={[0, 0.315, 0]}><cylinderGeometry args={[1.38, 1.38, 0.05, 7]} /><meshStandardMaterial color="#aca3d5" roughness={0.87} /></mesh>
      <CylinderCollider args={[0.3, 1.45]} friction={1} />
    </RigidBody>)}
    <RigidBody type="fixed" colliders={false} position={[LAUNCH.x, LAUNCH.top - 0.3, LAUNCH.z]}>
      <mesh castShadow receiveShadow><cylinderGeometry args={[4.5, 4.65, 0.6, 12]} /><meshStandardMaterial color="#7e789e" roughness={0.95} flatShading /></mesh>
      <mesh position={[0, 0.32, 0]}><cylinderGeometry args={[3.4, 3.4, 0.06, 24]} /><meshStandardMaterial color="#d8d1eb" roughness={0.85} /></mesh>
      <CylinderCollider args={[0.3, 4.6]} friction={1} />
    </RigidBody>
    <RigidBody type="fixed" colliders={false} position={[ROCKET_X, LAUNCH_DECK_TOP, LAUNCH.z]}>
      <mesh position={[0, 0.11, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.35, 1.5, 0.22, 12]} />
        <meshStandardMaterial color="#615782" roughness={0.82} flatShading />
      </mesh>
      <mesh position={[0, 0.29, 0]} castShadow>
        <cylinderGeometry args={[1.12, 1.3, 0.14, 16]} />
        <meshStandardMaterial color="#b6add0" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.375, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.94, 0.045, 6, 28]} />
        <meshBasicMaterial color="#86d9ff" toneMapped={false} />
      </mesh>
      <CylinderCollider args={[0.19, 1.3]} position={[0, 0.19, 0]} friction={0.9} />
    </RigidBody>
    {[1.65, 2.25, 2.85, 3.45, 4.05, 4.65].map((angle, index) => <group key={index} position={[LAUNCH.x + Math.cos(angle) * 4.25, LAUNCH.top + 0.45, LAUNCH.z + Math.sin(angle) * 4.25]}>
      <mesh><cylinderGeometry args={[0.09, 0.12, 0.9, 6]} /><meshStandardMaterial color="#c7b8dc" roughness={0.85} /></mesh>
      <mesh position={[0, 0.49, 0]}><sphereGeometry args={[0.14, 7, 5]} /><meshStandardMaterial color="#9edff3" emissive="#8c7fe2" emissiveIntensity={0.45} /></mesh>
    </group>)}
    {Array.from({ length: 5 }, (_, index) => {
      const angle = 1.65 + index * 0.6
      const next = angle + 0.6
      const ax = Math.cos(angle) * 4.25, az = Math.sin(angle) * 4.25
      const bx = Math.cos(next) * 4.25, bz = Math.sin(next) * 4.25
      return <RigidBody key={index} type="fixed" colliders="cuboid" position={[LAUNCH.x + (ax + bx) / 2, LAUNCH.top + 0.72, LAUNCH.z + (az + bz) / 2]} rotation={[0, Math.atan2(-(bz - az), bx - ax), 0]}>
        <mesh><boxGeometry args={[Math.hypot(bx - ax, bz - az), 0.12, 0.12]} /><meshStandardMaterial color="#c7b8dc" roughness={0.9} /></mesh>
      </RigidBody>
    })}
    {[-1, 1].map((side) => <group key={side} position={[LAUNCH.x + 1.4, LAUNCH.top + 0.15, LAUNCH.z + side * 3.4]}>
      <mesh scale={[0.52, 0.3, 0.48]}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#a79dbd" flatShading /></mesh>
      <mesh position={[0, 0.36, 0]}><sphereGeometry args={[0.16, 7, 5]} /><meshStandardMaterial color="#aee9fa" emissive="#9379e3" emissiveIntensity={0.6} /></mesh>
    </group>)}
    <group position={[LAUNCH.x + 1.2, LAUNCH.top + 1.65, LAUNCH.z - 2.8]}>
      <mesh><boxGeometry args={[3.5, 0.8, 0.16]} /><meshStandardMaterial color="#76577f" /></mesh>
      <Text position={[0, 0, 0.1]} fontSize={0.28} color="#f6e9ff" anchorX="center" anchorY="middle">VŨ TRỤ TIẾNG ANH</Text>
    </group>
    <RigidBody type="fixed" colliders={false} position={[ROCKET_X, ROCKET_BASE_Y + 1.8, LAUNCH.z]}>
      <CuboidCollider args={[0.66, 1.7, 0.66]} />
    </RigidBody>
    <group position={[ROCKET_X, ROCKET_BASE_Y, LAUNCH.z]} ref={rocket}>
      <EnglishRocket occupied={englishLaunchStage === 'seated' || englishLaunchStage === 'launching' || englishLaunchStage === 'transitioning'} engineOn={englishLaunchStage === 'launching'} />
    </group>
  </>
}

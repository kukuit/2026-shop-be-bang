'use client'

import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useRef } from 'react'
import type { MutableRefObject } from 'react'
import * as THREE from 'three'
import { useDemo3DGame } from '../GameShell'

export const OCEAN_DIVE_STATION_POSITION: [number, number, number] = [15.1, 0, 21.2]
const DIVE_APPROACH_TARGET: [number, number, number] = [15.65, 1.35, 21.45]

export default function OceanDiveStation({ playerRef, onInteractionChange }: {
  playerRef: MutableRefObject<RapierRigidBody | null>
  onInteractionChange?: (inside: boolean) => void
}) {
  const { oceanDiveStage } = useDemo3DGame()
  const wasNear = useRef(false)
  const previousStage = useRef(oceanDiveStage)
  const stageStartTime = useRef(0)
  const startPosition = useRef(new THREE.Vector3())
  const splashRing = useRef<THREE.Mesh>(null)
  const bubbles = useRef<(THREE.Group | null)[]>([])

  useFrame((state) => {
    const time = state.clock.elapsedTime
    const body = playerRef.current
    if (oceanDiveStage !== previousStage.current) {
      previousStage.current = oceanDiveStage
      stageStartTime.current = time
      if (oceanDiveStage === 'equipping' && body) {
        const position = body.translation()
        startPosition.current.set(position.x, position.y, position.z)
      }
    }

    if (body && oceanDiveStage === 'equipping') {
      const t = THREE.MathUtils.smoothstep((time - stageStartTime.current) / 0.55, 0, 1)
      body.setTranslation({
        x: THREE.MathUtils.lerp(startPosition.current.x, DIVE_APPROACH_TARGET[0], t),
        y: THREE.MathUtils.lerp(startPosition.current.y, DIVE_APPROACH_TARGET[1], t) + Math.sin(t * Math.PI) * 0.16,
        z: THREE.MathUtils.lerp(startPosition.current.z, DIVE_APPROACH_TARGET[2], t),
      }, true)
    }

    const splashing = oceanDiveStage === 'splashing'
    const elapsed = time - stageStartTime.current
    if (splashRing.current) {
      const progress = splashing ? THREE.MathUtils.clamp(elapsed / 0.95, 0, 1) : 0
      splashRing.current.visible = splashing
      splashRing.current.scale.setScalar(0.25 + progress * 2.4)
      const material = splashRing.current.material as THREE.MeshBasicMaterial
      material.opacity = splashing ? (1 - progress) * 0.72 : 0
    }
    bubbles.current.forEach((bubble, index) => {
      if (!bubble) return
      bubble.visible = splashing
      bubble.position.y = 0.25 + ((elapsed * 1.35 + index * 0.19) % 1.45)
      bubble.position.x = Math.sin(elapsed * 2.2 + index) * 0.24
      bubble.scale.setScalar(0.55 + (index % 3) * 0.18)
    })

    if (!body || oceanDiveStage) {
      if (wasNear.current) { wasNear.current = false; onInteractionChange?.(false) }
      return
    }
    const position = body.translation()
    const [x, , z] = OCEAN_DIVE_STATION_POSITION
    const near = Math.hypot(position.x - x, position.z - z) < 1.8
    if (near !== wasNear.current) { wasNear.current = near; onInteractionChange?.(near) }
  })

  return <>
    <RigidBody type="fixed" colliders={false} position={OCEAN_DIVE_STATION_POSITION}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.25, 0.16, 1.05]} />
        <meshStandardMaterial color="#b98551" roughness={0.96} flatShading />
      </mesh>
      {[[-0.94, 0.25, -0.39], [0.94, 0.25, -0.39], [-0.94, 0.25, 0.39], [0.94, 0.25, 0.39]].map(([x, y, z], index) => <mesh key={index} position={[x, y, z]} castShadow>
        <boxGeometry args={[0.14, 0.5, 0.14]} />
        <meshStandardMaterial color="#815237" roughness={0.96} flatShading />
      </mesh>)}
      <mesh position={[-0.45, 1.04, -0.02]} castShadow>
        <cylinderGeometry args={[0.22, 0.25, 0.83, 8]} />
        <meshStandardMaterial color="#43a9bd" roughness={0.45} metalness={0.12} flatShading />
      </mesh>
      <mesh position={[-0.45, 1.48, -0.02]}>
        <cylinderGeometry args={[0.09, 0.09, 0.1, 8]} />
        <meshStandardMaterial color="#e9c46a" metalness={0.4} roughness={0.4} />
      </mesh>
      <group position={[0.27, 0.91, -0.02]} rotation={[0, -0.2, 0]}>
        <mesh><boxGeometry args={[0.48, 0.19, 0.1]} /><meshStandardMaterial color="#f4d16c" roughness={0.5} /></mesh>
        <mesh position={[0, 0, 0.07]}><boxGeometry args={[0.35, 0.12, 0.025]} /><meshStandardMaterial color="#82d9ec" transparent opacity={0.72} roughness={0.25} /></mesh>
        <mesh position={[0, -0.14, -0.01]}><torusGeometry args={[0.29, 0.025, 6, 18, Math.PI]} /><meshStandardMaterial color="#e8b94f" roughness={0.65} /></mesh>
        <mesh position={[0.28, 0.14, 0]}><cylinderGeometry args={[0.025, 0.025, 0.36, 6]} /><meshStandardMaterial color="#36aabd" /></mesh>
      </group>
      {[-0.1, 0.43].map((x, index) => <mesh key={index} position={[x, 0.67, 0.3]} rotation={[0.1, 0, index ? -0.18 : 0.18]} castShadow>
        <boxGeometry args={[0.18, 0.08, 0.52]} />
        <meshStandardMaterial color={index ? '#3f7193' : '#f3c85b'} roughness={0.86} flatShading />
      </mesh>)}
      <CuboidCollider args={[1.12, 0.08, 0.52]} position={[0, 0.55, 0]} friction={0.8} />
    </RigidBody>

    <group position={[15.1, 2.65, 21.4]} rotation={[0, Math.PI, 0]}>
      <mesh castShadow><boxGeometry args={[3.25, 0.82, 0.16]} /><meshStandardMaterial color="#815237" roughness={0.9} /></mesh>
      <mesh position={[0, 0, 0.09]}><boxGeometry args={[3.02, 0.62, 0.04]} /><meshStandardMaterial color="#fff0ce" roughness={0.9} /></mesh>
      <Text position={[0, 0, 0.12]} fontSize={0.31} color="#176c7d" anchorX="center" anchorY="middle" outlineWidth={0.006} outlineColor="#fff0ce">KHU LẶN BIỂN</Text>
      <mesh position={[-1.08, -0.91, 0]} castShadow><boxGeometry args={[0.14, 1.8, 0.14]} /><meshStandardMaterial color="#815237" roughness={0.96} /></mesh>
      <mesh position={[1.08, -0.91, 0]} castShadow><boxGeometry args={[0.14, 1.8, 0.14]} /><meshStandardMaterial color="#815237" roughness={0.96} /></mesh>
    </group>

    <mesh ref={splashRing} position={[15.65, 0.18, 21.45]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.72, 0.9, 28]} />
      <meshBasicMaterial color="#c7faff" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    {Array.from({ length: 7 }, (_, index) => <group key={index} ref={(node) => { bubbles.current[index] = node }} position={[15.65, 0, 21.45]} visible={false}>
      <mesh><sphereGeometry args={[0.09 + (index % 2) * 0.035, 8, 6]} /><meshBasicMaterial color="#e8ffff" transparent opacity={0.72} depthWrite={false} /></mesh>
    </group>)}
  </>
}

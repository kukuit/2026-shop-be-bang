'use client'

import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { useRef } from 'react'
import * as THREE from 'three'
import type { VietnameseLessonNode as LessonNodeData } from './vietnamese-world.config'

const STATUS_COLORS = {
  completed: '#52b76b',
  current: '#45acd1',
  available: '#e1ad47',
  locked: '#9ca9a0',
} as const

export default function VietnameseLessonNode({ lesson, active }: { lesson: LessonNodeData; active: boolean }) {
  const halo = useRef<THREE.Mesh>(null)
  const statusColor = STATUS_COLORS[lesson.status]
  const locked = lesson.status === 'locked'

  useFrame(({ clock }) => {
    if (!halo.current) return
    const pulse = active ? 1 + Math.sin(clock.elapsedTime * 4.2) * 0.055 : 1
    halo.current.scale.setScalar(pulse)
  })

  return <RigidBody type="fixed" colliders={false} position={lesson.position}>
    <CylinderCollider args={[0.17, 1.42]} position={[0, 0.16, 0]} friction={0.9} />
    <mesh position={[0, 0.13, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[1.42, 1.57, 0.26, 12]} />
      <meshStandardMaterial color={locked ? '#9e9b85' : '#b89a68'} roughness={0.94} flatShading />
    </mesh>
    <mesh position={[0, 0.285, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.28, 0.075, 5, 24]} />
      <meshStandardMaterial color={statusColor} emissive={active ? statusColor : '#000000'} emissiveIntensity={active ? 0.65 : 0} roughness={0.78} />
    </mesh>
    <mesh ref={halo} position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.72, 0.035, 4, 28]} />
      <meshBasicMaterial color={statusColor} transparent opacity={active ? 0.78 : 0.28} depthWrite={false} />
    </mesh>
    <Billboard position={[0, 1.42, 0]}>
      <Text fontSize={1.18} color={locked ? '#89938b' : lesson.accent} outlineColor="#fff5dd" outlineWidth={0.055} anchorX="center" anchorY="middle" fontWeight={900}>
        {lesson.symbol}
      </Text>
      <Text position={[0.74, 0.36, 0]} fontSize={0.3} color={statusColor} outlineColor="#fff5dd" outlineWidth={0.025} anchorX="center" anchorY="middle" fontWeight={900}>
        {lesson.status === 'completed' ? '✓' : lesson.status === 'current' ? '★' : ''}
      </Text>
    </Billboard>
    <mesh position={[0, 0.58, 1.3]} castShadow>
      <boxGeometry args={[1.52, 0.4, 0.1]} />
      <meshStandardMaterial color={locked ? '#a19a7f' : '#7e563b'} roughness={0.9} />
    </mesh>
    <Billboard position={[0, 0.6, 1.37]}>
      <Text fontSize={0.19} color="#fff0ca" outlineColor="#65452f" outlineWidth={0.008} anchorX="center" anchorY="middle" fontWeight={700}>
        {`BÀI ${lesson.id}`}
      </Text>
    </Billboard>
  </RigidBody>
}

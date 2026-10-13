'use client'

import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

export default function OceanTreasure({ position, number, golden = false, open = false, active = false }: {
  position: [number, number, number]
  number?: number
  golden?: boolean
  open?: boolean
  active?: boolean
}) {
  const lid = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const targetOpen = useRef(open ? -1.08 : 0)
  useFrame((state, delta) => {
    targetOpen.current = open ? -1.08 : 0
    if (lid.current) lid.current.rotation.x = THREE.MathUtils.damp(lid.current.rotation.x, targetOpen.current, 8, Math.min(delta, 0.05))
    if (ring.current) {
      ring.current.rotation.z = state.clock.elapsedTime * 0.35
      const material = ring.current.material as THREE.MeshBasicMaterial
      material.opacity = active ? 0.52 + Math.sin(state.clock.elapsedTime * 4) * 0.16 : golden ? 0.28 : 0
    }
  })

  const trim = golden ? '#f4c95d' : '#d6ad62'
  const wood = golden ? '#9d6338' : '#87583b'
  const numberColor = golden ? '#fff4b1' : '#fff6da'
  return <group position={position}>
    <mesh ref={ring} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.92, 1.13, 32]} />
      <meshBasicMaterial color={golden ? '#ffe27a' : '#9be5ef'} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.14, 0.58, 0.85]} />
      <meshStandardMaterial color={wood} roughness={0.78} flatShading />
    </mesh>
    <mesh position={[0, 0.32, 0.45]}>
      <boxGeometry args={[1.18, 0.11, 0.07]} />
      <meshStandardMaterial color={trim} metalness={0.12} roughness={0.5} />
    </mesh>
    <mesh position={[0, 0.32, -0.45]}>
      <boxGeometry args={[1.18, 0.11, 0.07]} />
      <meshStandardMaterial color={trim} metalness={0.12} roughness={0.5} />
    </mesh>
    <mesh position={[-0.46, 0.32, 0]}>
      <boxGeometry args={[0.07, 0.62, 0.92]} />
      <meshStandardMaterial color={trim} metalness={0.12} roughness={0.5} />
    </mesh>
    <mesh position={[0.46, 0.32, 0]}>
      <boxGeometry args={[0.07, 0.62, 0.92]} />
      <meshStandardMaterial color={trim} metalness={0.12} roughness={0.5} />
    </mesh>
    <group ref={lid} position={[0, 0.6, -0.38]}>
      <mesh position={[0, 0.09, 0.38]} castShadow>
        <boxGeometry args={[1.2, 0.2, 0.92]} />
        <meshStandardMaterial color={wood} roughness={0.75} flatShading emissive={open ? '#74d6d1' : '#000000'} emissiveIntensity={open ? 0.25 : 0} />
      </mesh>
      <mesh position={[0, 0.1, 0.77]}>
        <boxGeometry args={[1.2, 0.09, 0.06]} />
        <meshStandardMaterial color={trim} metalness={0.12} roughness={0.5} />
      </mesh>
    </group>
    <mesh position={[0, 0.34, 0.48]}>
      <boxGeometry args={[0.2, 0.26, 0.06]} />
      <meshStandardMaterial color={trim} metalness={0.28} roughness={0.4} />
    </mesh>
    <Billboard position={[0, 1.62, 0]}>
      <Text fontSize={golden ? 0.82 : 0.76} color={numberColor} outlineColor="#17465b" outlineWidth={0.045} anchorX="center" anchorY="middle" fontWeight={900}>
        {golden ? '★' : number}
      </Text>
    </Billboard>
  </group>
}

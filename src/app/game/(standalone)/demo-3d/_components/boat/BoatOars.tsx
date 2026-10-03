'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BOAT_CONFIG } from './boat.config'

function Oar({ side, active }: { side: -1 | 1; active: boolean }) {
  const pivot = useRef<THREE.Group>(null)
  const phase = side === -1 ? 0 : Math.PI
  useFrame(({ clock }) => {
    if (!pivot.current) return
    const time = clock.elapsedTime * BOAT_CONFIG.rowingMaxFrequency + phase
    const amount = active ? 1 : 0
    const stroke = Math.sin(time) * amount
    pivot.current.rotation.y = side * (active ? stroke * 0.22 : 0.06)
    pivot.current.rotation.x = active ? side * Math.sin(time + 0.45) * 0.1 : 0
  })

  return <group ref={pivot} position={[0.15, 0.72, side * 0.78]}>
    <mesh position={[0, 0, side * 0.53]} rotation={[Math.PI / 2, 0, 0]} castShadow={false}>
      <cylinderGeometry args={[0.045, 0.055, 1.3, 5]} />
      <meshStandardMaterial color={BOAT_CONFIG.colors.wood} roughness={0.94} flatShading />
    </mesh>
    <mesh position={[0, -0.015, side * 1.12]} rotation={[0, 0, side * -0.08]}>
      <boxGeometry args={[0.22, 0.075, 0.52]} />
      <meshStandardMaterial color={BOAT_CONFIG.colors.woodLight} roughness={0.92} flatShading />
    </mesh>
    <mesh position={[0, 0.06, side * 0.13]}>
      <sphereGeometry args={[0.105, 6, 5]} />
      <meshStandardMaterial color={BOAT_CONFIG.colors.rope} roughness={1} flatShading />
    </mesh>
  </group>
}

export default function BoatOars({ active }: { active: boolean }) {
  return <group>
    {([-1, 1] as const).map((side) => <Oar key={side} side={side} active={active} />)}
  </group>
}

'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

const SCHOOLS: { center: [number, number, number]; color: string; count: number; radius: number; phase: number }[] = [
  { center: [-13, 3.5, 6], color: '#f4b957', count: 4, radius: 3.2, phase: 0.2 },
  { center: [4, 4.2, 12], color: '#76d6c0', count: 4, radius: 3.6, phase: 1.8 },
  { center: [14, 3.3, -8], color: '#f28b82', count: 4, radius: 2.9, phase: 3.6 },
]

export default function OceanFish() {
  return <>{SCHOOLS.flatMap((school, schoolIndex) => Array.from({ length: school.count }, (_, index) => <Fish key={`${schoolIndex}-${index}`} school={school} schoolIndex={schoolIndex} index={index} />))}</>
}

function Fish({ school, schoolIndex, index }: { school: typeof SCHOOLS[number]; schoolIndex: number; index: number }) {
  const group = useRef<THREE.Group>(null)
  const tail = useRef<THREE.Mesh>(null)
  const offset = useMemo(() => index / school.count * Math.PI * 2 + school.phase, [index, school.count, school.phase])
  useFrame(({ clock }) => {
    const time = clock.elapsedTime * (0.34 + schoolIndex * 0.035) + offset
    if (!group.current) return
    const radius = school.radius + Math.sin(time * 0.6 + index) * 0.4
    const x = school.center[0] + Math.cos(time) * radius
    const z = school.center[2] + Math.sin(time) * radius * 0.62
    const y = school.center[1] + Math.sin(time * 1.7 + index) * 0.28
    group.current.position.set(x, y, z)
    const dx = -Math.sin(time)
    const dz = Math.cos(time) * 0.62
    group.current.rotation.y = Math.atan2(dx, dz)
    group.current.rotation.z = Math.sin(time * 1.7 + index) * 0.035
    if (tail.current) tail.current.rotation.y = Math.sin(time * 8) * 0.28
  })
  return <group ref={group}>
    <mesh castShadow scale={[0.58, 0.29, 0.3]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial color={school.color} flatShading roughness={0.72} />
    </mesh>
    <mesh ref={tail} position={[0, 0, -0.48]} rotation={[0, 0, Math.PI / 2]}>
      <coneGeometry args={[0.24, 0.45, 5]} />
      <meshStandardMaterial color={school.color} flatShading roughness={0.76} />
    </mesh>
    <mesh position={[0.22, 0.1, 0.24]} scale={0.065}>
      <sphereGeometry args={[1, 6, 5]} /><meshBasicMaterial color="#fff8da" />
    </mesh>
    <mesh position={[0.24, 0.1, 0.275]} scale={0.035}>
      <sphereGeometry args={[1, 6, 5]} /><meshBasicMaterial color="#284553" />
    </mesh>
  </group>
}

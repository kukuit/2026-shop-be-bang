'use client'

import { Billboard, Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useRef } from 'react'
import * as THREE from 'three'
import { PORTALS, type PortalInfo } from '../types'
import styles from '../demo.module.css'

const PORTAL_POSITIONS: Record<PortalInfo['id'], [number, number, number]> = {
  english: [0, 0, -10],
}

export default function VillagePortals() {
  return <>{PORTALS.map((portal) => <Portal key={portal.id} portal={portal} position={PORTAL_POSITIONS[portal.id]} />)}</>
}

function Portal({ portal, position }: { portal: PortalInfo; position: [number, number, number] }) {
  const yaw = Math.PI
  const size = 1.12
  return <group position={position} rotation={[0, yaw, 0]}>
    <PortalRing color={portal.color} position={[0, 1.55, 0]} scale={size} />
    <mesh position={[0, 1.58, -0.13]}><circleGeometry args={[0.82 * size, 32]} /><meshBasicMaterial color={portal.color} transparent opacity={0.35} side={THREE.DoubleSide} /></mesh>
    <Billboard position={[0, 3.2, 0]}><Html center distanceFactor={13} occlude={false}>
      <div className={styles.portalSign} data-camera-ignore style={{ ['--portal-color' as string]: portal.color }}><span>☄</span>{portal.title}</div>
    </Html></Billboard>
    <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.18, 1.3, 0.42]} position={[0, 1.2, 0]} /></RigidBody>
  </group>
}

function PortalRing({ color, position, scale }: { color: string; position: [number, number, number]; scale: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => { if (ref.current) ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05 })
  return <mesh ref={ref} position={position} scale={scale} castShadow><torusGeometry args={[1, 0.14, 8, 32]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} metalness={0.12} roughness={0.3} /></mesh>
}

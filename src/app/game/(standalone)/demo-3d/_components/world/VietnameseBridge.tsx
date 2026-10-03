'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

const BRIDGE_CENTER_Z = -28.9
const BRIDGE_LENGTH = 17.5
const BRIDGE_HALF_LENGTH = BRIDGE_LENGTH / 2
const PLANK_COUNT = 18

export default function VietnameseBridge({ showSign = false }: { showSign?: boolean }) {
  const planks = useRef<THREE.InstancedMesh>(null)
  const posts = useRef<THREE.InstancedMesh>(null)
  const plankGeometry = useMemo(() => new THREE.BoxGeometry(2.58, 0.045, 0.65), [])
  const plankMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d3a46d', roughness: 0.95, flatShading: true }), [])
  const postGeometry = useMemo(() => new THREE.BoxGeometry(0.15, 0.78, 0.18), [])
  const postMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c18b55', roughness: 0.94, flatShading: true }), [])

  useLayoutEffect(() => {
    const transform = new THREE.Object3D()
    for (let index = 0; index < PLANK_COUNT; index++) {
      const z = -BRIDGE_HALF_LENGTH + 0.5 + index * (BRIDGE_LENGTH - 1) / (PLANK_COUNT - 1)
      transform.position.set(0, 0.16, z)
      transform.rotation.set(0, 0, 0)
      transform.scale.set(1, 1, 1)
      transform.updateMatrix()
      planks.current?.setMatrixAt(index, transform.matrix)
    }
    for (let side = 0; side < 2; side++) {
      const x = side === 0 ? -1.42 : 1.42
      for (let index = 0; index < 8; index++) {
        const z = -BRIDGE_HALF_LENGTH + 0.25 + index * (BRIDGE_LENGTH - 0.5) / 7
        const instance = side * 8 + index
        transform.position.set(x, 0.52, z)
        transform.updateMatrix()
        posts.current?.setMatrixAt(instance, transform.matrix)
      }
    }
    if (planks.current) planks.current.instanceMatrix.needsUpdate = true
    if (posts.current) posts.current.instanceMatrix.needsUpdate = true
  }, [])

  return <>
    <RigidBody type="fixed" colliders={false} position={[0, 0, BRIDGE_CENTER_Z]}>
      <mesh position={[0, 0, 0]} receiveShadow castShadow>
        <boxGeometry args={[2.72, 0.28, BRIDGE_LENGTH]} />
        <meshStandardMaterial color="#b98450" roughness={0.92} flatShading />
      </mesh>
      <instancedMesh ref={planks} args={[plankGeometry, plankMaterial, PLANK_COUNT]} castShadow receiveShadow />
      <mesh position={[-1.42, 0.8, 0]} castShadow>
        <boxGeometry args={[0.16, 0.14, BRIDGE_LENGTH]} />
        <meshStandardMaterial color="#b27b48" roughness={0.92} flatShading />
      </mesh>
      <mesh position={[1.42, 0.8, 0]} castShadow>
        <boxGeometry args={[0.16, 0.14, BRIDGE_LENGTH]} />
        <meshStandardMaterial color="#b27b48" roughness={0.92} flatShading />
      </mesh>
      <instancedMesh ref={posts} args={[postGeometry, postMaterial, 16]} castShadow />
      <CuboidCollider args={[1.36, 0.14, BRIDGE_HALF_LENGTH]} position={[0, 0, 0]} friction={0.9} />
      <CuboidCollider args={[0.09, 0.52, BRIDGE_HALF_LENGTH]} position={[-1.42, 0.54, 0]} friction={0.9} />
      <CuboidCollider args={[0.09, 0.52, BRIDGE_HALF_LENGTH]} position={[1.42, 0.54, 0]} friction={0.9} />
    </RigidBody>
    {showSign && <group position={[1.42, 3.1, BRIDGE_CENTER_Z + BRIDGE_HALF_LENGTH - BRIDGE_LENGTH * 0.2]}>
      <mesh position={[0, -1.115, 0]} castShadow><boxGeometry args={[0.28, 2.23, 0.28]} /><meshStandardMaterial color="#a87548" roughness={0.9} /></mesh>
      <mesh position={[0, 0, 0]} castShadow><boxGeometry args={[4.9, 1.56, 0.32]} /><meshStandardMaterial color="#815237" roughness={0.88} /></mesh>
      <mesh position={[0, 0, 0.181]}><boxGeometry args={[4.62, 1.28, 0.05]} /><meshStandardMaterial color="#fff0ce" roughness={0.9} /></mesh>
      <Text position={[0, 0, 0.21]} fontSize={0.42} color="#684631" anchorX="center" anchorY="middle" outlineWidth={0.003} outlineColor="#fff0ce">
        Vùng đất Tiếng Việt
      </Text>
    </group>}
  </>
}

'use client'

import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { Text } from '@react-three/drei'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import VietnameseBridge from './VietnameseBridge'

const TREES: [number, number, number, number][] = [
  [-15, 0, -48, 1], [-12, 0, -68, 0.78], [15, 0, -47, 0.9], [17, 0, -64, 1.08],
  [-18, 0, -58, 0.86], [11, 0, -73, 0.78],
]

function VietnameseEnvironment({}: { playerRef: MutableRefObject<RapierRigidBody | null>; onHousePorchChange: (inside: boolean) => void }) {
  const trees = useRef<THREE.InstancedMesh>(null)
  const treeGeometry = useMemo(() => new THREE.ConeGeometry(1, 2.2, 6), [])
  const treeMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4f9761', roughness: 1, flatShading: true }), [])
  const landGeometry = useMemo(() => new THREE.CircleGeometry(28, 56), [])

  useLayoutEffect(() => {
    const transform = new THREE.Object3D()
    TREES.forEach(([x, , z, scale], index) => {
      transform.position.set(x, 1.05 * scale, z)
      transform.rotation.set(0, index * 0.7, 0)
      transform.scale.set(scale, scale, scale)
      transform.updateMatrix()
      trees.current?.setMatrixAt(index, transform.matrix)
    })
    if (trees.current) trees.current.instanceMatrix.needsUpdate = true
  }, [])

  return <>
    <mesh position={[0, -0.52, -59]} receiveShadow>
      <boxGeometry args={[110, 0.1, 120]} />
      <meshStandardMaterial color="#55b9c3" roughness={0.72} metalness={0.08} />
    </mesh>
    <mesh geometry={landGeometry} position={[0, 0, -60]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.96, 1.03, 1]} receiveShadow>
      <meshStandardMaterial color="#91b879" roughness={0.98} />
    </mesh>
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[26.8, 0.18, 28.8]} position={[0, -0.18, -60]} friction={1} />
    </RigidBody>
    <VietnameseBridge />
    <mesh position={[0, 0.045, -49]} receiveShadow>
      <boxGeometry args={[2.35, 0.035, 22]} />
      <meshStandardMaterial color="#d8c394" roughness={1} />
    </mesh>
    <group position={[-3.8, 2.35, -43.5]}>
      <mesh position={[0, -0.28, 0]}><boxGeometry args={[0.12, 0.62, 0.12]} /><meshStandardMaterial color="#79583b" /></mesh>
      <mesh><boxGeometry args={[3.1, 0.62, 0.13]} /><meshStandardMaterial color="#f4e6bd" roughness={0.9} /></mesh>
      <Text position={[0, 0, 0.075]} fontSize={0.25} color="#3d6949" anchorX="center" anchorY="middle" outlineWidth={0.004} outlineColor="#f4e6bd">Vùng đất Tiếng Việt</Text>
    </group>
    <instancedMesh ref={trees} args={[treeGeometry, treeMaterial, TREES.length]} castShadow={false} receiveShadow={false} />
    {[-1, 0, 1].map((index) => <group key={index} position={[index * 4.2, 0, -65]}>
      <mesh position={[0, 0.48, 0]}><cylinderGeometry args={[0.82, 0.96, 0.82, 7]} /><meshStandardMaterial color="#c6a66c" roughness={0.95} flatShading /></mesh>
      <Text position={[0, 1.38, 0]} fontSize={1.18} color={['#e95d55', '#4e8fd0', '#e4a937'][index + 1]} anchorX="center" anchorY="middle" outlineWidth={0.018} outlineColor="#fff5d7">{'ABC'[index + 1]}</Text>
    </group>)}
  </>
}

export default memo(VietnameseEnvironment)

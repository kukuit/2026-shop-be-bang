'use client'

import { Text } from '@react-three/drei'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useMemo } from 'react'
import type { MutableRefObject } from 'react'
import * as THREE from 'three'
import HouseEntranceTrigger from './HouseEntranceTrigger'
import { CAPPY_HOUSE, HOUSE_COLLIDER } from './houseConfig'

export default function CappyHouse({ playerRef, onPorchChange }: {
  playerRef: MutableRefObject<RapierRigidBody | null>
  onPorchChange: (inside: boolean) => void
}) {
  const gableGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      -2.25, 2.78, 0, 2.25, 2.78, 0, 0, 4.02, 0,
    ], 3))
    geometry.setIndex([0, 2, 1])
    geometry.computeVertexNormals()
    return geometry
  }, [])

  return <>
  <group position={CAPPY_HOUSE.position} rotation={[0, CAPPY_HOUSE.rotation, 0]}>
    <mesh castShadow receiveShadow position={[0, CAPPY_HOUSE.wallHeight / 2, 0]}>
      <boxGeometry args={[CAPPY_HOUSE.width, CAPPY_HOUSE.wallHeight, CAPPY_HOUSE.depth]} />
      <meshStandardMaterial color="#fff0ce" roughness={0.94} />
    </mesh>
    <mesh geometry={gableGeometry} position={[0, 0, CAPPY_HOUSE.frontZ]}>
      <meshStandardMaterial color="#fff0ce" roughness={0.94} side={THREE.DoubleSide} />
    </mesh>
    <mesh geometry={gableGeometry} position={[0, 0, -CAPPY_HOUSE.frontZ]}>
      <meshStandardMaterial color="#fff0ce" roughness={0.94} side={THREE.DoubleSide} />
    </mesh>

    <mesh castShadow position={[-1.16, 3.43, 0]} rotation={[0, 0, 0.5]}>
      <boxGeometry args={[2.92, 0.2, 4.22]} />
      <meshStandardMaterial color="#e66f51" flatShading roughness={0.9} />
    </mesh>
    <mesh castShadow position={[1.16, 3.43, 0]} rotation={[0, 0, -0.5]}>
      <boxGeometry args={[2.92, 0.2, 4.22]} />
      <meshStandardMaterial color="#e66f51" flatShading roughness={0.9} />
    </mesh>
    <mesh castShadow position={[0, 2.83, 0]}>
      <boxGeometry args={[4.72, 0.18, 4.3]} />
      <meshStandardMaterial color="#d95c43" roughness={0.92} />
    </mesh>

    <mesh castShadow position={[0, CAPPY_HOUSE.door.height / 2, CAPPY_HOUSE.door.z]}>
      <boxGeometry args={[CAPPY_HOUSE.door.width, CAPPY_HOUSE.door.height, 0.1]} />
      <meshStandardMaterial color="#9b6041" roughness={0.92} />
    </mesh>
    <mesh position={[0.34, 1.08, CAPPY_HOUSE.door.z + 0.06]}>
      <sphereGeometry args={[0.055, 8, 6]} />
      <meshStandardMaterial color="#f8d47d" roughness={0.55} />
    </mesh>
    <FrontWindow position={[-1.48, 1.72, CAPPY_HOUSE.door.z + 0.015]} />
    <FrontWindow position={[1.48, 1.72, CAPPY_HOUSE.door.z + 0.015]} />
    <group position={[0, 2.48, CAPPY_HOUSE.door.z + 0.12]}>
      <mesh castShadow>
        <boxGeometry args={[1.72, 0.48, 0.09]} />
        <meshStandardMaterial color="#815237" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[1.58, 0.35, 0.025]} />
        <meshStandardMaterial color="#fff0ce" roughness={0.9} />
      </mesh>
      <Text
        position={[0, 0, 0.066]}
        fontSize={0.19}
        color="#684631"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.004}
        outlineColor="#fff0ce"
      >
        NHÀ CAPPY
      </Text>
    </group>

    <mesh castShadow receiveShadow position={CAPPY_HOUSE.porch.position}>
      <boxGeometry args={[CAPPY_HOUSE.porch.width, CAPPY_HOUSE.porch.height, CAPPY_HOUSE.porch.depth]} />
      <meshStandardMaterial color="#e7dfcf" roughness={0.96} />
    </mesh>
  </group>
  <RigidBody type="fixed" colliders={false} position={CAPPY_HOUSE.position} rotation={[0, CAPPY_HOUSE.rotation, 0]}>
    {HOUSE_COLLIDER.walls.map((wall) => <CuboidCollider key={wall.id} args={wall.halfExtents} position={wall.position} />)}
    <CuboidCollider args={HOUSE_COLLIDER.porch.halfExtents} position={HOUSE_COLLIDER.porch.position} friction={1} />
  </RigidBody>
  <HouseEntranceTrigger playerRef={playerRef} onPorchChange={onPorchChange} />
  </>
}

function FrontWindow({ position }: { position: [number, number, number] }) {
  return <group position={position}>
    <mesh><boxGeometry args={[0.82, 0.72, 0.1]} /><meshStandardMaterial color="#fff8e9" roughness={0.9} /></mesh>
    <mesh position={[0, 0, 0.06]}><boxGeometry args={[0.65, 0.54, 0.035]} /><meshStandardMaterial color="#8fd4e1" roughness={0.52} /></mesh>
    <mesh position={[0, 0, 0.09]}><boxGeometry args={[0.045, 0.54, 0.025]} /><meshStandardMaterial color="#fff8e9" roughness={0.9} /></mesh>
    <mesh position={[0, 0, 0.09]}><boxGeometry args={[0.65, 0.045, 0.025]} /><meshStandardMaterial color="#fff8e9" roughness={0.9} /></mesh>
  </group>
}

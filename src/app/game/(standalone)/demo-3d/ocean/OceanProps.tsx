'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { OCEAN_COLLECTIBLES, OCEAN_LANDMARKS, getOceanFloorHeight, type OceanCollectible } from './ocean-layout'

const CORAL_COLORS = ['#f57978', '#ffad68', '#d68ed7', '#62c6bb', '#f2cf6b']
const CORAL_CLUSTERS: [number, number, number, number][] = [
  [-10, 0, -8, 0], [-6.7, 0, -10.8, 2], [-12.6, 0, -5.6, 3], [-5, 0, -5.5, 1],
  [9.2, 0, 0.1, 4], [12.2, 0, 4.1, 0], [8, 0, 5.5, 2], [-13, 0, 9, 3],
  [-9.1, 0, 12.8, 1], [4.8, 0, -14.8, 2], [10.5, 0, -14, 4], [21.5, 0, -18.2, 3],
]

const SEAWEED_POSITIONS: [number, number][] = [
  [-11.5, -3], [-7.5, -12], [5.5, 4], [12.5, 6], [-14.5, 13], [4, -17],
  [14.7, -15], [24, -17], [-21, 3], [21, 8], [-4, 18], [1, -16],
]

const STONE_POSITIONS: [number, number, number][] = [
  [-4.5, 0, -2], [4.2, 0, -2.7], [-4.8, 0, -12], [5, 0, -8], [13.5, 0, -4],
  [-17, 0, 7], [16, 0, 10], [-3.5, 0, 15], [22.8, 0, -16], [25, 0, 0],
]

export default function OceanProps({ collectedIds }: { collectedIds: ReadonlySet<string> }) {
  return <>
    {CORAL_CLUSTERS.map(([x, , z, colorIndex], index) => <CoralCluster key={index} position={[x, getOceanFloorHeight(x, z), z]} colorIndex={colorIndex} seed={index} />)}
    {SEAWEED_POSITIONS.map(([x, z], index) => <Seaweed key={index} position={[x, getOceanFloorHeight(x, z), z]} seed={index} />)}
    {STONE_POSITIONS.map(([x, , z], index) => <mesh key={index} position={[x, getOceanFloorHeight(x, z) + 0.16, z]} rotation={[0.2, index * 0.7, 0.08]} scale={[0.48 + index % 3 * 0.18, 0.32 + index % 2 * 0.12, 0.39]}>
      <dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color={index % 2 ? '#819188' : '#9c9c80'} roughness={1} flatShading />
    </mesh>)}
    {OCEAN_COLLECTIBLES.map((item) => <CollectibleModel key={item.id} item={item} hidden={collectedIds.has(item.id)} />)}
    <OceanBubbles />
    {OCEAN_LANDMARKS.slice(1, 5).map((landmark, index) => <CoralPatch key={landmark.id} position={[landmark.position[0], getOceanFloorHeight(landmark.position[0], landmark.position[2]), landmark.position[2]]} index={index} />)}
  </>
}

function CoralCluster({ position, colorIndex, seed }: { position: [number, number, number]; colorIndex: number; seed: number }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.z = Math.sin(clock.elapsedTime * 0.55 + seed) * 0.035
  })
  const color = CORAL_COLORS[colorIndex % CORAL_COLORS.length]
  return <group ref={group} position={position}>
    <mesh position={[0, 0.55, 0]} castShadow><cylinderGeometry args={[0.17, 0.3, 1.1, 6]} /><meshStandardMaterial color={color} flatShading roughness={0.88} /></mesh>
    {[-0.5, 0, 0.47].map((offset, index) => <group key={index} position={[offset, 0.55, 0]} rotation={[0, 0, (index - 1) * 0.28]}>
      <mesh position={[0, 0.58 + index % 2 * 0.18, 0]} castShadow><cylinderGeometry args={[0.11, 0.17, 0.92 + index % 2 * 0.25, 5]} /><meshStandardMaterial color={color} flatShading roughness={0.88} /></mesh>
      <mesh position={[0, 1.03 + index % 2 * 0.15, 0]}><sphereGeometry args={[0.14, 6, 5]} /><meshStandardMaterial color={color} flatShading roughness={0.9} /></mesh>
    </group>)}
  </group>
}

function Seaweed({ position, seed }: { position: [number, number, number]; seed: number }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.z = Math.sin(clock.elapsedTime * 0.9 + seed) * 0.12
  })
  return <group ref={group} position={position}>
    {[-0.22, 0, 0.22].map((x, index) => <mesh key={index} position={[x, 0.68 + index % 2 * 0.22, 0]} rotation={[0, 0, (index - 1) * 0.12]}>
      <coneGeometry args={[0.13, 1.45 + index % 2 * 0.35, 5]} /><meshStandardMaterial color={index % 2 ? '#4fae81' : '#66bb78'} flatShading roughness={1} />
    </mesh>)}
  </group>
}

function makeStarGeometry() {
  const shape = new THREE.Shape()
  for (let index = 0; index < 10; index++) {
    const angle = index * Math.PI / 5 - Math.PI / 2
    const radius = index % 2 === 0 ? 0.42 : 0.19
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  const geometry = new THREE.ShapeGeometry(shape)
  geometry.computeVertexNormals()
  return geometry
}

function CollectibleModel({ item, hidden }: { item: OceanCollectible; hidden: boolean }) {
  const starGeometry = useMemo(makeStarGeometry, [])
  const baseY = getOceanFloorHeight(item.position[0], item.position[2])
  if (hidden) return null
  if (item.kind === 'starfish') return <mesh geometry={starGeometry} position={[item.position[0], baseY + 0.08, item.position[2]]} rotation={[-Math.PI / 2, 0, item.position[0] * 0.2]}>
    <meshStandardMaterial color="#f27b61" roughness={0.92} flatShading />
  </mesh>
  if (item.kind === 'shell') return <group position={[item.position[0], baseY + 0.2, item.position[2]]} rotation={[-0.15, item.position[0], 0.06]}>
    <mesh scale={[0.48, 0.28, 0.38]}><sphereGeometry args={[1, 8, 5, 0, Math.PI]} /><meshStandardMaterial color="#f0d9a5" roughness={0.76} flatShading /></mesh>
    <mesh position={[0, 0.09, 0]} scale={[0.35, 0.19, 0.27]}><sphereGeometry args={[1, 8, 5, 0, Math.PI]} /><meshStandardMaterial color="#ffebc3" roughness={0.74} flatShading /></mesh>
  </group>
  return <mesh position={[item.position[0], baseY + 0.5, item.position[2]]} rotation={[0.25, item.position[0], 0.18]}>
    <octahedronGeometry args={[item.kind === 'gem' ? 0.3 : 0.25, 0]} />
    <meshStandardMaterial color={item.kind === 'gem' ? '#86f2db' : '#fff0b5'} emissive={item.kind === 'gem' ? '#2dbeaa' : '#c5a54b'} emissiveIntensity={0.18} roughness={0.28} metalness={0.08} />
  </mesh>
}

function CoralPatch({ position, index }: { position: [number, number, number]; index: number }) {
  return <group position={position}>
    {[0, 1, 2, 3].map((item) => <mesh key={item} position={[(item - 1.5) * 0.38, 0.28, (item % 2) * 0.2]} rotation={[0, item * 0.5, 0]} scale={[0.36, 0.23, 0.3]}>
      <dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color={CORAL_COLORS[(index + item) % CORAL_COLORS.length]} roughness={0.94} flatShading />
    </mesh>)}
  </group>
}

function OceanBubbles() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 7, 5), [])
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#c5fcff', transparent: true, opacity: 0.54, depthWrite: false }), [])
  const seeds = useMemo(() => Array.from({ length: 18 }, (_, index) => ({
    x: Math.sin(index * 2.41) * 25,
    z: Math.cos(index * 1.73) * 24,
    phase: index * 0.37,
    scale: 0.12 + index % 4 * 0.035,
  })), [])
  useFrame(({ clock }) => {
    const time = clock.elapsedTime
    seeds.forEach((bubble, index) => {
      const rise = (time * 0.38 + bubble.phase) % 5
      dummy.position.set(bubble.x + Math.sin(time + bubble.phase) * 0.16, getOceanFloorHeight(bubble.x, bubble.z) + rise + 0.4, bubble.z)
      dummy.scale.setScalar(bubble.scale * (0.85 + Math.sin(time * 2 + index) * 0.12))
      dummy.updateMatrix()
      mesh.current?.setMatrixAt(index, dummy.matrix)
    })
    if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[geometry, material, seeds.length]} />
}

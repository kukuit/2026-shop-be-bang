'use client'

import { Billboard, Text } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { OCEAN_LANDMARKS, OCEAN_MAP_HALF_SIZE, OCEAN_SURFACE_Y, getOceanFloorHeight } from './ocean-layout'

function makeSeabed() {
  const size = OCEAN_MAP_HALF_SIZE * 2 + 8
  const geometry = new THREE.PlaneGeometry(size, size, 64, 64)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors: number[] = []
  const sand = new THREE.Color('#c6b47d')
  const shallow = new THREE.Color('#9da96f')
  const color = new THREE.Color()
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index)
    const z = position.getZ(index)
    const height = getOceanFloorHeight(x, z)
    position.setY(index, height)
    const shade = THREE.MathUtils.clamp((height + 1.15) / 1.9, 0, 1)
    color.copy(sand).lerp(shallow, shade * 0.62)
    colors.push(color.r, color.g, color.b)
  }
  position.needsUpdate = true
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

const RIDGE_POINTS: [number, number, number, number][] = [
  [-30.5, -0.2, -24, 0.25], [-29.8, -0.4, -9, 0.08], [-30.8, -0.3, 10, -0.18], [-28.8, -0.2, 25, -0.12],
  [30.3, -0.3, -24, -0.22], [30.7, -0.2, -7, 0.15], [29.5, -0.4, 12, 0.25], [28.7, -0.25, 25, 0.1],
  [-23, -0.4, -30.6, -0.18], [-7, -0.2, -30.3, 0.16], [11, -0.3, -30.5, 0.08], [25, -0.2, -29.8, -0.14],
  [-23, -0.3, 30.1, 0.12], [-5, -0.4, 29.7, -0.16], [14, -0.2, 30.4, 0.2], [26, -0.3, 29.5, -0.08],
]

export default function OceanTerrain() {
  const seabed = useMemo(makeSeabed, [])
  const rockGeometry = useMemo(() => new THREE.DodecahedronGeometry(1, 0), [])
  const waterGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(68, 68, 1, 1)
    geometry.rotateX(-Math.PI / 2)
    return geometry
  }, [])

  return <>
    <mesh geometry={seabed} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} flatShading />
    </mesh>
    <mesh geometry={waterGeometry} position={[0, OCEAN_SURFACE_Y, 0]}>
      <meshBasicMaterial color="#72dce0" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    <mesh position={[0, OCEAN_SURFACE_Y + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[68, 68]} />
      <meshBasicMaterial color="#b1fbf2" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    {RIDGE_POINTS.map(([x, y, z, yaw], index) => <mesh key={index} geometry={rockGeometry} position={[x, y + 1.1, z]} rotation={[0.16, yaw, 0.08]} scale={[3.1 + index % 3 * 0.4, 2.2 + index % 2 * 0.35, 2.8]}>
      <meshStandardMaterial color={index % 3 === 0 ? '#657b72' : '#778276'} roughness={1} flatShading />
    </mesh>)}
    <RockArch position={[-15, -0.25, -13]} />
    <Ruins position={[7, -0.1, -12]} />
    <Shipwreck position={[19, -0.1, -21]} />
    {OCEAN_LANDMARKS.map((landmark) => <Billboard key={landmark.id} position={[landmark.position[0], landmark.id === 'shipwreck' ? 4.6 : 3.2, landmark.position[2]]}>
      <Text position={[0, 0.16, 0]} fontSize={landmark.id === 'start' ? 0.43 : 0.35} color="#e8ffff" outlineColor="#15536b" outlineWidth={0.028} anchorX="center" anchorY="middle" textAlign="center" maxWidth={6}>
        {landmark.name}
      </Text>
      <Text position={[0, -0.2, 0]} fontSize={0.22} color="#e8ffff" outlineColor="#15536b" outlineWidth={0.02} anchorX="center" anchorY="middle" textAlign="center" maxWidth={6}>
        {landmark.subtitle}
      </Text>
    </Billboard>)}
    <SunlightShaft position={[-11, 4.7, -2]} scale={[3.2, 7.8, 0.85]} rotation={[0, 0, 0.2]} />
    <SunlightShaft position={[5, 4.4, 10]} scale={[2.2, 7.2, 0.7]} rotation={[0, 0, -0.28]} />
    <SunlightShaft position={[17, 4.6, -8]} scale={[2.5, 7.5, 0.75]} rotation={[0, 0, 0.32]} />
  </>
}

function RockArch({ position }: { position: [number, number, number] }) {
  return <group position={position}>
    {[-1.8, 1.8].map((x, index) => <mesh key={index} position={[x, 1.35, 0]} rotation={[0.05, 0.1 * index, -0.04]} scale={[1.25, 1.8, 1.1]}>
      <dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color={index ? '#6c8878' : '#82927b'} flatShading roughness={1} />
    </mesh>)}
    <mesh position={[0, 3.05, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1.2, 0.7, 1]}>
      <torusGeometry args={[1.75, 0.55, 5, 8, Math.PI]} /><meshStandardMaterial color="#718b7b" flatShading roughness={1} />
    </mesh>
  </group>
}

function Ruins({ position }: { position: [number, number, number] }) {
  return <group position={position}>
    {[-1.5, 0, 1.5].map((x, index) => <group key={index} position={[x, 0, index === 1 ? -1.1 : 0.4]} rotation={[0, 0, (index - 1) * 0.06]}>
      <mesh position={[0, 1.25, 0]} castShadow><cylinderGeometry args={[0.43, 0.57, 2.5, 7]} /><meshStandardMaterial color="#7f9586" flatShading roughness={1} /></mesh>
      <mesh position={[0, 2.55, 0]}><cylinderGeometry args={[0.65, 0.6, 0.2, 7]} /><meshStandardMaterial color="#b0ad84" flatShading roughness={1} /></mesh>
    </group>)}
    <mesh position={[0, 0.4, 1.9]} rotation={[0.16, 0, -0.12]}><boxGeometry args={[4.4, 0.55, 0.65]} /><meshStandardMaterial color="#899786" flatShading roughness={1} /></mesh>
  </group>
}

function Shipwreck({ position }: { position: [number, number, number] }) {
  return <group position={position} rotation={[0, -0.35, -0.08]}>
    <mesh position={[0, 0.52, 0]} scale={[1, 1, 1]} castShadow receiveShadow>
      <coneGeometry args={[2.6, 1.4, 7]} /><meshStandardMaterial color="#875f43" flatShading roughness={0.96} />
    </mesh>
    <mesh position={[0, 1.1, 0.1]} rotation={[0, 0, 0]} castShadow>
      <boxGeometry args={[4.9, 0.3, 2.7]} /><meshStandardMaterial color="#a8794d" flatShading roughness={0.96} />
    </mesh>
    {[-1.7, -0.8, 0.1, 1, 1.9].map((x, index) => <mesh key={index} position={[x, 1.45 + (index % 2) * 0.25, -0.25]} rotation={[0.05, 0, (index - 2) * 0.07]} castShadow>
      <boxGeometry args={[0.22, 1.7 + index % 2 * 0.55, 0.2]} /><meshStandardMaterial color="#956b47" flatShading roughness={1} />
    </mesh>)}
    <mesh position={[0.1, 2.25, -0.1]} rotation={[0, 0, -0.12]}><boxGeometry args={[0.18, 3.2, 0.16]} /><meshStandardMaterial color="#816147" flatShading /></mesh>
    <mesh position={[0.86, 2.4, 0]} rotation={[0, 0, 0.32]}><boxGeometry args={[2.15, 0.14, 0.1]} /><meshStandardMaterial color="#8e6745" flatShading /></mesh>
    <mesh position={[-0.18, 1.85, 0.35]}><boxGeometry args={[0.7, 0.58, 0.55]} /><meshStandardMaterial color="#77523e" flatShading roughness={1} /></mesh>
  </group>
}

function SunlightShaft({ position, scale, rotation }: { position: [number, number, number]; scale: [number, number, number]; rotation: [number, number, number] }) {
  return <mesh position={position} scale={scale} rotation={rotation}>
    <coneGeometry args={[0.5, 2, 5, 1, true]} />
    <meshBasicMaterial color="#bbfff1" transparent opacity={0.055} side={THREE.DoubleSide} depthWrite={false} />
  </mesh>
}

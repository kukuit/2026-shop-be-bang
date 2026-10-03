'use client'

import { Sparkles } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { EXPANSION_POINTS, FENCE_SEGMENTS, getOrganicOutlineScale, WORLD_CONFIG } from './worldConfig'
import type { RapierRigidBody } from '@react-three/rapier'
import type { MutableRefObject } from 'react'
import CappyHouse from './CappyHouse'

const FENCE_POST_GEOMETRY = new THREE.BoxGeometry(0.18, 0.9, 0.18)
const FENCE_RAIL_GEOMETRY = new THREE.BoxGeometry(1.2, 0.12, 0.12)
const FENCE_POST_MATERIAL = new THREE.MeshStandardMaterial({ color: '#fff0cb', roughness: 0.92 })
const FENCE_RAIL_MATERIAL = new THREE.MeshStandardMaterial({ color: '#eea355', roughness: 0.92 })
const TREE_TRUNK_GEOMETRY = new THREE.CylinderGeometry(0.17, 0.3, 1.7, 6)
const TREE_LOWER_GEOMETRY = new THREE.ConeGeometry(1.05, 2.1, 7)
const TREE_UPPER_GEOMETRY = new THREE.ConeGeometry(0.72, 1.6, 7)
const TREE_TRUNK_MATERIAL = new THREE.MeshStandardMaterial({ color: '#8b583a', roughness: 1 })
const TREE_LOWER_MATERIAL = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1 })
const TREE_UPPER_MATERIAL = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1 })
const TREE_LOWER_COLORS = ['#35b978', '#58c96f', '#69c980', '#20aa83'].map((color) => new THREE.Color(color))
const TREE_UPPER_COLORS = ['#82d16e', '#9bd876', '#72ca7c', '#58c98a'].map((color) => new THREE.Color(color))
const CLOUD_GEOMETRY = new THREE.IcosahedronGeometry(1, 1)
const CLOUD_MATERIAL = new THREE.MeshStandardMaterial({ color: 'white', roughness: 1 })

type TreeTransform = { position: [number, number, number]; scale: number; yaw: number }
type MountainTransform = { position: [number, number, number]; scale: [number, number, number]; color: THREE.Color }

function WorldEnvironment({ playerRef, onHousePorchChange }: {
  playerRef: MutableRefObject<RapierRigidBody | null>
  onHousePorchChange: (inside: boolean) => void
}) {
  const hubGeometry = useMemo(() => createOrganicDiscGeometry(WORLD_CONFIG.hub.radiusX, WORLD_CONFIG.hub.radiusZ), [])
  const bufferGeometry = useMemo(() => createOrganicRingGeometry(WORLD_CONFIG.fence.radiusX, WORLD_CONFIG.fence.radiusZ, WORLD_CONFIG.buffer.radiusX, WORLD_CONFIG.buffer.radiusZ), [])
  const riverGeometry = useMemo(() => createOrganicRingGeometry(WORLD_CONFIG.river.innerRadiusX, WORLD_CONFIG.river.innerRadiusZ, WORLD_CONFIG.river.outerRadiusX, WORLD_CONFIG.river.outerRadiusZ), [])
  const farBankGeometry = useMemo(() => createOrganicRingGeometry(WORLD_CONFIG.river.outerRadiusX, WORLD_CONFIG.river.outerRadiusZ, WORLD_CONFIG.river.outerRadiusX + 1.8, WORLD_CONFIG.river.outerRadiusZ + 1.8, { centerAngle: 0, halfAngle: 0.25 }), [])
  const outerLandGeometry = useMemo(() => createOrganicRingGeometry(WORLD_CONFIG.farBank.innerRadiusX, WORLD_CONFIG.farBank.innerRadiusZ, WORLD_CONFIG.farBank.outerRadiusX, WORLD_CONFIG.farBank.outerRadiusZ, { centerAngle: 0, halfAngle: 0.25 }), [])

  return <>
    <SkyDome />
    <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[WORLD_CONFIG.background.radius, 96]} /><meshStandardMaterial color="#91c98a" roughness={1} /></mesh>
    <mesh geometry={hubGeometry} position={[WORLD_CONFIG.center.x, 0.015, WORLD_CONFIG.center.z]} receiveShadow><meshStandardMaterial color="#a9d8ae" roughness={0.96} metalness={0} /></mesh>
    <mesh geometry={bufferGeometry} position={[WORLD_CONFIG.center.x, 0.022, WORLD_CONFIG.center.z]} receiveShadow><meshStandardMaterial color="#b9c98e" roughness={1} /></mesh>
    <River geometry={riverGeometry} position={[WORLD_CONFIG.center.x, 0.018, WORLD_CONFIG.center.z]} />
    <mesh geometry={farBankGeometry} position={[WORLD_CONFIG.center.x, 0.024, WORLD_CONFIG.center.z]}><meshStandardMaterial color="#e8d4a0" roughness={1} /></mesh>
    <mesh geometry={outerLandGeometry} position={[WORLD_CONFIG.center.x, 0.028, WORLD_CONFIG.center.z]} receiveShadow><meshStandardMaterial color="#97ca85" roughness={1} /></mesh>
    <mesh position={[123, -0.02, WORLD_CONFIG.center.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[190, 112]} /><meshBasicMaterial color="#54c4d4" />
    </mesh>
    <Paths />
    <FenceBoundary />
    <TreeCluster />
    <ExpansionLandmarks playerRef={playerRef} onHousePorchChange={onHousePorchChange} />
    <Cloud position={[-43, 15, -35]} scale={1.4} />
    <Cloud position={[38, 13, -46]} scale={1.1} />
    <Cloud position={[49, 17, 24]} scale={0.9} />
    <MountainRange />
    <Sparkles count={14} scale={[12, 0.6, 12]} position={[0, 0.22, 2.5]} size={1.5} speed={0.16} color="#fff4a8" />
  </>
}

export default memo(WorldEnvironment)

function River({ geometry, position }: { geometry: THREE.BufferGeometry; position: [number, number, number] }) {
  const material = useRef<THREE.MeshStandardMaterial>(null)
  useFrame((state) => {
    if (material.current) material.current.emissiveIntensity = 0.035 + Math.sin(state.clock.elapsedTime * 0.55) * 0.012
  })
  return <mesh geometry={geometry} position={position}>
    <meshStandardMaterial ref={material} color="#5fc7d6" emissive="#4bbcca" emissiveIntensity={0.035} roughness={0.42} metalness={0} side={THREE.DoubleSide} />
  </mesh>
}

function Paths() {
  return <>
    <PathRibbon points={[[0, 4], [0.3, 2], [0, -1], [0.1, -5], [0, -10]]} />
    <PathRibbon points={[[0, 5], [-2, 4.4], [-4, 3], [-6, 1.5], [-8, 0]]} />
    <PathRibbon points={[[0, 5], [2, 4.5], [4, 3.1], [6.5, 1.2], [8, 0], [11, 0.7], [14, 2.2], [17, 2.5]]} />
    <PathRibbon points={[[0, 7], [-0.8, 8.5], [0.5, 10.5], [0.1, 12.5], [0, 15]]} width={1.45} />
    <PathRibbon points={[[0, -33], [0.3, -38], [4, -43], [8, -47]]} width={1.8} />
    <PathRibbon points={[[-32, 2.5], [-37, 1], [-43, 4], [-48, 7]]} width={1.8} />
  </>
}

function PathRibbon({ points, width = 2 }: { points: [number, number][]; width?: number }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0.055, z)))
    const steps = 48, positions: number[] = [], indices: number[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, point = curve.getPointAt(t), tangent = curve.getTangentAt(t)
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width / 2)
      positions.push(point.x - side.x, point.y, point.z - side.z, point.x + side.x, point.y, point.z + side.z)
      if (i < steps) { const n = i * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2) }
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    result.setIndex(indices)
    result.computeVertexNormals()
    return result
  }, [points, width])
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial color="#e9c78f" roughness={1} side={THREE.DoubleSide} /></mesh>
}

function FenceBoundary() {
  return <group>
    {FENCE_SEGMENTS.map((segment) => <FenceArc key={segment.id} id={segment.id} startAngle={segment.startAngle} endAngle={segment.endAngle} />)}
  </group>
}

function FenceArc({ id, startAngle, endAngle }: { id: string; startAngle: number; endAngle: number }) {
  const postMesh = useRef<THREE.InstancedMesh>(null)
  const railMesh = useRef<THREE.InstancedMesh>(null)
  const transforms = useMemo(() => makeFenceTransforms(startAngle, endAngle), [startAngle, endAngle])

  useLayoutEffect(() => {
    const object = new THREE.Object3D()
    if (postMesh.current) {
      transforms.posts.forEach(({ x, z }, index) => {
        object.position.set(x, 0.45, z); object.rotation.set(0, 0, 0); object.scale.set(1, 1, 1); object.updateMatrix()
        postMesh.current!.setMatrixAt(index, object.matrix)
      })
      postMesh.current.instanceMatrix.needsUpdate = true
    }
    if (railMesh.current) {
      transforms.rails.forEach(({ x, z, yaw, length }, index) => {
        object.position.set(x, 0.56, z); object.rotation.set(0, yaw, 0); object.scale.set(length / 1.2, 1, 1); object.updateMatrix()
        railMesh.current!.setMatrixAt(index, object.matrix)
      })
      railMesh.current.instanceMatrix.needsUpdate = true
    }
  }, [transforms])

  return <group userData={{ fenceSegmentId: id }}>
    <instancedMesh ref={postMesh} args={[FENCE_POST_GEOMETRY, FENCE_POST_MATERIAL, transforms.posts.length]} castShadow />
    <instancedMesh ref={railMesh} args={[FENCE_RAIL_GEOMETRY, FENCE_RAIL_MATERIAL, transforms.rails.length]} castShadow />
  </group>
}

function makeFenceTransforms(startAngle: number, endAngle: number) {
  const perimeter = ((WORLD_CONFIG.fence.radiusX + WORLD_CONFIG.fence.radiusZ) / 2) * Math.abs(endAngle - startAngle)
  const count = Math.max(2, Math.ceil(perimeter / WORLD_CONFIG.fence.postSpacing) + 1)
  const posts = Array.from({ length: count }, (_, index) => {
    const angle = THREE.MathUtils.lerp(startAngle, endAngle, index / (count - 1)), outline = getOrganicOutlineScale(angle)
    return { x: WORLD_CONFIG.center.x + Math.cos(angle) * WORLD_CONFIG.fence.radiusX * outline, z: WORLD_CONFIG.center.z + Math.sin(angle) * WORLD_CONFIG.fence.radiusZ * outline }
  })
  const rails = posts.slice(0, -1).map((point, index) => {
    const next = posts[index + 1], dx = next.x - point.x, dz = next.z - point.z
    return { x: (point.x + next.x) / 2, z: (point.z + next.z) / 2, yaw: Math.atan2(-dz, dx), length: Math.hypot(dx, dz) }
  })
  return { posts, rails }
}

function TreeCluster() {
  const hubTrees = useMemo(makeHubTrees, [])
  const outerTrees = useMemo(makeOuterTrees, [])
  return <>
    <TreeInstances trees={hubTrees} castShadow />
    <TreeInstances trees={outerTrees} />
    <RigidBody type="fixed" colliders={false}>
      {hubTrees.map(({ position }, index) => <CuboidCollider key={index} args={[0.32, 1.15, 0.32]} position={[position[0], 1.15, position[2]]} />)}
    </RigidBody>
  </>
}

const PROTECTED_POINTS: [number, number][] = [[8, 0], [-8, 0], [0, -10], [0, 15], [0, 8], [0, 0]]
const CAPPY_HOUSE_TREE_CLEARANCE = { x: 0, z: 18, radius: 7 }
const PROTECTED_PATHS: [number, number][][] = [
  [[0, 4], [0.3, 2], [0, -1], [0.1, -5], [0, -10]],
  [[0, -10], [0, -20.15]],
  [[0, 5], [-2, 4.4], [-4, 3], [-6, 1.5], [-8, 0]],
  [[0, 5], [2, 4.5], [4, 3.1], [6.5, 1.2], [8, 0]],
  [[8, 0], [11, 0.7], [14, 2.2], [17, 2.5]],
  [[0, 7], [-0.8, 8.5], [0.5, 10.5], [0.1, 12.5], [0, 15]],
]

function makeHubTrees(): TreeTransform[] {
  const trees: TreeTransform[] = []
  for (let attempt = 0; attempt < 500 && trees.length < 22; attempt++) {
    const angle = Math.random() * Math.PI * 2
    const radial = 0.69 + Math.random() * 0.16
    const outline = getOrganicOutlineScale(angle)
    const x = WORLD_CONFIG.center.x + Math.cos(angle) * WORLD_CONFIG.hub.radiusX * radial * outline
    const z = WORLD_CONFIG.center.z + Math.sin(angle) * WORLD_CONFIG.hub.radiusZ * radial * outline
    if (Math.hypot(x - CAPPY_HOUSE_TREE_CLEARANCE.x, z - CAPPY_HOUSE_TREE_CLEARANCE.z) < CAPPY_HOUSE_TREE_CLEARANCE.radius) continue
    if (PROTECTED_POINTS.some(([px, pz]) => Math.hypot(x - px, z - pz) < 4.8)) continue
    if (PROTECTED_PATHS.some((path) => path.some((point, index) => index < path.length - 1 && distanceToSegment(x, z, point, path[index + 1]) < 2.6))) continue
    if (trees.some(({ position: [px, , pz] }) => Math.hypot(x - px, z - pz) < 4.2)) continue
    trees.push({ position: [x, 0, z], scale: 0.68 + Math.random() * 0.5, yaw: Math.random() * Math.PI * 2 })
  }
  return trees
}

function makeOuterTrees(): TreeTransform[] {
  const trees: TreeTransform[] = []
  for (let attempt = 0; attempt < 800 && trees.length < 30; attempt++) {
    // The far-bank ring has an east-facing opening for the boat route. Never
    // place trees in that water gap; generate them on the surrounding land.
    const angle = (Math.random() * 2 - 1) * Math.PI
    if (Math.abs(angle) < 0.3) continue
    const radial = 0.73 + Math.random() * 0.19
    const outline = getOrganicOutlineScale(angle)
    const x = WORLD_CONFIG.center.x + Math.cos(angle) * WORLD_CONFIG.farBank.outerRadiusX * radial * outline
    const z = WORLD_CONFIG.center.z + Math.sin(angle) * WORLD_CONFIG.farBank.outerRadiusZ * radial * outline
    if (isInMathBoatChannel(x, z)) continue
    if (trees.some(({ position: [px, , pz] }) => Math.hypot(x - px, z - pz) < 5)) continue
    trees.push({ position: [x, 0, z], scale: 0.48 + Math.random() * 0.42, yaw: Math.random() * Math.PI * 2 })
  }
  return trees
}

function isInMathBoatChannel(x: number, z: number) {
  return x >= 18 && x <= 66 && Math.abs(z - 2.5) < 8.5
}

function distanceToSegment(x: number, z: number, a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0], dz = b[1] - a[1]
  const lengthSq = dx * dx + dz * dz
  const t = lengthSq === 0 ? 0 : THREE.MathUtils.clamp(((x - a[0]) * dx + (z - a[1]) * dz) / lengthSq, 0, 1)
  return Math.hypot(x - (a[0] + t * dx), z - (a[1] + t * dz))
}

function TreeInstances({ trees, castShadow = false }: { trees: TreeTransform[]; castShadow?: boolean }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const lowerRef = useRef<THREE.InstancedMesh>(null)
  const upperRef = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const object = new THREE.Object3D()
    trees.forEach(({ position: [x, y, z], scale, yaw }, index) => {
      object.rotation.set(0, yaw, 0)
      object.scale.setScalar(scale)
      object.position.set(x, y + 0.8 * scale, z); object.updateMatrix(); trunkRef.current?.setMatrixAt(index, object.matrix)
      object.position.set(x, y + 2 * scale, z); object.updateMatrix(); lowerRef.current?.setMatrixAt(index, object.matrix)
      object.position.set(x, y + 2.75 * scale, z); object.updateMatrix(); upperRef.current?.setMatrixAt(index, object.matrix)
      lowerRef.current?.setColorAt(index, TREE_LOWER_COLORS[index % TREE_LOWER_COLORS.length])
      upperRef.current?.setColorAt(index, TREE_UPPER_COLORS[index % TREE_UPPER_COLORS.length])
    })
    for (const mesh of [trunkRef.current, lowerRef.current, upperRef.current]) {
      if (mesh) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true }
    }
  }, [trees])
  return <group>
    <instancedMesh ref={trunkRef} args={[TREE_TRUNK_GEOMETRY, TREE_TRUNK_MATERIAL, trees.length]} castShadow={castShadow} />
    <instancedMesh ref={lowerRef} args={[TREE_LOWER_GEOMETRY, TREE_LOWER_MATERIAL, trees.length]} castShadow={castShadow} />
    <instancedMesh ref={upperRef} args={[TREE_UPPER_GEOMETRY, TREE_UPPER_MATERIAL, trees.length]} castShadow={castShadow} />
  </group>
}

function ExpansionLandmarks({ playerRef, onHousePorchChange }: {
  playerRef: MutableRefObject<RapierRigidBody | null>
  onHousePorchChange: (inside: boolean) => void
}) {
  return <group>
    {EXPANSION_POINTS.map((point) => <group key={point.id} position={[point.position[0], 0, point.position[2]]} rotation={[0, point.rotation, 0]} userData={{ expansionPoint: point.id, targetZone: point.targetZone, fenceSegmentId: point.fenceSegmentId, farBankPosition: point.farBankPosition }} />)}
    <CappyHouse playerRef={playerRef} onPorchChange={onHousePorchChange} />
  </group>
}

function Cloud({ position, scale }: { position: [number, number, number]; scale: number }) {
  return <group position={position} scale={scale}>
    <mesh geometry={CLOUD_GEOMETRY} material={CLOUD_MATERIAL} position={[-0.65, 0, 0]} scale={0.85} />
    <mesh geometry={CLOUD_GEOMETRY} material={CLOUD_MATERIAL} position={[0.3, 0.25, 0]} scale={1.05} />
    <mesh geometry={CLOUD_GEOMETRY} material={CLOUD_MATERIAL} position={[1, 0, 0]} scale={0.7} />
  </group>
}

function MountainRange() {
  const coneGeometry = useMemo(() => new THREE.ConeGeometry(1, 1, 5), [])
  const rockGeometry = useMemo(() => new THREE.DodecahedronGeometry(1, 0), [])
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: 'white', flatShading: true, roughness: 1 }), [])
  const peaks = useMemo(() => Array.from({ length: 42 }, (_, index) => {
    const angle = index / 42 * Math.PI * 2, radius = index % 2 ? 76 : 84, height = 10 + index * 7 % 14
    const width = 6 + index * 3 % 8
    return { position: [Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius] as [number, number, number], scale: [width, height, width] as [number, number, number], color: new THREE.Color(['#aacbd5', '#b8d6dc', '#c7dfe2'][index % 3]) }
  }).filter(({ position }) => position[0] < 25), [])
  const rocks = useMemo(() => peaks.filter((_, index) => index % 2 === 0).map((peak) => {
    const radius = peak.scale[0]
    return { position: [peak.position[0] + radius * 0.55, peak.scale[1] * 0.34, peak.position[2] - radius * 0.22] as [number, number, number], scale: [radius * 0.72, radius * 0.72, radius * 0.72] as [number, number, number], color: new THREE.Color('#d4e7e8') }
  }), [peaks])
  return <group>
    <MountainInstances geometry={coneGeometry} material={material} transforms={peaks} />
    <MountainInstances geometry={rockGeometry} material={material} transforms={rocks} />
    <FarMountainLayer geometry={coneGeometry} material={material} />
  </group>
}

function MountainInstances({ geometry, material, transforms }: { geometry: THREE.BufferGeometry; material: THREE.Material; transforms: MountainTransform[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const object = new THREE.Object3D()
    transforms.forEach(({ position, scale, color }, index) => {
      object.position.set(...position); object.scale.set(...scale); object.updateMatrix()
      ref.current?.setMatrixAt(index, object.matrix); ref.current?.setColorAt(index, color)
    })
    if (ref.current) { ref.current.instanceMatrix.needsUpdate = true; if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true }
  }, [transforms])
  return <instancedMesh ref={ref} args={[geometry, material, transforms.length]} />
}

function FarMountainLayer({ geometry, material }: { geometry: THREE.BufferGeometry; material: THREE.Material }) {
  const peaks = useMemo(() => Array.from({ length: 28 }, (_, index) => {
    const angle = index / 28 * Math.PI * 2 + 0.11, radius = 91, height = 13 + index * 5 % 10
    const width = 9 + index % 4 * 2
    return { position: [Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius] as [number, number, number], scale: [width, height, width] as [number, number, number], color: new THREE.Color('#d1e4e6') }
  }).filter(({ position }) => position[0] < 32), [])
  return <MountainInstances geometry={geometry} material={material} transforms={peaks} />
}

function SkyDome() {
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(110, 24, 12), pos = geo.getAttribute('position'), colors: number[] = []
    const low = new THREE.Color('#e2f6ff'), high = new THREE.Color('#65b9ed'), color = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const t = THREE.MathUtils.smoothstep(pos.getY(i) / 110, -0.08, 0.78)
      color.copy(low).lerp(high, t); colors.push(color.r, color.g, color.b)
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); return geo
  }, [])
  return <mesh geometry={geometry} renderOrder={-10}><meshBasicMaterial vertexColors side={THREE.BackSide} depthWrite={false} fog={false} /></mesh>
}

function createOrganicDiscGeometry(radiusX: number, radiusZ: number) {
  const segments = 96, positions = [0, 0, 0], indices: number[] = []
  for (let index = 0; index < segments; index++) {
    const angle = index / segments * Math.PI * 2, factor = getOrganicOutlineScale(angle)
    positions.push(Math.cos(angle) * radiusX * factor, 0, Math.sin(angle) * radiusZ * factor)
    const current = index + 1, next = (index + 1) % segments + 1
    indices.push(0, next, current)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals()
  return geometry
}

function createOrganicRingGeometry(innerX: number, innerZ: number, outerX: number, outerZ: number, gap?: { centerAngle: number; halfAngle: number }) {
  const segments = 128, positions: number[] = [], indices: number[] = []
  for (let index = 0; index < segments; index++) {
    const angle = index / segments * Math.PI * 2
    const wave = getOrganicOutlineScale(angle)
    positions.push(Math.cos(angle) * innerX * wave, 0, Math.sin(angle) * innerZ * wave)
    positions.push(Math.cos(angle) * outerX * wave, 0, Math.sin(angle) * outerZ * wave)
    const next = (index + 1) % segments, inner = index * 2, outer = inner + 1, nextInner = next * 2, nextOuter = nextInner + 1
    if (gap) {
      const offset = Math.atan2(Math.sin(angle - gap.centerAngle), Math.cos(angle - gap.centerAngle))
      if (Math.abs(offset) < gap.halfAngle) continue
    }
    indices.push(inner, outer, nextInner, outer, nextOuter, nextInner)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals()
  return geometry
}

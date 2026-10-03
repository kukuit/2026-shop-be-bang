'use client'

import { Billboard, Text } from '@react-three/drei'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { VIETNAMESE_PATHS, VIETNAMESE_TREES, VIETNAMESE_WORLD_LAYOUT } from './vietnamese-world.config'

function createIslandGeometry() {
  const segments = 64
  const rings = 7
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const palettes = [new THREE.Color('#76a968'), new THREE.Color('#86b574'), new THREE.Color('#91bd7d')]
  for (let ring = 0; ring <= rings; ring++) {
    const ratio = ring / rings
    for (let segment = 0; segment <= segments; segment++) {
      const angle = (segment / segments) * Math.PI * 2
      const edgeNoise = Math.sin(angle * 5 + 0.4) * 0.32 + Math.sin(angle * 9 - 0.8) * 0.15
      const radius = 28 * ratio + edgeNoise * ratio
      const x = Math.cos(angle) * radius
      const z = -60 + Math.sin(angle) * radius
      positions.push(x, 0.005 + Math.sin(angle * 4 + ratio * 3) * 0.012 * ratio, z)
      const color = palettes[Math.min(2, Math.floor(ratio * palettes.length))]
      colors.push(color.r, color.g, color.b)
      if (ring < rings && segment < segments) {
        const a = ring * (segments + 1) + segment
        const b = a + segments + 1
        indices.push(a, a + 1, b, b, a + 1, b + 1)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createPathGeometry(points: readonly [number, number][], width: number) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0.055, z)), false, 'catmullrom', 0.18)
  const steps = Math.max(32, points.length * 16)
  const positions: number[] = []
  const indices: number[] = []
  for (let index = 0; index <= steps; index++) {
    const t = index / steps
    const point = curve.getPoint(t)
    const tangent = curve.getTangent(t).normalize()
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(width / 2)
    positions.push(point.x - side.x, point.y, point.z - side.z, point.x + side.x, point.y, point.z + side.z)
    if (index < steps) {
      const offset = index * 2
      indices.push(offset, offset + 2, offset + 1, offset + 1, offset + 2, offset + 3)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function VietnameseIsland() {
  const geometry = useMemo(createIslandGeometry, [])
  return <>
    <mesh position={[0, -0.52, -60]} receiveShadow>
      <boxGeometry args={[120, 0.12, 130]} />
      <meshStandardMaterial color="#4caeba" roughness={0.7} metalness={0.04} />
    </mesh>
    <mesh position={[0, -0.37, -60]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[28.1, 30.2, 64]} />
      <meshStandardMaterial color="#83d0c5" roughness={0.78} transparent opacity={0.75} />
    </mesh>
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.98} flatShading />
    </mesh>
    <RigidBody type="fixed" colliders={false}>
      <CylinderCollider args={[0.14, VIETNAMESE_WORLD_LAYOUT.island.radius]} position={[0, -0.11, -60]} friction={1} />
    </RigidBody>
  </>
}

export function VietnamesePaths() {
  const geometries = useMemo(() => VIETNAMESE_PATHS.map(({ points, width }) => createPathGeometry(points, width)), [])
  return <group>
    {geometries.map((geometry, index) => <mesh key={index} geometry={geometry} receiveShadow>
      <meshStandardMaterial color="#dfc99a" roughness={1} side={THREE.DoubleSide} />
    </mesh>)}
  </group>
}

function writeInstances(mesh: THREE.InstancedMesh | null, entries: readonly { position: [number, number, number]; scale: [number, number, number]; rotation?: number; tint?: string }[]) {
  if (!mesh) return
  const dummy = new THREE.Object3D()
  mesh.count = entries.length
  entries.forEach((entry, index) => {
    dummy.position.set(...entry.position)
    dummy.rotation.set(0, entry.rotation ?? 0, 0)
    dummy.scale.set(...entry.scale)
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)
    if (entry.tint) mesh.setColorAt(index, new THREE.Color(entry.tint))
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}

export function VietnameseTrees() {
  const trunks = useRef<THREE.InstancedMesh>(null)
  const rounds = useRef<THREE.InstancedMesh>(null)
  const pineLower = useRef<THREE.InstancedMesh>(null)
  const pineUpper = useRef<THREE.InstancedMesh>(null)
  const roundTrees = VIETNAMESE_TREES.filter((tree) => tree.kind === 'round')
  const pineTrees = VIETNAMESE_TREES.filter((tree) => tree.kind === 'pine')
  const trunkEntries = VIETNAMESE_TREES.map((tree, index) => ({
    position: [tree.x, 0.88 * tree.scale, tree.z] as [number, number, number],
    scale: [0.29 * tree.scale, 0.88 * tree.scale, 0.29 * tree.scale] as [number, number, number],
    rotation: index * 0.53,
    tint: index % 3 === 0 ? '#815a3c' : '#946746',
  }))
  const roundEntries = roundTrees.map((tree, index) => ({
    position: [tree.x, 2.42 * tree.scale, tree.z] as [number, number, number],
    scale: [1.25 * tree.scale, 1.38 * tree.scale, 1.2 * tree.scale] as [number, number, number],
    tint: index % 2 ? '#4e9461' : '#5aa06a',
  }))
  const lowerEntries = pineTrees.map((tree, index) => ({
    position: [tree.x, 1.98 * tree.scale, tree.z] as [number, number, number],
    scale: [1.15 * tree.scale, 1.48 * tree.scale, 1.15 * tree.scale] as [number, number, number],
    rotation: index * 0.71,
    tint: index % 2 ? '#49895a' : '#539566',
  }))
  const upperEntries = pineTrees.map((tree, index) => ({
    position: [tree.x, 2.9 * tree.scale, tree.z] as [number, number, number],
    scale: [0.91 * tree.scale, 1.34 * tree.scale, 0.91 * tree.scale] as [number, number, number],
    rotation: index * 0.71,
    tint: index % 2 ? '#579b65' : '#62a76c',
  }))
  useLayoutEffect(() => {
    writeInstances(trunks.current, trunkEntries)
    writeInstances(rounds.current, roundEntries)
    writeInstances(pineLower.current, lowerEntries)
    writeInstances(pineUpper.current, upperEntries)
  }, [])
  return <>
    <instancedMesh ref={trunks} args={[undefined, undefined, VIETNAMESE_TREES.length]} castShadow receiveShadow>
      <cylinderGeometry args={[0.34, 0.42, 1.76, 6]} />
      <meshStandardMaterial color="#ffffff" roughness={1} flatShading />
    </instancedMesh>
    <instancedMesh ref={rounds} args={[undefined, undefined, roundTrees.length]} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#ffffff" roughness={1} flatShading />
    </instancedMesh>
    <instancedMesh ref={pineLower} args={[undefined, undefined, pineTrees.length]} castShadow receiveShadow>
      <coneGeometry args={[1, 2, 6]} />
      <meshStandardMaterial color="#ffffff" roughness={1} flatShading />
    </instancedMesh>
    <instancedMesh ref={pineUpper} args={[undefined, undefined, pineTrees.length]} castShadow receiveShadow>
      <coneGeometry args={[1, 2, 6]} />
      <meshStandardMaterial color="#ffffff" roughness={1} flatShading />
    </instancedMesh>
    <RigidBody type="fixed" colliders={false}>
      {VIETNAMESE_TREES.map((tree, index) => <CylinderCollider key={index} args={[0.72 * tree.scale, 0.37 * tree.scale]} position={[tree.x, 0.75 * tree.scale, tree.z]} friction={0.8} />)}
    </RigidBody>
  </>
}

const ROCKS = [
  { x: -23, z: -49, s: 0.75 }, { x: 23, z: -51, s: 0.88 }, { x: -23, z: -62, s: 0.72 },
  { x: 23, z: -62, s: 0.82 }, { x: -19, z: -78, s: 0.7 }, { x: 19, z: -78, s: 0.78 },
  { x: -8, z: -83, s: 0.62 }, { x: 8, z: -83, s: 0.65 }, { x: -24, z: -70, s: 0.58 }, { x: 24, z: -70, s: 0.62 },
] as const

export function VietnameseRocks() {
  const rocks = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    writeInstances(rocks.current, ROCKS.map((rock, index) => ({
      position: [rock.x, rock.s * 0.48, rock.z],
      scale: [rock.s * 1.25, rock.s * 0.8, rock.s],
      rotation: index * 0.63,
      tint: index % 2 ? '#879183' : '#929987',
    })))
  }, [])
  return <>
    <instancedMesh ref={rocks} args={[undefined, undefined, ROCKS.length]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#ffffff" roughness={1} flatShading />
    </instancedMesh>
    <RigidBody type="fixed" colliders={false}>
      {ROCKS.slice(0, 6).map((rock, index) => <CuboidCollider key={index} args={[rock.s * 0.7, rock.s * 0.47, rock.s * 0.65]} position={[rock.x, rock.s * 0.47, rock.z]} friction={0.9} />)}
    </RigidBody>
  </>
}

const FLOWERS = [
  [-5, -38], [-10, -47], [-13, -51], [11, -48], [13, -54], [-12, -64], [-11, -69], [12, -64], [12, -72],
  [-7, -76], [7, -77], [-19, -62], [19, -62], [-18, -72], [18, -72], [-7, -45], [8, -45], [-5, -68], [6, -69],
] as const

export function VietnameseFlowers() {
  const stems = useRef<THREE.InstancedMesh>(null)
  const blooms = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    writeInstances(stems.current, FLOWERS.map(([x, z], index) => ({
      position: [x, 0.2, z], scale: [0.025, 0.2 + (index % 3) * 0.025, 0.025],
    })))
    writeInstances(blooms.current, FLOWERS.map(([x, z], index) => ({
      position: [x, 0.43 + (index % 3) * 0.025, z], scale: [0.13, 0.13, 0.13],
      tint: ['#f6c958', '#f17c83', '#a685dd', '#fff0d0'][index % 4],
    })))
  }, [])
  return <>
    <instancedMesh ref={stems} args={[undefined, undefined, FLOWERS.length]}>
      <cylinderGeometry args={[1, 1, 2, 5]} />
      <meshStandardMaterial color="#54875a" roughness={1} />
    </instancedMesh>
    <instancedMesh ref={blooms} args={[undefined, undefined, FLOWERS.length]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#ffffff" roughness={0.9} flatShading />
    </instancedMesh>
  </>
}

export function VietnameseEntrySign() {
  const [x, , z] = VIETNAMESE_WORLD_LAYOUT.entrySign
  return <RigidBody type="fixed" colliders={false} position={[x, 0, z]}>
    <mesh position={[-1.38, 1.2, 0]} castShadow><boxGeometry args={[0.18, 2.4, 0.2]} /><meshStandardMaterial color="#8b5d3e" roughness={0.94} /></mesh>
    <mesh position={[1.38, 1.2, 0]} castShadow><boxGeometry args={[0.18, 2.4, 0.2]} /><meshStandardMaterial color="#8b5d3e" roughness={0.94} /></mesh>
    <mesh position={[0, 2.15, 0]} castShadow><boxGeometry args={[3.05, 0.78, 0.2]} /><meshStandardMaterial color="#b07b4c" roughness={0.92} /></mesh>
    <mesh position={[0, 2.15, 0.112]}><boxGeometry args={[2.82, 0.57, 0.035]} /><meshStandardMaterial color="#fff0ca" roughness={0.92} /></mesh>
    <Billboard position={[0, 2.15, 0.15]}>
      <Text fontSize={0.25} color="#5c7045" outlineColor="#fff0ca" outlineWidth={0.01} anchorX="center" anchorY="middle" fontWeight={800}>
        VÙNG ĐẤT TIẾNG VIỆT
      </Text>
    </Billboard>
    <CuboidCollider args={[0.1, 1.2, 0.11]} position={[-1.38, 1.2, 0]} />
    <CuboidCollider args={[0.1, 1.2, 0.11]} position={[1.38, 1.2, 0]} />
  </RigidBody>
}

export function VietnamesePlaza() {
  const [x, y, z] = VIETNAMESE_WORLD_LAYOUT.plaza
  return <RigidBody type="fixed" colliders={false} position={[x, y, z]}>
    <mesh position={[0, 0.08, 0]} receiveShadow>
      <cylinderGeometry args={[4.45, 4.65, 0.16, 32]} />
      <meshStandardMaterial color="#c7b68e" roughness={0.96} flatShading />
    </mesh>
    <mesh position={[0, 0.17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[3.75, 0.06, 5, 40]} />
      <meshStandardMaterial color="#ead8ad" roughness={0.85} />
    </mesh>
    <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[1.5, 1.68, 0.55, 10]} />
      <meshStandardMaterial color="#906c4f" roughness={0.9} flatShading />
    </mesh>
    <mesh position={[0, 0.76, 0]} castShadow>
      <boxGeometry args={[2.1, 0.12, 1.07]} />
      <meshStandardMaterial color="#7e4d3d" roughness={0.92} />
    </mesh>
    <mesh position={[-0.49, 0.93, 0]} rotation={[0, 0, 0.13]} castShadow>
      <boxGeometry args={[1.05, 0.11, 0.88]} />
      <meshStandardMaterial color="#fff0ca" roughness={0.9} />
    </mesh>
    <mesh position={[0.49, 0.93, 0]} rotation={[0, 0, -0.13]} castShadow>
      <boxGeometry args={[1.05, 0.11, 0.88]} />
      <meshStandardMaterial color="#ffedc2" roughness={0.9} />
    </mesh>
    <mesh position={[0, 1, -0.08]}>
      <boxGeometry args={[0.045, 0.04, 0.82]} />
      <meshStandardMaterial color="#d1bd8c" roughness={1} />
    </mesh>
    <Billboard position={[0, 1.48, 0]}>
      <Text fontSize={0.25} color="#5c4f3b" outlineColor="#fff1d0" outlineWidth={0.012} anchorX="center" anchorY="middle" fontWeight={800}>
        GÓC HỌC CHỮ
      </Text>
    </Billboard>
    <CylinderCollider args={[0.32, 1.5]} position={[0, 0.26, 0]} friction={0.9} />
  </RigidBody>
}

export function VietnameseReadingHut() {
  const [x, y, z] = VIETNAMESE_WORLD_LAYOUT.readingHut
  return <RigidBody type="fixed" colliders={false} position={[x, y, z]} rotation={[0, Math.PI / 2, 0]}>
    <mesh position={[0, 0.12, 0]} receiveShadow><boxGeometry args={[3.5, 0.2, 3.1]} /><meshStandardMaterial color="#a77c51" roughness={0.94} /></mesh>
    <mesh position={[0, 0.94, -1.38]} castShadow><boxGeometry args={[3.3, 1.58, 0.18]} /><meshStandardMaterial color="#d6b780" roughness={0.95} /></mesh>
    <mesh position={[-1.56, 0.92, 0]} castShadow><boxGeometry args={[0.18, 1.55, 2.85]} /><meshStandardMaterial color="#d0ae78" roughness={0.95} /></mesh>
    <mesh position={[1.56, 0.92, 0]} castShadow><boxGeometry args={[0.18, 1.55, 2.85]} /><meshStandardMaterial color="#d0ae78" roughness={0.95} /></mesh>
    <mesh position={[-1.38, 0.93, 1.25]} castShadow><boxGeometry args={[0.18, 1.52, 0.18]} /><meshStandardMaterial color="#8a5d3c" roughness={0.94} /></mesh>
    <mesh position={[1.38, 0.93, 1.25]} castShadow><boxGeometry args={[0.18, 1.52, 0.18]} /><meshStandardMaterial color="#8a5d3c" roughness={0.94} /></mesh>
    <mesh position={[0, 2.05, 0]} castShadow>
      <coneGeometry args={[2.3, 1.55, 4]} />
      <meshStandardMaterial color="#c47f54" roughness={0.94} flatShading />
    </mesh>
    <mesh position={[0, 1.47, -1.14]}><boxGeometry args={[2.45, 0.14, 0.35]} /><meshStandardMaterial color="#80553a" roughness={0.9} /></mesh>
    {[-0.72, -0.26, 0.2, 0.66].map((book, index) => <mesh key={index} position={[book, 1.7, -1.13]} rotation={[0, 0, (index - 1.5) * 0.035]}>
      <boxGeometry args={[0.32, 0.48, 0.12]} />
      <meshStandardMaterial color={['#d96b59', '#4b91ac', '#e2b94e', '#7e69a8'][index]} roughness={0.85} />
    </mesh>)}
    <Billboard position={[0, 2.62, 1.15]}>
      <Text fontSize={0.3} color="#fff0cc" outlineColor="#754b34" outlineWidth={0.03} anchorX="center" anchorY="middle" fontWeight={900}>
        GÓC ĐỌC SÁCH
      </Text>
    </Billboard>
    <CuboidCollider args={[1.62, 0.72, 0.1]} position={[0, 0.88, -1.38]} />
    <CuboidCollider args={[0.1, 0.72, 1.4]} position={[-1.56, 0.88, 0]} />
    <CuboidCollider args={[0.1, 0.72, 1.4]} position={[1.56, 0.88, 0]} />
    <CuboidCollider args={[0.1, 0.72, 0.1]} position={[-1.38, 0.88, 1.25]} />
    <CuboidCollider args={[0.1, 0.72, 0.1]} position={[1.38, 0.88, 1.25]} />
  </RigidBody>
}

export function VietnameseKnowledgeTree() {
  const [x, y, z] = VIETNAMESE_WORLD_LAYOUT.knowledgeTree
  return <RigidBody type="fixed" colliders={false} position={[x, y, z]}>
    <mesh position={[0, 1.12, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.48, 0.67, 2.24, 7]} />
      <meshStandardMaterial color="#805639" roughness={1} flatShading />
    </mesh>
    <mesh position={[-0.75, 2.42, 0]} castShadow receiveShadow><icosahedronGeometry args={[1.35, 1]} /><meshStandardMaterial color="#4d9360" roughness={1} flatShading /></mesh>
    <mesh position={[0.7, 2.65, -0.08]} castShadow receiveShadow><icosahedronGeometry args={[1.45, 1]} /><meshStandardMaterial color="#5aa06b" roughness={1} flatShading /></mesh>
    <mesh position={[0, 3.45, 0.04]} castShadow receiveShadow><icosahedronGeometry args={[1.25, 1]} /><meshStandardMaterial color="#69ab70" roughness={1} flatShading /></mesh>
    <mesh position={[-1.35, 0.34, 0.78]} rotation={[0, -0.2, 0.08]} castShadow><boxGeometry args={[0.78, 0.48, 0.18]} /><meshStandardMaterial color="#d86e5a" roughness={0.9} /></mesh>
    <mesh position={[1.18, 0.34, 0.88]} rotation={[0, 0.25, -0.05]} castShadow><boxGeometry args={[0.78, 0.48, 0.18]} /><meshStandardMaterial color="#5e91b8" roughness={0.9} /></mesh>
    <mesh position={[0, 0.34, 1.45]} castShadow><boxGeometry args={[0.82, 0.48, 0.18]} /><meshStandardMaterial color="#e1b747" roughness={0.9} /></mesh>
    <Billboard position={[0, 4.65, 0]}>
      <Text fontSize={0.32} color="#fff0c9" outlineColor="#457652" outlineWidth={0.035} anchorX="center" anchorY="middle" fontWeight={900}>
        CÂY TRI THỨC
      </Text>
    </Billboard>
    <CylinderCollider args={[1.05, 0.63]} position={[0, 1.05, 0]} friction={0.9} />
  </RigidBody>
}

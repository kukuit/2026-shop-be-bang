'use client'

import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useLayoutEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { LessonMapItem } from '@/components/games/lesson-map/data'
import * as THREE from 'three'
import EnglishRocket from './EnglishRocket'
import EnglishPlanet from './EnglishPlanet'
import { ENGLISH_PLANETS } from './english-world.config'
import { useDemo3DGame } from '../GameShell'

type Props = {
  playerRef: MutableRefObject<RapierRigidBody | null>
  onHousePorchChange: (inside: boolean) => void
  onPlanetApproachChange?: (id: number | null) => void
  onReturnRocketChange?: (inside: boolean) => void
  planetItems?: LessonMapItem[]
}

const HOME_POSITION = new THREE.Vector3(0, 1.35, 0)

export default function EnglishSpaceEnvironment({ playerRef, onReturnRocketChange, onPlanetApproachChange, planetItems }: Props) {
  const wasNearRocket = useRef(false)
  const approachedPlanet = useRef<number | null>(null)
  const rocket = useRef<THREE.Group>(null)
  const returningAt = useRef<number | null>(null)
  const landingAt = useRef<number | null>(null)
  const { englishLaunchStage } = useDemo3DGame()
  const statusById = useMemo(() => new Map(planetItems?.map((item) => [item.id, item.status]) ?? []), [planetItems])

  useFrame(({ clock }) => {
    if (englishLaunchStage === 'returning') returningAt.current ??= clock.elapsedTime
    else returningAt.current = null
    if (englishLaunchStage === 'landing') landingAt.current ??= clock.elapsedTime
    else landingAt.current = null

    const body = playerRef.current
    const position = body?.translation()
    if (englishLaunchStage === 'rocket-flight' && body && position && rocket.current) {
      rocket.current.position.set(position.x, position.y, position.z)
      const rotation = body.rotation()
      rocket.current.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)

      let nearestId: number | null = null
      let nearestDistance = 6.2
      for (const lesson of ENGLISH_PLANETS) {
        const distance = Math.hypot(position.x - lesson.position[0], position.y - lesson.position[1], position.z - lesson.position[2])
        if (distance < nearestDistance) { nearestDistance = distance; nearestId = lesson.id }
      }
      if (nearestId !== approachedPlanet.current) {
        approachedPlanet.current = nearestId
        onPlanetApproachChange?.(nearestId)
      }
    } else {
      if (approachedPlanet.current !== null) {
        approachedPlanet.current = null
        if (englishLaunchStage !== 'landing') onPlanetApproachChange?.(null)
      }
      if (rocket.current) {
        rocket.current.position.set(0, returningAt.current !== null ? Math.min(8, (clock.elapsedTime - returningAt.current) ** 2 * 15)
          : landingAt.current !== null ? Math.max(0, 6 - (clock.elapsedTime - landingAt.current) * 7) : 0, 0)
        rocket.current.quaternion.identity()
      }
    }

    const nearHome = Boolean(position && Math.hypot(position.x, position.y - HOME_POSITION.y, position.z) < 7.5)
    if (nearHome !== wasNearRocket.current) { wasNearRocket.current = nearHome; onReturnRocketChange?.(nearHome) }
  })

  return <>
    <SpaceDecor origin={rocket} />
    <RigidBody type="fixed" colliders={false} position={[0, -0.35, 0]}>
      <mesh receiveShadow><cylinderGeometry args={[6.8, 7.2, 0.7, 14]} /><meshStandardMaterial color="#47317f" roughness={0.9} flatShading /></mesh>
      <mesh position={[0, 0.37, 0]}><cylinderGeometry args={[6.2, 6.2, 0.05, 20]} /><meshStandardMaterial color="#6c55ad" emissive="#392779" emissiveIntensity={0.25} /></mesh>
      <CylinderCollider args={[0.35, 7]} friction={0.9} />
    </RigidBody>
    <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[5.45, 0.045, 5, 48]} />
      <meshBasicMaterial color="#86d9ff" transparent opacity={0.7} />
    </mesh>
    <mesh position={[0, 0.28, 0]}><octahedronGeometry args={[0.34, 0]} /><meshStandardMaterial color="#a5ddff" emissive="#5a83e8" emissiveIntensity={0.45} flatShading /></mesh>
    <Billboard position={[0, 2.55, 0]}><Text fontSize={0.28} color="#e4eaff" outlineColor="#332060" outlineWidth={0.035} anchorX="center" anchorY="middle">HOME / VỀ NHÀ</Text></Billboard>
    <group ref={rocket} position={[0, 0, 0]}>
      <group position={englishLaunchStage === 'rocket-flight' ? [0, -2.25, 0] : [0, 0, 0]}>
        <group scale={1.12}>
          <EnglishRocket occupied={englishLaunchStage === 'returning' || englishLaunchStage === 'landing' || englishLaunchStage === 'rocket-flight'} engineOn={englishLaunchStage === 'returning' || englishLaunchStage === 'landing' || englishLaunchStage === 'rocket-flight'} flipTopBottom={englishLaunchStage === 'rocket-flight'} />
        </group>
      </group>
    </group>
    {ENGLISH_PLANETS.map((lesson) => <EnglishPlanet key={lesson.id} lesson={lesson} status={statusById.get(lesson.id) ?? (lesson.id <= 2 ? 'available' : 'locked')} activePlanetId={approachedPlanet} />)}
  </>
}

const STAR_COUNT = 420

function createStarGeometry() {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(STAR_COUNT * 3)
  const colors = new Float32Array(STAR_COUNT * 3)
  for (let index = 0; index < STAR_COUNT; index++) {
    const vertical = 1 - 2 * (index + 0.5) / STAR_COUNT
    const ringRadius = Math.sqrt(1 - vertical * vertical)
    const angle = index * 2.39996
    const radius = 66 + index % 9 * 2.5
    positions[index * 3] = Math.cos(angle) * ringRadius * radius
    positions[index * 3 + 1] = vertical * radius * 0.72
    positions[index * 3 + 2] = Math.sin(angle) * ringRadius * radius
    const tint = [0.78, 0.88, 1][index % 3]
    colors[index * 3] = tint * 0.9
    colors[index * 3 + 1] = tint * 0.94
    colors[index * 3 + 2] = tint
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeBoundingSphere()
  return geometry
}

const STAR_GEOMETRY = createStarGeometry()
const ASTEROID_COUNT = 24

function SpaceDecor({ origin }: { origin: MutableRefObject<THREE.Group | null> }) {
  const space = useRef<THREE.Group>(null)
  const rocks = useRef<THREE.InstancedMesh>(null)

  useFrame(() => {
    if (space.current && origin.current) space.current.position.copy(origin.current.position)
  })

  useLayoutEffect(() => {
    const object = new THREE.Object3D()
    for (let index = 0; index < ASTEROID_COUNT; index++) {
      const vertical = 1 - 2 * (index + 0.5) / ASTEROID_COUNT
      const ringRadius = Math.sqrt(1 - vertical * vertical)
      const angle = index * 2.39996 + 0.7
      const radius = 69 + index % 3 * 4
      object.position.set(Math.cos(angle) * ringRadius * radius, vertical * radius * 0.72, Math.sin(angle) * ringRadius * radius)
      object.scale.setScalar(0.35 + index % 4 * 0.16)
      object.rotation.set(index, index * 0.7, 0)
      object.updateMatrix()
      rocks.current?.setMatrixAt(index, object.matrix)
    }
    if (rocks.current) rocks.current.instanceMatrix.needsUpdate = true
  }, [])

  return <group ref={space}>
    <points geometry={STAR_GEOMETRY} dispose={null}><pointsMaterial size={0.15} sizeAttenuation vertexColors transparent opacity={0.88} depthWrite={false} toneMapped={false} /></points>
    <instancedMesh ref={rocks} args={[undefined, undefined, ASTEROID_COUNT]}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#665983" flatShading roughness={1} /></instancedMesh>
  </group>
}

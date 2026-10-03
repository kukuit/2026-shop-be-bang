'use client'

import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import * as THREE from 'three'
import type { LessonMapItem } from '@/components/games/lesson-map/data'
import type { ENGLISH_PLANETS } from './english-world.config'
import type { EnglishPlanetVisual } from './english-world.config'

const PLANET_GEOMETRY = new THREE.SphereGeometry(1, 24, 16)
const DETAIL_GEOMETRY = new THREE.SphereGeometry(1, 12, 8)
const RING_GEOMETRY = new THREE.TorusGeometry(1.24, 0.035, 8, 32)
const DETAIL_NORMAL = new THREE.Vector3(0, 0, 1)

type Planet = (typeof ENGLISH_PLANETS)[number]
type SurfaceDetail = { normal: [number, number, number]; scale: [number, number, number]; color: string; rotation: number }

function createSurfaceDetails(unitId: number, visual: EnglishPlanetVisual): SurfaceDetail[] {
  let seed = (unitId * 9301 + 49297) % 233280
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  const details: SurfaceDetail[] = []
  const baseColor = new THREE.Color(visual.color)
  const craterColor = `#${baseColor.clone().multiplyScalar(0.78).getHexString()}`

  const sampleNormal = (): [number, number, number] => {
    const y = random() * 1.44 - 0.72
    const angle = random() * Math.PI * 2
    const horizontal = Math.sqrt(1 - y * y)
    return [Math.cos(angle) * horizontal, y, Math.sin(angle) * horizontal]
  }
  const add = (color: string, scale: [number, number, number], normal = sampleNormal()) => {
    details.push({ normal, scale, color, rotation: random() * Math.PI * 2 })
  }

  if (visual.style === 'crater') {
    for (let index = 0; index < 4; index++) add(craterColor, [0.15 + random() * 0.055, 0.1 + random() * 0.045, 0.035])
  } else if (visual.style === 'land') {
    add(visual.detailColor, [0.28, 0.16, 0.045])
    add(visual.detailColor, [0.2, 0.12, 0.04])
    add(visual.detailColor, [0.16, 0.1, 0.035])
    if (visual.clouds && visual.cloudColor) {
      for (let cluster = 0; cluster < 2; cluster++) {
        const center = new THREE.Vector3(...sampleNormal())
        const tangent = new THREE.Vector3(Math.cos(random() * Math.PI * 2), 0, Math.sin(random() * Math.PI * 2))
        tangent.addScaledVector(center, -tangent.dot(center)).normalize()
        for (const offset of [-0.065, 0, 0.065]) {
          const puffNormal = center.clone().addScaledVector(tangent, offset).normalize().toArray() as [number, number, number]
          add(visual.cloudColor, offset === 0 ? [0.12, 0.085, 0.04] : [0.09, 0.065, 0.035], puffNormal)
        }
      }
    }
  } else if (visual.style === 'ring') {
    add(visual.detailColor, [0.26, 0.055, 0.035])
    add(visual.detailColor, [0.17, 0.045, 0.03])
  } else {
    add(visual.detailColor, [0.34, 0.06, 0.035])
    add(visual.detailColor, [0.22, 0.055, 0.03])
    add(visual.detailColor, [0.12, 0.1, 0.035])
  }
  return details
}

export default function EnglishPlanet({ lesson, status, activePlanetId }: {
  lesson: Planet
  status: LessonMapItem['status']
  activePlanetId: MutableRefObject<number | null>
}) {
  const visual = lesson.visual
  const details = useMemo(() => createSurfaceDetails(lesson.id, visual), [lesson.id, visual])
  const visualGroup = useRef<THREE.Group>(null)
  const detailInstances = useRef<THREE.InstancedMesh>(null)
  const atmosphereMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const label = useRef<THREE.Group>(null)
  const towardCamera = useRef(new THREE.Vector3()).current
  const detailTransform = useRef(new THREE.Object3D()).current
  const detailNormal = useRef(new THREE.Vector3()).current
  const detailRotation = useRef(new THREE.Quaternion()).current
  const detailColor = useRef(new THREE.Color()).current
  const visualScale = useRef(1)
  const labelScale = useRef(1)
  const targetAtmosphereOpacity = status === 'locked' ? 0.07 : 0.1

  useLayoutEffect(() => {
    const mesh = detailInstances.current
    if (!mesh) return
    details.forEach((detail, index) => {
      detailNormal.fromArray(detail.normal)
      detailTransform.position.copy(detailNormal).multiplyScalar(1.006)
      detailRotation.setFromUnitVectors(DETAIL_NORMAL, detailNormal)
      detailTransform.quaternion.setFromAxisAngle(DETAIL_NORMAL, detail.rotation)
      detailTransform.quaternion.premultiply(detailRotation)
      detailTransform.scale.fromArray(detail.scale)
      detailTransform.updateMatrix()
      mesh.setMatrixAt(index, detailTransform.matrix)
      mesh.setColorAt(index, detailColor.set(detail.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [details, detailColor, detailNormal, detailRotation, detailTransform])

  useFrame(({ camera }, delta) => {
    const active = activePlanetId.current === lesson.id
    const scaleTarget = active ? 1.04 : 1
    visualScale.current = THREE.MathUtils.damp(visualScale.current, scaleTarget, 5, delta)
    if (visualGroup.current) {
      visualGroup.current.scale.setScalar(visual.radius * visualScale.current)
      visualGroup.current.rotation.y += delta * visual.spinSpeed
    }
    if (atmosphereMaterial.current) {
      const opacityTarget = active ? 0.18 : targetAtmosphereOpacity
      atmosphereMaterial.current.opacity = THREE.MathUtils.damp(atmosphereMaterial.current.opacity, opacityTarget, 5, delta)
    }
    labelScale.current = THREE.MathUtils.damp(labelScale.current, active ? 1.08 : 1, 5, delta)
    if (label.current) {
      towardCamera.set(camera.position.x - lesson.position[0], camera.position.y - lesson.position[1], camera.position.z - lesson.position[2]).normalize()
      label.current.position.copy(towardCamera).multiplyScalar(visual.radius + 0.28)
      label.current.scale.setScalar(labelScale.current)
    }
  })

  const emissiveIntensity = status === 'locked' ? 0.015 : status === 'completed' ? 0.2 : 0.08

  return <group position={lesson.position}>
    <group ref={visualGroup} scale={visual.radius}>
      <mesh geometry={PLANET_GEOMETRY} dispose={null}>
        <meshStandardMaterial color={visual.color} emissive={visual.color} emissiveIntensity={emissiveIntensity} roughness={0.85} metalness={0} />
      </mesh>
      {details.length > 0 && <instancedMesh ref={detailInstances} args={[DETAIL_GEOMETRY, undefined, details.length]} dispose={null}>
        <meshStandardMaterial color="#ffffff" roughness={0.9} metalness={0} />
      </instancedMesh>}
      <mesh geometry={PLANET_GEOMETRY} scale={1.055} dispose={null}>
        <meshBasicMaterial ref={atmosphereMaterial} color={visual.color} transparent opacity={targetAtmosphereOpacity} depthWrite={false} toneMapped={false} />
      </mesh>
      {visual.style === 'ring' && <mesh geometry={RING_GEOMETRY} rotation={[Math.PI / 2 + visual.ringTilt, 0, visual.ringTilt * 0.35]} dispose={null}>
        <meshStandardMaterial color={visual.ringColor ?? visual.detailColor} roughness={0.8} metalness={0} />
      </mesh>}
    </group>
    <Billboard ref={label} position={[0, 0, visual.radius + 0.28]}>
      <Text fontSize={0.68} fontWeight="bold" color="#ffffff" outlineColor="#2D1A72" outlineWidth={0.04} anchorX="center" anchorY="middle">{`Unit ${lesson.id}`}</Text>
    </Billboard>
  </group>
}

'use client'

import { useMemo } from 'react'
import { CuboidCollider } from '@react-three/rapier'
import { EXPANSION_POINTS, FENCE_SEGMENTS, getOrganicOutlineScale, WORLD_CONFIG } from './worldConfig'

export default function IslandBoundary() {
  const sections = useMemo(() => FENCE_SEGMENTS.map((segment) => {
    const averageRadius = (WORLD_CONFIG.fence.radiusX + WORLD_CONFIG.fence.radiusZ) / 2
    const length = Math.abs(segment.endAngle - segment.startAngle) * averageRadius
    const count = Math.max(1, Math.ceil(length / 1.35))
    const colliders = Array.from({ length: count }, (_, index) => {
      const a = segment.startAngle + (index / count) * (segment.endAngle - segment.startAngle)
      const b = segment.startAngle + ((index + 1) / count) * (segment.endAngle - segment.startAngle)
      const scaleA = getOrganicOutlineScale(a), scaleB = getOrganicOutlineScale(b)
      const ax = Math.cos(a) * WORLD_CONFIG.fence.radiusX * scaleA, az = Math.sin(a) * WORLD_CONFIG.fence.radiusZ * scaleA
      const bx = Math.cos(b) * WORLD_CONFIG.fence.radiusX * scaleB, bz = Math.sin(b) * WORLD_CONFIG.fence.radiusZ * scaleB
      const x = WORLD_CONFIG.center.x + (ax + bx) / 2
      const z = WORLD_CONFIG.center.z + (az + bz) / 2
      const dx = bx - ax
      const dz = bz - az
      return { x, z, halfLength: Math.hypot(dx, dz) / 2 + 0.08, angle: Math.atan2(-dz, dx) }
    })
    return { id: segment.id, colliders }
  }), [])

  return <>{sections.map(({ id, colliders }) => <group key={id} userData={{ fenceBoundarySegment: id }}>
    {colliders.map((item, index) => <CuboidCollider key={index}
      args={[item.halfLength, WORLD_CONFIG.fence.colliderHeight, WORLD_CONFIG.fence.colliderHalfDepth]}
      position={[item.x, WORLD_CONFIG.fence.colliderHeight, item.z]}
      rotation={[0, item.angle, 0]}
      friction={0.8}
    />)}
  </group>)}</>
}

export { EXPANSION_POINTS }

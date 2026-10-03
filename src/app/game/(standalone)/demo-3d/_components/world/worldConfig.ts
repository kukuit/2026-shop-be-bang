export const WORLD_CONFIG = {
  center: { x: 0, z: 2.5 },
  hub: { radiusX: 20.8, radiusZ: 22.8 },
  fence: { radiusX: 21, radiusZ: 23, colliderHalfDepth: 0.48, colliderHeight: 1.5, postSpacing: 1.25 },
  buffer: { radiusX: 24.5, radiusZ: 26.5 },
  river: { innerRadiusX: 24.5, innerRadiusZ: 26.5, outerRadiusX: 30, outerRadiusZ: 32 },
  farBank: { innerRadiusX: 31.8, innerRadiusZ: 33.8, outerRadiusX: 48, outerRadiusZ: 50 },
  background: { radius: 96 },
} as const

export function getOrganicOutlineScale(angle: number) {
  return 1
    + Math.sin(angle * 3 + 0.4) * 0.045
    + Math.sin(angle * 5 + 1.2) * 0.02
    + Math.sin(angle * 8 + 0.7) * 0.008
}

// Match the 3.1-wide Math Dock, with a small clearance at each fence end.
// The visible fence and its Rapier colliders share this opening.
const EAST_GATE_HALF_ANGLE = 0.075
const GARDEN_GATE_HALF_ANGLE = 0.105

export const FENCE_SEGMENTS = [
  { id: 'south-garden', startAngle: EAST_GATE_HALF_ANGLE, endAngle: Math.PI - GARDEN_GATE_HALF_ANGLE },
  { id: 'gate-west', startAngle: Math.PI - GARDEN_GATE_HALF_ANGLE, endAngle: Math.PI + GARDEN_GATE_HALF_ANGLE },
  { id: 'west-garden', startAngle: Math.PI + GARDEN_GATE_HALF_ANGLE, endAngle: Math.PI * 1.5 - GARDEN_GATE_HALF_ANGLE },
  { id: 'east-garden', startAngle: Math.PI * 1.5 + GARDEN_GATE_HALF_ANGLE, endAngle: Math.PI * 2 - EAST_GATE_HALF_ANGLE },
] as const

export type ExpansionPoint = {
  id: string
  targetZone: 'CAPPY_HOUSE' | 'GIFT_SHOP' | 'ADVENTURE'
  position: readonly [number, number, number]
  farBankPosition: readonly [number, number, number]
  rotation: number
  fenceSegmentId: string
}

function expansionPoint(angle: number, id: string, targetZone: ExpansionPoint['targetZone'], fenceSegmentId: string): ExpansionPoint {
  const scale = getOrganicOutlineScale(angle)
  const position = [
    WORLD_CONFIG.center.x + Math.cos(angle) * WORLD_CONFIG.fence.radiusX * scale,
    0,
    WORLD_CONFIG.center.z + Math.sin(angle) * WORLD_CONFIG.fence.radiusZ * scale,
  ] as const
  const farBankPosition = [
    WORLD_CONFIG.center.x + Math.cos(angle) * (WORLD_CONFIG.river.outerRadiusX + 1.8) * scale,
    0,
    WORLD_CONFIG.center.z + Math.sin(angle) * (WORLD_CONFIG.river.outerRadiusZ + 1.8) * scale,
  ] as const
  return { id, targetZone, position, farBankPosition, rotation: angle, fenceSegmentId }
}

export const EXPANSION_POINTS: readonly ExpansionPoint[] = [
  expansionPoint(Math.PI * 1.5, 'cappy-house', 'CAPPY_HOUSE', 'gate-north'),
  expansionPoint(0, 'gift-shop', 'GIFT_SHOP', 'gate-east'),
  expansionPoint(Math.PI, 'adventure-zone', 'ADVENTURE', 'gate-west'),
]

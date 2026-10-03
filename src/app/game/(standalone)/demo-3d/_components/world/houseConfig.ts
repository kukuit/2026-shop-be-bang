export const CAPPY_HOUSE = {
  position: [0, 0, 18] as [number, number, number],
  rotation: Math.PI,
  width: 4.5,
  depth: 3.8,
  wallHeight: 2.8,
  wallThickness: 0.22,
  frontZ: 1.85,
  door: { width: 1.08, height: 2.02, z: 1.99 },
  porch: {
    width: 2.3,
    depth: 1.5,
    height: 0.12,
    position: [0, 0.06, 2.7] as [number, number, number],
  },
} as const

type HouseWallCollider = { id: string; position: [number, number, number]; halfExtents: [number, number, number] }
type HouseStepCollider = { id: string; position: [number, number, number]; halfExtents: [number, number, number] }

export const HOUSE_COLLIDER: { walls: HouseWallCollider[]; porch: HouseStepCollider } = {
  walls: [
    { id: 'front', position: [0, 1.4, 1.85], halfExtents: [2.25, 1.4, 0.11] },
    { id: 'back', position: [0, 1.4, -1.85], halfExtents: [2.25, 1.4, 0.11] },
    { id: 'left', position: [-2.14, 1.4, 0], halfExtents: [0.11, 1.4, 1.96] },
    { id: 'right', position: [2.14, 1.4, 0], halfExtents: [0.11, 1.4, 1.96] },
  ],
  porch: {
    id: 'porch-step',
    position: CAPPY_HOUSE.porch.position,
    halfExtents: [CAPPY_HOUSE.porch.width / 2, CAPPY_HOUSE.porch.height / 2, CAPPY_HOUSE.porch.depth / 2],
  },
}

export const HOUSE_ENTRANCE_TRIGGER = {
  minX: -CAPPY_HOUSE.porch.width / 2,
  maxX: CAPPY_HOUSE.porch.width / 2,
  minZ: CAPPY_HOUSE.porch.position[2] - CAPPY_HOUSE.porch.depth / 2,
  maxZ: CAPPY_HOUSE.porch.position[2] + CAPPY_HOUSE.porch.depth / 2,
}

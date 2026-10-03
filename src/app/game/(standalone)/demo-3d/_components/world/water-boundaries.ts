import { getOrganicOutlineScale, WORLD_CONFIG } from './worldConfig'
import { VIETNAMESE_WORLD_LAYOUT } from './vietnamese-world.config'

const CENTER_Z = WORLD_CONFIG.center.z

function shoreRadius(x: number, z: number, radiusX: number, radiusZ: number) {
  const dz = z - CENTER_Z
  const angle = Math.atan2(dz / radiusZ, x / radiusX)
  const outline = getOrganicOutlineScale(angle)
  return Math.hypot(x / (radiusX * outline), dz / (radiusZ * outline))
}

export function isVillageWalkable(x: number, z: number) {
  // Both bridges remain walkable above the water.
  if (Math.abs(x) <= 1.25 && z >= -38 && z <= -19) return true
  if (x >= 14.4 && x <= 27.45 && Math.abs(z - CENTER_Z) <= 1.25) return true
  return shoreRadius(x, z, WORLD_CONFIG.river.innerRadiusX, WORLD_CONFIG.river.innerRadiusZ) <= 0.98
}

export function isVietnameseWalkable(x: number, z: number) {
  const { bridge, island } = VIETNAMESE_WORLD_LAYOUT
  if (Math.abs(x) <= bridge.halfWidth && z >= bridge.minZ && z <= bridge.maxZ) return true
  const [centerX, centerZ] = island.center
  return Math.hypot(x - centerX, z - centerZ) <= island.safeRadius
}

export function isBoatWater(x: number, z: number) {
  const dz = Math.abs(z - CENTER_Z)
  // The east opening connects the river to the sea without crossing far-bank land.
  if (x >= 28 && x <= 55 && dz <= Math.max(4.5, x * 0.17)) return true
  const outsideHome = shoreRadius(x, z, WORLD_CONFIG.river.innerRadiusX, WORLD_CONFIG.river.innerRadiusZ) >= 1.05
  const insideFarBank = shoreRadius(x, z, WORLD_CONFIG.river.outerRadiusX, WORLD_CONFIG.river.outerRadiusZ) <= 0.97
  return outsideHome && insideFarBank
}

export function boatFitsWater(x: number, z: number, heading: number) {
  const forwardX = Math.cos(heading)
  const forwardZ = Math.sin(heading)
  const sideX = -forwardZ
  const sideZ = forwardX
  for (const length of [-1.7, 0, 1.7]) {
    for (const width of [-0.7, 0.7]) {
      if (!isBoatWater(x + forwardX * length + sideX * width, z + forwardZ * length + sideZ * width)) return false
    }
  }
  return true
}

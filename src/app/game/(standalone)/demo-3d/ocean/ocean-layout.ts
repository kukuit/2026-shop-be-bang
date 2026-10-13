export const OCEAN_SURFACE_Y = 8.5
export const OCEAN_MAP_HALF_SIZE = 31
export const OCEAN_START_POSITION: [number, number, number] = [0, 1.45, 2.5]

export type OceanLandmark = {
  id: string
  name: string
  position: [number, number, number]
  subtitle: string
}

export const OCEAN_LANDMARKS: OceanLandmark[] = [
  { id: 'start', name: 'BẾN LẶN AN TOÀN', position: [0, 0, 3], subtitle: 'Cappy sẵn sàng khám phá' },
  { id: 'coral-garden', name: 'VƯỜN SAN HÔ', position: [-9, 0, -7], subtitle: 'San hô đủ màu' },
  { id: 'shell-bay', name: 'VỊNH VỎ SÒ', position: [10, 0, 1], subtitle: 'Vỏ sò và sao biển' },
  { id: 'fish-valley', name: 'THUNG LŨNG CÁ', position: [-12, 0, 10], subtitle: 'Đàn cá hiền lành' },
  { id: 'rock-ruins', name: 'TÀN TÍCH ĐÁ', position: [7, 0, -12], subtitle: 'Rương mang số' },
  { id: 'shipwreck', name: 'TÀU ĐẮM XA XA', position: [19, 0, -21], subtitle: 'Có một rương vàng bí mật' },
]

export type OceanPointObstacle = { x: number; z: number; radius: number }

// Only major scenery blocks movement. Small coral, shells, fish and plants are
// decorative and cannot trap the player.
export const OCEAN_LARGE_OBSTACLES: OceanPointObstacle[] = [
  { x: -16, z: -13, radius: 2.5 },
  { x: -14, z: -13, radius: 2.2 },
  { x: 11.5, z: -10.5, radius: 2.1 },
  { x: 22.5, z: -21, radius: 2.2 },
  { x: 18.5, z: -24, radius: 1.9 },
]

export const OCEAN_CHEST_SLOTS: [number, number][] = [
  [-3.1, -6.4],
  [0, -8.2],
  [3.1, -6.4],
]

export type OceanCollectible = {
  id: string
  kind: 'shell' | 'starfish' | 'pearl' | 'gem'
  position: [number, number, number]
}

export const OCEAN_COLLECTIBLES: OceanCollectible[] = [
  { id: 'shell-coral-1', kind: 'shell', position: [-8.5, 0.35, -5.2] },
  { id: 'shell-bay-1', kind: 'shell', position: [9.1, 0.35, 1.8] },
  { id: 'star-shell-bay', kind: 'starfish', position: [11.2, 0.35, 2.7] },
  { id: 'pearl-ruins', kind: 'pearl', position: [8.5, 0.35, -13.3] },
  { id: 'gem-shipwreck', kind: 'gem', position: [17.2, 0.35, -19.2] },
  { id: 'star-valley', kind: 'starfish', position: [-10.6, 0.35, 11.5] },
]

export function getOceanFloorHeight(x: number, z: number) {
  const dunes = Math.sin(x * 0.19 + 0.5) * Math.cos(z * 0.17) * 0.27
    + Math.sin((x + z) * 0.12) * 0.2
    + Math.cos(x * 0.34 - z * 0.16) * 0.08
  const shoreRise = Math.max(0, Math.hypot(x, z) - 24) * 0.08
  return -0.72 + dunes + shoreRise
}

export function isOceanPositionBlocked(x: number, z: number, obstacles = OCEAN_LARGE_OBSTACLES, clearance = 0.9) {
  return obstacles.some((obstacle) => Math.hypot(x - obstacle.x, z - obstacle.z) < obstacle.radius + clearance)
}

import type { LessonMapItem } from '@/components/games/lesson-map/data'

export const VIETNAMESE_WORLD_LAYOUT = {
  island: { center: [0, -60] as [number, number], radius: 28, safeRadius: 25.2 },
  bridge: { halfWidth: 1.25, minZ: -38, maxZ: -19.8 },
  plaza: [0, 0, -56] as [number, number, number],
  readingHut: [-17, 0, -59] as [number, number, number],
  knowledgeTree: [17, 0, -59] as [number, number, number],
  entrySign: [-4.2, 0, -36.2] as [number, number, number],
} as const

export type VietnameseLessonNode = LessonMapItem & {
  symbol: string
  accent: string
  position: [number, number, number]
}

const FIRST_ZONE_LAYOUT: readonly { symbol: string; accent: string; position: [number, number, number] }[] = [
  { symbol: 'A', accent: '#f06c5d', position: [-8, 0, -56] },
  { symbol: 'Ă', accent: '#efbd42', position: [0, 0, -67] },
  { symbol: 'Â', accent: '#a47be7', position: [8, 0, -56] },
  { symbol: 'B', accent: '#4d9ed6', position: [-5, 0, -47] },
  { symbol: 'C', accent: '#ed9747', position: [5, 0, -47] },
]

export const VIETNAMESE_PATHS: readonly { points: readonly [number, number][]; width: number }[] = [
  { points: [[0, -37], [1.1, -42], [-0.8, -47], [0, -51], [0, -56]], width: 1.55 },
  { points: [[0, -56], [-3.5, -54], [-5.3, -54.8], [-7, -55.5]], width: 1.05 },
  { points: [[0, -56], [0.2, -60], [0.1, -64], [0, -65.2]], width: 1.05 },
  { points: [[0, -56], [3.5, -54], [5.3, -54.8], [7, -55.5]], width: 1.05 },
  { points: [[0, -56], [-2.4, -52], [-3.4, -49.8], [-4.4, -48]], width: 0.95 },
  { points: [[0, -56], [2.4, -52], [3.4, -49.8], [4.4, -48]], width: 0.95 },
  { points: [[0, -56], [-7, -59], [-12, -59], [-15.2, -59]], width: 0.85 },
  { points: [[0, -56], [7, -59], [12, -59], [15.2, -59]], width: 0.85 },
]

// Fixed placements keep the island consistent across visits and stay on the playable land.
export const VIETNAMESE_TREES = [
  { x: -18, z: -47, scale: 0.9, kind: 'pine' }, { x: 18, z: -47, scale: 0.82, kind: 'round' },
  { x: -21, z: -56, scale: 1.05, kind: 'pine' }, { x: 21, z: -56, scale: 0.95, kind: 'round' },
  { x: -17, z: -70, scale: 0.88, kind: 'round' }, { x: 17, z: -71, scale: 1.02, kind: 'pine' },
  { x: -20, z: -66, scale: 0.9, kind: 'pine' }, { x: 20, z: -66, scale: 0.92, kind: 'round' },
  { x: -11, z: -81, scale: 0.78, kind: 'round' }, { x: 11, z: -81, scale: 0.82, kind: 'pine' },
  { x: -21, z: -74, scale: 0.75, kind: 'pine' }, { x: 21, z: -74, scale: 0.76, kind: 'round' },
] as const

export function buildVietnameseLessonNodes(items: LessonMapItem[]): VietnameseLessonNode[] {
  return [...items]
    .sort((a, b) => a.id - b.id)
    .slice(0, 5)
    .map((item, index) => {
      const preset = FIRST_ZONE_LAYOUT[index]
      if (preset) return { ...item, ...preset }

      // Reserve a repeatable five-stop radial layout for future lesson zones.
      const zone = Math.floor((item.id - 1) / 5)
      const slot = (item.id - 1) % 5
      const angle = (slot / 5) * Math.PI * 2 - Math.PI / 2
      const radius = 8.5
      return {
        ...item,
        symbol: String(item.id),
        accent: ['#f06c5d', '#efbd42', '#a47be7', '#4d9ed6', '#ed9747'][slot],
        position: [Math.sin(angle) * radius, 0, -56 - zone * 20 + Math.cos(angle) * radius],
      }
    })
}

import { englishUnitDefinitions } from '@/components/games/lesson-map/englishData'

export const ENGLISH_WORLD_CONFIG = {
  route: '/game/demo-3d/tieng-anh',
  launch: { x: -18, z: -4, top: 3.65, stepCount: 6 },
  colors: { background: '#160b4d', primary: '#6728b8', secondary: '#4c6fff' },
} as const

export const ENGLISH_STEPS = Array.from({ length: ENGLISH_WORLD_CONFIG.launch.stepCount }, (_, index) => ({
  x: -7.5 - index * 1.6,
  z: -4,
  top: 0.55 + index * 0.55,
}))

const UNITS_PER_RING = 6
const RING_RADII = [22, 38, 54] as const
const HEIGHT_OFFSETS = [-2, 0, 2, 3] as const

export type EnglishPlanetVisual = {
  style: 'ring' | 'land' | 'crater' | 'simple'
  color: string
  detailColor: string
  radius: number
  spinSpeed: number
  ringTilt: number
  ringColor?: string
  cloudColor?: string
  clouds?: boolean
}

type EnglishPlanetVisualPreset = Omit<EnglishPlanetVisual, 'spinSpeed' | 'ringTilt'> & { ringTilt?: number }

export const ENGLISH_PLANET_VISUAL_PRESETS: readonly EnglishPlanetVisualPreset[] = [
  { style: 'ring', color: '#8C5AE8', detailColor: '#D6B5FF', ringColor: '#C77DFF', radius: 4, ringTilt: -0.13 },
  { style: 'land', color: '#47BFEA', detailColor: '#72CD74', cloudColor: '#D9F6FF', radius: 4.3, clouds: true },
  { style: 'land', color: '#64C98A', detailColor: '#38AFA4', cloudColor: '#E3FFF0', radius: 3.8, clouds: true },
  { style: 'crater', color: '#F7A747', detailColor: '#FFD27A', radius: 4.1 },
  { style: 'ring', color: '#E978D7', detailColor: '#FFD0F5', ringColor: '#F9A6E9', radius: 3.9, ringTilt: 0.18 },
  { style: 'simple', color: '#5C8FF2', detailColor: '#B9D5FF', radius: 4.2 },
  { style: 'crater', color: '#EF735F', detailColor: '#FFB39E', radius: 4 },
  { style: 'simple', color: '#8679E8', detailColor: '#D4CCFF', radius: 4.1 },
]

function getPlanetPosition(index: number, total: number): [number, number, number] {
  const ring = Math.floor(index / UNITS_PER_RING)
  const ringStart = ring * UNITS_PER_RING
  const unitsInRing = Math.min(UNITS_PER_RING, total - ringStart)
  const slot = index - ringStart
  const angle = (slot / unitsInRing) * Math.PI * 2 - Math.PI / 2 + (ring % 2) * Math.PI / 6
  const radius = RING_RADII[ring] ?? RING_RADII[RING_RADII.length - 1] + (ring - RING_RADII.length + 1) * 16
  return [Math.cos(angle) * radius, HEIGHT_OFFSETS[index % HEIGHT_OFFSETS.length], Math.sin(angle) * radius]
}

export const ENGLISH_PLANETS: Array<(typeof englishUnitDefinitions)[number] & { position: [number, number, number]; color: string; visual: EnglishPlanetVisual }> = englishUnitDefinitions.map((lesson, index, lessons) => {
  const preset = ENGLISH_PLANET_VISUAL_PRESETS[index % ENGLISH_PLANET_VISUAL_PRESETS.length]
  return {
    ...lesson,
    position: getPlanetPosition(index, lessons.length),
    color: preset.color,
    visual: {
      ...preset,
      radius: preset.radius + (index < ENGLISH_PLANET_VISUAL_PRESETS.length ? 0 : ((lesson.id * 17) % 3 - 1) * 0.08),
      spinSpeed: 0.02 + ((lesson.id * 3) % 5) * 0.01,
      ringTilt: preset.ringTilt ?? ((lesson.id * 7) % 5 - 2) * 0.035,
    },
  }
})

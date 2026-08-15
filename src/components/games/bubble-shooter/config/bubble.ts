export const BUBBLE_CONFIG = {
  targetActive: 6,
  maxActive: 7,
  spawnDelayMin: 850,
  spawnDelayMax: 1150,
  refillCheckDelay: 220,
  initialSpawnDelay: 300,
  lanes: 5,
  laneJitter: 34,
  minDistance: 135,
  correctMinDistance: 155,
  maxSpawnAttempts: 8,
  correctSpawnOrderMin: 3,
  correctSpawnOrderMax: 10,
  radiusMin: 48,
  radiusMax: 60,
  speedLevels: [78, 92, 106] as readonly number[],
  swayMin: 10,
  swayMax: 28,
  frequencyMin: 0.00065,
  frequencyMax: 0.00115,
  edgeMargin: 12,
  spawnOffsetMin: 4,
  spawnOffsetMax: 16,
  topDespawnY: 245,
  shooterSafeTop: 1030,
} as const

export const BUBBLE_VISUAL_CONFIG = {
  bodyWidthFactor: 2.35,
  bodyHeightFactor: 3.15,
  bodyOffsetYFactor: 0.5,
  colorOpacity: 0.9,
  numberSizeFactor: 1,
  numberStrokeThickness: 5,
  numberShadowOffsetY: 2,
} as const

export const BUBBLE_PALETTE = {
  pink: { light: 0xffa6d4, main: 0xff5aaa, dark: 0xdc2475 },
  red: { light: 0xff958d, main: 0xff493d, dark: 0xdc2830 },
  orange: { light: 0xffc273, main: 0xff8a16, dark: 0xe05b00 },
  yellow: { light: 0xffef74, main: 0xffd11a, dark: 0xdf9700 },
  green: { light: 0xb6ef70, main: 0x63d238, dark: 0x2b982a },
  blue: { light: 0x82dcff, main: 0x32a6ff, dark: 0x176bcd },
  purple: { light: 0xda9cff, main: 0xb64cff, dark: 0x7b24c4 },
} as const

export const BUBBLE_COLORS = Object.values(BUBBLE_PALETTE).map(({ main }) => main)

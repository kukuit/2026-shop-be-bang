export type CameraMode = 'normal' | 'far' | 'farther' | 'panoramic' | 'overview' | 'firstPerson'

export const CAMERA_PRESETS = {
  // Match the original single follow camera when the demo loads.
  normal: { distance: 10.5, height: 5.25, lookAhead: 0, fov: 55 },
  far: { distance: 7.5, height: 4.2, lookAhead: 4.5, fov: 58 },
  farther: { distance: 10, height: 5.6, lookAhead: 5.2, fov: 56 },
  panoramic: { distance: 13, height: 7, lookAhead: 6, fov: 54 },
  overview: { distance: 16, height: 8.6, lookAhead: 7, fov: 52 },
  firstPerson: { distance: 0.1, height: 0.8, lookAhead: 4, fov: 70 },
} satisfies Record<CameraMode, { distance: number; height: number; lookAhead: number; fov: number }>

export const CAMERA_CONFIG = {
  minDistance: 1.2,
  maxDistance: 18,
  zoomSpeed: 0.008,
  pinchSpeed: 0.012,
  rotateSpeed: 0.005,
  followSmooth: 8,
  playerTurnSmooth: 3.5,
  lookSmooth: 10,
  modeSmooth: 6,
  // Pitch is camera elevation above the horizontal. Never let the orbit dip
  // below eye level, where it would look up at Cappy from underneath.
  minPitch: 0.02,
  maxPitch: 0.85,
} as const

export type CameraMode = 'near' | 'normal' | 'far' | 'firstPerson'

export const CAMERA_PRESETS = {
  near: { distance: 3.8, pitch: 0.18 },
  normal: { distance: 5.5, pitch: 0.32 },
  far: { distance: 9, pitch: 0.58 },
  firstPerson: { distance: 0, pitch: 0 },
} satisfies Record<CameraMode, { distance: number; pitch: number }>

export const CAMERA_CONFIG = {
  minDistance: 2.3,
  maxDistance: 9,
  zoomSpeed: 0.006,
  pinchSpeed: 0.012,
  rotateSpeed: 0.0045,
  followSmooth: 12,
  lookSmooth: 14,
  zoomSmooth: 10,
  collisionPadding: 0.22,
  minPitch: THREE_DEG(-20),
  maxPitch: THREE_DEG(65),
} as const

function THREE_DEG(degrees: number) {
  return degrees * Math.PI / 180
}

const radians = (degrees: number) => degrees * Math.PI / 180

/** Shared tuning for the local TPS camera and its remote aim behavior. */
export const CAMERA_CONFIG = {
  distance: 4.5,
  minDistance: 1.5,
  maxDistance: 5.8,
  shoulderOffset: 1.3,
  pivotHeight: 1.5,
  cameraRaise: 0.6,
  initialPitch: radians(-5),
  minPitch: radians(-35),
  maxPitch: radians(45),
  fov: 67,
  near: 0.1,
  far: 120,
  mouseSensitivity: 0.002,
  rotationSmoothTime: 0.05,
  positionSmoothTime: 0.08,
  collisionRadius: 0.25,
  collisionPadding: 0.15,
  fadeStartDistance: 2.1,
  fadeEndDistance: 1.5,
  aimTransitionTime: 0.18,
  aimDistance: 3.7,
  aimShoulderOffset: 1.45,
  aimFov: 60,
  aimLookDistance: 18,
} as const

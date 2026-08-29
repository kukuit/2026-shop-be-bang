import type { Lane } from './types'

export const GAME_WIDTH = 720
export const GAME_HEIGHT = 1280
export const HORIZON_Y = 545
export const CHECK_Y = 930
export const CAR_Y = 1010
export const NORMAL_SPEED = 1
export const BOOST_SPEED = 1.2
export const HIT_SPEED = 0.35
export const LANES: Record<'left' | 'center' | 'right', Lane> = { left: 0, center: 1, right: 2 }
// The player sprite is 224px wide; the left position sits flush with the viewport edge.
export const CAR_LANE_X: Record<Lane, number> = { 0: 112, 1: 360, 2: 608 }
// Perspective path of the side obstacles, expressed as distance from screen
// center. Cubic Bezier control points make them open early, then settle gently
// into the visual centers of the outer road lanes.
export const ANSWER_PATH_OFFSETS = [42, 110, 200, 248] as const

export const carLaneX = (lane: Lane) => CAR_LANE_X[lane]

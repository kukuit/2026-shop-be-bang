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
export const LANE_X: Record<Lane, number> = { 0: 190, 1: 360, 2: 530 }

export const laneX = (lane: Lane) => LANE_X[lane]

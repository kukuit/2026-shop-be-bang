import type { CharacterAnimationState, CharacterMotion } from './types'

const WALK_SPEED = 0.15
const RUN_SPEED = 2.4

/** Selects a standard clip state from root motion; a GLB is needed to play clips. */
export function resolveCharacterAnimationState(motion: CharacterMotion): CharacterAnimationState {
  if (motion.jumpStarted) return 'jumpStart'
  if (motion.justLanded) return 'jumpLand'
  if (motion.falling) return 'fall'
  if (!motion.grounded) return 'jumpLoop'
  if (motion.speed < WALK_SPEED) return 'idle'
  return motion.speed < RUN_SPEED ? 'walk' : 'run'
}

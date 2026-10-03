import { LoopOnce, LoopRepeat } from 'three'
import type { AnimationAction, AnimationClip, AnimationMixer } from 'three'
import type { CharacterAnimationState, CharacterDefinition } from '../types'

export type CharacterActions = Partial<Record<CharacterAnimationState, AnimationAction>>

export function createCharacterActions(mixer: AnimationMixer, clips: AnimationClip[], character: CharacterDefinition): CharacterActions {
  const actions: CharacterActions = {}
  for (const [state, clipName] of Object.entries(character.animations)) {
    const clip = clips.find((candidate) => candidate.name === clipName)
    if (clip) actions[state as CharacterAnimationState] = mixer.clipAction(clip)
  }
  return actions
}

/** Crossfade shared character states; it becomes active when a rigged GLB is supplied. */
export function crossfadeCharacterAnimation(
  actions: CharacterActions,
  previous: CharacterAnimationState | null,
  next: CharacterAnimationState,
  fadeDuration = 0.2,
) {
  if (previous === next) return
  const action = actions[next]
  if (!action) return
  if (previous) actions[previous]?.fadeOut(fadeDuration)
  const isOneShot = next === 'jumpStart' || next === 'jumpLand'
  action.reset()
  action.setLoop(isOneShot ? LoopOnce : LoopRepeat, isOneShot ? 1 : Infinity)
  action.clampWhenFinished = isOneShot
  action.fadeIn(fadeDuration).play()
}

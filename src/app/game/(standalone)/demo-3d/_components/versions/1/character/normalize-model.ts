import * as THREE from 'three'
import type { CharacterDefinition } from './types'

/** Call on a loaded model before attaching it to its ground-level character root. */
export function getCharacterModelPlacement(model: THREE.Object3D, character: CharacterDefinition) {
  const bounds = new THREE.Box3().setFromObject(model)
  const sourceHeight = bounds.max.y - bounds.min.y
  const scale = sourceHeight > 0 ? (character.height * character.scale) / sourceHeight : character.scale
  return { scale, groundOffsetY: -bounds.min.y * scale }
}

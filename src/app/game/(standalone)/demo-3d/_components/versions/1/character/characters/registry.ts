import { CAPPY_CHARACTER } from './cappy'
import type { CharacterDefinition } from '../types'

export const CHARACTER_DEFINITIONS: Record<string, CharacterDefinition> = {
  [CAPPY_CHARACTER.id]: CAPPY_CHARACTER,
}

export const DEFAULT_CHARACTER_ID = CAPPY_CHARACTER.id

export function getCharacterDefinition(id: string): CharacterDefinition {
  const character = CHARACTER_DEFINITIONS[id]
  if (!character) throw new Error(`Unknown demo character: ${id}`)
  return character
}

import { CHARACTER_DEFINITIONS, DEFAULT_CHARACTER_ID } from './characters/registry'
import type { CharacterDefinition, CharacterSkinDefinition } from './types'
import { CAPPY_DEFAULT_SKIN } from './skins/cappy-skins'

export type CharacterSlotSelection = { characterId: string; skinId: string }

export const DEFAULT_PLAYER_SLOT: CharacterSlotSelection = { characterId: DEFAULT_CHARACTER_ID, skinId: 'default' }

const CHARACTER_SKINS: Record<string, Record<string, CharacterSkinDefinition>> = {
  cappy: { [CAPPY_DEFAULT_SKIN.id]: CAPPY_DEFAULT_SKIN },
}

export function resolveCharacterSlot(selection: CharacterSlotSelection): { character: CharacterDefinition; skin: CharacterSkinDefinition } {
  const character = CHARACTER_DEFINITIONS[selection.characterId]
  if (!character) throw new Error(`Unknown character slot character: ${selection.characterId}`)
  const skin = CHARACTER_SKINS[selection.characterId]?.[selection.skinId]
  if (!skin) throw new Error(`Unknown skin ${selection.skinId} for character ${selection.characterId}`)
  return { character, skin }
}

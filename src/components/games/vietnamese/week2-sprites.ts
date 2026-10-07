import manifest from '@/../public/games/lessons/lop-1/tieng-viet/tuan-2/images/week2-sheet.manifest.json'
import type { GameImage } from '../general/game-image'

export type Week2Sprite = (typeof manifest.items)[number]
export type Week2ImageId = Week2Sprite['id']

export const WEEK_2_SPRITE_MANIFEST = manifest
export const WEEK_2_SPRITE_SHEET = manifest.image

export function validateWeek2SpriteManifest(): string[] {
  const errors: string[] = []
  if (manifest.width !== 1536 || manifest.height !== 1024) errors.push('sprite sheet must be 1536x1024')
  if (manifest.grid.columns !== 4 || manifest.grid.rows !== 4) errors.push('sprite sheet grid must be 4x4')
  if (manifest.grid.cellWidth !== 384 || manifest.grid.cellHeight !== 256) errors.push('sprite cells must be 384x256')
  if (manifest.grid.columns * manifest.grid.cellWidth !== manifest.width
    || manifest.grid.rows * manifest.grid.cellHeight !== manifest.height) errors.push('grid dimensions do not match the sprite sheet')
  if (manifest.items.length !== manifest.grid.rows * manifest.grid.columns) errors.push('manifest must define every sprite cell')
  if (new Set(manifest.items.map(item => item.id)).size !== manifest.items.length) errors.push('sprite ids must be unique')
  for (const item of manifest.items) {
    if (!item.id.trim()) errors.push('sprite id cannot be empty')
    if (item.x !== item.col * manifest.grid.cellWidth || item.y !== item.row * manifest.grid.cellHeight
      || item.w !== manifest.grid.cellWidth || item.h !== manifest.grid.cellHeight) errors.push(`invalid cell coordinates for ${item.id}`)
    if (item.row < 0 || item.row >= manifest.grid.rows || item.col < 0 || item.col >= manifest.grid.columns) errors.push(`sprite cell is out of bounds: ${item.id}`)
  }
  return errors
}

const manifestErrors = validateWeek2SpriteManifest()
if (manifestErrors.length) throw new Error(`Invalid Week 2 sprite manifest: ${manifestErrors.join('; ')}`)

export function getWeek2SpriteById(id: string): Week2Sprite | undefined {
  return manifest.items.find(item => item.id === id)
}

export function getWeek2SpriteRect(id: string): { x: number; y: number; width: number; height: number } | undefined {
  const sprite = getWeek2SpriteById(id)
  return sprite ? { x: sprite.x, y: sprite.y, width: sprite.w, height: sprite.h } : undefined
}

export function getWeek2SpriteGrid(id: string) {
  return getWeek2SpriteById(id) ? manifest.grid : undefined
}

export function getWeek2PhaserSpriteFrame(id: string) {
  const sprite = getWeek2SpriteById(id)
  return sprite ? { name: sprite.id, x: sprite.x, y: sprite.y, width: sprite.w, height: sprite.h } : undefined
}

const imageLabels: Readonly<Record<string, string>> = {
  de: 'dê', co: 'cò', co_cay: 'cọ', cho: 'chó', o_to: 'ô tô', o: 'ổ', nha: 'nhà', ca: 'cá',
  du_du: 'đu đủ', dua: 'dứa', dua_coconut: 'dừa', den: 'đèn', mo: 'mơ', no: 'nơ', vo: 'vở', ga_trong: 'gà trống',
}

export function getWeek2GameImage(id: string, alt = imageLabels[id] ?? id.replaceAll('_', ' '), caption?: string): GameImage | undefined {
  const frame = getWeek2SpriteRect(id)
  if (!frame) return undefined
  return { src: manifest.image, sourceWidth: manifest.width, sourceHeight: manifest.height, key: `week2-${id}`, alt, caption, frame }
}

/** Keep sprite lookup tokens distinct from answer text such as the Week 2 letter `o`. */
export const getWeek2ImageLookupKey = (id: string) => `week2-image:${id}`

export const WEEK_2_IMAGE_QUESTION_IMAGES: Readonly<Record<string, GameImage>> = Object.fromEntries(
  manifest.items.map(item => [getWeek2ImageLookupKey(item.id), getWeek2GameImage(item.id, `Hình ${imageLabels[item.id] ?? item.id.replaceAll('_', ' ')}`)!]),
)

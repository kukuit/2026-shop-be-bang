import manifest from '@/../public/games/lessons/lop-1/tieng-viet/tuan-1/week1-sheet.manifest.json'
import type { GameImage } from '../general/game-image'

export type Week1Sprite = (typeof manifest.items)[number]
export type Week1ImageId = Week1Sprite['id']

export const WEEK_1_SPRITE_MANIFEST = manifest
export const WEEK_1_SPRITE_SHEET = manifest.image

export function validateWeek1SpriteManifest(): string[] {
  const errors: string[] = []
  if (manifest.width !== 1536 || manifest.height !== 1024) errors.push('sprite sheet must be 1536x1024')
  if (manifest.grid.columns !== 4 || manifest.grid.rows !== 4) errors.push('sprite sheet grid must be 4x4')
  if (manifest.grid.cellWidth !== 384 || manifest.grid.cellHeight !== 256) errors.push('sprite cells must be 384x256')
  if (manifest.grid.columns * manifest.grid.cellWidth !== manifest.width
    || manifest.grid.rows * manifest.grid.cellHeight !== manifest.height) errors.push('grid dimensions do not match the sprite sheet')
  if (manifest.items.length !== manifest.grid.rows * manifest.grid.columns) errors.push('manifest must define every sprite cell')
  if (new Set(manifest.items.map(item => item.id)).size !== manifest.items.length) errors.push('sprite ids must be unique')
  for (const item of manifest.items) {
    if (!item.id.trim()) errors.push('sprite ids cannot be empty')
    if (item.x !== item.col * manifest.grid.cellWidth || item.y !== item.row * manifest.grid.cellHeight
      || item.w !== manifest.grid.cellWidth || item.h !== manifest.grid.cellHeight) errors.push(`invalid cell coordinates for ${item.id}`)
    if (item.row < 0 || item.row >= manifest.grid.rows || item.col < 0 || item.col >= manifest.grid.columns) errors.push(`sprite cell is out of bounds: ${item.id}`)
  }
  return errors
}

const manifestErrors = validateWeek1SpriteManifest()
if (manifestErrors.length) throw new Error(`Invalid Week 1 sprite manifest: ${manifestErrors.join('; ')}`)

export function getWeek1SpriteById(id: string): Week1Sprite | undefined {
  return manifest.items.find(item => item.id === id)
}

export function getWeek1SpriteRect(id: string): { x: number; y: number; width: number; height: number } | undefined {
  const sprite = getWeek1SpriteById(id)
  return sprite ? { x: sprite.x, y: sprite.y, width: sprite.w, height: sprite.h } : undefined
}

export function getWeek1SpriteGrid(id: string) {
  return getWeek1SpriteById(id) ? manifest.grid : undefined
}

export function getWeek1PhaserSpriteFrame(id: string) {
  const sprite = getWeek1SpriteById(id)
  return sprite ? { name: sprite.id, x: sprite.x, y: sprite.y, width: sprite.w, height: sprite.h } : undefined
}

const imageLabels: Readonly<Record<string, string>> = {
  ca: 'cá', ca_tim: 'cà', tho: 'thỏ', vai: 'vải', ba: 'ba', ban: 'bàn', ghe: 'ghế', bo: 'bò',
  cua: 'cua', cau: 'câu', co: 'cò', khi: 'khỉ', ve: 've', le: 'lê', me: 'me', khe: 'khế',
}

export function getWeek1GameImage(id: string, alt = imageLabels[id] ?? id.replaceAll('_', ' '), caption?: string): GameImage | undefined {
  const frame = getWeek1SpriteRect(id)
  if (!frame) return undefined
  return { src: manifest.image, sourceWidth: manifest.width, sourceHeight: manifest.height, key: `week1-${id}`, alt, caption, frame }
}

/** Keep image lookup keys distinct from answer text such as `ba` and `ca`. */
export const getWeek1ImageLookupKey = (id: string) => `week1-image:${id}`

export const WEEK_1_IMAGE_QUESTION_IMAGES: Readonly<Record<string, GameImage>> = Object.fromEntries(
  manifest.items.map(item => [getWeek1ImageLookupKey(item.id), getWeek1GameImage(item.id, `Hình ${imageLabels[item.id] ?? item.id.replaceAll('_', ' ')}`)!]),
)

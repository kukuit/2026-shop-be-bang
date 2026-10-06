import manifest from '@/../public/games/lessons/lop-1/tieng-viet/tuan-3/images/week3-sheet.manifest.json'
import type { GameImage } from '../general/game-image'

export type Week3Sprite = (typeof manifest.items)[number]
export type Week3ImageId = Week3Sprite['id']

export const WEEK_3_SPRITE_MANIFEST = manifest
export const WEEK_3_SPRITE_SHEET = manifest.image

export function validateWeek3SpriteManifest(): string[] {
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

const manifestErrors = validateWeek3SpriteManifest()
if (manifestErrors.length) throw new Error(`Invalid Week 3 sprite manifest: ${manifestErrors.join('; ')}`)

export function getWeek3SpriteById(id: string): Week3Sprite | undefined {
  return manifest.items.find(item => item.id === id)
}

export function getWeek3SpriteRect(id: string): { x: number; y: number; width: number; height: number } | undefined {
  const sprite = getWeek3SpriteById(id)
  return sprite ? { x: sprite.x, y: sprite.y, width: sprite.w, height: sprite.h } : undefined
}

export function getWeek3SpriteGrid(id: string) {
  return getWeek3SpriteById(id) ? manifest.grid : undefined
}

export function getWeek3PhaserSpriteFrame(id: string) {
  const sprite = getWeek3SpriteById(id)
  return sprite ? { name: sprite.id, x: sprite.x, y: sprite.y, width: sprite.w, height: sprite.h } : undefined
}

const imageLabels: Readonly<Record<string, string>> = {
  ke: 'kẻ ô', ke_sach: 'kệ sách', bi: 'bí', bi_choi: 'bi', la: 'lá', ho: 'hồ', lo: 'lọ', ho_tiger: 'hổ',
  thu: 'thư', tu: 'tủ', cu: 'cú', cu_su: 'su su', khe: 'khế', khi: 'khỉ', cho: 'chó', chi: 'chỉ',
}

export function getWeek3GameImage(id: string, alt = imageLabels[id] ?? id.replaceAll('_', ' '), caption?: string): GameImage | undefined {
  const frame = getWeek3SpriteRect(id)
  if (!frame) return undefined
  return { src: manifest.image, sourceWidth: manifest.width, sourceHeight: manifest.height, key: `week3-${id}`, alt, caption, frame }
}

export const WEEK_3_IMAGE_QUESTION_IMAGES: Readonly<Record<string, GameImage>> = Object.fromEntries(
  manifest.items.map(item => [item.id, getWeek3GameImage(item.id, `Hình ${imageLabels[item.id] ?? item.id.replaceAll('_', ' ')}`)!]),
)

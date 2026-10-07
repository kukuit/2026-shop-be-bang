import manifest from '@/../public/games/lessons/lop-1/tieng-viet/tuan-4/images/week4-sheet.manifest.json'
import type { CSSProperties } from 'react'
import type { GameImage } from '../general/game-image'

export type Week4Sprite = (typeof manifest.items)[number]
export type Week4ImageId = Week4Sprite['id']

export const WEEK_4_SPRITE_MANIFEST = manifest
export const WEEK_4_SPRITE_SHEET = manifest.image

export function validateWeek4SpriteManifest(): string[] {
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

const manifestErrors = validateWeek4SpriteManifest()
if (manifestErrors.length) throw new Error(`Invalid Week 4 sprite manifest: ${manifestErrors.join('; ')}`)

export function getSpriteById(id: string): Week4Sprite | undefined {
  return manifest.items.find(item => item.id === id)
}

export function getSpriteRect(id: string): { x: number; y: number; width: number; height: number } | undefined {
  const sprite = getSpriteById(id)
  return sprite ? { x: sprite.x, y: sprite.y, width: sprite.w, height: sprite.h } : undefined
}

export function getSpritesByIds(ids: readonly string[]): Week4Sprite[] {
  return ids.flatMap(id => {
    const sprite = getSpriteById(id)
    return sprite ? [sprite] : []
  })
}

export function getImageStyle(id: string): CSSProperties | undefined {
  const sprite = getSpriteById(id)
  if (!sprite) return undefined
  const x = sprite.col / (manifest.grid.columns - 1) * 100
  const y = sprite.row / (manifest.grid.rows - 1) * 100
  return {
    backgroundImage: `url("${manifest.image}")`,
    backgroundPosition: `${x}% ${y}%`,
    backgroundSize: `${manifest.grid.columns * 100}% ${manifest.grid.rows * 100}%`,
    backgroundRepeat: 'no-repeat',
  }
}

export function getPhaserSpriteFrame(id: string) {
  const sprite = getSpriteById(id)
  return sprite ? { name: sprite.id, x: sprite.x, y: sprite.y, width: sprite.w, height: sprite.h } : undefined
}

export function getGameImage(id: string, alt: string, caption?: string): GameImage | undefined {
  const frame = getSpriteRect(id)
  if (!frame) return undefined
  return {
    src: manifest.image,
    sourceWidth: manifest.width,
    sourceHeight: manifest.height,
    key: `week4-${id}`,
    alt,
    caption,
    frame,
  }
}

export const WEEK_4_GAME_IMAGES: Readonly<Record<string, GameImage>> = Object.fromEntries(
  manifest.items.map(item => [item.id, getGameImage(item.id, item.id.replaceAll('_', ' '))!]),
)

const imageLabels: Readonly<Record<string, string>> = {
  me: 'mẹ', ca_me: 'cá mè', no: 'nơ', ca_no: 'ca nô', ga: 'gà', go: 'gỗ', gio: 'giỏ', gia_do: 'giá đỗ',
  ghe: 'ghế', ghe_cua: 'ghẹ', nha: 'nhà', nho: 'nho', ngo: 'ngõ', ngu: 'ngủ', nghe: 'nghé', cu_nghe: 'củ nghệ',
}

export const WEEK_4_IMAGE_QUESTION_IMAGES: Readonly<Record<string, GameImage>> = Object.fromEntries(
  manifest.items.map(item => [item.id, getGameImage(item.id, `Hình ${imageLabels[item.id] ?? item.id}`, 'Tiếng trong tranh bắt đầu bằng chữ nào?')!]),
)

import realObjectLetterShapesManifest from '@/../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/real-object-letter-shapes.manifest.json'
import type { ExamVisual, ImageResemblesLetterAsset } from './types'
import { VIETNAMESE_ALPHABET } from './vietnamese-data'

const QUESTION_29_LETTER_BY_IMAGE_ID: Record<string, string> = {
  a: 'a',
  b: 'b',
  c: 'c',
  d: 'd',
  dd: 'đ',
  e: 'e',
  ee: 'ê',
  g: 'g',
  h: 'h',
  i: 'i',
  k: 'k',
  l: 'l',
  m: 'm',
  n: 'n',
  o: 'o',
  oo: 'ô',
  ow: 'ơ',
  p: 'p',
  r: 'r',
  s: 's',
  t: 't',
  u: 'u',
  uw: 'ư',
  x: 'x',
}

const manifest = realObjectLetterShapesManifest
const manifestId = 'real-object-letter-shapes' as const

export const QUESTION_29_ASSETS: readonly ImageResemblesLetterAsset[] = Object.entries(QUESTION_29_LETTER_BY_IMAGE_ID)
  .flatMap(([imageId, resemblesLetter]) => manifest.items.some(item => item.id === imageId)
    ? [{ id: `shape-${imageId}`, manifestId, imageId, resemblesLetter }]
    : [])

/** Start with the clearly recognizable examples specified for this question type. */
export const QUESTION_28_29_ENABLED_ASSET_IDS = ['c', 's', 't', 'u', 'x', 'h'] as const
export const QUESTION_28_29_ENABLED_ASSETS = QUESTION_29_ASSETS.filter(asset =>
  QUESTION_28_29_ENABLED_ASSET_IDS.includes(asset.imageId as typeof QUESTION_28_29_ENABLED_ASSET_IDS[number]))

export const QUESTION_29_ALLOWED_LETTERS = VIETNAMESE_ALPHABET.filter(letter =>
  QUESTION_29_ASSETS.some(asset => asset.resemblesLetter === letter))

export const QUESTION_29_LETTER_CONFUSION_MAP: Readonly<Record<string, readonly string[]>> = {
  a: ['ă', 'â', 'o', 'd'],
  b: ['d', 'p', 'h', 'l'],
  c: ['e', 'o', 's', 'g'],
  d: ['b', 'p', 'o', 'đ'],
  đ: ['d', 'b', 'p', 't'],
  e: ['ê', 'c', 'o', 'a'],
  ê: ['e', 'â', 'ô', 'ơ'],
  g: ['q', 'c', 'o', 's'],
  h: ['n', 'm', 'k', 'l'],
  i: ['l', 't', 'j', 'u'],
  k: ['h', 'l', 't', 'x'],
  l: ['i', 't', 'k', 'h'],
  m: ['n', 'h', 'w', 'u'],
  n: ['m', 'h', 'u', 'r'],
  o: ['ô', 'ơ', 'a', 'c'],
  ô: ['o', 'ơ', 'ê', 'â'],
  ơ: ['o', 'ô', 'ư', 'u'],
  p: ['b', 'd', 'q', 'r'],
  r: ['n', 'p', 'k', 'l'],
  s: ['c', 'x', 'g', 'r'],
  t: ['l', 'i', 'k', 'x'],
  u: ['ư', 'v', 'n', 'o'],
  ư: ['u', 'ơ', 'v', 'n'],
  x: ['k', 't', 'v', 's'],
}

export const QUESTION_29_SENTENCE_PREFIX = 'Hình ảnh trên giống chữ'

export function getQuestion29AssetVisual(asset: ImageResemblesLetterAsset): ExamVisual | undefined {
  if (asset.manifestId !== manifestId) return undefined
  const item = manifest.items.find(candidate => candidate.id === asset.imageId)
  if (!item || QUESTION_29_LETTER_BY_IMAGE_ID[item.id] !== asset.resemblesLetter) return undefined
  return {
    type: 'image',
    value: manifest.image,
    label: 'Hình ảnh minh họa',
    sprite: {
      spriteSheet: manifest.image,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      sheetWidth: manifest.width,
      sheetHeight: manifest.height,
    },
  }
}

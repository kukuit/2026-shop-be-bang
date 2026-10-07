import { QUESTION_25_WORDS } from './question25-knowledge'
import fruitNoneColorManifest from '@/../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/fruit-none-color.manifest.json'
import { VIETNAMESE_ALPHABET } from './vietnamese-data'
import type { ExamSpriteCrop, ExamVisual, FruitColorId, Question30ColorMeta, Question30FruitId, Question30FruitMeta, Question30Item } from './types'

const QUESTION_30_VOICE_ROOT = '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices'

export const QUESTION_30_PROMPT = 'Kéo thả chữ cái thích hợp vào chỗ trống.'
export const QUESTION_30_RECENT_KEY = 'FILL_FRUIT_COLOR_LETTER'
export const QUESTION_30_ALLOWED_LETTERS = VIETNAMESE_ALPHABET

export const QUESTION_30_COMMON_VOICE = {
  fruitClassifier: `${QUESTION_30_VOICE_ROOT}/common/qua.mp3`,
  askForLetter: `${QUESTION_30_VOICE_ROOT}/common/co-chu-gi.mp3`,
} as const

export const QUESTION_30_FRUIT_NONE_COLOR_MANIFEST = fruitNoneColorManifest

export const QUESTION_30_FRUIT_POOL: readonly Question30FruitMeta[] = QUESTION_25_WORDS
  .filter(item => item.category === 'fruit')
  .map(item => ({
    id: item.id,
    label: `Quả ${item.word}`,
    imageId: item.imageId,
    voice: `${QUESTION_30_VOICE_ROOT}/fruits/${item.id}.mp3`,
  }))

export const FRUIT_COLOR_META: Record<FruitColorId, Omit<Question30ColorMeta, 'id'>> = {
  red: { label: 'đỏ', hex: '#f00016', rgb: [240, 0, 22], voice: `${QUESTION_30_VOICE_ROOT}/common/mau-do.mp3` },
  green: { label: 'xanh lá', hex: '#22c55e', rgb: [34, 197, 94], voice: `${QUESTION_30_VOICE_ROOT}/common/mau-xanh-la.mp3` },
  yellow: { label: 'vàng', hex: '#ffdf00', rgb: [255, 223, 0], voice: `${QUESTION_30_VOICE_ROOT}/common/mau-vang.mp3` },
  orange: { label: 'cam', hex: '#ff7000', rgb: [255, 112, 0], voice: `${QUESTION_30_VOICE_ROOT}/common/mau-cam.mp3` },
  purple: { label: 'tím', hex: '#762dff', rgb: [118, 45, 255], voice: `${QUESTION_30_VOICE_ROOT}/common/mau-tim.mp3` },
  pink: { label: 'hồng', hex: '#ff68b5', rgb: [255, 104, 181], voice: `${QUESTION_30_VOICE_ROOT}/common/mau-hong.mp3` },
}

export const QUESTION_30_COLOR_POOL: readonly Question30ColorMeta[] = (Object.keys(FRUIT_COLOR_META) as FruitColorId[])
  .map(id => ({ id, ...FRUIT_COLOR_META[id] }))

export const FRUIT_ALLOWED_COLORS: Record<Question30FruitId, readonly FruitColorId[]> = {
  tao: ['red', 'green', 'yellow', 'pink'],
  cam: ['orange', 'yellow'],
  chuoi: ['yellow', 'green'],
  'dua-hau': ['green'],
  xoai: ['yellow', 'green', 'orange', 'red'],
  nho: ['red', 'green', 'yellow', 'purple', 'pink'],
  dua: ['yellow', 'orange', 'green'],
  le: ['green', 'yellow', 'red'],
}

export function getQuestion30AllowedColorIds(fruitId: string): readonly FruitColorId[] {
  return Object.hasOwn(FRUIT_ALLOWED_COLORS, fruitId)
    ? FRUIT_ALLOWED_COLORS[fruitId as Question30FruitId]
    : []
}

export function getQuestion30FruitVisual(fruit: Question30FruitMeta): ExamVisual | undefined {
  const crop = QUESTION_30_FRUIT_NONE_COLOR_MANIFEST.items.find(item => item.id === fruit.imageId)
  if (!crop) return undefined
  const sprite: ExamSpriteCrop = {
    spriteSheet: QUESTION_30_FRUIT_NONE_COLOR_MANIFEST.image,
    x: crop.x,
    y: crop.y,
    width: crop.width,
    height: crop.height,
    sheetWidth: QUESTION_30_FRUIT_NONE_COLOR_MANIFEST.width,
    sheetHeight: QUESTION_30_FRUIT_NONE_COLOR_MANIFEST.height,
  }
  return { type: 'image', value: sprite.spriteSheet, label: fruit.label, sprite }
}

export function getQuestion30VoiceSequence(item: Pick<Question30Item, 'fruit' | 'color'>): string[] {
  return [
    QUESTION_30_COMMON_VOICE.fruitClassifier,
    item.fruit.voice,
    item.color.voice,
    QUESTION_30_COMMON_VOICE.askForLetter,
  ]
}

export function getQuestion30CombinationKey(items: readonly Pick<Question30Item, 'fruit' | 'color' | 'letter'>[]): string {
  return items.map(item => `${item.fruit.id}-${item.color.id}-${item.letter}`).join('|')
}

export function getQuestion30SelectionSignature(items: readonly Pick<Question30Item, 'fruit' | 'color' | 'letter'>[]): string {
  const fruitSet = items.map(item => item.fruit.id).sort().join(',')
  const colorSet = items.map(item => item.color.id).sort().join(',')
  const letterSet = items.map(item => item.letter).sort().join(',')
  return `${fruitSet}::${colorSet}::${letterSet}`
}

export function question30SelectionRepeatsRecent(
  items: readonly Pick<Question30Item, 'fruit' | 'color' | 'letter'>[],
  recentSignatures: readonly string[],
): boolean {
  const currentParts = getQuestion30SelectionSignature(items).split('::')
  return recentSignatures.some(signature => {
    const previousParts = signature.split('::')
    return previousParts.length === 3 && previousParts.some((part, index) => part === currentParts[index])
  })
}

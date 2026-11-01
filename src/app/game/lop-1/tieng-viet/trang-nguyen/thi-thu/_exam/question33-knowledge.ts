import type { AnimatedQuestion33FruitId, Question25WordKnowledgeItem } from './types'
import { QUESTION_25_WORDS, getQuestion25Visual } from './question25-knowledge'

const QUESTION_33_VOICE_ROOT = '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices'
const QUESTION_33_COMMON_VOICE_ROOT = `${QUESTION_33_VOICE_ROOT}/common`
const QUESTION_33_FRUIT_VOICE_ROOT = `${QUESTION_33_VOICE_ROOT}/fruits`

export const QUESTION_33_PROMPT = 'Điền chữ cái thích hợp vào chỗ trống.'
export const QUESTION_33_LEGACY_PROMPT = 'Chọn đáp án thích hợp điền vào chỗ trống.'
export const QUESTION_33_TASK_START = 'Bạn nhỏ hái quả '
export const QUESTION_33_PROMPT_VOICE = `${QUESTION_33_COMMON_VOICE_ROOT}/dien-chu-cai-thich-hop-vao-cho-trong.mp3`
export const QUESTION_33_LEGACY_PROMPT_VOICE = `${QUESTION_33_COMMON_VOICE_ROOT}/chon-dap-an-thich-hop-dien-vao-cho-trong.mp3`
export const QUESTION_33_GIRL_SPRITE_SHEET = '/games/lessons/lop-1/tieng-viet/trang-nguyen/images/girl-sheet.webp'
export const QUESTION_33_LETTERS = ['t', 'o', 'a', 'n', 'u', 'v'] as const
export const QUESTION_33_FRUIT_IDS: readonly AnimatedQuestion33FruitId[] = ['tao', 'cam', 'xoai', 'le']

export const QUESTION_33_TARGET_POSITIONS = [
  { x: 14, y: 45 },
  { x: 27, y: 31 },
  { x: 40, y: 42 },
  { x: 53, y: 28 },
  { x: 66, y: 40 },
  { x: 79, y: 31 },
] as const

const FRUIT_VOICE_FILES: Record<AnimatedQuestion33FruitId, string> = {
  tao: 'tao.mp3', cam: 'cam.mp3', xoai: 'xoai.mp3', le: 'le.mp3',
}

export function getQuestion33FruitPool(): Question25WordKnowledgeItem[] {
  return QUESTION_25_FRUIT_ITEMS
}

const QUESTION_25_FRUIT_ITEMS = QUESTION_25_WORDS.filter((item): item is Question25WordKnowledgeItem & { id: AnimatedQuestion33FruitId } =>
  item.category === 'fruit' && QUESTION_33_FRUIT_IDS.includes(item.id as AnimatedQuestion33FruitId),
)

export function getQuestion33FruitVisual(item: Question25WordKnowledgeItem) {
  return getQuestion25Visual(item)
}

export function getQuestion33Voice(fruitId: AnimatedQuestion33FruitId, useHarvestNarration = true): string[] {
  return [
    `${QUESTION_33_COMMON_VOICE_ROOT}/${useHarvestNarration ? 'ban-nho-hai-qua' : 'qua'}.mp3`,
    `${QUESTION_33_FRUIT_VOICE_ROOT}/${FRUIT_VOICE_FILES[fruitId]}`,
    `${QUESTION_33_COMMON_VOICE_ROOT}/co-chu-gi.mp3`,
  ]
}

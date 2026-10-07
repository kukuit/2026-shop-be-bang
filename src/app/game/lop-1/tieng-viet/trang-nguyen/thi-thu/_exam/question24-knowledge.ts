import flowerNameManifest from '@/../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/flower-name.manifest.json'
import { QUESTION_25_WORDS, getQuestion25Sprite } from './question25-knowledge'
import type { AnimatedQuestion24Motion, AnimatedQuestion24TargetMode, ExamVisual } from './types'

const QUESTION_24_VOICE_ROOT = '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common'
const QUESTION_24_ANIMAL_VOICE_ROOT = '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/animals'

export const QUESTION_24_PROMPT = 'Chọn đáp án thích hợp điền vào chỗ trống.'
export const QUESTION_24_PROMPT_VOICE = `${QUESTION_24_VOICE_ROOT}/chon-dap-an-thich-hop-dien-vao-cho-trong.mp3`
export const QUESTION_24_LEARNING_KEY = 'FOLLOW_ANIMATION_FIND_LETTER'

const QUESTION_24_ACTOR_VOICE_FILES: Record<string, string> = {
  'bò': 'bo', 'cò': 'co', 'dơi': 'doi', 'đà điểu': 'da-dieu', 've': 've',
  'dê': 'de', 'gà': 'ga', 'hổ': 'ho', 'chim': 'chim', 'kỳ đà': 'ky-da',
  'lợn': 'lon', 'mèo': 'meo', 'nai': 'nai', 'ong': 'ong', 'ốc': 'oc',
  'hươu': 'huou', 'bọ cạp': 'bo-cap', 'quạ': 'qua', 'rùa': 'rua', 'sóc': 'soc',
  'thỏ': 'tho', 'cú': 'cu', 'sư tử': 'su-tu', 'voi': 'voi', 'xén tóc': 'xen-toc', 'yến': 'yen',
}

const QUESTION_24_MOTION_VOICE_FILES: Record<AnimatedQuestion24Motion, string> = {
  fly: 'bay-den.mp3', run: 'chay-den.mp3', jump: 'nhay-den.mp3', walk: 'di-den.mp3',
}

export const QUESTION_24_ACTOR_WORDS_BY_MOTION: Record<AnimatedQuestion24Motion, readonly string[]> = {
  fly: ['ong', 'chim', 'yến', 'cò', 'dơi', 'quạ', 'cú', 've', 'xén tóc'],
  run: ['bò', 'thỏ', 'mèo', 'hươu', 'dê', 'gà', 'hổ', 'lợn', 'nai', 'sóc', 'sư tử', 'voi'],
  jump: ['thỏ', 'sóc', 'mèo'],
  walk: ['bò', 'đà điểu', 'hươu', 'kỳ đà', 'lợn', 'ốc', 'rùa', 'sư tử', 'voi', 'nai'],
}

export function getQuestion24ActorPool(motion: AnimatedQuestion24Motion) {
  return QUESTION_25_WORDS.filter(item => item.category === 'animal'
    && QUESTION_24_ACTOR_WORDS_BY_MOTION[motion].includes(item.word)
    && Boolean(QUESTION_24_ACTOR_VOICE_FILES[item.word])
    && Boolean(getQuestion25Sprite('animal', item.imageId)))
}

export function getQuestion24TargetPool(targetMode: AnimatedQuestion24TargetMode) {
  if (targetMode === 'flower') return flowerNameManifest.items
    .filter(item => Boolean(getQuestion25Sprite('flower', item.id)))
    .map(item => ({ id: item.id, imageId: item.id, word: item.word }))
  return QUESTION_25_WORDS.filter(item => item.category === targetMode
    && Boolean(getQuestion25Sprite(targetMode, item.imageId)))
}

export function getQuestion24Visual(manifestId: 'animal' | 'flower' | 'fruit', imageId: string, label: string): ExamVisual | undefined {
  const sprite = getQuestion25Sprite(manifestId, imageId)
  if (!sprite) return undefined
  return { type: 'image', value: sprite.spriteSheet, label, sprite }
}

export function getQuestion24Voice(
  actorWord: string,
  motion: AnimatedQuestion24Motion,
  targetMode: AnimatedQuestion24TargetMode,
): readonly string[] {
  const actorVoiceName = QUESTION_24_ACTOR_VOICE_FILES[actorWord]
  if (!actorVoiceName) return []
  return [
    `${QUESTION_24_ANIMAL_VOICE_ROOT}/${actorVoiceName}.mp3`,
    `${QUESTION_24_VOICE_ROOT}/${QUESTION_24_MOTION_VOICE_FILES[motion]}`,
    `${QUESTION_24_VOICE_ROOT}/${targetMode === 'flower' ? 'hoa.mp3' : 'qua.mp3'}`,
    `${QUESTION_24_VOICE_ROOT}/co-chu-gi.mp3`,
  ]
}

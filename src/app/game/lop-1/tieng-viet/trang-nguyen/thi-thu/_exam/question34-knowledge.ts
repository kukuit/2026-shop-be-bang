import { getQuestion24Visual } from './question24-knowledge'
import { shuffle } from './shuffle'
import type { ExamVisual } from './types'

const QUESTION_34_VOICE_ROOT = '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices'

export const QUESTION_34_PROMPT = 'Điền chữ cái thích hợp vào chỗ trống.'
export const QUESTION_34_PROMPT_VOICE = `${QUESTION_34_VOICE_ROOT}/common/dien-chu-cai-thich-hop-vao-cho-trong.mp3`
export const QUESTION_34_BAN_VOICE = `${QUESTION_34_VOICE_ROOT}/common/ban.mp3`
export const QUESTION_34_FLOWER_QUESTION_VOICE = `${QUESTION_34_VOICE_ROOT}/common/dau-tren-bong-hoa-co-chu-gi.mp3`

type Question34Animal = {
  id: 'chim-se' | 'ong' | 'qua' | 'en'
  label: string
  imageId: string
  voice: string
  visual: ExamVisual
}

const ANIMALS: Array<Omit<Question34Animal, 'visual'>> = [
  { id: 'chim-se', label: 'chim sẻ', imageId: 'i', voice: `${QUESTION_34_VOICE_ROOT}/animals/chim.mp3` },
  { id: 'ong', label: 'ong', imageId: 'o', voice: `${QUESTION_34_VOICE_ROOT}/animals/ong.mp3` },
  { id: 'qua', label: 'quạ', imageId: 'q', voice: `${QUESTION_34_VOICE_ROOT}/animals/qua.mp3` },
  { id: 'en', label: 'én', imageId: 'y', voice: `${QUESTION_34_VOICE_ROOT}/animals/yen.mp3` },
]

export const QUESTION_34_ANIMALS: readonly Question34Animal[] = ANIMALS.map(animal => ({
  ...animal,
  visual: getQuestion24Visual('animal', animal.imageId, animal.label)!,
}))

export const QUESTION_34_LETTER_POOL = ['a', 'e', 'i', 'o', 'u', 'm', 'n', 't', 'c', 'b'] as const

export type Question34TestRound = {
  id: string
  flowers: Array<{ id: string; letter: string }>
  animals: Array<Question34Animal & { flowerIndex: number }>
}

export function generateQuestion34TestRound(args: { seedHash: string; random: () => number }): Question34TestRound {
  const letters = shuffle(QUESTION_34_LETTER_POOL, args.random).slice(0, 3)
  const animals = shuffle(QUESTION_34_ANIMALS, args.random).slice(0, 2)
  const flowerIndexes = shuffle([0, 1, 2], args.random).slice(0, 2)

  return {
    id: `t34-${args.seedHash}`,
    flowers: letters.map((letter, index) => ({ id: `flower-${index + 1}`, letter })),
    animals: animals.map((animal, index) => ({ ...animal, flowerIndex: flowerIndexes[index]! })),
  }
}

import { TOAN_1_BAI_1_LEARNING_KEYS } from '@/app/game/lop-1/toan/bai-1/lesson'
import type { LearningKey } from './types'

export type RecognizedNumber = 0 | 1 | 2 | 3 | 4 | 5

export function getRecognizeNumberKey(value: number): LearningKey {
  if (!Number.isInteger(value) || value < 0 || value > 5) {
    throw new RangeError(`Learning key only supports integers from 0 to 5; received ${value}`)
  }
  return TOAN_1_BAI_1_LEARNING_KEYS[`RECOGNIZE_NUMBER_${value}` as keyof typeof TOAN_1_BAI_1_LEARNING_KEYS]
}

export function getMappedLearningKey(
  mapping: Readonly<Record<number, LearningKey>>,
  value: number,
): LearningKey {
  const key = mapping[value]
  if (!key) throw new RangeError(`No learning key is configured for answer ${value}`)
  return key
}

import { TOAN_1_BAI_2_LEARNING_KEYS as K } from '@/app/game/lop-1/toan/bai-2/lesson'
import { buildAdaptiveQuestions } from '../../general/adaptive'
import { GAME_IDS, LESSON_IDS, type LearningKey } from '../../general/tracking'
import type { RacingGameConfig, RacingQuestion } from '../types'

const keyFor = (value: number): LearningKey => ({ 6: K.RECOGNIZE_NUMBER_6, 7: K.RECOGNIZE_NUMBER_7, 8: K.RECOGNIZE_NUMBER_8, 9: K.RECOGNIZE_NUMBER_9, 10: K.RECOGNIZE_NUMBER_10 } as Record<number, LearningKey>)[value]
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const shuffle = <T,>(items: readonly T[]) => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1)); [result[index], result[swap]] = [result[swap], result[index]]
  }
  return result
}
const opts = (answer: number) => shuffle(Array.from(new Set([answer - 1, answer, answer + 1, answer - 2, answer + 2].filter((value) => value >= 0 && value <= 10)))).slice(0, 3)
const count = (value: number, index: number): RacingQuestion => ({ id: `b2-count-${index}`, type: 'count', object: shuffle(['🐝', '⭐', '🍎', '🐟', '🌸'])[0], quantity: value, options: opts(value), answer: value, skill: 'recognize_quantity', learningKey: keyFor(value) })
const forward = (answer: number, index: number): RacingQuestion => ({ id: `b2-forward-${index}`, type: 'missingNumber', sequence: [answer - 1, null, answer + 1], options: opts(answer), answer, skill: 'missing_number', learningKey: K.SEQUENCE_FORWARD })
const backward = (answer: number, index: number): RacingQuestion => ({ id: `b2-backward-${index}`, type: 'missingNumber', sequence: [answer + 1, null, answer - 1], options: opts(answer), answer, skill: 'missing_number', learningKey: K.SEQUENCE_BACKWARD })
const quantity = (value: number, index: number): RacingQuestion => ({ id: `b2-quantity-${index}`, type: 'numberToQuantity', number: value, object: '🐟', quantities: opts(value), answer: value, skill: 'number_to_quantity', learningKey: K.NUMBER_TO_QUANTITY })
const attribute = (value: number, index: number): RacingQuestion => ({ id: `b2-attribute-${index}`, type: 'attributeCount', prompt: 'Có bao nhiêu con ong?', object: '🐝', quantity: value, options: opts(value), answer: value, skill: 'attribute_count', learningKey: K.COUNT_BY_ATTRIBUTE })

const randomQuestions = (): RacingQuestion[] => shuffle([
  ...shuffle([6, 7, 8, 9, 10]).map(count),
  quantity(randomInt(6, 10), 5), forward(randomInt(2, 9), 6), backward(randomInt(2, 9), 7),
  attribute(randomInt(6, 10), 8), shuffle([quantity(randomInt(6, 10), 9), forward(randomInt(2, 9), 9), backward(randomInt(2, 9), 9)])[0],
])
const supported = [keyFor(6), keyFor(7), keyFor(8), keyFor(9), keyFor(10), K.NUMBER_TO_QUANTITY, K.SEQUENCE_FORWARD, K.SEQUENCE_BACKWARD, K.COUNT_BY_ATTRIBUTE]
const forTarget = (target: LearningKey, index: number): RacingQuestion => {
  const number = [6, 7, 8, 9, 10].find((value) => keyFor(value) === target)
  if (number) return count(number, index)
  if (target === K.NUMBER_TO_QUANTITY) return quantity(randomInt(6, 10), index)
  if (target === K.SEQUENCE_BACKWARD) return backward(randomInt(2, 9), index)
  if (target === K.COUNT_BY_ATTRIBUTE) return attribute(randomInt(6, 10), index)
  return forward(randomInt(2, 9), index)
}

export const TOAN_1_BAI_2_RACING_CONFIG: RacingGameConfig = {
  lessonId: LESSON_IDS.TOAN_1_BAI_2, gameId: GAME_IDS.RACING, totalRounds: 10,
  answerDomain: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], supportedTargets: supported,
  loadQuestions: () => {
    const random = randomQuestions()
    return buildAdaptiveQuestions({ lessonId: LESSON_IDS.TOAN_1_BAI_2, gameId: GAME_IDS.RACING, supportedTargets: supported, totalRounds: 10, generateRandomQuestion: (index) => random[index], generateQuestionForTarget: forTarget })
  },
}

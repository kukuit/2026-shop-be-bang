import { buildAdaptiveQuestions } from '@/components/games/general/adaptive'
import { GAME_IDS, LESSON_IDS, type LearningKey } from '@/components/games/general/tracking'
import type { BubbleShooterGameConfig, MathQuestion } from '@/components/games/bubble-shooter/types/game'
import { TOAN_1_BAI_2_LEARNING_KEYS as KEYS } from '../lesson'

const TOTAL_ROUNDS = 10
const RECOGNIZE = {
  6: KEYS.RECOGNIZE_NUMBER_6, 7: KEYS.RECOGNIZE_NUMBER_7, 8: KEYS.RECOGNIZE_NUMBER_8,
  9: KEYS.RECOGNIZE_NUMBER_9, 10: KEYS.RECOGNIZE_NUMBER_10,
} as const
const SUPPORTED = [...Object.values(RECOGNIZE), KEYS.SEQUENCE_FORWARD, KEYS.SEQUENCE_BACKWARD, KEYS.COMPLETE_QUANTITY] as LearningKey[]
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const shuffle = <T,>(items: readonly T[]) => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1)); [result[index], result[swap]] = [result[swap], result[index]]
  }
  return result
}

const optionsAround = (answer: number) => {
  const values = new Set([answer])
  for (let distance = 1; values.size < 6; distance += 1) {
    if (answer - distance >= 0) values.add(answer - distance)
    if (values.size < 6 && answer + distance <= 10) values.add(answer + distance)
  }
  return shuffle(Array.from(values))
}

const questionFor = (target: LearningKey, index: number): MathQuestion => {
  const recognized = Object.entries(RECOGNIZE).find(([, key]) => key === target)
  if (recognized) {
    const answer = Number(recognized[0])
    return { text: `Có ${answer} đồ vật. Chọn số đúng`, answer, options: optionsAround(answer), learningKey: target }
  }
  if (target === KEYS.SEQUENCE_BACKWARD) {
    const answer = randomInt(1, 9)
    return { text: `${answer + 1} → ? → ${answer - 1}`, answer, options: optionsAround(answer), learningKey: target }
  }
  if (target === KEYS.COMPLETE_QUANTITY) {
    const goal = randomInt(6, 10)
    const current = randomInt(1, goal - 1)
    const answer = goal - current
    return { text: `Có ${current}, thêm mấy để đủ ${goal}?`, answer, options: optionsAround(answer), learningKey: target }
  }
  const answer = randomInt(1, 9)
  return { text: `${answer - 1} → ? → ${answer + 1}`, answer, options: optionsAround(answer), learningKey: KEYS.SEQUENCE_FORWARD }
}

const createRandomQuestions = () => {
  const targets = [
    KEYS.RECOGNIZE_NUMBER_6, KEYS.RECOGNIZE_NUMBER_7, KEYS.RECOGNIZE_NUMBER_8,
    KEYS.RECOGNIZE_NUMBER_9, KEYS.RECOGNIZE_NUMBER_10, KEYS.SEQUENCE_FORWARD,
    KEYS.SEQUENCE_BACKWARD, KEYS.COMPLETE_QUANTITY, KEYS.SEQUENCE_FORWARD, KEYS.COMPLETE_QUANTITY,
  ] as LearningKey[]
  return shuffle(targets).map(questionFor)
}

export const TOAN_1_BAI_2_BUBBLE_SHOOTER_CONFIG: BubbleShooterGameConfig = {
  id: 'toan-1-bai-2-bubble-shooter', title: 'Bắn bong bóng các số 6 đến 10', totalRounds: TOTAL_ROUNDS,
  tracking: { lessonId: LESSON_IDS.TOAN_1_BAI_2, gameId: GAME_IDS.BUBBLE_SHOOTER },
  loadQuestions: () => {
    const random = createRandomQuestions()
    return buildAdaptiveQuestions({
      lessonId: LESSON_IDS.TOAN_1_BAI_2, gameId: GAME_IDS.BUBBLE_SHOOTER,
      supportedTargets: SUPPORTED, totalRounds: TOTAL_ROUNDS,
      generateRandomQuestion: (index) => random[index],
      generateQuestionForTarget: questionFor,
    })
  },
}

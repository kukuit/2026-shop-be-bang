import { TOAN_1_BAI_2_LEARNING_KEYS as KEYS } from '@/app/game/lop-1/toan/bai-2/lesson'
import { buildAdaptiveQuestions } from '../../general/adaptive'
import { GAME_IDS, LESSON_IDS, type LearningKey } from '../../general/tracking'
import type { GoldMinerGameConfig, GoldMinerQuestion, TaskObject } from '../types'

const VALUES = [6, 7, 8, 9, 10] as const
const OBJECTS: TaskObject[] = ['apple', 'chicken', 'fish', 'star', 'flower', 'ball', 'butterfly']
const KEY_BY_VALUE: Record<number, LearningKey> = {
  6: KEYS.RECOGNIZE_NUMBER_6, 7: KEYS.RECOGNIZE_NUMBER_7, 8: KEYS.RECOGNIZE_NUMBER_8,
  9: KEYS.RECOGNIZE_NUMBER_9, 10: KEYS.RECOGNIZE_NUMBER_10,
}
const SUPPORTED = VALUES.map((value) => KEY_BY_VALUE[value])
const shuffle = <T,>(items: readonly T[]) => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1)); [result[index], result[swap]] = [result[swap], result[index]]
  }
  return result
}

const createQuestion = (count: number, index: number): GoldMinerQuestion => {
  const distractors = Array.from({ length: 11 }, (_, value) => value).filter((value) => value !== count)
  const choiceCount = 3 + Math.floor(Math.random() * 5)
  const choices = [count, ...shuffle(distractors).slice(0, choiceCount - 1)]
  return {
    id: `bai-2-round-${index + 1}`, objectType: OBJECTS[Math.floor(Math.random() * OBJECTS.length)], count,
    correctAnswer: count, choices: shuffle(choices), learningKey: KEY_BY_VALUE[count],
  }
}

const createRandom = () => shuffle([...VALUES, ...VALUES]).map(createQuestion)
const createForTarget = (target: LearningKey, index: number) => {
  const value = VALUES.find((candidate) => KEY_BY_VALUE[candidate] === target) ?? VALUES[index % VALUES.length]
  return createQuestion(value, index)
}

export const TOAN_1_BAI_2_GOLD_MINER_CONFIG: GoldMinerGameConfig = {
  lessonId: LESSON_IDS.TOAN_1_BAI_2, gameId: GAME_IDS.GOLD_MINING, totalRounds: 10,
  answerDomain: VALUES, supportedTargets: SUPPORTED,
  loadQuestions: () => {
    const random = createRandom()
    return buildAdaptiveQuestions({
      lessonId: LESSON_IDS.TOAN_1_BAI_2, gameId: GAME_IDS.GOLD_MINING,
      supportedTargets: SUPPORTED, totalRounds: 10,
      generateRandomQuestion: (index) => random[index], generateQuestionForTarget: createForTarget,
    })
  },
}

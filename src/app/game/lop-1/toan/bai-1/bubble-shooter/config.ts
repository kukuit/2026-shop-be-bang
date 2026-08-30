import { buildAdaptiveQuestions } from '@/components/games/general/adaptive'
import {
  GAME_IDS,
  getRecognizeNumberKey,
  LESSON_IDS,
  type LearningKey,
} from '@/components/games/general/tracking'
import type {
  BubbleShooterGameConfig,
  MathQuestion,
} from '@/components/games/bubble-shooter/types/game'

const VALUES = [0, 1, 2, 3, 4, 5] as const
const TOTAL_ROUNDS = 10

const shuffle = <T,>(items: readonly T[]) => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

const createQuestion = (answer: number): MathQuestion => ({
  text: `${answer}`,
  answer,
  options: shuffle(VALUES),
  learningKey: getRecognizeNumberKey(answer),
})

const createRandomQuestions = () => {
  const firstSix = shuffle(VALUES)
  return Array.from({ length: TOTAL_ROUNDS }, (_, index) =>
    createQuestion(firstSix[index] ?? VALUES[Math.floor(Math.random() * VALUES.length)]))
}

const createQuestionForTarget = (targetId: LearningKey) => {
  const answer = VALUES.find((value) => getRecognizeNumberKey(value) === targetId) ?? 0
  return createQuestion(answer)
}

export const TOAN_1_BAI_1_BUBBLE_SHOOTER_CONFIG: BubbleShooterGameConfig = {
  id: 'toan-1-bai-1-bubble-shooter',
  title: 'Bắn bong bóng số từ 0 đến 5',
  totalRounds: TOTAL_ROUNDS,
  tracking: {
    lessonId: LESSON_IDS.TOAN_1_BAI_1,
    gameId: GAME_IDS.BUBBLE_SHOOTER,
  },
  introVoice: '/games/lessons/lop-1/toan/bai-1/bubble-shooter/voices/intro.mp3',
  loadQuestions: () => {
    const randomQuestions = createRandomQuestions()
    return buildAdaptiveQuestions({
      lessonId: LESSON_IDS.TOAN_1_BAI_1,
      gameId: GAME_IDS.BUBBLE_SHOOTER,
      supportedTargets: VALUES.map(getRecognizeNumberKey),
      totalRounds: TOTAL_ROUNDS,
      generateRandomQuestion: (index) => randomQuestions[index],
      generateQuestionForTarget: (targetId) => createQuestionForTarget(targetId),
    })
  },
}

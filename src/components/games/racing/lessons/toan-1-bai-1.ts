import { buildAdaptiveQuestions } from '../../general/adaptive'
import { GAME_IDS, getRecognizeNumberKey, LESSON_IDS, type LearningKey } from '../../general/tracking'
import type { RacingGameConfig, RacingQuestion } from '../types'

const values = [0, 1, 2, 3, 4, 5]
export const RACING_SUPPORTED_TARGETS = values.map(getRecognizeNumberKey)
const withMeta = <T extends { answer: number }>(question: T, index: number): RacingQuestion => ({ ...question, id: `bai-1-${index}`, learningKey: getRecognizeNumberKey(question.answer) } as unknown as RacingQuestion)
const shuffle = <T,>(items: readonly T[]) => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1)); [result[index], result[swap]] = [result[swap], result[index]]
  }
  return result
}
const optionsFor = (answer: number) => shuffle([answer, ...shuffle(values.filter((value) => value !== answer)).slice(0, 2)])

export const createRacingQuestions = (): RacingQuestion[] => {
  const answers = shuffle(values)
  while (answers.length < 10) answers.push(Math.floor(Math.random() * 6))
  return shuffle(answers).map((answer, index) => {
    const type = index < 6 ? ['count', 'numberToQuantity', 'missingNumber'][index % 3] : shuffle(['count', 'numberToQuantity', 'missingNumber'])[0]
    if (type === 'numberToQuantity') return withMeta({ type, number: answer, object: shuffle(['🐟', '🌸', '⭐'])[0], quantities: optionsFor(answer), answer, skill: 'number_to_quantity' }, index)
    if (type === 'missingNumber') {
      const sequence = answer === 0 ? [null, 1, 2] : answer === 5 ? [3, 4, null] : [answer - 1, null, answer + 1]
      return withMeta({ type, sequence, options: optionsFor(answer), answer, skill: 'missing_number' }, index)
    }
    return withMeta({ type: 'count', object: shuffle(['🍎', '🐟', '⭐', '🐥', '🍓'])[0], quantity: answer, options: optionsFor(answer), answer, skill: answer === 0 ? 'recognize_zero' : 'recognize_quantity' }, index)
  })
}

export function createRacingQuestionForTarget(target: LearningKey, index: number): RacingQuestion {
  const answer = RACING_SUPPORTED_TARGETS.indexOf(target)
  const value = answer < 0 ? index % 6 : answer
  return withMeta({ type: 'count', object: shuffle(['⭐', '🍎', '🐟'])[0], quantity: value, options: optionsFor(value), answer: value, skill: value === 0 ? 'recognize_zero' : 'recognize_quantity' }, index)
}

export const TOAN_1_BAI_1_RACING_CONFIG: RacingGameConfig = {
  lessonId: LESSON_IDS.TOAN_1_BAI_1, gameId: GAME_IDS.RACING, totalRounds: 10,
  answerDomain: values, supportedTargets: RACING_SUPPORTED_TARGETS,
  introVoice: '/games/lessons/lop-1/toan/bai-1/racing/voices/intro.mp3',
  loadQuestions: () => {
    const random = createRacingQuestions()
    return buildAdaptiveQuestions({ lessonId: LESSON_IDS.TOAN_1_BAI_1, gameId: GAME_IDS.RACING, supportedTargets: RACING_SUPPORTED_TARGETS, totalRounds: 10, generateRandomQuestion: (index) => random[index], generateQuestionForTarget: createRacingQuestionForTarget })
  },
}

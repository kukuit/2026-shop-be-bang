import type { GoldMinerQuestion, TaskObject } from './types'
import type { LearningKey } from '../general/tracking'
import { getRecognizeNumberKey } from '../general/tracking'

const objects: TaskObject[] = ['apple', 'chicken', 'cow', 'fish', 'star', 'flower', 'ball', 'butterfly']
const counts = [3, 4, 2, 5, 1, 4, 5, 3, 2, 4]
const choiceCounts = [2, 2, 4, 4, 5, 5, 6, 6, 7, 7]

export const GOLD_MINER_LEVELS: GoldMinerQuestion[] = counts.map((count, index) => {
  const size = choiceCounts[index]
  const candidates = [0, 1, 2, 3, 4, 5].filter((value) => value !== count)
  const distractors = Array.from({ length: size - 1 }, (_, offset) => candidates[(index + offset * 2) % candidates.length])
  const choices = [count, ...distractors]
  const shift = (index * 2 + 1) % choices.length
  return {
    id: `round-${index + 1}`,
    objectType: objects[index % objects.length],
    count,
    correctAnswer: count,
    choices: [...choices.slice(shift), ...choices.slice(0, shift)],
    learningKey: getRecognizeNumberKey(count),
  }
})

export const GOLD_MINER_SUPPORTED_TARGETS = [0, 1, 2, 3, 4, 5].map(getRecognizeNumberKey)

const shuffle = <T,>(items: readonly T[]) => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1)); [result[index], result[swap]] = [result[swap], result[index]]
  }
  return result
}

/** Generates ten fresh rounds while guaranteeing that every value 0–5 is assessed. */
export function createRandomizedGoldMinerQuestions(): GoldMinerQuestion[] {
  const values = shuffle([0, 1, 2, 3, 4, 5])
  while (values.length < 10) values.push(Math.floor(Math.random() * 6))
  return shuffle(values).map((count, index) => {
    const choiceCount = Math.min(6, 3 + Math.floor(index / 2))
    const distractors = shuffle([0, 1, 2, 3, 4, 5].filter((value) => value !== count)).slice(0, choiceCount - 1)
    return {
      id: `random-round-${index + 1}`,
      objectType: objects[Math.floor(Math.random() * objects.length)],
      count,
      correctAnswer: count,
      choices: shuffle([count, ...distractors]),
      learningKey: getRecognizeNumberKey(count),
    }
  })
}

export function createGoldMinerQuestionForTarget(targetId: LearningKey, index: number): GoldMinerQuestion {
  const count = GOLD_MINER_SUPPORTED_TARGETS.indexOf(targetId)
  const template = GOLD_MINER_LEVELS[index % GOLD_MINER_LEVELS.length]
  if (count < 0) return { ...template, choices: [...template.choices] }
  const distractors = [0, 1, 2, 3, 4, 5].filter((value) => value !== count)
  return { ...template, count, correctAnswer: count, choices: [count, ...distractors].slice(0, template.choices.length), learningKey: targetId }
}

export const TASK_EMOJI: Record<TaskObject, string> = {
  apple: '🍎', chicken: '🐔', cow: '🐮', fish: '🐟',
  star: '⭐', flower: '🌸', ball: '⚽', butterfly: '🦋',
}

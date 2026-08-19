import type { GoldMinerQuestion, TaskObject } from './types'

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
  }
})

export const TASK_EMOJI: Record<TaskObject, string> = {
  apple: '🍎', chicken: '🐔', cow: '🐮', fish: '🐟',
  star: '⭐', flower: '🌸', ball: '⚽', butterfly: '🦋',
}

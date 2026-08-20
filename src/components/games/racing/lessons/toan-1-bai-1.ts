import type { RacingQuestion } from '../types'

export const createRacingQuestions = (): RacingQuestion[] => {
  const finals: RacingQuestion[] = [
    { type: 'count', object: '⚽', quantity: 2, options: [1, 2, 3], answer: 2, skill: 'recognize_quantity' },
    { type: 'numberToQuantity', number: 5, object: '🌸', quantities: [3, 4, 5], answer: 5, skill: 'number_to_quantity' },
    { type: 'missingNumber', sequence: [1, 2, 3, 4, null], options: [3, 4, 5], answer: 5, skill: 'missing_number' },
  ]
  return [
    { type: 'count', object: '🍎', quantity: 1, options: [0, 1, 2], answer: 1, skill: 'recognize_quantity' },
    { type: 'count', object: '🐟', quantity: 2, options: [1, 2, 3], answer: 2, skill: 'recognize_quantity' },
    { type: 'count', object: '⭐', quantity: 3, options: [2, 3, 4], answer: 3, skill: 'recognize_quantity' },
    { type: 'count', object: '🐥', quantity: 4, options: [3, 4, 5], answer: 4, skill: 'recognize_quantity' },
    { type: 'count', object: '🍓', quantity: 5, options: [3, 4, 5], answer: 5, skill: 'recognize_quantity' },
    { type: 'count', object: '🧺', quantity: 0, options: [0, 1, 2], answer: 0, skill: 'recognize_zero' },
    { type: 'numberToQuantity', number: 4, object: '🐟', quantities: [3, 4, 5], answer: 4, skill: 'number_to_quantity' },
    { type: 'missingNumber', sequence: [0, 1, null, 3], options: [1, 2, 4], answer: 2, skill: 'missing_number' },
    { type: 'missingNumber', sequence: [2, 3, 4, null], options: [3, 4, 5], answer: 5, skill: 'missing_number' },
    finals[Math.floor(Math.random() * finals.length)],
  ]
}

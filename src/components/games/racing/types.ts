export type Lane = 0 | 1 | 2

export type RacingQuestion =
  | { type: 'count'; object: string; quantity: number; options: number[]; answer: number; skill: 'recognize_quantity' | 'recognize_zero' }
  | { type: 'numberToQuantity'; number: number; object: string; quantities: number[]; answer: number; skill: 'number_to_quantity' }
  | { type: 'missingNumber'; sequence: Array<number | null>; options: number[]; answer: number; skill: 'missing_number' }

export enum RacingState {
  RUNNING = 'RUNNING',
  RESOLVING_CORRECT = 'RESOLVING_CORRECT',
  RESOLVING_WRONG = 'RESOLVING_WRONG',
  FINISHED = 'FINISHED',
}

export type RacingTrackingEvent = {
  game: 'racing'
  lesson: 'toan-1-bai-1-so-0-5'
  questionIndex: number
  skill: RacingQuestion['skill']
  target: number
  selectedAnswer: number
  correctAnswer: number
  isCorrect: boolean
  attempt: number
  responseTime: number
}

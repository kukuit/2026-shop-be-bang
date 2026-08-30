import type { GameLessonConfig } from '../general/lesson-config'
import type { LearningKey, LessonId } from '../general/tracking'

export type Lane = 0 | 1 | 2

type BaseQuestion = { id: string; learningKey: LearningKey; answer: number }
export type RacingQuestion =
  | BaseQuestion & { type: 'count'; object: string; quantity: number; options: number[]; skill: 'recognize_quantity' | 'recognize_zero' }
  | BaseQuestion & { type: 'numberToQuantity'; number: number; object: string; quantities: number[]; skill: 'number_to_quantity' }
  | BaseQuestion & { type: 'missingNumber'; sequence: Array<number | null>; options: number[]; skill: 'missing_number' }
  | BaseQuestion & { type: 'attributeCount'; prompt: string; object: string; quantity: number; options: number[]; skill: 'attribute_count' }

export type RacingGameConfig = GameLessonConfig<RacingQuestion>

export enum RacingState {
  RUNNING = 'RUNNING',
  RESOLVING_CORRECT = 'RESOLVING_CORRECT',
  RESOLVING_WRONG = 'RESOLVING_WRONG',
  FINISHED = 'FINISHED',
}

export type RacingTrackingEvent = {
  game: 'racing'
  lesson: LessonId
  questionIndex: number
  skill: RacingQuestion['skill']
  target: number
  selectedAnswer: number
  correctAnswer: number
  isCorrect: boolean
  attempt: number
  responseTime: number
}

import type { GameLessonConfig } from '../general/lesson-config'
import type { LearningKey, LessonId } from '../general/tracking'
import type { LearningSkill, QuestionAnswerMode, QuestionInputMode } from '../general/learning-question'

export type Lane = 0 | 1 | 2

type BaseQuestion = { id: string; learningKey: LearningKey; answer: string | number; learningSkill?: LearningSkill; inputMode?: QuestionInputMode; answerMode?: QuestionAnswerMode; instructionVoice?: string; voice?: string }
export type RacingQuestion =
  | BaseQuestion & { type: 'count'; object: string; quantity: number; options: number[]; skill: 'recognize_quantity' | 'recognize_zero' }
  | BaseQuestion & { type: 'numberToQuantity'; number: number; object: string; quantities: number[]; skill: 'number_to_quantity' }
  | BaseQuestion & { type: 'missingNumber'; sequence: Array<number | null>; options: number[]; skill: 'missing_number' }
  | BaseQuestion & { type: 'attributeCount'; prompt: string; object: string; quantity: number; options: number[]; skill: 'attribute_count' }
  | BaseQuestion & { type: 'generic'; prompt: string; options: Array<string | number>; skill: 'language_choice' }

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
  target: string | number
  selectedAnswer: string | number
  correctAnswer: string | number
  isCorrect: boolean
  attempt: number
  responseTime: number
}

import type { GameId, LearningKey, LessonId } from '../../general/tracking'
import type { LearningSkill, QuestionAnswerMode, QuestionInputMode } from '../../general/learning-question'

export interface MathQuestion {
  text: string
  answer: string | number
  options: Array<string | number>
  learningKey?: LearningKey
  id?: string
  skill?: LearningSkill
  inputMode?: QuestionInputMode
  answerMode?: QuestionAnswerMode
  instructionVoice?: string
  voice?: string
  images?: import('../../general/game-image').GameImages
  presentation?:
    | { type: 'completeQuantity'; startNumber: number; targetNumber: number }
    | { type: 'recognizeNumber'; number: number }
    | { type: 'fitToPanel' }
    | { type: 'generic'; prompt: string }
}

export interface BubbleShooterGameConfig {
  id: string
  title: string
  totalRounds: number
  loadQuestions: () => MathQuestion[] | Promise<MathQuestion[]>
  tracking?: {
    lessonId: LessonId
    gameId: GameId
  }
  introVoice?: string
  images?: import('../../general/game-image').GameImages
}

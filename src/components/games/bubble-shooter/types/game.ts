import type { GameId, LearningKey, LessonId } from '../../general/tracking'

export interface MathQuestion {
  text: string
  answer: number
  options: number[]
  learningKey?: LearningKey
  presentation?:
    | { type: 'completeQuantity'; startNumber: number; targetNumber: number }
    | { type: 'recognizeNumber'; number: number }
    | { type: 'fitToPanel' }
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
}

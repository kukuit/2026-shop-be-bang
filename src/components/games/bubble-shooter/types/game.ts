import type { GameId, LearningKey, LessonId } from '../../general/tracking'

export interface MathQuestion {
  text: string
  answer: number
  options: number[]
  learningKey?: LearningKey
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

import type { GAME_IDS } from './constants'
import type { LearningKey, LessonId } from './lesson-catalog'

export type GameId = (typeof GAME_IDS)[keyof typeof GAME_IDS]
export type { LearningKey, LessonId } from './lesson-catalog'

export type AnswerValue = string | number

export interface GameQuestionResult {
  learningKey: LearningKey
  correct: boolean
  expectedAnswer?: AnswerValue
  selectedAnswer?: AnswerValue
  responseTime?: number
  attempt: number
}

export interface CompletedGameSession {
  sessionId: string
  userId: string
  lessonId: LessonId
  gameId: GameId
  score: number
  totalQuestions: number
  correctCount: number
  wrongCount: number
  duration: number
  startedAt: number
  results: GameQuestionResult[]
}

export type LearningKeyProgress = {
  correct: number
  wrong: number
  attempts: number
  responseTime: number
}

export type LearningProgress = Record<LearningKey, LearningKeyProgress>

export interface GameTrackingRepository {
  saveSession(session: CompletedGameSession): Promise<{ sessionId: string }>
  getLearningProgress(userId: string, lessonId: LessonId): Promise<Partial<LearningProgress>>
}

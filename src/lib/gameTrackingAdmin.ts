import 'server-only'
import { getAdminDb } from './firebaseAdmin'

export type AdminSessionResult = {
  learningKey: string
  correct: boolean
  expectedAnswer?: string | number
  selectedAnswer?: string | number
  responseTime?: number
  attempt: number
}

export type AdminGameSession = {
  id: string
  userId: string
  lessonId: string
  gameId: string
  score: number
  totalQuestions: number
  correctCount: number
  wrongCount: number
  duration: number
  startedAt?: string
  completedAt?: string
  results: AdminSessionResult[]
}

export type AdminKeyProgress = {
  correct: number
  wrong: number
  attempts: number
  responseTime: number
  sessions: number
}

export type AdminLearningProgress = {
  id: string
  userId: string
  lessonId: string
  totalSessions: number
  updatedAt?: string
  keys: Record<string, AdminKeyProgress>
}

const trackingRoot = () => getAdminDb().collection('shopbebangcom').doc('game')

const dateValue = (value: unknown): string | undefined => {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate().toISOString()
  }
  return undefined
}

export async function getAdminGameSessions(maximum = 100): Promise<AdminGameSession[]> {
  const snapshot = await getAdminDb()
    .collectionGroup('sessions')
    .orderBy('completedAt', 'desc')
    .limit(maximum)
    .get()
  return snapshot.docs.map((document) => {
    const data = document.data()
    return {
      id: document.id,
      userId: String(data.userId ?? ''),
      lessonId: String(data.lessonId ?? ''),
      gameId: String(data.gameId ?? ''),
      score: Number(data.score ?? 0),
      totalQuestions: Number(data.totalQuestions ?? 0),
      correctCount: Number(data.correctCount ?? 0),
      wrongCount: Number(data.wrongCount ?? 0),
      duration: Number(data.duration ?? 0),
      startedAt: dateValue(data.startedAt),
      completedAt: dateValue(data.completedAt),
      results: Array.isArray(data.results) ? (data.results as AdminSessionResult[]) : [],
    }
  })
}

export async function getAdminLearningProgress(): Promise<AdminLearningProgress[]> {
  const snapshot = await trackingRoot().collection('learning_progress').get()
  return snapshot.docs.map((document) => {
    const data = document.data()
    return {
      id: document.id,
      userId: String(data.userId ?? ''),
      lessonId: String(data.lessonId ?? ''),
      totalSessions: Number(data.totalSessions ?? 0),
      updatedAt: dateValue(data.updatedAt),
      keys: (data.keys ?? {}) as Record<string, AdminKeyProgress>,
    }
  })
}

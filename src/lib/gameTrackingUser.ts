import 'server-only'
import { getAdminDb } from './firebaseAdmin'
import type {
  AdminGameSession,
  AdminKeyProgress,
  AdminLearningProgress,
  AdminSessionResult,
} from './gameTrackingAdmin'
import { userGameSessions } from './gameTrackingPaths'

const trackingRoot = () => getAdminDb().collection('shopbebangcom').doc('game')
const dateValue = (value: unknown): string | undefined => {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function')
    return value.toDate().toISOString()
  return undefined
}

export async function getUserGameData(userId: string) {
  const [sessionSnapshot, progressSnapshot] = await Promise.all([
    userGameSessions(userId).orderBy('completedAt', 'desc').limit(100).get(),
    trackingRoot().collection('learning_progress').where('userId', '==', userId).get(),
  ])
  const sessions: AdminGameSession[] = sessionSnapshot.docs.map((document) => {
    const data = document.data()
    return {
      id: document.id,
      userId,
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
  const progress: AdminLearningProgress[] = progressSnapshot.docs.map((document) => {
    const data = document.data()
    return {
      id: document.id,
      userId,
      lessonId: String(data.lessonId ?? ''),
      totalSessions: Number(data.totalSessions ?? 0),
      updatedAt: dateValue(data.updatedAt),
      keys: (data.keys ?? {}) as Record<string, AdminKeyProgress>,
    }
  })
  return { sessions, progress }
}

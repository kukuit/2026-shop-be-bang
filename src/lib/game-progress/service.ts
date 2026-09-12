import 'server-only'
import { FieldPath, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { getLessonDefinition } from '@/components/games/general/tracking/lesson-catalog'
import { userGameSessions } from '@/lib/gameTrackingPaths'
import type { AdminGameSession, AdminSessionResult } from '@/lib/gameTrackingAdmin'
import { SESSION_PAGE_SIZE, type SubjectId } from './config'
import { accuracyOf, buildSubjectProgress, sumCounts, type LegacyGoalCounts, type LessonGoalProgress, type SubjectProgress } from './model'
import { lessonGoalProgressRef, subjectProgressRef } from './paths'

export function dateString(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function')
    return value.toDate().toISOString()
  return null
}

export async function getSubjectProgress(userId: string, grade: number, subject: SubjectId) {
  const snapshot = await subjectProgressRef(userId, grade, subject).get()
  const stored = snapshot.data() as SubjectProgress | undefined
  return buildSubjectProgress(userId, grade, subject, stored?.lessons, dateString(stored?.updatedAt))
}

export async function getLessonGoalProgress(userId: string, lessonId: string): Promise<LessonGoalProgress> {
  const definition = getLessonDefinition(lessonId)
  const snapshot = await lessonGoalProgressRef(userId, lessonId).get()
  const keys = (snapshot.data()?.keys ?? {}) as Record<string, LegacyGoalCounts>
  const goals = (definition?.learningGoals ?? []).map(goal => {
    const counts = sumCounts([keys[goal.key] ?? {}])
    return { id: goal.key, title: goal.title, ...counts }
  })
  return { userId, lessonId, goals, ...sumCounts(goals) }
}

const cursorSchema = z.object({
  seconds: z.number().int().min(0).max(253402300799),
  nanoseconds: z.number().int().min(0).max(999999999),
  id: z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/),
}).strict()

export class InvalidCursorError extends Error {}
export function decodeSessionCursor(value?: string | null) {
  if (!value) return null
  try {
    if (value.length > 600 || !/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error()
    return cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
  } catch { throw new InvalidCursorError('Invalid session cursor') }
}

export type SessionSummary = Omit<AdminGameSession, 'results'> & { accuracy: number | null }
export type SessionPage = { items: SessionSummary[]; nextCursor: string | null }

function sessionSummary(id: string, userId: string, data: FirebaseFirestore.DocumentData): SessionSummary {
  const correctCount = Number(data.correctCount ?? 0)
  const totalQuestions = Number(data.totalQuestions ?? 0)
  return {
    id, userId, lessonId: String(data.lessonId ?? ''), gameId: String(data.gameId ?? ''),
    score: Number(data.score ?? 0), totalQuestions, correctCount,
    wrongCount: Number(data.wrongCount ?? 0), duration: Number(data.duration ?? 0),
    startedAt: dateString(data.startedAt) ?? undefined,
    completedAt: dateString(data.completedAt) ?? undefined,
    accuracy: accuracyOf(correctCount, totalQuestions),
  }
}

export async function getSessionPage(userId: string, cursor?: string | null): Promise<SessionPage> {
  const after = decodeSessionCursor(cursor)
  let query = userGameSessions(userId).orderBy('completedAt', 'desc').orderBy(FieldPath.documentId(), 'desc')
  if (after) query = query.startAfter(new Timestamp(after.seconds, after.nanoseconds), after.id)
  const snapshot = await query.limit(SESSION_PAGE_SIZE)
    .select('lessonId', 'gameId', 'score', 'totalQuestions', 'correctCount', 'wrongCount', 'duration', 'startedAt', 'completedAt').get()
  const last = snapshot.docs.at(-1)
  const timestamp = last?.data().completedAt as Timestamp | undefined
  const nextCursor = snapshot.size === SESSION_PAGE_SIZE && timestamp
    ? Buffer.from(JSON.stringify({ seconds: timestamp.seconds, nanoseconds: timestamp.nanoseconds, id: last!.id })).toString('base64url')
    : null
  return { items: snapshot.docs.map(doc => sessionSummary(doc.id, userId, doc.data())), nextCursor }
}

export async function getSessionDetail(userId: string, sessionId: string) {
  const snapshot = await userGameSessions(userId).doc(sessionId).get()
  if (!snapshot.exists) return null
  const data = snapshot.data()!
  return { ...sessionSummary(snapshot.id, userId, data),
    results: Array.isArray(data.results) ? data.results as AdminSessionResult[] : [],
  }
}

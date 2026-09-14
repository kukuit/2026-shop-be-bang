import 'server-only'
import { FieldPath, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { getLessonDefinition } from '@/components/games/general/tracking/lesson-catalog'
import { userGameSessions } from '@/lib/gameTrackingPaths'
import type { AdminGameSession, AdminSessionResult } from '@/lib/gameTrackingAdmin'
import { SESSION_PAGE_SIZE, getSubjectLessons, type SubjectId } from './config'
import { accuracyOf, buildSubjectProgress, summarizeLesson, recentGoalProgress, sumCounts, type LegacyGoalCounts, type LessonGoalProgress, type SubjectProgress } from './model'
import { lessonGoalProgressRef, subjectProgressRef } from './paths'
import { currentGoalAccuracy, type SubjectOverview } from './model'

export function dateString(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function')
    return value.toDate().toISOString()
  return null
}

export async function getSubjectProgress(userId: string, grade: number, subject: SubjectId, onGoals?: (lessonId: string, keys: Record<string, LegacyGoalCounts>) => void) {
  const snapshot = await subjectProgressRef(userId, grade, subject).get()
  const stored = snapshot.data() as SubjectProgress | undefined
  const lessons = { ...stored?.lessons }
  // Reconcile published lessons with authoritative legacy counters. This also
  // handles a new save that populated only part of an older account's history.
  await Promise.all(getSubjectLessons(grade, subject).filter(lesson => lesson.available).map(async lesson => {
    const legacy = (await lessonGoalProgressRef(userId, lesson.lessonId).get()).data()
    if (!legacy) return
    onGoals?.(lesson.lessonId, legacy.keys ?? {})
    const games: Record<string, { completedAt?: unknown }> = { ...legacy.games }
    if (sumCounts(Object.values(legacy.keys ?? {})).attempts > 0) {
      // One existence lookup per game, rather than counting every replay.
      await Promise.all(Array.from(new Set(lesson.games)).filter(gameId => !games[gameId]?.completedAt).map(async gameId => {
        const evidence = await userGameSessions(userId).where('lessonId', '==', lesson.lessonId)
          .where('gameId', '==', gameId).limit(1).select('completedAt').get()
        const completedAt = evidence.docs[0]?.data().completedAt
        if (completedAt) games[gameId] = { completedAt }
      }))
    }
    lessons[lesson.lessonId] = {
      ...summarizeLesson(lesson, legacy.keys ?? {}, games, dateString(legacy.updatedAt), lessons[lesson.lessonId]),
      completionKnown: Object.values(games).some(game => !!game.completedAt),
    }
  }))
  return buildSubjectProgress(userId, grade, subject, lessons, dateString(stored?.updatedAt))
}

// Reuse aggregate reads; only fetch recent answers for this subject's played lessons.
export async function getSubjectOverview(userId: string, grade: number, subject: SubjectId): Promise<SubjectOverview> {
  const lessonKeys = new Map<string, Record<string, LegacyGoalCounts>>()
  const progress = await getSubjectProgress(userId, grade, subject, (lessonId, keys) => { lessonKeys.set(lessonId, keys) })
  const goals = (await Promise.all(Array.from(lessonKeys, async ([lessonId, keys]) => {
    const answers = Object.values(keys).some(counts => (counts.correct ?? 0) + (counts.wrong ?? 0) > 0)
      ? await getRecentLessonAnswers(userId, lessonId) : {}
    return (getLessonDefinition(lessonId)?.learningGoals ?? []).flatMap(goal => {
      const assessment = currentGoalAccuracy(keys[goal.key] ?? {}, recentGoalProgress(answers[goal.key] ?? []).recent)
      return assessment.accuracy === null ? [] : [{ id: goal.key, title: goal.title, lessonId, accuracy: assessment.accuracy, source: assessment.source }]
    })
  }))).flat()
  goals.sort((a, b) => a.accuracy - b.accuracy || a.lessonId.localeCompare(b.lessonId) || a.title.localeCompare(b.title))
  const weakGoals = goals.slice(0, 3)
  return { ...progress, accuracy: accuracyOf(progress.correct, progress.correct + progress.wrong),
    hasGoalData: goals.length > 0, weakestGoal: weakGoals[0] ?? null, weakGoals }
}

// Shared window for overview and details, scoped to one owned lesson.
async function getRecentLessonAnswers(userId: string, lessonId: string) {
  const sessions = await userGameSessions(userId).where('lessonId', '==', lessonId).orderBy('completedAt', 'desc')
    .orderBy(FieldPath.documentId(), 'desc').limit(50)
    .select('lessonId', 'results').get()
  const answers: Record<string, boolean[]> = {}
  for (const document of sessions.docs) {
    const data = document.data()
    if (data.lessonId !== lessonId || !Array.isArray(data.results)) continue
    for (const result of [...data.results].reverse()) {
      if (typeof result.learningKey !== 'string' || typeof result.correct !== 'boolean') continue
      const values = answers[result.learningKey] ??= []
      if (values.length < 40) values.push(result.correct)
    }
  }
  return answers
}

export async function getLessonGoalProgress(userId: string, lessonId: string): Promise<LessonGoalProgress> {
  const definition = getLessonDefinition(lessonId)
  const snapshot = await lessonGoalProgressRef(userId, lessonId).get()
  const keys = (snapshot.data()?.keys ?? {}) as Record<string, LegacyGoalCounts>
  const answers = await getRecentLessonAnswers(userId, lessonId)
  const goals = (definition?.learningGoals ?? []).map(goal => {
    const counts = sumCounts([keys[goal.key] ?? {}])
    return { id: goal.key, title: goal.title, ...counts, ...recentGoalProgress(answers[goal.key] ?? []) }
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

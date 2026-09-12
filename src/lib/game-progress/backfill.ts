import 'server-only'
import { FieldPath, FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { userGameSessions } from '@/lib/gameTrackingPaths'
import { LESSON_CATALOG } from '@/components/games/general/tracking/lesson-catalog'
import type { AdminKeyProgress } from '@/lib/gameTrackingAdmin'
import { getSubjectLessons, type SubjectId } from './config'
import { buildSubjectProgress, summarizeLesson, type SubjectProgress } from './model'
import { lessonGoalProgressRef, subjectProgressRef } from './paths'
import { dateString } from './service'

type LegacyProgress = {
  keys: Record<string, AdminKeyProgress>
  games: Record<string, { completedAt?: unknown }>
  totalSessions: number
  updatedAt?: unknown
}

/** Explicit admin/dev backfill only. Never called by a page or a read API. */
export async function rebuildUserProgress(userId: string, apply = false) {
  const db = getAdminDb()
  const user = await db.collection('shopbebangcom').doc('users').collection('users').doc(userId).get()
  if (!user.exists) throw new Error('User does not exist')

  const history = new Map<string, LegacyProgress>()
  const knownLessons = new Set<string>(Object.keys(LESSON_CATALOG))
  let scannedSessions = 0
  let skippedSessions = 0
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined
  // Historical scans are restricted to this explicit migration, paged to avoid unbounded snapshots.
  while (true) {
    let query = userGameSessions(userId).orderBy(FieldPath.documentId()).limit(500)
    if (cursor) query = query.startAfter(cursor)
    const snapshot = await query.get()
    for (const document of snapshot.docs) {
      scannedSessions++
      const data = document.data()
      if (!knownLessons.has(data.lessonId) || !data.completedAt) { skippedSessions++; continue }
      const aggregate = history.get(data.lessonId) ?? { keys: {}, games: {}, totalSessions: 0 }
      const sessionKeys = new Set<string>()
      for (const result of Array.isArray(data.results) ? data.results : []) {
        if (typeof result.learningKey !== 'string' || typeof result.correct !== 'boolean') continue
        const key = aggregate.keys[result.learningKey] ?? { correct: 0, wrong: 0, attempts: 0, responseTime: 0, sessions: 0 }
        key.correct += result.correct ? 1 : 0
        key.wrong += result.correct ? 0 : 1
        key.attempts++
        key.responseTime += Number(result.responseTime ?? 0)
        if (!sessionKeys.has(result.learningKey)) key.sessions++
        sessionKeys.add(result.learningKey)
        aggregate.keys[result.learningKey] = key
      }
      const existingCompletion = dateString(aggregate.games[data.gameId]?.completedAt)
      const completion = dateString(data.completedAt)
      if (!existingCompletion || (completion && completion < existingCompletion)) aggregate.games[data.gameId] = { completedAt: data.completedAt }
      if (!dateString(aggregate.updatedAt) || (completion && completion > dateString(aggregate.updatedAt)!)) aggregate.updatedAt = data.completedAt
      aggregate.totalSessions++
      history.set(data.lessonId, aggregate)
    }
    if (snapshot.size < 500) break
    cursor = snapshot.docs.at(-1)
  }

  const groups = new Map<string, { grade: number; subject: SubjectId; lessonIds: string[] }>()
  for (const lesson of Object.values(LESSON_CATALOG)) {
    const grade = Number(lesson.gradeId.replace(/\D/g, ''))
    const id = `${lesson.subjectId}-${grade}`
    const group = groups.get(id) ?? { grade, subject: lesson.subjectId, lessonIds: [] }
    group.lessonIds.push(lesson.lessonId)
    groups.set(id, group)
  }
  const summaries: { documentId: string; completedLessons: number; attempts: number }[] = []
  for (const [documentId, group] of Array.from(groups)) {
    const summary = await db.runTransaction(async transaction => {
      const subjectRef = subjectProgressRef(userId, group.grade, group.subject)
      const subjectSnapshot = await transaction.get(subjectRef)
      const refs = group.lessonIds.map(id => lessonGoalProgressRef(userId, id))
      const snapshots = await transaction.getAll(...refs)
      const old = subjectSnapshot.data() as SubjectProgress | undefined
      const lessons = { ...old?.lessons }
      const definitions = getSubjectLessons(group.grade, group.subject)
      for (let index = 0; index < snapshots.length; index++) {
        const snapshot = snapshots[index]
        const lessonId = group.lessonIds[index]
        const recorded = history.get(lessonId)
        const stored = snapshot.data() as LegacyProgress | undefined
        // Existing cumulative keys remain authoritative: do not add the same sessions again.
        const keys = stored?.keys ?? recorded?.keys
        if (!keys) continue
        const games = { ...recorded?.games, ...stored?.games }
        const lastPlayedAt = [dateString(stored?.updatedAt), dateString(recorded?.updatedAt)].filter((date): date is string => !!date).sort().at(-1) ?? null
        const definition = definitions.find(item => item.lessonId === lessonId)!
        lessons[lessonId] = summarizeLesson(definition, keys, games, lastPlayedAt, old?.lessons?.[lessonId])
        if (apply) transaction.set(refs[index], {
          userId, grade: group.grade, subject: group.subject, lessonId, keys, games,
          totalSessions: stored?.totalSessions ?? recorded?.totalSessions ?? 0,
          updatedAt: stored?.updatedAt ?? recorded?.updatedAt ?? FieldValue.serverTimestamp(),
        }, { merge: true })
      }
      const next = buildSubjectProgress(userId, group.grade, group.subject, lessons)
      if (apply) transaction.set(subjectRef, { ...next, updatedAt: FieldValue.serverTimestamp() })
      return { documentId, completedLessons: next.completedLessons, attempts: next.attempts }
    })
    summaries.push(summary)
  }
  return { userId, mode: apply ? 'APPLY' : 'DRY RUN', scannedSessions, skippedSessions, subjects: summaries }
}

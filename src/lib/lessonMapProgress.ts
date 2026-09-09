import 'server-only'
import { getAdminDb } from './firebaseAdmin'
import { userGameSessions } from './gameTrackingPaths'
import { buildLessonMapItems, type CompletedGame } from '@/components/games/lesson-map/progress'
import { getProgressLessons, type MapSubject } from '@/components/games/lesson-map/progress-config'

export async function getLessonMapProgress(userId: string, subject: MapSubject) {
  const lessons = getProgressLessons(subject)
  const lessonIds = new Set(lessons.map(lesson => lesson.lessonId))
  // Query by user alone to support legacy documents without grade/subject fields
  // and avoid requiring a new composite Firestore index.
  const snapshot = await getAdminDb().collection('shopbebangcom').doc('game')
    .collection('learning_progress').where('userId', '==', userId).select('lessonId', 'games').get()
  const records: CompletedGame[] = []
  for (const doc of snapshot.docs) {
    const data = doc.data()
    if (!lessonIds.has(data.lessonId)) continue
    for (const [gameId, game] of Object.entries(data.games ?? {})) {
      if (game && typeof game === 'object' && 'completedAt' in game && game.completedAt)
        records.push({ lessonId: data.lessonId, gameId, completedAt: true })
    }
  }
  const missing = lessons.filter(lesson => lesson.games.some(gameId => !records.some(record => record.lessonId === lesson.lessonId && record.gameId === gameId)))
  // Legacy history and users without activeGame may have sessions but no games
  // aggregate. Read only missing lessons, in batches, never one query per node.
  for (let offset = 0; offset < missing.length; offset += 30) {
    const sessions = await userGameSessions(userId)
      .where('lessonId', 'in', missing.slice(offset, offset + 30).map(lesson => lesson.lessonId))
      .select('lessonId', 'gameId', 'completedAt').get()
    for (const doc of sessions.docs) {
      const data = doc.data()
      if (typeof data.lessonId === 'string' && typeof data.gameId === 'string' && data.completedAt)
        records.push({ lessonId: data.lessonId, gameId: data.gameId, completedAt: true })
    }
  }
  return buildLessonMapItems(lessons, records)
}

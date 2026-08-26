import type { CompletedGameSession, GameTrackingRepository, LearningProgress, LessonId } from './types'

export class FirestoreGameTrackingRepository implements GameTrackingRepository {
  async saveSession(session: CompletedGameSession) {
    const response = await fetch('/api/game-tracking/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    })
    if (!response.ok) throw new Error(`Game tracking request failed (${response.status})`)
    return response.json() as Promise<{ sessionId: string }>
  }

  async getLearningProgress(userId: string, lessonId: LessonId) {
    const query = new URLSearchParams({ userId, lessonId })
    const response = await fetch(`/api/game-tracking/progress?${query}`)
    if (!response.ok) throw new Error(`Learning progress request failed (${response.status})`)
    const body = await response.json() as { keys?: Partial<LearningProgress> }
    return body.keys ?? {}
  }
}


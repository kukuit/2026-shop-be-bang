import type {
  CompletedGameSession,
  GameTrackingRepository,
  LearningProgress,
  LessonId,
} from './types'
import { fetchWithAuthRetry } from '@/lib/auth/client-fetch'

export class FirestoreGameTrackingRepository implements GameTrackingRepository {
  async saveSession(session: CompletedGameSession) {
    const request: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    }
    let response = await fetchWithAuthRetry('/api/game-tracking/sessions', request)
    // Refresh thất bại đã clear cookie; retry cuối cho phép phiên vẫn được lưu dưới dạng guest.
    if (response.status === 401) response = await fetch('/api/game-tracking/sessions', request)
    if (!response.ok) throw new Error(`Game tracking request failed (${response.status})`)
    return response.json() as Promise<{ sessionId: string }>
  }

  async getLearningProgress(lessonId: LessonId) {
    const query = new URLSearchParams({ lessonId })
    const response = await fetchWithAuthRetry(`/api/game-tracking/progress?${query}`)
    if (!response.ok) throw new Error(`Learning progress request failed (${response.status})`)
    const body = (await response.json()) as { keys?: Partial<LearningProgress> }
    return body.keys ?? {}
  }
}

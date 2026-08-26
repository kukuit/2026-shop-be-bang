import { FirestoreGameTrackingRepository } from './firestore-game-repository'
import { GameTracker } from './game-session'
import type { GameId, LessonId } from './types'

export * from './constants'
export * from './game-user'
export { GameTracker } from './game-session'
export * from './learning-keys'
export * from './lesson-catalog'
export * from './types'

const repository = new FirestoreGameTrackingRepository()

export function createGameTracker(options: { userId: string; lessonId: LessonId; gameId: GameId }) {
  return new GameTracker({ ...options, repository })
}

export function getLearningProgress(userId: string, lessonId: LessonId) {
  return repository.getLearningProgress(userId, lessonId)
}

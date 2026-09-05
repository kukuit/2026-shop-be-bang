import type { GameId, LearningKey, LessonId } from './tracking'

export type GameLessonConfig<Question> = {
  lessonId: LessonId
  gameId: GameId
  totalRounds: number
  answerDomain: readonly number[]
  supportedTargets: readonly LearningKey[]
  loadQuestions: () => Question[] | Promise<Question[]>
  introVoice?: string
  images?: import('./game-image').GameImages
}

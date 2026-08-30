import type { GameId, LearningKey, LessonId } from '../general/tracking'

export type NumberValue = number
export type LevelType = 'count' | 'sequence' | 'sort' | 'mixed'

export type CountGroup = { id: string; icon: string; count: NumberValue; label: string }
export type SequenceCell = { id: string; value: NumberValue; target?: boolean }

export type DragDropLevel = {
  id: number
  type: LevelType
  title: string
  instruction: string
  groups?: CountGroup[]
  sequence?: SequenceCell[]
  answers: Record<string, NumberValue>
  learningKeys: Record<string, LearningKey>
}

export type DragDropGameConfig = {
  lessonId: LessonId
  gameId: GameId
  totalRounds: number
  answerDomain: readonly NumberValue[]
  supportedTargets: readonly LearningKey[]
  initialLevels: DragDropLevel[]
  loadLevels: (previous?: DragDropLevel[]) => DragDropLevel[] | Promise<DragDropLevel[]>
  introVoice?: string
}

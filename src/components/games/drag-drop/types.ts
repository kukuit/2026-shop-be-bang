import type { GameId, LearningKey, LessonId } from '../general/tracking'

export type NumberValue = number
export type DragAnswerValue = string | number
export type LevelType = 'count' | 'sequence' | 'sort' | 'mixed'

export type CountGroup = { id: string; icon: string; count: number; label: string; capacity?: number; textMatch?: { before: string; after: string } }
export type SequenceCell = { id: string; value: NumberValue; target?: boolean }

export type DragDropLevel = {
  id: number
  questionId?: string
  type: LevelType
  title: string
  instruction: string
  instructionVoice?: string
  voiceFallback?: { instruction?: string; target?: string }
  spokenInstruction?: string
  voice?: string
  groups?: CountGroup[]
  sequence?: SequenceCell[]
  answers: Record<string, DragAnswerValue>
  answerDomain?: readonly DragAnswerValue[]
  learningKeys: Record<string, LearningKey>
  skills?: Record<string, import('../general/learning-question').LearningSkill>
  inputModes?: Record<string, import('../general/learning-question').QuestionInputMode>
  answerModes?: Record<string, import('../general/learning-question').QuestionAnswerMode>
}

export type DragDropGameConfig = {
  lessonId: LessonId
  gameId: GameId
  totalRounds: number
  answerDomain: readonly DragAnswerValue[]
  supportedTargets: readonly LearningKey[]
  initialLevels: DragDropLevel[]
  loadLevels: (previous?: DragDropLevel[]) => DragDropLevel[] | Promise<DragDropLevel[]>
  introVoice?: string
  hideQuestionText?: boolean
  answerTrayColumns?: 'auto'
  answerNoun?: string
  awaitLevelReload?: boolean
  images?: import('../general/game-image').GameImages
}

import type { GameId, LearningKey, LessonId } from '../general/tracking'

export type NumberValue = number
export type DragAnswerValue = string | number
export type LevelType = 'count' | 'sequence' | 'sort' | 'mixed' | 'matching'

export type CountGroup = { id: string; icon: string; count: number; label: string; imageId?: string; imageSrc?: string; imageAlt?: string; imageCrop?: { row: number; column: number; rows: number; columns: number }; promptText?: string; capacity?: number; textMatch?: { before: string; after: string } }
export type SequenceCell = { id: string; value: NumberValue; target?: boolean }

export type DragDropLevel = {
  id: number
  questionId?: string
  type: LevelType
  answerTrayColumns?: number
  title: string
  instruction: string
  instructionVoice?: string
  voiceSequence?: import('../general/composed-voice').VoiceSegment[]
  voiceFallback?: { instruction?: string; target?: string }
  spokenInstruction?: string
  voice?: string
  groups?: CountGroup[]
  sequence?: SequenceCell[]
  answers: Record<string, DragAnswerValue>
  answerDomain?: readonly DragAnswerValue[]
  learningKeys: Record<string, LearningKey>
  sourceLessons?: Record<string, number>
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
  showQuestionVoiceButton?: boolean
  answerTrayColumns?: 'auto'
  answerNoun?: string
  awaitLevelReload?: boolean
  images?: import('../general/game-image').GameImages
}

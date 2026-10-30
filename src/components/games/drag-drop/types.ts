import type { GameId, LearningKey, LessonId } from '../general/tracking'
import type { ReactNode } from 'react'

export type NumberValue = number
export type DragAnswerValue = string | number
export type LevelType = 'count' | 'sequence' | 'sort' | 'mixed' | 'matching'

export type CountGroup = { id: string; icon: string; count: number; label: string; imageId?: string; imageSrc?: string; imageAlt?: string; imageCrop?: { row: number; column: number; rows: number; columns: number }; imageAspectRatio?: number; promptText?: string; audio?: { url?: string; text?: string; language?: string }; capacity?: number; textMatch?: { before: string; after: string } }
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
  /** Optional shorter session for standalone activities; existing lesson configs keep the shared 25-level default. */
  maxRounds?: number
  /** Per-target scoring for matching activities; omitted configs keep the shared per-level score. */
  scorePerCorrectTarget?: number
  /** Set false for activities that do not use the wolf companion. */
  wolfEnabled?: boolean
  /** Enables tile selection and keyboard activation of matching targets. */
  keyboardMatching?: boolean
  onAnswer?: (result: { targetId: string; correct: boolean; selectedAnswer: DragAnswerValue; expectedAnswer: DragAnswerValue }) => void
  onGroupAudio?: (audio: NonNullable<CountGroup['audio']>) => void
  completionContent?: (playText: (text: string) => void) => ReactNode
  onChangeActivity?: () => void
  completionReturnPath?: string
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

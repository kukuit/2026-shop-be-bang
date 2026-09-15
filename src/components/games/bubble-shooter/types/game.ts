import type { GameId, LearningKey, LessonId } from '../../general/tracking'
import type { LearningSkill, QuestionAnswerMode, QuestionInputMode } from '../../general/learning-question'

export interface MathQuestion {
  text: string
  answer: string | number
  options: Array<string | number>
  learningKey?: LearningKey
  id?: string
  skill?: LearningSkill
  inputMode?: QuestionInputMode
  answerMode?: QuestionAnswerMode
  instructionVoice?: string
  voiceFallback?: { instruction?: string; target?: string }
  voice?: string
  voiceSequence?: Array<{ src: string; text: string; playbackRate?: number; overlapNext?: number }>
  images?: import('../../general/game-image').GameImages
  presentation?:
    | { type: 'completeQuantity'; startNumber: number; targetNumber: number }
    | { type: 'recognizeNumber'; number: number; icon?: string }
    | { type: 'fitToPanel' }
    | { type: 'generic'; prompt: string }
    | { type: 'voice'; prompt?: string }
}

export interface BubbleShooterGameConfig {
  questionLayout?: { panelWidth: number; panelHeight?: number; fontFamily: string }
  wolfWrongAnswersOnly?: boolean
  id: string
  title: string
  totalRounds: number
  loadQuestions: () => MathQuestion[] | Promise<MathQuestion[]>
  tracking?: {
    lessonId: LessonId
    gameId: GameId
  }
  introVoice?: string
  images?: import('../../general/game-image').GameImages
}

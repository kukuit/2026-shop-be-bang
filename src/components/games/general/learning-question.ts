import type { LearningKey } from './tracking'

export const LEARNING_SKILLS = {
  LISTENING: 'listening', READING: 'reading', SPEAKING: 'speaking', WRITING: 'writing',
} as const

export type LearningSkill = (typeof LEARNING_SKILLS)[keyof typeof LEARNING_SKILLS]
export type QuestionInputMode = 'audio' | 'text' | 'image' | 'scene'
export type QuestionAnswerMode = 'select-image' | 'select-text' | 'drag-image' | 'drag-text' | 'speak'

export type LearningQuestion = {
  id: string
  goalKey: LearningKey
  skill?: LearningSkill
  inputMode?: QuestionInputMode
  answerMode?: QuestionAnswerMode
  questionType?: string
  prompt?: string
  instructionVoice?: string
  voice?: string
  image?: string
  scene?: string
  answer: string
  options?: string[]
  /** Optional engine-neutral presentation hints for content that uses more than plain text. */
  media?: { image?: string; scene?: string; imageByValue?: Record<string, string> }
  /** Preserve structured exercise data (for example a sequence or multiple targets) until a game adapter consumes it. */
  data?: Record<string, unknown>
}

/**
 * Lesson-owned content contract. A lesson supplies one randomized question
 * stream and its media; game adapters translate this stream to engine shapes.
 */
export type LessonQuestion = LearningQuestion
export type LessonQuestionSource = {
  lessonId: import('./tracking').LessonId
  title: string
  questions: () => LessonQuestion[] | Promise<LessonQuestion[]>
  images?: import('./game-image').GameImages
  introVoice?: string
}

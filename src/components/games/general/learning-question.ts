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
}

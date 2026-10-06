import type { ExamAnswer, ExamQuestion } from './types'

export function normalizeAnswer(value: string) {
  return value.normalize('NFC').trim().toLocaleLowerCase('vi-VN')
}

export function isQuestionAnswered(question: ExamQuestion | undefined, answer: ExamAnswer | undefined): boolean {
  if (!question || answer === undefined || answer === null) return false
  switch (question.type) {
    case 'single-choice':
    case 'image-choice':
    case 'audio-choice':
    case 'select-input':
    case 'video-select':
      return typeof answer === 'string' && answer.trim().length > 0
    case 'multi-select':
      return Array.isArray(answer) && answer.length > 0
    case 'text-input':
    case 'number-input':
      return typeof answer === 'string' && answer.trim().length > 0
    case 'matching':
    case 'categorize':
    case 'drag-to-slot':
      return !Array.isArray(answer) && typeof answer === 'object' && Object.keys(answer).length > 0
    case 'sorting':
      // The initial shuffled display is not stored as an answer; the UI writes only after an interaction.
      return Array.isArray(answer) && answer.length > 0
  }
}

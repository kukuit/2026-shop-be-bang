import type { ExamAnswer, ExamQuestion } from './types'

export function normalizeAnswer(value: string) {
  return value.normalize('NFC').trim().toLocaleLowerCase('vi-VN')
}

export function sanitizeSingleVietnameseLetter(value: string, allowedLetters: readonly string[]): string {
  const normalized = value.normalize('NFC').trim().toLocaleLowerCase('vi-VN')
  const firstLetter = Array.from(normalized)[0] ?? ''
  return allowedLetters.includes(firstLetter) ? firstLetter : ''
}

export function isQuestionAnswered(question: ExamQuestion | undefined, answer: ExamAnswer | undefined): boolean {
  if (!question || answer === undefined || answer === null) return false
  switch (question.type) {
    case 'single-choice':
    case 'image-choice':
    case 'audio-choice':
    case 'select-input':
    case 'video-select':
    case 'animated-select':
      return typeof answer === 'string' && answer.trim().length > 0
    case 'multi-select':
      return Array.isArray(answer) && answer.length > 0
    case 'text-input':
    case 'number-input':
    case 'hidden-letter-input':
    case 'rotated-letter-input':
      return typeof answer === 'string' && answer.trim().length > 0
    case 'matching':
    case 'drag-to-slot':
      return !Array.isArray(answer) && typeof answer === 'object' && Object.keys(answer).length > 0
    case 'drag-fill': {
      const itemIds = (question.data?.items as Array<{ id: string }> | undefined)?.map(item => item.id) ?? []
      return itemIds.length > 0 && !Array.isArray(answer) && typeof answer === 'object'
        && Object.keys(answer).length === itemIds.length
        && itemIds.every(id => typeof answer[id] === 'string' && answer[id].length > 0)
        && new Set(Object.values(answer)).size === itemIds.length
    }
    case 'categorize': {
      if (question.data?.generator !== 'CLASSIFY_NUMBER_AND_LETTER' && question.data?.generator !== 'CLASSIFY_CATEGORY_PAIRS')
        return !Array.isArray(answer) && typeof answer === 'object' && Object.keys(answer).length > 0
      const items = question.data.items as Array<{ id: string }> | undefined
      return Boolean(items?.length) && !Array.isArray(answer) && typeof answer === 'object'
        && Object.keys(answer).length === items?.length
        && items?.every(item => Object.hasOwn(answer, item.id)) === true
    }
    case 'drag-match': {
      const data = question.data as { leftItems?: Array<{ id: string }> } | undefined
      const expectedMatches = data?.leftItems?.length ?? 0
      return expectedMatches > 0 && !Array.isArray(answer) && typeof answer === 'object'
        && Object.keys(answer).length === expectedMatches
        && new Set(Object.values(answer)).size === expectedMatches
    }
    case 'sorting':
      // The initial shuffled display is not stored as an answer; the UI writes only after an interaction.
      return Array.isArray(answer) && answer.length > 0
  }
}

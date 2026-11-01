import type { ExamAnswer, GeneratedExamQuestion } from '../../_exam/types'
import type { TestExamQuestion } from './test-types'

export type PreviewTestQuestion = TestExamQuestion & { testAnswer: ExamAnswer }

export function previewQuestion(generated: GeneratedExamQuestion): PreviewTestQuestion {
  const { correctAnswer, ...question } = generated
  const withTestAnswer = (visibleQuestion: TestExamQuestion): PreviewTestQuestion => ({ ...visibleQuestion, testAnswer: correctAnswer })
  if (question.data?.generator === 'FILL_FRUIT_COLOR_LETTER') {
    const { combinationKey: _combinationKey, selectionSignature: _selectionSignature, ...visibleData } = question.data
    return withTestAnswer({ ...question, data: visibleData })
  }
  if (question.data?.generator === 'ANALYZE_WORD_FROM_IMAGE') {
    const { analysisValue: _analysisValue, item, ...visibleData } = question.data
    if (item && typeof item === 'object') {
      const { initial: _initial, rhyme: _rhyme, tone: _tone, letters: _letters, ...visibleItem } = item as Record<string, unknown>
      return withTestAnswer({ ...question, data: { ...visibleData, item: visibleItem } })
    }
    return withTestAnswer({ ...question, data: visibleData })
  }
  if (question.data?.generator === 'FIND_COMMON_SOUND') {
    const { targetSound: _targetSound, selectionKey: _selectionKey, words, ...visibleData } = question.data
    const visibleWords = Array.isArray(words) ? words.map(word => {
      if (!word || typeof word !== 'object') return word
      const { initial: _initial, ...visibleWord } = word as Record<string, unknown>
      return visibleWord
    }) : words
    return withTestAnswer({ ...question, data: { ...visibleData, words: visibleWords } })
  }
  if (question.data?.generator === 'IMAGE_RESEMBLES_LETTER') {
    const { selectionKey: _selectionKey, asset, ...visibleData } = question.data
    if (asset && typeof asset === 'object') {
      const { resemblesLetter: _resemblesLetter, ...visibleAsset } = asset as Record<string, unknown>
      return withTestAnswer({ ...question, data: { ...visibleData, asset: visibleAsset } })
    }
    return withTestAnswer({ ...question, data: visibleData })
  }
  if (question.data?.generator === 'IDENTIFY_SCHOOL_EVENT') {
    const { targetEventId: _targetEventId, ...visibleData } = question.data
    return withTestAnswer({ ...question, data: visibleData })
  }
  if (question.data?.generator === 'FIND_LETTER_PAIR_IN_ANIMAL_NAME') {
    const { targetLetters: _targetLetters, ...visibleData } = question.data
    return withTestAnswer({ ...question, data: visibleData })
  }
  return withTestAnswer(question)
}

import type { VocabularyAnswerProgress, VocabularyProgress } from './types'

export const VOCABULARY_PROGRESS_STORAGE_KEY = 'shop-be-bang:vocabulary-progress:v1'
export const VOCABULARY_PROGRESS_VERSION = 1 as const
export const MAX_VOCABULARY_PROGRESS_WORDS = 3000
export const WEAK_WORD_MASTERY_THRESHOLD = 80

const emptyProgress = (): VocabularyProgress => ({ version: VOCABULARY_PROGRESS_VERSION, words: {} })

export function readVocabularyProgress(storage?: Pick<Storage, 'getItem'>): VocabularyProgress {
  if (typeof window === 'undefined' && !storage) return emptyProgress()
  try {
    const value = (storage ?? window.localStorage).getItem(VOCABULARY_PROGRESS_STORAGE_KEY)
    if (!value) return emptyProgress()
    const parsed = JSON.parse(value) as Partial<VocabularyProgress>
    if (parsed.version !== VOCABULARY_PROGRESS_VERSION || !parsed.words || typeof parsed.words !== 'object') return emptyProgress()
    return { version: VOCABULARY_PROGRESS_VERSION, words: parsed.words as Record<string, VocabularyAnswerProgress> }
  } catch {
    return emptyProgress()
  }
}

export function recordVocabularyAnswer(progress: VocabularyProgress, wordId: string, correct: boolean, now = new Date()): VocabularyProgress {
  const previous = progress.words[wordId] ?? { correctCount: 0, wrongCount: 0, lastPlayedAt: now.toISOString(), lastResult: correct ? 'correct' : 'wrong', masteryScore: 0 }
  const correctCount = previous.correctCount + Number(correct)
  const wrongCount = previous.wrongCount + Number(!correct)
  const words = {
    ...progress.words,
    [wordId]: {
      correctCount,
      wrongCount,
      lastPlayedAt: now.toISOString(),
      lastResult: correct ? 'correct' as const : 'wrong' as const,
      masteryScore: Math.round((correctCount / Math.max(1, correctCount + wrongCount)) * 100),
    },
  }
  const entries = Object.entries(words)
  if (entries.length > MAX_VOCABULARY_PROGRESS_WORDS) {
    entries.sort((left, right) => Date.parse(right[1].lastPlayedAt) - Date.parse(left[1].lastPlayedAt))
    return { version: VOCABULARY_PROGRESS_VERSION, words: Object.fromEntries(entries.slice(0, MAX_VOCABULARY_PROGRESS_WORDS)) }
  }
  return { version: VOCABULARY_PROGRESS_VERSION, words }
}

export function writeVocabularyProgress(progress: VocabularyProgress, storage?: Pick<Storage, 'setItem'>) {
  try {
    if (typeof window === 'undefined' && !storage) return false
    ;(storage ?? window.localStorage).setItem(VOCABULARY_PROGRESS_STORAGE_KEY, JSON.stringify(progress))
    return true
  } catch {
    return false
  }
}

export function getWeakVocabularyWordIds(progress: VocabularyProgress) {
  return Object.entries(progress.words)
    .filter(([, item]) => item.wrongCount > 0 && item.masteryScore < WEAK_WORD_MASTERY_THRESHOLD)
    .map(([wordId]) => wordId)
}

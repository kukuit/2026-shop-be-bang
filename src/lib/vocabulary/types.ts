export const VOCABULARY_TIER_LIMITS = [50, 100, 200, 300, 500, 750, 1000, 2000, 3000] as const

export type VocabularyTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type VocabularySelectionMode = 'cumulative' | 'level-only' | 'weak-first'
export type VocabularyGameMode = 'word-image' | 'word-meaning' | 'audio-word'
export type VocabularyVisualType = 'object' | 'action' | 'scene' | 'abstract' | 'none'
export type VocabularyPartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'preposition' | 'conjunction' | 'determiner' | 'interjection' | 'other'

export type VocabularyExample = { en: string; vi: string }

export type VocabularySense = {
  id: string
  meaningVi: string
  partOfSpeech?: VocabularyPartOfSpeech
  categories?: string[]
  examples?: VocabularyExample[]
}

export type VocabularyImage =
  | { type: 'sprite'; sheet: string; index: number }
  | { type: 'single'; url: string }

export type VocabularyWord = {
  id: string
  word: string
  lemma?: string
  meaningVi?: string
  senses: VocabularySense[]
  ipa?: string
  audioUrl?: string
  frequencyRank: number | null
  frequencyTier: VocabularyTier | null
  sourceFrequencyCount?: number
  sourceRank?: number | null
  cefr?: 'A1' | 'A2' | 'B1' | 'B2'
  partOfSpeech?: VocabularyPartOfSpeech
  categories: string[]
  visualType: VocabularyVisualType
  image?: VocabularyImage
  examples?: VocabularyExample[]
  status: 'draft' | 'published'
}

export type VocabularyQuestion = {
  id: string
  screenId: string
  type: 'WORD_TO_IMAGE' | 'WORD_TO_MEANING' | 'AUDIO_TO_WORD'
  targetWordId: string
  senseId: string
  targetLabel: string
  targetMeaning: string
  targetImage?: VocabularyImage
  targetAudioUrl?: string
  options: Array<{
    id: string
    wordId: string
    label: string
    image?: VocabularyImage
    audioUrl?: string
  }>
  correctOptionId: string
  category: string
  partOfSpeech: VocabularyPartOfSpeech
  frequencyTier: VocabularyTier
}

export type VocabularyAnswerProgress = {
  correctCount: number
  wrongCount: number
  lastPlayedAt: string
  lastResult: 'correct' | 'wrong'
  masteryScore: number
}

export type VocabularyProgress = {
  version: 1
  words: Record<string, VocabularyAnswerProgress>
}

export type VocabularyProgressSummary = {
  correctPairs: number
  missedPairs: number
  wrongAttempts: number
  accuracy: number
  missedWordIds: string[]
}

export type FrequencySourceManifest = {
  targetRankCount: number
  importedCandidateCount: number
  excludedPositionCount: number
  frequencyBands: Record<VocabularyTier, { minRank: number; maxRank: number; candidateCount: number }>
}

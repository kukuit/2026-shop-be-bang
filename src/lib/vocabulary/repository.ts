import reviewedData from '@/data/vocabulary/reviewed.json'
import type { VocabularySelectionMode, VocabularyTier, VocabularyWord } from './types'
import { getFrequencyBand, matchesVocabularySelection } from './filters'

const chunkLoaders: Record<VocabularyTier, () => Promise<VocabularyWord[]>> = {
  1: async () => (await import('@/data/vocabulary/words/tier-1.json')).default as VocabularyWord[],
  2: async () => (await import('@/data/vocabulary/words/tier-2.json')).default as VocabularyWord[],
  3: async () => (await import('@/data/vocabulary/words/tier-3.json')).default as VocabularyWord[],
  4: async () => (await import('@/data/vocabulary/words/tier-4.json')).default as VocabularyWord[],
  5: async () => (await import('@/data/vocabulary/words/tier-5.json')).default as VocabularyWord[],
  6: async () => (await import('@/data/vocabulary/words/tier-6.json')).default as VocabularyWord[],
  7: async () => (await import('@/data/vocabulary/words/tier-7.json')).default as VocabularyWord[],
  8: async () => (await import('@/data/vocabulary/words/tier-8.json')).default as VocabularyWord[],
  9: async () => (await import('@/data/vocabulary/words/tier-9.json')).default as VocabularyWord[],
}

const reviewedWords = reviewedData as VocabularyWord[]
const reviewedById = new Map(reviewedWords.map((word) => [word.id, word]))
const chunkCache = new Map<VocabularyTier, Promise<VocabularyWord[]>>()

export function getReviewedVocabularyWords() {
  return reviewedWords
}

export function getReviewedVocabularyWordCount() {
  return reviewedWords.length
}

export function getReviewedPlayableCount(tier: VocabularyTier, selectionMode: VocabularySelectionMode) {
  return reviewedWords.filter((word) => matchesVocabularySelection(word, tier, selectionMode)).length
}

export function getVocabularyFrequencyBand(tier: VocabularyTier) {
  return getFrequencyBand(tier)
}

async function loadTier(tier: VocabularyTier) {
  let pending = chunkCache.get(tier)
  if (!pending) {
    pending = chunkLoaders[tier]().then((rows) => rows.map((row) => ({ ...row, ...reviewedById.get(row.id) })))
    chunkCache.set(tier, pending)
  }
  return pending
}

export async function loadVocabularyWords({ tier, selectionMode }: { tier: VocabularyTier; selectionMode: VocabularySelectionMode }) {
  const tiers = selectionMode === 'level-only' ? [tier] : Array.from({ length: tier }, (_, index) => (index + 1) as VocabularyTier)
  const chunks = await Promise.all(tiers.map(loadTier))
  return chunks.flat().filter((word) => matchesVocabularySelection(word, tier, selectionMode))
}

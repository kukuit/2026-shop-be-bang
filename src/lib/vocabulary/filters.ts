import type { VocabularyGameMode, VocabularySelectionMode, VocabularyTier, VocabularyWord } from './types'
import { VOCABULARY_TIER_LIMITS } from './types'

export function getFrequencyBand(tier: VocabularyTier) {
  const maxRank = VOCABULARY_TIER_LIMITS[tier - 1]
  const minRank = tier === 1 ? 1 : VOCABULARY_TIER_LIMITS[tier - 2] + 1
  return { minRank, maxRank }
}

export function matchesVocabularySelection(word: VocabularyWord, tier: VocabularyTier, mode: VocabularySelectionMode) {
  if (word.status !== 'published' || word.frequencyRank === null || word.frequencyTier === null) return false
  const { minRank, maxRank } = getFrequencyBand(tier)
  if (mode === 'level-only') return word.frequencyRank >= minRank && word.frequencyRank <= maxRank
  return word.frequencyRank <= maxRank
}

export function isWordPlayableInMode(word: VocabularyWord, mode: VocabularyGameMode, speechSynthesisAvailable = false) {
  if (word.status !== 'published' || !word.senses.some((sense) => Boolean(sense.meaningVi.trim()))) return false
  switch (mode) {
    case 'word-image':
      return Boolean(word.image)
    case 'word-meaning':
      return Boolean(word.meaningVi?.trim())
    case 'audio-word':
      return Boolean(word.audioUrl || speechSynthesisAvailable)
  }
}

export function getPlayableVocabularyWords(
  words: readonly VocabularyWord[],
  tier: VocabularyTier,
  selectionMode: VocabularySelectionMode,
  gameMode: VocabularyGameMode,
  speechSynthesisAvailable = false,
  weakWordIds: readonly string[] = [],
) {
  const weak = new Set(weakWordIds)
  const selected = words.filter((word) => matchesVocabularySelection(word, tier, selectionMode)
    && isWordPlayableInMode(word, gameMode, speechSynthesisAvailable))
  const buckets = new Map<string, VocabularyWord[]>()
  for (const word of selected) {
    for (const sense of word.senses) {
      const category = sense.categories?.[0] ?? word.categories[0]
      const partOfSpeech = sense.partOfSpeech ?? word.partOfSpeech
      if (!category || !partOfSpeech || !sense.meaningVi.trim()) continue
      const key = `${category}|${partOfSpeech}|${word.frequencyTier}`
      const bucket = buckets.get(key) ?? []
      if (!bucket.some((entry) => entry.id === word.id)) bucket.push(word)
      buckets.set(key, bucket)
    }
  }
  const eligible = Array.from(buckets.values()).filter((bucket) => bucket.length >= 3).flat()
  const unique = Array.from(new Map(eligible.map((word) => [word.id, word])).values())
  if (selectionMode === 'weak-first' && weak.size) {
    unique.sort((a, b) => Number(weak.has(b.id)) - Number(weak.has(a.id)))
  }
  return { words: unique, playableWordCount: unique.length, availableQuestionCount: Math.min(10, unique.length), weakWordCount: unique.filter((word) => weak.has(word.id)).length }
}

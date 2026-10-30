import type { VocabularyGameMode, VocabularyPartOfSpeech, VocabularyQuestion, VocabularyTier, VocabularyWord } from './types'
import { getPlayableVocabularyWords } from './filters'

export type VocabularySenseEntry = {
  word: VocabularyWord
  senseId: string
  category: string
  partOfSpeech: VocabularyPartOfSpeech
  meaningVi: string
  tier: VocabularyTier
}

const shuffle = <T,>(items: readonly T[], random: () => number) => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function buildVocabularySenseEntries(words: readonly VocabularyWord[], mode: VocabularyGameMode, speechSynthesisAvailable = false, random: () => number = Math.random): VocabularySenseEntry[] {
  const playableWordIds = new Set(getPlayableVocabularyWords(words, 9, 'cumulative', mode, speechSynthesisAvailable).words.map((word) => word.id))
  const candidates = words.filter((word) => playableWordIds.has(word.id))
  const allEntries: VocabularySenseEntry[] = []
  for (const word of candidates) {
    for (const sense of word.senses.filter((item) => item.meaningVi.trim())) {
      const category = sense.categories?.[0] ?? word.categories[0]
      const partOfSpeech = sense.partOfSpeech ?? word.partOfSpeech
      if (!category || !partOfSpeech || word.frequencyTier === null) continue
      allEntries.push({ word, senseId: sense.id, category, partOfSpeech, meaningVi: sense.meaningVi, tier: word.frequencyTier })
    }
  }
  const bucketCounts = new Map<string, Set<string>>()
  for (const entry of allEntries) {
    const key = `${entry.category}|${entry.partOfSpeech}|${entry.tier}`
    const ids = bucketCounts.get(key) ?? new Set<string>()
    ids.add(entry.word.id)
    bucketCounts.set(key, ids)
  }
  const eligible = allEntries.filter((entry) => (bucketCounts.get(`${entry.category}|${entry.partOfSpeech}|${entry.tier}`)?.size ?? 0) >= 3)
  const byWord = new Map<string, VocabularySenseEntry[]>()
  for (const entry of eligible) {
    const entries = byWord.get(entry.word.id) ?? []
    entries.push(entry)
    byWord.set(entry.word.id, entries)
  }
  return Array.from(byWord.values()).map((entries) => entries[Math.floor(random() * entries.length)])
}

export function createVocabularyDistractors(target: VocabularySenseEntry, pool: readonly VocabularySenseEntry[], count = 2, random: () => number = Math.random) {
  const targetMeaning = target.meaningVi.normalize('NFC').toLocaleLowerCase('vi')
  const options = shuffle(pool.filter((candidate) => candidate.word.id !== target.word.id
    && candidate.category === target.category
    && candidate.partOfSpeech === target.partOfSpeech
    && candidate.tier === target.tier
    && candidate.meaningVi.normalize('NFC').toLocaleLowerCase('vi') !== targetMeaning), random)
  const distinct: VocabularySenseEntry[] = []
  const meanings = new Set([targetMeaning])
  for (const option of options) {
    const key = option.meaningVi.normalize('NFC').toLocaleLowerCase('vi')
    if (meanings.has(key)) continue
    meanings.add(key)
    distinct.push(option)
    if (distinct.length >= count) break
  }
  return distinct
}

export function buildVocabularyOptions(target: VocabularySenseEntry, pool: readonly VocabularySenseEntry[], mode: VocabularyGameMode, random: () => number = Math.random) {
  const distractors = createVocabularyDistractors(target, pool, 2, random)
  if (distractors.length < 2) return []
  const choices = shuffle([target, ...distractors], random)
  return choices.map((entry) => ({
    id: `${entry.word.id}:${entry.senseId}`,
    wordId: entry.word.id,
    label: mode === 'word-meaning' ? entry.meaningVi : entry.word.word,
    image: entry.word.image,
    audioUrl: entry.word.audioUrl,
  }))
}

export type { VocabularyQuestion }

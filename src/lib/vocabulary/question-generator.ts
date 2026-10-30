import type { VocabularyGameMode, VocabularyQuestion, VocabularyWord } from './types'
import { buildVocabularySenseEntries, createVocabularyDistractors, type VocabularySenseEntry } from './distractors'

const shuffle = <T,>(items: readonly T[], random: () => number) => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function generateVocabularyQuestions({
  words,
  gameMode,
  questionCount = 10,
  excludeWordIds = [],
  weakWordIds = [],
  lastPlayedAt = {},
  speechSynthesisAvailable = false,
  screenLayout,
  random = Math.random,
}: {
  words: readonly VocabularyWord[]
  gameMode: VocabularyGameMode
  questionCount?: number
  excludeWordIds?: readonly string[]
  weakWordIds?: readonly string[]
  lastPlayedAt?: Readonly<Record<string, string>>
  speechSynthesisAvailable?: boolean
  screenLayout?: Array<{ category: string; partOfSpeech: string; frequencyTier: number; count: number }>
  random?: () => number
}): VocabularyQuestion[] {
  const excluded = new Set(excludeWordIds)
  const weak = new Set(weakWordIds)
  const oldestFirst = (entries: readonly VocabularySenseEntry[]) => shuffle(entries, random).sort((left, right) => {
    const leftDate = Date.parse(lastPlayedAt[left.word.id] ?? '') || 0
    const rightDate = Date.parse(lastPlayedAt[right.word.id] ?? '') || 0
    return leftDate - rightDate
  })
  const pool = buildVocabularySenseEntries(words, gameMode, speechSynthesisAvailable, random).filter((entry) => !excluded.has(entry.word.id))
  const grouped = new Map<string, VocabularySenseEntry[]>()
  for (const entry of pool) {
    const key = `${entry.category}|${entry.partOfSpeech}|${entry.tier}`
    const values = grouped.get(key) ?? []
    values.push(entry)
    grouped.set(key, values)
  }
  const buckets = shuffle(Array.from(grouped.entries())
    .filter(([, entries]) => entries.length >= 3)
    .map(([key, entries]) => ({ key, entries: shuffle(entries, random) })), random)

  if (screenLayout?.length) {
    const bucketByKey = new Map(buckets.map(({ key, entries }) => [key, entries] as const))
    const questions: VocabularyQuestion[] = []
    const layout = shuffle(screenLayout, random)
    const allEntries = layout.flatMap((screen) => bucketByKey.get(`${screen.category}|${screen.partOfSpeech}|${screen.frequencyTier}`) ?? [])
    const weakAvailable = new Set(allEntries.filter((entry) => weak.has(entry.word.id)).map((entry) => entry.word.id)).size
    let weakQuota = Math.min(weakAvailable, Math.round(layout.reduce((sum, screen) => sum + screen.count, 0) * 0.3))
    const usedTargetIds = new Set<string>()
    layout.forEach((screen, screenIndex) => {
      const key = `${screen.category}|${screen.partOfSpeech}|${screen.frequencyTier}`
      const bucket = bucketByKey.get(key)
      if (!bucket) return
      const availableEntries = bucket.filter((entry) => !excluded.has(entry.word.id) && !usedTargetIds.has(entry.word.id))
      const weakEntries = oldestFirst(availableEntries.filter((entry) => weak.has(entry.word.id)))
      const regularEntries = oldestFirst(availableEntries.filter((entry) => !weak.has(entry.word.id)))
      const plannedWeak = Math.min(weakEntries.length, weakQuota, screen.count)
      let targets = [...weakEntries.slice(0, plannedWeak), ...regularEntries.slice(0, screen.count - plannedWeak)]
      if (targets.length < screen.count) targets = [...targets, ...weakEntries.slice(plannedWeak, plannedWeak + screen.count - targets.length)]
      if (targets.length !== screen.count) return
      weakQuota -= Math.min(plannedWeak, weakQuota)
      targets.forEach((target) => usedTargetIds.add(target.word.id))
      const targetIds = new Set(targets.map((entry) => entry.word.id))
      const distractors = targets.length === 3 ? [] : createVocabularyDistractors(targets[0], bucket.filter((entry) => !targetIds.has(entry.word.id)), 3 - targets.length, random)
      const optionEntries = shuffle([...targets, ...distractors], random)
      if (optionEntries.length !== 3) return
      const options = optionEntries.map((entry) => ({
        id: `${entry.word.id}:${entry.senseId}`,
        wordId: entry.word.id,
        label: gameMode === 'word-meaning' ? entry.meaningVi : entry.word.word,
        image: entry.word.image,
        audioUrl: entry.word.audioUrl,
      }))
      targets.forEach((target) => {
        const correct = options.find((option) => option.wordId === target.word.id)
        if (!correct) return
        questions.push({
          id: `question-${target.word.id}-${target.senseId}`,
          screenId: `screen-${screenIndex + 1}`,
          type: gameMode === 'word-image' ? 'WORD_TO_IMAGE' : gameMode === 'audio-word' ? 'AUDIO_TO_WORD' : 'WORD_TO_MEANING',
          targetWordId: target.word.id,
          senseId: target.senseId,
          targetLabel: target.word.word,
          targetMeaning: target.meaningVi,
          targetImage: target.word.image,
          targetAudioUrl: target.word.audioUrl,
          options,
          correctOptionId: correct.id,
          category: target.category,
          partOfSpeech: target.partOfSpeech,
          frequencyTier: target.tier,
        })
      })
    })
    return questions
  }

  const available = buckets.flatMap((bucket) => bucket.entries)
  const targetCount = Math.min(Math.max(0, questionCount), available.length)
  const weakQuota = Math.min(weak.size, Math.round(targetCount * 0.3))
  const selected: VocabularySenseEntry[] = []
  const selectedIds = new Set<string>()
  const weakEntries = oldestFirst(available.filter((entry) => weak.has(entry.word.id)))
  const ordinaryEntries = oldestFirst(available.filter((entry) => !weak.has(entry.word.id)))
  for (const entry of [...weakEntries.slice(0, weakQuota), ...ordinaryEntries, ...weakEntries.slice(weakQuota)]) {
    if (selected.length >= targetCount) break
    if (selectedIds.has(entry.word.id)) continue
    selected.push(entry)
    selectedIds.add(entry.word.id)
  }

  // Keep each set of distractors inside one category, part of speech, and source tier.
  const questions: VocabularyQuestion[] = []
  let screenNumber = 0
  for (const bucket of buckets) {
    const bucketTargets = selected.filter((entry) => `${entry.category}|${entry.partOfSpeech}|${entry.tier}` === bucket.key)
    for (let offset = 0; offset < bucketTargets.length; offset += 3) {
      const targetSet = bucketTargets.slice(offset, offset + 3)
      const targetIds = new Set(targetSet.map((entry) => entry.word.id))
      const distractors = targetSet.length === 3 ? [] : createVocabularyDistractors(targetSet[0], bucket.entries.filter((entry) => !targetIds.has(entry.word.id)), 3 - targetSet.length, random)
      const optionEntries = shuffle([...targetSet, ...distractors], random)
      if (optionEntries.length !== 3) continue
      screenNumber += 1
      const options = optionEntries.map((entry) => ({
        id: `${entry.word.id}:${entry.senseId}`,
        wordId: entry.word.id,
        label: gameMode === 'word-meaning' ? entry.meaningVi : entry.word.word,
        image: entry.word.image,
        audioUrl: entry.word.audioUrl,
      }))
      for (const target of targetSet) {
        const correct = options.find((option) => option.wordId === target.word.id)
        if (!correct) continue
        const type = gameMode === 'word-image' ? 'WORD_TO_IMAGE' : gameMode === 'audio-word' ? 'AUDIO_TO_WORD' : 'WORD_TO_MEANING'
        questions.push({
          id: `question-${target.word.id}-${target.senseId}`,
          screenId: `screen-${screenNumber}`,
          type,
          targetWordId: target.word.id,
          senseId: target.senseId,
          targetLabel: target.word.word,
          targetMeaning: target.meaningVi,
          targetImage: target.word.image,
          targetAudioUrl: target.word.audioUrl,
          options,
          correctOptionId: correct.id,
          category: target.category,
          partOfSpeech: target.partOfSpeech,
          frequencyTier: target.tier,
        })
      }
    }
  }

  return questions.slice(0, questionCount)
}

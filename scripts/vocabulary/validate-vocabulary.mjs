import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const dataRoot = path.join(root, 'src/data/vocabulary')
const targetCount = 3000
const bands = [
  [1, 1, 50], [2, 51, 100], [3, 101, 200], [4, 201, 300], [5, 301, 500],
  [6, 501, 750], [7, 751, 1000], [8, 1001, 2000], [9, 2001, 3000],
]
const tierFor = (rank) => bands.find(([, min, max]) => rank >= min && rank <= max)?.[0] ?? null
const normalized = (value) => value.normalize('NFC').trim().toLocaleLowerCase('vi')
const errors = []
const candidates = []
for (const [tier] of bands) {
  const rows = JSON.parse(await readFile(path.join(dataRoot, 'words', 'tier-' + tier + '.json'), 'utf8'))
  for (const row of rows) candidates.push(row)
}
const reviewed = JSON.parse(await readFile(path.join(dataRoot, 'reviewed.json'), 'utf8'))
const manifest = JSON.parse(await readFile(path.join(dataRoot, 'frequency-manifest.json'), 'utf8'))
const sourceLines = (await readFile(path.join(dataRoot, 'sources/frequencywords-2018-en_50k.txt'), 'utf8')).split(/\r?\n/).filter(Boolean)

if (candidates.length !== manifest.importedCandidateCount) errors.push('Candidate count differs from manifest.')
if (manifest.targetRankCount !== targetCount) errors.push('Target rank count must remain 3,000.')
if (candidates.length + manifest.excludedPositionCount !== targetCount) errors.push('Imported and excluded positions do not sum to 3,000.')

const candidateIds = new Set()
const candidateWords = new Set()
const candidateRanks = new Set()
for (const word of candidates) {
  if (candidateIds.has(word.id)) errors.push('Duplicate ID ' + word.id + '.')
  if (candidateWords.has(word.word.toLowerCase())) errors.push('Duplicate normalized word ' + word.word + '.')
  if (candidateRanks.has(word.frequencyRank)) errors.push('Duplicate frequency rank ' + word.frequencyRank + '.')
  candidateIds.add(word.id)
  candidateWords.add(word.word.toLowerCase())
  candidateRanks.add(word.frequencyRank)
  if (word.frequencyRank !== word.sourceRank) errors.push('Source rank changed for ' + word.word + '.')
  if (!Number.isSafeInteger(word.sourceFrequencyCount) || word.sourceFrequencyCount < 1) errors.push('Invalid source count for ' + word.word + '.')
  if (tierFor(word.frequencyRank) !== word.frequencyTier || word.frequencyTier === null) errors.push('Wrong tier for ' + word.word + ' at rank ' + word.frequencyRank + '.')
  if (word.status !== 'draft') errors.push('Unreviewed source row ' + word.word + ' must remain draft.')
  const rawWord = sourceLines[word.sourceRank - 1]?.trim().split(/\s+/)[0]?.toLowerCase()
  if (rawWord !== word.word) errors.push('Source row does not match ' + word.word + ' at rank ' + word.sourceRank + '.')
}

const reviewedIds = new Set()
for (const word of reviewed) {
  if (!candidateIds.has(word.id)) errors.push('Published entry ' + word.id + ' has no candidate rank.')
  if (reviewedIds.has(word.id)) errors.push('Duplicate reviewed ID ' + word.id + '.')
  reviewedIds.add(word.id)
  if (word.status !== 'published' || !word.meaningVi?.trim() || !word.senses?.length) errors.push('Published entry ' + word.id + ' lacks meaning/senses.')
  for (const sense of word.senses ?? []) {
    if (!sense.meaningVi?.trim()) errors.push('Sense ' + word.id + ':' + sense.id + ' has no Vietnamese meaning.')
    if (!sense.categories?.length || !sense.partOfSpeech) errors.push('Sense ' + word.id + ':' + sense.id + ' needs category and part of speech.')
  }
  if (word.image?.type === 'sprite' && (word.image.index < 0 || word.image.index > 99 || !word.image.sheet)) errors.push('Invalid sprite cell for ' + word.id + '.')
  if (word.image?.type === 'sprite' && word.image.sheet && !existsSync(path.join(root, 'public/games/vocabulary/sprites', path.basename(word.image.sheet)))) errors.push('Missing sprite sheet for ' + word.id + ': ' + word.image.sheet + '.')
  if (word.image?.type === 'single' && !existsSync(path.join(root, 'public', word.image.url.replace(/^\/+/, '')))) errors.push('Missing image for ' + word.id + ': ' + word.image.url + '.')
  if (word.audioUrl && !existsSync(path.join(root, 'public', word.audioUrl.replace(/^\/+/, '')))) errors.push('Missing audio for ' + word.id + ': ' + word.audioUrl + '.')
}

const meaningKeys = new Map()
for (const word of reviewed) {
  for (const sense of word.senses ?? []) {
    const key = (sense.categories?.[0] ?? word.categories[0]) + '|' + (sense.partOfSpeech ?? word.partOfSpeech) + '|' + word.frequencyTier
    const meaning = normalized(sense.meaningVi)
    const values = meaningKeys.get(key) ?? new Map()
    const previous = values.get(meaning)
    if (previous && previous !== word.id) errors.push('Duplicate Vietnamese answer "' + sense.meaningVi + '" in ' + key + ': ' + previous + ', ' + word.id + '.')
    values.set(meaning, word.id)
    meaningKeys.set(key, values)
  }
}

const countPlayable = (mode, speechAvailable = false) => {
  const buckets = new Map()
  for (const word of reviewed) {
    const canPlay = mode === 'word-image' ? Boolean(word.image)
      : mode === 'audio-word' ? Boolean(word.audioUrl || speechAvailable)
        : Boolean(word.meaningVi)
    if (!canPlay) continue
    for (const sense of word.senses ?? []) {
      const category = sense.categories?.[0] ?? word.categories[0]
      const pos = sense.partOfSpeech ?? word.partOfSpeech
      const key = category + '|' + pos + '|' + word.frequencyTier
      const entries = buckets.get(key) ?? new Set()
      entries.add(word.id)
      buckets.set(key, entries)
    }
  }
  return Array.from(buckets.values()).filter((set) => set.size >= 3).reduce((sum, set) => sum + set.size, 0)
}

const sourceBytes = await readFile(path.join(dataRoot, 'sources/frequencywords-2018-en_50k.txt'))
if (createHash('sha256').update(sourceBytes).digest('hex') !== manifest.source.sourceSha256) errors.push('The pinned frequency source hash changed; re-run the importer and review the update.')

console.log('Frequency candidates: ' + candidates.length + '/' + targetCount + '; excluded positions: ' + manifest.excludedPositionCount + '.')
console.log('Published: ' + reviewed.length + '; Vietnamese meanings: ' + reviewed.filter((word) => word.meaningVi).length + '; IPA: ' + reviewed.filter((word) => word.ipa).length + '; MP3: ' + reviewed.filter((word) => word.audioUrl).length + '; images: ' + reviewed.filter((word) => word.image).length + '.')
console.log('Playable prompt words (strict category/POS/tier groups): image ' + countPlayable('word-image') + ', meaning ' + countPlayable('word-meaning') + ', audio+TTS ' + countPlayable('audio-word', true) + '.')
for (const [tier, min, max] of bands) {
  const rows = candidates.filter((word) => word.frequencyRank >= min && word.frequencyRank <= max).length
  const words = reviewed.filter((word) => word.frequencyRank >= min && word.frequencyRank <= max).length
  console.log('Tier ' + tier + ' ranks ' + min + '-' + max + ': ' + rows + ' candidates, ' + words + ' reviewed.')
}
if (errors.length) {
  console.error(errors.map((error) => 'ERROR: ' + error).join('\n'))
  process.exitCode = 1
}

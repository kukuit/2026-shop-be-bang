import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const sourcePath = path.join(root, 'src/data/vocabulary/sources/frequencywords-2018-en_50k.txt')
const curatedPath = path.join(root, 'src/data/vocabulary/reviewed-content.json')
const outputRoot = path.join(root, 'src/data/vocabulary')
const firstRank = 1
const targetRankCount = 3000
const bands = [
  { tier: 1, minRank: 1, maxRank: 50 },
  { tier: 2, minRank: 51, maxRank: 100 },
  { tier: 3, minRank: 101, maxRank: 200 },
  { tier: 4, minRank: 201, maxRank: 300 },
  { tier: 5, minRank: 301, maxRank: 500 },
  { tier: 6, minRank: 501, maxRank: 750 },
  { tier: 7, minRank: 751, maxRank: 1000 },
  { tier: 8, minRank: 1001, maxRank: 2000 },
  { tier: 9, minRank: 2001, maxRank: 3000 },
]

const getTier = (rank) => bands.find((band) => rank >= band.minRank && rank <= band.maxRank)?.tier ?? null
const stableId = (word) => `en-${word.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
const sourceText = await readFile(sourcePath, 'utf8')
const sourceHash = createHash('sha256').update(sourceText).digest('hex')
const sourceLines = sourceText.split(/\r?\n/).filter(Boolean)
const byTier = Object.fromEntries(bands.map(({ tier }) => [tier, []]))
const candidates = []
const skipped = []
const seenWords = new Set()
const seenIds = new Set()

for (let index = firstRank - 1; index < Math.min(targetRankCount, sourceLines.length); index += 1) {
  const [rawWord, rawCount] = sourceLines[index].trim().split(/\s+/)
  const sourceRank = index + 1
  const word = rawWord?.normalize('NFC').toLocaleLowerCase('en-US')
  const count = Number(rawCount)
  if (!word || !/^[a-z]+(?:['-][a-z]+)*$/.test(word) || !Number.isSafeInteger(count) || count < 1) {
    skipped.push({ sourceRank, token: rawWord ?? '' })
    continue
  }
  if (seenWords.has(word)) {
    skipped.push({ sourceRank, token: rawWord, reason: 'duplicate-normalized-form' })
    continue
  }
  const id = stableId(word)
  if (seenIds.has(id)) throw new Error(`Stable ID collision for "${word}" (${id}).`)
  seenWords.add(word)
  seenIds.add(id)
  const frequencyTier = getTier(sourceRank)
  const candidate = {
    id,
    word,
    senses: [],
    frequencyRank: sourceRank,
    frequencyTier,
    sourceRank,
    sourceFrequencyCount: count,
    categories: [],
    visualType: 'none',
    status: 'draft',
  }
  candidates.push(candidate)
  byTier[frequencyTier].push(candidate)
}

const sourceManifest = {
  source: {
    name: 'FrequencyWords, English 2018 OpenSubtitles list',
    author: 'Hermit Dave',
    version: '2018',
    commit: '525f9b560de45753a5ea01069454e72e9aa541c6',
    sourceFile: 'content/2018/en/en_50k.txt',
    url: 'https://github.com/hermitdave/FrequencyWords/tree/525f9b560de45753a5ea01069454e72e9aa541c6/content/2018/en',
    license: 'CC BY-SA 4.0',
    sourceSha256: sourceHash,
    rankDefinition: 'Original 1-based line position in the pinned frequency-sorted list; entries are filtered without renumbering.',
  },
  targetRankCount,
  importedCandidateCount: candidates.length,
  excludedPositionCount: skipped.length,
  excludedSourceRanks: skipped.map(({ sourceRank }) => sourceRank),
  frequencyBands: Object.fromEntries(bands.map(({ tier, minRank, maxRank }) => [tier, {
    minRank,
    maxRank,
    candidateCount: byTier[tier].length,
  }])),
}

const curatedContent = JSON.parse(await readFile(curatedPath, 'utf8'))
const candidateById = new Map(candidates.map((word) => [word.id, word]))
const reviewed = curatedContent.map((content) => {
  const candidate = candidateById.get(content.id)
  if (!candidate) throw new Error(`Reviewed vocabulary item "${content.id}" is not in source ranks 1–${targetRankCount}.`)
  if (content.status && content.status !== 'published') throw new Error(`Reviewed item "${content.id}" must be published.`)
  if (!content.meaningVi?.trim() || !Array.isArray(content.senses) || content.senses.length === 0) {
    throw new Error(`Published item "${content.id}" needs a Vietnamese meaning and at least one explicit sense.`)
  }
  return { ...candidate, ...content, status: 'published' }
})

await mkdir(path.join(outputRoot, 'words'), { recursive: true })
for (const { tier } of bands) {
  await writeFile(path.join(outputRoot, 'words', `tier-${tier}.json`), `${JSON.stringify(byTier[tier], null, 2)}\n`)
}
await writeFile(path.join(outputRoot, 'reviewed.json'), `${JSON.stringify(reviewed, null, 2)}\n`)
await writeFile(path.join(outputRoot, 'frequency-manifest.json'), `${JSON.stringify(sourceManifest, null, 2)}\n`)

const tierSummary = Object.entries(sourceManifest.frequencyBands).map(([tier, band]) => `L${tier}: ${band.candidateCount}`).join(', ')
console.log(`Imported ${candidates.length}/${targetRankCount} unique lexical candidates; excluded ${skipped.length} non-word or duplicate positions.`)
console.log(`Published metadata overlays: ${reviewed.length}. Frequency candidates remain draft until editorial fields are supplied.`)
console.log(`Tier candidates: ${tierSummary}`)

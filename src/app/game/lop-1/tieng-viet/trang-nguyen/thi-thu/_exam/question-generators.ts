import availableVoiceFiles from './available-voice-files.json'
import tagNameManifest from '@/../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/tag-name.manifest.json'
import objectNameManifest from '@/../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/object-name.manifest.json'
import flowerNameManifest from '@/../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/flower-name.manifest.json'
import letterCardAnimalsManifest from '@/../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/letter-card-animals.manifest.json'
import transportationManifest from '@/../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/transportation.manifest.json'
import dinoLetterSoundManifest from '@/../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/dino-letter-sound.manifest.json'
import { CLASSIFICATION_MANIFEST_REGISTRY, getClassificationSprite } from './classification-assets'
import { getQuestion25Visual, QUESTION_25_CATEGORY_META, QUESTION_25_ENABLED_CATEGORIES, QUESTION_25_PROMPT, QUESTION_25_WORDS } from './question25-knowledge'
import { buildQuestion27Sentence, getQuestion27Sounds, QUESTION_27_PROMPT, QUESTION_27_TEXT_MATCHED_WORDS, QUESTION_27_WORDS } from './question27-knowledge'
import {
  getQuestion29AssetVisual,
  QUESTION_28_29_ENABLED_ASSETS,
  QUESTION_29_ALLOWED_LETTERS,
  QUESTION_29_ASSETS,
  QUESTION_29_LETTER_CONFUSION_MAP,
  QUESTION_29_SENTENCE_PREFIX,
} from './question28-29-knowledge'
import {
  getQuestion30AllowedColorIds,
  getQuestion30CombinationKey,
  getQuestion30FruitVisual,
  getQuestion30SelectionSignature,
  getQuestion30VoiceSequence,
  QUESTION_30_ALLOWED_LETTERS,
  QUESTION_30_COLOR_POOL,
  QUESTION_30_FRUIT_POOL,
  QUESTION_30_PROMPT,
  QUESTION_30_RECENT_KEY,
  question30SelectionRepeatsRecent,
} from './question30-knowledge'
import { getQuestion24ActorPool, getQuestion24TargetPool, getQuestion24Voice, getQuestion24Visual, QUESTION_24_LEARNING_KEY, QUESTION_24_PROMPT, QUESTION_24_PROMPT_VOICE } from './question24-knowledge'
import { emojiVisual, letterVisual } from './mock-assets'
import { pick, pickDistractors, shuffle, stableHash } from './shuffle'
import {
  AVAILABLE_WORD_VOICES, FLOWERS, FRUITS, OBJECTS, ROOTS,
  VEGETABLES, VIETNAMESE_ALPHABET, WORD_BANK, letterVoice,
  type VietnameseWord,
} from './vietnamese-data'
import type { AlphabetOrderData, AnimatedQuestion24Data, AnimatedQuestion24Motion, AnimatedQuestion24TargetMode, ClassificationDragDropData, ClassificationItem, ClassificationManifestId, CommonSoundData, CommonSoundWordItem, CountLetterBoardItem, ExamOption, ExamOptionLabel, ExamQuestion, ExamQuestionType, ExamVisual, FindTargetObjectTheme, GeneratedExamQuestion, HiddenLetterContainerScene, HiddenLetterRelation, HiddenLetterSceneData, HiddenLetterSceneItem, ImageResemblesLetterData, ImageSoundMatchData, ImageWordAnalysisData, LetterBoardData, LetterBoardDecoration, LetterBoardSlot, LetterCardData, LetterCardDecorationIcon, LetterCardDecorationPosition, LetterCardShape, LowerUpperMatchData, LowerUpperMatchItem, NumberCardData, NumberCardDecoration, ObjectSoundMatchData, Question25AnalysisMode, Question25Category, Question25WordKnowledgeItem, Question30Data, Question30Item, RotatedLetterBoardItem, RotatedLetterBoardStyle, SameLetterMatchAsset, SameLetterMatchData, SameLetterMatchItem, VehicleOrderData } from './types'

type Random = () => number
export type QuestionGenerationContext = { recentQuestionKeys: Record<string, string[]> }
const labels: ExamOptionLabel[] = ['A', 'B', 'C', 'D', 'E', 'F']
// Keep in sync with MP3 files under public/games/lessons/lop-1/tieng-viet/trang-nguyen/voices.
const availableVoiceFileSet = new Set<string>(availableVoiceFiles)
const alphOrder = new Map<string, number>(VIETNAMESE_ALPHABET.map((letter, index) => [letter, index]))
const optionId = (value: string) => encodeURIComponent(value.normalize('NFC').toLocaleLowerCase('vi-VN'))
const visualForWord = (word: VietnameseWord): ExamVisual => emojiVisual(word.emoji, word.word)
const questionId = (seedHash: string, templateId: string) => `q-${seedHash}-${templateId}`

function baseQuestion(
  seedHash: string,
  templateId: `T${string}`,
  type: ExamQuestionType,
  prompt: string,
  correctAnswer: GeneratedExamQuestion['correctAnswer'],
  args: { difficulty?: 1 | 2 | 3; promptVoice?: string | string[]; options?: ExamOption[]; data?: Record<string, unknown>; content?: ExamQuestion['content']; knowledgeKey?: string; subType?: string } = {},
): GeneratedExamQuestion {
  return {
    id: questionId(seedHash, templateId), templateId, number: 0, type, prompt, correctAnswer, subType: args.subType,
    difficulty: args.difficulty ?? 1, options: args.options, data: args.data, content: args.content,
    promptVoice: args.promptVoice, knowledgeKey: args.knowledgeKey ?? templateId,
  }
}

function makeOptions(items: Array<{ id: string; text?: string; visual?: ExamVisual; voice?: string }>, random: Random): ExamOption[] {
  return shuffle(items, random).map((item, index) => ({ ...item, label: labels[index] }))
}

function textOptions(values: readonly string[], random: Random): ExamOption[] {
  return makeOptions(values.map(value => ({ id: `letter-${optionId(value)}`, text: value, visual: letterVisual(value) })), random)
}

function selectChoice<T extends { id: string; word: string; emoji: string; audio?: string }>(
  items: readonly T[], random: Random, count = 4,
): { selected: T[]; options: ExamOption[] } {
  const selected = pickDistractors({ pool: items, exclude: [], count, random })
  const options = makeOptions(selected.map(item => ({ id: item.id, text: item.word, visual: emojiVisual(item.emoji, item.word), voice: item.audio })), random)
  return { selected, options }
}

function matchingQuestion(args: {
  seedHash: string; templateId: `T${string}`; prompt: string; random: Random
  pairs: Array<{ id: string; left: ExamOption; right: ExamOption }>; difficulty?: 1 | 2 | 3
}): GeneratedExamQuestion {
  const left = shuffle(args.pairs, args.random).map(pair => pair.left)
  const right = shuffle(args.pairs, args.random).map(pair => pair.right)
  const correctAnswer = Object.fromEntries(args.pairs.map(pair => [pair.left.id, pair.right.id]))
  return baseQuestion(args.seedHash, args.templateId, 'matching', args.prompt, correctAnswer, {
    difficulty: args.difficulty ?? 2, data: { leftItems: left, rightItems: right },
  })
}

export const FIND_TARGET_SINGLE_LETTERS = [
  'a', 'b', 'c', 'd', 'đ', 'e', 'ê', 'g', 'h', 'i', 'k', 'l', 'm', 'n',
  'o', 'ô', 'ơ', 'p', 'q', 'r', 's', 't', 'u', 'ư', 'v', 'x', 'y',
] as const

export const FIND_TARGET_EXCLUDED_COMPOUNDS = [
  'ch', 'gh', 'gi', 'kh', 'ng', 'ngh', 'nh', 'ph', 'th', 'tr',
] as const

export const FIND_TARGET_FORBIDDEN_PAIRS = [['i', 'y']] as const

function hasFindTargetForbiddenPair(letters: readonly string[]): boolean {
  return FIND_TARGET_FORBIDDEN_PAIRS.some(([first, second]) => letters.includes(first) && letters.includes(second))
}

function pickSafeFindTargetDistractors(args: {
  pool: readonly string[]
  selected: readonly string[]
  count: number
  random: Random
}): string[] {
  if (args.count === 0) return []
  const distractors: string[] = []
  for (const candidate of shuffle(args.pool, args.random)) {
    if (args.selected.includes(candidate) || distractors.includes(candidate)) continue
    if (hasFindTargetForbiddenPair([...args.selected, ...distractors, candidate])) continue
    distractors.push(candidate)
    if (distractors.length === args.count) break
  }
  if (distractors.length !== args.count) throw new Error('Unable to generate safe FIND_TARGET_LETTER_IN_OBJECT distractors')
  return distractors
}

export const FIND_TARGET_OBJECT_THEMES = ['star', 'balloon', 'gift', 'candy'] as const

export const FIND_TARGET_OBJECT_VARIANTS: Record<FindTargetObjectTheme, readonly string[]> = {
  star: ['star-yellow', 'star-pink', 'star-purple', 'star-blue'],
  balloon: ['balloon-red', 'balloon-yellow', 'balloon-green', 'balloon-blue'],
  gift: ['gift-red', 'gift-yellow', 'gift-purple', 'gift-green'],
  candy: ['candy-pink', 'candy-orange', 'candy-blue', 'candy-purple'],
}

export const FIND_TARGET_CONFUSION_MAP: Partial<Record<string, readonly string[]>> = {
  b: ['d', 'p', 'q'], d: ['đ', 'b', 'p'], đ: ['d', 'b'], e: ['ê', 'c'], ê: ['e'],
  m: ['n'], n: ['m', 'h', 'u'], o: ['ô', 'ơ', 'a'], ô: ['o', 'ơ'], ơ: ['o', 'ô'],
  p: ['q', 'b', 'd'], q: ['p', 'g'], u: ['ư', 'n', 'v'], ư: ['u'], v: ['u', 'x'], x: ['v', 's'],
}

const FIND_TARGET_VARIANT_COLORS: Record<string, string> = {
  'star-yellow': '#f8c642', 'star-pink': '#f276b0', 'star-purple': '#ac51cc', 'star-blue': '#62d4e3',
  'balloon-red': '#f26d72', 'balloon-yellow': '#f7c94b', 'balloon-green': '#5fc98a', 'balloon-blue': '#58b9e7',
  'gift-red': '#ed6870', 'gift-yellow': '#f2c84b', 'gift-purple': '#aa6bd1', 'gift-green': '#58bd81',
  'candy-pink': '#f28bb5', 'candy-orange': '#f5a04c', 'candy-blue': '#67bde2', 'candy-purple': '#a47cda',
}

const STAR_PROMPTS = [
  'Ngôi sao nào có chữ “{letter}”?',
  'Hãy chọn ngôi sao có chữ “{letter}”.',
] as const
const BALLOON_PROMPTS = [
  'Bong bóng nào có chữ “{letter}”?',
  'Hãy chọn bong bóng có chữ “{letter}”.',
] as const
const GIFT_PROMPTS = [
  'Hộp quà nào có chữ “{letter}”?',
  'Hãy chọn hộp quà có chữ “{letter}”.',
] as const
const CANDY_PROMPTS = [
  'Viên kẹo nào có chữ “{letter}”?',
  'Hãy chọn viên kẹo có chữ “{letter}”.',
] as const

export const FIND_TARGET_PLANNED_VOICE_PATHS = [
  '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/objects/ngoi-sao.mp3',
  '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/objects/bong-bong.mp3',
  '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/objects/hop-qua.mp3',
  '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/objects/vien-keo.mp3',
  '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common/nao-co-chu.mp3',
  '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common/hay-chon.mp3',
  '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common/co-chu.mp3',
] as const

export const HEAR_IDENTIFY_LETTERS = [
  'a', 'b', 'c', 'ch', 'd', 'đ', 'e', 'ê', 'g', 'gh', 'gi', 'h', 'i',
  'k', 'kh', 'l', 'm', 'n', 'ng', 'ngh', 'nh', 'o', 'ô', 'ơ', 'p', 'ph',
  'q', 'r', 's', 't', 'th', 'tr', 'u', 'ư', 'v', 'x', 'y',
] as const

export type HearIdentifyLetter = typeof HEAR_IDENTIFY_LETTERS[number]

const TRANG_NGUYEN_VOICE_ROOT = '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices'

export const HEAR_IDENTIFY_COMMON_VOICE = `${TRANG_NGUYEN_VOICE_ROOT}/common/day-la-phat-am-cua-chu-gi.mp3`

export const HEAR_IDENTIFY_VOICE_MAP: Record<HearIdentifyLetter, string> = {
  a: `${TRANG_NGUYEN_VOICE_ROOT}/letters/a.mp3`,
  b: `${TRANG_NGUYEN_VOICE_ROOT}/letters/b.mp3`,
  c: `${TRANG_NGUYEN_VOICE_ROOT}/letters/c.mp3`,
  ch: `${TRANG_NGUYEN_VOICE_ROOT}/letters/ch.mp3`,
  d: `${TRANG_NGUYEN_VOICE_ROOT}/letters/d.mp3`,
  đ: `${TRANG_NGUYEN_VOICE_ROOT}/letters/dd.mp3`,
  e: `${TRANG_NGUYEN_VOICE_ROOT}/letters/e.mp3`,
  ê: `${TRANG_NGUYEN_VOICE_ROOT}/letters/ee.mp3`,
  g: `${TRANG_NGUYEN_VOICE_ROOT}/letters/g.mp3`,
  gh: `${TRANG_NGUYEN_VOICE_ROOT}/letters/gh.mp3`,
  gi: `${TRANG_NGUYEN_VOICE_ROOT}/letters/gi.mp3`,
  h: `${TRANG_NGUYEN_VOICE_ROOT}/letters/h.mp3`,
  i: `${TRANG_NGUYEN_VOICE_ROOT}/letters/i.mp3`,
  k: `${TRANG_NGUYEN_VOICE_ROOT}/letters/k.mp3`,
  kh: `${TRANG_NGUYEN_VOICE_ROOT}/letters/kh.mp3`,
  l: `${TRANG_NGUYEN_VOICE_ROOT}/letters/l.mp3`,
  m: `${TRANG_NGUYEN_VOICE_ROOT}/letters/m.mp3`,
  n: `${TRANG_NGUYEN_VOICE_ROOT}/letters/n.mp3`,
  ng: `${TRANG_NGUYEN_VOICE_ROOT}/letters/ng.mp3`,
  ngh: `${TRANG_NGUYEN_VOICE_ROOT}/letters/ngh.mp3`,
  nh: `${TRANG_NGUYEN_VOICE_ROOT}/letters/nh.mp3`,
  o: `${TRANG_NGUYEN_VOICE_ROOT}/letters/o.mp3`,
  ô: `${TRANG_NGUYEN_VOICE_ROOT}/letters/oo.mp3`,
  ơ: `${TRANG_NGUYEN_VOICE_ROOT}/letters/ow.mp3`,
  p: `${TRANG_NGUYEN_VOICE_ROOT}/letters/p.mp3`,
  ph: `${TRANG_NGUYEN_VOICE_ROOT}/letters/ph.mp3`,
  q: `${TRANG_NGUYEN_VOICE_ROOT}/letters/q.mp3`,
  r: `${TRANG_NGUYEN_VOICE_ROOT}/letters/r.mp3`,
  s: `${TRANG_NGUYEN_VOICE_ROOT}/letters/s.mp3`,
  t: `${TRANG_NGUYEN_VOICE_ROOT}/letters/t.mp3`,
  th: `${TRANG_NGUYEN_VOICE_ROOT}/letters/th.mp3`,
  tr: `${TRANG_NGUYEN_VOICE_ROOT}/letters/tr.mp3`,
  u: `${TRANG_NGUYEN_VOICE_ROOT}/letters/u.mp3`,
  ư: `${TRANG_NGUYEN_VOICE_ROOT}/letters/uw.mp3`,
  v: `${TRANG_NGUYEN_VOICE_ROOT}/letters/v.mp3`,
  x: `${TRANG_NGUYEN_VOICE_ROOT}/letters/x.mp3`,
  y: `${TRANG_NGUYEN_VOICE_ROOT}/letters/y.mp3`,
}

const HEAR_IDENTIFY_FORBIDDEN_PAIRS = [
  ['g', 'gh'],
  ['ng', 'ngh'],
  ['i', 'y'],
] as const

function hasForbiddenHearIdentifyPair(letters: readonly string[]): boolean {
  return HEAR_IDENTIFY_FORBIDDEN_PAIRS.some(([first, second]) => letters.includes(first) && letters.includes(second))
}

function makeSafeHearIdentifyChoices(target: HearIdentifyLetter, random: Random): HearIdentifyLetter[] {
  const choices: HearIdentifyLetter[] = [target]
  for (const candidate of shuffle(HEAR_IDENTIFY_LETTERS, random)) {
    if (candidate === target || choices.includes(candidate)) continue
    if (hasForbiddenHearIdentifyPair([...choices, candidate])) continue
    choices.push(candidate)
    if (choices.length === 4) break
  }
  if (choices.length !== 4) throw new Error('Unable to generate safe HEAR_AND_IDENTIFY_LETTER choices')
  return shuffle(choices, random)
}

export function generateHearIdentifyLetterQuestion(args: {
  seedHash: string
  random: Random
  templateId?: 'T03' | 'T04'
  excludeTargets?: readonly string[]
}): GeneratedExamQuestion {
  const targetPool = HEAR_IDENTIFY_LETTERS.filter(letter => !args.excludeTargets?.includes(letter))
  const target = pick(targetPool, args.random)
  const options = makeOptions(makeSafeHearIdentifyChoices(target, args.random).map(letter => ({
    id: `letter-${optionId(letter)}`,
    text: `Chữ "${letter}"`,
  })), args.random)
  const correctAnswer = `letter-${optionId(target)}`
  return baseQuestion(args.seedHash, args.templateId ?? 'T03', 'audio-choice', 'Đây là phát âm của chữ gì?', correctAnswer, {
    promptVoice: [HEAR_IDENTIFY_COMMON_VOICE, HEAR_IDENTIFY_VOICE_MAP[target]],
    options,
    difficulty: 1,
    data: { generator: 'HEAR_AND_IDENTIFY_LETTER', target },
    knowledgeKey: 'HEAR_AND_IDENTIFY_LETTER',
  })
}

export function generateHearIdentifyQuestions(args: { seedHash: string; random: Random }): [GeneratedExamQuestion, GeneratedExamQuestion] {
  const question3 = generateHearIdentifyLetterQuestion({ ...args, templateId: 'T03' })
  const target3 = (question3.data as { target: HearIdentifyLetter }).target
  const question4 = generateHearIdentifyLetterQuestion({ ...args, templateId: 'T04', excludeTargets: [target3] })
  return [question3, question4]
}

const FIND_TARGET_VOICE_ROOT = '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices'
const FIND_TARGET_LETTER_VOICE_FILE: Record<string, string> = {
  'đ': 'dd', 'ê': 'ee', 'ô': 'oo', 'ơ': 'ow', 'ư': 'uw',
}

export function resolveFindTargetLetterVoice(letter: string): string | undefined {
  const normalizedLetter = letter.normalize('NFC').toLocaleLowerCase('vi-VN')
  const fileName = FIND_TARGET_LETTER_VOICE_FILE[normalizedLetter] ?? normalizedLetter
  const file = `${FIND_TARGET_VOICE_ROOT}/letters/${fileName}.mp3`
  return hasFindTargetVoiceFiles([file]) ? file : undefined
}

export type FindTargetDifficulty = 'easy' | 'medium'
export type GenerateFindTargetLetterOptions = {
  seedHash?: string
  random?: Random
  difficulty?: FindTargetDifficulty
  targetLetter?: string
  objectTheme?: FindTargetObjectTheme
}

export function buildFindTargetPrompt(objectTheme: FindTargetObjectTheme, targetLetter: string, random: Random = Math.random): string {
  const templates = objectTheme === 'star' ? STAR_PROMPTS
    : objectTheme === 'balloon' ? BALLOON_PROMPTS
      : objectTheme === 'gift' ? GIFT_PROMPTS : CANDY_PROMPTS
  return pick(templates, random).replace('{letter}', targetLetter)
}

export function getFindTargetDistractors(args: {
  targetLetter: string
  difficulty: FindTargetDifficulty
  count?: number
  random?: Random
}): string[] {
  const random = args.random ?? Math.random
  const count = args.count ?? 3
  const pool = FIND_TARGET_SINGLE_LETTERS.filter(letter => letter !== args.targetLetter)
  let selected: string[] = []
  if (args.difficulty === 'medium') {
    const confusionCandidates = (FIND_TARGET_CONFUSION_MAP[args.targetLetter] ?? [])
      .filter(letter => pool.includes(letter as typeof FIND_TARGET_SINGLE_LETTERS[number]))
    const safeConfusionCandidates = confusionCandidates.filter(letter => !hasFindTargetForbiddenPair([args.targetLetter, letter]))
    const confusionCount = Math.min(safeConfusionCandidates.length, count, 1 + Math.floor(random() * 2))
    selected = pickSafeFindTargetDistractors({ pool: safeConfusionCandidates, selected: [args.targetLetter], count: confusionCount, random })
  }
  return [...selected, ...pickSafeFindTargetDistractors({
    pool,
    selected: [args.targetLetter, ...selected],
    count: count - selected.length,
    random,
  })]
}

export function validateFindTargetChoices(targetLetter: string, choices: ExamOption[], correctChoiceId: string): void {
  if (choices.length !== 4) throw new Error('FIND_TARGET_LETTER_IN_OBJECT requires exactly 4 choices')
  const letters = choices.map(choice => choice.visual?.value.normalize('NFC').toLocaleLowerCase('vi-VN'))
  if (letters.some(letter => !letter || !FIND_TARGET_SINGLE_LETTERS.includes(letter as typeof FIND_TARGET_SINGLE_LETTERS[number])))
    throw new Error('FIND_TARGET_LETTER_IN_OBJECT contains a letter outside the single-letter pool')
  if (new Set(letters).size !== choices.length) throw new Error('FIND_TARGET_LETTER_IN_OBJECT contains duplicate letters')
  if (hasFindTargetForbiddenPair(letters.filter((letter): letter is string => Boolean(letter))))
    throw new Error('FIND_TARGET_LETTER_IN_OBJECT contains confusing i/y choices together')
  if (letters.filter(letter => letter === targetLetter).length !== 1 || choices.filter(choice => choice.id === correctChoiceId).length !== 1)
    throw new Error('FIND_TARGET_LETTER_IN_OBJECT requires exactly one target answer')
  for (const choice of choices) {
    if (choice.visual?.type !== 'object-letter' || !choice.visual.objectTheme)
      throw new Error('FIND_TARGET_LETTER_IN_OBJECT choice is missing its object visual')
    if (choice.visual.objectTheme !== choices[0].visual?.objectTheme)
      throw new Error('FIND_TARGET_LETTER_IN_OBJECT choices must use exactly one object theme')
  }
}

function hasFindTargetVoiceFiles(files: string[]): boolean {
  return files.every(file => availableVoiceFileSet.has(file))
}

function resolveFindTargetVoice(promptText: string, objectTheme: FindTargetObjectTheme, targetLetter: string): string[] | undefined {
  const root = FIND_TARGET_VOICE_ROOT
  const objectVoices: Record<FindTargetObjectTheme, string> = {
    star: `${root}/objects/ngoi-sao.mp3`,
    balloon: `${root}/objects/bong-bong.mp3`,
    gift: `${root}/objects/hop-qua.mp3`,
    candy: `${root}/objects/vien-keo.mp3`,
  }
  const letterVoice = resolveFindTargetLetterVoice(targetLetter)
  if (!letterVoice) return undefined
  let files: string[] | undefined
  if (objectTheme === 'star' && promptText.startsWith('Ngôi sao nào có chữ')) {
    files = [objectVoices.star, `${root}/common/nao-co-chu.mp3`, letterVoice]
  } else if (objectTheme === 'star' && promptText.startsWith('Hãy chọn ngôi sao có chữ')) {
    files = [`${root}/common/hay-chon.mp3`, objectVoices.star, `${root}/common/co-chu.mp3`, letterVoice]
  } else if (objectTheme === 'balloon' && promptText.startsWith('Bong bóng nào có chữ')) {
    files = [objectVoices.balloon, `${root}/common/nao-co-chu.mp3`, letterVoice]
  } else if (objectTheme === 'balloon' && promptText.startsWith('Hãy chọn bong bóng có chữ')) {
    files = [`${root}/common/hay-chon.mp3`, objectVoices.balloon, `${root}/common/co-chu.mp3`, letterVoice]
  } else if (objectTheme === 'gift' && promptText.startsWith('Hộp quà nào có chữ')) {
    files = [objectVoices.gift, `${root}/common/nao-co-chu.mp3`, letterVoice]
  } else if (objectTheme === 'gift' && promptText.startsWith('Hãy chọn hộp quà có chữ')) {
    files = [`${root}/common/hay-chon.mp3`, objectVoices.gift, `${root}/common/co-chu.mp3`, letterVoice]
  } else if (objectTheme === 'candy' && promptText.startsWith('Viên kẹo nào có chữ')) {
    files = [objectVoices.candy, `${root}/common/nao-co-chu.mp3`, letterVoice]
  } else if (objectTheme === 'candy' && promptText.startsWith('Hãy chọn viên kẹo có chữ')) {
    files = [`${root}/common/hay-chon.mp3`, objectVoices.candy, `${root}/common/co-chu.mp3`, letterVoice]
  }

  return files && hasFindTargetVoiceFiles(files) ? files : undefined
}

export function generateFindTargetLetterInObjectQuestion(options: GenerateFindTargetLetterOptions = {}): GeneratedExamQuestion {
  const random = options.random ?? Math.random
  const seedHash = options.seedHash ?? stableHash(`${Date.now()}-${random()}-${random()}`)
  const difficulty = options.difficulty ?? 'easy'
  const targetLetter = options.targetLetter ?? pick(FIND_TARGET_SINGLE_LETTERS, random)
  if (!FIND_TARGET_SINGLE_LETTERS.includes(targetLetter as typeof FIND_TARGET_SINGLE_LETTERS[number]))
    throw new Error(`FIND_TARGET_LETTER_IN_OBJECT has invalid target letter: ${targetLetter}`)
  const objectTheme = options.objectTheme ?? pick(FIND_TARGET_OBJECT_THEMES, random)
  const distractors = getFindTargetDistractors({ targetLetter, difficulty, random })
  const letters = shuffle([targetLetter, ...distractors], random)
  const variants = shuffle(FIND_TARGET_OBJECT_VARIANTS[objectTheme], random)
  const choices = makeOptions(letters.map((letter, index) => {
    const objectVariant = variants[index]
    const visual: ExamVisual = {
      type: 'object-letter', value: letter, label: `${objectTheme} có chữ ${letter}`,
      objectTheme, objectVariant, accent: FIND_TARGET_VARIANT_COLORS[objectVariant],
    }
    return {
      id: `object-${objectTheme}-${optionId(letter)}`,
      visual,
      voice: resolveFindTargetLetterVoice(letter),
    }
  }), random)
  const correctChoiceId = `object-${objectTheme}-${optionId(targetLetter)}`
  validateFindTargetChoices(targetLetter, choices, correctChoiceId)
  const prompt = buildFindTargetPrompt(objectTheme, targetLetter, random)
  const promptVoice = resolveFindTargetVoice(prompt, objectTheme, targetLetter)

  return baseQuestion(seedHash, 'T01', 'single-choice', prompt, correctChoiceId, {
    difficulty: difficulty === 'easy' ? 1 : 2,
    options: choices,
    promptVoice,
    data: { generator: 'FIND_TARGET_LETTER_IN_OBJECT', difficulty, targetLetter, objectTheme },
  })
}

function generateT01(seedHash: string, random: Random) {
  return generateFindTargetLetterInObjectQuestion({ seedHash, random, difficulty: 'easy' })
}

const FIND_TARGET_OBJECT_NAMES: Record<FindTargetObjectTheme, string> = {
  star: 'Ngôi sao',
  balloon: 'Bong bóng',
  gift: 'Hộp quà',
  candy: 'Viên kẹo',
}

export function generateFindTargetLetterInObjectImageQuestion(args: { seedHash: string; random: Random }): GeneratedExamQuestion {
  const targetLetter = pick(FIND_TARGET_SINGLE_LETTERS, args.random)
  const objectTheme = pick(FIND_TARGET_OBJECT_THEMES, args.random)
  const distractors = getFindTargetDistractors({ targetLetter, difficulty: 'easy', random: args.random })
  const letters = shuffle([targetLetter, ...distractors], args.random)
  const variants = shuffle(FIND_TARGET_OBJECT_VARIANTS[objectTheme], args.random)
  const options = makeOptions(letters.map((letter, index) => {
    const objectVariant = variants[index]
    return {
      id: `object-${objectTheme}-${optionId(letter)}`,
      visual: {
        type: 'object-letter' as const,
        value: letter,
        label: `${FIND_TARGET_OBJECT_NAMES[objectTheme]} có chữ ${letter}`,
        objectTheme,
        objectVariant,
        accent: FIND_TARGET_VARIANT_COLORS[objectVariant],
      },
    }
  }), args.random)
  const correctChoiceId = `object-${objectTheme}-${optionId(targetLetter)}`
  const prompt = buildFindTargetPrompt(objectTheme, targetLetter, args.random)
  const promptVoice = resolveFindTargetVoice(prompt, objectTheme, targetLetter)
  if (!promptVoice) throw new Error(`FIND_TARGET_LETTER_IN_OBJECT_IMAGE is missing voice assets for target ${targetLetter}`)
  validateFindTargetObjectImageChoices(targetLetter, objectTheme, options, correctChoiceId)
  return baseQuestion(args.seedHash, 'T02', 'image-choice', prompt, correctChoiceId, {
    options,
    difficulty: 1,
    promptVoice,
    data: { generator: 'FIND_TARGET_LETTER_IN_OBJECT_IMAGE', targetLetter, objectTheme },
  })
}

export function validateFindTargetObjectImageChoices(targetLetter: string, objectTheme: FindTargetObjectTheme, choices: ExamOption[], correctChoiceId: string): void {
  if (choices.length !== 4) throw new Error('FIND_TARGET_LETTER_IN_OBJECT_IMAGE requires exactly 4 choices')
  const letters = choices.map(choice => choice.visual?.value.normalize('NFC').toLocaleLowerCase('vi-VN'))
  if (letters.some(letter => !letter || !FIND_TARGET_SINGLE_LETTERS.includes(letter as typeof FIND_TARGET_SINGLE_LETTERS[number])))
    throw new Error('FIND_TARGET_LETTER_IN_OBJECT_IMAGE contains a letter outside the single-letter pool')
  if (new Set(letters).size !== choices.length) throw new Error('FIND_TARGET_LETTER_IN_OBJECT_IMAGE contains duplicate letters')
  if (hasFindTargetForbiddenPair(letters.filter((letter): letter is string => Boolean(letter))))
    throw new Error('FIND_TARGET_LETTER_IN_OBJECT_IMAGE contains confusing i/y choices together')
  if (letters.filter(letter => letter === targetLetter).length !== 1 || choices.filter(choice => choice.id === correctChoiceId).length !== 1)
    throw new Error('FIND_TARGET_LETTER_IN_OBJECT_IMAGE requires exactly one target answer')
  if (choices.some(choice => choice.voice || choice.visual?.type !== 'object-letter' || choice.visual.objectTheme !== objectTheme))
    throw new Error('FIND_TARGET_LETTER_IN_OBJECT_IMAGE choices must use only images of one object theme')
  const variants = choices.map(choice => choice.visual?.objectVariant)
  if (new Set(variants).size !== choices.length || variants.some(variant => !variant || !FIND_TARGET_OBJECT_VARIANTS[objectTheme].includes(variant)))
    throw new Error('FIND_TARGET_LETTER_IN_OBJECT_IMAGE must use four distinct object images')
}

function generateT02(seedHash: string, random: Random) {
  return generateFindTargetLetterInObjectImageQuestion({ seedHash, random })
}

function generateT03(seedHash: string, random: Random) {
  return generateHearIdentifyLetterQuestion({ seedHash, random, templateId: 'T03' })
}

function generateT04(seedHash: string, random: Random) {
  return generateHearIdentifyLetterQuestion({ seedHash, random, templateId: 'T04' })
}

export const TAG_NAME_TARGET_LETTERS = [
  'a', 'b', 'c', 'd', 'đ', 'e', 'ê', 'g', 'h', 'i', 'k', 'l', 'm', 'n',
  'o', 'ô', 'ơ', 'p', 'q', 'r', 's', 't', 'u', 'ư', 'v', 'x', 'y',
] as const

export type TagNameTargetLetter = typeof TAG_NAME_TARGET_LETTERS[number]

export const TAG_NAME_COMMON_VOICE = '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common/the-ten-con-vat-nao-co-chu.mp3'

type TagNameItem = typeof tagNameManifest.items[number]

export function generateFindLetterInAnimalNameQuestion(args: {
  seedHash: string
  random: Random
  targetLetter?: string
}): GeneratedExamQuestion {
  const targetLetter = args.targetLetter ?? pick(TAG_NAME_TARGET_LETTERS, args.random)
  if (!TAG_NAME_TARGET_LETTERS.includes(targetLetter as TagNameTargetLetter))
    throw new Error(`FIND_LETTER_IN_ANIMAL_NAME has invalid target letter: ${targetLetter}`)

  const correctItem = tagNameManifest.items.find(item => item.targetLetter === targetLetter)
  if (!correctItem) throw new Error(`Missing animal item for target letter: ${targetLetter}`)
  const distractorPool = tagNameManifest.items.filter(item => item.id !== correctItem.id && !item.letters.includes(targetLetter))
  const distractors = pickDistractors({ pool: distractorPool, exclude: [], count: 3, random: args.random })
  const selected: TagNameItem[] = [correctItem, ...distractors]
  const letterVoicePath = resolveFindTargetLetterVoice(targetLetter)
  if (!letterVoicePath) throw new Error(`FIND_LETTER_IN_ANIMAL_NAME is missing the letter voice for target: ${targetLetter}`)

  const options = makeOptions(selected.map(item => ({
    id: `tag-name-${item.id}`,
    text: item.word,
    visual: tagNameAnimalVisual(item),
  })), args.random)
  const correctAnswer = `tag-name-${correctItem.id}`
  const correctChoices = options.filter(option => option.id === correctAnswer)
  const optionItemIds = options.map(option => option.id.replace(/^tag-name-/, ''))
  if (options.length !== 4 || new Set(optionItemIds).size !== 4 || correctChoices.length !== 1)
    throw new Error('FIND_LETTER_IN_ANIMAL_NAME requires four unique choices and exactly one correct answer')
  for (const option of options) {
    const itemId = option.id.replace(/^tag-name-/, '')
    const item = tagNameManifest.items.find(candidate => candidate.id === itemId)
    if (!item) throw new Error(`Missing tag-name manifest item: ${itemId}`)
    if (item.id === correctItem.id && item.targetLetter !== targetLetter)
      throw new Error(`Correct animal does not match target letter: ${targetLetter}`)
    if (item.id !== correctItem.id && item.letters.includes(targetLetter))
      throw new Error(`Distractor "${item.word}" also contains "${targetLetter}"`)
    if (option.visual?.sprite && (option.visual.sprite.x + option.visual.sprite.width > tagNameManifest.width
      || option.visual.sprite.y + option.visual.sprite.height > tagNameManifest.height))
      throw new Error(`Tag-name sprite is outside the sheet: ${itemId}`)
  }

  return baseQuestion(args.seedHash, 'T05', 'image-choice', `Thẻ tên con vật nào có chữ "${targetLetter}"?`, correctAnswer, {
    options,
    difficulty: 1,
    promptVoice: [TAG_NAME_COMMON_VOICE, letterVoicePath],
    data: { generator: 'FIND_LETTER_IN_ANIMAL_NAME', targetLetter, manifestId: tagNameManifest.id },
    knowledgeKey: 'FIND_LETTER_IN_ANIMAL_NAME',
  })
}

function tagNameAnimalVisual(item: TagNameItem): ExamVisual {
  return {
    type: 'image',
    value: tagNameManifest.image,
    label: item.word,
    sprite: {
      spriteSheet: tagNameManifest.image,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      sheetWidth: tagNameManifest.width,
      sheetHeight: tagNameManifest.height,
    },
  }
}

type ObjectNameItem = typeof objectNameManifest.items[number]

export const OBJECT_NAME_MANIFEST = objectNameManifest
export const FIND_OBJECT_BY_NAME_COMMON_VOICE = `${TRANG_NGUYEN_VOICE_ROOT}/common/dau-la.mp3`

export const OBJECT_QUESTION_TEXT: Record<string, string> = {
  mu: 'Đâu là cái mũ?',
  khan: 'Đâu là cái khăn?',
  dep: 'Đâu là đôi dép?',
  tat: 'Đâu là đôi tất?',
  'ba-lo': 'Đâu là cái ba lô?',
  'but-chi': 'Đâu là bút chì?',
  tay: 'Đâu là cục tẩy?',
  thuoc: 'Đâu là cây thước?',
  vo: 'Đâu là quyển vở?',
  sach: 'Đâu là quyển sách?',
  cap: 'Đâu là cái cặp?',
  'binh-nuoc': 'Đâu là bình nước?',
  o: 'Đâu là cái ô?',
  bong: 'Đâu là quả bóng?',
  'o-to': 'Đâu là ô tô?',
  'gau-bong': 'Đâu là gấu bông?',
  'dong-ho': 'Đâu là đồng hồ?',
  den: 'Đâu là cái đèn?',
  keo: 'Đâu là cái kéo?',
  luoc: 'Đâu là cái lược?',
  'ban-chai-danh-rang': 'Đâu là bàn chải đánh răng?',
  'xa-phong': 'Đâu là xà phòng?',
  coc: 'Đâu là cái cốc?',
  thia: 'Đâu là cái thìa?',
  ghe: 'Đâu là cái ghế?',
  'chia-khoa': 'Đâu là chìa khóa?',
  dieu: 'Đâu là cái diều?',
}

const OBJECT_VOICE_FILE_BY_ID: Record<string, string> = {
  mu: 'cai-mu.mp3',
  khan: 'cai-khan.mp3',
  dep: 'doi-dep.mp3',
  tat: 'doi-tat.mp3',
  'ba-lo': 'cai-ba-lo.mp3',
  'but-chi': 'but-chi.mp3',
  tay: 'cuc-tay.mp3',
  thuoc: 'cay-thuoc.mp3',
  vo: 'quyen-vo.mp3',
  sach: 'quyen-sach.mp3',
  cap: 'cai-cap.mp3',
  'binh-nuoc': 'binh-nuoc.mp3',
  o: 'cai-o.mp3',
  bong: 'qua-bong.mp3',
  'o-to': 'o-to.mp3',
  'gau-bong': 'gau-bong.mp3',
  'dong-ho': 'dong-ho.mp3',
  den: 'cai-den.mp3',
  keo: 'cai-keo.mp3',
  luoc: 'cai-luoc.mp3',
  'ban-chai-danh-rang': 'ban-chai-danh-rang.mp3',
  'xa-phong': 'xa-phong.mp3',
  coc: 'cai-coc.mp3',
  thia: 'cai-thia.mp3',
  ghe: 'cai-ghe.mp3',
  'chia-khoa': 'chia-khoa.mp3',
  dieu: 'cai-dieu.mp3',
}

const OBJECT_VOICE_ROOT = `${TRANG_NGUYEN_VOICE_ROOT}/objects`
export const OBJECT_VOICE_MAP: Record<string, string> = Object.fromEntries(objectNameManifest.items.map(item => {
  const fileName = OBJECT_VOICE_FILE_BY_ID[item.id]
  return [item.id, `${OBJECT_VOICE_ROOT}/${fileName}`]
}))

function resolveObjectNameVoice(item: ObjectNameItem): string | undefined {
  const voice = OBJECT_VOICE_MAP[item.id]
  return voice && hasFindTargetVoiceFiles([FIND_OBJECT_BY_NAME_COMMON_VOICE, voice]) ? voice : undefined
}

function objectNameChoiceId(objectId: string): string {
  return `object-name-${objectId}`
}

function objectNameVisual(item: ObjectNameItem): ExamVisual {
  return {
    type: 'image',
    value: objectNameManifest.image,
    label: item.word,
    sprite: {
      spriteSheet: objectNameManifest.image,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      sheetWidth: objectNameManifest.width,
      sheetHeight: objectNameManifest.height,
    },
  }
}

export function validateFindObjectByNameQuestion(question: GeneratedExamQuestion): void {
  const data = question.data as {
    targetObjectId?: unknown
    targetWord?: unknown
    targetVoiceFileName?: unknown
    targetVoiceAvailable?: unknown
    manifestId?: unknown
  } | undefined
  const targetObjectId = typeof data?.targetObjectId === 'string' ? data.targetObjectId : undefined
  const target = objectNameManifest.items.find(item => item.id === targetObjectId)
  const options = question.options ?? []
  const objectIds = options.map(option => option.id.startsWith('object-name-') ? option.id.slice('object-name-'.length) : '')
  const targetVoice = target ? resolveObjectNameVoice(target) : undefined
  const expectedPromptVoice = targetVoice ? [FIND_OBJECT_BY_NAME_COMMON_VOICE, targetVoice] : undefined

  if (question.type !== 'image-choice' || question.templateId !== 'T08' || question.data?.generator !== 'FIND_OBJECT_BY_NAME'
    || data?.manifestId !== objectNameManifest.id || !target || data?.targetWord !== target.word
    || data?.targetVoiceFileName !== (OBJECT_VOICE_FILE_BY_ID[target.id] ?? null)
    || data?.targetVoiceAvailable !== Boolean(targetVoice)
    || question.prompt !== OBJECT_QUESTION_TEXT[target.id]
    || options.length !== 4 || new Set(objectIds).size !== 4
    || objectIds.some(id => !objectNameManifest.items.some(item => item.id === id))
    || options.filter(option => option.id === question.correctAnswer).length !== 1
    || question.correctAnswer !== objectNameChoiceId(target.id)
    || options.some(option => {
      const item = objectNameManifest.items.find(candidate => candidate.id === option.id.slice('object-name-'.length))
      const crop = option.visual?.sprite
      return !item || option.text !== undefined || option.voice !== undefined || option.visual?.type !== 'image'
        || option.visual.value !== objectNameManifest.image || option.visual.label !== item.word || !crop
        || crop.spriteSheet !== objectNameManifest.image || crop.x !== item.x || crop.y !== item.y
        || crop.width !== item.width || crop.height !== item.height
        || crop.sheetWidth !== objectNameManifest.width || crop.sheetHeight !== objectNameManifest.height
        || item.x < 0 || item.y < 0 || item.width <= 0 || item.height <= 0
        || item.x + item.width > objectNameManifest.width || item.y + item.height > objectNameManifest.height
    })
    || (expectedPromptVoice
      ? !Array.isArray(question.promptVoice) || question.promptVoice.length !== 2
        || question.promptVoice[0] !== expectedPromptVoice[0] || question.promptVoice[1] !== expectedPromptVoice[1]
      : question.promptVoice !== undefined))
    throw new Error('FIND_OBJECT_BY_NAME has invalid target, image choices, answer, or voice sequence')
}

export function generateFindObjectByNameQuestion(args: {
  seedHash: string
  random: Random
  excludeObjectIds?: readonly string[]
  targetObjectId?: string
}): GeneratedExamQuestion {
  let target: ObjectNameItem
  if (args.targetObjectId !== undefined) {
    const match = objectNameManifest.items.find(item => item.id === args.targetObjectId)
    if (!match) throw new Error(`Unknown object id: ${args.targetObjectId}`)
    target = match
  } else {
    const excluded = new Set(args.excludeObjectIds ?? [])
    const pool = objectNameManifest.items.filter(item => !excluded.has(item.id))
    if (!pool.length) throw new Error('No available objects for FIND_OBJECT_BY_NAME')
    target = pick(pool, args.random)
  }

  const choices = shuffle([
    target,
    ...shuffle(objectNameManifest.items.filter(item => item.id !== target.id), args.random).slice(0, 3),
  ], args.random)
  const options = makeOptions(choices.map(item => ({
    id: objectNameChoiceId(item.id),
    visual: objectNameVisual(item),
  })), args.random)
  const targetVoice = resolveObjectNameVoice(target)
  const question = baseQuestion(args.seedHash, 'T08', 'image-choice', OBJECT_QUESTION_TEXT[target.id], objectNameChoiceId(target.id), {
    options,
    difficulty: 1,
    promptVoice: targetVoice ? [FIND_OBJECT_BY_NAME_COMMON_VOICE, targetVoice] : undefined,
    data: {
      generator: 'FIND_OBJECT_BY_NAME',
      manifestId: objectNameManifest.id,
      targetObjectId: target.id,
      targetWord: target.word,
      targetVoiceFileName: OBJECT_VOICE_FILE_BY_ID[target.id] ?? null,
      targetVoiceAvailable: Boolean(targetVoice),
    },
    knowledgeKey: 'OBJECT_RECOGNITION',
  })
  validateFindObjectByNameQuestion(question)
  return question
}

type FlowerNameItem = typeof flowerNameManifest.items[number]

const FLOWER_VOICE_FILE_BY_ID: Record<string, string> = {
  'hoa-lan': 'hoa-lan.mp3',
  'hoa-hong': 'hoa-hong.mp3',
  'hoa-huong-duong': 'hoa-huong-duong.mp3',
  'hoa-sen': 'hoa-sen.mp3',
  'hoa-tulip': 'hoa-tulip.mp3',
  'hoa-cuc': 'hoa-cuc.mp3',
  'hoa-ly': 'hoa-ly.mp3',
  'hoa-dam-but': 'hoa-dam-but.mp3',
}

const FLOWER_VOICE_ROOT = `${TRANG_NGUYEN_VOICE_ROOT}/flowers`
export const FLOWER_NAME_MANIFEST = flowerNameManifest
export const FIND_FLOWER_BY_IMAGE_COMMON_VOICE = `${TRANG_NGUYEN_VOICE_ROOT}/common/day-la-hoa-gi.mp3`
export const FLOWER_NAME_VOICE_MAP: Record<string, string> = Object.fromEntries(flowerNameManifest.items.flatMap(item => {
  const fileName = FLOWER_VOICE_FILE_BY_ID[item.id]
  return fileName ? [[item.id, `${FLOWER_VOICE_ROOT}/${fileName}`]] : []
}))

function flowerNameChoiceId(flowerId: string): string {
  return `flower-name-${flowerId}`
}

function flowerNameVisual(item: FlowerNameItem): ExamVisual {
  return {
    type: 'image',
    value: flowerNameManifest.image,
    label: 'Hình bông hoa',
    sprite: {
      spriteSheet: flowerNameManifest.image,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      sheetWidth: flowerNameManifest.width,
      sheetHeight: flowerNameManifest.height,
    },
  }
}

function resolveFlowerNameVoice(item: FlowerNameItem): string | undefined {
  const voice = FLOWER_NAME_VOICE_MAP[item.id]
  return voice && hasFindTargetVoiceFiles([FIND_FLOWER_BY_IMAGE_COMMON_VOICE, voice]) ? voice : undefined
}

export function validateFindFlowerByImageQuestion(question: GeneratedExamQuestion): void {
  const data = question.data as {
    targetFlowerId?: unknown
    targetWord?: unknown
    imageId?: unknown
    manifestId?: unknown
  } | undefined
  const targetFlowerId = typeof data?.targetFlowerId === 'string' ? data.targetFlowerId : undefined
  const target = flowerNameManifest.items.find(item => item.id === targetFlowerId)
  const options = question.options ?? []
  const flowerIds = options.map(option => option.id.startsWith('flower-name-') ? option.id.slice('flower-name-'.length) : '')
  const targetVoice = target ? resolveFlowerNameVoice(target) : undefined
  const targetVisual = target ? question.content?.visual : undefined
  const crop = targetVisual?.sprite

  if (flowerNameManifest.cropMode !== 'tight-bounds'
    || question.type !== 'image-choice' || question.templateId !== 'T09' || question.data?.generator !== 'FIND_FLOWER_BY_IMAGE'
    || data?.manifestId !== flowerNameManifest.id || !target || data?.imageId !== target.id || data?.targetWord !== target.word
    || question.prompt !== 'Đây là hoa gì?' || question.knowledgeKey !== 'FLOWER_RECOGNITION'
    || question.content?.type !== 'visual' || targetVisual?.type !== 'image' || targetVisual.value !== flowerNameManifest.image
    || targetVisual.label !== 'Hình bông hoa' || !crop || crop.spriteSheet !== flowerNameManifest.image
    || crop.x !== target.x || crop.y !== target.y || crop.width !== target.width || crop.height !== target.height
    || crop.sheetWidth !== flowerNameManifest.width || crop.sheetHeight !== flowerNameManifest.height
    || target.x < 0 || target.y < 0 || target.width <= 0 || target.height <= 0
    || target.x + target.width > flowerNameManifest.width || target.y + target.height > flowerNameManifest.height
    || options.length !== 4 || new Set(flowerIds).size !== 4
    || flowerIds.some(id => !flowerNameManifest.items.some(item => item.id === id))
    || options.some(option => {
      const item = flowerNameManifest.items.find(candidate => candidate.id === option.id.slice('flower-name-'.length))
      return !item || option.text !== item.word || option.voice !== FLOWER_NAME_VOICE_MAP[item.id]
        || option.visual !== undefined || option.voice === undefined
    })
    || options.filter(option => option.id === question.correctAnswer).length !== 1
    || question.correctAnswer !== flowerNameChoiceId(target.id)
    || !targetVoice || !Array.isArray(question.promptVoice) || question.promptVoice.length !== 1
    || question.promptVoice[0] !== FIND_FLOWER_BY_IMAGE_COMMON_VOICE)
    throw new Error('FIND_FLOWER_BY_IMAGE has invalid target image, choices, answer, or voice')
}

export function generateFindFlowerByImageQuestion(args: {
  seedHash: string
  random: Random
  excludeFlowerIds?: readonly string[]
  targetFlowerId?: string
}): GeneratedExamQuestion {
  let target: FlowerNameItem
  if (args.targetFlowerId !== undefined) {
    const match = flowerNameManifest.items.find(item => item.id === args.targetFlowerId)
    if (!match) throw new Error(`Unknown flower id: ${args.targetFlowerId}`)
    target = match
  } else {
    const excluded = new Set(args.excludeFlowerIds ?? [])
    const pool = flowerNameManifest.items.filter(item => !excluded.has(item.id))
    if (!pool.length) throw new Error('No available flowers for FIND_FLOWER_BY_IMAGE')
    target = pick(pool, args.random)
  }

  const targetVoice = resolveFlowerNameVoice(target)
  if (!targetVoice) throw new Error(`FIND_FLOWER_BY_IMAGE is missing voice assets for: ${target.word}`)
  const choices = [target, ...shuffle(flowerNameManifest.items.filter(item => item.id !== target.id), args.random).slice(0, 3)]
  const options = makeOptions(choices.map(item => {
    const voice = resolveFlowerNameVoice(item)
    if (!voice) throw new Error(`FIND_FLOWER_BY_IMAGE is missing voice assets for: ${item.word}`)
    return { id: flowerNameChoiceId(item.id), text: item.word, voice }
  }), args.random)

  const question = baseQuestion(args.seedHash, 'T09', 'image-choice', 'Đây là hoa gì?', flowerNameChoiceId(target.id), {
    options,
    difficulty: 1,
    promptVoice: [FIND_FLOWER_BY_IMAGE_COMMON_VOICE],
    content: { type: 'visual', visual: flowerNameVisual(target) },
    data: {
      generator: 'FIND_FLOWER_BY_IMAGE',
      manifestId: flowerNameManifest.id,
      targetFlowerId: target.id,
      targetWord: target.word,
      imageId: target.id,
    },
    knowledgeKey: 'FLOWER_RECOGNITION',
  })
  validateFindFlowerByImageQuestion(question)
  return question
}

const ANIMAL_VOICE_FILE_BY_ID: Record<string, string> = {
  a: 'ca.mp3',
  b: 'bo.mp3',
  c: 'co.mp3',
  d: 'doi.mp3',
  dd: 'da-dieu.mp3',
  e: 've.mp3',
  ee: 'de.mp3',
  g: 'ga.mp3',
  h: 'ho.mp3',
  i: 'chim.mp3',
  k: 'ky-da.mp3',
  l: 'lon.mp3',
  m: 'meo.mp3',
  n: 'nai.mp3',
  o: 'ong.mp3',
  oo: 'oc.mp3',
  ow: 'huou.mp3',
  p: 'bo-cap.mp3',
  q: 'qua.mp3',
  r: 'rua.mp3',
  s: 'soc.mp3',
  t: 'tho.mp3',
  u: 'cu.mp3',
  uw: 'su-tu.mp3',
  v: 'voi.mp3',
  x: 'xen-toc.mp3',
  y: 'yen.mp3',
}

const ANIMAL_VOICE_ROOT = `${TRANG_NGUYEN_VOICE_ROOT}/animals`
export const FIND_ANIMAL_BY_NAME_COMMON_VOICE = `${TRANG_NGUYEN_VOICE_ROOT}/common/dau-la-con.mp3`
export const ANIMAL_VOICE_MAP: Record<string, string> = Object.fromEntries(tagNameManifest.items.flatMap(item => {
  const fileName = ANIMAL_VOICE_FILE_BY_ID[item.id]
  return fileName ? [[item.word, `${ANIMAL_VOICE_ROOT}/${fileName}`]] : []
}))

function resolveAnimalVoice(word: string): string | undefined {
  const voice = ANIMAL_VOICE_MAP[word.normalize('NFC')]
  return voice && hasFindTargetVoiceFiles([voice]) ? voice : undefined
}

function animalChoiceId(animalId: string): string {
  return `animal-${animalId}`
}

export function getAnimalDistractors(targetId: string, count = 3, random: Random = Math.random): TagNameItem[] {
  const pool = tagNameManifest.items.filter(item => item.id !== targetId)
  if (count < 0 || count > pool.length) throw new Error(`Cannot select ${count} animal distractors`)
  return shuffle(pool, random).slice(0, count)
}

export function validateFindAnimalByNameQuestion(question: GeneratedExamQuestion): void {
  const data = question.data as { targetAnimalId?: unknown; targetWord?: unknown; manifestId?: unknown } | undefined
  const targetAnimalId = typeof data?.targetAnimalId === 'string' ? data.targetAnimalId : undefined
  const target = tagNameManifest.items.find(item => item.id === targetAnimalId)
  const options = question.options ?? []
  const optionIds = options.map(option => option.id)
  const animalIds = optionIds.map(id => id.startsWith('animal-') ? id.slice('animal-'.length) : '')
  const correct = options.filter(option => option.id === question.correctAnswer)
  const targetVoice = target ? resolveAnimalVoice(target.word) : undefined
  if (question.type !== 'image-choice' || question.data?.generator !== 'FIND_ANIMAL_BY_NAME'
    || data?.manifestId !== tagNameManifest.id || !target || data?.targetWord !== target.word
    || question.prompt !== `Đâu là con ${target.word}?`
    || options.length !== 4 || new Set(animalIds).size !== 4 || animalIds.some(id => !tagNameManifest.items.some(item => item.id === id))
    || correct.length !== 1 || question.correctAnswer !== animalChoiceId(target.id) || !targetVoice
    || options.some(option => {
      const item = tagNameManifest.items.find(candidate => candidate.id === option.id.slice('animal-'.length))
      const crop = option.visual?.sprite
      return !item || option.text !== undefined || option.visual?.type !== 'image' || option.visual.value !== tagNameManifest.image
        || option.visual.label !== item.word || !crop || crop.spriteSheet !== tagNameManifest.image
        || crop.x !== item.x || crop.y !== item.y || crop.width !== item.width || crop.height !== item.height
        || crop.sheetWidth !== tagNameManifest.width || crop.sheetHeight !== tagNameManifest.height
    })
    || !Array.isArray(question.promptVoice) || question.promptVoice.length !== 2
    || question.promptVoice[0] !== FIND_ANIMAL_BY_NAME_COMMON_VOICE || question.promptVoice[1] !== targetVoice)
    throw new Error('FIND_ANIMAL_BY_NAME has invalid target, image choices, answer, or voice sequence')
}

export function generateFindAnimalByNameQuestion(args: {
  seedHash: string
  random: Random
  excludeAnimalIds?: readonly string[]
  targetAnimalId?: string
}): GeneratedExamQuestion {
  let target: TagNameItem
  if (args.targetAnimalId !== undefined) {
    const match = tagNameManifest.items.find(item => item.id === args.targetAnimalId)
    if (!match) throw new Error(`Unknown animal id: ${args.targetAnimalId}`)
    target = match
  } else {
    const excluded = new Set(args.excludeAnimalIds ?? [])
    const pool = tagNameManifest.items.filter(item => !excluded.has(item.id))
    if (!pool.length) throw new Error('No available animals for FIND_ANIMAL_BY_NAME')
    target = pick(pool, args.random)
  }

  const distractors = getAnimalDistractors(target.id, 3, args.random)
  const options = makeOptions([target, ...distractors].map(item => ({
    id: animalChoiceId(item.id),
    visual: tagNameAnimalVisual(item),
  })), args.random)
  const targetVoice = resolveAnimalVoice(target.word)
  if (!targetVoice) throw new Error(`FIND_ANIMAL_BY_NAME is missing the animal voice for: ${target.word}`)

  const question = baseQuestion(args.seedHash, 'T07', 'image-choice', `Đâu là con ${target.word}?`, animalChoiceId(target.id), {
    options,
    difficulty: 1,
    promptVoice: [FIND_ANIMAL_BY_NAME_COMMON_VOICE, targetVoice],
    data: {
      generator: 'FIND_ANIMAL_BY_NAME',
      manifestId: tagNameManifest.id,
      targetAnimalId: target.id,
      targetWord: target.word,
    },
    knowledgeKey: 'FIND_ANIMAL_BY_NAME',
  })
  validateFindAnimalByNameQuestion(question)
  return question
}

function generateT05(seedHash: string, random: Random) {
  return generateFindLetterInAnimalNameQuestion({ seedHash, random })
}

export const VIETNAMESE_TONES = ['ngang', 'sắc', 'huyền', 'hỏi', 'ngã', 'nặng'] as const
export type VietnameseTone = typeof VIETNAMESE_TONES[number]

export type ToneSyllable = {
  text: string
  tone: VietnameseTone
  voice: string
}

export const TONE_SYLLABLE_BANK = [
  { text: 'ba', tone: 'ngang', voice: 'ba.mp3' },
  { text: 'ca', tone: 'ngang', voice: 'ca.mp3' },
  { text: 'me', tone: 'ngang', voice: 'me.mp3' },
  { text: 'hoa', tone: 'ngang', voice: 'hoa.mp3' },
  { text: 'chim', tone: 'ngang', voice: 'chim.mp3' },
  { text: 'cá', tone: 'sắc', voice: 'ca-sac.mp3' },
  { text: 'bé', tone: 'sắc', voice: 'be-sac.mp3' },
  { text: 'lá', tone: 'sắc', voice: 'la-sac.mp3' },
  { text: 'chó', tone: 'sắc', voice: 'cho-sac.mp3' },
  { text: 'bí', tone: 'sắc', voice: 'bi-sac.mp3' },
  { text: 'bò', tone: 'huyền', voice: 'bo-huyen.mp3' },
  { text: 'bà', tone: 'huyền', voice: 'ba-huyen.mp3' },
  { text: 'cò', tone: 'huyền', voice: 'co-huyen.mp3' },
  { text: 'mèo', tone: 'huyền', voice: 'meo-huyen.mp3' },
  { text: 'gà', tone: 'huyền', voice: 'ga-huyen.mp3' },
  { text: 'hổ', tone: 'hỏi', voice: 'ho-hoi.mp3' },
  { text: 'mỏ', tone: 'hỏi', voice: 'mo-hoi.mp3' },
  { text: 'cỏ', tone: 'hỏi', voice: 'co-hoi.mp3' },
  { text: 'tủ', tone: 'hỏi', voice: 'tu-hoi.mp3' },
  { text: 'quả', tone: 'hỏi', voice: 'qua-hoi.mp3' },
  { text: 'vẽ', tone: 'ngã', voice: 've-nga.mp3' },
  { text: 'mũ', tone: 'ngã', voice: 'mu-nga.mp3' },
  { text: 'gỗ', tone: 'ngã', voice: 'go-nga.mp3' },
  { text: 'đỗ', tone: 'ngã', voice: 'do-nga.mp3' },
  { text: 'ngã', tone: 'ngã', voice: 'nga-nga.mp3' },
  { text: 'mẹ', tone: 'nặng', voice: 'me-nang.mp3' },
  { text: 'vịt', tone: 'nặng', voice: 'vit-nang.mp3' },
  { text: 'bạn', tone: 'nặng', voice: 'ban-nang.mp3' },
  { text: 'bọ', tone: 'nặng', voice: 'bo-nang.mp3' },
  { text: 'ngựa', tone: 'nặng', voice: 'ngua-nang.mp3' },
] as const satisfies readonly ToneSyllable[]

export const TONE_LABELS: Record<VietnameseTone, string> = {
  ngang: 'thanh ngang',
  sắc: 'thanh sắc',
  huyền: 'thanh huyền',
  hỏi: 'thanh hỏi',
  ngã: 'thanh ngã',
  nặng: 'thanh nặng',
}

const TONE_VOICE_ROOT = `${TRANG_NGUYEN_VOICE_ROOT}/tones`
export const TONE_VOICE_MAP: Record<VietnameseTone, string> = {
  ngang: `${TONE_VOICE_ROOT}/thanh-ngang.mp3`,
  sắc: `${TONE_VOICE_ROOT}/thanh-sac.mp3`,
  huyền: `${TONE_VOICE_ROOT}/thanh-huyen.mp3`,
  hỏi: `${TONE_VOICE_ROOT}/thanh-hoi.mp3`,
  ngã: `${TONE_VOICE_ROOT}/thanh-nga.mp3`,
  nặng: `${TONE_VOICE_ROOT}/thanh-nang.mp3`,
}

export const TONE_QUESTION_VOICE_START = `${TRANG_NGUYEN_VOICE_ROOT}/common/tieng.mp3`
export const TONE_QUESTION_VOICE_END = `${TRANG_NGUYEN_VOICE_ROOT}/common/mang-thanh-gi.mp3`

const TONE_SYLLABLE_VOICE_ROOT = `${TRANG_NGUYEN_VOICE_ROOT}/words`
const GENERAL_SYLLABLE_VOICE_ROOT = '/games/general/voices/tieng-viet/syllables'

export function resolveToneSyllableVoice(fileName: string): string {
  const candidates = [
    `${GENERAL_SYLLABLE_VOICE_ROOT}/${fileName}`,
    `${TONE_SYLLABLE_VOICE_ROOT}/${fileName}`,
  ]
  const resolved = candidates.find(file => hasFindTargetVoiceFiles([file]))
  if (!resolved) throw new Error(`Missing syllable voice for IDENTIFY_TONE_FROM_SYLLABLE: ${fileName}`)
  return resolved
}

export function toneOptionId(tone: VietnameseTone): string {
  return `tone-${optionId(tone)}`
}

type ToneChoice = {
  id: string
  value: VietnameseTone
  text: string
  voice: string
  isCorrect: boolean
}

export function getToneDistractors(correctTone: VietnameseTone, count = 3, random: Random = Math.random): VietnameseTone[] {
  const pool = VIETNAMESE_TONES.filter(tone => tone !== correctTone)
  if (count < 0 || count > pool.length) throw new Error(`Cannot select ${count} tone distractors`)
  return shuffle(pool, random).slice(0, count)
}

function validateToneQuestion(target: ToneSyllable, choices: readonly ToneChoice[]): void {
  const bankTarget = TONE_SYLLABLE_BANK.find(item => item.text === target.text)
  if (!bankTarget || bankTarget.tone !== target.tone || bankTarget.voice !== target.voice)
    throw new Error('IDENTIFY_TONE_FROM_SYLLABLE target is not in the tone syllable bank')
  if (!VIETNAMESE_TONES.includes(target.tone)) throw new Error('IDENTIFY_TONE_FROM_SYLLABLE target has an unknown tone')
  if (choices.length !== 4) throw new Error('IDENTIFY_TONE_FROM_SYLLABLE requires 4 choices')
  if (new Set(choices.map(choice => choice.value)).size !== 4) throw new Error('Tone choices contain duplicates')
  const correct = choices.filter(choice => choice.isCorrect)
  if (correct.length !== 1) throw new Error('Tone question requires exactly one correct answer')
  if (correct[0].value !== target.tone) throw new Error('Correct answer does not match target tone')

  const targetVoice = resolveToneSyllableVoice(target.voice)
  const expectedVoices = [TONE_QUESTION_VOICE_START, TONE_QUESTION_VOICE_END, targetVoice, ...choices.map(choice => choice.voice)]
  if (!hasFindTargetVoiceFiles(expectedVoices)) throw new Error('IDENTIFY_TONE_FROM_SYLLABLE is missing one or more voice assets')
}

export function generateIdentifyToneQuestion(args: {
  seedHash?: string
  random?: Random
  excludeSyllables?: readonly string[]
  targetText?: string
} = {}): GeneratedExamQuestion {
  const random = args.random ?? Math.random
  let target: ToneSyllable
  if (args.targetText !== undefined) {
    const targetText = args.targetText.normalize('NFC')
    const match = TONE_SYLLABLE_BANK.find(item => item.text === targetText)
    if (!match) throw new Error(`Unknown tone syllable: ${args.targetText}`)
    target = match
  } else {
    const excluded = new Set((args.excludeSyllables ?? []).map(text => text.normalize('NFC')))
    const pool = TONE_SYLLABLE_BANK.filter(item => !excluded.has(item.text))
    if (pool.length === 0) throw new Error('No available syllables for IDENTIFY_TONE_FROM_SYLLABLE')
    target = pick(pool, random)
  }

  const answerTones = shuffle([target.tone, ...getToneDistractors(target.tone, 3, random)], random)
  const choices = answerTones.map((tone, index): ToneChoice => ({
    id: toneOptionId(tone), value: tone, text: TONE_LABELS[tone], voice: TONE_VOICE_MAP[tone],
    isCorrect: tone === target.tone,
  }))
  validateToneQuestion(target, choices)

  const targetVoice = resolveToneSyllableVoice(target.voice)
  const options: ExamOption[] = choices.map((choice, index) => ({
    id: choice.id,
    label: labels[index],
    text: choice.text,
    voice: choice.voice,
  }))
  const prompt = `Tiếng "${target.text}" mang thanh gì?`
  return baseQuestion(args.seedHash ?? stableHash(`IDENTIFY_TONE_FROM_SYLLABLE:${target.text}`), 'T06', 'audio-choice', prompt, toneOptionId(target.tone), {
    promptVoice: [TONE_QUESTION_VOICE_START, targetVoice, TONE_QUESTION_VOICE_END],
    options,
    difficulty: 2,
    data: { generator: 'IDENTIFY_TONE_FROM_SYLLABLE', target: { ...target, voicePath: targetVoice } },
    knowledgeKey: 'IDENTIFY_TONE_FROM_SYLLABLE',
  })
}

function generateT06(seedHash: string, random: Random) {
  return generateIdentifyToneQuestion({ seedHash, random })
}

function generateT07(seedHash: string, random: Random) {
  return generateFindAnimalByNameQuestion({ seedHash, random })
}

function generateT08(seedHash: string, random: Random) {
  return generateFindObjectByNameQuestion({ seedHash, random })
}

function generateT09(seedHash: string, random: Random) {
  return generateFindFlowerByImageQuestion({ seedHash, random })
}

function generateT10(seedHash: string, random: Random) {
  return generateFindLettersInImageQuestion({ seedHash, random })
}

export const FIND_LETTERS_IN_IMAGE_COMMON_VOICE = `${TRANG_NGUYEN_VOICE_ROOT}/common/nhung-chu-cai-nao-co-trong-hinh-duoi-day.mp3`
export const LETTER_BOARD_DECORATIONS: readonly LetterBoardDecoration[] = ['sun', 'flower', 'apple', 'cloud', 'heart', 'star', 'leaf', 'candy']
const LETTER_BOARD_SLOTS: readonly LetterBoardSlot[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
const FIND_LETTERS_IN_IMAGE_PROMPT = 'Những chữ cái nào có trong hình dưới đây?'

function letterBoardSetKey(letters: readonly string[]): string {
  return [...letters].sort((left, right) => VIETNAMESE_ALPHABET.indexOf(left as typeof VIETNAMESE_ALPHABET[number])
    - VIETNAMESE_ALPHABET.indexOf(right as typeof VIETNAMESE_ALPHABET[number])).join('|')
}

export function validateFindLettersInImageQuestion(question: GeneratedExamQuestion): void {
  const data = question.data as {
    targetLetters?: unknown
    board?: LetterBoardData
    promptVoiceAvailable?: unknown
  } | undefined
  const targetLetters = Array.isArray(data?.targetLetters) ? data.targetLetters : []
  const board = data?.board
  const boardLetters = board?.letters ?? []
  const decorations = board?.decorations ?? []
  const options = question.options ?? []
  const correctAnswer = Array.isArray(question.correctAnswer) ? question.correctAnswer : []
  const expectedCorrectIds = targetLetters.map(letter => `letter-${String(letter)}`)
  const expectedVoice = hasFindTargetVoiceFiles([FIND_LETTERS_IN_IMAGE_COMMON_VOICE])

  if (question.type !== 'multi-select' || question.templateId !== 'T10' || question.data?.generator !== 'RECOGNIZE_LETTERS_IN_IMAGE'
    || question.prompt !== FIND_LETTERS_IN_IMAGE_PROMPT || question.knowledgeKey !== 'RECOGNIZE_LETTERS_IN_IMAGE'
    || question.content !== undefined || targetLetters.length !== 3 || new Set(targetLetters).size !== 3
    || targetLetters.some(letter => !VIETNAMESE_ALPHABET.includes(letter as typeof VIETNAMESE_ALPHABET[number]))
    || boardLetters.length !== 3 || new Set(boardLetters.map(item => item.letter)).size !== 3
    || new Set(boardLetters.map(item => item.slot)).size !== 3
    || boardLetters.some(item => !targetLetters.includes(item.letter) || !LETTER_BOARD_SLOTS.includes(item.slot)
      || !Number.isFinite(item.rotation) || item.rotation < -4 || item.rotation > 4)
    || targetLetters.some(letter => !boardLetters.some(item => item.letter === letter))
    || decorations.length !== 4 || new Set(decorations).size !== 4
    || decorations.some(item => !LETTER_BOARD_DECORATIONS.includes(item))
    || options.length !== 5 || new Set(options.map(option => option.id)).size !== 5
    || options.map(option => option.label).sort().join(',') !== 'A,B,C,D,E'
    || options.some(option => {
      const letter = option.id.startsWith('letter-') ? option.id.slice('letter-'.length) : ''
      return !VIETNAMESE_ALPHABET.includes(letter as typeof VIETNAMESE_ALPHABET[number])
        || option.text !== `Chữ "${letter}"` || option.visual !== undefined || option.voice !== undefined
    })
    || expectedCorrectIds.length !== 3 || correctAnswer.length !== 3 || new Set(correctAnswer).size !== 3
    || new Set(correctAnswer).size !== new Set(expectedCorrectIds).size
    || correctAnswer.some(id => !expectedCorrectIds.includes(id) || !options.some(option => option.id === id))
    || options.filter(option => correctAnswer.includes(option.id)).length !== 3
    || data?.promptVoiceAvailable !== expectedVoice
    || (expectedVoice ? question.promptVoice !== FIND_LETTERS_IN_IMAGE_COMMON_VOICE : question.promptVoice !== undefined))
    throw new Error('RECOGNIZE_LETTERS_IN_IMAGE has invalid board, letter choices, answer set, or prompt voice')
}

export function generateFindLettersInImageQuestion(args: {
  seedHash: string
  random: Random
  excludeTargetSetKeys?: readonly string[]
}): GeneratedExamQuestion {
  const excludedSets = new Set(args.excludeTargetSetKeys ?? [])
  let targetLetters: string[] | undefined
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const sample = pickDistractors({ pool: VIETNAMESE_ALPHABET, exclude: [], count: 3, random: args.random })
    if (!excludedSets.has(letterBoardSetKey(sample))) {
      targetLetters = sample
      break
    }
  }
  if (!targetLetters) {
    const availableSets: string[][] = []
    for (let first = 0; first < VIETNAMESE_ALPHABET.length - 2; first += 1) {
      for (let second = first + 1; second < VIETNAMESE_ALPHABET.length - 1; second += 1) {
        for (let third = second + 1; third < VIETNAMESE_ALPHABET.length; third += 1) {
          const sample = [VIETNAMESE_ALPHABET[first], VIETNAMESE_ALPHABET[second], VIETNAMESE_ALPHABET[third]]
          if (!excludedSets.has(letterBoardSetKey(sample))) availableSets.push(sample)
        }
      }
    }
    if (!availableSets.length) throw new Error('No unused letter sets for RECOGNIZE_LETTERS_IN_IMAGE')
    targetLetters = pick(availableSets, args.random)
  }

  const distractors = pickDistractors({ pool: VIETNAMESE_ALPHABET, exclude: targetLetters, count: 2, random: args.random })
  const options = makeOptions(shuffle([...targetLetters, ...distractors], args.random).map(letter => ({
    id: `letter-${letter}`,
    text: `Chữ "${letter}"`,
  })), args.random)
  const slots = shuffle(LETTER_BOARD_SLOTS, args.random)
  const board: LetterBoardData = {
    letters: shuffle(targetLetters, args.random).map((letter, index) => ({
      letter,
      slot: slots[index],
      rotation: Math.round(args.random() * 8 - 4),
    })),
    decorations: pickDistractors({ pool: LETTER_BOARD_DECORATIONS, exclude: [], count: 4, random: args.random }),
  }
  const promptVoiceAvailable = hasFindTargetVoiceFiles([FIND_LETTERS_IN_IMAGE_COMMON_VOICE])
  const question = baseQuestion(args.seedHash, 'T10', 'multi-select', FIND_LETTERS_IN_IMAGE_PROMPT, targetLetters.map(letter => `letter-${letter}`), {
    options,
    difficulty: 2,
    promptVoice: promptVoiceAvailable ? FIND_LETTERS_IN_IMAGE_COMMON_VOICE : undefined,
    data: {
      generator: 'RECOGNIZE_LETTERS_IN_IMAGE',
      targetLetters,
      board,
      promptVoiceAvailable,
    },
    knowledgeKey: 'RECOGNIZE_LETTERS_IN_IMAGE',
  })
  validateFindLettersInImageQuestion(question)
  return question
}

export const RECOGNIZE_NUMBER_PROMPT_VOICE = `${TRANG_NGUYEN_VOICE_ROOT}/common/dien-so-thich-hop-vao-cho-trong.mp3`
export const NUMBER_CARD_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
export const NUMBER_CARD_DECORATIONS: readonly NumberCardDecoration[] = ['flower', 'heart', 'leaf', 'spiral', 'star', 'cloud', 'butterfly']
export const NUMBER_CARD_COLORS = ['#ff651f', '#2563eb', '#ec4899', '#16a34a', '#7c3aed'] as const
const NUMBER_CARD_PROMPT = 'Điền số thích hợp vào chỗ trống.'

export function validateRecognizeNumberOnCardQuestion(question: GeneratedExamQuestion): void {
  const data = question.data as {
    targetValue?: unknown
    card?: NumberCardData
    promptVoiceAvailable?: unknown
  } | undefined
  const card = data?.card
  const expectedVoice = hasFindTargetVoiceFiles([RECOGNIZE_NUMBER_PROMPT_VOICE])
  const targetValue = data?.targetValue

  if (question.type !== 'number-input' || question.templateId !== 'T11' || question.data?.generator !== 'RECOGNIZE_NUMBER_ON_CARD'
    || question.prompt !== NUMBER_CARD_PROMPT || question.knowledgeKey !== 'RECOGNIZE_NUMBER'
    || !Number.isInteger(targetValue) || !NUMBER_CARD_VALUES.includes(targetValue as typeof NUMBER_CARD_VALUES[number])
    || String(question.correctAnswer) !== String(targetValue)
    || card?.value !== targetValue || !card || !NUMBER_CARD_COLORS.includes(card.color as typeof NUMBER_CARD_COLORS[number])
    || card.decorations.length < 3 || card.decorations.length > 4
    || new Set(card.decorations).size !== card.decorations.length
    || card.decorations.some(decoration => !NUMBER_CARD_DECORATIONS.includes(decoration))
    || question.content !== undefined
    || data?.promptVoiceAvailable !== expectedVoice
    || (expectedVoice ? question.promptVoice !== RECOGNIZE_NUMBER_PROMPT_VOICE : question.promptVoice !== undefined))
    throw new Error('RECOGNIZE_NUMBER_ON_CARD has an invalid number, card decoration, answer, or prompt voice')
}

export function generateRecognizeNumberOnCardQuestion(args: {
  seedHash: string
  random: Random
  excludeNumbers?: readonly number[]
  targetValue?: number
}): GeneratedExamQuestion {
  const availableValues = NUMBER_CARD_VALUES.filter(value => !args.excludeNumbers?.includes(value))
  if (!availableValues.length) throw new Error('No available numbers for RECOGNIZE_NUMBER_ON_CARD')
  if (args.targetValue !== undefined && !NUMBER_CARD_VALUES.includes(args.targetValue as typeof NUMBER_CARD_VALUES[number]))
    throw new Error(`Unknown number for RECOGNIZE_NUMBER_ON_CARD: ${args.targetValue}`)
  if (args.targetValue !== undefined && !availableValues.includes(args.targetValue as typeof NUMBER_CARD_VALUES[number]))
    throw new Error(`Number already used for RECOGNIZE_NUMBER_ON_CARD: ${args.targetValue}`)
  const value = args.targetValue ?? pick(availableValues, args.random)
  const decorations = pickDistractors({ pool: NUMBER_CARD_DECORATIONS, exclude: [], count: 4, random: args.random })
  const card: NumberCardData = {
    value,
    decorations,
    color: pick(NUMBER_CARD_COLORS, args.random),
  }
  const promptVoiceAvailable = hasFindTargetVoiceFiles([RECOGNIZE_NUMBER_PROMPT_VOICE])
  const question = baseQuestion(args.seedHash, 'T11', 'number-input', NUMBER_CARD_PROMPT, String(value), {
    difficulty: 1,
    promptVoice: promptVoiceAvailable ? RECOGNIZE_NUMBER_PROMPT_VOICE : undefined,
    data: {
      generator: 'RECOGNIZE_NUMBER_ON_CARD',
      targetValue: value,
      card,
      promptVoiceAvailable,
    },
    knowledgeKey: 'RECOGNIZE_NUMBER',
  })
  validateRecognizeNumberOnCardQuestion(question)
  return question
}

function generateT11(seedHash: string, random: Random) {
  return generateRecognizeNumberOnCardQuestion({ seedHash, random })
}

export const FILL_LETTER_IN_BLANK_COMMON_VOICE = `${TRANG_NGUYEN_VOICE_ROOT}/common/dien-chu-cai-thich-hop-vao-cho-trong.mp3`
export const LETTER_INPUT_ALLOWED_LETTERS = VIETNAMESE_ALPHABET
export const LETTER_CARD_SHAPES: readonly LetterCardShape[] = ['circle', 'flower-round', 'rounded-blob']
export const LETTER_CARD_COLORS = ['#0b56c6', '#ff6b35', '#16a34a', '#db2777', '#7c3aed'] as const
export const LETTER_CARD_BORDER_COLORS = ['#f2b1a2', '#d8b4fe', '#93c5fd', '#f9a8d4', '#fde68a'] as const
export const LETTER_CARD_DECORATION_ICONS: readonly LetterCardDecorationIcon[] = ['star', 'heart', 'flower', 'leaf', 'spiral', 'dot']
const LETTER_CARD_DECORATION_POSITIONS: readonly LetterCardDecorationPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
const FILL_LETTER_IN_BLANK_PROMPT = 'Điền chữ cái thích hợp vào chỗ trống.'

export function validateFillLetterInBlankQuestion(question: GeneratedExamQuestion): void {
  const data = question.data as { subType?: unknown; target?: LetterCardData; allowedLetters?: unknown } | undefined
  const target = data?.target
  const allowedLetters = Array.isArray(data?.allowedLetters) ? data.allowedLetters : []
  const decorations = target?.decorations ?? []
  if (question.type !== 'text-input' || question.templateId !== 'T12'
    || question.data?.generator !== 'FILL_LETTER_IN_BLANK' || data?.subType !== 'letter-input'
    || question.prompt !== FILL_LETTER_IN_BLANK_PROMPT || question.knowledgeKey !== 'RECOGNIZE_LETTER'
    || question.promptVoice !== FILL_LETTER_IN_BLANK_COMMON_VOICE || !hasFindTargetVoiceFiles([FILL_LETTER_IN_BLANK_COMMON_VOICE])
    || !target || !LETTER_INPUT_ALLOWED_LETTERS.includes(target.letter as typeof VIETNAMESE_ALPHABET[number])
    || question.correctAnswer !== target.letter || !LETTER_CARD_SHAPES.includes(target.shape)
    || !LETTER_CARD_COLORS.includes(target.color as typeof LETTER_CARD_COLORS[number])
    || !LETTER_CARD_BORDER_COLORS.includes(target.borderColor as typeof LETTER_CARD_BORDER_COLORS[number])
    || allowedLetters.length !== LETTER_INPUT_ALLOWED_LETTERS.length
    || LETTER_INPUT_ALLOWED_LETTERS.some((letter, index) => allowedLetters[index] !== letter)
    || decorations.length < 1 || decorations.length > 3
    || new Set(decorations.map(item => item.icon)).size !== decorations.length
    || new Set(decorations.map(item => item.position)).size !== decorations.length
    || decorations.some(item => !LETTER_CARD_DECORATION_ICONS.includes(item.icon)
      || !LETTER_CARD_DECORATION_POSITIONS.includes(item.position)))
    throw new Error('FILL_LETTER_IN_BLANK has invalid target card, allowed letters, answer, or prompt voice')
}

export function generateFillLetterInBlankQuestion(args: {
  seedHash: string
  random: Random
  excludeLetters?: readonly string[]
  targetLetter?: string
}): GeneratedExamQuestion {
  const excludedLetters = new Set((args.excludeLetters ?? []).map(letter => letter.normalize('NFC').toLocaleLowerCase('vi-VN')))
  const availableLetters = LETTER_INPUT_ALLOWED_LETTERS.filter(letter => !excludedLetters.has(letter))
  if (args.targetLetter !== undefined && !LETTER_INPUT_ALLOWED_LETTERS.includes(args.targetLetter as typeof VIETNAMESE_ALPHABET[number]))
    throw new Error(`Unknown letter for FILL_LETTER_IN_BLANK: ${args.targetLetter}`)
  if (!availableLetters.length) throw new Error('No available letters for FILL_LETTER_IN_BLANK')
  const letter = args.targetLetter ?? pick(availableLetters, args.random)
  if (excludedLetters.has(letter)) throw new Error(`Letter already used for FILL_LETTER_IN_BLANK: ${letter}`)
  if (!hasFindTargetVoiceFiles([FILL_LETTER_IN_BLANK_COMMON_VOICE]))
    throw new Error('FILL_LETTER_IN_BLANK is missing its prompt voice')

  const decorationCount = 1 + Math.floor(args.random() * 3)
  const icons = pickDistractors({ pool: LETTER_CARD_DECORATION_ICONS, exclude: [], count: decorationCount, random: args.random })
  const positions = shuffle(LETTER_CARD_DECORATION_POSITIONS, args.random).slice(0, decorationCount)
  const target: LetterCardData = {
    letter,
    shape: pick(LETTER_CARD_SHAPES, args.random),
    color: pick(LETTER_CARD_COLORS, args.random),
    borderColor: pick(LETTER_CARD_BORDER_COLORS, args.random),
    decorations: icons.map((icon, index) => ({ icon, position: positions[index] })),
  }
  const question = baseQuestion(args.seedHash, 'T12', 'text-input', FILL_LETTER_IN_BLANK_PROMPT, letter, {
    difficulty: 1,
    promptVoice: FILL_LETTER_IN_BLANK_COMMON_VOICE,
    data: {
      generator: 'FILL_LETTER_IN_BLANK',
      subType: 'letter-input',
      target,
      allowedLetters: [...LETTER_INPUT_ALLOWED_LETTERS],
    },
    knowledgeKey: 'RECOGNIZE_LETTER',
  })
  validateFillLetterInBlankQuestion(question)
  return question
}

function generateT12(seedHash: string, random: Random) {
  return generateFillLetterInBlankQuestion({ seedHash, random })
}

export const COUNT_TARGET_LETTER_PROMPT = 'Điền số thích hợp vào chỗ trống.'
export const COUNT_TARGET_LETTER_PREFIX_TEXT = 'Trong hình trên có tất cả'
export const COUNT_TARGET_LETTER_PREFIX_VOICE = `${TRANG_NGUYEN_VOICE_ROOT}/common/trong-hinh-tren-co-tat-ca-bao-nhieu-chu.mp3`
export const COUNT_TARGET_LETTER_TOTAL_ITEMS = 36
export const COUNT_TARGET_LETTER_GRID_SIZE = 6
export const COUNT_TARGET_LETTER_COLORS = [
  '#ff5a5f', '#ff8c42', '#d6a900', '#2f80ed', '#27ae60', '#9b51e0', '#eb5757', '#00a6bf',
] as const
export const COUNT_TARGET_LETTER_ICONS = ['☀️', '🌼', '⭐', '❤️', '🍃', '☁️', '🍎', '🎈', '🦋', '😊'] as const

function randomInteger(random: Random, minimum: number, maximum: number): number {
  return minimum + Math.floor(random() * (maximum - minimum + 1))
}

function generateCountLetterNoiseLetters(target: string, count: number, random: Random): string[] {
  const pool = shuffle(VIETNAMESE_ALPHABET.filter(letter => letter !== target), random)
  const selected = pool.slice(0, 9)
  const values = [...selected]
  while (values.length < count) {
    const available = selected.filter(letter => values.filter(value => value === letter).length < 3)
    if (!available.length) throw new Error('Unable to create balanced COUNT_TARGET_LETTER distractors')
    values.push(pick(available, random))
  }
  return shuffle(values, random)
}

function createCountLetterBoardItems(target: string, targetCount: number, random: Random): CountLetterBoardItem[] {
  const noiseCount = targetCount === 8 ? 17 : 18
  const numberCount = 7
  const iconCount = COUNT_TARGET_LETTER_TOTAL_ITEMS - targetCount - noiseCount - numberCount
  const unpositioned: Array<Pick<CountLetterBoardItem, 'id' | 'kind' | 'value'>> = [
    ...Array.from({ length: targetCount }, (_, index) => ({ id: `target-${index}`, kind: 'letter' as const, value: target })),
    ...generateCountLetterNoiseLetters(target, noiseCount, random).map((value, index) => ({ id: `noise-${index}`, kind: 'letter' as const, value })),
    ...Array.from({ length: numberCount }, (_, index) => ({ id: `number-${index}`, kind: 'number' as const, value: String(randomInteger(random, 0, 9)) })),
    ...Array.from({ length: iconCount }, (_, index) => ({ id: `icon-${index}`, kind: 'icon' as const, value: pick(COUNT_TARGET_LETTER_ICONS, random) })),
  ]
  const cells = shuffle(Array.from({ length: COUNT_TARGET_LETTER_TOTAL_ITEMS }, (_, index) => ({
    column: index % COUNT_TARGET_LETTER_GRID_SIZE,
    row: Math.floor(index / COUNT_TARGET_LETTER_GRID_SIZE),
  })), random)

  return shuffle(unpositioned, random).map((item, index) => {
    const cell = cells[index]
    const jitterX = random() * 5.5 - 2.75
    const jitterY = random() * 5.5 - 2.75
    return {
      ...item,
      x: ((cell.column + 0.5) * 100 / COUNT_TARGET_LETTER_GRID_SIZE) + jitterX,
      y: ((cell.row + 0.5) * 100 / COUNT_TARGET_LETTER_GRID_SIZE) + jitterY,
      size: randomInteger(random, 20, 36),
      rotation: randomInteger(random, -12, 12),
      color: pick(COUNT_TARGET_LETTER_COLORS, random),
      zIndex: randomInteger(random, 1, 3),
    }
  })
}

export function validateCountTargetLetterQuestion(question: GeneratedExamQuestion): void {
  const data = question.data as {
    subType?: unknown
    targetLetter?: unknown
    targetLetterVoice?: unknown
    prefixText?: unknown
    prefixVoice?: unknown
    boardItems?: unknown
    promptVoiceAvailable?: unknown
  } | undefined
  const items = Array.isArray(data?.boardItems) ? data.boardItems as CountLetterBoardItem[] : []
  const target = typeof data?.targetLetter === 'string' ? data.targetLetter : ''
  const targetVoice = resolveFindTargetLetterVoice(target)
  const targetOccurrences = items.filter(item => item.kind === 'letter' && item.value === target).length
  const noiseCounts = new Map<string, number>()
  for (const item of items) {
    if (item.kind === 'letter' && item.value !== target)
      noiseCounts.set(item.value, (noiseCounts.get(item.value) ?? 0) + 1)
  }
  const itemIds = items.map(item => item.id)
  const expectedVoiceAvailable = hasFindTargetVoiceFiles([RECOGNIZE_NUMBER_PROMPT_VOICE, COUNT_TARGET_LETTER_PREFIX_VOICE])
  if (question.type !== 'number-input' || question.templateId !== 'T13'
    || question.data?.generator !== 'COUNT_TARGET_LETTER' || data?.subType !== 'count-letter'
    || question.prompt !== COUNT_TARGET_LETTER_PROMPT || question.knowledgeKey !== 'COUNT_TARGET_LETTER'
    || data?.prefixText !== COUNT_TARGET_LETTER_PREFIX_TEXT || data?.prefixVoice !== COUNT_TARGET_LETTER_PREFIX_VOICE
    || !FIND_TARGET_SINGLE_LETTERS.includes(target as typeof FIND_TARGET_SINGLE_LETTERS[number])
    || !targetVoice || data?.targetLetterVoice !== targetVoice
    || data?.promptVoiceAvailable !== expectedVoiceAvailable
    || (expectedVoiceAvailable ? question.promptVoice !== RECOGNIZE_NUMBER_PROMPT_VOICE : question.promptVoice !== undefined)
    || !hasFindTargetVoiceFiles([targetVoice, COUNT_TARGET_LETTER_PREFIX_VOICE])
    || items.length !== COUNT_TARGET_LETTER_TOTAL_ITEMS || new Set(itemIds).size !== items.length
    || targetOccurrences < 5 || targetOccurrences > 8 || String(question.correctAnswer) !== String(targetOccurrences)
    || items.some(item => !item || !['letter', 'number', 'icon'].includes(item.kind)
      || typeof item.value !== 'string' || !item.value
      || !Number.isFinite(item.x) || item.x < 0 || item.x > 100
      || !Number.isFinite(item.y) || item.y < 0 || item.y > 100
      || !Number.isInteger(item.size) || item.size < 20 || item.size > 36
      || !Number.isInteger(item.rotation) || item.rotation < -12 || item.rotation > 12
      || !COUNT_TARGET_LETTER_COLORS.includes(item.color as typeof COUNT_TARGET_LETTER_COLORS[number])
      || !Number.isInteger(item.zIndex) || item.zIndex < 1 || item.zIndex > 3
      || Object.hasOwn(item, 'isTarget') || Object.hasOwn(item, 'answer'))
    || items.filter(item => item.kind === 'number').length !== 7
    || items.filter(item => item.kind === 'icon').length < 4 || items.filter(item => item.kind === 'icon').length > 6
    || items.filter(item => item.kind === 'letter' && item.value !== target).length < 17
    || items.filter(item => item.kind === 'letter' && item.value !== target).length > 18
    || Array.from(noiseCounts.values()).some(count => count > 3)
    || Array.from(noiseCounts.values()).some(count => count >= targetOccurrences))
    throw new Error('COUNT_TARGET_LETTER has invalid board content, counts, answer, or voice')
}

export function generateCountTargetLetterQuestion(args: {
  seedHash: string
  random: Random
  excludeTargetLetters?: readonly string[]
  targetLetter?: string
}): GeneratedExamQuestion {
  const targetPool = FIND_TARGET_SINGLE_LETTERS.filter(letter => !args.excludeTargetLetters?.includes(letter))
  const target = args.targetLetter ?? pick(targetPool, args.random)
  if (!FIND_TARGET_SINGLE_LETTERS.includes(target as typeof FIND_TARGET_SINGLE_LETTERS[number]))
    throw new Error(`Unknown COUNT_TARGET_LETTER target: ${target}`)
  if (!targetPool.includes(target as typeof FIND_TARGET_SINGLE_LETTERS[number]))
    throw new Error(`Target already used for COUNT_TARGET_LETTER: ${target}`)
  const targetVoice = resolveFindTargetLetterVoice(target)
  if (!targetVoice) throw new Error(`Missing letter voice for COUNT_TARGET_LETTER target: ${target}`)
  const targetCount = randomInteger(args.random, 5, 8)
  const promptVoiceAvailable = hasFindTargetVoiceFiles([RECOGNIZE_NUMBER_PROMPT_VOICE, COUNT_TARGET_LETTER_PREFIX_VOICE])
  const question = baseQuestion(args.seedHash, 'T13', 'number-input', COUNT_TARGET_LETTER_PROMPT, String(targetCount), {
    difficulty: 2,
    promptVoice: promptVoiceAvailable ? RECOGNIZE_NUMBER_PROMPT_VOICE : undefined,
    data: {
      generator: 'COUNT_TARGET_LETTER',
      subType: 'count-letter',
      targetLetter: target,
      targetLetterVoice: targetVoice,
      prefixText: COUNT_TARGET_LETTER_PREFIX_TEXT,
      prefixVoice: COUNT_TARGET_LETTER_PREFIX_VOICE,
      boardItems: createCountLetterBoardItems(target, targetCount, args.random),
      boardColumns: COUNT_TARGET_LETTER_GRID_SIZE,
      promptVoiceAvailable,
    },
    knowledgeKey: 'COUNT_TARGET_LETTER',
  })
  validateCountTargetLetterQuestion(question)
  return question
}

function generateT13(seedHash: string, random: Random) {
  return generateCountTargetLetterQuestion({ seedHash, random })
}

export type HiddenContainer = {
  id: string
  label: string
  category: 'object' | 'flower' | 'animal'
  imageId: string
  allowedRelations: HiddenLetterRelation[]
  voice: string
}

export const HIDDEN_LETTER_INTRO_TEXT = 'Các bạn chữ cái đang chơi trốn tìm.'
export const HIDDEN_LETTER_INTRO_VOICE = `${TRANG_NGUYEN_VOICE_ROOT}/common/cac-ban-chu-cai-dang-choi-tron-tim.mp3`
export const HIDDEN_LETTER_PROMPT_VOICE = FILL_LETTER_IN_BLANK_COMMON_VOICE
export const HIDDEN_LETTER_RELATION_VOICE_MAP: Record<HiddenLetterRelation, string> = {
  inside: `${TRANG_NGUYEN_VOICE_ROOT}/common/chu-gi-dang-an-nap-trong.mp3`,
}

export const HIDDEN_LETTER_COLORS = ['#2563eb', '#e11d48', '#15803d', '#9333ea', '#c2410c', '#0891b2'] as const
export const HIDDEN_LETTER_CONTAINER_POOL: readonly HiddenContainer[] = [
  { id: 'mu', label: 'cái mũ', category: 'object', imageId: 'mu', allowedRelations: ['inside'], voice: `${TRANG_NGUYEN_VOICE_ROOT}/objects/cai-mu.mp3` },
  { id: 'ba-lo', label: 'cái ba lô', category: 'object', imageId: 'ba-lo', allowedRelations: ['inside'], voice: `${TRANG_NGUYEN_VOICE_ROOT}/objects/cai-ba-lo.mp3` },
  { id: 'hoa-hong', label: 'bông hoa hồng', category: 'flower', imageId: 'hoa-hong', allowedRelations: ['inside'], voice: `${TRANG_NGUYEN_VOICE_ROOT}/flowers/hoa-hong.mp3` },
  { id: 'hoa-sen', label: 'bông hoa sen', category: 'flower', imageId: 'hoa-sen', allowedRelations: ['inside'], voice: `${TRANG_NGUYEN_VOICE_ROOT}/flowers/hoa-sen.mp3` },
]

type HiddenLetterContainerDefinition = HiddenContainer & { visual: ExamVisual; x: number; y: number; width: number; height: number }

function manifestVisual(
  manifest: { image: string; width: number; height: number; items: Array<{ id: string; word: string; x: number; y: number; width: number; height: number }> },
  itemId: string,
  label: string,
): ExamVisual {
  const item = manifest.items.find(candidate => candidate.id === itemId)
  if (!item) throw new Error(`Missing hidden-letter image manifest item: ${itemId}`)
  return {
    type: 'image',
    value: manifest.image,
    label,
    sprite: {
      spriteSheet: manifest.image,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      sheetWidth: manifest.width,
      sheetHeight: manifest.height,
    },
  }
}

function resolveHiddenContainerVisual(container: HiddenContainer): ExamVisual {
  if (container.category === 'object') return manifestVisual(objectNameManifest, container.imageId, container.label)
  if (container.category === 'flower') return manifestVisual(flowerNameManifest, container.imageId, container.label)
  return manifestVisual(tagNameManifest, container.imageId, container.label)
}

export const HIDDEN_LETTER_CONTAINERS: readonly HiddenLetterContainerDefinition[] = HIDDEN_LETTER_CONTAINER_POOL.map(container => {
  const visual = resolveHiddenContainerVisual(container)
  const sprite = visual.sprite
  if (!sprite) throw new Error(`Hidden-letter container ${container.id} has no sprite crop`)
  return { ...container, visual, x: 28, y: 28, width: 44, height: 44 * sprite.height / sprite.width }
})

function buildHiddenLetterQuestionText(label: string): string {
  return `Chữ [____] đang ẩn nấp trong ${label}.`
}

function distanceBetween(left: { x: number; y: number }, right: { x: number; y: number }): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function makeHiddenLetterScene(args: {
  targetLetter: string
  container: HiddenLetterContainerDefinition
  relation: HiddenLetterRelation
  random: Random
}): HiddenLetterSceneData {
  const { targetLetter, container, relation, random } = args
  const targetSize = randomInteger(random, 42, 58)
  const centerX = container.x + container.width / 2
  const centerY = container.y + container.height / 2
  const targetPosition = { x: centerX, y: centerY }
  const targetZIndex = 3

  const distractorCount = randomInteger(random, 6, 10)
  const distractorLetters = pickDistractors({
    pool: FIND_TARGET_SINGLE_LETTERS,
    exclude: [targetLetter],
    count: distractorCount,
    random,
  })
  const candidates = shuffle([
    { x: 10, y: 12 }, { x: 30, y: 12 }, { x: 50, y: 12 }, { x: 70, y: 12 }, { x: 90, y: 12 },
    { x: 10, y: 30 }, { x: 90, y: 30 }, { x: 10, y: 50 }, { x: 90, y: 50 },
    { x: 10, y: 70 }, { x: 90, y: 70 }, { x: 10, y: 88 }, { x: 30, y: 88 },
    { x: 50, y: 88 }, { x: 70, y: 88 }, { x: 90, y: 88 }, { x: 24, y: 20 },
    { x: 76, y: 20 }, { x: 24, y: 80 }, { x: 76, y: 80 }, { x: 17, y: 40 },
    { x: 83, y: 40 }, { x: 17, y: 60 }, { x: 83, y: 60 },
  ], random)
  const selectedPositions: Array<{ x: number; y: number }> = []
  for (const candidate of candidates) {
    if (distanceBetween(candidate, targetPosition) < 18) continue
    if (selectedPositions.some(position => distanceBetween(position, candidate) < 13)) continue
    selectedPositions.push({ x: candidate.x + random() * 5 - 2.5, y: candidate.y + random() * 5 - 2.5 })
    if (selectedPositions.length === distractorCount) break
  }
  if (selectedPositions.length !== distractorCount) throw new Error('Unable to place hidden-letter distractors without crowding the target')

  const targetItem: HiddenLetterSceneItem = {
    id: 'scene-letter-0', value: targetLetter,
    x: targetPosition.x, y: targetPosition.y,
    size: targetSize, rotation: randomInteger(random, -15, 15),
    color: pick(HIDDEN_LETTER_COLORS, random), zIndex: targetZIndex,
  }
  const distractorItems = distractorLetters.map((letter, index): HiddenLetterSceneItem => ({
    id: `scene-letter-${index + 1}`,
    value: letter,
    x: selectedPositions[index].x,
    y: selectedPositions[index].y,
    size: randomInteger(random, 28, 48),
    rotation: randomInteger(random, -15, 15),
    color: pick(HIDDEN_LETTER_COLORS, random),
    zIndex: 3,
  }))

  return {
    relation,
    container: {
      id: container.id,
      label: container.label,
      category: container.category,
      imageId: container.imageId,
      voice: container.voice,
      visual: container.visual,
      x: container.x,
      y: container.y,
      width: container.width,
      height: container.height,
      zIndex: 2,
    },
    letters: shuffle([targetItem, ...distractorItems], random),
  }
}

export function validateFindHiddenLetterQuestion(question: GeneratedExamQuestion): void {
  const data = question.data as {
    subType?: unknown
    allowedLetters?: unknown
    introText?: unknown
    introVoice?: unknown
    questionText?: unknown
    relationVoice?: unknown
    questionVoice?: unknown
    questionVoiceAvailable?: unknown
    scene?: HiddenLetterSceneData
  } | undefined
  const scene = data?.scene
  const answer = typeof question.correctAnswer === 'string'
    ? question.correctAnswer.normalize('NFC').toLocaleLowerCase('vi-VN') : ''
  const containerDefinition = scene && HIDDEN_LETTER_CONTAINERS.find(item => item.id === scene.container.id)
  const relationVoice = scene ? HIDDEN_LETTER_RELATION_VOICE_MAP[scene.relation] : undefined
  const expectedQuestionVoice = scene && containerDefinition
    && hasFindTargetVoiceFiles([HIDDEN_LETTER_INTRO_VOICE, containerDefinition.voice])
    ? [HIDDEN_LETTER_INTRO_VOICE, containerDefinition.voice] : undefined
  const letters = scene?.letters ?? []
  const targetItems = letters.filter(item => item.value === answer)
  const noiseItems = letters.filter(item => item.value !== answer)
  const container = scene?.container
  const expectedText = scene && container ? buildHiddenLetterQuestionText(container.label) : ''
  const allowedLetters = Array.isArray(data?.allowedLetters) ? data.allowedLetters : []
  const assetsAvailable = Boolean(containerDefinition && hasFindTargetVoiceFiles([
    HIDDEN_LETTER_INTRO_VOICE,
    HIDDEN_LETTER_PROMPT_VOICE,
    containerDefinition.voice,
  ]))
  const sequenceAvailable = Boolean(expectedQuestionVoice && assetsAvailable)

  if (question.type !== 'hidden-letter-input' || question.templateId !== 'T14'
    || question.data?.generator !== 'FIND_HIDDEN_LETTER' || data?.subType !== 'hidden-letter'
    || question.prompt !== FILL_LETTER_IN_BLANK_PROMPT || question.promptVoice !== HIDDEN_LETTER_PROMPT_VOICE
    || question.knowledgeKey !== 'FIND_HIDDEN_LETTER'
    || !FIND_TARGET_SINGLE_LETTERS.includes(answer as typeof FIND_TARGET_SINGLE_LETTERS[number])
    || !allowedLetters.includes(answer) || !scene || !container || !containerDefinition
    || !containerDefinition.allowedRelations.includes(scene.relation)
    || container.id !== containerDefinition.id || container.label !== containerDefinition.label
    || container.imageId !== containerDefinition.imageId || container.voice !== containerDefinition.voice
    || container.category !== containerDefinition.category || container.visual.value !== containerDefinition.visual.value
    || !container.visual.sprite || container.x !== 28 || container.width !== 44 || container.y !== 28
    || container.height !== containerDefinition.height || container.zIndex !== 2
    || data?.introText !== HIDDEN_LETTER_INTRO_TEXT || data?.introVoice !== HIDDEN_LETTER_INTRO_VOICE
    || data?.questionText !== expectedText || data?.relationVoice !== (hasFindTargetVoiceFiles([relationVoice ?? '']) ? relationVoice : undefined)
    || data?.questionVoiceAvailable !== sequenceAvailable
    || (sequenceAvailable ? JSON.stringify(data?.questionVoice) !== JSON.stringify(expectedQuestionVoice) : data?.questionVoice !== undefined)
    || !assetsAvailable || question.correctAnswer !== answer
    || letters.length < 7 || letters.length > 11 || new Set(letters.map(item => item.id)).size !== letters.length
    || targetItems.length !== 1 || noiseItems.length < 6 || noiseItems.length > 10
    || letters.some(item => !FIND_TARGET_SINGLE_LETTERS.includes(item.value as typeof FIND_TARGET_SINGLE_LETTERS[number])
      || !Number.isFinite(item.x) || item.x < 5 || item.x > 95
      || !Number.isFinite(item.y) || item.y < 5 || item.y > 95
      || !Number.isInteger(item.size) || item.size < (item === targetItems[0] ? 42 : 28) || item.size > (item === targetItems[0] ? 58 : 48)
      || !Number.isInteger(item.rotation) || item.rotation < -15 || item.rotation > 15
      || !HIDDEN_LETTER_COLORS.includes(item.color as typeof HIDDEN_LETTER_COLORS[number])
      || !Number.isInteger(item.zIndex) || item.zIndex < 1 || item.zIndex > 3
      || Object.hasOwn(item, 'isTarget') || Object.hasOwn(item, 'answer'))
    || scene.relation !== 'inside'
    || Math.abs(targetItems[0]?.x - (container.x + container.width / 2)) > 0.5
    || Math.abs(targetItems[0]?.y - (container.y + container.height / 2)) > 0.5
    || targetItems[0]?.zIndex !== 3)
    throw new Error('FIND_HIDDEN_LETTER has invalid container, relation, scene layout, answer, or voice')
}

export function generateFindHiddenLetterQuestion(args: {
  seedHash: string
  random: Random
  targetLetter?: string
  containerId?: string
  relation?: HiddenLetterRelation
  excludeCombinations?: readonly string[]
}): GeneratedExamQuestion {
  const targetPool = FIND_TARGET_SINGLE_LETTERS
  const target = args.targetLetter ?? pick(targetPool, args.random)
  if (!targetPool.includes(target as typeof FIND_TARGET_SINGLE_LETTERS[number]))
    throw new Error(`Unknown FIND_HIDDEN_LETTER target: ${target}`)
  const candidates = HIDDEN_LETTER_CONTAINERS.flatMap(container => container.allowedRelations.map(relation => ({ container, relation })))
    .filter(item => !args.excludeCombinations?.includes(`${target}:${item.container.id}:${item.relation}`))
  const selectedPair = args.containerId && args.relation
    ? candidates.find(item => item.container.id === args.containerId && item.relation === args.relation)
    : pick(candidates, args.random)
  if (!selectedPair) throw new Error('No available container and relation for FIND_HIDDEN_LETTER')
  const container = selectedPair.container
  const relation = selectedPair.relation
  const relationVoice = HIDDEN_LETTER_RELATION_VOICE_MAP[relation]
  const questionVoiceAvailable = hasFindTargetVoiceFiles([HIDDEN_LETTER_INTRO_VOICE, container.voice])
  const scene = makeHiddenLetterScene({ targetLetter: target, container, relation, random: args.random })
  const question = baseQuestion(args.seedHash, 'T14', 'hidden-letter-input', FILL_LETTER_IN_BLANK_PROMPT, target, {
    difficulty: 2,
    promptVoice: HIDDEN_LETTER_PROMPT_VOICE,
    data: {
      generator: 'FIND_HIDDEN_LETTER',
      subType: 'hidden-letter',
      allowedLetters: [...targetPool],
      introText: HIDDEN_LETTER_INTRO_TEXT,
      introVoice: HIDDEN_LETTER_INTRO_VOICE,
      questionText: buildHiddenLetterQuestionText(container.label),
      relationVoice: hasFindTargetVoiceFiles([relationVoice]) ? relationVoice : undefined,
      questionVoice: questionVoiceAvailable ? [HIDDEN_LETTER_INTRO_VOICE, container.voice] : undefined,
      questionVoiceAvailable,
      scene,
    },
    knowledgeKey: 'FIND_HIDDEN_LETTER',
  })
  validateFindHiddenLetterQuestion(question)
  return question
}

function generateT14(seedHash: string, random: Random) {
  return generateFindHiddenLetterQuestion({ seedHash, random })
}

export const ROTATED_LETTER_PROMPT = 'Điền chữ cái thích hợp vào chỗ trống.'
export const ROTATED_LETTER_ANSWER_TEXT = 'Chữ [____] trong hình trên bị xoay ngược.'
export const ROTATED_LETTER_PROMPT_VOICE = FILL_LETTER_IN_BLANK_COMMON_VOICE
export const ROTATED_LETTER_QUESTION_VOICE = `${TRANG_NGUYEN_VOICE_ROOT}/common/chu-nao-trong-hinh-tren-bi-xoay-nguoc.mp3`
export const ROTATED_LETTER_ALLOWED_LETTERS = VIETNAMESE_ALPHABET
// Keep only lowercase glyphs that stay unambiguous after a half-turn; exclude symmetric and paired shapes such as o/x/s and b/d/p/q.
export const ROTATED_LETTER_BOARD_POOL = ['a', 'c', 'e', 'g', 'h', 'i', 'k', 'r', 't', 'v', 'y'] as const
export const ROTATED_LETTER_TARGET_POOL = ROTATED_LETTER_BOARD_POOL
export const ROTATED_LETTER_COLORS = ['#0755bd', '#1557b0', '#164eaa'] as const
export const ROTATED_LETTER_BOARD_STYLES: readonly RotatedLetterBoardStyle[] = ['scallop', 'rounded-square', 'double-border']
const ROTATED_LETTER_SLOTS = [
  { x: 27, y: 27 },
  { x: 73, y: 26 },
  { x: 50, y: 51 },
  { x: 27, y: 75 },
  { x: 73, y: 74 },
] as const

export function validateRotatedLetterQuestion(question: GeneratedExamQuestion): void {
  const data = question.data as {
    subType?: unknown
    allowedLetters?: unknown
    questionText?: unknown
    questionVoice?: unknown
    questionVoiceAvailable?: unknown
    board?: { items?: RotatedLetterBoardItem[]; style?: unknown }
  } | undefined
  const items = data?.board?.items ?? []
  const answer = typeof question.correctAnswer === 'string'
    ? question.correctAnswer.normalize('NFC').toLocaleLowerCase('vi-VN') : ''
  const rotatedItems = items.filter(item => item.rotation === 180)
  const expectedQuestionVoiceAvailable = hasFindTargetVoiceFiles([ROTATED_LETTER_QUESTION_VOICE])
  const allowedLetters = Array.isArray(data?.allowedLetters) ? data.allowedLetters : []
  const itemIds = new Set(items.map(item => item.id))
  const itemLetters = items.map(item => item.letter.normalize('NFC').toLocaleLowerCase('vi-VN'))
  const itemPositions = items.map(item => `${item.x}:${item.y}`)
  const allowedSlots = new Set(ROTATED_LETTER_SLOTS.map(slot => `${slot.x}:${slot.y}`))

  if (question.type !== 'rotated-letter-input' || question.templateId !== 'T15'
    || question.data?.generator !== 'ROTATED_LETTER_INPUT' || data?.subType !== 'rotated-letter'
    || question.prompt !== ROTATED_LETTER_PROMPT || question.promptVoice !== ROTATED_LETTER_PROMPT_VOICE
    || question.knowledgeKey !== 'FIND_ROTATED_LETTER' || !hasFindTargetVoiceFiles([ROTATED_LETTER_PROMPT_VOICE])
    || data?.questionText !== ROTATED_LETTER_ANSWER_TEXT
    || data?.questionVoiceAvailable !== expectedQuestionVoiceAvailable
    || (expectedQuestionVoiceAvailable ? data?.questionVoice !== ROTATED_LETTER_QUESTION_VOICE : data?.questionVoice !== undefined)
    || !ROTATED_LETTER_TARGET_POOL.includes(answer as typeof ROTATED_LETTER_TARGET_POOL[number])
    || question.correctAnswer !== answer
    || allowedLetters.length !== ROTATED_LETTER_ALLOWED_LETTERS.length
    || ROTATED_LETTER_ALLOWED_LETTERS.some((letter, index) => allowedLetters[index] !== letter)
    || items.length !== 5 || itemIds.size !== 5 || new Set(itemLetters).size !== 5
    || !itemLetters.includes(answer) || rotatedItems.length !== 1 || rotatedItems[0]?.letter !== answer
    || new Set(itemPositions).size !== 5 || itemPositions.some(position => !allowedSlots.has(position))
    || !ROTATED_LETTER_BOARD_STYLES.includes(data?.board?.style as RotatedLetterBoardStyle)
    || items.some(item => !ROTATED_LETTER_BOARD_POOL.includes(item.letter as typeof ROTATED_LETTER_BOARD_POOL[number])
      || !Number.isInteger(item.size) || item.size < 50 || item.size > 66
      || ![0, 180].includes(item.rotation) || !ROTATED_LETTER_COLORS.includes(item.color as typeof ROTATED_LETTER_COLORS[number])
      || Object.hasOwn(item, 'isTarget') || Object.hasOwn(item, 'answer')))
    throw new Error('ROTATED_LETTER_INPUT has invalid board, target, input, or voice data')
}

export function generateRotatedLetterQuestion(args: {
  seedHash: string
  random: Random
  excludeTargets?: readonly string[]
}): GeneratedExamQuestion {
  const targetCandidates = ROTATED_LETTER_TARGET_POOL.filter(letter => !args.excludeTargets?.includes(letter))
  if (!targetCandidates.length) throw new Error('No unused targets remain for ROTATED_LETTER_INPUT')
  const target = pick(targetCandidates, args.random)
  const distractors = pickDistractors({ pool: ROTATED_LETTER_BOARD_POOL, exclude: [target], count: 4, random: args.random })
  const letters = shuffle([target, ...distractors], args.random)
  const positions = shuffle(ROTATED_LETTER_SLOTS, args.random)
  const items: RotatedLetterBoardItem[] = letters.map((letter, index) => ({
    id: `rotated-${index}-${optionId(letter)}`,
    letter,
    x: positions[index].x,
    y: positions[index].y,
    size: 50 + Math.floor(args.random() * 17),
    rotation: letter === target ? 180 : 0,
    color: pick(ROTATED_LETTER_COLORS, args.random),
  }))
  const questionVoiceAvailable = hasFindTargetVoiceFiles([ROTATED_LETTER_QUESTION_VOICE])
  const question = baseQuestion(args.seedHash, 'T15', 'rotated-letter-input', ROTATED_LETTER_PROMPT, target, {
    difficulty: 2,
    promptVoice: ROTATED_LETTER_PROMPT_VOICE,
    data: {
      generator: 'ROTATED_LETTER_INPUT',
      subType: 'rotated-letter',
      allowedLetters: [...ROTATED_LETTER_ALLOWED_LETTERS],
      questionText: ROTATED_LETTER_ANSWER_TEXT,
      questionVoice: questionVoiceAvailable ? ROTATED_LETTER_QUESTION_VOICE : undefined,
      questionVoiceAvailable,
      board: { items, style: pick(ROTATED_LETTER_BOARD_STYLES, args.random) },
    },
    knowledgeKey: 'FIND_ROTATED_LETTER',
  })
  validateRotatedLetterQuestion(question)
  return question
}

function generateT15(seedHash: string, random: Random) {
  return generateRotatedLetterQuestion({ seedHash, random })
}

export const MATCH_SAME_LETTER_COMMON_VOICE = {
  hayGhep: `${TRANG_NGUYEN_VOICE_ROOT}/common/hay-ghep.mp3`,
  va: `${TRANG_NGUYEN_VOICE_ROOT}/common/va.mp3`,
  coChuCaiGiongNhau: `${TRANG_NGUYEN_VOICE_ROOT}/common/co-chu-cai-giong-nhau.mp3`,
} as const

function getMatchObjectLabel(item: ObjectNameItem): string {
  const question = OBJECT_QUESTION_TEXT[item.id]
  const label = question?.replace(/^Đâu là /, '').replace(/\?$/, '')
  if (!label) throw new Error(`Missing display label for matching object: ${item.id}`)
  return label
}

const SAME_LETTER_MATCH_ANIMALS: SameLetterMatchAsset[] = tagNameManifest.items.flatMap(item => {
  const voice = resolveAnimalVoice(item.word)
  if (!voice) return []
  return [{
    id: `animal-${item.id}`,
    label: item.word,
    category: 'animal' as const,
    imageId: item.id,
    manifest: 'animal' as const,
    voice,
    visual: tagNameAnimalVisual(item),
  }]
})

const SAME_LETTER_MATCH_OBJECTS: SameLetterMatchAsset[] = objectNameManifest.items.flatMap(item => {
  const voice = resolveObjectNameVoice(item)
  if (!voice) return []
  return [{
    id: `object-${item.id}`,
    label: getMatchObjectLabel(item),
    category: 'object' as const,
    imageId: item.id,
    manifest: 'object' as const,
    voice,
    visual: objectNameVisual(item),
  }]
})

export const MATCH_SAME_LETTER_ASSET_COUNTS = {
  animals: SAME_LETTER_MATCH_ANIMALS.length,
  objects: SAME_LETTER_MATCH_OBJECTS.length,
} as const

function pickSameLetterMatchLetters(random: Random): string[] {
  const shuffled = shuffle([...VIETNAMESE_ALPHABET], random)
  const letters = shuffled.slice(0, 3)
  if (letters.includes('i') && letters.includes('y')) {
    const replacedLetter = random() < 0.5 ? 'i' : 'y'
    const otherSimilarLetter = replacedLetter === 'i' ? 'y' : 'i'
    const replacement = shuffled.find(letter => letter !== 'i' && letter !== 'y' && !letters.includes(letter))
    if (!replacement) throw new Error('MATCH_SAME_LETTER could not find a third unambiguous letter')
    letters[letters.indexOf(replacedLetter)] = replacement
    if (!letters.includes(otherSimilarLetter)) throw new Error('MATCH_SAME_LETTER letter selection became invalid')
  }
  return letters
}

export function getSameLetterMatchCombinationKey(leftAssetId: string, rightAssetId: string, letters: readonly string[]): string {
  return `${leftAssetId}-${rightAssetId}-${[...letters].sort().join('')}`
}

function matchesCanonicalMatchAsset(asset: SameLetterMatchAsset, canonical: SameLetterMatchAsset): boolean {
  const sprite = asset.visual.sprite
  const canonicalSprite = canonical.visual.sprite
  return asset.id === canonical.id && asset.label === canonical.label && asset.category === canonical.category
    && asset.imageId === canonical.imageId && asset.manifest === canonical.manifest && asset.voice === canonical.voice
    && asset.visual.type === 'image' && asset.visual.type === canonical.visual.type
    && asset.visual.value === canonical.visual.value && asset.visual.label === canonical.visual.label
    && Boolean(sprite && canonicalSprite && sprite.spriteSheet === canonicalSprite.spriteSheet
      && sprite.x === canonicalSprite.x && sprite.y === canonicalSprite.y
      && sprite.width === canonicalSprite.width && sprite.height === canonicalSprite.height
      && sprite.sheetWidth === canonicalSprite.sheetWidth && sprite.sheetHeight === canonicalSprite.sheetHeight)
}

export function validateSameLetterTwoGroupsQuestion(question: GeneratedExamQuestion): void {
  const data = question.data as SameLetterMatchData | undefined
  const assets = [...SAME_LETTER_MATCH_ANIMALS, ...SAME_LETTER_MATCH_OBJECTS]
  const leftAsset = assets.find(asset => asset.id === data?.leftAsset?.id)
  const rightAsset = assets.find(asset => asset.id === data?.rightAsset?.id)
  const letters = data?.letters ?? []
  const leftItems = data?.leftItems ?? []
  const rightItems = data?.rightItems ?? []
  const voiceSequence = data ? [
    MATCH_SAME_LETTER_COMMON_VOICE.hayGhep,
    data.leftAsset.voice,
    MATCH_SAME_LETTER_COMMON_VOICE.va,
    data.rightAsset.voice,
    MATCH_SAME_LETTER_COMMON_VOICE.coChuCaiGiongNhau,
  ] : []
  const voiceAvailable = voiceSequence.length > 0 && hasFindTargetVoiceFiles(voiceSequence)
  const expectedAnswer = Object.fromEntries(leftItems.map(item => [item.id, rightItems.find(right => right.letter === item.letter)?.id]))
  const answer = question.correctAnswer as Record<string, string> | undefined

  if (question.templateId !== 'T16' || question.type !== 'drag-match'
    || data?.generator !== 'MATCH_SAME_LETTER_TWO_GROUPS' || data.subType !== 'same-letter-two-groups'
    || !leftAsset || !rightAsset || leftAsset.id === rightAsset.id
    || leftAsset.category === rightAsset.category
    || !matchesCanonicalMatchAsset(data.leftAsset, leftAsset)
    || !matchesCanonicalMatchAsset(data.rightAsset, rightAsset)
    || letters.length !== 3 || new Set(letters).size !== 3
    || leftItems.length !== 3 || rightItems.length !== 3
    || new Set(leftItems.map(item => item.id)).size !== 3 || new Set(rightItems.map(item => item.id)).size !== 3
    || leftItems.some(item => !matchesCanonicalMatchAsset(item.asset, leftAsset) || !letters.includes(item.letter))
    || rightItems.some(item => !matchesCanonicalMatchAsset(item.asset, rightAsset) || !letters.includes(item.letter))
    || letters.some(letter => leftItems.filter(item => item.letter === letter).length !== 1
      || rightItems.filter(item => item.letter === letter).length !== 1)
    || data.combinationKey !== getSameLetterMatchCombinationKey(leftAsset.id, rightAsset.id, letters)
    || question.prompt !== `Hãy ghép ${leftAsset.label} và ${rightAsset.label} có chữ cái giống nhau.`
    || data.voiceSequence.length !== voiceSequence.length
    || data.voiceSequence.some((voice, index) => voice !== voiceSequence[index])
    || data.questionVoiceAvailable !== voiceAvailable
    || (voiceAvailable
      ? !Array.isArray(question.promptVoice) || question.promptVoice.length !== voiceSequence.length
        || question.promptVoice.some((voice, index) => voice !== voiceSequence[index])
      : question.promptVoice !== undefined)
    || !answer || Object.keys(answer).length !== 3
    || Object.entries(expectedAnswer).some(([leftId, rightId]) => !rightId || answer[leftId] !== rightId)
    || new Set(Object.values(answer)).size !== 3)
    throw new Error('MATCH_SAME_LETTER_TWO_GROUPS has invalid assets, letters, prompt, voice sequence, or matching map')
}

export function generateSameLetterTwoGroupsQuestion(args: {
  seedHash: string
  random: Random
  excludeCombinations?: readonly string[]
}): GeneratedExamQuestion {
  if (!SAME_LETTER_MATCH_ANIMALS.length || !SAME_LETTER_MATCH_OBJECTS.length)
    throw new Error('MATCH_SAME_LETTER_TWO_GROUPS requires available animal and object images with voices')

  const excluded = new Set(args.excludeCombinations ?? [])
  let chosen: {
    leftAsset: SameLetterMatchAsset
    rightAsset: SameLetterMatchAsset
    letters: string[]
    combinationKey: string
  } | undefined
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const animal = pick(SAME_LETTER_MATCH_ANIMALS, args.random)
    const object = pick(SAME_LETTER_MATCH_OBJECTS, args.random)
    const [leftAsset, rightAsset] = args.random() < 0.5 ? [animal, object] : [object, animal]
    const letters = pickSameLetterMatchLetters(args.random)
    const combinationKey = getSameLetterMatchCombinationKey(leftAsset.id, rightAsset.id, letters)
    chosen = { leftAsset, rightAsset, letters, combinationKey }
    if (!excluded.has(combinationKey)) break
  }
  if (!chosen || excluded.has(chosen.combinationKey))
    throw new Error('MATCH_SAME_LETTER_TWO_GROUPS could not make a new combination')

  const { leftAsset, rightAsset, letters, combinationKey } = chosen
  const leftItems: SameLetterMatchItem[] = letters.map((letter, index) => ({ id: `left-${index}-${letter}`, asset: leftAsset, letter }))
  const rightItems: SameLetterMatchItem[] = shuffle(letters, args.random).map((letter, index) => ({ id: `right-${index}-${letter}`, asset: rightAsset, letter }))
  const correctAnswer = Object.fromEntries(leftItems.map(item => [item.id, rightItems.find(right => right.letter === item.letter)!.id]))
  const prompt = `Hãy ghép ${leftAsset.label} và ${rightAsset.label} có chữ cái giống nhau.`
  const voiceSequence = [
    MATCH_SAME_LETTER_COMMON_VOICE.hayGhep,
    leftAsset.voice,
    MATCH_SAME_LETTER_COMMON_VOICE.va,
    rightAsset.voice,
    MATCH_SAME_LETTER_COMMON_VOICE.coChuCaiGiongNhau,
  ]
  const questionVoiceAvailable = hasFindTargetVoiceFiles(voiceSequence)
  const question = baseQuestion(args.seedHash, 'T16', 'drag-match', prompt, correctAnswer, {
    difficulty: 1,
    promptVoice: questionVoiceAvailable ? voiceSequence : undefined,
    data: {
      generator: 'MATCH_SAME_LETTER_TWO_GROUPS',
      subType: 'same-letter-two-groups',
      leftAsset,
      rightAsset,
      letters,
      leftItems,
      rightItems,
      voiceSequence,
      questionVoiceAvailable,
      combinationKey,
    } satisfies SameLetterMatchData,
    knowledgeKey: 'MATCH_SAME_LETTER',
  })
  validateSameLetterTwoGroupsQuestion(question)
  return question
}

function generateT16(seedHash: string, random: Random) {
  return generateSameLetterTwoGroupsQuestion({ seedHash, random })
}

export const MATCH_LOWER_UPPER_CASE_PROMPT = 'Hãy ghép chữ in thường và chữ in hoa thích hợp.'
export const MATCH_LOWER_UPPER_CASE_VOICE_SEQUENCE = [
  `${TRANG_NGUYEN_VOICE_ROOT}/common/hay-ghep-chu-in-thuong-va-chu-in-hoa-thich-hop.mp3`,
] as const

type LetterCardBackground = typeof letterCardAnimalsManifest.items[number]

function letterCardBackgroundVisual(item: LetterCardBackground): ExamVisual {
  return {
    type: 'image',
    value: letterCardAnimalsManifest.image,
    label: item.label,
    sprite: {
      spriteSheet: letterCardAnimalsManifest.image,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      sheetWidth: letterCardAnimalsManifest.width,
      sheetHeight: letterCardAnimalsManifest.height,
    },
  }
}

function uppercaseVietnameseLetter(letter: string): string {
  return letter.normalize('NFC').toLocaleUpperCase('vi-VN')
}

export function getLowerUpperMatchCombinationKey(leftBackgroundId: string, rightBackgroundId: string, letters: readonly string[]): string {
  return `${leftBackgroundId}-${rightBackgroundId}-${[...letters].map(letter => letter.normalize('NFC')).sort().join('')}`
}

function matchesLetterCardVisual(visual: ExamVisual, background: LetterCardBackground): boolean {
  const crop = visual.sprite
  return visual.type === 'image' && visual.value === letterCardAnimalsManifest.image
    && visual.label === background.label && Boolean(crop)
    && crop?.spriteSheet === letterCardAnimalsManifest.image
    && crop.x === background.x && crop.y === background.y
    && crop.width === background.width && crop.height === background.height
    && crop.sheetWidth === letterCardAnimalsManifest.width && crop.sheetHeight === letterCardAnimalsManifest.height
}

export function validateLowerUpperMatchQuestion(question: GeneratedExamQuestion): void {
  const data = question.data as LowerUpperMatchData | undefined
  const leftBackground = letterCardAnimalsManifest.items.find(item => item.id === data?.leftBackgroundId)
  const rightBackground = letterCardAnimalsManifest.items.find(item => item.id === data?.rightBackgroundId)
  const letters = data?.letters ?? []
  const leftItems = data?.leftItems ?? []
  const rightItems = data?.rightItems ?? []
  const expectedAnswer = Object.fromEntries(leftItems.map(left => [
    left.id,
    rightItems.find(right => right.matchKey === left.matchKey)?.id,
  ]))
  const answer = question.correctAnswer as Record<string, string> | undefined
  const voiceAvailable = hasFindTargetVoiceFiles([...MATCH_LOWER_UPPER_CASE_VOICE_SEQUENCE])
  const expectedVoiceSequence = voiceAvailable ? [...MATCH_LOWER_UPPER_CASE_VOICE_SEQUENCE] : []

  if (question.templateId !== 'T17' || question.type !== 'drag-match'
    || data?.generator !== 'MATCH_LOWER_UPPER_CASE' || data.subType !== 'lowercase-uppercase'
    || question.prompt !== MATCH_LOWER_UPPER_CASE_PROMPT || question.knowledgeKey !== 'MATCH_LOWER_UPPER_CASE'
    || !leftBackground || !rightBackground || leftBackground.id === rightBackground.id
    || letters.length !== 3 || new Set(letters).size !== 3
    || letters.some(letter => !VIETNAMESE_ALPHABET.includes(letter as typeof VIETNAMESE_ALPHABET[number])
      || letter !== letter.normalize('NFC').toLocaleLowerCase('vi-VN'))
    || leftItems.length !== 3 || rightItems.length !== 3
    || new Set(leftItems.map(item => item.id)).size !== 3 || new Set(rightItems.map(item => item.id)).size !== 3
    || leftItems.some(item => !letters.includes(item.matchKey)
      || item.displayLetter !== item.matchKey
      || item.matchKey !== item.matchKey.normalize('NFC').toLocaleLowerCase('vi-VN')
      || item.backgroundId !== leftBackground.id || item.backgroundLabel !== leftBackground.label
      || !matchesLetterCardVisual(item.visual, leftBackground))
    || rightItems.some(item => !letters.includes(item.matchKey)
      || item.displayLetter !== uppercaseVietnameseLetter(item.matchKey)
      || item.backgroundId !== rightBackground.id || item.backgroundLabel !== rightBackground.label
      || !matchesLetterCardVisual(item.visual, rightBackground))
    || letters.some(letter => leftItems.filter(item => item.matchKey === letter).length !== 1
      || rightItems.filter(item => item.matchKey === letter).length !== 1)
    || data.combinationKey !== getLowerUpperMatchCombinationKey(leftBackground.id, rightBackground.id, letters)
    || data.voiceSequence.length !== expectedVoiceSequence.length
    || data.voiceSequence.some((voice, index) => voice !== expectedVoiceSequence[index])
    || data.questionVoiceAvailable !== voiceAvailable
    || (voiceAvailable
      ? !Array.isArray(question.promptVoice) || question.promptVoice.length !== MATCH_LOWER_UPPER_CASE_VOICE_SEQUENCE.length
        || question.promptVoice.some((voice, index) => voice !== MATCH_LOWER_UPPER_CASE_VOICE_SEQUENCE[index])
      : question.promptVoice !== undefined)
    || !answer || Object.keys(answer).length !== 3
    || Object.entries(expectedAnswer).some(([leftId, rightId]) => !rightId || answer[leftId] !== rightId)
    || new Set(Object.values(answer)).size !== 3)
    throw new Error('MATCH_LOWER_UPPER_CASE has invalid backgrounds, letters, prompt, voice sequence, or matching map')
}

export function generateLowerUpperMatchQuestion(args: {
  seedHash: string
  random: Random
  excludeCombinations?: readonly string[]
}): GeneratedExamQuestion {
  const backgrounds = letterCardAnimalsManifest.items
  if (backgrounds.length < 2) throw new Error('MATCH_LOWER_UPPER_CASE requires two animal-card backgrounds')
  const excluded = new Set(args.excludeCombinations ?? [])
  const availableLetters = shuffle([...VIETNAMESE_ALPHABET], args.random)
  const leftBackground = pick(shuffle(backgrounds, args.random), args.random)
  let rightBackground = pick(shuffle(backgrounds.filter(item => item.id !== leftBackground.id), args.random), args.random)
  let letters = availableLetters.slice(0, 3)
  let combinationKey = getLowerUpperMatchCombinationKey(leftBackground.id, rightBackground.id, letters)
  for (let attempt = 0; excluded.has(combinationKey) && attempt < 100; attempt += 1) {
    rightBackground = pick(shuffle(backgrounds.filter(item => item.id !== leftBackground.id), args.random), args.random)
    letters = shuffle([...VIETNAMESE_ALPHABET], args.random).slice(0, 3)
    combinationKey = getLowerUpperMatchCombinationKey(leftBackground.id, rightBackground.id, letters)
  }
  if (excluded.has(combinationKey)) throw new Error('MATCH_LOWER_UPPER_CASE could not make a new combination')

  const leftVisual = letterCardBackgroundVisual(leftBackground)
  const rightVisual = letterCardBackgroundVisual(rightBackground)
  const leftItems: LowerUpperMatchItem[] = letters.map((letter, index) => ({
    id: `lower-${index}-${optionId(letter)}`,
    displayLetter: letter,
    matchKey: letter.normalize('NFC'),
    backgroundId: leftBackground.id,
    backgroundLabel: leftBackground.label,
    visual: leftVisual,
  }))
  const rightItems: LowerUpperMatchItem[] = shuffle(letters, args.random).map((letter, index) => ({
    id: `upper-${index}-${optionId(letter)}`,
    displayLetter: uppercaseVietnameseLetter(letter),
    matchKey: letter.normalize('NFC'),
    backgroundId: rightBackground.id,
    backgroundLabel: rightBackground.label,
    visual: rightVisual,
  }))
  const correctAnswer = Object.fromEntries(leftItems.map(left => [left.id, rightItems.find(right => right.matchKey === left.matchKey)!.id]))
  const questionVoiceAvailable = hasFindTargetVoiceFiles([...MATCH_LOWER_UPPER_CASE_VOICE_SEQUENCE])
  const voiceSequence = questionVoiceAvailable ? [...MATCH_LOWER_UPPER_CASE_VOICE_SEQUENCE] : []
  const question = baseQuestion(args.seedHash, 'T17', 'drag-match', MATCH_LOWER_UPPER_CASE_PROMPT, correctAnswer, {
    difficulty: 1,
    promptVoice: questionVoiceAvailable ? voiceSequence : undefined,
    data: {
      generator: 'MATCH_LOWER_UPPER_CASE',
      subType: 'lowercase-uppercase',
      leftBackgroundId: leftBackground.id,
      rightBackgroundId: rightBackground.id,
      letters,
      leftItems,
      rightItems,
      combinationKey,
      voiceSequence,
      questionVoiceAvailable,
    } satisfies LowerUpperMatchData,
    knowledgeKey: 'MATCH_LOWER_UPPER_CASE',
  })
  validateLowerUpperMatchQuestion(question)
  return question
}

function generateT17(seedHash: string, random: Random) {
  return generateLowerUpperMatchQuestion({ seedHash, random })
}

export const MATCH_IMAGE_WITH_SOUND_PROMPT = 'Hãy ghép hình ảnh với âm thanh thích hợp.'
export const MATCH_IMAGE_WITH_SOUND_PROMPT_VOICE = `${TRANG_NGUYEN_VOICE_ROOT}/common/hay-ghep-hinh-anh-voi-am-thanh-thich-hop.mp3`
const MATCH_IMAGE_WITH_SOUND_VOICE_ROOT = `${TRANG_NGUYEN_VOICE_ROOT}/letters`

export const MATCH_IMAGE_WITH_SOUND_SINGLE_SOUNDS = [
  { id: 'a', letter: 'a', audioId: 'a' },
  { id: 'b', letter: 'b', audioId: 'b' },
  { id: 'c', letter: 'c', audioId: 'c' },
  { id: 'd', letter: 'd', audioId: 'd' },
  { id: 'dd', letter: 'đ', audioId: 'dd' },
  { id: 'e', letter: 'e', audioId: 'e' },
  { id: 'ee', letter: 'ê', audioId: 'ee' },
  { id: 'g', letter: 'g', audioId: 'g' },
  { id: 'h', letter: 'h', audioId: 'h' },
  { id: 'i', letter: 'i', audioId: 'i' },
  { id: 'k', letter: 'k', audioId: 'k' },
  { id: 'l', letter: 'l', audioId: 'l' },
  { id: 'm', letter: 'm', audioId: 'm' },
  { id: 'n', letter: 'n', audioId: 'n' },
  { id: 'o', letter: 'o', audioId: 'o' },
  { id: 'oo', letter: 'ô', audioId: 'oo' },
  { id: 'ow', letter: 'ơ', audioId: 'ow' },
  { id: 'p', letter: 'p', audioId: 'p' },
  { id: 'r', letter: 'r', audioId: 'r' },
  { id: 's', letter: 's', audioId: 's' },
  { id: 't', letter: 't', audioId: 't' },
  { id: 'u', letter: 'u', audioId: 'u' },
  { id: 'uw', letter: 'ư', audioId: 'uw' },
  { id: 'v', letter: 'v', audioId: 'v' },
] as const

export function getImageWithSoundCombinationKey(soundIds: readonly string[]): string {
  return [...soundIds].sort().join('|')
}

function imageSoundVisual(soundId: string): ExamVisual {
  const item = dinoLetterSoundManifest.items.find(candidate => candidate.id === soundId)
  if (!item) throw new Error(`MATCH_IMAGE_WITH_SOUND is missing dino sprite: ${soundId}`)
  return {
    type: 'image',
    value: item.letter,
    label: `Khủng long chữ ${item.letter}`,
    sprite: {
      spriteSheet: dinoLetterSoundManifest.image,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      sheetWidth: dinoLetterSoundManifest.width,
      sheetHeight: dinoLetterSoundManifest.height,
    },
  }
}

export function validateImageWithSoundMatchQuestion(question: GeneratedExamQuestion): void {
  const data = question.data as ImageSoundMatchData | undefined
  const leftItems = data?.leftItems ?? []
  const rightItems = data?.rightItems ?? []
  const leftSoundIds = leftItems.map(item => item.soundId)
  const rightSoundIds = rightItems.map(item => item.soundId)
  const questionVoiceAvailable = hasFindTargetVoiceFiles([MATCH_IMAGE_WITH_SOUND_PROMPT_VOICE])
  const expectedAnswer = Object.fromEntries(leftItems.map(left => [
    left.id,
    rightItems.find(right => right.soundId === left.soundId)?.id,
  ]))
  const answer = question.correctAnswer as Record<string, string> | undefined

  if (question.templateId !== 'T18' || question.type !== 'drag-match'
    || data?.generator !== 'MATCH_IMAGE_WITH_SOUND' || data.subType !== 'image-to-audio'
    || question.prompt !== MATCH_IMAGE_WITH_SOUND_PROMPT || question.knowledgeKey !== 'MATCH_IMAGE_WITH_SOUND'
    || leftItems.length !== 3 || rightItems.length !== 3
    || new Set(leftItems.map(item => item.id)).size !== 3 || new Set(rightItems.map(item => item.id)).size !== 3
    || new Set(leftSoundIds).size !== 3 || new Set(rightSoundIds).size !== 3
    || getImageWithSoundCombinationKey(leftSoundIds) !== getImageWithSoundCombinationKey(rightSoundIds)
    || data.combinationKey !== getImageWithSoundCombinationKey(leftSoundIds)
    || leftItems.some(item => {
      const source = MATCH_IMAGE_WITH_SOUND_SINGLE_SOUNDS.find(candidate => candidate.id === item.soundId)
      const sprite = dinoLetterSoundManifest.items.find(candidate => candidate.id === item.imageId)
      return !source || !sprite || item.imageId !== source.id || item.letter !== source.letter
        || item.visual.type !== 'image' || item.visual.sprite?.spriteSheet !== dinoLetterSoundManifest.image
        || item.visual.sprite.x !== sprite.x || item.visual.sprite.y !== sprite.y
        || item.visual.sprite.width !== sprite.width || item.visual.sprite.height !== sprite.height
        || !hasFindTargetVoiceFiles([`${MATCH_IMAGE_WITH_SOUND_VOICE_ROOT}/${source.audioId}.mp3`])
    })
    || rightItems.some(item => {
      const source = MATCH_IMAGE_WITH_SOUND_SINGLE_SOUNDS.find(candidate => candidate.id === item.soundId)
      return !source || item.audioId !== source.audioId
        || item.audioPath !== `${MATCH_IMAGE_WITH_SOUND_VOICE_ROOT}/${source.audioId}.mp3`
        || !hasFindTargetVoiceFiles([item.audioPath])
    })
    || data.questionVoiceAvailable !== questionVoiceAvailable
    || question.promptVoice !== (questionVoiceAvailable ? MATCH_IMAGE_WITH_SOUND_PROMPT_VOICE : undefined)
    || !answer || Object.keys(answer).length !== 3
    || Object.entries(expectedAnswer).some(([leftId, rightId]) => !rightId || answer[leftId] !== rightId)
    || new Set(Object.values(answer)).size !== 3)
    throw new Error('MATCH_IMAGE_WITH_SOUND has invalid sprite items, sound assets, prompt voice, or matching map')
}

export function generateImageWithSoundMatchQuestion(args: {
  seedHash: string
  random: Random
  excludeSoundIds?: readonly string[]
  excludeCombinations?: readonly string[]
}): GeneratedExamQuestion {
  const manifestIds = new Set(dinoLetterSoundManifest.items.map(item => item.id))
  const pool = MATCH_IMAGE_WITH_SOUND_SINGLE_SOUNDS.filter(item => manifestIds.has(item.id)
    && hasFindTargetVoiceFiles([`${MATCH_IMAGE_WITH_SOUND_VOICE_ROOT}/${item.audioId}.mp3`]))
  if (pool.length !== MATCH_IMAGE_WITH_SOUND_SINGLE_SOUNDS.length)
    throw new Error('MATCH_IMAGE_WITH_SOUND requires all 24 dino sprites and letter audio files')

  const recentSoundIds = new Set(args.excludeSoundIds ?? [])
  const preferredPool = pool.filter(item => !recentSoundIds.has(item.id))
  const selectionPool = preferredPool.length >= 3 ? preferredPool : pool
  const excludedCombinations = new Set(args.excludeCombinations ?? [])
  let selected = pickDistractors({ pool: selectionPool, exclude: [], count: 3, random: args.random })
  let combinationKey = getImageWithSoundCombinationKey(selected.map(item => item.id))
  for (let attempt = 0; excludedCombinations.has(combinationKey) && attempt < 100; attempt += 1) {
    selected = pickDistractors({ pool: selectionPool, exclude: [], count: 3, random: args.random })
    combinationKey = getImageWithSoundCombinationKey(selected.map(item => item.id))
  }
  if (excludedCombinations.has(combinationKey)) throw new Error('MATCH_IMAGE_WITH_SOUND could not make a new sound combination')

  const leftItems = selected.map((item, index) => ({
    id: `left-${item.id}-${index}`,
    soundId: item.id,
    letter: item.letter,
    imageId: item.id,
    visual: imageSoundVisual(item.id),
  }))
  const rightItems = shuffle(selected, args.random).map((item, index) => ({
    id: `right-${item.id}-${index}`,
    soundId: item.id,
    audioId: item.audioId,
    audioPath: `${MATCH_IMAGE_WITH_SOUND_VOICE_ROOT}/${item.audioId}.mp3`,
  }))
  const correctAnswer = Object.fromEntries(leftItems.map(left => [
    left.id,
    rightItems.find(right => right.soundId === left.soundId)!.id,
  ]))
  const questionVoiceAvailable = hasFindTargetVoiceFiles([MATCH_IMAGE_WITH_SOUND_PROMPT_VOICE])
  const question = baseQuestion(args.seedHash, 'T18', 'drag-match', MATCH_IMAGE_WITH_SOUND_PROMPT, correctAnswer, {
    difficulty: 2,
    promptVoice: questionVoiceAvailable ? MATCH_IMAGE_WITH_SOUND_PROMPT_VOICE : undefined,
    data: {
      generator: 'MATCH_IMAGE_WITH_SOUND',
      subType: 'image-to-audio',
      leftItems,
      rightItems,
      questionVoiceAvailable,
      combinationKey,
    } satisfies ImageSoundMatchData,
    knowledgeKey: 'MATCH_IMAGE_WITH_SOUND',
  })
  validateImageWithSoundMatchQuestion(question)
  return question
}

function generateT18(seedHash: string, random: Random) {
  return generateImageWithSoundMatchQuestion({ seedHash, random })
}

export const MATCH_OBJECT_WITH_NAME_PROMPT = 'Hãy ghép hình ảnh đồ vật với tên gọi thích hợp.'
export const MATCH_OBJECT_WITH_NAME_PROMPT_VOICE = `${TRANG_NGUYEN_VOICE_ROOT}/common/hay-ghep-hinh-anh-do-vat-voi-ten-goi-thich-hop.mp3`
export const MATCH_OBJECT_WITH_NAME_POOL_IDS = [
  'mu', 'khan', 'dep', 'tat', 'ba-lo', 'but-chi', 'tay', 'thuoc', 'vo', 'sach', 'cap', 'o', 'bong',
  'o-to', 'gau-bong', 'dong-ho', 'den', 'keo', 'luoc', 'coc', 'thia', 'ghe', 'chia-khoa', 'dieu',
] as const

export function getObjectWithNameCombinationKey(objectIds: readonly string[]): string {
  return [...objectIds].sort().join('|')
}

export function validateObjectImageWithAudioQuestion(question: GeneratedExamQuestion): void {
  const data = question.data as ObjectSoundMatchData | undefined
  const leftItems = data?.leftItems ?? []
  const rightItems = data?.rightItems ?? []
  const leftIds = leftItems.map(item => item.matchKey)
  const rightIds = rightItems.map(item => item.matchKey)
  const questionVoiceAvailable = hasFindTargetVoiceFiles([MATCH_OBJECT_WITH_NAME_PROMPT_VOICE])
  const expectedAnswer = Object.fromEntries(leftItems.map(left => [
    left.id,
    rightItems.find(right => right.matchKey === left.matchKey)?.id,
  ]))
  const answer = question.correctAnswer as Record<string, string> | undefined

  if (question.templateId !== 'T19' || question.type !== 'drag-match'
    || data?.generator !== 'MATCH_OBJECT_WITH_NAME' || data.subType !== 'object-image-to-audio'
    || question.prompt !== MATCH_OBJECT_WITH_NAME_PROMPT || question.knowledgeKey !== 'MATCH_OBJECT_WITH_NAME'
    || leftItems.length !== 3 || rightItems.length !== 3
    || new Set(leftItems.map(item => item.id)).size !== 3 || new Set(rightItems.map(item => item.id)).size !== 3
    || new Set(leftIds).size !== 3 || new Set(rightIds).size !== 3
    || getObjectWithNameCombinationKey(leftIds) !== getObjectWithNameCombinationKey(rightIds)
    || data.combinationKey !== getObjectWithNameCombinationKey(leftIds)
    || leftItems.some(item => {
      const source = MATCH_OBJECT_WITH_NAME_POOL_IDS.find(id => id === item.objectId)
      const sprite = objectNameManifest.items.find(candidate => candidate.id === item.imageId)
      const voice = OBJECT_VOICE_MAP[item.objectId]
      return !source || !sprite || item.imageId !== source || item.matchKey !== source
        || item.word !== sprite.word || item.voice !== voice
        || item.visual.type !== 'image' || item.visual.sprite?.spriteSheet !== objectNameManifest.image
        || item.visual.sprite.x !== sprite.x || item.visual.sprite.y !== sprite.y
        || item.visual.sprite.width !== sprite.width || item.visual.sprite.height !== sprite.height
        || !hasFindTargetVoiceFiles([voice])
    })
    || rightItems.some(item => {
      const voice = OBJECT_VOICE_MAP[item.objectId]
      return !MATCH_OBJECT_WITH_NAME_POOL_IDS.includes(item.objectId as typeof MATCH_OBJECT_WITH_NAME_POOL_IDS[number])
        || item.matchKey !== item.objectId || item.voice !== voice || !hasFindTargetVoiceFiles([voice])
    })
    || data.questionVoiceAvailable !== questionVoiceAvailable
    || question.promptVoice !== (questionVoiceAvailable ? MATCH_OBJECT_WITH_NAME_PROMPT_VOICE : undefined)
    || !answer || Object.keys(answer).length !== 3
    || Object.entries(expectedAnswer).some(([leftId, rightId]) => !rightId || answer[leftId] !== rightId)
    || new Set(Object.values(answer)).size !== 3)
    throw new Error('MATCH_OBJECT_WITH_NAME has invalid image crops, object voices, prompt voice, or matching map')
}

export function generateObjectImageWithAudioQuestion(args: {
  seedHash: string
  random: Random
  excludeObjectIds?: readonly string[]
  excludeCombinations?: readonly string[]
}): GeneratedExamQuestion {
  const pool = MATCH_OBJECT_WITH_NAME_POOL_IDS.map(id => {
    const item = objectNameManifest.items.find(candidate => candidate.id === id)
    const voice = OBJECT_VOICE_MAP[id]
    if (!item || !voice || !hasFindTargetVoiceFiles([voice])) return undefined
    return { id, word: item.word, voice, visual: { ...objectNameVisual(item), label: 'Hình đồ vật' } }
  }).filter((item): item is NonNullable<typeof item> => Boolean(item))
  if (pool.length !== MATCH_OBJECT_WITH_NAME_POOL_IDS.length)
    throw new Error('MATCH_OBJECT_WITH_NAME requires each selected object image and its recorded voice')

  const recentObjectIds = new Set(args.excludeObjectIds ?? [])
  const preferredPool = pool.filter(item => !recentObjectIds.has(item.id))
  const selectionPool = preferredPool.length >= 3 ? preferredPool : pool
  const excludedCombinations = new Set(args.excludeCombinations ?? [])
  let selected = pickDistractors({ pool: selectionPool, exclude: [], count: 3, random: args.random })
  let combinationKey = getObjectWithNameCombinationKey(selected.map(item => item.id))
  for (let attempt = 0; excludedCombinations.has(combinationKey) && attempt < 100; attempt += 1) {
    selected = pickDistractors({ pool: selectionPool, exclude: [], count: 3, random: args.random })
    combinationKey = getObjectWithNameCombinationKey(selected.map(item => item.id))
  }
  if (excludedCombinations.has(combinationKey)) throw new Error('MATCH_OBJECT_WITH_NAME could not make a new object combination')

  const leftItems = selected.map((item, index) => ({
    id: `left-${item.id}-${index}`,
    objectId: item.id,
    imageId: item.id,
    word: item.word,
    voice: item.voice,
    matchKey: item.id,
    visual: item.visual,
  }))
  const rightItems = shuffle(selected, args.random).map((item, index) => ({
    id: `right-${item.id}-${index}`,
    objectId: item.id,
    voice: item.voice,
    matchKey: item.id,
  }))
  const correctAnswer = Object.fromEntries(leftItems.map(left => [
    left.id,
    rightItems.find(right => right.matchKey === left.matchKey)!.id,
  ]))
  const questionVoiceAvailable = hasFindTargetVoiceFiles([MATCH_OBJECT_WITH_NAME_PROMPT_VOICE])
  const question = baseQuestion(args.seedHash, 'T19', 'drag-match', MATCH_OBJECT_WITH_NAME_PROMPT, correctAnswer, {
    difficulty: 2,
    promptVoice: questionVoiceAvailable ? MATCH_OBJECT_WITH_NAME_PROMPT_VOICE : undefined,
    data: {
      generator: 'MATCH_OBJECT_WITH_NAME',
      subType: 'object-image-to-audio',
      leftItems,
      rightItems,
      questionVoiceAvailable,
      combinationKey,
    } satisfies ObjectSoundMatchData,
    knowledgeKey: 'MATCH_OBJECT_WITH_NAME',
  })
  validateObjectImageWithAudioQuestion(question)
  return question
}

function generateT19(seedHash: string, random: Random) {
  return generateObjectImageWithAudioQuestion({ seedHash, random })
}

export const CLASSIFY_NUMBER_AND_LETTER_PROMPT = 'Em hãy xếp các hình ảnh vào nhóm thích hợp.'
export const CLASSIFY_NUMBER_AND_LETTER_NOTE = '(Lưu ý: Các chữ số xếp vào ô số 1. Các chữ cái xếp vào ô số 2.)'
export const CLASSIFY_NUMBER_AND_LETTER_LETTER_POOL = [
  'a', 'ă', 'â', 'b', 'c', 'd', 'đ', 'e', 'ê', 'g', 'h', 'i', 'k', 'l',
  'm', 'n', 'o', 'ô', 'ơ', 'p', 'q', 'r', 's', 't', 'u', 'ư', 'v', 'x', 'y',
] as const
export const CLASSIFY_NUMBER_AND_LETTER_COLORS = [
  '#d9b8f3', '#f9a8d4', '#fde68a', '#93c5fd', '#86efac', '#fdba74',
] as const

function generateT20(seedHash: string, random: Random) {
  return generateNumberLetterClassifyQuestion({ seedHash, random })
}

export const CLASSIFY_COMMON_VOICE_SEQUENCE = [
  `${TRANG_NGUYEN_VOICE_ROOT}/common/em-hay-xep-cac-hinh-anh-vao-nhom-thich-hop.mp3`,
  `${TRANG_NGUYEN_VOICE_ROOT}/common/luu-y.mp3`,
  `${TRANG_NGUYEN_VOICE_ROOT}/common/cac-loai.mp3`,
  `${TRANG_NGUYEN_VOICE_ROOT}/common/chu-so.mp3`,
  `${TRANG_NGUYEN_VOICE_ROOT}/common/xep-vao-o-so-1.mp3`,
  `${TRANG_NGUYEN_VOICE_ROOT}/common/cac-loai.mp3`,
  `${TRANG_NGUYEN_VOICE_ROOT}/common/chu-cai.mp3`,
  `${TRANG_NGUYEN_VOICE_ROOT}/common/xep-vao-o-so-2.mp3`,
] as const

export function validateSharedNumberLetterQuestion(question: GeneratedExamQuestion) {
  const data = question.data as ClassificationDragDropData | undefined
  const items = data?.items ?? []
  const numbers = items.filter(item => item.id.startsWith('number-'))
  const letters = items.filter(item => item.id.startsWith('letter-'))
  const answer = question.correctAnswer
  const availableVoice = hasFindTargetVoiceFiles([...CLASSIFY_COMMON_VOICE_SEQUENCE])
  const expectedGroups = [
    { id: 'numbers', label: '1. chữ số' },
    { id: 'letters', label: '2. chữ cái' },
  ]

  if (!data || question.templateId !== 'T20' || question.type !== 'categorize'
    || question.prompt !== CLASSIFY_NUMBER_AND_LETTER_PROMPT
    || question.knowledgeKey !== 'CLASSIFY_NUMBER_AND_LETTER'
    || data.generator !== 'CLASSIFY_NUMBER_AND_LETTER' || data.subType !== 'number-vs-letter'
    || data.note !== CLASSIFY_NUMBER_AND_LETTER_NOTE || items.length !== 6
    || numbers.length !== 3 || letters.length !== 3
    || new Set(items.map(item => item.id)).size !== 6
    || new Set(numbers.map(item => item.value)).size !== 3
    || new Set(letters.map(item => item.value?.normalize('NFC'))).size !== 3
    || numbers.some(item => item.kind !== 'text' || !/^\d$/.test(item.value ?? '') || item.groupId !== 'numbers')
    || letters.some(item => item.kind !== 'text' || !CLASSIFY_NUMBER_AND_LETTER_LETTER_POOL.includes(item.value as typeof CLASSIFY_NUMBER_AND_LETTER_LETTER_POOL[number]) || item.groupId !== 'letters')
    || new Set(items.map(item => item.decoration?.type)).size !== 1
    || items.some(item => !['flower', 'ball'].includes(item.decoration?.type ?? '')
      || !CLASSIFY_NUMBER_AND_LETTER_COLORS.includes(item.color as typeof CLASSIFY_NUMBER_AND_LETTER_COLORS[number]))
    || data.groups.length !== expectedGroups.length
    || data.groups.some((group, index) => group.id !== expectedGroups[index].id || group.label !== expectedGroups[index].label)
    || data.maxItemsPerGroup !== 3 || data.acceptIncorrectPlacement !== true
    || !answer || Array.isArray(answer) || typeof answer !== 'object' || Object.keys(answer).length !== 6
    || items.some(item => answer[item.id] !== item.groupId)
    || data.voiceSequence.length !== (availableVoice ? CLASSIFY_COMMON_VOICE_SEQUENCE.length : 0)
    || data.voiceSequence.some((voice, index) => voice !== CLASSIFY_COMMON_VOICE_SEQUENCE[index])
    || question.promptVoice !== (availableVoice ? data.voiceSequence : undefined))
    throw new Error('CLASSIFY_NUMBER_AND_LETTER has invalid items, categories, prompt, or voice')
}

export function generateNumberLetterClassifyQuestion(args: { seedHash: string; random: Random }) {
  const { seedHash, random } = args
  const numbers = pickDistractors({ pool: Array.from({ length: 10 }, (_, index) => String(index)), exclude: [], count: 3, random })
  const letters = pickDistractors({ pool: CLASSIFY_NUMBER_AND_LETTER_LETTER_POOL, exclude: [], count: 3, random })
  const decorationType = pick(['flower', 'ball'] as const, random)
  const items: ClassificationItem[] = shuffle([
    ...numbers.map(value => ({
      id: `number-${value}`,
      kind: 'text' as const,
      value,
      groupId: 'numbers',
      decoration: { type: decorationType },
      color: pick(CLASSIFY_NUMBER_AND_LETTER_COLORS, random),
    })),
    ...letters.map(value => ({
      id: `letter-${optionId(value)}`,
      kind: 'text' as const,
      value,
      groupId: 'letters',
      decoration: { type: decorationType },
      color: pick(CLASSIFY_NUMBER_AND_LETTER_COLORS, random),
    })),
  ], random)
  const correctAnswer = Object.fromEntries(items.map(item => [item.id, item.groupId]))
  const voiceSequence = hasFindTargetVoiceFiles([...CLASSIFY_COMMON_VOICE_SEQUENCE]) ? [...CLASSIFY_COMMON_VOICE_SEQUENCE] : []
  const question = baseQuestion(seedHash, 'T20', 'categorize', CLASSIFY_NUMBER_AND_LETTER_PROMPT, correctAnswer, {
    difficulty: 2,
    promptVoice: voiceSequence.length ? voiceSequence : undefined,
    data: {
      generator: 'CLASSIFY_NUMBER_AND_LETTER',
      subType: 'number-vs-letter',
      note: CLASSIFY_NUMBER_AND_LETTER_NOTE,
      items,
      groups: [{ id: 'numbers', label: '1. chữ số' }, { id: 'letters', label: '2. chữ cái' }],
      voiceSequence,
      maxItemsPerGroup: 3,
      acceptIncorrectPlacement: true,
    },
    knowledgeKey: 'CLASSIFY_NUMBER_AND_LETTER',
  })
  validateSharedNumberLetterQuestion(question)
  return question
}

export type Category21 = ClassificationManifestId

export const CATEGORY_21_META: Record<Category21, { label: string; voice: string }> = {
  vegetable: { label: 'rau', voice: `${TRANG_NGUYEN_VOICE_ROOT}/common/rau.mp3` },
  tuber: { label: 'củ', voice: `${TRANG_NGUYEN_VOICE_ROOT}/common/cu.mp3` },
  fruit: { label: 'quả', voice: `${TRANG_NGUYEN_VOICE_ROOT}/common/qua.mp3` },
  animal: { label: 'con vật', voice: `${TRANG_NGUYEN_VOICE_ROOT}/common/con-vat.mp3` },
  flower: { label: 'hoa', voice: `${TRANG_NGUYEN_VOICE_ROOT}/common/hoa.mp3` },
}

export const CATEGORY_21_IDS = Object.keys(CATEGORY_21_META) as Category21[]
export const CATEGORY_21_ASSET_POOLS: Record<Category21, Array<{ id: string; manifestId: Category21 }>> = Object.fromEntries(
  CATEGORY_21_IDS.map(category => [category, CLASSIFICATION_MANIFEST_REGISTRY[category].items.map(item => ({ id: item.id, manifestId: category }))]),
) as Record<Category21, Array<{ id: string; manifestId: Category21 }>>

export function getCategory21VoiceSequence(first: Category21, second: Category21) {
  return [
    ...CLASSIFY_COMMON_VOICE_SEQUENCE.slice(0, 2),
    `${TRANG_NGUYEN_VOICE_ROOT}/common/cac-loai.mp3`,
    CATEGORY_21_META[first].voice,
    `${TRANG_NGUYEN_VOICE_ROOT}/common/xep-vao-o-so-1.mp3`,
    `${TRANG_NGUYEN_VOICE_ROOT}/common/cac-loai.mp3`,
    CATEGORY_21_META[second].voice,
    `${TRANG_NGUYEN_VOICE_ROOT}/common/xep-vao-o-so-2.mp3`,
  ]
}

function chooseCategoryPair(random: Random, recentPairKeys: readonly string[] = []): [Category21, Category21] {
  const pairs: Array<[Category21, Category21]> = []
  for (let first = 0; first < CATEGORY_21_IDS.length; first += 1) {
    for (let second = first + 1; second < CATEGORY_21_IDS.length; second += 1) pairs.push([CATEGORY_21_IDS[first], CATEGORY_21_IDS[second]])
  }
  const recent = new Set(recentPairKeys)
  const freshPairs = pairs.filter(pair => !recent.has([...pair].sort().join('-')))
  const pair = pick(freshPairs.length ? freshPairs : pairs, random)
  return random() < 0.5 ? pair : [pair[1], pair[0]]
}

export function validateCategoryPairClassificationQuestion(question: GeneratedExamQuestion) {
  const data = question.data as ClassificationDragDropData | undefined
  const items = data?.items ?? []
  const groups = data?.groups ?? []
  const categoryIds = groups.map(group => group.id as Category21)
  const answer = question.correctAnswer
  const validCategories = categoryIds.length === 2 && categoryIds.every(category => CATEGORY_21_IDS.includes(category))
  const voiceSequence = validCategories ? getCategory21VoiceSequence(categoryIds[0], categoryIds[1]) : []
  const voiceAvailable = validCategories && hasFindTargetVoiceFiles(voiceSequence)
  const countByGroup = (category: string) => items.filter(item => item.groupId === category).length
  const expectedNote = validCategories
    ? `(Lưu ý: Các loại ${CATEGORY_21_META[categoryIds[0]].label} xếp vào ô số 1. Các loại ${CATEGORY_21_META[categoryIds[1]].label} xếp vào ô số 2.)`
    : ''

  if (!data || question.templateId !== 'T21' || question.type !== 'categorize'
    || question.prompt !== CLASSIFY_NUMBER_AND_LETTER_PROMPT || question.knowledgeKey !== 'CLASSIFY_CATEGORY_PAIRS'
    || data.generator !== 'CLASSIFY_CATEGORY_PAIRS' || data.subType !== 'category-vs-category'
    || data.maxItemsPerGroup !== 3 || data.acceptIncorrectPlacement !== false
    || groups.length !== 2 || categoryIds[0] === categoryIds[1] || !validCategories
    || groups.some((group, index) => group.label !== `${index + 1}. ${CATEGORY_21_META[categoryIds[index]].label}`)
    || data.note !== expectedNote || items.length !== 6 || new Set(items.map(item => item.id)).size !== 6
    || categoryIds.some(category => countByGroup(category) !== 3)
    || items.some(item => item.kind !== 'image' || !item.image || item.image.manifestId !== item.groupId
      || !getClassificationSprite(item.image.manifestId, item.image.imageId))
    || !answer || Array.isArray(answer) || typeof answer !== 'object' || Object.keys(answer).length !== 6
    || items.some(item => answer[item.id] !== item.groupId)
    || data.voiceSequence.length !== (voiceAvailable ? voiceSequence.length : 0)
    || data.voiceSequence.some((voice, index) => voice !== voiceSequence[index])
    || question.promptVoice !== (voiceAvailable ? data.voiceSequence : undefined))
    throw new Error('CLASSIFY_CATEGORY_PAIRS has invalid groups, items, prompt, or voice')
}

export function generateCategoryPairClassificationQuestion(args: { seedHash: string; random: Random; recentPairKeys?: readonly string[] }) {
  const { seedHash, random, recentPairKeys = [] } = args
  const [first, second] = chooseCategoryPair(random, recentPairKeys)
  const groupItems = (category: Category21) => pickDistractors({ pool: CATEGORY_21_ASSET_POOLS[category], exclude: [], count: 3, random })
    .map(asset => ({ id: `${category}-${asset.id}`, kind: 'image' as const, image: { manifestId: asset.manifestId, imageId: asset.id }, groupId: category }))
  const items = shuffle([...groupItems(first), ...groupItems(second)], random)
  const groups = [
    { id: first, label: `1. ${CATEGORY_21_META[first].label}` },
    { id: second, label: `2. ${CATEGORY_21_META[second].label}` },
  ]
  const note = `(Lưu ý: Các loại ${CATEGORY_21_META[first].label} xếp vào ô số 1. Các loại ${CATEGORY_21_META[second].label} xếp vào ô số 2.)`
  const voiceSequence = getCategory21VoiceSequence(first, second)
  const resolvedVoiceSequence = hasFindTargetVoiceFiles(voiceSequence) ? voiceSequence : []
  const correctAnswer = Object.fromEntries(items.map(item => [item.id, item.groupId]))
  const question = baseQuestion(seedHash, 'T21', 'categorize', CLASSIFY_NUMBER_AND_LETTER_PROMPT, correctAnswer, {
    difficulty: 2,
    promptVoice: resolvedVoiceSequence.length ? resolvedVoiceSequence : undefined,
    data: {
      generator: 'CLASSIFY_CATEGORY_PAIRS',
      subType: 'category-vs-category',
      note,
      items,
      groups,
      voiceSequence: resolvedVoiceSequence,
      maxItemsPerGroup: 3,
      acceptIncorrectPlacement: false,
    },
    knowledgeKey: 'CLASSIFY_CATEGORY_PAIRS',
  })
  validateCategoryPairClassificationQuestion(question)
  return question
}

function generateT21(seedHash: string, random: Random) {
  return generateCategoryPairClassificationQuestion({ seedHash, random })
}

export const ORDER_ALPHABET_PROMPT = 'Sắp xếp các chữ cái theo đúng thứ tự trong bảng chữ cái.'
export const ORDER_ALPHABET_VOICE = `${TRANG_NGUYEN_VOICE_ROOT}/common/sap-xep-cac-chu-cai-theo-dung-thu-tu-trong-bang-chu-cai.mp3`
export const ORDER_ALPHABET_VARIANT_LETTERS = ['ă', 'â', 'đ', 'ê', 'ô', 'ơ', 'ư'] as const
export const ORDER_ALPHABET_ALLOWED_LETTERS = [...VIETNAMESE_ALPHABET]

function containsTooManyVariantLetters(letters: readonly string[]) {
  return letters.filter(letter => ORDER_ALPHABET_VARIANT_LETTERS.includes(letter as typeof ORDER_ALPHABET_VARIANT_LETTERS[number])).length > 2
}

function pickNearbyAlphabetLetters(alphabet: readonly string[], count: number, random: Random): string[] {
  const validWindows: string[][] = []
  for (let start = 0; start <= alphabet.length - count; start += 1) {
    const window = alphabet.slice(start, start + count)
    if (!containsTooManyVariantLetters(window)) validWindows.push([...window])
  }
  if (!validWindows.length) throw new Error('ORDER_VIETNAMESE_ALPHABET has no valid nearby letter window')
  return pick(validWindows, random)
}

function pickRandomAlphabetLetters(alphabet: readonly string[], count: number, random: Random): string[] {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const selected = pickDistractors({ pool: alphabet, exclude: [], count, random })
    if (!containsTooManyVariantLetters(selected))
      return [...selected].sort((left, right) => alphabet.indexOf(left) - alphabet.indexOf(right))
  }
  return pickNearbyAlphabetLetters(alphabet, count, random)
}

export function validateAlphabetOrderQuestion(question: GeneratedExamQuestion) {
  const data = question.data as AlphabetOrderData | undefined
  const items = data?.items ?? []
  const allowed = data?.allowedLetters ?? []
  const correct = question.correctAnswer
  const correctLetters = Array.isArray(correct) ? correct.map(id => items.find(item => item.id === id)?.value ?? '') : []
  const order = new Map(allowed.map((letter, index) => [letter, index]))
  const expectedVoice = hasFindTargetVoiceFiles([ORDER_ALPHABET_VOICE]) ? ORDER_ALPHABET_VOICE : undefined
  if (!data || question.templateId !== 'T22' || question.type !== 'sorting' || question.prompt !== ORDER_ALPHABET_PROMPT
    || question.knowledgeKey !== 'ORDER_VIETNAMESE_ALPHABET' || data.generator !== 'ORDER_VIETNAMESE_ALPHABET'
    || data.subType !== 'alphabet-order' || allowed.length !== VIETNAMESE_ALPHABET.length
    || allowed.some((letter, index) => letter !== VIETNAMESE_ALPHABET[index])
    || items.length !== 5 || new Set(items.map(item => item.id)).size !== 5
    || new Set(items.map(item => item.value.normalize('NFC'))).size !== 5
    || items.some(item => !allowed.includes(item.value) || item.id !== `letter-${item.value}`)
    || correctLetters.length !== 5
    || correctLetters.some((letter, index) => index > 0 && (order.get(correctLetters[index - 1]) ?? -1) >= (order.get(letter) ?? -1))
    || items.map(item => item.value).every((letter, index) => letter === correctLetters[index])
    || question.promptVoice !== expectedVoice)
    throw new Error('ORDER_VIETNAMESE_ALPHABET has invalid items, prompt, answer, or voice')
}

export function generateAlphabetOrderQuestion(args: { seedHash: string; random: Random }) {
  const { seedHash, random } = args
  const letters = random() < 0.6
    ? pickNearbyAlphabetLetters(ORDER_ALPHABET_ALLOWED_LETTERS, 5, random)
    : pickRandomAlphabetLetters(ORDER_ALPHABET_ALLOWED_LETTERS, 5, random)
  const correctLetters = [...letters].sort((left, right) => (alphOrder.get(left) ?? 100) - (alphOrder.get(right) ?? 100))
  const shuffledLetters = shuffle([...correctLetters], random)
  if (shuffledLetters.every((letter, index) => letter === correctLetters[index])) {
    const first = shuffledLetters[0]
    shuffledLetters[0] = shuffledLetters[1]
    shuffledLetters[1] = first
  }
  const items = shuffledLetters.map(value => ({ id: `letter-${value}`, value }))
  const correctAnswer = correctLetters.map(value => `letter-${value}`)
  const question = baseQuestion(seedHash, 'T22', 'sorting', ORDER_ALPHABET_PROMPT, correctAnswer, {
    difficulty: 2,
    promptVoice: hasFindTargetVoiceFiles([ORDER_ALPHABET_VOICE]) ? ORDER_ALPHABET_VOICE : undefined,
    data: {
      generator: 'ORDER_VIETNAMESE_ALPHABET',
      subType: 'alphabet-order',
      items,
      allowedLetters: [...ORDER_ALPHABET_ALLOWED_LETTERS],
    },
    knowledgeKey: 'ORDER_VIETNAMESE_ALPHABET',
  })
  validateAlphabetOrderQuestion(question)
  return question
}

function generateT22(seedHash: string, random: Random) {
  return generateAlphabetOrderQuestion({ seedHash, random })
}

export const VEHICLE_ORDER_PROMPT = 'Sắp xếp các {category} theo đúng thứ tự sau:'

type Question23OrderItem = { id: string; text: string; voice: string; visual: ExamVisual; rank?: number }
type Question23OrderCategory = VehicleOrderData['category']
type Question23OrderPool = { category: Question23OrderCategory; categoryLabel: string; categoryVoice: string; items: Question23OrderItem[] }

const QUESTION_23_CATEGORY_LABELS: Record<Question23OrderCategory, string> = {
  transportation: 'phương tiện giao thông',
  animal: 'con vật',
  object: 'đồ vật',
  flower: 'hoa',
  fruit: 'quả',
}
const QUESTION_23_COMMON_VOICE_ROOT = '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common'
const QUESTION_23_TRANSPORTATION_VOICE_ROOT = QUESTION_23_COMMON_VOICE_ROOT
const QUESTION_23_FRUIT_VOICE_ROOT = '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/fruits'
const QUESTION_23_PROMPT_PREFIX_VOICE = `${QUESTION_23_COMMON_VOICE_ROOT}/sap-xep-cac.mp3`
const QUESTION_23_PROMPT_SUFFIX_VOICE = `${QUESTION_23_COMMON_VOICE_ROOT}/theo-dung-thu-tu-sau.mp3`
const QUESTION_23_CATEGORY_VOICES: Record<Question23OrderCategory, string> = {
  transportation: `${QUESTION_23_COMMON_VOICE_ROOT}/phuong-tien-giao-thong.mp3`,
  animal: `${QUESTION_23_COMMON_VOICE_ROOT}/con-vat.mp3`,
  object: `${QUESTION_23_COMMON_VOICE_ROOT}/do-vat.mp3`,
  flower: `${QUESTION_23_COMMON_VOICE_ROOT}/hoa.mp3`,
  fruit: `${QUESTION_23_COMMON_VOICE_ROOT}/qua.mp3`,
}
const QUESTION_23_TRANSPORTATION_ORDER: Record<string, number> = {
  'xe-dap': 1,
  'tau-hoa': 2,
  'o-to': 3,
  'may-bay': 4,
  'xe-may': 5,
  'xe-buyt': 6,
  'tau-thuy': 7,
  'truc-thang': 8,
}

function getQuestion23VoicedWordItems(): Question23OrderItem[] {
  return QUESTION_27_WORDS.flatMap(word => {
    if (!['animal', 'object', 'flower'].includes(word.category) || !hasFindTargetVoiceFiles([word.voice])) return []
    const knowledge = QUESTION_25_WORDS.find(item => item.category === word.category
      && item.imageId === word.imageId && item.word === word.word)
    const flowerSprite = word.category === 'flower' && word.imageId
      ? getClassificationSprite('flower', word.imageId)
      : undefined
    const visual = word.category === 'flower'
      ? flowerSprite && { type: 'image' as const, value: flowerSprite.spriteSheet, label: word.word, sprite: flowerSprite }
      : knowledge && getQuestion25Visual(knowledge)
    if (!visual) return []
    return [{ id: word.id, text: word.word, voice: word.voice, visual }]
  })
}

function getQuestion23TransportationItems(): Question23OrderItem[] {
  return transportationManifest.items.flatMap(item => {
    const voice = `${QUESTION_23_TRANSPORTATION_VOICE_ROOT}/${item.id}.mp3`
    if (!hasFindTargetVoiceFiles([voice])) return []
    return [{
      id: `transportation-${item.id}`,
      text: item.label,
      voice,
      rank: QUESTION_23_TRANSPORTATION_ORDER[item.id] ?? 99,
      visual: {
        type: 'image',
        value: transportationManifest.image,
        label: item.label,
        sprite: {
          spriteSheet: transportationManifest.image,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          sheetWidth: transportationManifest.width,
          sheetHeight: transportationManifest.height,
        },
      },
    }]
  })
}

function getQuestion23FruitItems(): Question23OrderItem[] {
  return QUESTION_25_WORDS.flatMap(item => {
    if (item.category !== 'fruit') return []
    const voice = `${QUESTION_23_FRUIT_VOICE_ROOT}/${item.imageId}.mp3`
    const visual = getQuestion25Visual(item)
    if (!visual || !hasFindTargetVoiceFiles([voice])) return []
    return [{ id: `fruit-${item.id}`, text: item.word, voice, visual }]
  })
}

function getQuestion23OrderPools(): Question23OrderPool[] {
  const voicedWords = getQuestion23VoicedWordItems()
  return [
    ...(['animal', 'object', 'flower'] as const).map((category): Question23OrderPool => ({
      category,
      categoryLabel: QUESTION_23_CATEGORY_LABELS[category],
      categoryVoice: QUESTION_23_CATEGORY_VOICES[category],
      items: voicedWords.filter(item => item.id.startsWith(`${category}-`)),
    })),
    {
      category: 'fruit' as const,
      categoryLabel: QUESTION_23_CATEGORY_LABELS.fruit,
      categoryVoice: QUESTION_23_CATEGORY_VOICES.fruit,
      items: getQuestion23FruitItems(),
    },
    {
      category: 'transportation' as const,
      categoryLabel: QUESTION_23_CATEGORY_LABELS.transportation,
      categoryVoice: QUESTION_23_CATEGORY_VOICES.transportation,
      items: getQuestion23TransportationItems(),
    },
  ].filter(pool => pool.items.length >= 4 && hasFindTargetVoiceFiles([pool.categoryVoice]))
}

function sortQuestion23Items(category: Question23OrderCategory, items: Question23OrderItem[]) {
  if (category === 'transportation') return [...items].sort((left, right) => (left.rank ?? 99) - (right.rank ?? 99))
  return [...items].sort((left, right) => left.text.localeCompare(right.text, 'vi'))
}

export function generateVehicleOrderQuestion(args: { seedHash: string; random: Random }) {
  const { seedHash, random } = args
  const pool = pick(getQuestion23OrderPools(), random)
  const selected = pickDistractors({ pool: pool.items, exclude: [], count: 4, random })
  const ordered = sortQuestion23Items(pool.category, selected)
  const items = shuffle(selected, random).map(item => ({
    id: item.id,
    text: item.text,
    voice: item.voice,
    visual: item.visual,
  }))
  const readoutText = ordered.map(item => item.text).join(', ')
  const prompt = VEHICLE_ORDER_PROMPT.replace('{category}', pool.categoryLabel)
  const question = baseQuestion(seedHash, 'T23', 'sorting', prompt, ordered.map(item => item.id), {
    difficulty: 2,
    promptVoice: [
      QUESTION_23_PROMPT_PREFIX_VOICE,
      pool.categoryVoice,
      QUESTION_23_PROMPT_SUFFIX_VOICE,
      ...ordered.map(item => item.voice),
    ],
    data: {
      generator: 'ORDER_VEHICLES',
      subType: 'vehicle-order',
      category: pool.category,
      categoryLabel: pool.categoryLabel,
      readoutText,
      items,
    },
  })
  validateVehicleOrderQuestion(question)
  return question
}

export function validateVehicleOrderQuestion(question: GeneratedExamQuestion) {
  const data = question.data as VehicleOrderData | undefined
  const items = data?.items ?? []
  const pool = getQuestion23OrderPools().find(candidate => candidate.category === data?.category)
  const itemById = new Map((pool?.items ?? []).map(item => [item.id, item]))
  const ordered = pool ? sortQuestion23Items(pool.category, items.map(item => itemById.get(item.id)).filter((item): item is Question23OrderItem => Boolean(item))) : []
  const expectedAnswer = ordered.map(item => item.id)
  const expectedPromptVoice = [
    QUESTION_23_PROMPT_PREFIX_VOICE,
    pool?.categoryVoice ?? '',
    QUESTION_23_PROMPT_SUFFIX_VOICE,
    ...ordered.map(item => item.voice),
  ]
  const answer = question.correctAnswer
  if (question.templateId !== 'T23' || question.type !== 'sorting'
    || question.prompt !== VEHICLE_ORDER_PROMPT.replace('{category}', data?.categoryLabel ?? '')
    || data?.generator !== 'ORDER_VEHICLES' || data.subType !== 'vehicle-order'
    || !pool || data.categoryLabel !== pool.categoryLabel || items.length !== 4
    || new Set(items.map(item => item.id)).size !== items.length
    || items.some(item => {
      const canonical = itemById.get(item.id)
      return !canonical || canonical.text !== item.text || canonical.voice !== item.voice
        || JSON.stringify(canonical.visual) !== JSON.stringify(item.visual) || !hasFindTargetVoiceFiles([item.voice])
    })
    || !pool || !hasFindTargetVoiceFiles([QUESTION_23_PROMPT_PREFIX_VOICE, pool.categoryVoice, QUESTION_23_PROMPT_SUFFIX_VOICE])
    || data.readoutText !== ordered.map(item => item.text).join(', ')
    || JSON.stringify(question.promptVoice) !== JSON.stringify(expectedPromptVoice)
    || !Array.isArray(answer) || answer.length !== items.length || answer.some((id, index) => id !== expectedAnswer[index]))
    throw new Error('ORDER_VEHICLES has invalid items, readout, voice, or answer')
}

function generateT23(seedHash: string, random: Random) {
  return generateVehicleOrderQuestion({ seedHash, random })
}

const QUESTION_24_MOTIONS: readonly AnimatedQuestion24Motion[] = ['fly', 'run', 'jump', 'walk']
const QUESTION_24_TARGET_MODES: readonly AnimatedQuestion24TargetMode[] = ['flower', 'fruit']

function question24Duration(motion: AnimatedQuestion24Motion, random: Random): number {
  const ranges: Record<AnimatedQuestion24Motion, [number, number]> = {
    fly: [5000, 6500], run: [4000, 5500], jump: [4500, 6000], walk: [5500, 7000],
  }
  const [min, max] = ranges[motion]
  return Math.round(min + random() * (max - min))
}

function resolveQuestion24BottomVoice(actorWord: string, motion: AnimatedQuestion24Motion, targetMode: AnimatedQuestion24TargetMode): string[] {
  const sequence = [...getQuestion24Voice(actorWord, motion, targetMode)]
  return sequence.length > 0 && hasFindTargetVoiceFiles(sequence) ? sequence : []
}

export function validateQuestion24(question: GeneratedExamQuestion): void {
  const data = question.data as AnimatedQuestion24Data | undefined
  const targets = data?.targets ?? []
  const options = question.options ?? []
  const answerId = typeof question.correctAnswer === 'string' ? question.correctAnswer : ''
  const correctTarget = targets.find(target => `letter-${target.letter}` === answerId)
  const actorPool = data ? getQuestion24ActorPool(data.motion) : []
  const targetPool = data ? getQuestion24TargetPool(data.targetMode) : []
  const validActor = actorPool.find(item => item.imageId === data?.actor.imageId && item.word === data?.actor.label)
  const validTargets = targets.every(target => {
    const canonical = targetPool.find(item => item.imageId === target.imageId && item.word === target.label)
    const visual = canonical ? getQuestion24Visual(data!.targetMode, canonical.imageId, canonical.word) : undefined
    return Boolean(canonical) && target.targetType === data!.targetMode && target.manifestId === data!.targetMode
      && JSON.stringify(target.visual) === JSON.stringify(visual)
  })
  const validActorVisual = validActor ? getQuestion24Visual('animal', validActor.imageId, validActor.word) : undefined
  const correctOptionId = answerId
  const voice = data ? resolveQuestion24BottomVoice(data.actor.label, data.motion, data.targetMode) : []
  const durationRange: Record<AnimatedQuestion24Motion, [number, number]> = {
    fly: [5000, 6500], run: [4000, 5500], jump: [4500, 6000], walk: [5500, 7000],
  }
  const durationBounds = data ? durationRange[data.motion] : undefined

  if (!data || question.templateId !== 'T24' || question.type !== 'animated-select'
    || question.subType !== 'actor-to-letter-target' || data.generator !== 'ANIMATED_ACTOR_TO_LETTER_TARGET'
    || data.subType !== 'actor-to-letter-target' || question.knowledgeKey !== QUESTION_24_LEARNING_KEY
    || question.prompt !== QUESTION_24_PROMPT || question.promptVoice !== QUESTION_24_PROMPT_VOICE
    || !hasFindTargetVoiceFiles([QUESTION_24_PROMPT_VOICE])
    || !QUESTION_24_MOTIONS.includes(data.motion)
    || !QUESTION_24_TARGET_MODES.includes(data.targetMode)
    || !durationBounds || data.durationMs < durationBounds[0] || data.durationMs > durationBounds[1]
    || data.actor.manifestId !== 'animal' || !validActor || JSON.stringify(data.actor.visual) !== JSON.stringify(validActorVisual)
    || targets.length !== 3 || new Set(targets.map(target => target.id)).size !== 3
    || new Set(targets.map(target => target.imageId)).size !== 3 || new Set(targets.map(target => target.letter)).size !== 3
    || targets.some(target => !VIETNAMESE_ALPHABET.includes(target.letter as typeof VIETNAMESE_ALPHABET[number]))
    || !validTargets || !correctTarget || data.destination.x !== correctTarget.x || data.destination.y !== correctTarget.y
    || JSON.stringify(data.options) !== JSON.stringify(targets.map(target => target.letter))
    || options.length !== 3 || new Set(options.map(option => option.id)).size !== 3
    || options.some(option => option.id !== `letter-${option.text}` || !data.options.includes(option.text ?? ''))
    || typeof question.correctAnswer !== 'string' || question.correctAnswer !== correctOptionId
    || options.filter(option => option.id === correctOptionId).length !== 1
    || JSON.stringify(data.voice) !== JSON.stringify(voice)
    || !hasFindTargetVoiceFiles(voice))
    throw new Error('T24 has invalid animated actor, target, answer, or voice data')
}

export function generateQuestion24(args: { seedHash: string; random: Random }) {
  const motion = QUESTION_24_MOTIONS[Math.floor(args.random() * QUESTION_24_MOTIONS.length)] ?? 'run'
  const targetMode = QUESTION_24_TARGET_MODES[Math.floor(args.random() * QUESTION_24_TARGET_MODES.length)] ?? 'flower'
  const actorPool = getQuestion24ActorPool(motion)
  const actorItem = actorPool[Math.floor(args.random() * actorPool.length)]
  if (!actorItem) throw new Error(`T24 has no actor with a sprite for ${motion}`)
  const targetItems = pickDistractors({ pool: getQuestion24TargetPool(targetMode), exclude: [], count: 3, random: args.random })
  const letters = pickDistractors({ pool: VIETNAMESE_ALPHABET, exclude: [], count: 3, random: args.random })
  const correctIndex = Math.floor(args.random() * targetItems.length)
  const targetXs = [25, 50, 75]
  const targets = targetItems.map((item, index) => {
    const visual = getQuestion24Visual(targetMode, item.imageId, item.word)
    const letter = letters[index]
    if (!visual) throw new Error(`T24 target is missing its sprite: ${item.imageId}`)
    if (!letter) throw new Error('T24 target is missing its letter')
    return {
      id: `target-${index + 1}`, targetType: targetMode, manifestId: targetMode,
      imageId: item.imageId, label: item.word, letter,
      x: (targetXs[index] ?? 50) + (args.random() * 3 - 1.5), y: 71 + (args.random() * 2 - 1), visual,
    }
  })
  const actorVisual = getQuestion24Visual('animal', actorItem.imageId, actorItem.word)
  if (!actorVisual) throw new Error(`T24 actor is missing its sprite: ${actorItem.imageId}`)
  const correctTarget = targets[correctIndex]
  if (!correctTarget) throw new Error('T24 has no selected destination')
  const data: AnimatedQuestion24Data = {
    generator: 'ANIMATED_ACTOR_TO_LETTER_TARGET', subType: 'actor-to-letter-target',
    targetMode, motion, durationMs: question24Duration(motion, args.random),
    actor: {
      id: actorItem.id, manifestId: 'animal', imageId: actorItem.imageId, label: actorItem.word,
      start: { x: 8, y: motion === 'fly' ? 17 : 63 }, visual: actorVisual,
    },
    targets,
    destination: { x: correctTarget.x, y: correctTarget.y },
    options: targets.map(target => target.letter), voice: resolveQuestion24BottomVoice(actorItem.word, motion, targetMode),
  }
  const options = makeOptions(letters.map(letter => ({ id: `letter-${letter}`, text: letter, visual: letterVisual(letter) })), args.random)
  const question = baseQuestion(args.seedHash, 'T24', 'animated-select', QUESTION_24_PROMPT, `letter-${correctTarget.letter}`, {
    difficulty: 2, promptVoice: QUESTION_24_PROMPT_VOICE, options,
    subType: 'actor-to-letter-target', knowledgeKey: QUESTION_24_LEARNING_KEY, data,
  })
  validateQuestion24(question)
  return question
}

function generateT24(seedHash: string, random: Random) {
  return generateQuestion24({ seedHash, random })
}

const QUESTION_25_MODE_LABEL: Record<Question25AnalysisMode, string> = {
  initial: 'âm đầu',
  rhyme: 'vần',
  tone: 'thanh',
  'contains-letter': 'chữ',
}

const QUESTION_25_LETTER_POOL = [
  'a', 'ă', 'â', 'b', 'c', 'd', 'đ', 'e', 'ê', 'g', 'h', 'i', 'k', 'l',
  'm', 'n', 'o', 'ô', 'ơ', 'p', 'q', 'r', 's', 't', 'u', 'ư', 'v', 'x', 'y',
] as const

const QUESTION_25_VOICE_ROOT = '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices'
const QUESTION_25_INSTRUCTION_VOICE = `${QUESTION_25_VOICE_ROOT}/common/chon-dap-an-thich-hop-dien-vao-cho-trong.mp3`
const QUESTION_25_NAME_PREFIX_VOICE = `${QUESTION_25_VOICE_ROOT}/common/ten-cua.mp3`
const QUESTION_25_NAME_SUFFIX_VOICE = `${QUESTION_25_VOICE_ROOT}/common/trong-hinh-tren-co-gi.mp3`
const QUESTION_25_CATEGORY_VOICE: Record<Question25Category, string> = {
  fruit: `${QUESTION_25_VOICE_ROOT}/common/qua.mp3`,
  object: `${QUESTION_25_VOICE_ROOT}/common/do-vat.mp3`,
  animal: `${QUESTION_25_VOICE_ROOT}/common/con-vat.mp3`,
  flower: `${QUESTION_25_VOICE_ROOT}/common/hoa.mp3`,
}

type Question25Candidate = {
  item: Question25WordKnowledgeItem
  mode: Question25AnalysisMode
  answer: string
  distractors: string[]
  visual: ExamVisual
}

function getQuestion25InstructionVoice(): string[] | undefined {
  return hasFindTargetVoiceFiles([QUESTION_25_INSTRUCTION_VOICE]) ? [QUESTION_25_INSTRUCTION_VOICE] : undefined
}

function getQuestion25SentenceVoice(item: Question25WordKnowledgeItem): string[] | undefined {
  const categoryVoice = QUESTION_25_CATEGORY_VOICE[item.category]
  const sequence = [QUESTION_25_NAME_PREFIX_VOICE, categoryVoice, QUESTION_25_NAME_SUFFIX_VOICE]
  return hasFindTargetVoiceFiles(sequence) ? sequence : undefined
}

function getQuestion25AnalysisValue(item: Question25WordKnowledgeItem, mode: Question25AnalysisMode, selectedLetter?: string): string | undefined {
  if (mode === 'contains-letter') return selectedLetter
  return item[mode]
}

function getQuestion25DistractorPool(item: Question25WordKnowledgeItem, mode: Question25AnalysisMode, answer: string): string[] {
  if (mode === 'initial') return Array.from(new Set(QUESTION_25_WORDS.map(candidate => candidate.initial).filter((value): value is string => Boolean(value) && value !== answer)))
  if (mode === 'rhyme') return Array.from(new Set(QUESTION_25_WORDS.map(candidate => candidate.rhyme).filter((value): value is string => Boolean(value) && value !== answer)))
  if (mode === 'tone') return ['ngang', 'sắc', 'huyền', 'hỏi', 'ngã', 'nặng'].filter(value => value !== answer)
  return QUESTION_25_LETTER_POOL.filter(letter => !item.letters.includes(letter) && letter !== answer)
}

function question25OptionId(mode: Question25AnalysisMode, value: string): string {
  return `analysis-${mode}-${encodeURIComponent(value)}`
}

function question25OptionText(mode: Question25AnalysisMode, value: string): string {
  return `${QUESTION_25_MODE_LABEL[mode]} ${value}`
}

function getQuestion25Candidates(): Question25Candidate[] {
  const candidates: Question25Candidate[] = []
  for (const item of QUESTION_25_WORDS) {
    if (!QUESTION_25_ENABLED_CATEGORIES.includes(item.category)) continue
    const visual = getQuestion25Visual(item)
    if (!visual) continue
    const modes: Question25AnalysisMode[] = ['initial', 'rhyme', 'tone', 'contains-letter']
    for (const mode of modes) {
      const answers = mode === 'contains-letter' ? Array.from(new Set(item.letters)) : [getQuestion25AnalysisValue(item, mode)]
      for (const answer of answers) {
        if (!answer) continue
        const distractors = getQuestion25DistractorPool(item, mode, answer)
        if (new Set(distractors).size < 3) continue
        candidates.push({ item, mode, answer, distractors, visual })
      }
    }
  }
  return candidates
}

export function generateImageWordAnalysisQuestion(args: {
  seedHash: string
  random: Random
  templateId: 'T25' | 'T26'
  recentSelectionKeys?: readonly string[]
}): GeneratedExamQuestion {
  const allCandidates = getQuestion25Candidates()
  if (!allCandidates.length) throw new Error('ANALYZE_WORD_FROM_IMAGE has no valid word, image, or analysis candidates')
  const excluded = new Set(args.recentSelectionKeys ?? [])
  const preferredCandidates = allCandidates.filter(candidate => !excluded.has(`${candidate.item.category}:${candidate.item.id}:${candidate.mode}`))
  const selected = pick(preferredCandidates.length ? preferredCandidates : allCandidates, args.random)
  const categoryMeta = QUESTION_25_CATEGORY_META[selected.item.category]
  const sentencePrefix = `Tên của ${categoryMeta.label} trong hình trên có`
  const optionValues = [selected.answer, ...pickDistractors({ pool: selected.distractors, exclude: [selected.answer], count: 3, random: args.random })]
  const options = makeOptions(optionValues.map(value => ({
    id: question25OptionId(selected.mode, value),
    text: question25OptionText(selected.mode, value),
  })), args.random)
  const correctAnswer = question25OptionId(selected.mode, selected.answer)
  const selectionKey = `${selected.item.category}:${selected.item.id}:${selected.mode}`
  const data: ImageWordAnalysisData = {
    generator: 'ANALYZE_WORD_FROM_IMAGE',
    subType: 'image-word-analysis',
    category: selected.item.category,
    categoryLabel: categoryMeta.label,
    item: selected.item,
    analysisMode: selected.mode,
    analysisValue: selected.answer,
    sentencePrefix,
    sentenceVoice: getQuestion25SentenceVoice(selected.item),
    selectionKey,
    choices: options.map(option => option.id),
  }
  const question = baseQuestion(args.seedHash, args.templateId, 'select-input', QUESTION_25_PROMPT, correctAnswer, {
    difficulty: 2,
    subType: 'image-word-analysis',
    content: { type: 'visual', visual: selected.visual },
    options,
    data,
    promptVoice: getQuestion25InstructionVoice(),
    knowledgeKey: 'ANALYZE_WORD_FROM_IMAGE',
  })
  validateImageWordAnalysisQuestion(question)
  return question
}

export function generateQuestion25(args: { seedHash: string; random: Random; recentSelectionKeys?: readonly string[] }) {
  return generateImageWordAnalysisQuestion({ ...args, templateId: 'T25' })
}

export function generateQuestion26(args: { seedHash: string; random: Random; recentSelectionKeys?: readonly string[] }) {
  return generateImageWordAnalysisQuestion({ ...args, templateId: 'T26' })
}

function generateT25(seedHash: string, random: Random, context?: QuestionGenerationContext) {
  const recentSelectionKeys = context?.recentQuestionKeys.ANALYZE_WORD_FROM_IMAGE ?? []
  const question = generateQuestion25({ seedHash, random, recentSelectionKeys })
  if (context) context.recentQuestionKeys.ANALYZE_WORD_FROM_IMAGE = [String(question.data?.selectionKey)]
  return question
}

function generateT26(seedHash: string, random: Random, context?: QuestionGenerationContext) {
  const recentSelectionKeys = context?.recentQuestionKeys.ANALYZE_WORD_FROM_IMAGE ?? []
  const question = generateQuestion26({ seedHash, random, recentSelectionKeys })
  if (context) context.recentQuestionKeys.ANALYZE_WORD_FROM_IMAGE = [String(question.data?.selectionKey)]
  return question
}

export function validateImageWordAnalysisQuestion(question: GeneratedExamQuestion): void {
  const data = question.data as ImageWordAnalysisData | undefined
  const item = QUESTION_25_WORDS.find(candidate => candidate.category === data?.category && candidate.id === data?.item?.id)
  const visual = item ? getQuestion25Visual(item) : undefined
  const answer = data?.analysisValue
  const options = question.options ?? []
  const expectedCorrectId = answer && data ? question25OptionId(data.analysisMode, answer) : undefined
  const expectedPrefix = item ? `Tên của ${QUESTION_25_CATEGORY_META[item.category].label} trong hình trên có` : ''
  const expectedPromptVoice = getQuestion25InstructionVoice()
  const expectedSentenceVoice = item ? getQuestion25SentenceVoice(item) : undefined
  const optionIds = options.map(option => option.id)
  const choices = data?.choices ?? []
  const optionValuesMatch = data ? options.every(option => {
    const prefix = `${QUESTION_25_MODE_LABEL[data.analysisMode]} `
    const value = typeof option.text === 'string' && option.text.startsWith(prefix) ? option.text.slice(prefix.length) : ''
    return value.length > 0 && option.id === question25OptionId(data.analysisMode, value)
  }) : false
  const itemFieldsMatch = item && data?.item
    && item.category === data.item.category && item.word === data.item.word
    && item.imageId === data.item.imageId && item.manifestId === data.item.manifestId
    && item.initial === data.item.initial && item.rhyme === data.item.rhyme && item.tone === data.item.tone
    && JSON.stringify(item.letters) === JSON.stringify(data.item.letters)
  const validModes = item ? getQuestion25Candidates().some(candidate => candidate.item.id === item.id
    && candidate.item.category === item.category && candidate.mode === data?.analysisMode && candidate.answer === data?.analysisValue) : false

  if (!data || !item || !itemFieldsMatch || !visual || question.type !== 'select-input'
    || !['T25', 'T26'].includes(question.templateId) || question.subType !== 'image-word-analysis'
    || data.generator !== 'ANALYZE_WORD_FROM_IMAGE' || data.subType !== 'image-word-analysis'
    || question.prompt !== QUESTION_25_PROMPT || question.knowledgeKey !== 'ANALYZE_WORD_FROM_IMAGE'
    || JSON.stringify(question.promptVoice) !== JSON.stringify(expectedPromptVoice)
    || JSON.stringify(data.sentenceVoice) !== JSON.stringify(expectedSentenceVoice)
    || data.categoryLabel !== QUESTION_25_CATEGORY_META[item.category].label
    || data.sentencePrefix !== expectedPrefix || !validModes || !answer
    || data.selectionKey !== `${item.category}:${item.id}:${data.analysisMode}`
    || JSON.stringify(question.content?.visual) !== JSON.stringify(visual)
    || options.length !== 4 || new Set(optionIds).size !== 4
    || new Set(options.map(option => option.text?.normalize('NFC').toLocaleLowerCase('vi-VN'))).size !== 4
    || optionIds.some(id => !id.startsWith(`analysis-${data.analysisMode}-`))
    || !optionValuesMatch
    || JSON.stringify(choices) !== JSON.stringify(optionIds)
    || typeof question.correctAnswer !== 'string' || question.correctAnswer !== expectedCorrectId
    || options.filter(option => option.id === expectedCorrectId && option.text === (answer ? question25OptionText(data.analysisMode, answer) : '')).length !== 1)
    throw new Error(`${question.templateId} has invalid ANALYZE_WORD_FROM_IMAGE metadata, visual, or choices`)
}

const QUESTION_27_VOICED_WORDS = QUESTION_27_TEXT_MATCHED_WORDS.filter(item => hasFindTargetVoiceFiles([item.voice]))
const QUESTION_27_COMMON_VOICE_ROOT = '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common'
const QUESTION_27_INSTRUCTION_VOICE = `${QUESTION_27_COMMON_VOICE_ROOT}/chon-dap-an-thich-hop-dien-vao-cho-trong.mp3`
const QUESTION_27_WORDS_PREFIX_VOICE = `${QUESTION_27_COMMON_VOICE_ROOT}/cac-tu.mp3`
const QUESTION_27_COMMON_SOUND_SUFFIX_VOICE = `${QUESTION_27_COMMON_VOICE_ROOT}/co-chung-am-gi.mp3`

function getQuestion27InstructionVoice(): string[] | undefined {
  return hasFindTargetVoiceFiles([QUESTION_27_INSTRUCTION_VOICE]) ? [QUESTION_27_INSTRUCTION_VOICE] : undefined
}

function getQuestion27VoiceSequence(words: readonly CommonSoundWordItem[]): string[] | undefined {
  const sequence = [QUESTION_27_WORDS_PREFIX_VOICE, ...words.map(item => item.voice), QUESTION_27_COMMON_SOUND_SUFFIX_VOICE]
  return hasFindTargetVoiceFiles(sequence) ? sequence : undefined
}

const QUESTION_27_WORD_SOUNDS = new Map(QUESTION_27_VOICED_WORDS.map(item => [item.id, new Set(getQuestion27Sounds(item.word))]))
const QUESTION_27_WORDS_BY_SOUND = new Map<string, CommonSoundWordItem[]>()
for (const item of QUESTION_27_VOICED_WORDS) {
  for (const sound of Array.from(QUESTION_27_WORD_SOUNDS.get(item.id) ?? [])) {
    QUESTION_27_WORDS_BY_SOUND.set(sound, [...(QUESTION_27_WORDS_BY_SOUND.get(sound) ?? []), item])
  }
}
export const QUESTION_27_VALID_SOUNDS = Array.from(QUESTION_27_WORDS_BY_SOUND.entries())
  .filter(([, items]) => items.length >= 3)
  .map(([sound]) => sound)

function question27OptionId(sound: string): string {
  return `common-sound-${encodeURIComponent(sound)}`
}

function getQuestion27SharedSounds(words: readonly CommonSoundWordItem[]): string[] {
  const firstSounds = words[0] ? QUESTION_27_WORD_SOUNDS.get(words[0].id) : undefined
  return QUESTION_27_VALID_SOUNDS.filter(sound => firstSounds?.has(sound)
    && words.slice(1).every(item => QUESTION_27_WORD_SOUNDS.get(item.id)?.has(sound)))
}

function getQuestion27SelectionKey(sound: string, words: readonly CommonSoundWordItem[]): string {
  return `${sound}-${words.map(item => item.id).sort().join('-')}`
}

export function generateQuestion27(args: {
  seedHash: string
  random: Random
  recentCombinationKeys?: readonly string[]
}): GeneratedExamQuestion {
  if (QUESTION_27_VALID_SOUNDS.length < 4) throw new Error('FIND_COMMON_SOUND requires four voiced sound groups')
  const recentKeys = new Set(args.recentCombinationKeys ?? [])
  let selectedSound = ''
  let selectedWords: CommonSoundWordItem[] = []
  let selectionKey = ''
  const availableSounds = shuffle(QUESTION_27_VALID_SOUNDS, args.random)
  for (const sound of availableSounds) {
    const pool = QUESTION_27_WORDS_BY_SOUND.get(sound) ?? []
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const words = pickDistractors({ pool, exclude: [], count: 3, random: args.random })
      const sharedSounds = getQuestion27SharedSounds(words)
      if (sharedSounds.length !== 1 || sharedSounds[0] !== sound) continue
      const key = getQuestion27SelectionKey(sound, words)
      if (!recentKeys.has(key)) {
        selectedSound = sound
        selectedWords = words
        selectionKey = key
        break
      }
    }
    if (selectedWords.length) break
  }
  if (!selectedWords.length) throw new Error('FIND_COMMON_SOUND could not create a new three-word combination')

  const distractorSounds = pickDistractors({ pool: QUESTION_27_VALID_SOUNDS, exclude: [selectedSound], count: 3, random: args.random })
  const options = makeOptions([selectedSound, ...distractorSounds].map(sound => ({
    id: question27OptionId(sound), text: sound,
  })), args.random)
  const correctAnswer = question27OptionId(selectedSound)
  const sentencePrefix = buildQuestion27Sentence(selectedWords)
  const sentenceVoice = getQuestion27VoiceSequence(selectedWords)
  const data: CommonSoundData = {
    generator: 'FIND_COMMON_SOUND',
    subType: 'common-sound',
    words: selectedWords,
    targetSound: selectedSound,
    sentencePrefix,
    selectionKey,
    voiceSequence: sentenceVoice ?? [],
    choices: options.map(option => option.id),
  }
  const question = baseQuestion(args.seedHash, 'T27', 'select-input', QUESTION_27_PROMPT, correctAnswer, {
    difficulty: 2,
    subType: 'common-sound',
    options,
    data,
    promptVoice: getQuestion27InstructionVoice(),
    knowledgeKey: 'FIND_COMMON_SOUND',
  })
  validateCommonSoundQuestion(question)
  return question
}

function generateT27(seedHash: string, random: Random, context?: QuestionGenerationContext) {
  const recentCombinationKeys = context?.recentQuestionKeys.FIND_COMMON_SOUND ?? []
  const question = generateQuestion27({ seedHash, random, recentCombinationKeys })
  if (context) context.recentQuestionKeys.FIND_COMMON_SOUND = [String(question.data?.selectionKey)]
  return question
}

export function validateCommonSoundQuestion(question: GeneratedExamQuestion): void {
  const data = question.data as CommonSoundData | undefined
  const words = data?.words ?? []
  const canonicalItems = new Map(QUESTION_27_VOICED_WORDS.map(item => [item.id, item]))
  const targetSound = data?.targetSound
  const options = question.options ?? []
  const optionIds = options.map(option => option.id)
  const expectedWordVoices = words.map(item => canonicalItems.get(item.id)?.voice)
  const expectedVoices = expectedWordVoices.every((voice): voice is string => Boolean(voice))
    ? getQuestion27VoiceSequence(words)
    : undefined
  const voiceSequence = data?.voiceSequence ?? []
  const sentencePrefix = words.length === 3 ? buildQuestion27Sentence(words) : ''
  const expectedCorrectId = targetSound ? question27OptionId(targetSound) : undefined
  const wordsAreCanonical = words.every(item => {
    const canonical = canonicalItems.get(item.id)
    return canonical && canonical.word === item.word && canonical.initial === item.initial
      && canonical.category === item.category && canonical.voice === item.voice
      && canonical.imageId === item.imageId && canonical.manifestId === item.manifestId
      && hasFindTargetVoiceFiles([item.voice])
  })
  const sharedSounds = wordsAreCanonical ? getQuestion27SharedSounds(words) : []

  if (!data || question.templateId !== 'T27' || question.type !== 'select-input'
    || question.subType !== 'common-sound' || data.generator !== 'FIND_COMMON_SOUND' || data.subType !== 'common-sound'
    || question.prompt !== QUESTION_27_PROMPT || question.knowledgeKey !== 'FIND_COMMON_SOUND'
    || JSON.stringify(question.promptVoice) !== JSON.stringify(getQuestion27InstructionVoice())
    || words.length !== 3 || new Set(words.map(item => item.id)).size !== 3
    || new Set(words.map(item => item.word)).size !== 3 || !wordsAreCanonical
    || !targetSound || !QUESTION_27_VALID_SOUNDS.includes(targetSound)
    || sharedSounds.length !== 1 || sharedSounds[0] !== targetSound
    || data.sentencePrefix !== sentencePrefix
    || data.selectionKey !== getQuestion27SelectionKey(targetSound ?? '', words)
    || !expectedVoices || voiceSequence.length !== 5 || voiceSequence.some((voice, index) => voice !== expectedVoices[index])
    || options.length !== 4 || new Set(optionIds).size !== 4
    || new Set(options.map(option => option.text)).size !== 4
    || options.some(option => typeof option.text !== 'string' || !QUESTION_27_VALID_SOUNDS.includes(option.text)
      || option.id !== question27OptionId(option.text))
    || JSON.stringify(data.choices) !== JSON.stringify(optionIds)
    || typeof question.correctAnswer !== 'string' || question.correctAnswer !== expectedCorrectId
    || options.filter(option => option.id === expectedCorrectId && option.text === targetSound).length !== 1)
    throw new Error('FIND_COMMON_SOUND has invalid words, voices, prompt, or choices')
}

const QUESTION_28_29_ALLOWED_LETTER_SET = new Set<string>(QUESTION_29_ALLOWED_LETTERS)
const QUESTION_28_29_RECENT_KEY = 'RECOGNIZE_LETTER_BY_SHAPE'

function getQuestion29DistractorPool(target: string): string[] {
  return Array.from(new Set((QUESTION_29_LETTER_CONFUSION_MAP[target] ?? [])
    .filter(letter => letter !== target && QUESTION_28_29_ALLOWED_LETTER_SET.has(letter))))
}

export function generateImageResemblesLetterQuestion(args: {
  seedHash: string
  random: Random
  templateId: 'T28' | 'T29'
  recentAssetIds?: readonly string[]
}): GeneratedExamQuestion {
  const candidates = QUESTION_28_29_ENABLED_ASSETS.filter(asset => getQuestion29DistractorPool(asset.resemblesLetter).length >= 3)
  if (!candidates.length) throw new Error('IMAGE_RESEMBLES_LETTER has no enabled assets with three valid distractors')
  const recentAssetIds = new Set(args.recentAssetIds ?? [])
  const unusedCandidates = candidates.filter(asset => !recentAssetIds.has(asset.imageId))
  const asset = pick(unusedCandidates.length ? unusedCandidates : candidates, args.random)
  const visual = getQuestion29AssetVisual(asset)
  if (!visual) throw new Error(`IMAGE_RESEMBLES_LETTER has no manifest crop for ${asset.imageId}`)

  const distractors = pickDistractors({
    pool: getQuestion29DistractorPool(asset.resemblesLetter),
    exclude: [asset.resemblesLetter],
    count: 3,
    random: args.random,
  })
  const options = makeOptions([asset.resemblesLetter, ...distractors]
    .map(letter => ({ id: letter, text: letter })), args.random)
  const data: ImageResemblesLetterData = {
    generator: 'IMAGE_RESEMBLES_LETTER',
    subType: 'image-resembles-letter',
    sentencePrefix: QUESTION_29_SENTENCE_PREFIX,
    asset,
    selectionKey: `${args.templateId}:${asset.id}`,
    choices: options.map(option => option.id),
  }
  const question = baseQuestion(args.seedHash, args.templateId, 'select-input', QUESTION_25_PROMPT, asset.resemblesLetter, {
    difficulty: 1,
    subType: 'image-resembles-letter',
    knowledgeKey: 'RECOGNIZE_LETTER_BY_SHAPE',
    promptVoice: getQuestion25InstructionVoice(),
    options,
    content: { type: 'visual', visual },
    data,
  })
  validateImageResemblesLetterQuestion(question)
  return question
}

export function generateQuestion28(args: { seedHash: string; random: Random; recentAssetIds?: readonly string[] }) {
  return generateImageResemblesLetterQuestion({ ...args, templateId: 'T28' })
}

export function generateQuestion29(args: { seedHash: string; random: Random; recentAssetIds?: readonly string[] }) {
  return generateImageResemblesLetterQuestion({ ...args, templateId: 'T29' })
}

function generateT28(seedHash: string, random: Random, context?: QuestionGenerationContext) {
  const recentAssetIds = context?.recentQuestionKeys[QUESTION_28_29_RECENT_KEY] ?? []
  const question = generateQuestion28({ seedHash, random, recentAssetIds })
  if (context) context.recentQuestionKeys[QUESTION_28_29_RECENT_KEY] = [(question.data as ImageResemblesLetterData).asset.imageId]
  return question
}

function generateT29(seedHash: string, random: Random, context?: QuestionGenerationContext) {
  const recentAssetIds = context?.recentQuestionKeys[QUESTION_28_29_RECENT_KEY] ?? []
  const question = generateQuestion29({ seedHash, random, recentAssetIds })
  if (context) context.recentQuestionKeys[QUESTION_28_29_RECENT_KEY] = [(question.data as ImageResemblesLetterData).asset.imageId]
  return question
}

export function validateImageResemblesLetterQuestion(question: GeneratedExamQuestion): void {
  const data = question.data as ImageResemblesLetterData | undefined
  const asset = QUESTION_29_ASSETS.find(candidate => candidate.id === data?.asset?.id)
  const enabledAsset = QUESTION_28_29_ENABLED_ASSETS.some(candidate => candidate.id === asset?.id)
  const target = asset?.resemblesLetter
  const expectedVisual = asset ? getQuestion29AssetVisual(asset) : undefined
  const options = question.options ?? []
  const optionIds = options.map(option => option.id)
  const distractors = target ? getQuestion29DistractorPool(target) : []
  const promptVoice = getQuestion25InstructionVoice()
  const assetMatches = asset && data?.asset
    && asset.manifestId === data.asset.manifestId
    && asset.imageId === data.asset.imageId
    && asset.resemblesLetter === data.asset.resemblesLetter

  if (!data || !assetMatches || !enabledAsset || !expectedVisual || !target
    || !QUESTION_29_ALLOWED_LETTERS.includes(target as typeof QUESTION_29_ALLOWED_LETTERS[number])
    || question.type !== 'select-input' || !['T28', 'T29'].includes(question.templateId)
    || question.subType !== 'image-resembles-letter' || data.generator !== 'IMAGE_RESEMBLES_LETTER'
    || data.subType !== 'image-resembles-letter' || question.knowledgeKey !== 'RECOGNIZE_LETTER_BY_SHAPE'
    || question.prompt !== QUESTION_25_PROMPT || JSON.stringify(question.promptVoice) !== JSON.stringify(promptVoice)
    || data.sentencePrefix !== QUESTION_29_SENTENCE_PREFIX
    || data.selectionKey !== `${question.templateId}:${asset.id}`
    || question.content?.type !== 'visual' || JSON.stringify(question.content.visual) !== JSON.stringify(expectedVisual)
    || options.length !== 4 || new Set(optionIds).size !== 4
    || new Set(options.map(option => option.text)).size !== 4
    || options.some(option => typeof option.text !== 'string' || option.id !== option.text
      || !QUESTION_28_29_ALLOWED_LETTER_SET.has(option.text)
      || (option.text !== target && !distractors.includes(option.text)))
    || JSON.stringify(data.choices) !== JSON.stringify(optionIds)
    || typeof question.correctAnswer !== 'string' || question.correctAnswer !== target
    || options.filter(option => option.id === target && option.text === target).length !== 1)
    throw new Error(`${question.templateId} has invalid IMAGE_RESEMBLES_LETTER asset, prompt, or choices`)
}

export function validateQuestion30(question: GeneratedExamQuestion): void {
  const data = question.data as Question30Data | undefined
  const items = data?.items ?? []
  const letterBank = data?.letterBank ?? []
  const answer = question.correctAnswer
  const fruitIds = items.map(item => item.fruit.id)
  const colorIds = items.map(item => item.color.id)
  const letters = items.map(item => item.letter)
  const expectedAnswer = Object.fromEntries(items.map(item => [item.id, item.letter]))

  if (!data || question.templateId !== 'T30' || question.type !== 'drag-fill'
    || question.subType !== 'fruit-color-letter' || data.generator !== 'FILL_FRUIT_COLOR_LETTER'
    || data.subType !== 'fruit-color-letter' || question.prompt !== QUESTION_30_PROMPT
    || question.knowledgeKey !== 'FILL_LETTER_BY_FRUIT_COLOR'
    || items.length !== 3 || new Set(items.map(item => item.id)).size !== 3
    || new Set(fruitIds).size !== 3 || new Set(colorIds).size !== 3 || new Set(letters).size !== 3
    || letterBank.length !== 5 || new Set(letterBank).size !== 5
    || !letters.every(letter => QUESTION_30_ALLOWED_LETTERS.includes(letter as typeof QUESTION_30_ALLOWED_LETTERS[number]))
    || !letterBank.every(letter => QUESTION_30_ALLOWED_LETTERS.includes(letter as typeof QUESTION_30_ALLOWED_LETTERS[number]))
    || letters.some(letter => !letterBank.includes(letter))
    || letterBank.filter(letter => !letters.includes(letter)).length !== 2
    || data.combinationKey !== getQuestion30CombinationKey(items)
    || data.selectionSignature !== getQuestion30SelectionSignature(items)
    || JSON.stringify(answer) !== JSON.stringify(expectedAnswer))
    throw new Error('T30 has invalid fruit-color-letter data or answer mapping')

  for (const item of items) {
    const fruit = QUESTION_30_FRUIT_POOL.find(candidate => candidate.id === item.fruit.id)
    const color = QUESTION_30_COLOR_POOL.find(candidate => candidate.id === item.color.id)
    const expectedVisual = fruit ? getQuestion30FruitVisual(fruit) : undefined
    const expectedVoiceSequence = getQuestion30VoiceSequence(item)
    if (!fruit || !color || JSON.stringify(item.fruit) !== JSON.stringify(fruit)
      || JSON.stringify(item.color) !== JSON.stringify(color) || !expectedVisual
      || !getQuestion30AllowedColorIds(item.fruit.id).includes(item.color.id)
      || !hasFindTargetVoiceFiles([fruit.voice])
      || JSON.stringify(item.voiceSequence) !== JSON.stringify(expectedVoiceSequence)
      || item.voiceAvailable !== hasFindTargetVoiceFiles(expectedVoiceSequence))
      throw new Error(`T30 item ${item.id} has invalid fruit, color, visual, or voice data`)
  }
}

function pickUniqueQuestion30Colors(fruitIds: readonly string[], random: Random) {
  const assign = (index: number, usedColors: ReadonlySet<string>): string[] | undefined => {
    if (index === fruitIds.length) return []

    for (const colorId of shuffle(getQuestion30AllowedColorIds(fruitIds[index]), random)) {
      if (usedColors.has(colorId)) continue
      const nextUsedColors = new Set(usedColors)
      nextUsedColors.add(colorId)
      const remaining = assign(index + 1, nextUsedColors)
      if (remaining) return [colorId, ...remaining]
    }
    return undefined
  }

  return assign(0, new Set())
}

export function generateQuestion30(args: {
  seedHash: string
  random: Random
  recentSelectionSignatures?: readonly string[]
}) {
  let items: Question30Item[] = []
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const fruits = pickDistractors({ pool: QUESTION_30_FRUIT_POOL, exclude: [], count: 3, random: args.random })
    const colorIds = pickUniqueQuestion30Colors(fruits.map(fruit => fruit.id), args.random)
    if (!colorIds) continue
    const colors = colorIds.map(colorId => {
      const color = QUESTION_30_COLOR_POOL.find(candidate => candidate.id === colorId)
      if (!color) throw new Error(`Missing color metadata for ${colorId}`)
      return color
    })
    const letters = pickDistractors({ pool: QUESTION_30_ALLOWED_LETTERS, exclude: [], count: 3, random: args.random })
    const candidate = fruits.map((fruit, index) => {
      const color = colors[index]
      const draft = { id: `q30-${index}`, fruit, color, letter: letters[index] }
      const voiceSequence = getQuestion30VoiceSequence(draft)
      return { ...draft, voiceSequence, voiceAvailable: hasFindTargetVoiceFiles(voiceSequence) }
    })
    if (!question30SelectionRepeatsRecent(candidate, args.recentSelectionSignatures ?? [])) {
      items = candidate
      break
    }
  }
  if (items.length !== 3) throw new Error('Unable to create a fresh fruit-color-letter question')

  const letters = items.map(item => item.letter)
  const letterBank = shuffle([
    ...letters,
    ...pickDistractors({ pool: QUESTION_30_ALLOWED_LETTERS, exclude: letters, count: 2, random: args.random }),
  ], args.random)
  const data: Question30Data = {
    generator: 'FILL_FRUIT_COLOR_LETTER',
    subType: 'fruit-color-letter',
    items,
    letterBank,
    combinationKey: getQuestion30CombinationKey(items),
    selectionSignature: getQuestion30SelectionSignature(items),
  }
  const correctAnswer = Object.fromEntries(items.map(item => [item.id, item.letter]))
  const question = baseQuestion(args.seedHash, 'T30', 'drag-fill', QUESTION_30_PROMPT, correctAnswer, {
    difficulty: 3,
    subType: 'fruit-color-letter',
    knowledgeKey: 'FILL_LETTER_BY_FRUIT_COLOR',
    data,
  })
  validateQuestion30(question)
  return question
}

function generateT30(seedHash: string, random: Random, context?: QuestionGenerationContext) {
  const question = generateQuestion30({
    seedHash,
    random,
    recentSelectionSignatures: context?.recentQuestionKeys[QUESTION_30_RECENT_KEY] ?? [],
  })
  if (context) context.recentQuestionKeys[QUESTION_30_RECENT_KEY] = [(question.data as Question30Data).selectionSignature]
  return question
}

export type TemplateGenerator = (seedHash: string, random: Random, context?: QuestionGenerationContext) => GeneratedExamQuestion

export const TEMPLATE_GENERATORS: readonly TemplateGenerator[] = [
  generateT01, generateT02, generateT03, generateT04, generateT05,
  generateT06, generateT07, generateT08, generateT09, generateT10,
  generateT11, generateT12, generateT13, generateT14, generateT15,
  generateT16, generateT17, generateT18, generateT19, generateT20,
  generateT21, generateT22, generateT23, generateT24, generateT25,
  generateT26, generateT27, generateT28, generateT29, generateT30,
]


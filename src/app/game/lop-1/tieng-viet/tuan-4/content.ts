import type { LearningQuestion, LearningSkill } from '@/components/games/general/learning-question'
import type { VoiceSegment } from '@/components/games/general/composed-voice'
import {
  getVietnameseInstructionVoice, resolveVietnameseTargetVoice, VIETNAMESE_VOICE_MANIFEST,
  type VietnameseInstructionKey, type VietnameseVoiceTargetType,
} from '@/components/games/vietnamese/voice-manifest'
import { createVietnameseBlankContext, createVietnamesePairFillData, normalizeVietnameseQuestion, VIETNAMESE_QUESTION_TEMPLATES, type VietnameseConnectPair } from '@/components/games/vietnamese/question-model'
import { getSpriteById, WEEK_4_SPRITE_SHEET, type Week4ImageId } from '@/components/games/vietnamese/week4-sprites'
import { TIENG_VIET_1_WEEK_4_LEARNING_KEYS, type VietnameseWeek4Goal } from './lesson'

export const QUESTION_COUNT = 25
export type VietnameseWeek4Game = 'bubble-shooter' | 'gold-mining' | 'racing' | 'drag-drop'
export type Week4SourceLesson = 16 | 17 | 18 | 19 | 20
export type Week4KnowledgeType = 'letter' | 'letterGroup' | 'syllable' | 'word' | 'sentence'
export type Week4QuestionStage = 'recognize' | 'find' | 'distinguish' | 'read' | 'mixed'

export type Week4KnowledgeItem = {
  text: string
  type: Week4KnowledgeType
  sourceLesson: Week4SourceLesson
  week: 4
  onset?: string
  /** ng and ngh are orthographic variants from the same onset family. */
  onsetFamily?: string
  /** Exact onset metadata for each syllable in a word or phrase. */
  onsets?: readonly string[]
  parts?: readonly string[]
  vowel?: string
  tone?: string | null
  targetSourceLesson?: Week4SourceLesson
}

export type VietnameseWeek4Question = LearningQuestion & {
  goalKey: VietnameseWeek4Goal
  sourceLesson: Week4SourceLesson
  questionType: string
  options: string[]
  displayText: string
  variant: string
  stage: Week4QuestionStage
  voiceSequence?: VoiceSegment[]
  voiceFallback?: { instruction?: string; target?: string }
  spokenInstruction?: string
  connectPairs?: readonly VietnameseConnectPair[]
  imageId?: string
  data: Record<string, unknown>
}

const syllable = (
  text: string, onset: string, vowel: string, tone: string | null, sourceLesson: Week4SourceLesson,
): Week4KnowledgeItem => ({
  text: text.normalize('NFC'), type: 'syllable', sourceLesson, week: 4, onset,
  onsetFamily: onset === 'ng' || onset === 'ngh' ? 'ng' : undefined,
  vowel, tone,
})
const word = (
  text: string, parts: readonly string[], onsets: readonly string[], sourceLesson: Week4SourceLesson,
): Week4KnowledgeItem => ({
  text: text.normalize('NFC'), type: 'word', sourceLesson, week: 4,
  onset: onsets[0], onsetFamily: onsets[0] === 'ng' || onsets[0] === 'ngh' ? 'ng' : undefined,
  parts, onsets,
})
const sentence = (text: string, sourceLesson: Week4SourceLesson): Week4KnowledgeItem => ({
  text: text.normalize('NFC'), type: 'sentence', sourceLesson, week: 4,
})

export const WEEK_4_LETTER_GROUPS = [
  { lower: 'm', upper: 'M', sourceLesson: 16 as const }, { lower: 'n', upper: 'N', sourceLesson: 16 as const },
  { lower: 'g', upper: 'G', sourceLesson: 17 as const }, { lower: 'gi', upper: 'GI', sourceLesson: 17 as const },
  { lower: 'gh', upper: 'GH', sourceLesson: 18 as const }, { lower: 'nh', upper: 'NH', sourceLesson: 18 as const },
  { lower: 'ng', upper: 'NG', sourceLesson: 19 as const }, { lower: 'ngh', upper: 'NGH', sourceLesson: 19 as const },
] as const

const PRIOR_LETTERS = ['a', 'b', 'c', 'e', 'ê', 'o', 'ô', 'ơ', 'd', 'đ', 'i', 'k', 'h', 'l', 'u', 'ư', 'ch', 'kh'] as const
export const WEEK_4_LETTER_OPTIONS = [...PRIOR_LETTERS, ...WEEK_4_LETTER_GROUPS.map(item => item.lower)]
export const WEEK_4_LEARNED_LETTERS = WEEK_4_LETTER_OPTIONS
export const WEEK_4_UPPERCASE_OPTIONS = WEEK_4_LETTER_OPTIONS.map(value => value.toLocaleUpperCase('vi-VN'))

export const WEEK_4_SYLLABLES: readonly Week4KnowledgeItem[] = [
  syllable('mẹ', 'm', 'e', 'nặng', 16), syllable('me', 'm', 'e', null, 16), syllable('mè', 'm', 'e', 'huyền', 16),
  syllable('nơ', 'n', 'ơ', null, 16), syllable('nô', 'n', 'ô', null, 16), syllable('mua', 'm', 'ua', null, 16),
  syllable('gà', 'g', 'a', 'huyền', 17), syllable('gô', 'g', 'ô', null, 17), syllable('gỗ', 'g', 'ô', 'ngã', 17),
  syllable('giỏ', 'gi', 'o', 'hỏi', 17), syllable('giá', 'gi', 'a', 'sắc', 17), syllable('già', 'gi', 'a', 'huyền', 17),
  syllable('ghé', 'gh', 'e', 'sắc', 18), syllable('ghe', 'gh', 'e', null, 18), syllable('ghế', 'gh', 'ê', 'sắc', 18),
  syllable('ghẹ', 'gh', 'e', 'nặng', 18), syllable('ghi', 'gh', 'i', null, 18), syllable('nhà', 'nh', 'a', 'huyền', 18),
  syllable('nhỏ', 'nh', 'o', 'hỏi', 18), syllable('nho', 'nh', 'o', null, 18),
  syllable('ngõ', 'ng', 'o', 'ngã', 19), syllable('ngã', 'ng', 'a', 'ngã', 19), syllable('ngủ', 'ng', 'u', 'hỏi', 19),
  syllable('nghe', 'ngh', 'e', null, 19), syllable('nghé', 'ngh', 'e', 'sắc', 19), syllable('nghỉ', 'ngh', 'i', 'hỏi', 19),
  syllable('nghệ', 'ngh', 'ê', 'nặng', 19),
]

export const WEEK_4_WORDS: readonly Week4KnowledgeItem[] = [
  word('cá mè', ['cá', 'mè'], ['c', 'm'], 16), word('lá me', ['lá', 'me'], ['l', 'm'], 16),
  word('nơ đỏ', ['nơ', 'đỏ'], ['n', 'đ'], 16), word('ca nô', ['ca', 'nô'], ['c', 'n'], 16),
  word('gà gô', ['gà', 'gô'], ['g', 'g'], 17), word('đồ gỗ', ['đồ', 'gỗ'], ['đ', 'g'], 17),
  word('giá đỗ', ['giá', 'đỗ'], ['gi', 'đ'], 17), word('cụ già', ['cụ', 'già'], ['c', 'gi'], 17),
  word('ghế đá', ['ghế', 'đá'], ['gh', 'đ'], 18), word('ghẹ đỏ', ['ghẹ', 'đỏ'], ['gh', 'đ'], 18),
  word('nhà gỗ', ['nhà', 'gỗ'], ['nh', 'g'], 18), word('lá nho', ['lá', 'nho'], ['l', 'nh'], 18),
  word('ngã ba', ['ngã', 'ba'], ['ng', 'b'], 19), word('ngõ nhỏ', ['ngõ', 'nhỏ'], ['ng', 'nh'], 19),
  word('củ nghệ', ['củ', 'nghệ'], ['c', 'ngh'], 19), word('nghỉ hè', ['nghỉ', 'hè'], ['ngh', 'h'], 19),
  word('hũ cá', ['hũ', 'cá'], ['h', 'c'], 20), word('nhà ga', ['nhà', 'ga'], ['nh', 'g'], 20),
  word('ngủ mơ', ['ngủ', 'mơ'], ['ng', 'm'], 20), word('bờ ngõ', ['bờ', 'ngõ'], ['b', 'ng'], 20),
  word('nho nhỏ', ['nho', 'nhỏ'], ['nh', 'nh'], 20), word('ghế gỗ', ['ghế', 'gỗ'], ['gh', 'g'], 20),
]

export const WEEK_4_SENTENCES: readonly Week4KnowledgeItem[] = [
  sentence('Mẹ mua nơ cho Hà.', 16), sentence('Bố mẹ cho Hà đi ca nô.', 16),
  sentence('Hà có giỏ trứng gà.', 17), sentence('Bà che gió cho ba chú gà.', 17),
  sentence('Hà ghé nhà bà.', 18), sentence('Nhà bà ở ngõ nhỏ.', 18), sentence('Mẹ nhờ Hà bê ghế nhỏ.', 18),
  sentence('Nghé theo mẹ ra ngõ.', 19), sentence('Nghé đã no cỏ.', 19), sentence('Nghé ngủ ở bờ đê.', 19),
  sentence('Mẹ ghé nhà bà.', 20),
]

export const WEEK_4_KNOWLEDGE_POOL: readonly Week4KnowledgeItem[] = [
  ...WEEK_4_LETTER_GROUPS.map(({ lower, sourceLesson }) => ({
    text: lower, type: lower.length === 1 ? 'letter' as const : 'letterGroup' as const, sourceLesson, week: 4 as const,
  })),
  ...WEEK_4_SYLLABLES, ...WEEK_4_WORDS, ...WEEK_4_SENTENCES,
]

export type Week4ImageKnowledge = {
  id: string
  imageId: Week4ImageId
  text: string
  sourceLesson: Week4SourceLesson
  onset: string
  onsetFamily?: string
  learningKey: VietnameseWeek4Goal
  type: 'syllable' | 'word'
  confusionGroup: string
  tags: readonly string[]
}

// Add image metadata beside the existing pool without changing old question templates.
const imageKnowledgeData = [
  { imageId: 'me', text: 'mẹ', sourceLesson: 16, onset: 'm', learningKey: 'RECOGNIZE_M', type: 'syllable', confusionGroup: 'M_N' },
  { imageId: 'ca_me', text: 'cá mè', sourceLesson: 16, onset: 'c', learningKey: 'REVIEW_LETTERS_WEEK_4', type: 'word', confusionGroup: 'C_K' },
  { imageId: 'no', text: 'nơ', sourceLesson: 16, onset: 'n', learningKey: 'RECOGNIZE_N', type: 'syllable', confusionGroup: 'M_N' },
  { imageId: 'ca_no', text: 'ca nô', sourceLesson: 16, onset: 'c', learningKey: 'REVIEW_LETTERS_WEEK_4', type: 'word', confusionGroup: 'C_K' },
  { imageId: 'ga', text: 'gà', sourceLesson: 17, onset: 'g', learningKey: 'RECOGNIZE_G', type: 'syllable', confusionGroup: 'G_GI_GH' },
  { imageId: 'go', text: 'gỗ', sourceLesson: 17, onset: 'g', learningKey: 'RECOGNIZE_G', type: 'syllable', confusionGroup: 'G_GI_GH' },
  { imageId: 'gio', text: 'giỏ', sourceLesson: 17, onset: 'gi', learningKey: 'RECOGNIZE_GI', type: 'syllable', confusionGroup: 'G_GI_GH' },
  { imageId: 'gia_do', text: 'giá đỗ', sourceLesson: 17, onset: 'gi', learningKey: 'RECOGNIZE_GI', type: 'word', confusionGroup: 'G_GI_GH' },
  { imageId: 'ghe', text: 'ghế', sourceLesson: 18, onset: 'gh', learningKey: 'RECOGNIZE_GH', type: 'syllable', confusionGroup: 'G_GI_GH' },
  { imageId: 'ghe_cua', text: 'ghẹ', sourceLesson: 18, onset: 'gh', learningKey: 'RECOGNIZE_GH', type: 'syllable', confusionGroup: 'GH_NH' },
  { imageId: 'nha', text: 'nhà', sourceLesson: 18, onset: 'nh', learningKey: 'RECOGNIZE_NH', type: 'syllable', confusionGroup: 'GH_NH' },
  { imageId: 'nho', text: 'nho', sourceLesson: 18, onset: 'nh', learningKey: 'RECOGNIZE_NH', type: 'syllable', confusionGroup: 'GH_NH' },
  { imageId: 'ngo', text: 'ngõ', sourceLesson: 19, onset: 'ng', learningKey: 'RECOGNIZE_NG', type: 'syllable', confusionGroup: 'NG_NGH' },
  { imageId: 'ngu', text: 'ngủ', sourceLesson: 19, onset: 'ng', learningKey: 'RECOGNIZE_NG', type: 'syllable', confusionGroup: 'NG_NGH' },
  { imageId: 'nghe', text: 'nghé', sourceLesson: 19, onset: 'ngh', learningKey: 'RECOGNIZE_NGH', type: 'syllable', confusionGroup: 'NG_NGH' },
  { imageId: 'cu_nghe', text: 'củ nghệ', sourceLesson: 19, onset: 'c', learningKey: 'REVIEW_LETTERS_WEEK_4', type: 'word', confusionGroup: 'C_K' },
] satisfies readonly Omit<Week4ImageKnowledge, 'id' | 'tags' | 'onsetFamily'>[]

export const WEEK_4_IMAGE_KNOWLEDGE: readonly Week4ImageKnowledge[] = imageKnowledgeData.map(item => ({
  ...item,
  id: item.imageId,
  onsetFamily: item.onset === 'ng' || item.onset === 'ngh' ? 'ng' : undefined,
  tags: ['week4', 'image', 'onset'],
}))

const SYLLABLE_OPTIONS = Array.from(new Set([
  ...WEEK_4_SYLLABLES.map(item => item.text),
  'ba', 'bà', 'ca', 'cà', 'cá', 'bè', 'bé', 'bế', 'bò', 'cò', 'cỏ', 'bố', 'bộ', 'cô', 'cổ', 'đa', 'đá', 'dê', 'đỏ', 'bờ', 'cờ', 'đỡ',
  'kì', 'kẻ', 'kẽ', 'kí', 'bí', 'đi', 'ho', 'hồ', 'hố', 'le', 'lá', 'hẹ', 'dù', 'đu', 'đủ', 'dữ', 'lừ', 'chú', 'khỉ', 'chợ', 'khô', 'khế', 'chị', 'kho',
]))
const WORD_OPTIONS = Array.from(new Set([
  ...WEEK_4_WORDS.map(item => item.text),
  'cô bé', 'cổ cò', 'đá dế', 'đa đa', 'ô đỏ', 'bờ đê', 'cá cờ', 'đỡ bé', 'cờ đỏ', 'đỡ bà', 'bí đỏ', 'kẻ ô', 'đi đò', 'kì đà',
  'lá đỏ', 'bờ hồ', 'cá hố', 'le le', 'lá hẹ', 'đu đủ', 'hổ dữ', 'lá khô', 'chú khỉ', 'chợ cá', 'cá kho khế', 'chú hề', 'chè ô', 'cá dữ',
]))

const VOICE_ASSETS_READY = true
type OptionKind = 'letter' | 'uppercase' | 'syllable' | 'word'
type Template = {
  goalKey: VietnameseWeek4Goal
  sourceLesson: Week4SourceLesson
  variant: string
  prompt: string
  answer: string
  displayText: string
  distractors: readonly string[]
  stage: Week4QuestionStage
  questionType: string
  optionKind: OptionKind
  skill: LearningSkill
  inputMode: 'audio' | 'text' | 'image'
  targetType?: VietnameseVoiceTargetType
  targetText?: string
  voicePlan?: VoiceSegment[]
  voiceFallback?: { instruction?: string; target?: string }
  voiceRequired?: boolean
  data: Record<string, unknown>
  sentenceWordCount?: number
  connectPairs?: readonly VietnameseConnectPair[]
  imageId?: Week4ImageId
  spokenInstruction?: string
}

const commonSegment = (key: keyof typeof VIETNAMESE_VOICE_MANIFEST.common, text: string): VoiceSegment => ({
  src: VIETNAMESE_VOICE_MANIFEST.common[key], text,
})
const targetSegment = (type: VietnameseVoiceTargetType, target: string): VoiceSegment | undefined => {
  const src = resolveVietnameseTargetVoice(type, target)
  return src ? { src, text: target } : undefined
}
const sequence = (...segments: Array<VoiceSegment | undefined>): VoiceSegment[] | undefined => {
  const result = segments.filter((segment): segment is VoiceSegment => Boolean(segment))
  return result.length ? result : undefined
}
const instructionSegment = (key: VietnameseInstructionKey, text: string): VoiceSegment | undefined => {
  const src = getVietnameseInstructionVoice(key)
  return src ? { src, text } : undefined
}
const voicePlan = (...segments: Array<VoiceSegment | undefined>) => sequence(...segments)
const listenInstructionSegment = (text: string) => {
  const segment = instructionSegment('LISTEN_AND_CHOOSE', text)
  return segment ? { ...segment, pauseAfterMs: 240 } : undefined
}

const onsetFillVoicePlan = (
  visibleContext: string,
  onset: string,
  words: readonly { text: string }[],
  sentences: readonly { text: string }[],
) => {
  const spokenContext = visibleContext.replace(/_+/g, onset).normalize('NFC')
  const contextKey = spokenContext.toLocaleLowerCase('vi-VN')
  const sentence = sentences.find(item => item.text.normalize('NFC').toLocaleLowerCase('vi-VN') === contextKey)
  const wordContext = words.find(item => item.text.normalize('NFC').toLocaleLowerCase('vi-VN') === contextKey)
  const contextItem = sentence ?? wordContext
  if (!contextItem) throw new Error(`Week 4 onset-fill context is missing from the knowledge pool: ${spokenContext}`)

  const isSentence = Boolean(sentence)
  const context = contextItem.text.normalize('NFC')
  const isPhrase = /\s/.test(context.trim())
  const contextVoice = targetSegment(isSentence ? 'sentences' : isPhrase ? 'words' : 'syllables', context)
  if (!contextVoice) throw new Error(`Week 4 onset-fill context has no recorded voice: ${context}`)
  return voicePlan(
    instructionSegment('FILL_ONSET', 'Bé hãy chọn phụ âm đầu còn thiếu'),
    commonSegment(isSentence ? 'inSentence' : isPhrase ? 'inPhrase' : 'inSyllable', isSentence ? 'trong câu' : isPhrase ? 'trong cụm từ' : 'trong tiếng'),
    contextVoice,
  )
}

const PAIRS = [
  { pair: 'm/n', letters: ['m', 'n'], sourceLesson: 16, recognize: ['RECOGNIZE_M', 'RECOGNIZE_N'], case: ['RECOGNIZE_M_CASE', 'RECOGNIZE_N_CASE'], distinguish: 'DISTINGUISH_M_N', listen: 'LISTEN_M_N', find: 'FIND_M_N_IN_TEXT', match: 'MATCH_M_N', review: 'REVIEW_M_N_WEEK_4' },
  { pair: 'g/gi', letters: ['g', 'gi'], sourceLesson: 17, recognize: ['RECOGNIZE_G', 'RECOGNIZE_GI'], case: ['RECOGNIZE_G_CASE', 'RECOGNIZE_GI_CASE'], distinguish: 'DISTINGUISH_G_GI', listen: 'LISTEN_G_GI', find: 'FIND_G_GI_IN_TEXT', match: 'MATCH_G_GI', review: 'REVIEW_G_GI_WEEK_4' },
  { pair: 'gh/nh', letters: ['gh', 'nh'], sourceLesson: 18, recognize: ['RECOGNIZE_GH', 'RECOGNIZE_NH'], case: ['RECOGNIZE_GH_CASE', 'RECOGNIZE_NH_CASE'], distinguish: 'DISTINGUISH_GH_NH', listen: 'LISTEN_GH_NH', find: 'FIND_GH_NH_IN_TEXT', match: 'MATCH_GH_NH', review: 'REVIEW_GH_NH_WEEK_4' },
  { pair: 'ng/ngh', letters: ['ng', 'ngh'], sourceLesson: 19, recognize: ['RECOGNIZE_NG', 'RECOGNIZE_NGH'], case: ['RECOGNIZE_NG_CASE', 'RECOGNIZE_NGH_CASE'], distinguish: 'DISTINGUISH_NG_NGH', listen: 'LISTEN_NG_NGH', find: 'FIND_NG_NGH_IN_TEXT', match: 'MATCH_NG_NGH', review: 'REVIEW_NG_NGH_WEEK_4' },
] as const
const NGH_CONTEXT_VOWELS = new Set(['e', 'ê', 'i'])

function onsetPairForSyllable(item: Week4KnowledgeItem, pair: typeof PAIRS[number]): readonly [string, string] {
  if (pair.pair === 'ng/ngh' && item.onset === 'ng') return ['ng', 'nh']
  return pair.letters as readonly [string, string]
}

function hasNghRuleVowel(item: Week4KnowledgeItem): boolean {
  return item.onset === 'ngh' && NGH_CONTEXT_VOWELS.has(item.vowel ?? '')
}

const recognitionKey = (sourceLesson: Week4SourceLesson, onset: string): VietnameseWeek4Goal => {
  const pair = PAIRS.find(item => item.sourceLesson === sourceLesson)!
  const index = pair.letters[0] === onset ? 0 : 1
  return pair.recognize[index] as VietnameseWeek4Goal
}
const caseKey = (sourceLesson: Week4SourceLesson, onset: string): VietnameseWeek4Goal => {
  const pair = PAIRS.find(item => item.sourceLesson === sourceLesson)!
  const index = pair.letters[0] === onset ? 0 : 1
  return pair.case[index] as VietnameseWeek4Goal
}
const findKey = (sourceLesson: Week4SourceLesson): VietnameseWeek4Goal => PAIRS.find(item => item.sourceLesson === sourceLesson)!.find as VietnameseWeek4Goal
const reviewPairKey = (pair: typeof PAIRS[number]): VietnameseWeek4Goal => pair.review

function createTemplates(): Template[] {
  const templates: Template[] = []
  const add = (input: Omit<Template, 'data'> & { data?: Record<string, unknown> }) => {
    const answer = input.answer.normalize('NFC')
    const distractors = Array.from(new Set(input.distractors.map(value => value.normalize('NFC'))))
      .filter(value => value !== answer)
    const minimumDistractors = input.questionType === 'CHOOSE_PAIR' ? 1 : input.questionType.startsWith('CONNECT_') ? 0 : 5
    if (distractors.length < minimumDistractors) throw new Error(`Week 4 template needs ${minimumDistractors} valid distractors: ${input.goalKey}/${input.variant}`)
    templates.push({ ...input, answer, displayText: input.displayText.normalize('NFC'), distractors, data: input.data ?? {} })
  }

  for (const letter of WEEK_4_LETTER_GROUPS) {
    const isGroup = letter.lower.length > 1
    const allLower = WEEK_4_LEARNED_LETTERS.filter(value => value !== letter.lower)
    const allUpper = WEEK_4_UPPERCASE_OPTIONS.filter(value => value.toLocaleLowerCase('vi-VN') !== letter.lower)
    add({ goalKey: recognitionKey(letter.sourceLesson, letter.lower), sourceLesson: letter.sourceLesson,
      variant: `recognize-${letter.lower}`, prompt: `Chọn ${isGroup ? 'phụ âm đầu' : 'chữ'} ${letter.lower}`,
      answer: letter.lower, displayText: letter.lower, distractors: allLower, stage: 'recognize',
      questionType: isGroup ? 'LETTER_GROUP_RECOGNITION' : 'LETTER_RECOGNITION', optionKind: 'letter', skill: 'reading', inputMode: 'text',
      targetType: 'letters', targetText: letter.lower,
      voicePlan: voicePlan(instructionSegment('CHOOSE_LETTER', 'Bé hãy chọn chữ'), targetSegment('letters', letter.lower)),
      data: { knowledgeType: isGroup ? 'letterGroup' : 'letter', onset: letter.lower, onsetFamily: letter.lower.startsWith('ng') ? 'ng' : undefined, week: 4 },
    })
    add({ goalKey: caseKey(letter.sourceLesson, letter.lower), sourceLesson: letter.sourceLesson,
      variant: `case-${letter.lower}-lower`, prompt: VIETNAMESE_QUESTION_TEMPLATES.matchLowercase(letter.upper),
      answer: letter.lower, displayText: `${letter.upper} → ?`, distractors: allLower, stage: 'recognize',
      questionType: 'LETTER_CASE_MATCH', optionKind: 'letter', skill: 'reading', inputMode: 'text',
      targetType: 'letters', targetText: letter.upper,
      voicePlan: voicePlan(instructionSegment('CHOOSE_LETTER', 'Bé hãy chọn chữ'), commonSegment('lowerCaseOf', 'thường của'), targetSegment('letters', letter.upper)),
      data: { knowledgeType: isGroup ? 'letterGroup' : 'letter', onset: letter.lower, case: 'lower', week: 4 },
    })
    add({ goalKey: caseKey(letter.sourceLesson, letter.lower), sourceLesson: letter.sourceLesson,
      variant: `case-${letter.lower}-upper`, prompt: VIETNAMESE_QUESTION_TEMPLATES.matchUppercase(letter.lower),
      answer: letter.upper, displayText: `${letter.lower} → ?`, distractors: allUpper, stage: 'recognize',
      questionType: 'LETTER_CASE_MATCH', optionKind: 'uppercase', skill: 'reading', inputMode: 'text',
      targetType: 'letters', targetText: letter.lower,
      voicePlan: voicePlan(instructionSegment('FIND_LETTER', 'Bé hãy tìm chữ'), commonSegment('upperCaseOf', 'hoa của'), targetSegment('letters', letter.lower)),
      data: { knowledgeType: isGroup ? 'letterGroup' : 'letter', onset: letter.lower, case: 'upper', week: 4 },
    })
  }

  for (const pair of PAIRS) {
    for (const target of pair.letters) {
      const opposite = pair.letters.find(value => value !== target)!
      if (pair.pair !== 'ng/ngh') add({ goalKey: pair.distinguish, sourceLesson: pair.sourceLesson, variant: `distinguish-${pair.pair}-${target}`,
          prompt: VIETNAMESE_QUESTION_TEMPLATES.recognizeLetter(target), answer: target, displayText: '?',
          distractors: [opposite, ...WEEK_4_LEARNED_LETTERS.filter(value => value !== target && value !== opposite)], stage: 'distinguish',
          questionType: 'DISTINGUISH_LETTER_GROUPS', optionKind: 'letter', skill: 'reading', inputMode: 'text',
          targetType: 'letters', targetText: target,
          voicePlan: voicePlan(instructionSegment('CHOOSE_LETTER', 'Bé hãy chọn chữ'), targetSegment('letters', target)),
          data: { pair: pair.pair, onset: target, onsetFamily: target.startsWith('ng') ? 'ng' : undefined, week: 4 },
        })
      const upper = target.toLocaleUpperCase('vi-VN')
      add({ goalKey: pair.match, sourceLesson: pair.sourceLesson, variant: `match-${pair.pair}-${target}`,
        prompt: VIETNAMESE_QUESTION_TEMPLATES.matchLowercase(upper), answer: target, displayText: `${upper} → ?`,
        distractors: WEEK_4_LEARNED_LETTERS.filter(value => value !== target), stage: 'find',
        questionType: 'LETTER_CASE_MATCH', optionKind: 'letter', skill: 'reading', inputMode: 'text',
        targetType: 'letters', targetText: target,
        voicePlan: voicePlan(instructionSegment('CHOOSE_LETTER', 'Bé hãy chọn chữ'), commonSegment('lowerCaseOf', 'thường của'), targetSegment('letters', upper)),
        data: { pair: pair.pair, onset: target, week: 4 },
      })
      const listeningExample = target === 'g' ? 'gà' : target === 'gh' ? 'ghế'
        : target === 'ng' ? 'ngõ' : target === 'ngh' ? 'nghỉ' : undefined
      const audioTarget = listeningExample
        ? targetSegment('syllables', listeningExample)
        : targetSegment('letters', target)
      const followingVowel = listeningExample ? WEEK_4_SYLLABLES.find(item => item.text === listeningExample)?.vowel : undefined
      add({ goalKey: pair.listen, sourceLesson: pair.sourceLesson, variant: `listen-letter-${target}`,
        prompt: listeningExample ? 'Nghe tiếng và chọn phụ âm đầu.' : `Nghe và chọn ${target.length > 1 ? 'phụ âm đầu' : 'chữ'}`,
        answer: target, displayText: target === 'ngh' && followingVowel ? `🔊 ${followingVowel}` : '🔊',
        distractors: WEEK_4_LEARNED_LETTERS.filter(value => value !== target), stage: 'find',
        questionType: 'LISTEN_AND_CHOOSE_LETTER', optionKind: 'letter', skill: 'listening', inputMode: 'audio',
        targetType: listeningExample ? undefined : 'letters', targetText: target,
        voicePlan: voicePlan(listenInstructionSegment('Bé hãy nghe và chọn'), audioTarget), voiceRequired: true,
        data: { knowledgeType: target.length > 1 ? 'letterGroup' : 'letter', onset: target, pair: pair.pair, listeningExample, vowel: followingVowel, week: 4 },
      })
    }
  }

  const itemOnsets = (item: Week4KnowledgeItem) => item.type === 'syllable' ? [item.onset!] : item.onsets ?? []
  const startsWithOnset = (item: Week4KnowledgeItem, onset: string) => item.type === 'syllable'
    ? item.onset === onset
    : item.type === 'word' && item.onsets?.[0] === onset
  const contentItems: readonly Week4KnowledgeItem[] = [...WEEK_4_SYLLABLES, ...WEEK_4_WORDS]
  for (const item of contentItems) {
    const pair = PAIRS.find(value => value.sourceLesson === item.sourceLesson)
    if (!pair) continue
    const contextItems = item.type === 'syllable' ? WEEK_4_SYLLABLES : WEEK_4_WORDS
    for (const onset of pair.letters) {
      if (!startsWithOnset(item, onset)) continue
      const eligible = contextItems.filter(candidate => !startsWithOnset(candidate, onset) && candidate.text !== item.text)
      const context = item.type === 'syllable' ? 'tiếng' : 'từ'
      add({ goalKey: pair.find, sourceLesson: item.sourceLesson, variant: `find-${onset}-${item.type}-${item.text}`,
        prompt: item.type === 'syllable' ? VIETNAMESE_QUESTION_TEMPLATES.findSyllableStart(onset) : VIETNAMESE_QUESTION_TEMPLATES.findWordStart(onset), answer: item.text,
        displayText: onset, distractors: eligible.map(value => value.text), stage: 'find',
        questionType: 'FIND_WORD_START',
        optionKind: item.type === 'syllable' ? 'syllable' : 'word', skill: 'reading', inputMode: 'text',
        targetType: 'letters', targetText: onset,
        voicePlan: voicePlan(
          instructionSegment(item.type === 'syllable' ? 'FIND_SYLLABLE' : 'FIND_WORD', item.type === 'syllable' ? 'Bé hãy tìm tiếng' : 'Bé hãy tìm từ'),
          commonSegment('beginsWith', 'bắt đầu bằng'), targetSegment('letters', onset),
        ),
        data: { knowledgeType: item.type, targetText: item.text, onset, onsetFamily: onset === 'ng' || onset === 'ngh' ? 'ng' : undefined,
          onsets: itemOnsets(item), targetSourceLesson: item.sourceLesson, questionSemantics: 'exact-onset', context, week: 4 },
      })
    }
  }

  const buildGoal = (onset: string): VietnameseWeek4Goal => `BUILD_${onset.toUpperCase()}_SYLLABLES` as VietnameseWeek4Goal
  for (const item of WEEK_4_SYLLABLES) {
    const onset = item.onset!
    const pair = PAIRS.find(value => value.sourceLesson === item.sourceLesson && value.letters.some(letter => letter === onset))
    const choicePair = pair ? onsetPairForSyllable(item, pair) : undefined
    const contexts = [...WEEK_4_WORDS.map(value => value.text), ...WEEK_4_SENTENCES.map(value => value.text)]
    const fullContext = choicePair ? createVietnameseBlankContext(contexts, item.text, onset) : undefined
    const visibleContext = fullContext && pair?.pair === 'ng/ngh' ? fullContext.replace(/_+/g, '_') : fullContext
    if (!choicePair || !visibleContext) continue
    const fillTemplate = { goalKey: buildGoal(onset), sourceLesson: item.sourceLesson, variant: `build-${onset}-${item.text}`,
      prompt: VIETNAMESE_QUESTION_TEMPLATES.fillPair(choicePair[0], choicePair[1], visibleContext), answer: onset, displayText: visibleContext,
      distractors: choicePair.filter(value => value !== onset), stage: 'find',
      questionType: 'CHOOSE_PAIR', optionKind: 'letter', skill: 'writing', inputMode: 'text',
      voicePlan: onsetFillVoicePlan(visibleContext, onset, WEEK_4_WORDS, WEEK_4_SENTENCES),
      data: { ...createVietnamesePairFillData(choicePair, item.text, visibleContext), knowledgeType: 'syllable', onsetFamily: item.onsetFamily, vowel: item.vowel, tone: item.tone, week: 4 },
    } satisfies Omit<Template, 'data'> & { data: Record<string, unknown> }
    add(fillTemplate)
    if (pair?.pair === 'ng/ngh' && hasNghRuleVowel(item)) add({
      ...fillTemplate, goalKey: 'DISTINGUISH_NG_NGH', variant: `distinguish-ng-ngh-${item.text}`, stage: 'distinguish',
    })
  }

  const connectPairs: readonly VietnameseConnectPair[] = [
    { id: 'g', left: { kind: 'text', value: 'g' }, right: 'gà', learningKey: 'BUILD_G_SYLLABLES', sourceLesson: 17 },
    { id: 'gi', left: { kind: 'text', value: 'gi' }, right: 'giỏ', learningKey: 'BUILD_GI_SYLLABLES', sourceLesson: 17 },
    { id: 'gh', left: { kind: 'text', value: 'gh' }, right: 'ghế', learningKey: 'BUILD_GH_SYLLABLES', sourceLesson: 18 },
    { id: 'nh', left: { kind: 'text', value: 'nh' }, right: 'nhà', learningKey: 'BUILD_NH_SYLLABLES', sourceLesson: 18 },
    { id: 'm', left: { kind: 'text', value: 'm' }, right: 'mẹ', learningKey: 'BUILD_M_SYLLABLES', sourceLesson: 16 },
    { id: 'n', left: { kind: 'text', value: 'n' }, right: 'nơ', learningKey: 'BUILD_N_SYLLABLES', sourceLesson: 16 },
  ]
  templates.push({ goalKey: 'REVIEW_LETTERS_WEEK_4', sourceLesson: 20, variant: 'connect-onset-to-syllable',
    prompt: VIETNAMESE_QUESTION_TEMPLATES.connectOnsetSyllable, answer: connectPairs[0].right,
    displayText: '', distractors: [], stage: 'mixed', questionType: 'CONNECT_TEXT_TEXT', optionKind: 'word',
    skill: 'reading', inputMode: 'text', data: { week: 4, answerCount: 'multiple' }, connectPairs,
    voicePlan: voicePlan(instructionSegment('CONNECT_ONSET_SYLLABLE', 'Tìm tiếng bắt đầu bằng chữ đó rồi nối lại')),
  })

  const week4ImageSheet = '/games/lessons/lop-1/tieng-viet/tuan-4/images/week4-sheet.png'
  const imageWordPairs: readonly VietnameseConnectPair[] = [
    { id: 'image-ga', left: { kind: 'image', src: week4ImageSheet, label: 'Hình con gà trống', crop: { row: 1, column: 0, rows: 4, columns: 4 } }, right: 'gà', learningKey: 'BUILD_G_SYLLABLES', sourceLesson: 17 },
    { id: 'image-ghe', left: { kind: 'image', src: week4ImageSheet, label: 'Hình chiếc ghế đẩu', crop: { row: 1, column: 1, rows: 4, columns: 4 } }, right: 'ghế', learningKey: 'BUILD_GH_SYLLABLES', sourceLesson: 18 },
    { id: 'image-nha', left: { kind: 'image', src: week4ImageSheet, label: 'Hình ngôi nhà', crop: { row: 2, column: 2, rows: 4, columns: 4 } }, right: 'nhà', learningKey: 'BUILD_NH_SYLLABLES', sourceLesson: 18 },
    { id: 'image-nho', left: { kind: 'image', src: week4ImageSheet, label: 'Hình chùm nho', crop: { row: 2, column: 3, rows: 4, columns: 4 } }, right: 'nho', learningKey: 'BUILD_NH_SYLLABLES', sourceLesson: 18 },
    { id: 'image-ngo', left: { kind: 'image', src: week4ImageSheet, label: 'Hình ngõ nhỏ', crop: { row: 3, column: 0, rows: 4, columns: 4 } }, right: 'ngõ', learningKey: 'BUILD_NG_SYLLABLES', sourceLesson: 19 },
    { id: 'image-nghe', left: { kind: 'image', src: week4ImageSheet, label: 'Hình con nghé', crop: { row: 3, column: 2, rows: 4, columns: 4 } }, right: 'nghé', learningKey: 'BUILD_NGH_SYLLABLES', sourceLesson: 19 },
  ]
  templates.push({ goalKey: 'REVIEW_READ_WORDS_WEEK_4', sourceLesson: 20, variant: 'connect-image-to-word',
    prompt: VIETNAMESE_QUESTION_TEMPLATES.connectImageWord, answer: imageWordPairs[0].right,
    displayText: '', distractors: [], stage: 'mixed', questionType: 'CONNECT_IMAGE_WORD', optionKind: 'word',
    skill: 'reading', inputMode: 'text', data: { week: 4, answerCount: 'multiple' }, connectPairs: imageWordPairs,
    voicePlan: voicePlan(instructionSegment('CONNECT_IMAGE_WORD', 'Bé hãy nối mỗi hình với từ phù hợp')),
  })

  const syllableGoalForLesson = (sourceLesson: Week4SourceLesson): VietnameseWeek4Goal => ({
    16: 'READ_M_N_SYLLABLES', 17: 'READ_G_GI_SYLLABLES', 18: 'READ_GH_NH_SYLLABLES', 19: 'READ_NG_NGH_SYLLABLES', 20: 'REVIEW_READ_SYLLABLES_WEEK_4',
  })[sourceLesson] as VietnameseWeek4Goal
  for (const item of WEEK_4_SYLLABLES) {
    const distractors = SYLLABLE_OPTIONS.filter(value => value !== item.text)
    add({ goalKey: syllableGoalForLesson(item.sourceLesson), sourceLesson: item.sourceLesson, variant: `read-syllable-${item.text}`,
      prompt: 'Chọn tiếng theo âm thanh.', answer: item.text, displayText: '🔊', distractors,
      stage: 'read', questionType: 'SYLLABLE_RECOGNITION', optionKind: 'syllable', skill: 'listening', inputMode: 'audio',
      targetType: 'syllables', targetText: item.text,
      voicePlan: voicePlan(listenInstructionSegment('Bé hãy nghe và chọn'), targetSegment('syllables', item.text)),
      data: { knowledgeType: 'syllable', targetText: item.text, onset: item.onset, onsetFamily: item.onsetFamily, vowel: item.vowel, tone: item.tone, week: 4 },
    })
  }

  const wordGoalForLesson = (sourceLesson: Week4SourceLesson): VietnameseWeek4Goal => ({
    16: 'READ_M_N_WORDS', 17: 'READ_G_GI_WORDS', 18: 'READ_GH_NH_WORDS', 19: 'READ_NG_NGH_WORDS', 20: 'REVIEW_READ_WORDS_WEEK_4',
  })[sourceLesson] as VietnameseWeek4Goal
  for (const item of WEEK_4_WORDS) {
    add({ goalKey: wordGoalForLesson(item.sourceLesson), sourceLesson: item.sourceLesson, variant: `read-word-${item.text}`,
      prompt: 'Nghe và chọn từ/cụm từ đúng.', answer: item.text, displayText: '🔊',
      distractors: WORD_OPTIONS.filter(value => value !== item.text), stage: 'read', questionType: 'WORD_RECOGNITION',
      optionKind: 'word', skill: 'reading', inputMode: 'audio', targetType: 'words', targetText: item.text,
      voicePlan: voicePlan(listenInstructionSegment('Bé hãy nghe và chọn'), targetSegment('words', item.text)),
      data: { knowledgeType: 'word', targetText: item.text, onset: item.onset, onsetFamily: item.onsetFamily, onsets: item.onsets, week: 4 },
    })
  }

  const sentenceGoals: Readonly<Record<number, VietnameseWeek4Goal>> = {
    16: 'READ_M_N_SENTENCE', 17: 'READ_G_GI_SENTENCE', 18: 'READ_GH_NH_SENTENCE', 19: 'READ_NG_NGH_SENTENCE', 20: 'REVIEW_SENTENCE_WEEK_4',
  }
  const sentenceTargets: Readonly<Record<string, string>> = {
    'Mẹ mua nơ cho Hà.': 'mẹ', 'Bố mẹ cho Hà đi ca nô.': 'ca nô',
    'Hà có giỏ trứng gà.': 'giỏ', 'Bà che gió cho ba chú gà.': 'gà',
    'Hà ghé nhà bà.': 'ghé', 'Nhà bà ở ngõ nhỏ.': 'ngõ nhỏ', 'Mẹ nhờ Hà bê ghế nhỏ.': 'ghế',
    'Nghé theo mẹ ra ngõ.': 'nghé', 'Nghé đã no cỏ.': 'nghé', 'Nghé ngủ ở bờ đê.': 'ngủ',
    'Mẹ ghé nhà bà.': 'ghé',
  }
  for (const item of WEEK_4_SENTENCES) {
    const target = sentenceTargets[item.text]
    const answerItem = WEEK_4_WORDS.find(value => value.text === target) ?? WEEK_4_SYLLABLES.find(value => value.text === target)
    if (!answerItem) throw new Error(`Week 4 sentence target is missing from the knowledge pool: ${item.text} → ${target}`)
    const optionKind: OptionKind = answerItem.type === 'word' ? 'word' : 'syllable'
    const domain = optionKind === 'word' ? WORD_OPTIONS : SYLLABLE_OPTIONS
    const sentenceSource = item.sourceLesson
    const questionGoal = sentenceGoals[sentenceSource]
    const optionType: VietnameseVoiceTargetType = optionKind === 'word' ? 'words' : 'syllables'
    add({ goalKey: questionGoal, sourceLesson: sentenceSource, variant: `read-sentence-${item.text}-${target}`,
      prompt: `Tìm ${optionKind === 'word' ? 'cụm từ' : 'tiếng'} “${target}” trong câu: “${item.text}”`,
      answer: target, displayText: item.text, distractors: domain.filter(value => value !== target), stage: sentenceSource === 20 ? 'mixed' : 'read',
      questionType: 'READ_AND_CHOOSE', optionKind, skill: 'reading', inputMode: 'text',
      targetType: 'sentences', targetText: item.text,
      voicePlan: voicePlan(instructionSegment('FIND_WORD', 'Bé hãy tìm từ'), targetSegment(optionType, target),
        commonSegment('inSentence', 'trong câu'), targetSegment('sentences', item.text)),
      data: { knowledgeType: 'sentence', targetText: item.text, answerText: target, targetType: optionType,
        onset: answerItem.onset, onsetFamily: answerItem.onsetFamily, targetSourceLesson: answerItem.sourceLesson,
        sentenceSourceLesson: item.sourceLesson, week: 4 },
      sentenceWordCount: item.text.replace(/[.!?]/g, '').trim().split(/\s+/).length,
    })
  }

  const addReviewLetter = (item: typeof WEEK_4_LETTER_GROUPS[number]) => {
    const isGroup = item.lower.length > 1
    add({ goalKey: 'REVIEW_LETTERS_WEEK_4', sourceLesson: 20, variant: `review-letter-${item.lower}`,
      prompt: `Ôn tập: chọn ${isGroup ? 'phụ âm đầu' : 'chữ'} ${item.lower}`, answer: item.lower,
      displayText: item.lower, distractors: WEEK_4_LEARNED_LETTERS.filter(value => value !== item.lower), stage: 'mixed',
      questionType: isGroup ? 'LETTER_GROUP_RECOGNITION' : 'LETTER_RECOGNITION', optionKind: 'letter', skill: 'reading', inputMode: 'text',
      targetType: 'letters', targetText: item.lower,
      voicePlan: voicePlan(instructionSegment('CHOOSE_LETTER', 'Bé hãy chọn chữ'), targetSegment('letters', item.lower)),
      data: { knowledgeType: isGroup ? 'letterGroup' : 'letter', onset: item.lower, week: 4 },
    })
    add({ goalKey: 'REVIEW_CASE_WEEK_4', sourceLesson: 20, variant: `review-case-${item.lower}`,
      prompt: VIETNAMESE_QUESTION_TEMPLATES.matchLowercase(item.upper), answer: item.lower, displayText: item.upper,
      distractors: WEEK_4_LEARNED_LETTERS.filter(value => value !== item.lower), stage: 'mixed',
      questionType: 'LETTER_CASE_MATCH', optionKind: 'letter', skill: 'reading', inputMode: 'text',
      targetType: 'letters', targetText: item.upper,
      voicePlan: voicePlan(instructionSegment('CHOOSE_LETTER', 'Bé hãy chọn chữ'), commonSegment('lowerCaseOf', 'thường của'), targetSegment('letters', item.upper)),
      data: { knowledgeType: isGroup ? 'letterGroup' : 'letter', onset: item.lower, case: 'lower', week: 4 },
    })
  }
  WEEK_4_LETTER_GROUPS.forEach(addReviewLetter)
  for (const pair of PAIRS) for (const target of pair.letters) {
    if (pair.pair === 'ng/ngh') continue
    const opposite = pair.letters.find(value => value !== target)!
    add({
      goalKey: reviewPairKey(pair), sourceLesson: 20, variant: `review-pair-${pair.pair}-${target}`,
      prompt: VIETNAMESE_QUESTION_TEMPLATES.recognizeLetter(target), answer: target, displayText: '?',
      distractors: [opposite, ...WEEK_4_LEARNED_LETTERS.filter(value => value !== target && value !== opposite)],
      stage: 'mixed', questionType: 'DISTINGUISH_LETTER_GROUPS', optionKind: 'letter', skill: 'reading', inputMode: 'text',
      targetType: 'letters', targetText: target,
      voicePlan: voicePlan(instructionSegment('CHOOSE_LETTER', 'Bé hãy chọn chữ'), targetSegment('letters', target)),
      data: { pair: pair.pair, onset: target, onsetFamily: target.startsWith('ng') ? 'ng' : undefined, week: 4 },
    })
  }

  const onsetPairReviewContexts = [...WEEK_4_WORDS.map(value => value.text), ...WEEK_4_SENTENCES.map(value => value.text)]
  for (const item of WEEK_4_SYLLABLES.filter(hasNghRuleVowel)) {
    const choicePair = ['ng', 'ngh'] as const
    const fullContext = createVietnameseBlankContext(onsetPairReviewContexts, item.text, 'ngh')
    const visibleContext = fullContext?.replace(/_+/g, '_')
    if (!visibleContext) continue
    add({ goalKey: 'REVIEW_NG_NGH_WEEK_4', sourceLesson: 20, variant: `review-ng-ngh-${item.text}`,
      prompt: VIETNAMESE_QUESTION_TEMPLATES.fillPair(choicePair[0], choicePair[1], visibleContext), answer: 'ngh', displayText: visibleContext,
      distractors: ['ng'], stage: 'mixed', questionType: 'CHOOSE_PAIR', optionKind: 'letter', skill: 'reading', inputMode: 'text',
      voicePlan: onsetFillVoicePlan(visibleContext, 'ngh', WEEK_4_WORDS, WEEK_4_SENTENCES),
      data: { ...createVietnamesePairFillData(choicePair, item.text, visibleContext), knowledgeType: 'syllable', onsetFamily: 'ng', vowel: item.vowel, tone: item.tone, targetSourceLesson: item.sourceLesson, week: 4 },
    })
  }

  for (const item of WEEK_4_SYLLABLES) {
    const onset = item.onset!
    const pair = PAIRS.find(candidate => candidate.sourceLesson === item.sourceLesson && candidate.letters.some(letter => letter === onset))
    const choicePair = pair ? onsetPairForSyllable(item, pair) : undefined
    const contexts = [...WEEK_4_WORDS.map(value => value.text), ...WEEK_4_SENTENCES.map(value => value.text)]
    const fullContext = choicePair ? createVietnameseBlankContext(contexts, item.text, onset) : undefined
    const visibleContext = fullContext && pair?.pair === 'ng/ngh' ? fullContext.replace(/_+/g, '_') : fullContext
    if (!choicePair || !visibleContext) continue
    add({ goalKey: 'REVIEW_BUILD_SYLLABLES_WEEK_4', sourceLesson: 20, variant: `review-build-${item.text}`,
      prompt: VIETNAMESE_QUESTION_TEMPLATES.fillPair(choicePair[0], choicePair[1], visibleContext), answer: onset, displayText: visibleContext,
      distractors: choicePair.filter(value => value !== onset), stage: 'mixed', questionType: 'CHOOSE_PAIR', optionKind: 'letter', skill: 'writing', inputMode: 'text',
      voicePlan: onsetFillVoicePlan(visibleContext, onset, WEEK_4_WORDS, WEEK_4_SENTENCES),
      data: { ...createVietnamesePairFillData(choicePair, item.text, visibleContext), knowledgeType: 'syllable', onsetFamily: item.onsetFamily,
        vowel: item.vowel, tone: item.tone, targetSourceLesson: item.sourceLesson, week: 4 },
    })
    add({ goalKey: 'REVIEW_READ_SYLLABLES_WEEK_4', sourceLesson: 20, variant: `review-read-syllable-${item.text}`,
      prompt: 'Ôn tập: chọn tiếng theo âm thanh.', answer: item.text, displayText: '🔊',
      distractors: SYLLABLE_OPTIONS.filter(value => value !== item.text), stage: 'mixed',
      questionType: 'SYLLABLE_RECOGNITION', optionKind: 'syllable', skill: 'listening', inputMode: 'audio',
      targetType: 'syllables', targetText: item.text,
      voicePlan: voicePlan(listenInstructionSegment('Bé hãy nghe và chọn'), targetSegment('syllables', item.text)),
      data: { knowledgeType: 'syllable', targetText: item.text, onset, onsetFamily: item.onsetFamily, vowel: item.vowel, tone: item.tone, week: 4 },
    })
  }
  for (const item of WEEK_4_WORDS) add({
    goalKey: 'REVIEW_READ_WORDS_WEEK_4', sourceLesson: 20, variant: `review-read-word-${item.text}`,
    prompt: 'Ôn tập: nghe và chọn từ/cụm từ đúng.', answer: item.text, displayText: '🔊',
    distractors: WORD_OPTIONS.filter(value => value !== item.text), stage: 'mixed',
    questionType: 'WORD_RECOGNITION', optionKind: 'word', skill: 'reading', inputMode: 'audio',
    targetType: 'words', targetText: item.text,
    voicePlan: voicePlan(listenInstructionSegment('Bé hãy nghe và chọn'), targetSegment('words', item.text)),
    data: { knowledgeType: 'word', targetText: item.text, onset: item.onset, onsetFamily: item.onsetFamily, onsets: item.onsets, week: 4 },
  })
  const reviewSentenceTargets = ['Nhà bà ở ngõ nhỏ.'] as const
  for (const text of reviewSentenceTargets) {
    const item = WEEK_4_SENTENCES.find(value => value.text === text)!
    const target = 'ngõ nhỏ'
    const answerItem = WEEK_4_WORDS.find(value => value.text === target) ?? WEEK_4_SYLLABLES.find(value => value.text === target)!
    const type = answerItem.type === 'word' ? 'words' : 'syllables'
    const options = type === 'words' ? WORD_OPTIONS : SYLLABLE_OPTIONS
    add({ goalKey: 'REVIEW_SENTENCE_WEEK_4', sourceLesson: 20, variant: `review-sentence-${text}-${target}`,
      prompt: `Ôn tập: tìm ${type === 'words' ? 'cụm từ' : 'tiếng'} “${target}” trong câu: “${text}”`, answer: target,
      displayText: item.text, distractors: options.filter(value => value !== target), stage: 'mixed',
      questionType: 'READ_AND_CHOOSE', optionKind: type === 'words' ? 'word' : 'syllable', skill: 'reading', inputMode: 'text',
      targetType: 'sentences', targetText: text,
      voicePlan: voicePlan(instructionSegment('FIND_WORD', 'Bé hãy tìm từ'), targetSegment(type, target), commonSegment('inSentence', 'trong câu'), targetSegment('sentences', text)),
      data: { knowledgeType: 'sentence', targetText: text, answerText: target, onset: answerItem.onset,
        onsetFamily: answerItem.onsetFamily, targetSourceLesson: answerItem.sourceLesson, sentenceSourceLesson: item.sourceLesson, week: 4 },
      sentenceWordCount: text.replace(/[.!?]/g, '').trim().split(/\s+/).length,
    })
  }

  return templates
}

const IMAGE_CONFUSION_ONSETS: Readonly<Record<string, readonly string[]>> = {
  M_N: ['m', 'n', 'h'], C_K: ['c', 'k'], G_GI_GH: ['g', 'gi', 'gh'], GH_NH: ['gh', 'nh', 'ng', 'ngh'],
  NG_NGH: ['nh'],
}
const imageBuildGoal = (onset: string): VietnameseWeek4Goal => `BUILD_${onset.toUpperCase()}_SYLLABLES` as VietnameseWeek4Goal

function allowsNgNghContrast(template: Template): boolean {
  if (template.questionType === 'IMAGE_CHOOSE_ONSET') return false
  const onset = String(template.data.onset ?? template.answer)
  const vowel = String(template.data.vowel ?? WEEK_4_SYLLABLES.find(item =>
    item.text === template.data.targetText || item.text === template.data.listeningExample)?.vowel ?? '')
  return onset === 'ngh' && NGH_CONTEXT_VOWELS.has(vowel)
}

const SAME_NAME_ONSET_PAIRS = [
  { pair: ['g', 'gh'], label: 'g/gh' },
  { pair: ['ng', 'ngh'], label: 'ng/ngh' },
] as const

function isExplicitOnsetContrast(template: Template, pair: readonly [string, string]): boolean {
  const choicePair = (template.data.choicePair as readonly string[] | undefined) ?? []
  const hasBothChoices = pair.every(onset => choicePair.some(value => value.normalize('NFC').toLocaleLowerCase('vi-VN') === onset))
  const hasWordContext = Boolean(template.data.targetText && template.data.spokenContext)
  if (hasBothChoices && hasWordContext && ['CHOOSE_PAIR', 'IMAGE_MISSING_ONSET'].includes(template.questionType)) return true

  return false
}

function filterAmbiguousOnsetChoices(template: Template, choices: readonly string[]): string[] {
  let result = [...choices]
  const answer = template.answer.normalize('NFC').toLocaleLowerCase('vi-VN')

  for (const { pair, label } of SAME_NAME_ONSET_PAIRS) {
    if (isExplicitOnsetContrast(template, pair)
      || (label === 'ng/ngh' && allowsNgNghContrast(template))) continue

    const [first, second] = pair
    const hasFirst = answer === first || result.some(value => value.normalize('NFC').toLocaleLowerCase('vi-VN') === first)
    const hasSecond = answer === second || result.some(value => value.normalize('NFC').toLocaleLowerCase('vi-VN') === second)
    if (!hasFirst || !hasSecond) continue

    let keep: string | undefined = answer === first ? first : answer === second ? second : undefined
    const declaredPair = typeof template.data.pair === 'string' ? template.data.pair.split('/') : []
    if (!keep) keep = declaredPair.find(value => pair.some(onset => onset === value))
    const primaryChoicePair = (template.data.choicePair as readonly string[] | undefined) ?? []
    const choiceMember = pair.find(onset => primaryChoicePair.some(value => value.normalize('NFC').toLocaleLowerCase('vi-VN') === onset))
      ?? pair.find(onset => result.some(value => value.normalize('NFC').toLocaleLowerCase('vi-VN') === onset))
    if (!keep) keep = choiceMember ?? first
    const remove = keep === first ? second : first
    result = result.filter(value => value.normalize('NFC').toLocaleLowerCase('vi-VN') !== remove)
  }

  return result
}

function createImageTemplates(): Template[] {
  const result: Template[] = []
  for (const item of WEEK_4_IMAGE_KNOWLEDGE) {
    if (!getSpriteById(item.imageId)) throw new Error(`Week 4 image knowledge has no sprite: ${item.imageId}`)
    result.push({
      goalKey: item.learningKey, sourceLesson: item.sourceLesson, variant: `image-choose-onset-${item.imageId}`,
      prompt: 'Tiếng trong tranh bắt đầu bằng chữ nào?', answer: item.onset, displayText: '',
      distractors: WEEK_4_LEARNED_LETTERS.filter(value => value !== item.onset), stage: 'find',
      questionType: 'IMAGE_CHOOSE_ONSET', optionKind: 'letter', skill: 'reading', inputMode: 'image',
      targetType: 'letters', targetText: item.onset, imageId: item.imageId,
      data: { knowledgeType: item.type, targetText: item.text, onset: item.onset, confusionGroup: item.confusionGroup, imageId: item.imageId, week: 4 },
    })

    const pair = PAIRS.find(candidate => candidate.letters.some(letter => letter === item.onset))
    if (!pair) continue
    const choicePair = onsetPairForSyllable({ text: item.text, type: item.type, sourceLesson: item.sourceLesson, week: 4, onset: item.onset,
      vowel: WEEK_4_SYLLABLES.find(syllableItem => syllableItem.text === item.text)?.vowel }, pair)
    const fullBlankContext = createVietnameseBlankContext([item.text], item.text, item.onset)
    if (!fullBlankContext) continue
    // The onset cluster (including gi/gh/ngh) is one choice, so show one blank token.
    const visibleContext = fullBlankContext.replace(/_+/g, '_')
    const pairData = createVietnamesePairFillData(choicePair, item.text, visibleContext)
    result.push({
      goalKey: imageBuildGoal(item.onset), sourceLesson: item.sourceLesson, variant: `image-missing-onset-${item.imageId}`,
      prompt: 'Chọn phụ âm đầu còn thiếu.', answer: item.onset, displayText: visibleContext,
      distractors: choicePair.filter(value => value !== item.onset), stage: 'find', questionType: 'IMAGE_MISSING_ONSET',
      optionKind: 'letter', skill: 'writing', inputMode: 'image', imageId: item.imageId,
      voicePlan: voicePlan(
        instructionSegment('FILL_ONSET', 'Bé hãy chọn phụ âm đầu còn thiếu'),
        commonSegment(item.type === 'word' ? 'inPhrase' : 'inSyllable', item.type === 'word' ? 'trong cụm từ' : 'trong tiếng'),
        targetSegment(item.type === 'word' ? 'words' : 'syllables', item.text),
      ),
      data: { ...pairData, imageId: item.imageId, confusionGroup: item.confusionGroup, knowledgeType: item.type,
        vowel: WEEK_4_SYLLABLES.find(syllableItem => syllableItem.text === item.text)?.vowel, week: 4 },
    })
  }

  const imagePair = (imageId: Week4ImageId, right: string, learningKey: VietnameseWeek4Goal, sourceLesson: Week4SourceLesson): VietnameseConnectPair => {
    const sprite = getSpriteById(imageId)
    if (!sprite) throw new Error(`Week 4 matching question has no sprite: ${imageId}`)
    const knowledge = WEEK_4_IMAGE_KNOWLEDGE.find(item => item.imageId === imageId)
    return {
      id: `${imageId}-${right}`, left: { kind: 'image', imageId, src: WEEK_4_SPRITE_SHEET, label: `Hình ${knowledge?.text ?? imageId.replaceAll('_', ' ')}`,
        crop: { row: sprite.row, column: sprite.col, rows: 4, columns: 4 } },
      right, learningKey, sourceLesson,
    }
  }
  const onsetPairs = [
    imagePair('ga', 'g', 'BUILD_G_SYLLABLES', 17), imagePair('gio', 'gi', 'BUILD_GI_SYLLABLES', 17),
    imagePair('ghe', 'gh', 'BUILD_GH_SYLLABLES', 18), imagePair('nha', 'nh', 'BUILD_NH_SYLLABLES', 18),
    imagePair('me', 'm', 'BUILD_M_SYLLABLES', 16), imagePair('no', 'n', 'BUILD_N_SYLLABLES', 16),
  ] as const
  result.push({
    goalKey: 'REVIEW_BUILD_SYLLABLES_WEEK_4', sourceLesson: 20, variant: 'image-onset-match-confusions',
    prompt: 'Nối mỗi hình với phụ âm đầu.', answer: 'g', displayText: '', distractors: [], stage: 'mixed',
    questionType: 'IMAGE_ONSET_MATCH', optionKind: 'letter', skill: 'reading', inputMode: 'image', connectPairs: onsetPairs,
    data: { week: 4, answerCount: 'multiple', confusionGroups: ['G_GI_GH', 'GH_NH'] },
  })

  const wordPairs = [
    imagePair('me', 'mẹ', 'READ_M_N_WORDS', 16), imagePair('ca_me', 'cá mè', 'READ_M_N_WORDS', 16),
    imagePair('ghe', 'ghế', 'READ_GH_NH_WORDS', 18), imagePair('nha', 'nhà', 'READ_GH_NH_WORDS', 18),
    imagePair('ngo', 'ngõ', 'READ_NG_NGH_WORDS', 19), imagePair('cu_nghe', 'củ nghệ', 'READ_NG_NGH_WORDS', 19),
  ] as const
  result.push({
    goalKey: 'REVIEW_READ_WORDS_WEEK_4', sourceLesson: 20, variant: 'image-word-match-week-4',
    prompt: 'Nối mỗi hình với từ phù hợp.', answer: 'mẹ', displayText: '', distractors: [], stage: 'mixed',
    questionType: 'IMAGE_WORD_MATCH', optionKind: 'word', skill: 'reading', inputMode: 'image', connectPairs: wordPairs,
    data: { week: 4, answerCount: 'multiple' },
  })
  return result
}

const existingQuestionTemplates = createTemplates()
const addedImageQuestionTemplates = createImageTemplates()
const templates = [...existingQuestionTemplates, ...addedImageQuestionTemplates]
const allGoals = Object.keys(TIENG_VIET_1_WEEK_4_LEARNING_KEYS) as VietnameseWeek4Goal[]
const templateGoalSet = new Set(templates.map(template => template.goalKey))
const unsupportedGoals = allGoals.filter(goal => !templateGoalSet.has(goal))
if (unsupportedGoals.length) throw new Error(`Week 4 has learning keys without question templates: ${unsupportedGoals.join(', ')}`)

const ROUND_BANDS: readonly Week4QuestionStage[] = [
  'recognize', 'recognize', 'recognize', 'recognize', 'recognize',
  'find', 'find', 'find', 'find', 'find',
  'distinguish', 'distinguish', 'distinguish', 'distinguish', 'distinguish', 'distinguish', 'distinguish',
  'read', 'read', 'read', 'read', 'read',
  'mixed', 'mixed', 'mixed',
]
const PRIORITIZED_PAIR_SLOTS = new Map<number, string[]>([
  [10, ['DISTINGUISH_M_N', 'REVIEW_M_N_WEEK_4']],
  [12, ['DISTINGUISH_G_GI', 'REVIEW_G_GI_WEEK_4']],
  [14, ['DISTINGUISH_GH_NH', 'REVIEW_GH_NH_WEEK_4']],
  [16, ['DISTINGUISH_NG_NGH', 'REVIEW_NG_NGH_WEEK_4']],
])

const isImageConnectType = (questionType: string) => questionType === 'IMAGE_ONSET_MATCH' || questionType === 'IMAGE_WORD_MATCH'
const isConnectTemplate = (template: Template) => template.questionType.startsWith('CONNECT_') || isImageConnectType(template.questionType)
const isPairFillTemplate = (template: Template) => template.questionType === 'CHOOSE_PAIR' || template.questionType === 'IMAGE_MISSING_ONSET'

function templatesForGame(game: VietnameseWeek4Game): Template[] {
  return templates.flatMap(template => {
    if (isConnectTemplate(template) && game !== 'drag-drop') return []
    if (template.questionType === 'IMAGE_MISSING_ONSET' && game !== 'drag-drop') return []
    if (template.voiceRequired && !VOICE_ASSETS_READY) return []
    if (game === 'racing' && template.questionType === 'READ_AND_CHOOSE' && template.data.knowledgeType === 'sentence') return []
    if (game === 'gold-mining' && template.questionType === 'READ_AND_CHOOSE' && template.data.knowledgeType === 'sentence') return []
    if (game === 'bubble-shooter' && template.questionType === 'READ_AND_CHOOSE' && Number(template.sentenceWordCount) > 7) return []
    if (game === 'racing') {
      if (template.questionType === 'CHOOSE_PAIR') return [template]
      if (template.answer.trim().split(/\s+/).length > 2 || template.answer.length > 8) return []
      const shortDistractors = template.distractors.filter(option => option.length <= 8)
      return shortDistractors.length >= 2 ? [{ ...template, distractors: shortDistractors }] : []
    }
    return [template]
  })
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1))
    ;[result[index], result[swap]] = [result[swap], result[index]]
  }
  return result
}

function racingPairDistractor(template: Template): string {
  const pair = template.data.choicePair as string[]
  const target = String(template.data.targetText)
  const onset = String(template.data.onset)
  const rime = target.slice(onset.length)
  const sourceLesson = Number(template.data.targetSourceLesson ?? template.sourceLesson)
  const earlierWeek4Onsets = WEEK_4_LETTER_GROUPS
    .filter(item => item.sourceLesson <= sourceLesson)
    .map(item => item.lower)
  const previousOnsets = ['b', 'c', 'd', 'đ', 'h', 'k', 'l', 'ch', 'kh']
  const earlierOnsets = WEEK_4_SYLLABLES.filter(item => item.sourceLesson < sourceLesson).map(item => item.onset).filter((value): value is string => Boolean(value))
  const knownSyllables = new Set(SYLLABLE_OPTIONS.map(value => value.normalize('NFC')))
  const extra = Array.from(new Set([...previousOnsets, ...earlierOnsets, ...earlierWeek4Onsets]))
    .find(value => !pair.includes(value) && !knownSyllables.has(`${value}${rime}`.normalize('NFC')))
  if (!extra) throw new Error(`No safe learned onset distractor for ${template.goalKey}/${template.variant}`)
  return extra
}

function questionFromTemplate(template: Template, game: VietnameseWeek4Game, wrongAnswers: readonly string[], random: () => number): VietnameseWeek4Question {
  const isConnect = isConnectTemplate(template)
  const isRacingPair = game === 'racing' && template.questionType === 'CHOOSE_PAIR'
  const isPairFill = isPairFillTemplate(template)
  const isDragGroupRecognition = game === 'drag-drop' && (
    template.questionType === 'LETTER_GROUP_RECOGNITION'
    || (template.questionType === 'DISTINGUISH_LETTER_GROUPS' && String(template.targetText ?? template.answer).length > 1)
  )
  const needed = isConnect ? 0 : isPairFill
    ? isRacingPair ? 2 : game === 'drag-drop' ? 5 : game === 'gold-mining' ? 3 : 1
    : game === 'drag-drop' ? 5 : game === 'gold-mining' ? 3 : 2
  if (wrongAnswers.length !== needed) throw new Error(`Invalid option count for ${game}/${template.variant}`)
  const normalizedWrongAnswers = wrongAnswers.map(value => value.normalize('NFC'))
  if (new Set(normalizedWrongAnswers).size !== normalizedWrongAnswers.length || normalizedWrongAnswers.includes(template.answer)) {
    throw new Error(`Week 4 options are ambiguous for ${game}/${template.goalKey}/${template.variant}`)
  }
  const options = isConnect
    ? shuffle((template.connectPairs ?? []).map(pair => pair.right), random)
    : shuffle([template.answer, ...normalizedWrongAnswers], random)
  const voiceSequence = VOICE_ASSETS_READY
    ? isDragGroupRecognition
      ? voicePlan(listenInstructionSegment('Bé hãy nghe và chọn'), targetSegment('letters', String(template.targetText ?? template.answer)))
      : template.voicePlan
    : undefined
  const instructionVoice = voiceSequence?.[0]?.src
  const voice = template.targetType && template.targetText ? resolveVietnameseTargetVoice(template.targetType, template.targetText) : undefined
  const id = `${game}:week-4:${template.goalKey}:${template.variant}:${[...normalizedWrongAnswers].sort().join('|')}`
  const prompt = template.questionType === 'IMAGE_MISSING_ONSET' ? template.prompt
    : isRacingPair || (isPairFill && game !== 'bubble-shooter')
    ? `Chọn phụ âm đầu còn thiếu: ${template.displayText}`
    : isDragGroupRecognition ? 'Nghe và chọn phụ âm đầu.' : template.prompt
  if (!isConnect && options.filter(option => option === template.answer).length !== 1) throw new Error(`Week 4 question must have exactly one correct answer: ${id}`)
  return normalizeVietnameseQuestion({
    id, goalKey: template.goalKey, sourceLesson: template.sourceLesson, skill: template.skill,
    inputMode: template.inputMode, answerMode: 'select-text', questionType: template.questionType,
    prompt, answer: template.answer, options, displayText: isDragGroupRecognition ? '?' : template.displayText,
    imageId: template.imageId,
    variant: template.variant, stage: template.stage, instructionVoice: voiceSequence ? instructionVoice : undefined,
    voice: voiceSequence?.length ? voice : undefined, voiceSequence,
    voiceFallback: template.voiceFallback,
    spokenInstruction: template.spokenInstruction,
    connectPairs: template.connectPairs,
    data: { ...template.data, additionalDistractors: isPairFill
      ? normalizedWrongAnswers.filter(value => !(template.data.choicePair as string[]).includes(value)) : undefined,
      week: 4, sourceLesson: template.sourceLesson, answerCount: isConnect ? 'multiple' : 1 },
  })
}

function wrongAnswersFor(template: Template, game: VietnameseWeek4Game, random: () => number): string[] {
  const isRacingPair = game === 'racing' && template.questionType === 'CHOOSE_PAIR'
  const isConnect = isConnectTemplate(template)
  const isPairFill = isPairFillTemplate(template)
  const needed = isConnect ? 0 : isPairFill
    ? isRacingPair ? 2 : game === 'drag-drop' ? 5 : game === 'gold-mining' ? 3 : 1
    : game === 'drag-drop' ? 5 : game === 'gold-mining' ? 3 : 2
  const distractors = shuffle(filterAmbiguousOnsetChoices(template, template.distractors)
    .filter(value => value !== template.answer), random)
  if (isConnect) return []
  if (isRacingPair) return [...distractors.slice(0, 1), racingPairDistractor(template)]
  if (isPairFill) {
    const pair = template.data.choicePair as string[]
    const contrast = pair.find(value => value !== template.answer)
    const learned = filterAmbiguousOnsetChoices(template, WEEK_4_LEARNED_LETTERS)
      .filter(value => !pair.includes(value) && value !== template.answer)
    const extraDistractors = shuffle(learned, random).slice(0, needed - 1)
    if (!contrast || extraDistractors.length !== needed - 1) throw new Error(`Not enough learned onset distractors for ${template.goalKey}/${template.variant}`)
    return [contrast, ...extraDistractors]
  }
  if (template.questionType === 'IMAGE_CHOOSE_ONSET') {
    const confusionGroup = String(template.data.confusionGroup)
    const preferred = (IMAGE_CONFUSION_ONSETS[confusionGroup] ?? []).filter(value => value !== template.answer && distractors.includes(value))
    const remaining = shuffle(distractors.filter(value => !preferred.includes(value)), random)
    return [...preferred, ...remaining].slice(0, needed)
  }
  if (distractors.length < needed) throw new Error(`Not enough learned distractors for ${game}/${template.goalKey}/${template.variant}`)
  const contrast = template.data.pair !== 'ng/ngh' && typeof template.data.pair === 'string'
    ? template.data.pair.split('/').find(value => value !== template.answer)
    : undefined
  if (template.questionType === 'LISTEN_AND_CHOOSE_LETTER') {
    const listeningPair = typeof template.data.pair === 'string' ? template.data.pair.split('/') : []
    const listeningContrast = listeningPair.find(value => value !== template.answer)
    const preferred = Array.from(new Set([listeningContrast, contrast]
      .filter((value): value is string => Boolean(value && distractors.includes(value)))))
    return [...preferred, ...distractors.filter(value => !preferred.includes(value))].slice(0, needed)
  }
  if (contrast && template.questionType === 'DISTINGUISH_LETTER_GROUPS') {
    return [contrast, ...distractors.filter(value => value !== contrast)].slice(0, needed)
  }
  return distractors.slice(0, needed)
}

/** All Week 4 target recordings and shared instruction recordings are now available. */
export function areWeek4VoicesEnabled() { return VOICE_ASSETS_READY }

export function createQuestionPool(game: VietnameseWeek4Game): VietnameseWeek4Question[] {
  return templatesForGame(game).map((template, index) => questionFromTemplate(
    template, game, wrongAnswersFor(template, game, () => ((index * 17 + 11) % 97) / 97), () => ((index * 17 + 11) % 97) / 97,
  ))
}

export function getAvailableLearningKeys(game: VietnameseWeek4Game): VietnameseWeek4Goal[] {
  return Array.from(new Set(templatesForGame(game).map(template => template.goalKey)))
}

export function getQuestionTemplateCounts(): Record<VietnameseWeek4Goal, number> {
  return Object.fromEntries(allGoals.map(goal => [goal, templates.filter(template => template.goalKey === goal).length])) as Record<VietnameseWeek4Goal, number>
}

type GenerateOptions = { random?: () => number; previousIds?: readonly string[]; preferredLearningKeys?: readonly string[] }

/** Samples 25 unique templates with a paced difficulty ladder, varying selected distractors on every run. */
export function generateQuestionSet(game: VietnameseWeek4Game, options: GenerateOptions = {}): VietnameseWeek4Question[] {
  const random = options.random ?? Math.random
  const gameTemplates = templatesForGame(game)
  const previous = new Set(options.previousIds ?? [])
  const selectedIds = new Set<string>()
  const selectedVariants = new Set<string>()
  const preferred = new Set(options.preferredLearningKeys ?? [])
  const result: VietnameseWeek4Question[] = []

  ROUND_BANDS.forEach((band, index) => {
    let candidates = gameTemplates.filter(template => template.stage === band && !selectedVariants.has(template.variant))
    if (band === 'mixed') {
      const reviews = candidates.filter(template => template.sourceLesson === 20)
      if (reviews.length) candidates = [...reviews, ...candidates.filter(template => template.sourceLesson !== 20)]
    }
    const priorityGoals = PRIORITIZED_PAIR_SLOTS.get(index)
    if (band === 'distinguish' && priorityGoals) {
      const priority = candidates.filter(template => priorityGoals.includes(template.goalKey))
      if (priority.length) candidates = priority
    }
    if (!candidates.length) throw new Error(`Week 4 question pool exhausted for ${game}/${band}`)

    let selected: VietnameseWeek4Question | undefined
    for (let attempt = 0; attempt < Math.min(120, candidates.length * 3); attempt++) {
      const weights = candidates.map(template => (preferred.has(template.goalKey) ? 4 : 1))
      const total = weights.reduce((sum, weight) => sum + weight, 0)
      let needle = random() * total
      let candidateIndex = weights.findIndex(weight => (needle -= weight) < 0)
      if (candidateIndex < 0) candidateIndex = candidates.length - 1
      const template = candidates[candidateIndex]
      const question = questionFromTemplate(template, game, wrongAnswersFor(template, game, random), random)
      if (!previous.has(question.id) && !selectedIds.has(question.id)) { selected = question; break }
      candidates = candidates.filter(item => item.variant !== template.variant)
      if (!candidates.length) break
    }
    if (!selected) {
      const fallback = gameTemplates.filter(template => !selectedVariants.has(template.variant))
      for (const template of fallback) {
        const attempts = 40
        for (let attempt = 0; attempt < attempts; attempt++) {
          const question = questionFromTemplate(template, game, wrongAnswersFor(template, game, random), random)
          if (!previous.has(question.id) && !selectedIds.has(question.id)) { selected = question; break }
        }
        if (selected) break
      }
    }
    if (!selected) throw new Error(`Week 4 could not sample a fresh question for ${game}/round-${index + 1}`)
    selectedVariants.add(selected.variant)
    selectedIds.add(selected.id)
    result.push(selected)
  })

  return result
}

export const WEEK_4_LISTENING_KEYS = [
  'LISTEN_M_N', 'LISTEN_G_GI', 'LISTEN_GH_NH', 'LISTEN_NG_NGH',
] as const satisfies readonly VietnameseWeek4Goal[]

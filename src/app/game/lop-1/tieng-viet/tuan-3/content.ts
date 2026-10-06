import type { LearningQuestion, LearningSkill } from '@/components/games/general/learning-question'
import type { VoiceSegment } from '@/components/games/general/composed-voice'
import {
  getVietnameseInstructionVoice, resolveVietnameseTargetVoice, VIETNAMESE_VOICE_MANIFEST,
  type VietnameseInstructionKey, type VietnameseVoiceTargetType,
} from '@/components/games/vietnamese/voice-manifest'
import { createVietnameseBlankContext, createVietnamesePairFillData, normalizeVietnameseQuestion, VIETNAMESE_QUESTION_TEMPLATES } from '@/components/games/vietnamese/question-model'
import { getWeek3SpriteById, type Week3ImageId } from '@/components/games/vietnamese/week3-sprites'
import { TIENG_VIET_1_WEEK_3_LEARNING_KEYS, type VietnameseWeek3Goal } from './lesson'

export const QUESTION_COUNT = 25
export type VietnameseWeek3Game = 'bubble-shooter' | 'gold-mining' | 'racing' | 'drag-drop'
export type Week3SourceLesson = 11 | 12 | 13 | 14 | 15
export type Week3KnowledgeType = 'letter' | 'letterGroup' | 'syllable' | 'word' | 'sentence'
export type Week3QuestionStage = 'recognize' | 'find' | 'distinguish' | 'read' | 'mixed'

export type Week3KnowledgeItem = {
  text: string
  type: Week3KnowledgeType
  sourceLesson: Week3SourceLesson
  week: 3
  onset?: string
  vowel?: string
  tone?: string | null
}

export type VietnameseWeek3Question = LearningQuestion & {
  goalKey: VietnameseWeek3Goal
  sourceLesson: Week3SourceLesson
  questionType: string
  imageId?: Week3ImageId
  options: string[]
  displayText: string
  variant: string
  stage: Week3QuestionStage
  voiceSequence?: VoiceSegment[]
  voiceFallback?: { instruction?: string; target?: string }
  spokenInstruction?: string
  /** Structured reading/construction metadata is retained for adapters and tracking audits. */
  data: Record<string, unknown>
}

const syllable = (text: string, onset: string, vowel: string, tone: string | null, sourceLesson: Week3SourceLesson): Week3KnowledgeItem => ({
  text: text.normalize('NFC'), type: 'syllable', onset, vowel, tone, sourceLesson, week: 3,
})
const word = (text: string, onset: string, sourceLesson: Week3SourceLesson): Week3KnowledgeItem => ({
  text: text.normalize('NFC'), type: 'word', onset, sourceLesson, week: 3,
})
const sentence = (text: string, sourceLesson: Week3SourceLesson): Week3KnowledgeItem => ({
  text: text.normalize('NFC'), type: 'sentence', sourceLesson, week: 3,
})

export const WEEK_3_LETTER_GROUPS = [
  { lower: 'i', upper: 'I', sourceLesson: 11 as const }, { lower: 'k', upper: 'K', sourceLesson: 11 as const },
  { lower: 'h', upper: 'H', sourceLesson: 12 as const }, { lower: 'l', upper: 'L', sourceLesson: 12 as const },
  { lower: 'u', upper: 'U', sourceLesson: 13 as const }, { lower: 'ư', upper: 'Ư', sourceLesson: 13 as const },
  { lower: 'ch', upper: 'CH', sourceLesson: 14 as const }, { lower: 'kh', upper: 'KH', sourceLesson: 14 as const },
] as const

const OLD_LETTERS = ['a', 'b', 'c', 'e', 'ê', 'o', 'ô', 'ơ', 'd', 'đ'] as const
export const WEEK_3_LETTER_OPTIONS = [...OLD_LETTERS, ...WEEK_3_LETTER_GROUPS.map(item => item.lower)]
export const WEEK_3_LEARNED_LETTERS = WEEK_3_LETTER_OPTIONS
export const WEEK_3_UPPERCASE_OPTIONS = WEEK_3_LETTER_OPTIONS.map(value => value.toLocaleUpperCase('vi-VN'))

export const WEEK_3_SYLLABLES: readonly Week3KnowledgeItem[] = [
  syllable('kì', 'k', 'i', 'huyền', 11), syllable('kẻ', 'k', 'e', 'hỏi', 11), syllable('kẽ', 'k', 'e', 'ngã', 11),
  syllable('kí', 'k', 'i', 'sắc', 11), syllable('bí', 'b', 'i', 'sắc', 11), syllable('đi', 'đ', 'i', null, 11),
  syllable('ho', 'h', 'o', null, 12), syllable('hồ', 'h', 'ô', 'huyền', 12), syllable('hố', 'h', 'ô', 'sắc', 12),
  syllable('le', 'l', 'e', null, 12), syllable('lá', 'l', 'a', 'sắc', 12), syllable('hẹ', 'h', 'e', 'nặng', 12),
  syllable('dù', 'd', 'u', 'huyền', 13), syllable('đu', 'đ', 'u', null, 13), syllable('đủ', 'đ', 'u', 'hỏi', 13),
  syllable('dữ', 'd', 'ư', 'ngã', 13), syllable('lừ', 'l', 'ư', 'huyền', 13),
  syllable('chú', 'ch', 'u', 'sắc', 14), syllable('khỉ', 'kh', 'i', 'hỏi', 14), syllable('chợ', 'ch', 'ơ', 'nặng', 14),
  syllable('khô', 'kh', 'ô', null, 14), syllable('khế', 'kh', 'ê', 'sắc', 14), syllable('chị', 'ch', 'i', 'nặng', 14),
  syllable('kho', 'kh', 'o', null, 14),
]

export const WEEK_3_WORDS: readonly Week3KnowledgeItem[] = [
  word('bí đỏ', 'b', 11), word('kẻ ô', 'k', 11), word('đi đò', 'đ', 11), word('kì đà', 'k', 11),
  word('lá đỏ', 'l', 12), word('bờ hồ', 'b', 12), word('cá hố', 'c', 12), word('le le', 'l', 12), word('lá hẹ', 'l', 12),
  word('đu đủ', 'đ', 13), word('hổ dữ', 'h', 13),
  word('lá khô', 'l', 14), word('chú khỉ', 'ch', 14), word('chợ cá', 'ch', 14), word('cá kho khế', 'c', 14),
  word('chú hề', 'ch', 15), word('chè ô', 'ch', 15), word('cá dữ', 'c', 15),
]

export const WEEK_3_SENTENCES: readonly Week3KnowledgeItem[] = [
  sentence('Nam vẽ kì đà.', 11), sentence('Kì đà bò ở kẽ đá.', 11),
  sentence('Le le bơi trên hồ.', 12), sentence('Bé bị ho.', 12), sentence('Bà đã có lá hẹ.', 12),
  sentence('Đu đủ chín ngọt lừ.', 13), sentence('Cá hố là cá dữ.', 13),
  sentence('Mấy chú khỉ ăn chuối.', 14), sentence('Chị có cá kho khế.', 14),
  sentence('Chị cho bé cá cờ.', 15), sentence('Dì Kha cho Hà đi chợ.', 15),
]

export const WEEK_3_KNOWLEDGE_POOL: readonly Week3KnowledgeItem[] = [
  ...WEEK_3_LETTER_GROUPS.map(({ lower, sourceLesson }) => ({ text: lower, type: lower.length === 1 ? 'letter' as const : 'letterGroup' as const, sourceLesson, week: 3 as const })),
  ...WEEK_3_SYLLABLES, ...WEEK_3_WORDS, ...WEEK_3_SENTENCES,
]

export type Week3ImageKnowledge = {
  imageId: Week3ImageId
  targetText: string
  sourceLesson: Week3SourceLesson
  learningKey: VietnameseWeek3Goal
  targetType: VietnameseVoiceTargetType
  targetVoiceText: string
  feature: { type: 'onset'; value: string } | { type: 'vowel'; value: string }
}

/** Image prompts use only pictured words already taught in the Week 3 pool. */
export const WEEK_3_IMAGE_KNOWLEDGE: readonly Week3ImageKnowledge[] = [
  { imageId: 'ke', targetText: 'kẻ ô', sourceLesson: 11, learningKey: 'RECOGNIZE_K', targetType: 'words', targetVoiceText: 'kẻ ô', feature: { type: 'onset', value: 'k' } },
  { imageId: 'bi', targetText: 'bí', sourceLesson: 11, learningKey: 'RECOGNIZE_I', targetType: 'syllables', targetVoiceText: 'bí', feature: { type: 'vowel', value: 'i' } },
  { imageId: 'la', targetText: 'lá', sourceLesson: 12, learningKey: 'RECOGNIZE_L', targetType: 'syllables', targetVoiceText: 'lá', feature: { type: 'onset', value: 'l' } },
  { imageId: 'ho', targetText: 'hồ', sourceLesson: 12, learningKey: 'RECOGNIZE_H', targetType: 'syllables', targetVoiceText: 'hồ', feature: { type: 'onset', value: 'h' } },
  { imageId: 'ho_tiger', targetText: 'hổ dữ', sourceLesson: 13, learningKey: 'RECOGNIZE_H', targetType: 'words', targetVoiceText: 'hổ dữ', feature: { type: 'onset', value: 'h' } },
  { imageId: 'khe', targetText: 'khế', sourceLesson: 14, learningKey: 'RECOGNIZE_KH', targetType: 'syllables', targetVoiceText: 'khế', feature: { type: 'onset', value: 'kh' } },
  { imageId: 'khi', targetText: 'khỉ', sourceLesson: 14, learningKey: 'RECOGNIZE_KH', targetType: 'syllables', targetVoiceText: 'khỉ', feature: { type: 'onset', value: 'kh' } },
]

const PRIOR_SYLLABLES = [
  'ba', 'bà', 'ba ba', 'ca', 'cà', 'cá', 'bè', 'bé', 'bế', 'bò', 'cò', 'cỏ', 'bố', 'bộ', 'cô', 'cổ',
  'đa', 'đá', 'dê', 'đỏ', 'bờ', 'cờ', 'đỡ', 'dê',
] as const
const SYLLABLE_OPTIONS = Array.from(new Set([...WEEK_3_SYLLABLES.map(item => item.text), ...PRIOR_SYLLABLES]))
const PRIOR_WORDS = ['cô bé', 'cổ cò', 'đá dế', 'đa đa', 'ô đỏ', 'bờ đê', 'cá cờ', 'đỡ bé', 'cờ đỏ', 'đỡ bà', 'ba ba'] as const
const WORD_OPTIONS = Array.from(new Set([...WEEK_3_WORDS.map(item => item.text), ...PRIOR_WORDS]))
const VOWEL_OPTIONS = ['a', 'e', 'ê', 'i', 'o', 'ô', 'ơ', 'u', 'ư'] as const
const VOICE_ASSETS_READY = true

type OptionKind = 'letter' | 'uppercase' | 'syllable' | 'word' | 'vowel'
type Template = {
  goalKey: VietnameseWeek3Goal
  sourceLesson: Week3SourceLesson
  variant: string
  prompt: string
  answer: string
  displayText: string
  distractors: readonly string[]
  stage: Week3QuestionStage
  questionType: string
  imageId?: Week3ImageId
  optionKind: OptionKind
  skill: LearningSkill
  inputMode: 'audio' | 'text' | 'image'
  targetType?: VietnameseVoiceTargetType
  targetText?: string
  voicePlan?: VoiceSegment[]
  voiceFallback?: { instruction?: string; target?: string }
  spokenInstruction?: string
  voiceRequired?: boolean
  data: Record<string, unknown>
  sentenceWordCount?: number
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
const instructionSegment = (key: VietnameseInstructionKey, text: string) => {
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
  const spokenContext = visibleContext.replace(/___/g, onset).normalize('NFC')
  const contextKey = spokenContext.toLocaleLowerCase('vi-VN')
  const sentence = sentences.find(item => item.text.normalize('NFC').toLocaleLowerCase('vi-VN') === contextKey)
  const wordContext = words.find(item => item.text.normalize('NFC').toLocaleLowerCase('vi-VN') === contextKey)
  const contextItem = sentence ?? wordContext
  if (!contextItem) throw new Error(`Week 3 onset-fill context is missing from the knowledge pool: ${spokenContext}`)

  const isSentence = Boolean(sentence)
  const context = contextItem.text.normalize('NFC')
  const isPhrase = /\s/.test(context.trim())
  const contextVoice = targetSegment(isSentence ? 'sentences' : isPhrase ? 'words' : 'syllables', context)
  if (!contextVoice) throw new Error(`Week 3 onset-fill context has no recorded voice: ${context}`)
  return voicePlan(
    instructionSegment('FILL_ONSET', 'Bé hãy chọn phụ âm đầu còn thiếu'),
    commonSegment(isSentence ? 'inSentence' : isPhrase ? 'inPhrase' : 'inSyllable', isSentence ? 'trong câu' : isPhrase ? 'trong cụm từ' : 'trong tiếng'),
    contextVoice,
  )
}

function createTemplates(): Template[] {
  const templates: Template[] = []
  const add = (input: Omit<Template, 'data'> & { data?: Record<string, unknown> }) => {
    const distractors = Array.from(new Set(input.distractors.map(value => value.normalize('NFC')))).filter(value => value !== input.answer.normalize('NFC'))
    const minimumDistractors = input.questionType === 'CHOOSE_PAIR' ? 1 : 5
    if (distractors.length < minimumDistractors) throw new Error(`Week 3 template needs ${minimumDistractors} valid distractors: ${input.goalKey}/${input.variant}`)
    templates.push({ ...input, answer: input.answer.normalize('NFC'), displayText: input.displayText.normalize('NFC'), distractors, data: input.data ?? {} })
  }

  for (const item of WEEK_3_LETTER_GROUPS) {
    const isGroup = item.lower.length > 1
    const recognitionGoal = ({ i: 'RECOGNIZE_I', k: 'RECOGNIZE_K', h: 'RECOGNIZE_H', l: 'RECOGNIZE_L', u: 'RECOGNIZE_U', 'ư': 'RECOGNIZE_U_HORN', ch: 'RECOGNIZE_CH', kh: 'RECOGNIZE_KH' } as const)[item.lower]
    const caseGoal = ({ i: 'RECOGNIZE_I_CASE', k: 'RECOGNIZE_K_CASE', h: 'RECOGNIZE_H_CASE', l: 'RECOGNIZE_L_CASE', u: 'RECOGNIZE_U_CASE', 'ư': 'RECOGNIZE_U_HORN_CASE', ch: 'RECOGNIZE_CH_CASE', kh: 'RECOGNIZE_KH_CASE' } as const)[item.lower]
    add({ goalKey: recognitionGoal, sourceLesson: item.sourceLesson, variant: `recognize-${item.lower}`, prompt: `Chọn ${isGroup ? 'phụ âm đầu' : 'chữ'} ${item.lower}`,
      answer: item.lower, displayText: item.lower, distractors: WEEK_3_LEARNED_LETTERS, stage: 'recognize',
      questionType: isGroup ? 'LETTER_GROUP_RECOGNITION' : 'LETTER_RECOGNITION', optionKind: 'letter', skill: 'reading', inputMode: 'text',
      targetType: 'letters', targetText: item.lower,
      voicePlan: voicePlan(instructionSegment('CHOOSE_LETTER', 'Bé hãy chọn chữ'), targetSegment('letters', item.lower)),
      data: { knowledgeType: isGroup ? 'letterGroup' : 'letter', onset: item.lower, week: 3 },
    })
    add({ goalKey: caseGoal, sourceLesson: item.sourceLesson, variant: `case-${item.lower}-lower`, prompt: VIETNAMESE_QUESTION_TEMPLATES.matchLowercase(item.upper),
      answer: item.lower, displayText: `${item.upper} → ?`, distractors: WEEK_3_LEARNED_LETTERS, stage: 'recognize', questionType: 'LETTER_CASE_MATCH',
      optionKind: 'letter', skill: 'reading', inputMode: 'text', targetType: 'letters', targetText: item.upper,
      voicePlan: voicePlan(instructionSegment('CHOOSE_LETTER', 'Bé hãy chọn chữ'), commonSegment('lowerCaseOf', 'thường của'), targetSegment('letters', item.upper)),
      data: { knowledgeType: isGroup ? 'letterGroup' : 'letter', onset: item.lower, case: 'lower', week: 3 },
    })
    add({ goalKey: caseGoal, sourceLesson: item.sourceLesson, variant: `case-${item.lower}-upper`, prompt: VIETNAMESE_QUESTION_TEMPLATES.matchUppercase(item.lower),
      answer: item.upper, displayText: item.lower, distractors: WEEK_3_UPPERCASE_OPTIONS, stage: 'recognize', questionType: 'LETTER_CASE_MATCH',
      optionKind: 'uppercase', skill: 'reading', inputMode: 'text', targetType: 'letters', targetText: item.lower,
      voicePlan: voicePlan(instructionSegment('CHOOSE_LETTER', 'Bé hãy chọn chữ'), commonSegment('upperCaseOf', 'hoa của'), targetSegment('letters', item.lower)),
      data: { knowledgeType: isGroup ? 'letterGroup' : 'letter', onset: item.lower, case: 'upper', week: 3 },
    })
  }

  for (const item of WEEK_3_IMAGE_KNOWLEDGE) {
    const sprite = getWeek3SpriteById(item.imageId)
    if (!sprite) throw new Error(`Week 3 image question has no sprite: ${item.imageId}`)
    const isVowel = item.feature.type === 'vowel'
    const answer = item.feature.value
    const knowledgeItem = [...WEEK_3_SYLLABLES, ...WEEK_3_WORDS].find(value => value.text === item.targetText)
    if (!knowledgeItem) throw new Error(`Week 3 image question target is not in the lesson pool: ${item.targetText}`)
    const featureData = isVowel ? { vowel: answer, targetLetter: answer } : { onset: answer, targetLetter: answer }
    const targetVoice = targetSegment(item.targetType, item.targetVoiceText)
    if (!targetVoice) throw new Error(`Week 3 image question has no recorded target voice: ${item.targetVoiceText}`)
    add({ goalKey: item.learningKey, sourceLesson: item.sourceLesson, variant: `image-${item.feature.type}-${item.imageId}`,
      prompt: isVowel ? 'Chọn nguyên âm có trong tiếng được minh họa.' : 'Chọn phụ âm đầu của tiếng trong hình.',
      answer, displayText: '', distractors: isVowel ? VOWEL_OPTIONS : WEEK_3_LEARNED_LETTERS,
      stage: 'recognize', questionType: isVowel ? 'IMAGE_CHOOSE_VOWEL' : 'IMAGE_CHOOSE_ONSET',
      optionKind: isVowel ? 'vowel' : 'letter', skill: 'reading', inputMode: 'image', targetType: item.targetType,
      targetText: item.targetVoiceText, imageId: sprite.id,
      voicePlan: voicePlan(instructionSegment('CHOOSE_LETTER', 'Bé hãy chọn chữ'), targetVoice),
      data: { knowledgeType: knowledgeItem.type, targetText: item.targetText, ...featureData, week: 3, imageId: item.imageId },
    })
  }

  // Pair discrimination uses the whole onset for ch/kh; h is never searched as a fragment of either group.
  const pairData = [
    { pair: 'i/k', letters: ['i', 'k'], sourceLesson: 11, distinguish: 'DISTINGUISH_I_K', listen: 'LISTEN_I_K', match: 'MATCH_I_K', review: 'REVIEW_I_K_WEEK_3' },
    { pair: 'h/l', letters: ['h', 'l'], sourceLesson: 12, distinguish: 'DISTINGUISH_H_L', listen: 'LISTEN_H_L', match: 'MATCH_H_L', review: 'REVIEW_H_L_WEEK_3' },
    { pair: 'u/ư', letters: ['u', 'ư'], sourceLesson: 13, distinguish: 'DISTINGUISH_U_UHORN', listen: 'LISTEN_U_UHORN', match: 'MATCH_U_UHORN', review: 'REVIEW_U_UHORN_WEEK_3' },
    { pair: 'ch/kh', letters: ['ch', 'kh'], sourceLesson: 14, distinguish: 'DISTINGUISH_CH_KH', listen: 'LISTEN_CH_KH', match: 'MATCH_CH_KH', review: 'REVIEW_CH_KH_WEEK_3' },
  ] as const

  for (const pair of pairData) {
    for (const answer of pair.letters) {
      const opposite = pair.letters.find(value => value !== answer)!
      add({ goalKey: pair.distinguish, sourceLesson: pair.sourceLesson, variant: `distinguish-${pair.pair}-${answer}`,
        prompt: VIETNAMESE_QUESTION_TEMPLATES.recognizeLetter(answer), answer, displayText: '?',
        distractors: [opposite, ...WEEK_3_LEARNED_LETTERS.filter(value => value !== answer && value !== opposite)],
        stage: 'distinguish', questionType: 'DISTINGUISH_LETTERS', optionKind: 'letter',
        skill: 'reading', inputMode: 'text', targetType: 'letters', targetText: answer,
        voicePlan: voicePlan(instructionSegment('CHOOSE_LETTER', 'Bé hãy chọn chữ'), targetSegment('letters', answer)),
        data: { pair: pair.pair, onset: answer, week: 3 },
      })
      const upper = answer.toLocaleUpperCase('vi-VN')
      add({ goalKey: pair.match, sourceLesson: pair.sourceLesson, variant: `match-${pair.pair}-${answer}`,
        prompt: VIETNAMESE_QUESTION_TEMPLATES.matchLowercase(upper), answer, displayText: `${upper} → ?`,
        distractors: WEEK_3_LEARNED_LETTERS, stage: 'find', questionType: 'LETTER_CASE_MATCH', optionKind: 'letter',
        skill: 'reading', inputMode: 'text', targetType: 'letters', targetText: answer,
        voicePlan: voicePlan(instructionSegment('CHOOSE_LETTER', 'Bé hãy chọn chữ'), commonSegment('lowerCaseOf', 'thường của'), targetSegment('letters', upper)),
        data: { pair: pair.pair, onset: answer, week: 3 },
      })
      const audioSource = resolveVietnameseTargetVoice('letters', answer)
      const audioPlan = voicePlan(listenInstructionSegment('Bé hãy nghe và chọn'), audioSource ? { src: audioSource, text: answer } : undefined)
      add({ goalKey: pair.listen, sourceLesson: pair.sourceLesson, variant: `listen-letter-${answer}`,
        prompt: `Nghe và chọn ${answer.length > 1 ? 'phụ âm đầu' : 'chữ'}`, answer, displayText: '🔊',
        distractors: WEEK_3_LEARNED_LETTERS, stage: 'find', questionType: 'LISTEN_AND_CHOOSE_LETTER', optionKind: 'letter',
        skill: 'listening', inputMode: 'audio', targetType: 'letters', targetText: answer, voicePlan: audioPlan, voiceRequired: true,
        data: { pair: pair.pair, onset: answer, week: 3 },
      })
    }
  }

  const addFindLetter = (goalKey: VietnameseWeek3Goal, item: Week3KnowledgeItem, letter: string, index: number) => {
    const isWord = item.type === 'word'
    const domain = isWord ? WEEK_3_WORDS : WEEK_3_SYLLABLES
    const distractors = domain.filter(candidate => !itemContainsLetter(candidate, letter)).map(candidate => candidate.text)
    add({ goalKey, sourceLesson: item.sourceLesson, variant: `find-${letter}-${index}-${item.text}`,
      prompt: isWord ? VIETNAMESE_QUESTION_TEMPLATES.findWordWith(letter) : VIETNAMESE_QUESTION_TEMPLATES.findSyllableWith(letter),
      answer: item.text, displayText: letter, distractors, stage: 'find',
      questionType: isWord ? 'FIND_LETTER_IN_WORD' : 'FIND_IN_CONTEXT',
      optionKind: isWord ? 'word' : 'syllable', skill: 'reading', inputMode: 'text', targetType: 'letters', targetText: letter,
      voicePlan: voicePlan(commonSegment(isWord ? 'chooseWordWith' : 'chooseSyllableWith', isWord ? 'Bé hãy chọn từ có chữ' : 'Bé hãy chọn tiếng có chữ'), targetSegment('letters', letter)),
      data: { questionSemantics: 'contains-letter', targetLetter: letter, knowledgeType: item.type, targetText: item.text,
        onset: item.onset, vowel: item.vowel, tone: item.tone, week: 3 },
    })
  }

  const syllablesByLesson = (sourceLesson: Week3SourceLesson) => WEEK_3_SYLLABLES.filter(item => item.sourceLesson === sourceLesson)
  const wordsByLesson = (sourceLesson: Week3SourceLesson) => WEEK_3_WORDS.filter(item => item.sourceLesson === sourceLesson)
  const itemContainsLetter = (item: Week3KnowledgeItem, letter: string) => {
    const parts = item.type === 'syllable'
      ? [item]
      : item.text.split(/\s+/).map(token => WEEK_3_SYLLABLES.find(syllableItem => syllableItem.text === token)).filter((value): value is Week3KnowledgeItem => Boolean(value))
    return parts.some(part => part.onset === letter || part.vowel === letter)
  }
  const findExamples: readonly { goalKey: VietnameseWeek3Goal; letter: string; lessons: readonly Week3SourceLesson[] }[] = [
    { goalKey: 'FIND_I_K_IN_TEXT', letter: 'i', lessons: [11] }, { goalKey: 'FIND_I_K_IN_TEXT', letter: 'k', lessons: [11] },
    { goalKey: 'FIND_H_L_IN_TEXT', letter: 'h', lessons: [12] }, { goalKey: 'FIND_H_L_IN_TEXT', letter: 'l', lessons: [12] },
    { goalKey: 'FIND_U_UHORN_IN_TEXT', letter: 'u', lessons: [13] }, { goalKey: 'FIND_U_UHORN_IN_TEXT', letter: 'ư', lessons: [13] },
  ]
  for (const entry of findExamples) {
    const items = entry.lessons.flatMap(lessonNumber => [...syllablesByLesson(lessonNumber), ...wordsByLesson(lessonNumber)])
      .filter(item => itemContainsLetter(item, entry.letter))
    items.forEach((item, index) => addFindLetter(entry.goalKey, item, entry.letter, index))
  }

  // Ask children to choose a syllable by its exact onset. The target syllable
  // stays in the answer tray; prompt, board and voice never reveal it first.
  for (const onset of ['ch', 'kh'] as const) {
    const candidates = WEEK_3_SYLLABLES.filter(item => item.onset === onset)
    const distractors = SYLLABLE_OPTIONS.filter(value => !value.startsWith(onset))
    candidates.forEach((item, index) => add({
      goalKey: 'FIND_CH_KH_IN_TEXT', sourceLesson: item.sourceLesson, variant: `find-onset-${onset}-${index}-${item.text}`,
      prompt: VIETNAMESE_QUESTION_TEMPLATES.findSyllableStart(onset), answer: item.text, displayText: onset,
      distractors, stage: 'find', questionType: 'FIND_WORD_START', optionKind: 'syllable',
      skill: 'reading', inputMode: 'text', targetType: 'letters', targetText: onset,
      voicePlan: voicePlan(commonSegment('findSyllable', 'Bé hãy tìm tiếng'), commonSegment('beginsWith', 'bắt đầu bằng'), targetSegment('letters', onset)),
      data: { knowledgeType: 'syllable', targetText: item.text, onset, letterGroup: onset, questionSemantics: 'exact-onset', week: 3 },
    }))
  }

  const addBuildOnset = (goalKey: VietnameseWeek3Goal, item: Week3KnowledgeItem, index: number, review = false) => {
    const onset = item.onset!
    const pairByOnset: Record<string, readonly [string, string]> = {
      k: ['c', 'k'], h: ['h', 'l'], l: ['h', 'l'], d: ['d', 'đ'], 'đ': ['d', 'đ'], ch: ['ch', 'kh'], kh: ['ch', 'kh'],
    }
    const choicePair = pairByOnset[onset]
    const contexts = [...WEEK_3_WORDS.map(value => value.text), ...WEEK_3_SENTENCES.map(value => value.text)]
    const visibleContext = choicePair ? createVietnameseBlankContext(contexts, item.text, onset) : undefined
    if (!choicePair || !visibleContext) return
    add({ goalKey, sourceLesson: review ? 15 : item.sourceLesson, variant: `build-${onset}-${index}-${item.text}`,
      prompt: VIETNAMESE_QUESTION_TEMPLATES.fillPair(choicePair[0], choicePair[1], visibleContext), answer: onset, displayText: visibleContext,
      distractors: choicePair.filter(value => value !== onset), stage: 'find', questionType: 'CHOOSE_PAIR',
      optionKind: 'letter', skill: 'writing', inputMode: 'text',
      voicePlan: onsetFillVoicePlan(visibleContext, onset, WEEK_3_WORDS, WEEK_3_SENTENCES),
      data: { ...createVietnamesePairFillData(choicePair, item.text, visibleContext), knowledgeType: 'syllable', vowel: item.vowel, tone: item.tone, week: 3 },
    })
  }
  for (const item of syllablesByLesson(11).filter(item => item.onset === 'k')) addBuildOnset('BUILD_KI_SYLLABLES', item, item.sourceLesson)
  for (const item of syllablesByLesson(12).filter(item => item.onset === 'h' || item.onset === 'l')) addBuildOnset('BUILD_H_L_SYLLABLES', item, item.sourceLesson)
  for (const item of syllablesByLesson(13).filter(item => item.vowel === 'u' && (item.onset === 'd' || item.onset === 'đ'))) addBuildOnset('BUILD_U_SYLLABLES', item, item.sourceLesson)
  const uHornSyllables = syllablesByLesson(13).filter(item => item.vowel === 'ư')
  for (let index = 0; index < uHornSyllables.length; index++) {
    const item = uHornSyllables[index]
    const blank = `${item.onset}_`
    add({ goalKey: 'BUILD_UHORN_SYLLABLES', sourceLesson: item.sourceLesson, variant: `build-vowel-uhorn-${index}-${item.text}`,
      prompt: `Điền chữ còn thiếu: ${blank}`, answer: 'ư', displayText: blank,
      distractors: VOWEL_OPTIONS, stage: 'find', questionType: 'BUILD_SYLLABLE', optionKind: 'vowel', skill: 'writing', inputMode: 'text',
      voicePlan: voicePlan(instructionSegment('FILL_LETTER', 'Bé hãy kéo chữ vào chỗ trống')),
      data: { knowledgeType: 'syllable', targetText: item.text, onset: item.onset, vowel: item.vowel, tone: item.tone, week: 3 },
    })
  }
  for (const item of syllablesByLesson(14).filter(item => item.onset === 'ch')) addBuildOnset('BUILD_CH_SYLLABLES', item, item.sourceLesson)
  for (const item of syllablesByLesson(14).filter(item => item.onset === 'kh')) addBuildOnset('BUILD_KH_SYLLABLES', item, item.sourceLesson)

  const readSyllableGoals: readonly { goalKey: VietnameseWeek3Goal; lessons: readonly Week3SourceLesson[] }[] = [
    { goalKey: 'READ_I_K_SYLLABLES', lessons: [11] }, { goalKey: 'READ_H_L_SYLLABLES', lessons: [12] },
    { goalKey: 'READ_U_UHORN_SYLLABLES', lessons: [13] }, { goalKey: 'READ_CH_KH_SYLLABLES', lessons: [14] },
  ]
  const addReadSyllable = (goalKey: VietnameseWeek3Goal, item: Week3KnowledgeItem, index: number, review = false) => add({
    goalKey, sourceLesson: review ? 15 : item.sourceLesson, variant: `${review ? 'review-' : ''}read-syllable-${item.text}-${index}`,
    prompt: 'Chọn tiếng theo âm thanh.', answer: item.text, displayText: '🔊', distractors: SYLLABLE_OPTIONS,
    stage: 'read', questionType: 'SYLLABLE_RECOGNITION', optionKind: 'syllable', skill: 'listening', inputMode: 'audio',
    targetType: 'syllables', targetText: item.text,
    voicePlan: voicePlan(listenInstructionSegment('Bé hãy nghe và chọn'), targetSegment('syllables', item.text)),
    data: { knowledgeType: 'syllable', targetText: item.text, onset: item.onset, vowel: item.vowel, tone: item.tone, targetSourceLesson: item.sourceLesson, week: 3 },
  })
  for (const group of readSyllableGoals) {
    group.lessons.flatMap(syllablesByLesson).forEach((item, index) => addReadSyllable(group.goalKey, item, index))
  }

  const readWordGoals: readonly { goalKey: VietnameseWeek3Goal; lessons: readonly Week3SourceLesson[] }[] = [
    { goalKey: 'READ_I_K_WORDS', lessons: [11] }, { goalKey: 'READ_H_L_WORDS', lessons: [12] },
    { goalKey: 'READ_U_UHORN_WORDS', lessons: [13] }, { goalKey: 'READ_CH_KH_WORDS', lessons: [14] },
  ]
  const addReadWord = (goalKey: VietnameseWeek3Goal, item: Week3KnowledgeItem, index: number, review = false) => add({
    goalKey, sourceLesson: review ? 15 : item.sourceLesson, variant: `${review ? 'review-' : ''}read-word-${item.text}-${index}`,
    prompt: 'Nghe và chọn từ/cụm từ đúng.', answer: item.text, displayText: '🔊', distractors: WORD_OPTIONS,
    stage: 'read', questionType: 'WORD_RECOGNITION', optionKind: 'word', skill: 'reading', inputMode: 'audio',
    targetType: 'words', targetText: item.text,
    voicePlan: voicePlan(listenInstructionSegment('Bé hãy nghe và chọn'), targetSegment('words', item.text)),
    data: { knowledgeType: 'word', targetText: item.text, onset: item.onset, targetSourceLesson: item.sourceLesson, week: 3 },
  })
  for (const group of readWordGoals) group.lessons.flatMap(wordsByLesson).forEach((item, index) => addReadWord(group.goalKey, item, index))

  const sentenceGoals: readonly { goalKey: VietnameseWeek3Goal; lessons: readonly Week3SourceLesson[]; targets: readonly string[] }[] = [
    { goalKey: 'READ_I_K_SENTENCE', lessons: [11], targets: ['kì đà', 'kì đà'] },
    { goalKey: 'READ_H_L_SENTENCE', lessons: [12], targets: ['le le', 'ho', 'lá hẹ'] },
    { goalKey: 'READ_U_UHORN_SENTENCE', lessons: [13], targets: ['đu đủ', 'cá dữ'] },
    { goalKey: 'READ_CH_KH_SENTENCE', lessons: [14], targets: ['chú khỉ', 'cá kho khế'] },
    { goalKey: 'REVIEW_SENTENCE_WEEK_3', lessons: [15], targets: ['cá cờ', 'chợ'] },
  ]
  const addReadSentence = (goalKey: VietnameseWeek3Goal, item: Week3KnowledgeItem, target: string, index: number, review = false) => {
    const answerType: VietnameseVoiceTargetType = resolveVietnameseTargetVoice('words', target) ? 'words' : 'syllables'
    const targetItem = answerType === 'words' ? WEEK_3_WORDS.find(value => value.text === target) : WEEK_3_SYLLABLES.find(value => value.text === target)
    const optionDomain = [...WORD_OPTIONS, ...SYLLABLE_OPTIONS]
    const distractors = optionDomain.filter(value => value !== target && !item.text.toLocaleLowerCase('vi-VN').includes(value.toLocaleLowerCase('vi-VN')))
    const targetVoice = targetSegment(answerType, target)
    add({ goalKey, sourceLesson: review ? 15 : item.sourceLesson, variant: `${review ? 'review-' : ''}read-sentence-${index}-${item.text}-${target}`,
      prompt: `Tìm ${answerType === 'words' ? 'cụm từ' : 'tiếng'} “${target}” trong câu: “${item.text}”`,
      answer: target, displayText: item.text, distractors, stage: review ? 'mixed' : 'read', questionType: 'READ_AND_CHOOSE',
      optionKind: answerType === 'words' ? 'word' : 'syllable', skill: 'reading', inputMode: 'text', targetType: 'sentences', targetText: item.text,
      voicePlan: voicePlan(instructionSegment('FIND_WORD', 'Bé hãy tìm từ'), targetVoice, commonSegment('inSentence', 'trong câu'), targetSegment('sentences', item.text)),
      data: { knowledgeType: 'sentence', targetText: item.text, answerText: target, onset: targetItem?.onset, targetSourceLesson: targetItem?.sourceLesson, week: 3 },
      sentenceWordCount: item.text.replace(/[.!?]/g, '').trim().split(/\s+/).length,
    })
  }
  for (const group of sentenceGoals) {
    const sentences = group.lessons.flatMap(lessonNumber => WEEK_3_SENTENCES.filter(item => item.sourceLesson === lessonNumber))
    sentences.forEach((item, index) => addReadSentence(group.goalKey, item, group.targets[index], index, group.goalKey === 'REVIEW_SENTENCE_WEEK_3'))
  }

  // Listening questions are already mapped above for letter targets. Add the two unambiguous heard-syllable choices for u/ư.
  for (const target of ['dù', 'đủ', 'dữ', 'lừ'] as const) {
    const targetItem = WEEK_3_SYLLABLES.find(item => item.text === target)!
    const targetVoice = targetSegment('syllables', target)
    add({ goalKey: 'LISTEN_U_UHORN', sourceLesson: 13, variant: `listen-syllable-${target}`,
      prompt: 'Nghe và chọn tiếng', answer: target, displayText: '🔊',
      distractors: SYLLABLE_OPTIONS.filter(value => value !== target && (target.includes('ư') ? !value.includes('ư') : !value.includes('u') && !value.includes('ư'))),
      stage: 'find', questionType: 'LISTEN_AND_CHOOSE_SYLLABLE', optionKind: 'syllable', skill: 'listening', inputMode: 'audio',
      targetType: 'syllables', targetText: target,
      voicePlan: voicePlan(listenInstructionSegment('Bé hãy nghe và chọn'), targetVoice), voiceRequired: true,
      data: { knowledgeType: 'syllable', targetText: target, onset: targetItem?.onset, vowel: targetItem?.vowel, tone: targetItem?.tone, pair: 'u/ư', week: 3 },
    })
  }

  const addReviewLetter = (item: typeof WEEK_3_LETTER_GROUPS[number], index: number) => {
    add({ goalKey: 'REVIEW_LETTERS_WEEK_3', sourceLesson: 15, variant: `review-letter-${index}-${item.lower}`,
      prompt: `Ôn tập: chọn ${item.lower.length > 1 ? 'phụ âm đầu' : 'chữ'} ${item.lower}`, answer: item.lower, displayText: item.lower,
      distractors: WEEK_3_LEARNED_LETTERS, stage: 'mixed', questionType: item.lower.length > 1 ? 'LETTER_GROUP_RECOGNITION' : 'LETTER_RECOGNITION',
      optionKind: 'letter', skill: 'reading', inputMode: 'text', targetType: 'letters', targetText: item.lower,
      voicePlan: voicePlan(instructionSegment('CHOOSE_LETTER', 'Bé hãy chọn chữ'), targetSegment('letters', item.lower)),
      data: { knowledgeType: item.lower.length > 1 ? 'letterGroup' : 'letter', onset: item.lower, week: 3 },
    })
    add({ goalKey: 'REVIEW_CASE_WEEK_3', sourceLesson: 15, variant: `review-case-${index}-${item.lower}`,
      prompt: VIETNAMESE_QUESTION_TEMPLATES.matchLowercase(item.upper), answer: item.lower, displayText: item.upper,
      distractors: WEEK_3_LEARNED_LETTERS, stage: 'mixed', questionType: 'LETTER_CASE_MATCH', optionKind: 'letter', skill: 'reading', inputMode: 'text',
      targetType: 'letters', targetText: item.upper,
      voicePlan: voicePlan(instructionSegment('CHOOSE_LETTER', 'Bé hãy chọn chữ'), commonSegment('lowerCaseOf', 'thường của'), targetSegment('letters', item.upper)),
      data: { knowledgeType: item.lower.length > 1 ? 'letterGroup' : 'letter', onset: item.lower, case: 'lower', week: 3 },
    })
  }
  WEEK_3_LETTER_GROUPS.forEach(addReviewLetter)
  for (const pair of pairData) {
    for (const target of pair.letters) {
      const opposite = pair.letters.find(value => value !== target)!
      add({ goalKey: pair.review, sourceLesson: 15, variant: `review-pair-${pair.pair}-${target}`,
      prompt: VIETNAMESE_QUESTION_TEMPLATES.recognizeLetter(target), answer: target, displayText: '?',
      distractors: [opposite, ...WEEK_3_LEARNED_LETTERS.filter(value => value !== target && value !== opposite)], stage: 'mixed', questionType: 'DISTINGUISH_LETTERS', optionKind: 'letter', skill: 'reading', inputMode: 'text',
      targetType: 'letters', targetText: target,
      voicePlan: voicePlan(instructionSegment('CHOOSE_LETTER', 'Bé hãy chọn chữ'), targetSegment('letters', target)),
      data: { pair: pair.pair, onset: target, week: 3 },
    })
    }
  }
  for (let index = 0; index < WEEK_3_SYLLABLES.length; index++) addBuildOnset('REVIEW_BUILD_SYLLABLES_WEEK_3', WEEK_3_SYLLABLES[index], index, true)
  WEEK_3_SYLLABLES.forEach((item, index) => addReadSyllable('REVIEW_READ_SYLLABLES_WEEK_3', item, index, true))
  WEEK_3_WORDS.forEach((item, index) => addReadWord('REVIEW_READ_WORDS_WEEK_3', item, index, true))

  return templates
}

const templates = createTemplates()
const allGoals = Object.keys(TIENG_VIET_1_WEEK_3_LEARNING_KEYS) as VietnameseWeek3Goal[]
const templateGoalSet = new Set(templates.map(item => item.goalKey))
const unsupportedGoals = allGoals.filter(goal => !templateGoalSet.has(goal))
if (unsupportedGoals.length) throw new Error(`Week 3 has learning keys without question templates: ${unsupportedGoals.join(', ')}`)

const ROUND_BANDS: readonly Week3QuestionStage[] = [
  'recognize', 'recognize', 'recognize', 'recognize', 'recognize',
  'find', 'find', 'find', 'find', 'find',
  'distinguish', 'distinguish', 'distinguish', 'distinguish', 'distinguish', 'distinguish', 'distinguish',
  'read', 'read', 'read', 'read', 'read',
  'mixed', 'mixed', 'mixed',
]
const PRIORITIZED_U_UHORN_SLOTS = new Set([11, 14])

function templatesForGame(game: VietnameseWeek3Game): Template[] {
  return templates.filter(template => {
    if (template.voiceRequired && !VOICE_ASSETS_READY) return false
    if (game === 'racing' && template.questionType === 'READ_AND_CHOOSE' && template.data.knowledgeType === 'sentence') return false
    if (game === 'racing' && template.answer.trim().split(/\s+/).length > 2 && ['WORD_RECOGNITION'].includes(template.questionType)) return false
    if (game === 'gold-mining' && template.questionType === 'READ_AND_CHOOSE' && template.data.knowledgeType === 'sentence') return false
    if (game === 'bubble-shooter' && template.questionType === 'READ_AND_CHOOSE' && Number(template.sentenceWordCount) > 4) return false
    return true
  })
}

function questionFromTemplate(template: Template, game: VietnameseWeek3Game, wrongAnswers: readonly string[], random: () => number): VietnameseWeek3Question {
  const isRacingPair = game === 'racing' && template.questionType === 'CHOOSE_PAIR'
  const isDragGroupRecognition = game === 'drag-drop' && (
    template.questionType === 'LETTER_GROUP_RECOGNITION'
    || (template.questionType === 'DISTINGUISH_LETTERS' && String(template.targetText ?? template.answer).length > 1)
  )
  const neededWrongAnswers = template.questionType === 'CHOOSE_PAIR'
    ? isRacingPair ? 2 : game === 'drag-drop' ? 5 : game === 'gold-mining' ? 3 : 1
    : game === 'drag-drop' ? 5 : game === 'gold-mining' ? 3 : 2
  if (wrongAnswers.length !== neededWrongAnswers) throw new Error(`Invalid option count for ${game}/${template.variant}`)
  const options = shuffle([template.answer, ...wrongAnswers], random)
  const voiceSequence = VOICE_ASSETS_READY
    ? isDragGroupRecognition
      ? voicePlan(listenInstructionSegment('Bé hãy nghe và chọn'), targetSegment('letters', String(template.targetText ?? template.answer)))
      : template.voicePlan
    : undefined
  const instructionVoice = voiceSequence?.[0]?.src
  const voice = template.targetType && template.targetText ? resolveVietnameseTargetVoice(template.targetType, template.targetText) : undefined
  const id = `${game}:week-3:${template.goalKey}:${template.variant}:${[...wrongAnswers].sort().join('|')}`
  const prompt = isRacingPair || (template.questionType === 'CHOOSE_PAIR' && game !== 'bubble-shooter')
    ? `Chọn phụ âm đầu còn thiếu: ${template.displayText}`
    : isDragGroupRecognition ? 'Nghe và chọn phụ âm đầu.' : template.prompt
  return normalizeVietnameseQuestion({
    id, goalKey: template.goalKey, sourceLesson: template.sourceLesson, skill: template.skill,
    inputMode: template.inputMode, answerMode: 'select-text', questionType: template.questionType,
    prompt, answer: template.answer, options, displayText: isDragGroupRecognition ? '?' : template.displayText,
    imageId: template.imageId,
    variant: template.variant, stage: template.stage, instructionVoice: voiceSequence ? instructionVoice : undefined,
    voice: voiceSequence ? voice : undefined, voiceSequence,
    voiceFallback: template.voiceFallback,
    spokenInstruction: template.spokenInstruction,
    data: { ...template.data, additionalDistractors: template.questionType === 'CHOOSE_PAIR'
      ? wrongAnswers.filter(value => !(template.data.choicePair as string[]).includes(value)) : undefined,
      week: 3, sourceLesson: template.sourceLesson },
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

function wrongAnswersFor(template: Template, game: VietnameseWeek3Game, random: () => number): string[] {
  const isRacingPair = game === 'racing' && template.questionType === 'CHOOSE_PAIR'
  const needed = template.questionType === 'CHOOSE_PAIR'
    ? isRacingPair ? 2 : game === 'drag-drop' ? 5 : game === 'gold-mining' ? 3 : 1
    : game === 'drag-drop' ? 5 : game === 'gold-mining' ? 3 : 2
  const distractors = shuffle(template.distractors.filter(value => value !== template.answer), random)
  if (isRacingPair) {
    const pair = template.data.choicePair as string[]
    const target = String(template.data.targetText)
    const onset = String(template.data.onset)
    const rime = target.slice(onset.length)
    const knownSyllables = new Set(WEEK_3_SYLLABLES.map(item => item.text.normalize('NFC')))
    const extra = Array.from(new Set(WEEK_3_SYLLABLES.map(item => item.onset).filter((value): value is string => Boolean(value))))
      .find(value => !pair.includes(value) && !knownSyllables.has(`${value}${rime}`.normalize('NFC')))
    if (!extra) throw new Error(`No safe learned onset distractor for ${template.goalKey}/${template.variant}`)
    return [...distractors.slice(0, 1), extra]
  }
  if (template.questionType === 'CHOOSE_PAIR') {
    const pair = template.data.choicePair as string[]
    const contrast = pair.find(value => value !== template.answer)
    const learned = WEEK_3_LEARNED_LETTERS.filter(value => !pair.includes(value) && value !== template.answer)
    const extraDistractors = shuffle(learned, random).slice(0, needed - 1)
    if (!contrast || extraDistractors.length !== needed - 1) throw new Error(`Not enough learned onset distractors for ${template.goalKey}/${template.variant}`)
    return [contrast, ...extraDistractors]
  }
  if (distractors.length < needed) throw new Error(`Not enough learned distractors for ${game}/${template.goalKey}/${template.variant}`)
  const contrast = typeof template.data.pair === 'string'
    ? template.data.pair.split('/').find(value => value !== template.answer)
    : undefined
  if (contrast && template.questionType === 'DISTINGUISH_LETTERS') {
    return [contrast, ...distractors.filter(value => value !== contrast)].slice(0, needed)
  }
  return distractors.slice(0, needed)
}

/** All Week 3 target recordings and shared instruction recordings are now available. */
export function areWeek3VoicesEnabled() { return VOICE_ASSETS_READY }

/** One representative question per content template, useful for audits and previews. */
export function createQuestionPool(game: VietnameseWeek3Game): VietnameseWeek3Question[] {
  return templatesForGame(game).map((template, index) => questionFromTemplate(template, game,
    wrongAnswersFor(template, game, () => ((index * 17 + 11) % 97) / 97), () => ((index * 17 + 11) % 97) / 97))
}

export function getAvailableLearningKeys(game: VietnameseWeek3Game): VietnameseWeek3Goal[] {
  return Array.from(new Set(templatesForGame(game).map(template => template.goalKey)))
}

export function getQuestionTemplateCounts(): Record<VietnameseWeek3Goal, number> {
  return Object.fromEntries(allGoals.map(goal => [goal, templates.filter(template => template.goalKey === goal).length])) as Record<VietnameseWeek3Goal, number>
}

type GenerateOptions = { random?: () => number; previousIds?: readonly string[]; preferredLearningKeys?: readonly string[] }

/** Samples 25 stage-balanced questions each round; keys, prompts and options all vary from the template pool. */
export function generateQuestionSet(game: VietnameseWeek3Game, options: GenerateOptions = {}): VietnameseWeek3Question[] {
  const random = options.random ?? Math.random
  const gameTemplates = templatesForGame(game)
  const previous = new Set(options.previousIds ?? [])
  const selectedIds = new Set<string>()
  const selectedVariants = new Set<string>()
  const preferred = new Set(options.preferredLearningKeys ?? [])
  const result: VietnameseWeek3Question[] = []

  ROUND_BANDS.forEach((band, index) => {
    let candidates = gameTemplates.filter(template => template.stage === band && !selectedVariants.has(template.variant))
    if (band === 'mixed') {
      const reviewTemplates = candidates.filter(template => template.sourceLesson === 15)
      if (reviewTemplates.length) candidates = [...reviewTemplates, ...candidates.filter(template => template.sourceLesson !== 15)]
    }
    if (band === 'distinguish' && PRIORITIZED_U_UHORN_SLOTS.has(index)) {
      const priority = candidates.filter(template => template.goalKey === 'DISTINGUISH_U_UHORN')
      if (priority.length) candidates = priority
    }
    if (!candidates.length) throw new Error(`Week 3 question pool exhausted for ${game}/${band}`)

    let selected: VietnameseWeek3Question | undefined
    const attempts = Math.min(120, candidates.length * 3)
    for (let attempt = 0; attempt < attempts; attempt++) {
      const weights = candidates.map(template => (preferred.has(template.goalKey) ? 4 : 1) * (template.goalKey === 'DISTINGUISH_U_UHORN' && band === 'distinguish' ? 1.8 : 1))
      const total = weights.reduce((sum, value) => sum + value, 0)
      let needle = random() * total
      let candidateIndex = weights.findIndex(weight => (needle -= weight) < 0)
      if (candidateIndex < 0) candidateIndex = candidates.length - 1
      const template = candidates[candidateIndex]
      const q = questionFromTemplate(template, game, wrongAnswersFor(template, game, random), random)
      if (!previous.has(q.id) && !selectedIds.has(q.id)) { selected = q; break }
      candidates = candidates.filter(item => item.variant !== template.variant)
      if (!candidates.length) break
    }
    if (!selected) {
      const fallbackTemplates = gameTemplates.filter(template => template.stage === band && !selectedVariants.has(template.variant))
      for (const fallback of fallbackTemplates) {
        for (let attempt = 0; attempt < 40; attempt++) {
          const candidate = questionFromTemplate(fallback, game, wrongAnswersFor(fallback, game, random), random)
          if (!previous.has(candidate.id) && !selectedIds.has(candidate.id)) { selected = candidate; break }
        }
        if (selected) break
      }
      if (!selected) throw new Error(`Week 3 could not sample a fresh question for ${game}/round-${index + 1}`)
    }
    selectedVariants.add(selected.variant)
    selectedIds.add(selected.id)
    result.push(selected)
  })

  return result
}

export const WEEK_3_LISTENING_KEYS = [
  'LISTEN_I_K', 'LISTEN_H_L', 'LISTEN_U_UHORN', 'LISTEN_CH_KH',
] as const satisfies readonly VietnameseWeek3Goal[]

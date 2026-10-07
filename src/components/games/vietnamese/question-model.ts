import type { VoiceSegment } from '../general/composed-voice'
import { getWeek1SpriteById, getWeek1SpriteGrid } from './week1-sprites'
import { getWeek2SpriteById, getWeek2SpriteGrid } from './week2-sprites'
import { getWeek3SpriteById, getWeek3SpriteGrid } from './week3-sprites'
import { getSpriteById as getWeek4SpriteById, WEEK_4_SPRITE_MANIFEST } from './week4-sprites'

export type VietnameseQuestionType =
  | 'RECOGNIZE_LETTER'
  | 'MATCH_CASE'
  | 'FIND_WORD_START'
  | 'FIND_LETTER_IN_WORD'
  | 'FILL_ONSET'
  | 'CHOOSE_PAIR'
  | 'FILL_SYLLABLE'
  | 'CONNECT_IMAGE_WORD'
  | 'CONNECT_TEXT_TEXT'
  | 'IMAGE_CHOOSE_ONSET'
  | 'IMAGE_CHOOSE_VOWEL'
  | 'IMAGE_ONSET_MATCH'
  | 'IMAGE_WORD_MATCH'
  | 'FIND_IN_CONTEXT'
  | 'READ_TARGET'
  | 'LISTEN_AND_CHOOSE'
  | 'CHOOSE_ANSWER'

export type VietnameseConnectPair = {
  id: string
  left: { kind: 'text'; value: string } | { kind: 'image'; src?: string; imageId?: string; label: string; crop?: { row: number; column: number; rows: number; columns: number } }
  right: string
  learningKey: string
  sourceLesson: number
}

export type VietnameseQuestionLike = {
  id: string
  goalKey: string
  questionType?: string
  templateType?: VietnameseQuestionType
  inputMode?: 'audio' | 'text' | 'image' | 'scene'
  prompt?: string
  answer: string
  options?: readonly string[]
  displayText?: string
  imageId?: string
  instructionVoice?: string
  voice?: string
  voiceSequence?: readonly VoiceSegment[]
  voiceFallback?: { instruction?: string; target?: string }
  spokenInstruction?: string
  data?: Record<string, unknown>
  connectPairs?: readonly VietnameseConnectPair[]
}

export type VietnameseQuestionModel = {
  type: VietnameseQuestionType
  learningKey: string
  prompt: {
    text: string
    instructionVoice?: string
    voice?: string
    voiceSequence?: VoiceSegment[]
    voiceFallback?: { instruction?: string; target?: string }
    spokenInstruction?: string
  }
  content: {
    displayText?: string
    imageId?: string
    data?: Record<string, unknown>
    connectPairs?: readonly VietnameseConnectPair[]
  }
  choices: readonly string[]
  correctAnswer: string | readonly string[]
}

export type NormalizedVietnameseQuestion<T extends VietnameseQuestionLike> = T & {
  questionModel: VietnameseQuestionModel
}

export const VIETNAMESE_QUESTION_TEMPLATES = {
  recognizeLetter: (target: string) => `Đâu là ${target}?`,
  matchLowercase: (letter: string) => `Chữ thường của ${letter} là chữ nào?`,
  matchUppercase: (letter: string) => `Chữ hoa của ${letter} là chữ nào?`,
  findWordStart: (onset: string) => `Từ nào bắt đầu bằng ${onset}?`,
  findSyllableStart: (onset: string) => `Tiếng nào bắt đầu bằng ${onset}?`,
  findWordWith: (letter: string) => `Từ nào có chữ ${letter}?`,
  findSyllableWith: (letter: string) => `Tiếng nào có chữ ${letter}?`,
  findLetterInWord: (letter: string, word: string) => `Tìm chữ ${letter} trong từ “${word}”.`,
  fillPair: (first: string, second: string, context: string) => `Điền ${first} hoặc ${second}: ${context}`,
  connectImageWord: 'Nối hình với từ đúng.',
  connectTextText: 'Nối để tạo thành tiếng đúng.',
  connectOnsetSyllable: 'Nối phụ âm đầu với tiếng đúng.',
  connectOnsetSyllableInstruction: 'Tìm tiếng bắt đầu bằng chữ đó rồi nối lại.',
  connectImageWordInstruction: 'Bé hãy nối mỗi hình với từ phù hợp.',
} as const

export function createVietnameseBlankContext(contexts: readonly string[], target: string, onset: string): string | undefined {
  const targetText = target.normalize('NFC')
  const targetKey = targetText.toLocaleLowerCase('vi-VN')
  for (const context of contexts) {
    const normalizedContext = context.normalize('NFC')
    const tokens = new RegExp('[\\p{L}\\p{M}]+', 'gu')
    let match: RegExpExecArray | null
    let cursor = 0
    let found = false
    let result = ''
    while ((match = tokens.exec(normalizedContext))) {
      if (match[0].toLocaleLowerCase('vi-VN') !== targetKey) continue
      const remainder = match[0].slice(onset.length)
      result += `${normalizedContext.slice(cursor, match.index)}___${remainder}`
      cursor = match.index + match[0].length
      found = true
    }
    if (found) return `${result}${normalizedContext.slice(cursor)}`
  }
  return undefined
}

/** Build the structured fields shared by onset-pair completion questions across weeks. */
export function createVietnamesePairFillData(choicePair: readonly [string, string], targetText: string, visibleContext: string) {
  const pair = choicePair.map(value => value.normalize('NFC').trim()) as [string, string]
  const target = targetText.normalize('NFC').trim()
  const context = visibleContext.normalize('NFC').trim()
  const onset = pair.filter(value => target.toLocaleLowerCase('vi-VN').startsWith(value.toLocaleLowerCase('vi-VN')))
    .sort((left, right) => right.length - left.length)[0]
  if (new Set(pair.map(normalize)).size !== 2 || !onset || !context.includes('_')) {
    throw new Error('Invalid Vietnamese onset-pair fill data')
  }
  const spokenContext = context.replace(/_+/g, onset).normalize('NFC')
  return { targetText: target, visibleContext: context, spokenContext, choicePair: pair, onset, questionSemantics: 'exact-onset' as const }
}

const normalize = (value: string) => value.normalize('NFC').trim().toLocaleLowerCase('vi-VN')
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const containsWholeAnswer = (text: string, answer: string) => {
  const normalizedText = normalize(text)
  const normalizedAnswer = normalize(answer)
  if (!normalizedAnswer) return false
  return new RegExp(`(^|[^\\p{L}\\p{M}])${escapeRegExp(normalizedAnswer)}($|[^\\p{L}\\p{M}])`, 'u').test(normalizedText)
}

const removeVietnameseTone = (value: string) => value.normalize('NFD')
  .replace(/[\u0300\u0301\u0303\u0309\u0323]/g, '').normalize('NFC').toLocaleLowerCase('vi-VN')

function hasVisibleNgNghRuleContext(question: VietnameseQuestionLike): boolean {
  if (normalize(String(question.data?.onset ?? '')) !== 'ngh') return false
  const vowel = normalize(String(question.data?.vowel ?? ''))
  if (!['e', 'ê', 'i'].includes(vowel)) return false
  const visible = `${question.prompt ?? ''} ${question.displayText ?? ''}`.normalize('NFC')
  const blankSuffix = visible.match(/_+\s*([^\s]+)/)?.[1]?.[0]
  const audioSuffix = visible.match(/🔊\s*([^\s]+)/)?.[1]?.[0]
  return [blankSuffix, audioSuffix].some(value => value && removeVietnameseTone(value) === vowel)
}

function getVietnameseSpriteById(id: string, week?: unknown) {
  if (week === 1) return getWeek1SpriteById(id)
  if (week === 2) return getWeek2SpriteById(id)
  if (week === 3) return getWeek3SpriteById(id)
  if (week === 4) return getWeek4SpriteById(id)
  return getWeek1SpriteById(id) ?? getWeek2SpriteById(id) ?? getWeek3SpriteById(id) ?? getWeek4SpriteById(id)
}

function getVietnameseSpriteGrid(id: string, week?: unknown) {
  if (week === 1) return getWeek1SpriteGrid(id)
  if (week === 2) return getWeek2SpriteGrid(id)
  if (week === 3) return getWeek3SpriteGrid(id)
  if (week === 4) return getWeek4SpriteById(id) ? WEEK_4_SPRITE_MANIFEST.grid : undefined
  return getWeek1SpriteGrid(id) ?? getWeek2SpriteGrid(id) ?? getWeek3SpriteGrid(id)
    ?? (getWeek4SpriteById(id) ? WEEK_4_SPRITE_MANIFEST.grid : undefined)
}

const EXPECTED_PAIR_BY_LEARNING_KEY: Readonly<Record<string, readonly [string, string]>> = {
  BUILD_KI_SYLLABLES: ['c', 'k'], BUILD_H_L_SYLLABLES: ['h', 'l'], BUILD_U_SYLLABLES: ['d', 'đ'],
  BUILD_CH_SYLLABLES: ['ch', 'kh'], BUILD_KH_SYLLABLES: ['ch', 'kh'],
  BUILD_M_SYLLABLES: ['m', 'n'], BUILD_N_SYLLABLES: ['m', 'n'],
  BUILD_G_SYLLABLES: ['g', 'gi'], BUILD_GI_SYLLABLES: ['g', 'gi'],
  BUILD_GH_SYLLABLES: ['gh', 'nh'], BUILD_NH_SYLLABLES: ['gh', 'nh'],
  BUILD_NG_SYLLABLES: ['ng', 'nh'], BUILD_NGH_SYLLABLES: ['ng', 'ngh'],
  DISTINGUISH_NG_NGH: ['ng', 'ngh'], REVIEW_NG_NGH_WEEK_4: ['ng', 'ngh'],
}

/** Compare Vietnamese letters after removing tone marks while preserving ê/ơ/ă/â/ư. */
export function containsVietnameseLetter(text: string, letter: string): boolean {
  const units = (value: string) => {
    const result: string[] = []
    for (const codePoint of Array.from(value.normalize('NFD').toLocaleLowerCase('vi-VN'))) {
      if (/^[a-zđ]$/i.test(codePoint)) result.push(codePoint)
      else if (/^[\u0300-\u036f]$/.test(codePoint) && result.length) result[result.length - 1] += codePoint
    }
    return result.map(unit => unit.replace(/[\u0300\u0301\u0303\u0309\u0323]/g, '').normalize('NFC'))
  }
  const source = units(text)
  const target = units(letter)
  if (!target.length || target.length > source.length) return false
  return source.some((_, index) => target.every((unit, offset) => source[index + offset] === unit))
}

function inferQuestionType(question: VietnameseQuestionLike): VietnameseQuestionType {
  if (question.templateType) return question.templateType
  if (question.questionType === 'CONNECT_IMAGE_WORD') return 'CONNECT_IMAGE_WORD'
  if (question.questionType === 'CONNECT_TEXT_TEXT') return 'CONNECT_TEXT_TEXT'
  if (question.questionType === 'IMAGE_CHOOSE_ONSET') return 'IMAGE_CHOOSE_ONSET'
  if (question.questionType === 'IMAGE_CHOOSE_VOWEL') return 'IMAGE_CHOOSE_VOWEL'
  if (question.questionType === 'IMAGE_MISSING_ONSET') return 'CHOOSE_PAIR'
  if (question.questionType === 'IMAGE_ONSET_MATCH') return 'IMAGE_ONSET_MATCH'
  if (question.questionType === 'IMAGE_WORD_MATCH') return 'IMAGE_WORD_MATCH'
  if (question.questionType === 'FILL_ONSET' || question.questionType === 'MISSING_ONSET' || question.questionType === 'MISSING_LETTER') return 'FILL_ONSET'
  if (question.questionType === 'CHOOSE_PAIR') return 'CHOOSE_PAIR'
  if (question.questionType === 'LETTER_CASE_MATCH' || question.questionType === 'matchCase') return 'MATCH_CASE'
  if (question.questionType === 'matchSame') return 'RECOGNIZE_LETTER'
  if (question.questionType === 'fillMissingChar') return 'FILL_SYLLABLE'
  if (question.questionType === 'FIND_ONSET_IN_WORD' && normalize(question.answer) === normalize(String(question.data?.targetText ?? ''))) return 'FIND_WORD_START'
  if (question.questionType === 'FIND_WORD_START') return 'FIND_WORD_START'
  if (question.questionType === 'FIND_IN_CONTEXT') return 'FIND_IN_CONTEXT'
  if (question.questionType === 'FIND_LETTER_IN_WORD' || question.questionType === 'findCharInWord') return 'FIND_LETTER_IN_WORD'
  if (question.questionType === 'LETTER_RECOGNITION' || question.questionType === 'LETTER_GROUP_RECOGNITION' || question.questionType === 'recognize') return 'RECOGNIZE_LETTER'
  if (question.questionType === 'LISTEN_AND_CHOOSE_LETTER' || question.questionType === 'LISTEN_AND_CHOOSE_SYLLABLE' || question.questionType === 'listen') return 'LISTEN_AND_CHOOSE'
  if (question.questionType === 'SYLLABLE_RECOGNITION' || question.questionType === 'WORD_RECOGNITION' || question.questionType === 'READ_AND_CHOOSE') return 'READ_TARGET'
  if (question.questionType === 'FIND_ONSET_IN_SYLLABLE' || question.questionType === 'FIND_LETTER_IN_SYLLABLE' || question.questionType === 'findInText') return 'FIND_IN_CONTEXT'
  return 'CHOOSE_ANSWER'
}

export function createVietnameseQuestionModel(question: VietnameseQuestionLike): VietnameseQuestionModel {
  const type = inferQuestionType(question)
  const connectPairs = question.connectPairs
  return {
    type,
    learningKey: question.goalKey,
    prompt: {
      text: question.prompt?.normalize('NFC').trim() ?? '',
      instructionVoice: question.instructionVoice,
      voice: question.voice,
      voiceSequence: question.voiceSequence ? [...question.voiceSequence] : undefined,
      voiceFallback: question.voiceFallback,
      spokenInstruction: question.spokenInstruction,
    },
    content: { displayText: question.displayText?.normalize('NFC'), imageId: question.imageId, data: question.data, connectPairs },
    choices: (question.options ?? []).map(value => value.normalize('NFC').trim()),
    correctAnswer: connectPairs?.length ? connectPairs.map(pair => pair.right.normalize('NFC').trim()) : question.answer.normalize('NFC').trim(),
  }
}

export function validateVietnameseQuestion(question: VietnameseQuestionLike): string[] {
  const model = createVietnameseQuestionModel(question)
  const errors: string[] = []
  const fail = (reason: string) => errors.push(`${question.id || '<no-id>'}: ${reason}`)
  const choices = model.choices
  const normalizedChoices = choices.map(normalize)

  if (!question.id.trim()) fail('missing question id')
  if (!model.learningKey.trim()) fail('missing learning key')
  if (!model.prompt.text) fail('missing prompt text')
  if (question.questionType?.startsWith('IMAGE_') && !question.imageId && !question.connectPairs?.length) fail('image question needs an imageId')
  if (question.imageId && !getVietnameseSpriteById(question.imageId, question.data?.week)) fail(`unknown sprite imageId: ${question.imageId}`)
  if (choices.length < 2) fail('needs at least two choices')
  if (normalizedChoices.some(value => !value)) fail('contains an empty choice')
  if (new Set(normalizedChoices).size !== normalizedChoices.length) fail('contains duplicate choices after NFC normalization')
  if (normalizedChoices.includes('ng') && normalizedChoices.includes('ngh') && !hasVisibleNgNghRuleContext(question)) {
    fail('ng/ngh may only be contrasted when the following e, ê, or i is shown')
  }

  if (Array.isArray(model.correctAnswer)) {
    const answers = model.correctAnswer.map(normalize)
    if (!question.connectPairs?.length) fail('multi-answer question needs explicit connect pairs')
    if (new Set(answers).size !== answers.length) fail('connect pairs reuse the same right-hand answer')
    if (new Set(question.connectPairs?.map(pair => pair.id.trim())).size !== question.connectPairs?.length) fail('connect pairs reuse an id')
    const leftKeys = (question.connectPairs ?? []).map(pair => pair.left.kind === 'text'
      ? `text:${normalize(pair.left.value)}`
      : `image:${pair.left.imageId?.trim() ?? pair.left.src?.trim()}:${pair.left.crop ? `${pair.left.crop.row},${pair.left.crop.column}` : 'full'}`)
    if (new Set(leftKeys).size !== leftKeys.length) fail('connect pairs reuse the same left-hand item')
    if (answers.length !== choices.length || answers.some(answer => !normalizedChoices.includes(answer))) {
      fail('connect choices must contain exactly the paired answers')
    }
    for (const pair of question.connectPairs ?? []) {
      if (!pair.id.trim() || !pair.learningKey.trim() || !Number.isInteger(pair.sourceLesson)) fail('connect pair is missing id, learning key, or source lesson')
      if (pair.left.kind === 'image' && (!(pair.left.imageId?.trim() || pair.left.src?.trim().startsWith('/')) || !pair.left.label.trim())) fail('image pair needs an image id or local asset path and accessible label')
      if (pair.left.kind === 'image' && pair.left.imageId && !getVietnameseSpriteById(pair.left.imageId, question.data?.week)) fail(`unknown sprite imageId: ${pair.left.imageId}`)
      if (['IMAGE_ONSET_MATCH', 'IMAGE_WORD_MATCH'].includes(model.type) && pair.left.kind !== 'image') fail('image matching questions need an image on the left of every pair')
      if (pair.left.kind === 'image' && pair.left.crop) {
        const { row, column, rows, columns } = pair.left.crop
        if (![row, column, rows, columns].every(Number.isInteger) || rows <= 0 || columns <= 0 || row < 0 || column < 0 || row >= rows || column >= columns) {
          fail('image sprite crop needs an in-bounds row and column')
        }
        const sprite = pair.left.imageId ? getVietnameseSpriteById(pair.left.imageId, question.data?.week) : undefined
        const grid = pair.left.imageId ? getVietnameseSpriteGrid(pair.left.imageId, question.data?.week) : undefined
        if (sprite && grid && (row !== sprite.row || column !== sprite.col || rows !== grid.rows || columns !== grid.columns)) {
          fail('image sprite crop does not match its manifest entry')
        }
      }
      if (pair.left.kind === 'text' && !pair.left.value.trim()) fail('text-text pair has an empty left value')
      if (!pair.right.trim()) fail('connect pair has an empty right value')
      if (model.type === 'CONNECT_IMAGE_WORD' && pair.left.kind !== 'image') fail('image-word questions need an image on the left of every pair')
      if (model.type === 'CONNECT_TEXT_TEXT' && pair.left.kind !== 'text') fail('text-text questions need text on the left of every pair')
    }
    const visibleText = [model.prompt.text, model.content.displayText, question.spokenInstruction,
      question.voiceFallback?.instruction, question.voiceFallback?.target,
      ...(question.voiceSequence ?? []).map(segment => segment.text)].filter(Boolean).join(' ')
    if ((question.connectPairs ?? []).some(pair => containsWholeAnswer(visibleText, pair.right))) {
      fail('connect prompt or voice reveals a paired answer before selection')
    }
    if (!['CONNECT_IMAGE_WORD', 'CONNECT_TEXT_TEXT', 'IMAGE_ONSET_MATCH', 'IMAGE_WORD_MATCH'].includes(model.type)) fail('only connect question types may have multiple answers')
  } else {
    const answer = typeof model.correctAnswer === 'string' ? normalize(model.correctAnswer) : ''
    if (normalizedChoices.filter(value => value === answer).length !== 1) fail('must have exactly one correct answer in the choices')
    if (question.questionType === 'WORD_RECOGNITION' && question.inputMode === 'audio') {
      const visibleText = [model.prompt.text, model.content.displayText].filter(Boolean).join(' ')
      if (containsWholeAnswer(visibleText, answer)) fail('listening-word prompt reveals the answer before selection')
      const sequence = question.voiceSequence ?? []
      if (!sequence.length || normalize(sequence[sequence.length - 1].text) !== answer) fail('listening-word voice must end by reading the target')
    }
    if (question.questionType === 'SYLLABLE_RECOGNITION' && question.inputMode === 'audio') {
      const visibleText = [model.prompt.text, model.content.displayText].filter(Boolean).join(' ')
      if (containsWholeAnswer(visibleText, answer)) fail('listening-syllable prompt reveals the answer before selection')
      const sequence = question.voiceSequence ?? []
      if (!sequence.length || normalize(sequence[sequence.length - 1].text) !== answer) fail('listening-syllable voice must end by reading the target')
    }
    if (question.questionType === 'IMAGE_CHOOSE_ONSET') {
      const onset = question.data?.onset
      if (typeof onset !== 'string' || normalize(onset) !== answer) fail('image onset answer must match its exact onset metadata')
      if (typeof question.data?.targetText !== 'string' || !String(question.data.targetText).trim()) fail('image onset question needs source knowledge text')
    }
    if (question.questionType === 'IMAGE_CHOOSE_VOWEL') {
      const vowel = question.data?.vowel
      const targetText = question.data?.targetText
      if (typeof vowel !== 'string' || normalize(vowel) !== answer) fail('image vowel answer must match its exact vowel metadata')
      if (typeof targetText !== 'string' || !containsVietnameseLetter(targetText, answer)) fail('image vowel question needs source knowledge text containing its target')
    }
    if (model.type === 'FIND_WORD_START' || model.type === 'FIND_LETTER_IN_WORD' || question.data?.questionSemantics === 'contains-letter') {
      const visibleText = [model.prompt.text, model.content.displayText, question.voice, question.spokenInstruction,
        question.voiceFallback?.instruction, question.voiceFallback?.target,
        ...(question.voiceSequence ?? []).map(segment => segment.text)]
        .filter(Boolean).join(' ')
      if (containsWholeAnswer(visibleText, answer)) fail('find prompt or voice reveals the answer before selection')
      if (model.type === 'FIND_WORD_START') {
        const onset = question.data?.onset
        const target = question.data?.targetText
        if (typeof onset !== 'string' || !onset.trim() || !answer.startsWith(normalize(onset))) fail('find-word answer must start with the exact requested onset')
        if (typeof target !== 'string' || normalize(target) !== answer) fail('find-word target metadata must match the answer')
      }
      if (question.data?.questionSemantics === 'contains-letter') {
        const letter = question.data?.targetLetter
        if (typeof letter !== 'string' || !letter.trim() || !containsVietnameseLetter(answer, letter)) fail('find-letter answer must contain the requested Vietnamese letter')
      }
    }
    if (model.type === 'CHOOSE_PAIR' || model.type === 'FILL_ONSET') {
      const pair = question.data?.choicePair
      const target = question.data?.targetText
      const onset = question.data?.onset
      if (!Array.isArray(pair) || pair.length !== 2 || !pair.every(value => typeof value === 'string' && value.trim())) {
        fail('choose-pair needs an explicit two-choice domain')
      } else {
        const pairValues = pair.map(value => normalize(String(value)))
        if (new Set(pairValues).size !== 2) fail('choose-pair domain must contain two different choices')
        const extraDistractors = Array.isArray(question.data?.additionalDistractors)
          ? question.data.additionalDistractors.map(value => normalize(String(value)))
          : []
        if (extraDistractors.length > 4 || extraDistractors.some(value => pairValues.includes(value))
          || new Set(extraDistractors).size !== extraDistractors.length) fail('choose-pair may declare up to four unique additional distractors')
        const declaredChoices = [...pairValues, ...extraDistractors]
        if (normalizedChoices.length !== declaredChoices.length || declaredChoices.some(value => !normalizedChoices.includes(value))) fail('choose-pair choices must match its declared pair and distractors')
        if (extraDistractors.length && !/phụ âm đầu còn thiếu/i.test(model.prompt.text)) fail('onset completion with extra choices needs a prompt that accurately covers all choices')
        const expectedPair = EXPECTED_PAIR_BY_LEARNING_KEY[model.learningKey]
        if (expectedPair && expectedPair.map(normalize).some(value => !pairValues.includes(value))) fail('choice pair does not match the learning key')
        if (pairValues.includes('ng') && pairValues.includes('ngh') && !hasVisibleNgNghRuleContext(question)) {
          fail('ng/ngh onset fill must visibly show the following e, ê, or i')
        }
        if (typeof target !== 'string' || !target.trim() || typeof onset !== 'string' || normalize(target).startsWith(normalize(onset)) === false || normalize(onset) !== answer) {
          fail('choose-pair needs a contextual target whose onset matches the correct answer')
        }
      }
      const blankLength = (model.content.displayText?.match(/_+/g) ?? []).reduce((sum, run) => sum + run.length, 0)
      const singleOnsetBlank = question.questionType === 'IMAGE_MISSING_ONSET'
        || (typeof onset === 'string' && ['ng', 'ngh'].includes(normalize(onset)))
      const minimumBlankLength = singleOnsetBlank ? 1 : typeof onset === 'string' ? onset.length : 1
      if (blankLength < minimumBlankLength) fail('choose-pair blank is too short for its missing onset')
      if (question.data?.visibleContext && normalize(String(question.data.visibleContext)) !== normalize(model.content.displayText ?? '')) fail('visible fill context metadata does not match its displayed context')
      if (typeof target === 'string') {
        const spokenContext = typeof question.data?.spokenContext === 'string' ? question.data.spokenContext : ''
        const sequence = question.voiceSequence ?? []
        const contextIndex = sequence.findIndex(segment => normalize(segment.text) === normalize(spokenContext))
        const expectedContext = typeof question.data?.visibleContext === 'string' && typeof onset === 'string'
          ? question.data.visibleContext.replace(/_+/g, onset)
          : ''
        if (spokenContext && normalize(expectedContext) !== normalize(spokenContext)) fail('spoken fill context must restore the exact missing onset')
        if (spokenContext && (contextIndex < 0 || contextIndex !== sequence.length - 1)) fail('choose-pair voice must end by reading the completed context')

        const otherVoiceText = contextIndex >= 0
          ? sequence.filter((_, index) => index !== contextIndex).map(segment => segment.text)
          : sequence.map(segment => segment.text)
        const visibleText = [model.prompt.text, model.content.displayText, question.voice, question.spokenInstruction,
          question.voiceFallback?.instruction, question.voiceFallback?.target, ...otherVoiceText].filter(Boolean).join(' ')
        if (containsWholeAnswer(visibleText, target)) fail('fill prompt or instruction reveals the target before selection')
      }
    }
  }

  return errors
}

export function normalizeVietnameseQuestion<T extends VietnameseQuestionLike>(question: T): NormalizedVietnameseQuestion<T> {
  const normalized = { ...question, questionModel: createVietnameseQuestionModel(question) } as NormalizedVietnameseQuestion<T>
  const errors = validateVietnameseQuestion(normalized)
  if (errors.length) throw new Error(`Invalid Vietnamese question: ${errors.join('; ')}`)
  return normalized
}

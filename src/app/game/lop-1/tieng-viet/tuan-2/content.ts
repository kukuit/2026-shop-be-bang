import type { LearningQuestion, LearningSkill } from '@/components/games/general/learning-question'
import type { VoiceSegment } from '@/components/games/general/composed-voice'
import { COMMON_VOICE_ROOT, getVietnameseInstructionVoice, resolveVietnameseTargetVoice, VIETNAMESE_VOICE_MANIFEST, type VietnameseVoiceTargetType } from '@/components/games/vietnamese/voice-manifest'
import { containsVietnameseLetter, normalizeVietnameseQuestion, VIETNAMESE_QUESTION_TEMPLATES } from '@/components/games/vietnamese/question-model'
import { getWeek2SpriteById, type Week2ImageId } from '@/components/games/vietnamese/week2-sprites'
import { TIENG_VIET_1_WEEK_2_LEARNING_KEYS, type VietnameseWeek2Goal } from './lesson'

export const QUESTION_COUNT = 25
export type VietnameseWeek2Game = 'bubble-shooter' | 'gold-mining' | 'racing' | 'drag-drop'
export type VietnameseWeek2Question = LearningQuestion & {
  goalKey: VietnameseWeek2Goal
  sourceLesson: 6 | 7 | 8 | 9
  questionType: 'recognize' | 'matchSame' | 'matchCase' | 'findInText' | 'FIND_IN_CONTEXT' | 'readSyllable' | 'readWord' | 'readSentence' | 'listen' | 'IMAGE_CHOOSE_ONSET' | 'IMAGE_CHOOSE_VOWEL'
  options: string[]
  displayText: string
  imageId?: Week2ImageId
  variant: string
  word?: string
  voiceSequence?: VoiceSegment[]
}

const LOWER_LETTERS = ['o', 'ô', 'ơ', 'd', 'đ', 'a', 'b', 'c', 'e', 'ê'] as const
const UPPER_LETTERS = LOWER_LETTERS.map(letter => letter.toLocaleUpperCase('vi-VN'))
const WEEK_2_SYLLABLES = ['bò', 'cò', 'cỏ', 'bố', 'bộ', 'cô', 'cổ', 'đa', 'đá', 'dê', 'đỏ', 'bờ', 'cờ', 'đỡ'] as const
const PRIOR_SYLLABLES = ['ba', 'bà', 'ba ba', 'ca', 'cà', 'cá', 'bè', 'bé', 'bế'] as const
const SYLLABLE_CHOICES = [...WEEK_2_SYLLABLES, ...PRIOR_SYLLABLES]
const WEEK_2_SENTENCES: readonly { sourceLesson: 6 | 7 | 9; text: string; target: string; targetType: VietnameseVoiceTargetType }[] = [
  { sourceLesson: 6, text: 'Bê có cỏ.', target: 'cỏ', targetType: 'syllables' },
  { sourceLesson: 7, text: 'Bố bế bể cá.', target: 'ô', targetType: 'letters' },
  { sourceLesson: 7, text: 'Bé có ô đỏ.', target: 'ô', targetType: 'letters' },
  { sourceLesson: 9, text: 'Bố đỡ bé.', target: 'đỡ', targetType: 'syllables' },
  { sourceLesson: 9, text: 'Bờ đê có dê.', target: 'bờ', targetType: 'syllables' },
  { sourceLesson: 7, text: 'Bà có ô đỏ.', target: 'ô', targetType: 'letters' },
]

export type Week2ImageKnowledge = {
  imageId: Week2ImageId
  targetText: string
  sourceLesson: 6 | 7 | 8 | 9
  learningKey: VietnameseWeek2Goal
  targetType: VietnameseVoiceTargetType
  feature: { type: 'onset'; value: 'd' | 'đ' } | { type: 'vowel'; value: 'o' | 'ô' | 'ơ' }
}

/** Image prompts reuse the Week 2 letter targets and don't create new learning keys. */
export const WEEK_2_IMAGE_KNOWLEDGE: readonly Week2ImageKnowledge[] = [
  { imageId: 'de', targetText: 'dê', sourceLesson: 8, learningKey: 'RECOGNIZE_D', targetType: 'syllables', feature: { type: 'onset', value: 'd' } },
  { imageId: 'co', targetText: 'cò', sourceLesson: 6, learningKey: 'RECOGNIZE_O', targetType: 'syllables', feature: { type: 'vowel', value: 'o' } },
  { imageId: 'du_du', targetText: 'đu đủ', sourceLesson: 8, learningKey: 'RECOGNIZE_D_DBAR', targetType: 'words', feature: { type: 'onset', value: 'đ' } },
  { imageId: 'no', targetText: 'nơ', sourceLesson: 9, learningKey: 'RECOGNIZE_O_HORN', targetType: 'syllables', feature: { type: 'vowel', value: 'ơ' } },
]

export const LETTER_OPTIONS = [...LOWER_LETTERS] as const
export const QUESTION_VOICE_ROOT = COMMON_VOICE_ROOT

const learningKeys = Object.keys(TIENG_VIET_1_WEEK_2_LEARNING_KEYS) as VietnameseWeek2Goal[]
const goalCounts = Object.fromEntries(learningKeys.map(key => [key, 1])) as Record<VietnameseWeek2Goal, number>

export const DEFAULT_GOAL_COUNTS: Record<VietnameseWeek2Game, Partial<Record<VietnameseWeek2Goal, number>>> = {
  'bubble-shooter': { ...goalCounts },
  'gold-mining': { ...goalCounts },
  racing: { ...goalCounts },
  'drag-drop': { ...goalCounts },
}

type QuestionTemplate = Omit<VietnameseWeek2Question, 'id' | 'options'> & {
  distractors: readonly string[]
  voiceTargetType: VietnameseVoiceTargetType
  voiceTarget: string
}

const letterDistractors = (answer: string) => (answer === answer.toLocaleUpperCase('vi-VN') ? UPPER_LETTERS : LOWER_LETTERS).filter(value => value !== answer)
const syllableDistractors = (answer: string) => SYLLABLE_CHOICES.filter(value => value !== answer)
const toneMarks: Record<string, string> = {
  huyền: 'àầằèềìòồờùừỳ', sắc: 'áấắéếíóốớúứý', hỏi: 'ảẩẳẻểỉỏổởủửỷ', ngã: 'ãẫẵẽễĩõỗỡũữỹ', nặng: 'ạậặẹệịọộợụựỵ',
}
const toneOf = (value: string) => Object.entries(toneMarks).find(([, chars]) => Array.from(value.normalize('NFC')).some(char => chars.includes(char)))?.[0]
const commonSegment = (key: keyof typeof VIETNAMESE_VOICE_MANIFEST.common, text: string): VoiceSegment => ({
  src: VIETNAMESE_VOICE_MANIFEST.common[key], text,
})
const listenInstructionSegment = (text: string): VoiceSegment => ({
  src: VIETNAMESE_VOICE_MANIFEST.common.listenAndChoose, text, pauseAfterMs: 240,
})
const targetSegment = (type: VietnameseVoiceTargetType, target: string): VoiceSegment | undefined => {
  const src = resolveVietnameseTargetVoice(type, target)
  return src ? { src, text: target } : undefined
}
const buildVoiceSequence = (...segments: Array<VoiceSegment | undefined>): VoiceSegment[] | undefined => {
  const sequence = segments.filter((segment): segment is VoiceSegment => Boolean(segment))
  return sequence.length > 1 ? sequence : undefined
}

function createTemplates(): QuestionTemplate[] {
  const templates: QuestionTemplate[] = []
  const add = (goalKey: VietnameseWeek2Goal, sourceLesson: QuestionTemplate['sourceLesson'], variant: string,
    prompt: string, answer: string, displayText: string, distractors: readonly string[],
    voiceTargetType: VietnameseVoiceTargetType, voiceTarget = answer,
    questionType: QuestionTemplate['questionType'] = 'recognize', instruction = 'CHOOSE_ANSWER', skill: LearningSkill = 'reading',
    voiceSequence?: VoiceSegment[], data?: Record<string, unknown>, imageId?: Week2ImageId) => {
    templates.push({
      goalKey, sourceLesson, variant, prompt, answer, displayText, distractors,
      questionType, skill, inputMode: questionType === 'listen' ? 'audio' : questionType.startsWith('IMAGE_') ? 'image' : 'text', answerMode: 'select-text',
      instructionVoice: getVietnameseInstructionVoice(instruction),
      voice: resolveVietnameseTargetVoice(voiceTargetType, voiceTarget),
      voiceTargetType, voiceTarget, voiceSequence, imageId,
      data,
    })
  }
  const addLetterRecognition = (goal: VietnameseWeek2Goal, lesson: 6 | 7 | 8 | 9, letter: string, uppercase: string) => {
    add(goal, lesson, `recognize-${letter}`, VIETNAMESE_QUESTION_TEMPLATES.recognizeLetter(letter), letter, letter, letterDistractors(letter), 'letters', letter, 'recognize', 'CHOOSE_LETTER')
    add(goal, lesson, `match-${letter}`, VIETNAMESE_QUESTION_TEMPLATES.recognizeLetter(letter), letter, '?', letterDistractors(letter), 'letters', letter, 'matchSame', 'CHOOSE_LETTER')
    add(goal, lesson, `recognize-${letter}-in-row`, `Tìm chữ ${letter} trong dãy chữ`, letter, `${uppercase} · ${letter} · d · đ`, letterDistractors(letter), 'letters', letter, 'findInText', 'FIND_LETTER', 'reading', buildVoiceSequence(
      commonSegment('findLetter', 'Bé hãy tìm chữ'), targetSegment('letters', letter),
      commonSegment('inLetterRow', 'trong dãy chữ'),
    ))
  }
  const addCaseRecognition = (goal: VietnameseWeek2Goal, lesson: 6 | 7 | 8 | 9, letter: string, uppercase: string) => {
    add(goal, lesson, `case-${letter}-lower`, VIETNAMESE_QUESTION_TEMPLATES.matchLowercase(uppercase), letter, `${uppercase} → ?`, letterDistractors(letter), 'letters', uppercase, 'matchCase', 'CHOOSE_LETTER', 'reading', buildVoiceSequence(
      commonSegment('chooseLetter', 'Bé hãy chọn chữ'), commonSegment('lowerCaseOf', 'thường của'), targetSegment('letters', uppercase),
    ))
    add(goal, lesson, `case-${letter}-upper`, VIETNAMESE_QUESTION_TEMPLATES.matchUppercase(letter), uppercase, `${letter} → ?`, letterDistractors(uppercase), 'letters', letter, 'matchCase', 'CHOOSE_LETTER', 'reading', buildVoiceSequence(
      commonSegment('chooseLetter', 'Bé hãy chọn chữ'), commonSegment('upperCaseOf', 'hoa của'), targetSegment('letters', letter),
    ))
  }
  const addFindLetter = (goal: VietnameseWeek2Goal, lesson: 6 | 7 | 8 | 9, letter: string, examples: readonly { text: string; context?: 'tiếng' | 'câu'; sourceLesson?: 6 | 7 | 8 | 9 }[]) => {
    examples.forEach(({ text, context = 'tiếng', sourceLesson }, index) => {
      if (context !== 'tiếng') return
      const distractors = SYLLABLE_CHOICES.filter(candidate => candidate !== text && !containsVietnameseLetter(candidate, letter))
      const voiceSequence = buildVoiceSequence(
        commonSegment('chooseSyllableWith', 'Bé hãy chọn tiếng có chữ'), targetSegment('letters', letter),
      )
      add(goal, sourceLesson ?? lesson, `find-${letter}-${index}-${text.normalize('NFC')}`,
        VIETNAMESE_QUESTION_TEMPLATES.findSyllableWith(letter),
        text, letter, distractors, 'letters', letter, 'FIND_IN_CONTEXT', 'CHOOSE_SYLLABLE_WITH', 'reading', voiceSequence,
        { questionSemantics: 'contains-letter', targetLetter: letter, targetText: text, context, week: 2 })
    })
  }

  addLetterRecognition('RECOGNIZE_O', 6, 'o', 'O')
  addCaseRecognition('RECOGNIZE_O_CASE', 6, 'o', 'O')
  addFindLetter('FIND_O_IN_TEXT', 6, 'o', [
    { text: 'bò' }, { text: 'cò' }, { text: 'cỏ' },
  ])

  addLetterRecognition('RECOGNIZE_O_CIRCUMFLEX', 7, 'ô', 'Ô')
  addCaseRecognition('RECOGNIZE_O_CIRCUMFLEX_CASE', 7, 'ô', 'Ô')
  addFindLetter('FIND_O_CIRCUMFLEX_IN_TEXT', 7, 'ô', [
    { text: 'bố' }, { text: 'bộ' }, { text: 'cô' }, { text: 'cổ' },
  ])

  addLetterRecognition('RECOGNIZE_O_HORN', 9, 'ơ', 'Ơ')
  addCaseRecognition('RECOGNIZE_O_HORN_CASE', 9, 'ơ', 'Ơ')
  addFindLetter('FIND_O_HORN_IN_TEXT', 9, 'ơ', [
    { text: 'bờ' }, { text: 'cờ' }, { text: 'đỡ' },
  ])

  addLetterRecognition('RECOGNIZE_D', 8, 'd', 'D')
  addCaseRecognition('RECOGNIZE_D_CASE', 8, 'd', 'D')
  addFindLetter('FIND_D_IN_TEXT', 8, 'd', [
    { text: 'dê' },
  ])

  addLetterRecognition('RECOGNIZE_D_DBAR', 8, 'đ', 'Đ')
  addCaseRecognition('RECOGNIZE_D_DBAR_CASE', 8, 'đ', 'Đ')
  addFindLetter('FIND_D_DBAR_IN_TEXT', 8, 'đ', [
    { text: 'đa' }, { text: 'đá' }, { text: 'đỏ' },
  ])

  const addTone = (goal: VietnameseWeek2Goal, sourceLesson: 6 | 7 | 9, toneLabel: string,
    examples: readonly { answer: string; prompt?: string; sourceLesson?: 6 | 7 | 9 }[]) => examples.forEach(({ answer, prompt, sourceLesson: exampleLesson }, index) => add(
    goal, exampleLesson ?? sourceLesson, `tone-${toneLabel}-${index}-${answer}`, prompt ?? `Chọn tiếng có dấu ${toneLabel}`, answer, answer,
    syllableDistractors(answer).filter(candidate => toneOf(candidate) !== toneLabel), 'tones', `dấu ${toneLabel}`, 'recognize', 'CHOOSE_SYLLABLE_WITH_TONE',
  ))
  addTone('RECOGNIZE_HOI', 6, 'hỏi', [{ answer: 'cỏ' }, { answer: 'cổ', sourceLesson: 7 }])
  addTone('RECOGNIZE_NANG', 7, 'nặng', [{ answer: 'bộ' }, { answer: 'bộ', prompt: 'Tiếng nào mang dấu nặng?' }])
  addTone('RECOGNIZE_NGA', 9, 'ngã', [{ answer: 'đỡ' }, { answer: 'đỡ', prompt: 'Tiếng nào mang dấu ngã?' }])

  const addSyllableGroup = (goal: VietnameseWeek2Goal, sourceLesson: 6 | 7 | 8 | 9, syllables: readonly string[]) => syllables.forEach((syllable, index) => add(
    goal, sourceLesson, `read-syllable-${syllable}-${index}`, 'Chọn tiếng theo âm thanh.', syllable, '🔊',
    syllableDistractors(syllable), 'syllables', syllable, 'listen', 'LISTEN_AND_CHOOSE', 'listening',
    buildVoiceSequence(listenInstructionSegment('Bé hãy nghe và chọn'), targetSegment('syllables', syllable)),
    { knowledgeType: 'syllable', targetText: syllable, week: 2 },
  ))
  addSyllableGroup('READ_O_SYLLABLES', 6, ['bò', 'cò', 'cỏ'])
  addSyllableGroup('READ_O_CIRCUMFLEX_SYLLABLES', 7, ['bố', 'bộ', 'cô', 'cổ'])
  addSyllableGroup('READ_D_SYLLABLES', 8, ['dê'])
  addSyllableGroup('READ_D_DBAR_SYLLABLES', 8, ['đa', 'đá', 'đỏ'])
  addSyllableGroup('READ_O_HORN_SYLLABLES', 9, ['bờ', 'cờ', 'đỡ'])

  const words: readonly { sourceLesson: 7 | 8 | 9; phrase: string; target: string }[] = [
    { sourceLesson: 7, phrase: 'cô bé', target: 'cô' }, { sourceLesson: 7, phrase: 'cổ cò', target: 'cổ' },
    { sourceLesson: 8, phrase: 'đá dế', target: 'đá' }, { sourceLesson: 8, phrase: 'đa đa', target: 'đa' },
    { sourceLesson: 7, phrase: 'ô đỏ', target: 'ô' }, { sourceLesson: 9, phrase: 'bờ đê', target: 'bờ' },
    { sourceLesson: 9, phrase: 'cá cờ', target: 'cờ' }, { sourceLesson: 9, phrase: 'đỡ bé', target: 'đỡ' },
    { sourceLesson: 9, phrase: 'cờ đỏ', target: 'cờ' }, { sourceLesson: 9, phrase: 'đỡ bà', target: 'đỡ' },
  ]
  words.forEach(({ sourceLesson, phrase, target }, index) => add(
    'READ_WORDS_WEEK_2', sourceLesson, `read-word-${index}-${phrase}`, `Tìm tiếng “${target}” trong cụm từ “${phrase}”`, target, phrase,
    syllableDistractors(target), 'words', phrase, 'readWord', 'FIND_SYLLABLE', 'reading', buildVoiceSequence(
      commonSegment('findSyllable', 'Bé hãy tìm tiếng'), targetSegment('syllables', target),
      commonSegment('inPhrase', 'trong cụm từ'), targetSegment('words', phrase),
    ),
  ))

  WEEK_2_SENTENCES.forEach(({ sourceLesson, text, target, targetType }, index) => {
    const isLetter = targetType === 'letters'
    add('READ_SENTENCES_WEEK_2', sourceLesson, `read-sentence-${index}`, `Tìm ${isLetter ? 'chữ' : 'tiếng'} “${target}” trong câu: “${text}”`, target, text,
      isLetter ? letterDistractors(target) : syllableDistractors(target), 'sentences', text, 'readSentence', isLetter ? 'FIND_LETTER' : 'FIND_SYLLABLE', 'reading', buildVoiceSequence(
        commonSegment(isLetter ? 'findLetter' : 'findSyllable', isLetter ? 'Bé hãy tìm chữ' : 'Bé hãy tìm tiếng'),
        targetSegment(targetType, target), commonSegment('inSentence', 'trong câu'), targetSegment('sentences', text),
      ))
  })

  for (const item of WEEK_2_IMAGE_KNOWLEDGE) {
    const sprite = getWeek2SpriteById(item.imageId)
    if (!sprite) throw new Error(`Week 2 image question has no sprite: ${item.imageId}`)
    const targetVoice = targetSegment(item.targetType, item.targetText)
    if (!targetVoice) throw new Error(`Week 2 image question has no exact target recording: ${item.targetText}`)
    const isVowel = item.feature.type === 'vowel'
    const answer = item.feature.value
    add(item.learningKey, item.sourceLesson, `image-${item.feature.type}-${item.imageId}`,
      isVowel ? 'Chọn nguyên âm có trong tên hình.' : 'Chọn phụ âm đầu của tên hình.',
      answer, '', letterDistractors(answer), item.targetType, item.targetText,
      isVowel ? 'IMAGE_CHOOSE_VOWEL' : 'IMAGE_CHOOSE_ONSET', 'CHOOSE_LETTER', 'reading',
      buildVoiceSequence(commonSegment('chooseLetter', 'Bé hãy chọn chữ'), targetVoice),
      { knowledgeType: 'imageWord', targetText: item.targetText, targetLetter: answer,
        ...(isVowel ? { vowel: answer } : { onset: answer }), imageId: item.imageId, week: 2 },
      sprite.id,
    )
  }

  return templates
}

function combinations(values: readonly string[], size: number): string[][] {
  if (size === 0) return [[]]
  return values.flatMap((value, index) => combinations(values.slice(index + 1), size - 1).map(rest => [value, ...rest]))
}

function distractorSet(template: QuestionTemplate) {
  // Keep the option pools focused and avoid exploding the precomputed combination count.
  const offset = Array.from(template.variant).reduce((sum, char) => sum + char.charCodeAt(0), 0) % template.distractors.length
  return [...template.distractors.slice(offset), ...template.distractors.slice(0, offset)].slice(0, 8)
}

export function createQuestionPool(game: VietnameseWeek2Game): VietnameseWeek2Question[] {
  return createTemplates().flatMap(template => {
    const distractors = distractorSet(template).filter(value => value !== template.answer)
    const { distractors: _unused, voiceTargetType: _type, voiceTarget: _target, ...questionTemplate } = template
    const sizes = game === 'drag-drop' ? [5] : game === 'gold-mining' ? [3] : game === 'racing' ? [2] : [2, 3]
    return sizes.filter(size => distractors.length >= size)
      .flatMap(size => combinations(distractors, size).map(wrong => normalizeVietnameseQuestion({
        ...questionTemplate,
        id: `${game}:week-2:${questionTemplate.goalKey}:${questionTemplate.variant}:${wrong.join('-')}`,
        options: [questionTemplate.answer, ...wrong],
      })))
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

type GenerateOptions = { random?: () => number; previousIds?: readonly string[] }

/** Every play samples one fresh, varied question for each of the 25 Week 2 goals. */
export function generateQuestionSet(game: VietnameseWeek2Game, options: GenerateOptions = {}): VietnameseWeek2Question[] {
  const random = options.random ?? Math.random
  const pool = createQuestionPool(game)
  const previous = new Set(options.previousIds)
  const goals = shuffle(Object.keys(DEFAULT_GOAL_COUNTS[game]) as VietnameseWeek2Goal[], random)
  const usedVariants = new Set<string>()
  const questions = goals.map(goal => {
    const candidates = pool.filter(question => question.goalKey === goal && !usedVariants.has(question.variant))
    const fresh = candidates.filter(question => !previous.has(question.id))
    const available = fresh.length ? fresh : candidates
    const selected = available[Math.floor(random() * available.length)]
    if (!selected) throw new Error(`Question pool exhausted for ${game}/${goal}`)
    usedVariants.add(selected.variant)
    return { ...selected, options: shuffle(selected.options, random) }
  })
  return questions
}

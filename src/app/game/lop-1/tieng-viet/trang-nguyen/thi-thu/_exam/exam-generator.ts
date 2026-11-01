import { ANIMATED_FRUIT_MOCK_EXAM_VERSION, EXPANDED_GROUPS_MOCK_EXAM_VERSION, LEGACY_MOCK_EXAM_VERSION, MOCK_EXAM_DURATION_SECONDS, MOCK_EXAM_ID, MOCK_EXAM_QUESTION_COUNT, MOCK_EXAM_TITLE, MOCK_EXAM_VERSION, OLDER_MOCK_EXAM_VERSION, PREVIOUS_MOCK_EXAM_VERSION, RANDOMIZED_GROUP5_MOCK_EXAM_VERSION, SCHOOL_EVENT_MOCK_EXAM_VERSION, isSupportedMockExamVersion } from './config'
import { createSeededRandom, shuffle, stableHash } from './shuffle'
import {
  TONE_LABELS,
  TONE_SYLLABLE_BANK,
  TONE_QUESTION_VOICE_END,
  TONE_QUESTION_VOICE_START,
  TONE_VOICE_MAP,
  VIETNAMESE_TONES,
  validateFindLettersInImageQuestion,
  validateFindFlowerByImageQuestion,
  validateRecognizeNumberOnCardQuestion,
  validateFillLetterInBlankQuestion,
  validateCountTargetLetterQuestion,
  validateFindHiddenLetterQuestion,
  validateRotatedLetterQuestion,
  validateSameLetterTwoGroupsQuestion,
  validateLowerUpperMatchQuestion,
  validateImageWithSoundMatchQuestion,
  validateObjectImageWithAudioQuestion,
  validateSharedNumberLetterQuestion,
  validateCategoryPairClassificationQuestion,
  validateAlphabetOrderQuestion,
  validateVehicleOrderQuestion,
  validateFindObjectByNameQuestion,
  validateFindAnimalByNameQuestion,
  validateFindNamedImageByNameQuestion,
  HEAR_IDENTIFY_COMMON_VOICE,
  HEAR_IDENTIFY_LETTERS,
  HEAR_IDENTIFY_VOICE_MAP,
  generateHearIdentifyQuestions,
  resolveToneSyllableVoice,
  toneOptionId,
  validateCommonSoundQuestion,
  validateImageWordAnalysisQuestion,
  validateImageResemblesLetterQuestion,
  validateQuestion30,
  validateQuestion24,
  validateQuestion33,
  generateQuestion33,
  validateQuestion34,
  generateQuestion34,
  generateIdentifySchoolEventQuestion,
  generateFindNamedImageByNameQuestion,
  validateIdentifySchoolEventQuestion,
  generateFindLetterPairInAnimalNameQuestion,
  validateFindLetterPairInAnimalNameQuestion,
  TEMPLATE_GENERATORS,
  type QuestionGenerationContext,
} from './question-generators'
import type { ExamDefinition, GeneratedExamDefinition, GeneratedExamQuestion } from './types'

const BLOCK_SIZE = 5
const BLOCK_COUNT = 6
const FIRST_GROUP_TEMPLATES = new Set(['T01', 'T02', 'T03', 'T04', 'T05', 'T31'])
const SECOND_GROUP_TEMPLATES = new Set(['T06', 'T07', 'T08', 'T09', 'T10', 'T32'])
const FOURTH_GROUP_TEMPLATES = new Set(['T16', 'T17', 'T18', 'T19', 'T20', 'T34'])
const FIFTH_GROUP_TEMPLATES = new Set(['T21', 'T22', 'T23', 'T24', 'T25', 'T33'])

function usesExpandedFirstGroup(version: string): boolean {
  return version === SCHOOL_EVENT_MOCK_EXAM_VERSION || version === ANIMATED_FRUIT_MOCK_EXAM_VERSION
    || version === RANDOMIZED_GROUP5_MOCK_EXAM_VERSION || version === EXPANDED_GROUPS_MOCK_EXAM_VERSION
    || version === MOCK_EXAM_VERSION
}

function usesExpandedSecondGroup(version: string): boolean {
  return version === ANIMATED_FRUIT_MOCK_EXAM_VERSION || version === RANDOMIZED_GROUP5_MOCK_EXAM_VERSION
    || version === EXPANDED_GROUPS_MOCK_EXAM_VERSION || version === MOCK_EXAM_VERSION
}

function usesExpandedFourthGroup(version: string): boolean {
  return version === MOCK_EXAM_VERSION
}

function usesExpandedFifthGroup(version: string): boolean {
  return version === RANDOMIZED_GROUP5_MOCK_EXAM_VERSION || version === EXPANDED_GROUPS_MOCK_EXAM_VERSION
    || version === MOCK_EXAM_VERSION
}

function templateGroup(templateId: string): number | undefined {
  if (templateId === 'T31') return 0
  if (templateId === 'T32') return 1
  if (templateId === 'T34') return 3
  if (templateId === 'T33') return 4
  const templateNumber = Number(templateId.slice(1))
  if (!Number.isInteger(templateNumber) || templateNumber < 1 || templateNumber > MOCK_EXAM_QUESTION_COUNT) return undefined
  return Math.floor((templateNumber - 1) / BLOCK_SIZE)
}

export function validateGeneratedExam(exam: GeneratedExamDefinition): void {
  if (exam.questions.length !== MOCK_EXAM_QUESTION_COUNT) throw new Error('A Trang Nguyên exam must contain exactly 30 questions')
  const hasExpandedFirstGroup = usesExpandedFirstGroup(exam.examVersion)
  const hasExpandedSecondGroup = usesExpandedSecondGroup(exam.examVersion)
  const hasExpandedFourthGroup = usesExpandedFourthGroup(exam.examVersion)
  const hasExpandedFifthGroup = usesExpandedFifthGroup(exam.examVersion)
  const questionByTemplate = new Map<string, GeneratedExamQuestion>(
    exam.questions.map(question => [question.templateId, question] as const),
  )
  const expectedGenerators: Record<string, string> = {
    T02: 'FIND_TARGET_LETTER_IN_OBJECT_IMAGE',
    T03: 'HEAR_AND_IDENTIFY_LETTER',
    T04: 'HEAR_AND_IDENTIFY_LETTER',
    T06: 'IDENTIFY_TONE_FROM_SYLLABLE',
    T08: 'FIND_OBJECT_BY_NAME',
    T09: 'FIND_FLOWER_BY_IMAGE',
    T10: 'RECOGNIZE_LETTERS_IN_IMAGE',
    T11: 'RECOGNIZE_NUMBER_ON_CARD',
    T12: 'FILL_LETTER_IN_BLANK',
    T13: 'COUNT_TARGET_LETTER',
    T14: 'FIND_HIDDEN_LETTER',
    T15: 'ROTATED_LETTER_INPUT',
    T16: 'MATCH_SAME_LETTER_TWO_GROUPS',
    T17: 'MATCH_LOWER_UPPER_CASE',
    T18: 'MATCH_IMAGE_WITH_SOUND',
    T19: 'MATCH_OBJECT_WITH_NAME',
    T20: 'CLASSIFY_NUMBER_AND_LETTER',
    T34: 'ANIMAL_PERCHED_ON_FLOWER_LETTER',
    T33: 'ANIMATED_GIRL_HARVEST_FRUIT',
  }
  for (const [templateId, generator] of Object.entries(expectedGenerators)) {
    const question = questionByTemplate.get(templateId)
    const optionalExpandedGroupTemplate = (hasExpandedFirstGroup && FIRST_GROUP_TEMPLATES.has(templateId))
      || (hasExpandedSecondGroup && SECOND_GROUP_TEMPLATES.has(templateId))
      || (hasExpandedFourthGroup && FOURTH_GROUP_TEMPLATES.has(templateId))
      || (hasExpandedFifthGroup && FIFTH_GROUP_TEMPLATES.has(templateId))
    if (!question && (optionalExpandedGroupTemplate || (templateId === 'T34' && !hasExpandedFourthGroup))) continue
    if (question?.data?.generator !== generator)
      throw new Error(`${templateId} must use ${generator}`)
  }
  const question7 = questionByTemplate.get('T07')
  const expectedQuestion7Generator = exam.examVersion === MOCK_EXAM_VERSION || exam.examVersion === EXPANDED_GROUPS_MOCK_EXAM_VERSION || exam.examVersion === RANDOMIZED_GROUP5_MOCK_EXAM_VERSION || exam.examVersion === ANIMATED_FRUIT_MOCK_EXAM_VERSION
    ? 'FIND_NAMED_IMAGE_BY_NAME' : 'FIND_ANIMAL_BY_NAME'
  if (question7 && question7.data?.generator !== expectedQuestion7Generator)
    throw new Error(`T07 must use ${expectedQuestion7Generator} for exam version ${exam.examVersion}`)
  if (questionByTemplate.has('T31') && questionByTemplate.get('T31')?.data?.generator !== 'IDENTIFY_SCHOOL_EVENT')
    throw new Error('T31 must use IDENTIFY_SCHOOL_EVENT')
  if (questionByTemplate.has('T32') && questionByTemplate.get('T32')?.data?.generator !== 'FIND_LETTER_PAIR_IN_ANIMAL_NAME')
    throw new Error('T32 must use FIND_LETTER_PAIR_IN_ANIMAL_NAME')
  if (questionByTemplate.has('T33') && questionByTemplate.get('T33')?.data?.generator !== 'ANIMATED_GIRL_HARVEST_FRUIT')
    throw new Error('T33 must use ANIMATED_GIRL_HARVEST_FRUIT')
  if (questionByTemplate.has('T34')) validateQuestion34(questionByTemplate.get('T34') as GeneratedExamQuestion)
  const question3Target = questionByTemplate.get('T03')?.data?.target
  const question4Target = questionByTemplate.get('T04')?.data?.target
  if ((!hasExpandedFirstGroup && (!question3Target || !question4Target))
    || (question3Target && question4Target && question3Target === question4Target))
    throw new Error('Questions 3 and 4 must have different HEAR_AND_IDENTIFY_LETTER targets')

  const templateCounts = new Map<string, number>()
  const questionIds = new Set<string>()
  for (let index = 0; index < exam.questions.length; index += 1) {
    const question = exam.questions[index]
    templateCounts.set(question.templateId, (templateCounts.get(question.templateId) ?? 0) + 1)
    if (question.number !== index + 1 || templateGroup(question.templateId) !== Math.floor(index / BLOCK_SIZE)
      || (question.templateId === 'T31' && !hasExpandedFirstGroup)
      || (question.templateId === 'T32' && !hasExpandedSecondGroup)
      || (question.templateId === 'T33' && !hasExpandedFifthGroup)
      || (question.templateId === 'T34' && !hasExpandedFourthGroup))
      throw new Error(`Question ${index + 1} must use a template from its assigned five-question group`)
    if (questionIds.has(question.id)) throw new Error(`Duplicate question id: ${question.id}`)
    questionIds.add(question.id)
    validateGeneratedQuestion(question)
  }

  for (let block = 0; block < BLOCK_COUNT; block += 1) {
    const actual = new Set(exam.questions.slice(block * BLOCK_SIZE, (block + 1) * BLOCK_SIZE).map(question => question.templateId))
    const expected = block === 0
      ? hasExpandedFirstGroup ? FIRST_GROUP_TEMPLATES : new Set(['T01', 'T02', 'T03', 'T04', 'T05'])
      : block === 1
        ? hasExpandedSecondGroup ? SECOND_GROUP_TEMPLATES : new Set(['T06', 'T07', 'T08', 'T09', 'T10'])
        : block === 3 && hasExpandedFourthGroup
          ? FOURTH_GROUP_TEMPLATES
        : block === 4 && hasExpandedFifthGroup
          ? FIFTH_GROUP_TEMPLATES
          : new Set(Array.from({ length: BLOCK_SIZE }, (_, index) => `T${String(block * BLOCK_SIZE + index + 1).padStart(2, '0')}`))
    if (actual.size !== BLOCK_SIZE || Array.from(actual).some(templateId => !expected.has(templateId)))
      throw new Error(`Block ${block + 1} must contain five eligible templates`)
  }
  for (let template = 1; template <= MOCK_EXAM_QUESTION_COUNT; template += 1) {
    const templateId = `T${String(template).padStart(2, '0')}`
    const count = templateCounts.get(templateId) ?? 0
    const optionalGroupTemplate = (template <= BLOCK_SIZE && hasExpandedFirstGroup)
      || (template > BLOCK_SIZE && template <= BLOCK_SIZE * 2 && hasExpandedSecondGroup)
      || (template > BLOCK_SIZE * 3 && template <= BLOCK_SIZE * 4 && hasExpandedFourthGroup)
      || (template >= BLOCK_SIZE * 4 + 1 && template <= BLOCK_SIZE * 5 && hasExpandedFifthGroup)
    if (!optionalGroupTemplate && count !== 1)
      throw new Error(`${templateId} must appear exactly once`)
    if (optionalGroupTemplate && count > 1)
      throw new Error(`${templateId} may appear at most once`)
  }
  if ((templateCounts.get('T31') ?? 0) > 1 || (!hasExpandedFirstGroup && templateCounts.has('T31')))
    throw new Error('T31 may appear only once in the current exam version')
  if (hasExpandedFirstGroup && Array.from(FIRST_GROUP_TEMPLATES).filter(templateId => (templateCounts.get(templateId) ?? 0) === 1).length !== BLOCK_SIZE)
    throw new Error('The first question group must contain a random selection of five out of six templates')
  if ((templateCounts.get('T32') ?? 0) > 1 || (!hasExpandedSecondGroup && templateCounts.has('T32')))
    throw new Error('T32 may appear only once in the current exam version')
  if (hasExpandedSecondGroup && Array.from(SECOND_GROUP_TEMPLATES).filter(templateId => (templateCounts.get(templateId) ?? 0) === 1).length !== BLOCK_SIZE)
    throw new Error('The second question group must contain a random selection of five out of six templates')
  if ((templateCounts.get('T34') ?? 0) > 1 || (!hasExpandedFourthGroup && templateCounts.has('T34')))
    throw new Error('T34 may appear only once in the fourth group of the current exam version')
  if (hasExpandedFourthGroup && Array.from(FOURTH_GROUP_TEMPLATES).filter(templateId => (templateCounts.get(templateId) ?? 0) === 1).length !== BLOCK_SIZE)
    throw new Error('The fourth question group must contain a random selection of five out of six templates')
  if ((templateCounts.get('T33') ?? 0) > 1 || (!hasExpandedFifthGroup && templateCounts.has('T33')))
    throw new Error('T33 may appear only once in the current exam version')
  if (hasExpandedFifthGroup && Array.from(FIFTH_GROUP_TEMPLATES).filter(templateId => (templateCounts.get(templateId) ?? 0) === 1).length !== BLOCK_SIZE)
    throw new Error('The fifth question group must contain a random selection of five out of six templates')
}

function validateGeneratedQuestion(question: GeneratedExamQuestion) {
  const options = question.options ?? []
  const optionIds = options.map(option => option.id)
  if (new Set(optionIds).size !== optionIds.length) throw new Error(`${question.templateId} has duplicate option ids`)
  const optionValues = options.map(option => option.text?.normalize('NFC').toLocaleLowerCase('vi-VN')).filter(Boolean)
  if (new Set(optionValues).size !== optionValues.length) throw new Error(`${question.templateId} has duplicate option text`)

  if (question.data?.generator === 'HEAR_AND_IDENTIFY_LETTER') {
    const target = question.data.target
    const values = options.map(option => option.text)
    const promptVoice = question.promptVoice
    if (question.type !== 'audio-choice' || options.length !== 4 || typeof target !== 'string'
      || !HEAR_IDENTIFY_LETTERS.includes(target as typeof HEAR_IDENTIFY_LETTERS[number])
      || values.filter(value => value === `Chữ "${target}"`).length !== 1
      || values.includes('Chữ "g"') && values.includes('Chữ "gh"')
      || values.includes('Chữ "ng"') && values.includes('Chữ "ngh"')
      || !Array.isArray(promptVoice) || promptVoice.length !== 2
      || promptVoice[0] !== HEAR_IDENTIFY_COMMON_VOICE
      || promptVoice[1] !== HEAR_IDENTIFY_VOICE_MAP[target as keyof typeof HEAR_IDENTIFY_VOICE_MAP])
      throw new Error(`${question.templateId} has invalid HEAR_AND_IDENTIFY_LETTER data, choices, or voice sequence`)
  }

  if (question.data?.generator === 'IDENTIFY_TONE_FROM_SYLLABLE') {
    const target = question.data.target as { text?: unknown; tone?: unknown; voice?: unknown; voicePath?: unknown } | undefined
    const bankTarget = TONE_SYLLABLE_BANK.find(item => item.text === target?.text)
    const targetTone = target?.tone as typeof VIETNAMESE_TONES[number] | undefined
    const targetVoice = typeof target?.voice === 'string' ? target.voice : undefined
    const optionsByTone = new Map(VIETNAMESE_TONES.map(tone => [tone, options.find(option => option.id === toneOptionId(tone))]))
    const promptVoice = question.promptVoice
    const expectedPromptVoice = bankTarget && targetVoice ? [TONE_QUESTION_VOICE_START, resolveToneSyllableVoice(targetVoice), TONE_QUESTION_VOICE_END] : []
    if (question.type !== 'audio-choice' || !bankTarget || bankTarget.tone !== targetTone || bankTarget.voice !== targetVoice
      || target?.voicePath !== expectedPromptVoice[1]
      || question.prompt !== `Tiếng "${String(target?.text)}" mang thanh gì?`
      || options.length !== 4 || optionsByTone.size !== 6
      || options.some(option => {
        const tone = VIETNAMESE_TONES.find(candidate => toneOptionId(candidate) === option.id)
        return !tone || option.text !== TONE_LABELS[tone] || option.voice !== TONE_VOICE_MAP[tone]
      })
      || !targetTone || !optionsByTone.get(targetTone)
      || question.correctAnswer !== toneOptionId(targetTone)
      || !Array.isArray(promptVoice) || promptVoice.length !== 3
      || promptVoice.some((file, index) => file !== expectedPromptVoice[index]))
      throw new Error(`${question.templateId} has invalid IDENTIFY_TONE_FROM_SYLLABLE data, choices, or voice sequence`)
  }

  if (question.data?.generator === 'FIND_ANIMAL_BY_NAME') validateFindAnimalByNameQuestion(question)
  if (question.data?.generator === 'FIND_NAMED_IMAGE_BY_NAME') validateFindNamedImageByNameQuestion(question)
  if (question.data?.generator === 'FIND_OBJECT_BY_NAME') validateFindObjectByNameQuestion(question)
  if (question.data?.generator === 'FIND_FLOWER_BY_IMAGE') validateFindFlowerByImageQuestion(question)
  if (question.data?.generator === 'RECOGNIZE_LETTERS_IN_IMAGE') validateFindLettersInImageQuestion(question)
  if (question.data?.generator === 'RECOGNIZE_NUMBER_ON_CARD') validateRecognizeNumberOnCardQuestion(question)
  if (question.data?.generator === 'FILL_LETTER_IN_BLANK') validateFillLetterInBlankQuestion(question)
  if (question.data?.generator === 'COUNT_TARGET_LETTER') validateCountTargetLetterQuestion(question)
  if (question.data?.generator === 'FIND_HIDDEN_LETTER') validateFindHiddenLetterQuestion(question)
  if (question.data?.generator === 'ROTATED_LETTER_INPUT') validateRotatedLetterQuestion(question)
  if (question.data?.generator === 'MATCH_SAME_LETTER_TWO_GROUPS') validateSameLetterTwoGroupsQuestion(question)
  if (question.data?.generator === 'MATCH_LOWER_UPPER_CASE') validateLowerUpperMatchQuestion(question)
  if (question.data?.generator === 'MATCH_IMAGE_WITH_SOUND') validateImageWithSoundMatchQuestion(question)
  if (question.data?.generator === 'MATCH_OBJECT_WITH_NAME') validateObjectImageWithAudioQuestion(question)
  if (question.data?.generator === 'ANALYZE_WORD_FROM_IMAGE') validateImageWordAnalysisQuestion(question)
  if (question.data?.generator === 'FIND_COMMON_SOUND') validateCommonSoundQuestion(question)
  if (question.data?.generator === 'IDENTIFY_SCHOOL_EVENT') validateIdentifySchoolEventQuestion(question)
  if (question.data?.generator === 'FIND_LETTER_PAIR_IN_ANIMAL_NAME') validateFindLetterPairInAnimalNameQuestion(question)
  if (question.data?.generator === 'IMAGE_RESEMBLES_LETTER') validateImageResemblesLetterQuestion(question)
  if (question.data?.generator === 'FILL_FRUIT_COLOR_LETTER') validateQuestion30(question)
  if (question.data?.generator === 'ANIMATED_ACTOR_TO_LETTER_TARGET') validateQuestion24(question)
  if (question.data?.generator === 'ANIMATED_GIRL_HARVEST_FRUIT') validateQuestion33(question)

  if (['single-choice', 'image-choice', 'audio-choice', 'video-select', 'animated-select'].includes(question.type)) {
    if (typeof question.correctAnswer !== 'string' || !optionIds.includes(question.correctAnswer))
      throw new Error(`${question.templateId} must have one correct choice`)
  } else if (question.type === 'multi-select') {
    if (!Array.isArray(question.correctAnswer) || question.correctAnswer.length < 2 || new Set(question.correctAnswer).size !== question.correctAnswer.length
      || question.correctAnswer.some(id => !optionIds.includes(id)))
      throw new Error(`${question.templateId} must have multiple correct choices in its options`)
  } else if (question.type === 'matching' || question.type === 'drag-match') {
    const pairs = question.correctAnswer as Record<string, string>
    const data = question.data as { leftItems?: Array<{ id: string }>; rightItems?: Array<{ id: string }> } | undefined
    const leftIds = new Set(data?.leftItems?.map(item => item.id) ?? [])
    const rightIds = new Set(data?.rightItems?.map(item => item.id) ?? [])
    if (!pairs || typeof pairs !== 'object' || Object.keys(pairs).length !== leftIds.size
      || Object.keys(pairs).some(id => !leftIds.has(id)) || Object.values(pairs).some(id => !rightIds.has(id))
      || new Set(Object.values(pairs)).size !== Object.keys(pairs).length)
      throw new Error(`${question.templateId} has duplicate matching targets`)
  } else if (question.type === 'sorting') {
    const items = question.data?.items as Array<{ id: string }> | undefined
    const answer = question.correctAnswer
    if (!Array.isArray(answer) || !items || answer.length !== items.length
      || new Set(answer).size !== items.length || items.some(item => !answer.includes(item.id)))
      throw new Error(`${question.templateId} sorting answer must contain its exact item set`)
    if (question.data?.generator === 'ORDER_VIETNAMESE_ALPHABET') validateAlphabetOrderQuestion(question)
    if (question.data?.generator === 'ORDER_VEHICLES') validateVehicleOrderQuestion(question)
  } else if (question.type === 'categorize') {
    const items = question.data?.items as Array<{ id: string }> | undefined
    const groups = question.data?.groups as Array<{ id: string }> | undefined
    const mapping = question.correctAnswer as Record<string, string>
    if (!items || !groups || !mapping || items.length !== Object.keys(mapping).length
      || items.some(item => !groups.some(group => group.id === mapping[item.id])))
      throw new Error(`${question.templateId} has an invalid category mapping`)
    if (question.data?.generator === 'CLASSIFY_NUMBER_AND_LETTER') validateSharedNumberLetterQuestion(question)
    if (question.data?.generator === 'CLASSIFY_CATEGORY_PAIRS') validateCategoryPairClassificationQuestion(question)
  } else if (question.type === 'drag-to-slot') {
    const slots = question.data?.slots as Array<{ id: string }> | undefined
    const items = question.data?.items as Array<{ id: string }> | undefined
    const mapping = question.correctAnswer as Record<string, string>
    if (!slots || !items || !mapping || slots.length !== Object.keys(mapping).length
      || slots.some(slot => !items.some(item => item.id === mapping[slot.id]))
      || new Set(Object.values(mapping)).size !== Object.values(mapping).length)
      throw new Error(`${question.templateId} has an invalid drag-to-slot mapping`)
  } else if (question.type === 'drag-fill') {
    const items = question.data?.items as Array<{ id: string }> | undefined
    const letterBank = question.data?.letterBank as string[] | undefined
    const mapping = question.correctAnswer as Record<string, string>
    const itemIds = new Set(items?.map(item => item.id) ?? [])
    if (!items || items.length !== 3 || !letterBank || !mapping || Object.keys(mapping).length !== itemIds.size
      || Object.keys(mapping).some(id => !itemIds.has(id))
      || Object.values(mapping).some(letter => !letterBank.includes(letter))
      || new Set(Object.values(mapping)).size !== Object.keys(mapping).length)
      throw new Error(`${question.templateId} has an invalid drag-fill mapping`)
  } else if (question.type === 'select-input') {
    const choices = question.data?.choices as string[] | undefined
    if (typeof question.correctAnswer !== 'string' || !choices?.includes(question.correctAnswer))
      throw new Error(`${question.templateId} must have a correct value in its select choices`)
  } else if (question.type === 'text-input') {
    if (typeof question.correctAnswer !== 'string' || question.correctAnswer.length === 0)
      throw new Error(`${question.templateId} must have one text answer`)
  } else if (question.type === 'number-input') {
    if (typeof question.correctAnswer !== 'string' || !/^\d+$/.test(question.correctAnswer))
      throw new Error(`${question.templateId} must have one numeric answer`)
  } else if (question.type === 'hidden-letter-input') {
    if (typeof question.correctAnswer !== 'string' || Array.from(question.correctAnswer.normalize('NFC')).length !== 1)
      throw new Error(`${question.templateId} must have one hidden letter answer`)
  } else if (question.type === 'rotated-letter-input') {
    const allowedLetters = question.data?.allowedLetters as string[] | undefined
    const answer = typeof question.correctAnswer === 'string'
      ? question.correctAnswer.normalize('NFC').toLocaleLowerCase('vi-VN') : ''
    if (typeof question.correctAnswer !== 'string' || Array.from(answer).length !== 1 || !allowedLetters?.includes(answer))
      throw new Error(`${question.templateId} must have one valid rotated letter answer`)
  }
}

export function generateMockTrangNguyenExam(args: { seed: string; examVersion?: string }): GeneratedExamDefinition {
  const examVersion = args.examVersion ?? MOCK_EXAM_VERSION
  if (!isSupportedMockExamVersion(examVersion)) throw new Error(`Unsupported exam version: ${examVersion}`)
  // Keep v20 reproducible so attempts already in progress can still be validated after deployment.
  const legacyRandom = examVersion === LEGACY_MOCK_EXAM_VERSION
    ? createSeededRandom(`${examVersion}:fixed-question-set`)
    : undefined
  const contentVersion = examVersion === MOCK_EXAM_VERSION || examVersion === EXPANDED_GROUPS_MOCK_EXAM_VERSION || examVersion === RANDOMIZED_GROUP5_MOCK_EXAM_VERSION || examVersion === ANIMATED_FRUIT_MOCK_EXAM_VERSION || examVersion === SCHOOL_EVENT_MOCK_EXAM_VERSION || examVersion === PREVIOUS_MOCK_EXAM_VERSION
    ? OLDER_MOCK_EXAM_VERSION : examVersion
  const keepsRandomQuestionOrder = examVersion === MOCK_EXAM_VERSION || examVersion === EXPANDED_GROUPS_MOCK_EXAM_VERSION || examVersion === RANDOMIZED_GROUP5_MOCK_EXAM_VERSION || examVersion === ANIMATED_FRUIT_MOCK_EXAM_VERSION || examVersion === SCHOOL_EVENT_MOCK_EXAM_VERSION || examVersion === PREVIOUS_MOCK_EXAM_VERSION
  const randomForTemplate = (templateNumber: number) => legacyRandom
    ?? createSeededRandom(`${contentVersion}:${args.seed}:T${String(templateNumber).padStart(2, '0')}`)
  const seedHash = stableHash(args.seed)
  const questions: GeneratedExamQuestion[] = []
  const generationContext: QuestionGenerationContext = { recentQuestionKeys: {} }

  for (let block = 0; block < BLOCK_COUNT; block += 1) {
    const generators = TEMPLATE_GENERATORS.slice(block * BLOCK_SIZE, (block + 1) * BLOCK_SIZE)
    const generated: GeneratedExamQuestion[] = []
    for (let index = 0; index < generators.length; index += 1) {
      if (block === 0 && index === 2) {
        generated.push(...generateHearIdentifyQuestions({ seedHash, random: randomForTemplate(3) }))
        index += 1
      } else {
        const templateNumber = block * BLOCK_SIZE + index + 1
        if (templateNumber === 7 && (examVersion === MOCK_EXAM_VERSION || examVersion === EXPANDED_GROUPS_MOCK_EXAM_VERSION || examVersion === RANDOMIZED_GROUP5_MOCK_EXAM_VERSION || examVersion === ANIMATED_FRUIT_MOCK_EXAM_VERSION)) {
          generated.push(generateFindNamedImageByNameQuestion({ seedHash, random: randomForTemplate(templateNumber) }))
        } else {
          generated.push(generators[index](seedHash, randomForTemplate(templateNumber), generationContext))
        }
      }
    }
    if (block === 0 && usesExpandedFirstGroup(examVersion)) {
      generated.push(generateIdentifySchoolEventQuestion({ seedHash, random: randomForTemplate(31) }))
      generated.splice(0, generated.length, ...shuffle(
        generated,
        createSeededRandom(`${examVersion}:${args.seed}:question-order:group-${block + 1}`),
      ).slice(0, BLOCK_SIZE))
    } else if (block === 1 && usesExpandedSecondGroup(examVersion)) {
      generated.push(generateFindLetterPairInAnimalNameQuestion({ seedHash, random: randomForTemplate(32) }))
      generated.splice(0, generated.length, ...shuffle(
        generated,
        createSeededRandom(`${examVersion}:${args.seed}:question-order:group-${block + 1}`),
      ).slice(0, BLOCK_SIZE))
    } else if (block === 3 && usesExpandedFourthGroup(examVersion)) {
      generated.push(generateQuestion34({ seedHash, random: randomForTemplate(34) }))
      generated.splice(0, generated.length, ...shuffle(
        generated,
        createSeededRandom(`${examVersion}:${args.seed}:question-order:group-${block + 1}`),
      ).slice(0, BLOCK_SIZE))
    } else if (block === 4 && usesExpandedFifthGroup(examVersion)) {
      generated.push(generateQuestion33({ seedHash, random: randomForTemplate(33), fillLetter: examVersion === MOCK_EXAM_VERSION || examVersion === EXPANDED_GROUPS_MOCK_EXAM_VERSION }))
      generated.splice(0, generated.length, ...shuffle(
        generated,
        createSeededRandom(`${examVersion}:${args.seed}:question-order:group-${block + 1}`),
      ).slice(0, BLOCK_SIZE))
    } else if (keepsRandomQuestionOrder) {
      generated.splice(0, generated.length, ...shuffle(
        generated,
        createSeededRandom(`${examVersion}:${args.seed}:question-order:group-${block + 1}`),
      ))
    } else {
      // Preserve the exact order of saved v20/v21 attempts.
      generated.sort((left, right) => Number(left.templateId.slice(1)) - Number(right.templateId.slice(1)))
    }
    questions.push(...generated)
  }

  const numbered = questions.map((question, index) => ({ ...question, number: index + 1 }))
  const exam: GeneratedExamDefinition = {
    id: MOCK_EXAM_ID,
    examVersion,
    seed: args.seed,
    title: MOCK_EXAM_TITLE,
    durationSeconds: MOCK_EXAM_DURATION_SECONDS,
    totalQuestions: MOCK_EXAM_QUESTION_COUNT,
    questions: numbered,
  }
  validateGeneratedExam(exam)
  return exam
}

export function sanitizeGeneratedExam(exam: GeneratedExamDefinition): ExamDefinition {
  return {
    id: exam.id,
    examVersion: exam.examVersion,
    seed: exam.seed,
    title: exam.title,
    durationSeconds: exam.durationSeconds,
    totalQuestions: exam.totalQuestions,
    questions: exam.questions.map(({ correctAnswer: _correctAnswer, ...question }) => {
      if (question.data?.generator === 'FILL_FRUIT_COLOR_LETTER') {
        const { combinationKey: _combinationKey, selectionSignature: _selectionSignature, ...visibleData } = question.data
        return { ...question, data: visibleData }
      }
      if (question.data?.generator === 'ANALYZE_WORD_FROM_IMAGE') {
        const { analysisValue: _analysisValue, item, ...visibleData } = question.data
        if (item && typeof item === 'object') {
          const { initial: _initial, rhyme: _rhyme, tone: _tone, letters: _letters, ...visibleItem } = item as Record<string, unknown>
          return { ...question, data: { ...visibleData, item: visibleItem } }
        }
        return { ...question, data: visibleData }
      }
      if (question.data?.generator === 'FIND_COMMON_SOUND') {
        const { targetSound: _targetSound, selectionKey: _selectionKey, words, ...visibleData } = question.data
        const visibleWords = Array.isArray(words) ? words.map(word => {
          if (!word || typeof word !== 'object') return word
          const { initial: _initial, ...visibleWord } = word as Record<string, unknown>
          return visibleWord
        }) : words
        return { ...question, data: { ...visibleData, words: visibleWords } }
      }
      if (question.data?.generator === 'IDENTIFY_SCHOOL_EVENT') {
        const { targetEventId: _targetEventId, ...visibleData } = question.data
        return { ...question, data: visibleData }
      }
      if (question.data?.generator === 'FIND_LETTER_PAIR_IN_ANIMAL_NAME') {
        const { targetLetters: _targetLetters, ...visibleData } = question.data
        return { ...question, data: visibleData }
      }
      if (question.data?.generator === 'IMAGE_RESEMBLES_LETTER') {
        const { selectionKey: _selectionKey, asset, ...visibleData } = question.data
        if (asset && typeof asset === 'object') {
          const { resemblesLetter: _resemblesLetter, ...visibleAsset } = asset as Record<string, unknown>
          return { ...question, data: { ...visibleData, asset: visibleAsset } }
        }
        return { ...question, data: visibleData }
      }
      if (question.data?.generator === 'CLASSIFY_NUMBER_AND_LETTER') {
        const items = Array.isArray(question.data.items) ? question.data.items : []
        return {
          ...question,
          data: {
            ...question.data,
            items: items.map(item => {
              if (!item || typeof item !== 'object') return item
              const { groupId: _groupId, ...visibleItem } = item as Record<string, unknown>
              return visibleItem
            }),
          },
        }
      }
      if (question.data?.generator !== 'MATCH_LOWER_UPPER_CASE' && question.data?.generator !== 'MATCH_OBJECT_WITH_NAME') return question
      const stripMatchKeys = (items: unknown) => Array.isArray(items) ? items.map(item => {
        if (!item || typeof item !== 'object') return item
        const { matchKey: _matchKey, ...visibleItem } = item as Record<string, unknown>
        return visibleItem
      }) : items
    if (question.data?.generator === 'MATCH_OBJECT_WITH_NAME') {
      const stripObjectLabels = (items: unknown) => Array.isArray(items) ? items.map(item => {
        if (!item || typeof item !== 'object') return item
        const { matchKey: _matchKey, word: _word, voice: _voice, ...visibleItem } = item as Record<string, unknown>
        return visibleItem
      }) : items
      const stripObjectRightKeys = (items: unknown) => Array.isArray(items) ? items.map(item => {
        if (!item || typeof item !== 'object') return item
        const { matchKey: _matchKey, ...visibleItem } = item as Record<string, unknown>
        return visibleItem
      }) : items
      return {
        ...question,
        data: {
          ...question.data,
          leftItems: stripObjectLabels(question.data.leftItems),
          rightItems: stripObjectRightKeys(question.data.rightItems),
        },
      }
    }
      return {
        ...question,
        data: {
          ...question.data,
          leftItems: stripMatchKeys(question.data.leftItems),
          rightItems: stripMatchKeys(question.data.rightItems),
        },
      }
    }),
  }
}

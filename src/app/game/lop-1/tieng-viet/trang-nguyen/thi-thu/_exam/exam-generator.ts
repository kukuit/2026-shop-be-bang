import { LEGACY_MOCK_EXAM_VERSION, MOCK_EXAM_DURATION_SECONDS, MOCK_EXAM_ID, MOCK_EXAM_QUESTION_COUNT, MOCK_EXAM_TITLE, MOCK_EXAM_VERSION, isSupportedMockExamVersion } from './config'
import { createSeededRandom, stableHash } from './shuffle'
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
  TEMPLATE_GENERATORS,
  type QuestionGenerationContext,
} from './question-generators'
import type { ExamDefinition, GeneratedExamDefinition, GeneratedExamQuestion } from './types'

const BLOCK_SIZE = 5
const BLOCK_COUNT = 6

export function validateGeneratedExam(exam: GeneratedExamDefinition): void {
  if (exam.questions.length !== MOCK_EXAM_QUESTION_COUNT) throw new Error('A Trang Nguyên exam must contain exactly 30 questions')
  if (exam.questions[1]?.templateId !== 'T02' || exam.questions[2]?.templateId !== 'T03' || exam.questions[3]?.templateId !== 'T04')
    throw new Error('Questions 2 through 4 must use their assigned question generators')
  if (exam.questions[5]?.templateId !== 'T06') throw new Error('Question 6 must use IDENTIFY_TONE_FROM_SYLLABLE')
  if (exam.questions[6]?.templateId !== 'T07') throw new Error('Question 7 must use FIND_ANIMAL_BY_NAME')
  if (exam.questions[7]?.templateId !== 'T08') throw new Error('Question 8 must use FIND_OBJECT_BY_NAME')
  if (exam.questions[8]?.templateId !== 'T09' || exam.questions[8]?.data?.generator !== 'FIND_FLOWER_BY_IMAGE')
    throw new Error('Question 9 must use FIND_FLOWER_BY_IMAGE')
  if (exam.questions[9]?.templateId !== 'T10' || exam.questions[9]?.data?.generator !== 'RECOGNIZE_LETTERS_IN_IMAGE')
    throw new Error('Question 10 must use RECOGNIZE_LETTERS_IN_IMAGE')
  if (exam.questions[10]?.templateId !== 'T11' || exam.questions[10]?.data?.generator !== 'RECOGNIZE_NUMBER_ON_CARD')
    throw new Error('Question 11 must use RECOGNIZE_NUMBER_ON_CARD')
  if (exam.questions[11]?.templateId !== 'T12' || exam.questions[11]?.data?.generator !== 'FILL_LETTER_IN_BLANK')
    throw new Error('Question 12 must use FILL_LETTER_IN_BLANK')
  if (exam.questions[12]?.templateId !== 'T13' || exam.questions[12]?.data?.generator !== 'COUNT_TARGET_LETTER')
    throw new Error('Question 13 must use COUNT_TARGET_LETTER')
  if (exam.questions[13]?.templateId !== 'T14' || exam.questions[13]?.data?.generator !== 'FIND_HIDDEN_LETTER')
    throw new Error('Question 14 must use FIND_HIDDEN_LETTER')
  if (exam.questions[14]?.templateId !== 'T15' || exam.questions[14]?.data?.generator !== 'ROTATED_LETTER_INPUT')
    throw new Error('Question 15 must use ROTATED_LETTER_INPUT')
  if (exam.questions[15]?.templateId !== 'T16' || exam.questions[15]?.data?.generator !== 'MATCH_SAME_LETTER_TWO_GROUPS')
    throw new Error('Question 16 must use MATCH_SAME_LETTER_TWO_GROUPS')
  if (exam.questions[16]?.templateId !== 'T17' || exam.questions[16]?.data?.generator !== 'MATCH_LOWER_UPPER_CASE')
    throw new Error('Question 17 must use MATCH_LOWER_UPPER_CASE')
  if (exam.questions[17]?.templateId !== 'T18' || exam.questions[17]?.data?.generator !== 'MATCH_IMAGE_WITH_SOUND')
    throw new Error('Question 18 must use MATCH_IMAGE_WITH_SOUND')
  if (exam.questions[18]?.templateId !== 'T19' || exam.questions[18]?.data?.generator !== 'MATCH_OBJECT_WITH_NAME')
    throw new Error('Question 19 must use MATCH_OBJECT_WITH_NAME')
  if (exam.questions[19]?.templateId !== 'T20' || exam.questions[19]?.data?.generator !== 'CLASSIFY_NUMBER_AND_LETTER')
    throw new Error('Question 20 must use CLASSIFY_NUMBER_AND_LETTER')
  const question3Target = exam.questions[2].data?.target
  const question4Target = exam.questions[3].data?.target
  if (!question3Target || !question4Target || question3Target === question4Target)
    throw new Error('Questions 3 and 4 must have different HEAR_AND_IDENTIFY_LETTER targets')

  const templateCounts = new Map<string, number>()
  const questionIds = new Set<string>()
  for (let index = 0; index < exam.questions.length; index += 1) {
    const question = exam.questions[index]
    templateCounts.set(question.templateId, (templateCounts.get(question.templateId) ?? 0) + 1)
    if (question.number !== index + 1 || question.templateId !== `T${String(index + 1).padStart(2, '0')}`)
      throw new Error(`Question ${index + 1} must use template T${String(index + 1).padStart(2, '0')}`)
    if (questionIds.has(question.id)) throw new Error(`Duplicate question id: ${question.id}`)
    questionIds.add(question.id)
    validateGeneratedQuestion(question)
  }

  for (let block = 0; block < BLOCK_COUNT; block += 1) {
    const expected = new Set(Array.from({ length: BLOCK_SIZE }, (_, index) => `T${String(block * BLOCK_SIZE + index + 1).padStart(2, '0')}`))
    const actual = new Set(exam.questions.slice(block * BLOCK_SIZE, (block + 1) * BLOCK_SIZE).map(question => question.templateId))
    if (actual.size !== BLOCK_SIZE || Array.from(actual).some(templateId => !expected.has(templateId)))
      throw new Error(`Block ${block + 1} must contain its five fixed templates`)
  }
  for (let template = 1; template <= MOCK_EXAM_QUESTION_COUNT; template += 1) {
    const templateId = `T${String(template).padStart(2, '0')}`
    if (templateCounts.get(templateId) !== 1) throw new Error(`${templateId} must appear exactly once`)
  }
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
  if (question.data?.generator === 'IMAGE_RESEMBLES_LETTER') validateImageResemblesLetterQuestion(question)
  if (question.data?.generator === 'FILL_FRUIT_COLOR_LETTER') validateQuestion30(question)
  if (question.data?.generator === 'ANIMATED_ACTOR_TO_LETTER_TARGET') validateQuestion24(question)

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
  const randomForTemplate = (templateNumber: number) => legacyRandom
    ?? createSeededRandom(`${examVersion}:${args.seed}:T${String(templateNumber).padStart(2, '0')}`)
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
        generated.push(generators[index](seedHash, randomForTemplate(templateNumber), generationContext))
      }
    }
    generated.sort((left, right) => Number(left.templateId.slice(1)) - Number(right.templateId.slice(1)))
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

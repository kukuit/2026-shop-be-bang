import { MOCK_EXAM_DURATION_SECONDS, MOCK_EXAM_ID, MOCK_EXAM_QUESTION_COUNT, MOCK_EXAM_TITLE, MOCK_EXAM_VERSION } from './config'
import { createSeededRandom, shuffle, stableHash } from './shuffle'
import { TEMPLATE_GENERATORS } from './question-generators'
import type { ExamDefinition, GeneratedExamDefinition, GeneratedExamQuestion } from './types'

const BLOCK_SIZE = 5
const BLOCK_COUNT = 6

export function validateGeneratedExam(exam: GeneratedExamDefinition): void {
  if (exam.questions.length !== MOCK_EXAM_QUESTION_COUNT) throw new Error('A Trang Nguyên exam must contain exactly 30 questions')

  const templateCounts = new Map<string, number>()
  const questionIds = new Set<string>()
  for (let index = 0; index < exam.questions.length; index += 1) {
    const question = exam.questions[index]
    templateCounts.set(question.templateId, (templateCounts.get(question.templateId) ?? 0) + 1)
    if (question.number !== index + 1) throw new Error(`Question number mismatch at index ${index}`)
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

  if (['single-choice', 'image-choice', 'audio-choice', 'video-select'].includes(question.type)) {
    if (typeof question.correctAnswer !== 'string' || !optionIds.includes(question.correctAnswer))
      throw new Error(`${question.templateId} must have one correct choice`)
  } else if (question.type === 'multi-select') {
    if (!Array.isArray(question.correctAnswer) || question.correctAnswer.length < 2 || new Set(question.correctAnswer).size !== question.correctAnswer.length
      || question.correctAnswer.some(id => !optionIds.includes(id)))
      throw new Error(`${question.templateId} must have multiple correct choices in its options`)
  } else if (question.type === 'matching') {
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
  } else if (question.type === 'categorize') {
    const items = question.data?.items as Array<{ id: string }> | undefined
    const groups = question.data?.groups as Array<{ id: string }> | undefined
    const mapping = question.correctAnswer as Record<string, string>
    if (!items || !groups || !mapping || items.length !== Object.keys(mapping).length
      || items.some(item => !groups.some(group => group.id === mapping[item.id])))
      throw new Error(`${question.templateId} has an invalid category mapping`)
  } else if (question.type === 'drag-to-slot') {
    const slots = question.data?.slots as Array<{ id: string }> | undefined
    const items = question.data?.items as Array<{ id: string }> | undefined
    const mapping = question.correctAnswer as Record<string, string>
    if (!slots || !items || !mapping || slots.length !== Object.keys(mapping).length
      || slots.some(slot => !items.some(item => item.id === mapping[slot.id]))
      || new Set(Object.values(mapping)).size !== Object.values(mapping).length)
      throw new Error(`${question.templateId} has an invalid drag-to-slot mapping`)
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
  }
}

export function generateMockTrangNguyenExam(args: { seed: string; examVersion?: string }): GeneratedExamDefinition {
  const examVersion = args.examVersion ?? MOCK_EXAM_VERSION
  if (examVersion !== MOCK_EXAM_VERSION) throw new Error(`Unsupported exam version: ${examVersion}`)
  const random = createSeededRandom(args.seed)
  const seedHash = stableHash(args.seed)
  const questions: GeneratedExamQuestion[] = []

  for (let block = 0; block < BLOCK_COUNT; block += 1) {
    const generators = TEMPLATE_GENERATORS.slice(block * BLOCK_SIZE, (block + 1) * BLOCK_SIZE)
    const generated = generators.map(generator => generator(seedHash, random))
    questions.push(...shuffle(generated, random))
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
    questions: exam.questions.map(({ correctAnswer: _correctAnswer, ...question }) => question),
  }
}

import 'server-only'
import { generateMockTrangNguyenExam } from '../_exam/exam-generator'
import { normalizeAnswer } from '../_exam/answer-utils'
import type { ExamAnswer, ExamAnswers, ExamQuestion, GeneratedExamDefinition } from '../_exam/types'
import { MOCK_EXAM_VERSION } from '../_exam/config'

function sameArray(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function sameSet(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && new Set(left).size === left.length && left.every(value => right.includes(value))
}

function sameMapping(left: Record<string, string>, right: Record<string, string>) {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  return leftKeys.length === rightKeys.length && leftKeys.every(key => right[key] === left[key])
}

export function gradeQuestion(question: ExamQuestion & { correctAnswer: ExamAnswer }, answer: ExamAnswer | undefined): boolean {
  if (answer === undefined) return false
  if (question.type === 'multi-select')
    return Array.isArray(answer) && Array.isArray(question.correctAnswer) && sameSet(answer, question.correctAnswer)
  if (question.type === 'sorting')
    return Array.isArray(answer) && Array.isArray(question.correctAnswer) && sameArray(answer, question.correctAnswer)
  if (question.type === 'matching' || question.type === 'categorize' || question.type === 'drag-to-slot')
    return !Array.isArray(answer) && typeof answer === 'object' && !Array.isArray(question.correctAnswer)
      && sameMapping(answer, question.correctAnswer as Record<string, string>)
  if (typeof answer !== 'string' || typeof question.correctAnswer !== 'string') return false
  return normalizeAnswer(answer) === normalizeAnswer(question.correctAnswer)
}

export function gradeTrangNguyenAnswers(answers: ExamAnswers, exam: GeneratedExamDefinition) {
  const correctCount = exam.questions.reduce((count, question) => count + (gradeQuestion(question, answers[question.id]) ? 1 : 0), 0)
  return { correctCount, score: correctCount * 10 }
}

function isStringArray(answer: unknown): answer is string[] {
  return Array.isArray(answer) && answer.every(value => typeof value === 'string')
}

function isStringMapping(answer: unknown): answer is Record<string, string> {
  return typeof answer === 'object' && answer !== null && !Array.isArray(answer)
    && Object.values(answer).every(value => typeof value === 'string')
}

function choiceIds(question: ExamQuestion) {
  return new Set(question.options?.map(option => option.id) ?? [])
}

export function isValidTrangNguyenAnswerMap(answers: ExamAnswers, exam: GeneratedExamDefinition) {
  const questionMap = new Map(exam.questions.map(question => [question.id, question]))
  return Object.entries(answers).every(([questionId, answer]) => {
    const question = questionMap.get(questionId)
    if (!question) return false
    const options = choiceIds(question)
    if (['single-choice', 'image-choice', 'audio-choice'].includes(question.type))
      return typeof answer === 'string' && options.has(answer)
    if (question.type === 'multi-select')
      return isStringArray(answer) && new Set(answer).size === answer.length && answer.every(id => options.has(id))
    if (question.type === 'text-input') return typeof answer === 'string' && answer.length <= 100
    if (question.type === 'number-input') return typeof answer === 'string' && /^\d{1,3}$/.test(answer.trim())
    if (question.type === 'select-input') {
      const choices = question.data?.choices as string[] | undefined
      return typeof answer === 'string' && (choices?.includes(answer) ?? options.has(answer))
    }
    if (question.type === 'video-select') return typeof answer === 'string' && options.has(answer)
    if (question.type === 'matching') {
      const data = question.data as { leftItems?: Array<{ id: string }>; rightItems?: Array<{ id: string }> }
      const leftIds = new Set(data.leftItems?.map(item => item.id) ?? [])
      const rightIds = new Set(data.rightItems?.map(item => item.id) ?? [])
      return isStringMapping(answer) && Object.keys(answer).every(id => leftIds.has(id))
        && Object.values(answer).every(id => rightIds.has(id)) && new Set(Object.values(answer)).size === Object.keys(answer).length
    }
    if (question.type === 'categorize') {
      const data = question.data as { items?: Array<{ id: string }>; groups?: Array<{ id: string }> }
      const itemIds = new Set(data.items?.map(item => item.id) ?? [])
      const groupIds = new Set(data.groups?.map(group => group.id) ?? [])
      return isStringMapping(answer) && Object.keys(answer).every(id => itemIds.has(id))
        && Object.values(answer).every(id => groupIds.has(id))
    }
    if (question.type === 'sorting') {
      const itemIds = (question.data?.items as Array<{ id: string }> | undefined)?.map(item => item.id) ?? []
      return isStringArray(answer) && answer.length === itemIds.length && sameSet(answer, itemIds)
    }
    if (question.type === 'drag-to-slot') {
      const data = question.data as { slots?: Array<{ id: string }>; items?: Array<{ id: string }> }
      const slotIds = new Set(data.slots?.map(slot => slot.id) ?? [])
      const itemIds = new Set(data.items?.map(item => item.id) ?? [])
      return isStringMapping(answer) && Object.keys(answer).every(id => slotIds.has(id))
        && Object.values(answer).every(id => itemIds.has(id)) && new Set(Object.values(answer)).size === Object.keys(answer).length
    }
    return false
  })
}

export function gradeTrangNguyenAttempt(answers: ExamAnswers, seed: string, examVersion = MOCK_EXAM_VERSION) {
  const exam = generateMockTrangNguyenExam({ seed, examVersion })
  if (!isValidTrangNguyenAnswerMap(answers, exam)) throw new Error('Invalid answer map')
  return { ...gradeTrangNguyenAnswers(answers, exam), exam }
}

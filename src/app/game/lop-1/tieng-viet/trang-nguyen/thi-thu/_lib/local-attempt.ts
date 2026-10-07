import type { ExamAnswer, ExamQuestion } from '../_exam/types'

export const TRANG_NGUYEN_EXAM_KEY = 'trang-nguyen-tieng-viet-lop-1' as const
export const LOCAL_ATTEMPT_VERSION = 1 as const

export type LocalAttemptQuestion = {
  id: string
  order: number
  questionType: string
  learningKey?: string
  snapshot: ExamQuestion
  userAnswer: ExamAnswer | null
  answeredAt: string | null
}

export type LocalTrangNguyenAttempt = {
  id: string
  version: typeof LOCAL_ATTEMPT_VERSION
  status: 'IN_PROGRESS' | 'SUBMITTING'
  examKey: typeof TRANG_NGUYEN_EXAM_KEY
  examId: string
  examVersion: string
  seed: string
  startedAt: string
  durationSeconds: number
  currentPage: number
  questions: LocalAttemptQuestion[]
}

export type GradedAttemptQuestion = LocalAttemptQuestion & {
  userAnswer: ExamAnswer | null
  correctAnswer: ExamAnswer
  isCorrect: boolean
}

export type SubmittedTrangNguyenAttempt = {
  id: string
  status: 'SUBMITTED' | 'EXPIRED'
  examKey: typeof TRANG_NGUYEN_EXAM_KEY
  startedAt: string
  submittedAt: string
  durationSeconds: number
  elapsedSeconds: number
  score: number
  correctCount: number
  wrongCount: number
  unansweredCount: number
  questions: GradedAttemptQuestion[]
}

export function getAttemptStorageKey(attemptId: string) {
  return `trang-nguyen:thi-thu:${attemptId}`
}

export function saveLocalAttempt(attempt: LocalTrangNguyenAttempt) {
  if (typeof window === 'undefined') return false
  try {
    localStorage.setItem(getAttemptStorageKey(attempt.id), JSON.stringify(attempt))
    return true
  } catch {
    return false
  }
}

export function loadLocalAttempt(attemptId: string): LocalTrangNguyenAttempt | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(getAttemptStorageKey(attemptId))
    if (!raw) return null
    const attempt = JSON.parse(raw) as LocalTrangNguyenAttempt
    if (!attempt || attempt.id !== attemptId || attempt.version !== LOCAL_ATTEMPT_VERSION
      || attempt.examKey !== TRANG_NGUYEN_EXAM_KEY
      || !['IN_PROGRESS', 'SUBMITTING'].includes(attempt.status)
      || typeof attempt.startedAt !== 'string'
      || !Number.isInteger(attempt.currentPage) || attempt.currentPage < 1 || attempt.currentPage > 6
      || !Array.isArray(attempt.questions) || attempt.questions.length !== 30
      || attempt.questions.some(question => !question || typeof question.id !== 'string'
        || !question.snapshot || question.snapshot.id !== question.id)) return null
    return attempt
  } catch {
    return null
  }
}

export function removeLocalAttempt(attemptId: string) {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(getAttemptStorageKey(attemptId)) } catch {}
}

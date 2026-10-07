import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { saveSubmittedTrangNguyenAttempt } from '@/lib/trangNguyenExam'
import { MOCK_EXAM_ID, isSupportedMockExamVersion } from '@/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/config'
import { generateMockTrangNguyenExam, sanitizeGeneratedExam } from '@/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/exam-generator'
import { gradeQuestion, isValidTrangNguyenAnswerMap } from '@/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_lib/exam-grading.server'
import { isQuestionAnswered } from '@/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/answer-utils'
import { LOCAL_ATTEMPT_VERSION, TRANG_NGUYEN_EXAM_KEY } from '@/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_lib/local-attempt'
import type { ExamAnswer, ExamAnswers } from '@/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/types'
import type { SubmittedTrangNguyenAttempt } from '@/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_lib/local-attempt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const answerSchema = z.union([
  z.string().max(100),
  z.array(z.string().max(100)).max(100),
  z.record(z.string().max(100), z.string().max(100)),
])

const payloadSchema = z.object({
  attemptId: z.string().uuid(),
  version: z.literal(LOCAL_ATTEMPT_VERSION),
  status: z.enum(['IN_PROGRESS', 'SUBMITTING']),
  examKey: z.literal(TRANG_NGUYEN_EXAM_KEY),
  examId: z.string().min(1).max(128),
  examVersion: z.string().min(1).max(64),
  seed: z.string().min(1).max(128),
  startedAt: z.string().datetime(),
  submittedAt: z.string().datetime(),
  durationSeconds: z.number().int().positive(),
  currentPage: z.number().int().min(1).max(6),
  questions: z.array(z.object({
    id: z.string().min(1).max(100),
    order: z.number().int().min(1).max(30),
    questionType: z.string().min(1).max(64),
    learningKey: z.string().max(128).optional(),
    snapshot: z.unknown(),
    userAnswer: answerSchema.nullable(),
    answeredAt: z.string().datetime().nullable(),
  }).strict()).length(30),
}).strict()

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(item => item === undefined ? 'null' : canonical(item)).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined).sort(([left], [right]) => left.localeCompare(right))
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ message: 'Dữ liệu nộp bài không hợp lệ.' }, { status: 400 })
  const localAttempt = parsed.data
  const startedAtMs = Date.parse(localAttempt.startedAt)
  if (!Number.isFinite(startedAtMs) || startedAtMs > Date.now() || localAttempt.examId !== MOCK_EXAM_ID
    || !isSupportedMockExamVersion(localAttempt.examVersion) || localAttempt.durationSeconds <= 0) {
    return NextResponse.json({ message: 'Phiên thi không hợp lệ.' }, { status: 400 })
  }

  let generated
  try {
    generated = generateMockTrangNguyenExam({ seed: localAttempt.seed, examVersion: localAttempt.examVersion })
  } catch {
    return NextResponse.json({ message: 'Không thể xác minh bộ câu hỏi của phiên thi.' }, { status: 400 })
  }
  if (generated.durationSeconds !== localAttempt.durationSeconds) {
    return NextResponse.json({ message: 'Thời lượng của phiên thi không hợp lệ.' }, { status: 400 })
  }

  const snapshots = sanitizeGeneratedExam(generated).questions
  const answers: ExamAnswers = {}
  const validSnapshots = localAttempt.questions.every((question, index) => {
    const expected = generated.questions[index]
    const visibleSnapshot = snapshots[index]
    if (question.id !== expected.id || question.order !== index + 1 || question.questionType !== expected.type
      || question.learningKey !== expected.knowledgeKey || canonical(question.snapshot) !== canonical(visibleSnapshot)) return false
    if (question.userAnswer !== null) answers[question.id] = question.userAnswer as ExamAnswer
    return true
  })
  if (!validSnapshots || !isValidTrangNguyenAnswerMap(answers, generated))
    return NextResponse.json({ message: 'Đề thi hoặc câu trả lời không khớp với phiên thi.' }, { status: 400 })

  const correctCount = generated.questions.reduce((count, question) => count + (gradeQuestion(question, answers[question.id]) ? 1 : 0), 0)
  const unansweredCount = generated.questions.filter(question => !isQuestionAnswered(question, answers[question.id])).length
  const gradedQuestions: SubmittedTrangNguyenAttempt['questions'] = generated.questions.map((question, index) => {
    const userAnswer = answers[question.id] ?? null
    return {
      id: question.id,
      order: index + 1,
      questionType: question.type,
      learningKey: question.knowledgeKey,
      snapshot: snapshots[index],
      userAnswer,
      answeredAt: localAttempt.questions[index].answeredAt,
      correctAnswer: question.correctAnswer,
      isCorrect: userAnswer !== null && gradeQuestion(question, userAnswer),
    }
  })
  const attempt: SubmittedTrangNguyenAttempt = {
    id: localAttempt.attemptId,
    status: 'SUBMITTED',
    examKey: TRANG_NGUYEN_EXAM_KEY,
    startedAt: localAttempt.startedAt,
    submittedAt: new Date().toISOString(),
    durationSeconds: generated.durationSeconds,
    elapsedSeconds: 0,
    score: correctCount * 10,
    correctCount,
    wrongCount: generated.questions.length - correctCount - unansweredCount,
    unansweredCount,
    questions: gradedQuestions,
  }

  try {
    const user = await getCurrentUser()
    const submitted = await saveSubmittedTrangNguyenAttempt(attempt, user?.id ?? null)
    return NextResponse.json({ attempt: submitted }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[TrangNguyenExam] Could not persist submitted attempt', error)
    return NextResponse.json({ message: 'Chưa thể nộp bài. Bài làm của bé vẫn được lưu trên thiết bị. Hãy thử lại.' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { REFRESH_COOKIE } from '@/lib/auth/config'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import {
  getLatestTrangNguyenAttempt,
  startTrangNguyenAttempt,
  submitTrangNguyenAttempt,
} from '@/lib/trangNguyenExam'
import { MOCK_EXAM_ID, MOCK_EXAM_VERSION } from '@/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/config'
import { generateMockTrangNguyenExam, sanitizeGeneratedExam } from '@/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/exam-generator'
import { isValidTrangNguyenAnswerMap } from '@/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_lib/exam-grading.server'
import type { ExamAnswers } from '@/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const startSchema = z.object({ action: z.literal('start') }).strict()
const answerRecordSchema = z.record(z.string().min(1).max(100), z.unknown()).refine(value => Object.keys(value).length <= 30)
const attemptSchema = z.object({
  id: z.string().min(1).max(128),
  examId: z.string().min(1).max(128),
  examVersion: z.string().min(1).max(64),
  questionIds: z.array(z.string().min(1).max(100)).length(30),
  seed: z.string().min(1).max(128),
  durationSeconds: z.number().int().positive(),
  startedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().positive(),
}).strict()
const submitSchema = z.object({ action: z.literal('submit'), attempt: attemptSchema, answers: answerRecordSchema }).strict()

async function authenticatedUser(request: Request) {
  const user = await getCurrentUser()
  if (user) return { user, response: null }
  const hasRefreshToken = new RegExp(`(?:^|;\\s*)${REFRESH_COOKIE}=([^;]+)`).test(request.headers.get('cookie') ?? '')
  return {
    user: null,
    response: NextResponse.json({ message: 'Vui lòng đăng nhập lại để tiếp tục lưu bài thi.' }, { status: 401, headers: { 'Cache-Control': 'private, no-store', ...(hasRefreshToken ? { 'X-Auth-Refresh-Needed': '1' } : {}) } }),
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const seed = url.searchParams.get('seed')
  if (seed !== null) {
    const examVersion = url.searchParams.get('examVersion') ?? ''
    if (!seed.trim() || seed.length > 128 || examVersion !== MOCK_EXAM_VERSION)
      return NextResponse.json({ message: 'Mã đề thi không hợp lệ hoặc đã hết phiên bản hỗ trợ.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    try {
      const exam = generateMockTrangNguyenExam({ seed, examVersion })
      return NextResponse.json({ exam: sanitizeGeneratedExam(exam) }, { headers: { 'Cache-Control': 'no-store' } })
    } catch {
      return NextResponse.json({ message: 'Chưa tải được đề thi.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }
  }

  const auth = await authenticatedUser(request)
  if (auth.response) return auth.response
  try {
    const attempt = await getLatestTrangNguyenAttempt(auth.user!.id)
    return NextResponse.json({ attempt }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[TrangNguyenExam] Could not restore attempt', error)
    return NextResponse.json({ message: 'Chưa tải được bài thi đã lưu.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } })
  }
}

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await authenticatedUser(request)
  if (auth.response) return auth.response
  const parsed = startSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ message: 'Yêu cầu bắt đầu bài thi không hợp lệ.' }, { status: 400 })
  try {
    const started = await startTrangNguyenAttempt(auth.user!.id)
    return NextResponse.json(started, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[TrangNguyenExam] Could not start attempt', error)
    return NextResponse.json({ message: 'Chưa bắt đầu được bài thi. Bé thử lại nhé.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await authenticatedUser(request)
  if (auth.response) return auth.response
  const parsed = submitSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ message: 'Yêu cầu nộp bài không hợp lệ.' }, { status: 400 })

  const submittedAttempt = parsed.data.attempt
  const answers = parsed.data.answers as ExamAnswers
  let exam
  try {
    if (submittedAttempt.examVersion !== MOCK_EXAM_VERSION) throw new Error('Unsupported exam version')
    exam = generateMockTrangNguyenExam({ seed: submittedAttempt.seed, examVersion: submittedAttempt.examVersion })
  } catch {
    return NextResponse.json({ message: 'Phiên thi không hợp lệ.' }, { status: 400 })
  }
  const expectedQuestionIds = exam.questions.map(question => question.id)
  const validAttempt = submittedAttempt.examId === MOCK_EXAM_ID
    && submittedAttempt.durationSeconds === exam.durationSeconds
    && submittedAttempt.questionIds.every((questionId, index) => questionId === expectedQuestionIds[index])
    && submittedAttempt.expiresAt === submittedAttempt.startedAt + submittedAttempt.durationSeconds * 1000
    && submittedAttempt.startedAt <= Date.now()
  if (!validAttempt || !isValidTrangNguyenAnswerMap(answers, exam))
    return NextResponse.json({ message: 'Phiên thi hoặc đáp án không hợp lệ.' }, { status: 400 })

  try {
    const attempt = await submitTrangNguyenAttempt(auth.user!.id, submittedAttempt, answers)
    return NextResponse.json({ attempt }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[TrangNguyenExam] Could not submit attempt', error)
    return NextResponse.json({ message: 'Chưa nộp được bài thi.' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { gradeTrangNguyenAttempt } from '@/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_lib/exam-grading.server'
import type { ExamAnswers } from '@/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/types'

export const runtime = 'nodejs'

const schema = z.object({
  seed: z.string().min(1).max(128),
  examVersion: z.string().min(1).max(64),
  answers: z.record(z.string().min(1).max(100), z.unknown()).refine(value => Object.keys(value).length <= 30),
}).strict()

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ message: 'Đáp án gửi lên không hợp lệ.' }, { status: 400 })
  try {
    const result = gradeTrangNguyenAttempt(parsed.data.answers as ExamAnswers, parsed.data.seed, parsed.data.examVersion)
    return NextResponse.json({ score: result.score, correctCount: result.correctCount }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ message: 'Đáp án gửi lên không hợp lệ.' }, { status: 400 })
  }
}

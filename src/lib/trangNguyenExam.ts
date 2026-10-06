import 'server-only'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { MOCK_EXAM_DURATION_SECONDS, MOCK_EXAM_ID, MOCK_EXAM_VERSION } from '@/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/config'
import { generateMockTrangNguyenExam, sanitizeGeneratedExam } from '@/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/exam-generator'
import { gradeTrangNguyenAttempt } from '@/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_lib/exam-grading.server'
import type { ExamAnswers, ExamAttempt, ExamAttemptStatus } from '@/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/types'

const durationSeconds = MOCK_EXAM_DURATION_SECONDS
const attemptCollection = (userId: string) => getAdminDb()
  .collection('shopbebangcom').doc('exam')
  .collection('trang_nguyen_attempts').doc(userId)
  .collection('attempts')

function timestampMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis()
  if (value instanceof Date) return value.getTime()
  return typeof value === 'number' ? value : 0
}

function mapAttempt(id: string, userId: string, data: FirebaseFirestore.DocumentData): ExamAttempt {
  return {
    id,
    userId,
    examType: 'trang-nguyen-tieng-viet',
    grade: 1,
    subject: 'tieng-viet',
    mode: 'thi-thu',
    examId: String(data.examId ?? MOCK_EXAM_ID),
    examVersion: String(data.examVersion ?? MOCK_EXAM_VERSION),
    questionIds: Array.isArray(data.questionIds) ? data.questionIds : [],
    seed: String(data.seed ?? ''),
    answers: data.answers && typeof data.answers === 'object' ? data.answers as ExamAnswers : {},
    status: data.status as ExamAttemptStatus,
    durationSeconds: Number(data.durationSeconds ?? durationSeconds),
    startedAt: timestampMillis(data.startedAt),
    expiresAt: timestampMillis(data.expiresAt),
    submittedAt: data.submittedAt ? timestampMillis(data.submittedAt) : null,
    score: typeof data.score === 'number' ? data.score : null,
    correctCount: typeof data.correctCount === 'number' ? data.correctCount : null,
    elapsedSeconds: typeof data.elapsedSeconds === 'number' ? data.elapsedSeconds : null,
    createdAt: timestampMillis(data.createdAt) || Date.now(),
    updatedAt: timestampMillis(data.updatedAt) || Date.now(),
  }
}

function resultFields(data: FirebaseFirestore.DocumentData, endedAt: number) {
  const startedAt = timestampMillis(data.startedAt)
  const answers = data.answers && typeof data.answers === 'object' ? data.answers as ExamAnswers : {}
  const result = gradeTrangNguyenAttempt(answers, String(data.seed ?? ''), String(data.examVersion ?? MOCK_EXAM_VERSION))
  return {
    score: result.score,
    correctCount: result.correctCount,
    elapsedSeconds: Math.max(0, Math.min(durationSeconds, Math.floor((endedAt - startedAt) / 1000))),
  }
}

function completedFields(data: FirebaseFirestore.DocumentData, status: 'submitted' | 'expired', now: number) {
  return {
    ...resultFields(data, now),
    status,
    submittedAt: Timestamp.fromMillis(now),
    updatedAt: FieldValue.serverTimestamp(),
  }
}

export async function getLatestTrangNguyenAttempt(userId: string) {
  const latest = await attemptCollection(userId).orderBy('startedAt', 'desc').limit(1).get()
  const document = latest.docs[0]
  return document ? mapAttempt(document.id, userId, document.data()) : null
}

export type TrangNguyenAttemptMetadata = Pick<ExamAttempt, 'id' | 'examId' | 'examVersion' | 'questionIds' | 'seed' | 'durationSeconds' | 'startedAt' | 'expiresAt'>

export async function startTrangNguyenAttempt(userId: string) {
  const now = Date.now()
  const seed = crypto.randomUUID()
  const exam = generateMockTrangNguyenExam({ seed, examVersion: MOCK_EXAM_VERSION })
  const attempt: ExamAttempt = {
    id: crypto.randomUUID(),
    userId,
    examType: 'trang-nguyen-tieng-viet',
    grade: 1,
    subject: 'tieng-viet',
    mode: 'thi-thu',
    examId: MOCK_EXAM_ID,
    examVersion: MOCK_EXAM_VERSION,
    questionIds: exam.questions.map(question => question.id),
    seed,
    answers: {},
    status: 'in_progress',
    durationSeconds,
    startedAt: now,
    expiresAt: now + durationSeconds * 1000,
    submittedAt: null,
    score: null,
    correctCount: null,
    elapsedSeconds: null,
    createdAt: now,
    updatedAt: now,
  }
  return { attempt, exam: sanitizeGeneratedExam(exam) }
}

export async function submitTrangNguyenAttempt(userId: string, attempt: TrangNguyenAttemptMetadata, latestAnswers: ExamAnswers) {
  const ref = attemptCollection(userId).doc(attempt.id)
  return getAdminDb().runTransaction(async transaction => {
    const snapshot = await transaction.get(ref)
    const data: FirebaseFirestore.DocumentData = snapshot.exists
      ? { ...snapshot.data()!, answers: latestAnswers }
      : {
          examType: 'trang-nguyen-tieng-viet',
          grade: 1,
          subject: 'tieng-viet',
          mode: 'thi-thu',
          examId: attempt.examId,
          examVersion: attempt.examVersion,
          questionIds: attempt.questionIds,
          seed: attempt.seed,
          answers: latestAnswers,
          status: 'in_progress',
          durationSeconds: attempt.durationSeconds,
          startedAt: Timestamp.fromMillis(attempt.startedAt),
          expiresAt: Timestamp.fromMillis(attempt.expiresAt),
          createdAt: Timestamp.fromMillis(attempt.startedAt),
          updatedAt: FieldValue.serverTimestamp(),
        }
    if (snapshot.exists && data.status !== 'in_progress') return mapAttempt(snapshot.id, userId, snapshot.data()!)
    const now = Date.now()
    const status = timestampMillis(data.expiresAt) <= now ? 'expired' : 'submitted'
    const fields = completedFields(data, status, now)
    const completed = { ...data, ...fields, answers: latestAnswers }
    if (snapshot.exists) transaction.update(ref, { ...fields, answers: latestAnswers })
    else transaction.create(ref, completed)
    return mapAttempt(ref.id, userId, { ...completed, submittedAt: now, updatedAt: now })
  })
}

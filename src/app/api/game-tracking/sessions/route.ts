import { NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { GAME_IDS } from '@/components/games/general/tracking/constants'
import {
  getLessonDefinition,
  isLearningKeyForLesson,
  isLessonId,
} from '@/components/games/general/tracking/lesson-catalog'
import { getCurrentUser } from '@/lib/auth/current-user'
import { GUEST_COOKIE, REFRESH_COOKIE } from '@/lib/auth/config'
import { setGuestCookie } from '@/lib/auth/cookies'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { gameSessionRef } from '@/lib/gameTrackingPaths'

export const runtime = 'nodejs'

const resultSchema = z.object({
  learningKey: z.string().min(1).max(100),
  correct: z.boolean(),
  expectedAnswer: z.union([z.string(), z.number()]).optional(),
  selectedAnswer: z.union([z.string(), z.number()]).optional(),
  responseTime: z
    .number()
    .int()
    .min(0)
    .max(60 * 60 * 1000)
    .optional(),
  attempt: z.number().int().min(1).max(100),
})

const sessionSchema = z
  .object({
    sessionId: z.string().uuid(),
    lessonId: z.string().refine(isLessonId, 'Unknown lessonId'),
    gameId: z.enum([
      GAME_IDS.BUBBLE_SHOOTER,
      GAME_IDS.DRAG_DROP,
      GAME_IDS.GOLD_MINING,
      GAME_IDS.RACING,
    ]),
    score: z.number().int().min(0).max(100000),
    totalQuestions: z.number().int().min(0).max(1000),
    correctCount: z.number().int().min(0).max(1000),
    wrongCount: z.number().int().min(0).max(1000),
    duration: z
      .number()
      .int()
      .min(0)
      .max(24 * 60 * 60 * 1000),
    startedAt: z.number().int().positive(),
    results: z.array(resultSchema).max(1000),
  })
  .superRefine((session, context) => {
    const correctCount = session.results.filter((result) => result.correct).length
    const wrongCount = session.results.length - correctCount
    if (session.totalQuestions !== session.results.length)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['totalQuestions'],
        message: 'Must equal results length',
      })
    if (session.correctCount !== correctCount)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correctCount'],
        message: 'Does not match results',
      })
    if (session.wrongCount !== wrongCount)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['wrongCount'],
        message: 'Does not match results',
      })
    const lesson = getLessonDefinition(session.lessonId)
    if (!lesson) return
    session.results.forEach((result, index) => {
      if (!isLearningKeyForLesson(session.lessonId, result.learningKey)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['results', index, 'learningKey'],
          message: `Learning key does not belong to ${session.lessonId}`,
        })
      }
    })
  })

type Aggregate = {
  correct: number
  wrong: number
  attempts: number
  responseTime: number
  sessions: number
}

export async function POST(request: Request) {
  try {
    const rejected = rejectCrossSiteMutation(request)
    if (rejected) return rejected
    const session = sessionSchema.parse(await request.json())
    const user = await getCurrentUser()
    const cookieHeader = request.headers.get('cookie') ?? ''
    const hasRefreshToken = Boolean(
      cookieHeader.match(new RegExp(`(?:^|;\\s*)${REFRESH_COOKIE}=([^;]+)`))?.[1]
    )
    // Người dùng đang có refresh session nhưng access token vừa hết hạn:
    // trả 401 để fetchWithAuthRetry rotate token, rồi gửi lại cùng sessionId đúng một lần.
    if (!user && hasRefreshToken) {
      return NextResponse.json({ message: 'Access token expired.' }, { status: 401 })
    }
    const existingGuestId = cookieHeader.match(
      new RegExp(`(?:^|;\\s*)${GUEST_COOKIE}=([^;]+)`)
    )?.[1]
    const guestId = user
      ? null
      : existingGuestId?.startsWith('guest_')
        ? existingGuestId
        : `guest_${crypto.randomUUID()}`
    const lesson = getLessonDefinition(session.lessonId)

    const db = getAdminDb()
    const sessionRef = gameSessionRef({
      sessionId: session.sessionId,
      userId: user?.id,
      guestId: guestId ?? undefined,
    })
    const progressId = user ? `${user.id}_${session.lessonId}` : null
    const progressRef = progressId
      ? db.collection('shopbebangcom').doc('game').collection('learning_progress').doc(progressId)
      : null
    const progressUserId = user?.activeGame ? user.id : null

    await db.runTransaction(async (transaction) => {
      const existingSession = await transaction.get(sessionRef)
      if (existingSession.exists) return

      const progressSnapshot =
        progressRef && progressUserId ? await transaction.get(progressRef) : null
      const existingKeys = (progressSnapshot?.data()?.keys ?? {}) as Record<
        string,
        Partial<Aggregate>
      >
      const sessionKeys = new Set<string>(session.results.map((result) => result.learningKey))
      const increments = new Map<string, Aggregate>()

      for (const result of session.results) {
        const current = increments.get(result.learningKey) ?? {
          correct: 0,
          wrong: 0,
          attempts: 0,
          responseTime: 0,
          sessions: 0,
        }
        current.correct += result.correct ? 1 : 0
        current.wrong += result.correct ? 0 : 1
        current.attempts += 1
        current.responseTime += result.responseTime ?? 0
        increments.set(result.learningKey, current)
      }

      const keys = { ...existingKeys }
      for (const [learningKey, increment] of Array.from(increments.entries())) {
        const current = existingKeys[learningKey] ?? {}
        keys[learningKey] = {
          correct: (current.correct ?? 0) + increment.correct,
          wrong: (current.wrong ?? 0) + increment.wrong,
          attempts: (current.attempts ?? 0) + increment.attempts,
          responseTime: (current.responseTime ?? 0) + increment.responseTime,
          sessions: (current.sessions ?? 0) + (sessionKeys.has(learningKey) ? 1 : 0),
        }
      }

      transaction.create(sessionRef, {
        ...session,
        userId: user?.id ?? null,
        guestId,
        isGuest: !user,
        grade: lesson ? Number(lesson.gradeId.replace(/\D/g, '')) : null,
        subject: lesson?.subjectId ?? null,
        startedAt: Timestamp.fromMillis(session.startedAt),
        completedAt: FieldValue.serverTimestamp(),
      })
      if (progressRef && progressSnapshot && progressUserId)
        transaction.set(progressRef, {
          userId: progressUserId,
          grade: lesson ? Number(lesson.gradeId.replace(/\D/g, '')) : null,
          subject: lesson?.subjectId ?? null,
          lessonId: session.lessonId,
          keys,
          totalSessions: (progressSnapshot.data()?.totalSessions ?? 0) + 1,
          updatedAt: FieldValue.serverTimestamp(),
        })
    })

    const response = NextResponse.json({ sessionId: session.sessionId })
    if (guestId && !existingGuestId) setGuestCookie(response, guestId)
    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid game session.', issues: error.issues },
        { status: 400 }
      )
    }
    console.error('[GameTracking] Session API failed', error)
    return NextResponse.json({ message: 'Could not save game session.' }, { status: 500 })
  }
}

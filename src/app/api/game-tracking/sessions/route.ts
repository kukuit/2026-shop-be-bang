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
import { subjectProgressRef } from '@/lib/game-progress/paths'
import { getSubjectLessons } from '@/lib/game-progress/config'
import { survivalBaseCoinEarned as baseCoinEarned, survivalRewardMultiplier as rewardMultiplier } from '@/components/games/general/survival-rewards'
import { buildSubjectProgress, summarizeLesson, type SubjectProgress } from '@/lib/game-progress/model'

export const runtime = 'nodejs'

const resultSchema = z.object({
  learningKey: z.string().min(1).max(100),
  week: z.number().int().min(1).max(20).optional(),
  sourceLesson: z.number().int().min(1).max(5).optional(),
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
  skill: z.enum(['listening', 'reading', 'speaking', 'writing']).optional(),
  inputMode: z.enum(['audio', 'text', 'image', 'scene']).optional(),
  answerMode: z.enum(['select-image', 'select-text', 'drag-image', 'drag-text', 'speak']).optional(),
})
const survivalSchema = z.object({
  levelReached: z.number().int().min(1).max(25),
  levelsCompleted: z.number().int().min(0).max(25),
  livesRemaining: z.number().int().min(0).max(3),
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
    bubbleSurvival: survivalSchema.optional(),
    dragDropSurvival: survivalSchema.optional(),
    goldMinerSurvival: survivalSchema.optional(),
    racingSurvival: survivalSchema.optional(),
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
    if (session.bubbleSurvival && session.gameId !== GAME_IDS.BUBBLE_SHOOTER) context.addIssue({ code: z.ZodIssueCode.custom, path: ['bubbleSurvival'], message: 'Only bubble shooter supports survival data' })
    if (session.bubbleSurvival) {
      const { levelReached, levelsCompleted, livesRemaining } = session.bubbleSurvival
      if (levelsCompleted !== (levelReached === 25 && livesRemaining > 0 ? 25 : levelReached - 1)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['bubbleSurvival', 'levelsCompleted'], message: 'Invalid completed level count' })
      if (session.correctCount < levelsCompleted) context.addIssue({ code: z.ZodIssueCode.custom, path: ['bubbleSurvival'], message: 'Completed levels exceed correct answers' })
      if (session.wrongCount < 3 - livesRemaining) context.addIssue({ code: z.ZodIssueCode.custom, path: ['bubbleSurvival'], message: 'Lives do not match wrong answers' })
    }
    if (session.dragDropSurvival && session.gameId !== GAME_IDS.DRAG_DROP) context.addIssue({ code: z.ZodIssueCode.custom, path: ['dragDropSurvival'], message: 'Only drag-drop supports this survival data' })
    if (session.dragDropSurvival) {
      const { levelReached, levelsCompleted, livesRemaining } = session.dragDropSurvival
      if (levelsCompleted !== (levelReached === 25 && livesRemaining > 0 ? 25 : levelReached - 1)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['dragDropSurvival', 'levelsCompleted'], message: 'Invalid completed level count' })
      if (session.correctCount < levelsCompleted) context.addIssue({ code: z.ZodIssueCode.custom, path: ['dragDropSurvival'], message: 'Completed levels exceed correct answers' })
      if (session.wrongCount < 3 - livesRemaining) context.addIssue({ code: z.ZodIssueCode.custom, path: ['dragDropSurvival'], message: 'Lives do not match wrong answers' })
    }
    if (session.goldMinerSurvival && session.gameId !== GAME_IDS.GOLD_MINING) context.addIssue({ code: z.ZodIssueCode.custom, path: ['goldMinerSurvival'], message: 'Only gold mining supports this survival data' })
    if (session.goldMinerSurvival) {
      const { levelReached, levelsCompleted, livesRemaining } = session.goldMinerSurvival
      if (levelsCompleted !== (levelReached === 25 && livesRemaining > 0 ? 25 : levelReached - 1)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['goldMinerSurvival', 'levelsCompleted'], message: 'Invalid completed level count' })
      if (session.correctCount < levelsCompleted) context.addIssue({ code: z.ZodIssueCode.custom, path: ['goldMinerSurvival'], message: 'Completed levels exceed correct answers' })
      if (session.wrongCount < 3 - livesRemaining) context.addIssue({ code: z.ZodIssueCode.custom, path: ['goldMinerSurvival'], message: 'Lives do not match wrong answers' })
    }
    if (session.racingSurvival && session.gameId !== GAME_IDS.RACING) context.addIssue({ code: z.ZodIssueCode.custom, path: ['racingSurvival'], message: 'Only racing supports this survival data' })
    if (session.racingSurvival) {
      const { levelReached, levelsCompleted } = session.racingSurvival
      if (levelsCompleted !== (levelReached === 25 && session.racingSurvival.livesRemaining > 0 ? 25 : levelReached - 1)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['racingSurvival', 'levelsCompleted'], message: 'Invalid completed level count' })
      if (session.correctCount < levelsCompleted) context.addIssue({ code: z.ZodIssueCode.custom, path: ['racingSurvival'], message: 'Completed levels exceed correct answers' })
    }
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
    const survival = session.bubbleSurvival ?? session.dragDropSurvival ?? session.goldMinerSurvival ?? session.racingSurvival
    const survivalCollection = session.bubbleSurvival ? 'bubble_survival' : session.dragDropSurvival ? 'drag_drop_survival' : session.goldMinerSurvival ? 'gold_mining_survival' : 'racing_survival'
    const survivalField = session.bubbleSurvival ? 'bubbleSurvival' : session.dragDropSurvival ? 'dragDropSurvival' : session.goldMinerSurvival ? 'goldMinerSurvival' : 'racingSurvival'
    const survivalRef = survival
      ? db.collection('shopbebangcom').doc('game').collection(survivalCollection).doc(`${user?.id ?? guestId}_${session.lessonId}`)
      : null
    const walletRef = survival
      ? db.collection('shopbebangcom').doc('game').collection('coin_wallets').doc(user?.id ?? guestId!)
      : null
    const progressId = user ? `${user.id}_${session.lessonId}` : null
    const progressRef = progressId
      ? db.collection('shopbebangcom').doc('game').collection('learning_progress').doc(progressId)
      : null
    const progressUserId = user?.activeGame ? user.id : null
    const grade = lesson ? Number(lesson.gradeId.replace(/\D/g, '')) : null
    const subjectRef = progressUserId && lesson && grade
      ? subjectProgressRef(progressUserId, grade, lesson.subjectId) : null

    await db.runTransaction(async (transaction) => {
      const existingSession = await transaction.get(sessionRef)
      if (existingSession.exists) return

      const progressSnapshot =
        progressRef && progressUserId ? await transaction.get(progressRef) : null
      const subjectSnapshot = subjectRef ? await transaction.get(subjectRef) : null
      const survivalSnapshot = survivalRef ? await transaction.get(survivalRef) : null
      const walletSnapshot = walletRef ? await transaction.get(walletRef) : null
      const oldSurvival = survivalSnapshot?.data()
      const playCount = (oldSurvival?.playCount ?? 0) + 1
      const legacyBestLevel = oldSurvival?.bestLevelCompleted ?? (oldSurvival?.bestLevel
        ? oldSurvival.bestLevel === 25 ? 25 : Math.max(0, oldSurvival.bestLevel - 1)
        : 0)
      const bestLevel = Math.max(legacyBestLevel, survival?.levelsCompleted ?? 0)
      const baseCoin = survival ? baseCoinEarned(survival.levelsCompleted) : 0
      const multiplier = rewardMultiplier(playCount)
      const finalCoin = Math.round(baseCoin * multiplier)
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
        ...(survival ? { [survivalField]: { ...survival, bestLevel, bestLevelCompleted: bestLevel, playCount, baseCoinEarned: baseCoin, rewardMultiplier: multiplier, finalCoinEarned: finalCoin } } : {}),
        userId: user?.id ?? null,
        guestId,
        isGuest: !user,
        grade: lesson ? Number(lesson.gradeId.replace(/\D/g, '')) : null,
        subject: lesson?.subjectId ?? null,
        startedAt: Timestamp.fromMillis(session.startedAt),
        completedAt: FieldValue.serverTimestamp(),
      })
      if (survivalRef) transaction.set(survivalRef, {
        userId: user?.id ?? null, guestId, lessonId: session.lessonId, gameId: session.gameId,
        bestLevel, bestLevelCompleted: bestLevel, playCount,
        updatedAt: FieldValue.serverTimestamp(),
      })
      if (walletRef) transaction.set(walletRef, { balance: (walletSnapshot?.data()?.balance ?? 0) + finalCoin, updatedAt: FieldValue.serverTimestamp() })
      if (progressRef && progressSnapshot && progressUserId) {
        const games = {
          ...(progressSnapshot.data()?.games ?? {}),
          ...(!survival || survival.levelsCompleted === 25 ? { [session.gameId]: {
            completedAt: progressSnapshot.data()?.games?.[session.gameId]?.completedAt ?? FieldValue.serverTimestamp(),
          } } : {}),
        }
        transaction.set(progressRef, {
          userId: progressUserId,
          grade: lesson ? Number(lesson.gradeId.replace(/\D/g, '')) : null,
          subject: lesson?.subjectId ?? null,
          lessonId: session.lessonId,
          games,
          keys,
          totalSessions: (progressSnapshot.data()?.totalSessions ?? 0) + 1,
          updatedAt: FieldValue.serverTimestamp(),
        })
        if (subjectRef && lesson && grade) {
          const definition = getSubjectLessons(grade, lesson.subjectId).find(item => item.lessonId === session.lessonId)
          if (definition) {
            const old = subjectSnapshot?.data() as SubjectProgress | undefined
            const now = new Date().toISOString()
            const summary = summarizeLesson(definition, keys, games, now, old?.lessons?.[session.lessonId])
            transaction.set(subjectRef, {
              ...buildSubjectProgress(progressUserId, grade, lesson.subjectId,
                { ...old?.lessons, [session.lessonId]: summary }, now),
              updatedAt: FieldValue.serverTimestamp(),
            })
          }
        }
      }
    })

    const response = NextResponse.json({ sessionId: session.sessionId,
      progressScope: progressUserId && lesson ? { userId: progressUserId, grade, subjectId: lesson.subjectId, lessonId: session.lessonId } : null,
    })
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

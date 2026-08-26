import { NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { getAdminDb } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

const learningKeys = [
  'recognize-number-0', 'recognize-number-1', 'recognize-number-2',
  'recognize-number-3', 'recognize-number-4', 'recognize-number-5',
] as const

const resultSchema = z.object({
  learningKey: z.enum(learningKeys),
  correct: z.boolean(),
  expectedAnswer: z.union([z.string(), z.number()]).optional(),
  selectedAnswer: z.union([z.string(), z.number()]).optional(),
  responseTime: z.number().int().min(0).max(60 * 60 * 1000).optional(),
  attempt: z.number().int().min(1).max(100),
})

const sessionSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().min(1).max(128),
  lessonId: z.enum(['toan-1-bai-1']),
  gameId: z.enum(['drag-drop', 'gold-mining', 'racing']),
  score: z.number().int().min(0).max(100000),
  totalQuestions: z.number().int().min(0).max(1000),
  correctCount: z.number().int().min(0).max(1000),
  wrongCount: z.number().int().min(0).max(1000),
  duration: z.number().int().min(0).max(24 * 60 * 60 * 1000),
  startedAt: z.number().int().positive(),
  results: z.array(resultSchema).max(1000),
})

type Aggregate = { correct: number; wrong: number; attempts: number; responseTime: number; sessions: number }

export async function POST(request: Request) {
  try {
    // There is no trusted identity until Firebase Auth is added.
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ message: 'Game tracking requires authenticated users in production.' }, { status: 503 })
    }

    const session = sessionSchema.parse(await request.json())
    if (session.userId !== 'be-bang-test') {
      return NextResponse.json({ message: 'Invalid development user.' }, { status: 403 })
    }

    const db = getAdminDb()
    const sessionRef = db.collection('shopbebangcom').doc('game').collection('session').doc(session.sessionId)
    const progressId = `${session.userId}_${session.lessonId}`
    const progressRef = db.collection('shopbebangcom').doc('game').collection('learning_progress').doc(progressId)

    await db.runTransaction(async (transaction) => {
      const existingSession = await transaction.get(sessionRef)
      if (existingSession.exists) return

      const progressSnapshot = await transaction.get(progressRef)
      const existingKeys = (progressSnapshot.data()?.keys ?? {}) as Record<string, Partial<Aggregate>>
      const sessionKeys = new Set<string>(session.results.map((result) => result.learningKey))
      const increments = new Map<string, Aggregate>()

      for (const result of session.results) {
        const current = increments.get(result.learningKey) ?? { correct: 0, wrong: 0, attempts: 0, responseTime: 0, sessions: 0 }
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
        startedAt: Timestamp.fromMillis(session.startedAt),
        completedAt: FieldValue.serverTimestamp(),
      })
      transaction.set(progressRef, {
        userId: session.userId,
        lessonId: session.lessonId,
        keys,
        totalSessions: (progressSnapshot.data()?.totalSessions ?? 0) + 1,
        updatedAt: FieldValue.serverTimestamp(),
      })
    })

    return NextResponse.json({ sessionId: session.sessionId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid game session.', issues: error.issues }, { status: 400 })
    }
    console.error('[GameTracking] Session API failed', error)
    return NextResponse.json({ message: 'Could not save game session.' }, { status: 500 })
  }
}

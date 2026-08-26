import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminDb } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

const querySchema = z.object({
  userId: z.literal('be-bang-test'),
  lessonId: z.literal('toan-1-bai-1'),
})

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ message: 'Learning progress requires authentication in production.' }, { status: 503 })
  }
  const url = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return NextResponse.json({ message: 'Invalid query.' }, { status: 400 })

  const id = `${parsed.data.userId}_${parsed.data.lessonId}`
  const snapshot = await getAdminDb().collection('shopbebangcom').doc('game').collection('learning_progress').doc(id).get()
  return NextResponse.json(snapshot.exists ? snapshot.data() : { userId: parsed.data.userId, lessonId: parsed.data.lessonId, keys: {}, totalSessions: 0 })
}


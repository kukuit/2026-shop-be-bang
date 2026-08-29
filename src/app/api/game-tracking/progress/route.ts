import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { isLessonId } from '@/components/games/general/tracking/lesson-catalog'
import { getCurrentUser } from '@/lib/auth/current-user'
import { REFRESH_COOKIE } from '@/lib/auth/config'

export const runtime = 'nodejs'

const querySchema = z.object({
  lessonId: z.string().refine(isLessonId, 'Unknown lessonId'),
})

export async function GET(request: Request) {
  const user = await getCurrentUser()
  const hasRefreshToken = new RegExp(`(?:^|;\\s*)${REFRESH_COOKIE}=([^;]+)`).test(
    request.headers.get('cookie') ?? ''
  )
  if (!user && hasRefreshToken)
    return NextResponse.json({ message: 'Access token expired.' }, { status: 401 })
  if (!user) return NextResponse.json({ keys: {}, totalSessions: 0 })
  const url = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return NextResponse.json({ message: 'Invalid query.' }, { status: 400 })

  const id = `${user.id}_${parsed.data.lessonId}`
  const snapshot = await getAdminDb().collection('shopbebangcom').doc('game').collection('learning_progress').doc(id).get()
  return NextResponse.json(snapshot.exists ? snapshot.data() : { userId: user.id, lessonId: parsed.data.lessonId, keys: {}, totalSessions: 0 })
}

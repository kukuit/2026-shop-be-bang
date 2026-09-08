import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { isLessonId } from '@/components/games/general/tracking/lesson-catalog'
import { getCurrentUser } from '@/lib/auth/current-user'
import { REFRESH_COOKIE } from '@/lib/auth/config'
import { userGameSessions } from '@/lib/gameTrackingPaths'
import { GAME_IDS } from '@/components/games/general/tracking/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
  if (!user) return NextResponse.json({ keys: {}, games: {}, totalSessions: 0 }, { headers: { 'Cache-Control': 'private, no-store' } })
  const url = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return NextResponse.json({ message: 'Invalid query.' }, { status: 400 })

  const id = `${user.id}_${parsed.data.lessonId}`
  const snapshot = await getAdminDb().collection('shopbebangcom').doc('game').collection('learning_progress').doc(id).get()
  const data = snapshot.data() ?? { userId: user.id, lessonId: parsed.data.lessonId, keys: {}, totalSessions: 0 }
  const games = { ...(data.games ?? {}) }
  // Older sessions were also written only at game completion. Read them on the
  // game list so existing players retain their completion badges without a migration.
  if (url.searchParams.get('includeGames') === '1' && Object.values(GAME_IDS).some(id => !games[id]?.completedAt)) {
    const sessions = await userGameSessions(user.id)
      .where('lessonId', '==', parsed.data.lessonId)
      .select('gameId', 'completedAt').get()
    for (const session of sessions.docs) {
      const previous = session.data()
      if (Object.values(GAME_IDS).includes(previous.gameId) && previous.completedAt && !games[previous.gameId]?.completedAt)
        games[previous.gameId] = { completedAt: previous.completedAt }
    }
  }
  return NextResponse.json({ ...data, games }, { headers: { 'Cache-Control': 'private, no-store' } })
}

import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { getCurrentUser } from '@/lib/auth/current-user'
import { GUEST_COOKIE } from '@/lib/auth/config'
import { isLessonId } from '@/components/games/general/tracking/lesson-catalog'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const lessonId = new URL(request.url).searchParams.get('lessonId')
  if (!lessonId || !isLessonId(lessonId)) return NextResponse.json({ message: 'Invalid lessonId' }, { status: 400 })
  const user = await getCurrentUser()
  const guestId = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${GUEST_COOKIE}=([^;]+)`))?.[1]
  const playerId = user?.id ?? (guestId?.startsWith('guest_') ? guestId : null)
  if (!playerId) return NextResponse.json({ bestLevel: 0, playCount: 0, coinBalance: 0 })
  const db = getAdminDb()
  const [survival, wallet] = await Promise.all([
    db.collection('shopbebangcom').doc('game').collection('racing_survival').doc(`${playerId}_${lessonId}`).get(),
    db.collection('shopbebangcom').doc('game').collection('coin_wallets').doc(playerId).get(),
  ])
  const savedBest = survival.data()?.bestLevelCompleted
  const legacyBest = survival.data()?.bestLevel ?? 0
  const bestLevel = savedBest ?? (legacyBest === 25 ? 25 : Math.max(0, legacyBest - 1))
  return NextResponse.json({ bestLevel, playCount: survival.data()?.playCount ?? 0, coinBalance: wallet.data()?.balance ?? 0 })
}

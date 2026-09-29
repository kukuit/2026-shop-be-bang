import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import MeNavigation from '@/components/game/me/MeNavigation'
import GameAuthHeader from '@/components/auth/GameAuthHeader'
import { requireGameUser } from '@/lib/auth/current-user'
import { cookies } from 'next/headers'
import { REFRESH_COOKIE } from '@/lib/auth/config'

export const metadata: Metadata = {
  title: 'Tiến trình học của tôi',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function GameMeLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireGameUser()
  if (!auth.ok) {
    if (auth.status === 401 && cookies().get(REFRESH_COOKIE)?.value)
      redirect('/auth/continue?next=%2Fgame%2Fme')
    redirect(auth.status === 401 ? '/game?auth=required' : '/game?game=disabled')
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <GameAuthHeader />
      <main className="py-5 sm:py-7">
        <div className="game-container grid gap-4 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start lg:gap-6">
          <MeNavigation />
          <div className="min-w-0">{children}</div>
        </div>
      </main>
    </div>
  )
}

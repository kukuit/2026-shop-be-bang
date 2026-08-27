import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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
    <div className="min-h-screen bg-slate-100">
      <GameAuthHeader />
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 text-sm font-bold">
          <Link
            href="/game/me"
            className="whitespace-nowrap rounded-xl px-4 py-2 hover:bg-blue-50 hover:text-blue-700"
          >
            Tổng quan
          </Link>
          <Link
            href="/game/me/dashboard"
            className="whitespace-nowrap rounded-xl px-4 py-2 hover:bg-blue-50 hover:text-blue-700"
          >
            Dashboard
          </Link>
          <Link
            href="/game/me/tracking"
            className="whitespace-nowrap rounded-xl px-4 py-2 hover:bg-blue-50 hover:text-blue-700"
          >
            Tracking
          </Link>
          <Link
            href="/game/me/evaluation"
            className="whitespace-nowrap rounded-xl px-4 py-2 hover:bg-blue-50 hover:text-blue-700"
          >
            Đánh giá bài học
          </Link>
          <Link
            href="/game/me/session"
            className="whitespace-nowrap rounded-xl px-4 py-2 hover:bg-blue-50 hover:text-blue-700"
          >
            Phiên chơi
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-7">{children}</main>
    </div>
  )
}

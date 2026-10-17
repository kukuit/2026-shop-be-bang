import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/current-user'
import { REFRESH_COOKIE } from '@/lib/auth/config'
import { GameProfileProvider } from '@/components/games/profile/GameProfileProvider'
import { RouteGradeSync } from '@/components/games/profile/GradeControls'
import GameRouteShell from '@/components/games/navigation/GameRouteShell'

export const dynamic = 'force-dynamic'

export default async function GameLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()
  if (user?.role === 'admin') redirect('/admin/users')
  if (!user && cookies().get(REFRESH_COOKIE)?.value)
    redirect('/auth/continue?next=%2Fgame')

  return <GameProfileProvider><RouteGradeSync /><div className="game-typography"><GameRouteShell>{children}</GameRouteShell></div></GameProfileProvider>
}

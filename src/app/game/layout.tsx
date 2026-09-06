import type { ReactNode } from 'react'
import { GameProfileProvider } from '@/components/games/profile/GameProfileProvider'
import { RouteGradeSync } from '@/components/games/profile/GradeControls'

export default function GameLayout({ children }: { children: ReactNode }) {
  return <GameProfileProvider><RouteGradeSync /><div className="game-typography">{children}</div></GameProfileProvider>
}

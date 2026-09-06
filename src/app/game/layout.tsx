import type { ReactNode } from 'react'

export default function GameLayout({ children }: { children: ReactNode }) {
  return <div className="game-typography">{children}</div>
}

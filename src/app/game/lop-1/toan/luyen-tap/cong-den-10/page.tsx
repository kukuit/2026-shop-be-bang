import type { Metadata } from 'next'
import GameClient from './GameClient'

export const metadata: Metadata = {
  title: 'Toán 1 - Luyện Tập',
  description: 'Mini game Phaser 3 luyện phép cộng trong phạm vi 10 cho bé.',
}

export default function CongDen10Page() {
  return (
    <main className="flex h-dvh w-full items-center justify-center overflow-hidden bg-sky-200 overscroll-none">
      <GameClient />
    </main>
  )
}

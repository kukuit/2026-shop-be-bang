import type { Metadata } from 'next'
import GameClient from './GameClient'

export const metadata: Metadata = {
  title: 'Đào vàng - Toán lớp 1',
  description: 'Trò chơi đào vàng luyện đếm dành cho bé lớp 1.',
}

export default function GoldMiningPage() {
  return <main className="flex h-dvh w-full items-center justify-center overflow-hidden bg-[#251008] overscroll-none">
    <GameClient />
  </main>
}

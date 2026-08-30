import type { Metadata } from 'next'
import GameClient from './GameClient'

export const metadata: Metadata = {
  title: 'Bắn bong bóng số 0 đến 5 - Toán lớp 1',
  description: 'Trò chơi bắn bong bóng luyện nhận biết các số từ 0 đến 5 dành cho bé lớp 1.',
}

export default function BubbleShooterPage() {
  return (
    <main className="fixed inset-0 flex h-dvh w-screen items-center justify-center overflow-hidden bg-sky-200 overscroll-none">
      <GameClient />
    </main>
  )
}

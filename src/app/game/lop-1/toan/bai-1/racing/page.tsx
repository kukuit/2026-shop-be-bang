import type { Metadata } from 'next'
import RacingGame from '@/components/games/racing/RacingGame'

export const metadata: Metadata = {
  title: 'Đua xe nhận biết số 0–5 - Toán lớp 1',
  description: 'Trò chơi đua xe ba làn luyện nhận biết số và số lượng từ 0 đến 5 dành cho bé lớp 1.',
}

export default function RacingPage() {
  return <main className="fixed inset-0 flex h-dvh w-screen items-center justify-center overflow-hidden bg-sky-200 overscroll-none">
    <RacingGame />
  </main>
}

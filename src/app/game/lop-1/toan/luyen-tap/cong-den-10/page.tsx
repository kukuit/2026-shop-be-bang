import type { Metadata } from 'next'
import PhaserGame from '@/components/games/bubble-shooter/PhaserGame'

export const metadata: Metadata = {
  title: 'Bắn Bong Bóng Toán Học',
  description: 'Mini game Phaser 3 luyện phép cộng trong phạm vi 10 cho bé.',
}

export default function CongDen10Page() {
  return (
    <main className="fixed inset-0 flex h-dvh w-screen items-center justify-center overflow-hidden bg-sky-200 overscroll-none">
      <PhaserGame />
    </main>
  )
}

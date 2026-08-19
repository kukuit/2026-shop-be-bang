import type { Metadata } from 'next'
import GoldMinerGame from '@/components/games/gold-miner/GoldMinerGame'

export const metadata: Metadata = {
  title: 'Đào vàng - Toán lớp 1',
  description: 'Trò chơi đào vàng luyện đếm dành cho bé lớp 1.',
}

export default function GoldMiningPage() {
  return <main className="fixed inset-0 flex h-dvh w-screen items-center justify-center overflow-hidden bg-[#251008] overscroll-none">
    <GoldMinerGame />
  </main>
}

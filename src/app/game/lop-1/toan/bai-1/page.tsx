import LessonGameGrid from '@/components/games/general/LessonGameGrid'
import { LESSON_IDS } from '@/components/games/general/tracking/lesson-catalog'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import GameAuthHeader from '@/components/auth/GameAuthHeader'

const games = [
  { title: 'Bắn bóng', subtitle: 'Các số từ 0 đến 5', href: '/game/lop-1/toan/bai-1/bubble-shooter', image: '/games/bubble-shooter/images/thumbnail/thumbnail-v2.png', position: 'center 38%', color: 'from-sky-500 to-blue-700' },
  { title: 'Kéo thả số', subtitle: 'Các số từ 0 đến 5', href: '/game/lop-1/toan/bai-1/drag-drop', image: '/games/drag-drop/images/thumbnail/thumbnail-v2.png', position: 'center 68%', color: 'from-emerald-500 to-teal-700' },
  { title: 'Đào vàng', subtitle: 'Các số từ 0 đến 5', href: '/game/lop-1/toan/bai-1/gold-mining', image: '/games/gold-mining/images/thumbnail/thumbnail.jpg', position: 'center 22%', color: 'from-amber-500 to-orange-800' },
  { title: 'Đua xe', subtitle: 'Các số từ 0 đến 5', href: '/game/lop-1/toan/bai-1/racing', image: '/games/racing/images/thumbnail/thumbnail.jpg', position: 'center center', color: 'from-red-500 to-blue-700' },
] as const

export default function LessonOnePage() {
  return (
    <><GameAuthHeader /><main className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-sky-50 to-pink-50 py-7 md:py-10">
      <section className="game-container">
        <nav aria-label="Điều hướng bài học" className="flex items-center gap-1 overflow-x-auto whitespace-nowrap text-sm font-bold text-slate-500">
          <Link href="/game" className="text-blue-700 hover:text-blue-800">Game</Link><ChevronRight size={15} />
          <Link href="/game/lop-1" className="text-blue-700 hover:text-blue-800">Lớp 1</Link><ChevronRight size={15} />
          <Link href="/game/lop-1/toan" className="text-blue-700 hover:text-blue-800">Toán</Link><ChevronRight size={15} />
          <span className="text-slate-800" aria-current="page">Bài 1</span>
        </nav>
        <div className="mt-5 md:mt-7"><h1 className="text-2xl font-black text-slate-800 md:text-4xl">Toán lớp 1 - Bài 1</h1></div>
        <LessonGameGrid lessonId={LESSON_IDS.TOAN_1_BAI_1} games={games} subtitle="Các số từ 0 đến 5" />
      </section>
    </main></>
  )
}

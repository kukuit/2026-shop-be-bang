import LessonGameGrid from '@/components/games/general/LessonGameGrid'
import { LESSON_IDS } from '@/components/games/general/tracking/lesson-catalog'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import GameAuthHeader from '@/components/auth/GameAuthHeader'

const games = [
  { title: 'Nhặt trứng', href: '/game/lop-1/toan/bai-2/egg-hunt', image: '/games/egg-hunt/thumbnail.svg', color: 'from-teal-500 to-emerald-800', subtitle: 'Lắc xúc xắc · Nhặt đủ 6 trứng' },
  { title: 'Bắn bóng', href: '/game/lop-1/toan/bai-2/bubble-shooter', image: '/games/bubble-shooter/images/optimize/thumbnail/thumbnail.png', color: 'from-sky-500 to-blue-700' },
  { title: 'Kéo thả số', href: '/game/lop-1/toan/bai-2/drag-drop', image: '/games/drag-drop/images/optimize/thumbnail/thumbnail.png', color: 'from-emerald-500 to-teal-700' },
  { title: 'Đào vàng', href: '/game/lop-1/toan/bai-2/gold-mining', image: '/games/gold-mining/images/optimize/thumbnail/thumbnail.jpg', color: 'from-amber-500 to-orange-800' },
  { title: 'Đua xe', href: '/game/lop-1/toan/bai-2/racing', image: '/games/racing/images/optimize/thumbnail/thumbnail.jpg', color: 'from-red-500 to-blue-700' },
] as const

export default function Page() {
  return <><GameAuthHeader /><main className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-sky-50 to-pink-50 py-7 md:py-10"><section className="game-container">
    <nav className="flex items-center gap-1 text-sm font-bold text-slate-500" aria-label="Điều hướng bài học"><Link href="/game" className="text-blue-700">Game</Link><ChevronRight size={15}/><Link href="/game/lop-1" className="text-blue-700">Lớp 1</Link><ChevronRight size={15}/><Link href="/game/lop-1/toan" className="text-blue-700">Toán</Link><ChevronRight size={15}/><span className="text-slate-800">Bài 2</span></nav>
    <div className="mt-5"><h1 className="text-2xl font-black text-slate-800 md:text-4xl">Các số 6, 7, 8, 9, 10</h1></div>
    <LessonGameGrid lessonId={LESSON_IDS.TOAN_1_BAI_2} games={games} subtitle="Các số 6 đến 10" />
  </section></main></>
}

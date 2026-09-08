import LessonGameGrid from '@/components/games/general/LessonGameGrid'
import { LESSON_IDS } from '@/components/games/general/tracking/lesson-catalog'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import GameAuthHeader from '@/components/auth/GameAuthHeader'

const games = [
  { title: 'Bắn bóng', href: '/game/lop-1/tieng-anh/bai-1/bubble-shooter', image: '/games/bubble-shooter/images/thumbnail/thumbnail-v2.png', color: 'from-sky-500 to-blue-700' },
  { title: 'Kéo thả', href: '/game/lop-1/tieng-anh/bai-1/drag-drop', image: '/games/drag-drop/images/thumbnail/thumbnail-v2.png', color: 'from-emerald-500 to-teal-700' },
  { title: 'Đào vàng', href: '/game/lop-1/tieng-anh/bai-1/gold-mining', image: '/games/gold-mining/images/thumbnail/thumbnail.jpg', color: 'from-amber-500 to-orange-800' },
  { title: 'Đua xe', href: '/game/lop-1/tieng-anh/bai-1/racing', image: '/games/racing/images/thumbnail/thumbnail.jpg', color: 'from-red-500 to-blue-700' },
] as const

export default function Page() {
  return <><GameAuthHeader /><main className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-sky-50 to-pink-50 py-7 md:py-10"><section className="game-container">
    <nav className="flex items-center gap-1 text-sm font-bold text-slate-500"><Link href="/game" className="text-blue-700">Game</Link><ChevronRight size={15}/><Link href="/game/lop-1" className="text-blue-700">Lớp 1</Link><ChevronRight size={15}/><Link href="/game/lop-1/tieng-anh" className="text-blue-700">Tiếng Anh</Link><ChevronRight size={15}/><span>Bài 1</span></nav>
    <h1 className="mt-5 text-2xl font-black text-slate-800 md:text-4xl">In the school playground</h1>
    <LessonGameGrid lessonId={LESSON_IDS.TIENG_ANH_1_BAI_1} games={games} subtitle="Tiếng Anh lớp 1" />
  </section></main></>
}

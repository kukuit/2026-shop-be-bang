import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import GameAuthHeader from '@/components/auth/GameAuthHeader'
import LessonGameGrid from '@/components/games/general/LessonGameGrid'
import { TIENG_VIET_1_BAI_1 } from './lesson'

export const metadata: Metadata = { title: 'Tiếng Việt lớp 1 · Tuần 1: A, B, C, E, Ê' }
const root = '/game/lop-1/tieng-viet/bai-1'
const games = [
  { title: 'Bắn bóng', href: `${root}/bubble-shooter`, image: '/games/bubble-shooter/images/optimize/thumbnail/thumbnail.png', color: 'from-sky-500 to-blue-700' },
  { title: 'Đào vàng', href: `${root}/gold-mining`, image: '/games/gold-mining/images/optimize/thumbnail/thumbnail.jpg', color: 'from-amber-500 to-orange-800' },
  { title: 'Đua xe', href: `${root}/racing`, image: '/games/racing/images/optimize/thumbnail/thumbnail.jpg', color: 'from-red-500 to-blue-700' },
  { title: 'Kéo thả', href: `${root}/drag-drop`, image: '/games/drag-drop/images/optimize/thumbnail/thumbnail.png', color: 'from-emerald-500 to-teal-700' },
] as const

export default function Page() {
  return <><GameAuthHeader /><main className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-sky-50 to-pink-50 py-7 md:py-10"><section className="game-container">
    <nav className="flex flex-wrap items-center gap-1 text-sm font-bold text-slate-500"><Link href="/game" className="text-blue-700">Game</Link><ChevronRight size={15} /><Link href="/game/lop-1" className="text-blue-700">Lớp 1</Link><ChevronRight size={15} /><Link href="/game/lop-1/tieng-viet" className="text-blue-700">Tiếng Việt</Link><ChevronRight size={15} /><span>Tuần 1</span></nav>
    <h1 className="mt-5 text-2xl font-black text-slate-800 md:text-4xl">Tuần 1: A, B, C, E, Ê</h1>
    <LessonGameGrid lessonId={TIENG_VIET_1_BAI_1.lessonId} games={games} subtitle="Tiếng Việt lớp 1" />
  </section></main></>
}

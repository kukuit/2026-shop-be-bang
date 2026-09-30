import LessonGameGrid from '@/components/games/general/LessonGameGrid'
import { LESSON_IDS } from '@/components/games/general/tracking/lesson-catalog'

const games = [
  { title: 'Bắn bóng', subtitle: 'Các số từ 0 đến 5', href: '/game/lop-1/toan/bai-1/bubble-shooter', image: '/games/bubble-shooter/images/optimize/thumbnail/thumbnail.png', position: 'center 38%', color: 'from-sky-500 to-blue-700' },
  { title: 'Kéo thả số', subtitle: 'Các số từ 0 đến 5', href: '/game/lop-1/toan/bai-1/drag-drop', image: '/games/drag-drop/images/optimize/thumbnail/thumbnail.png', position: 'center 68%', color: 'from-emerald-500 to-teal-700' },
  { title: 'Đào vàng', subtitle: 'Các số từ 0 đến 5', href: '/game/lop-1/toan/bai-1/gold-mining', image: '/games/gold-mining/images/optimize/thumbnail/thumbnail.jpg', position: 'center 22%', color: 'from-amber-500 to-orange-800' },
  { title: 'Đua xe', subtitle: 'Các số từ 0 đến 5', href: '/game/lop-1/toan/bai-1/racing', image: '/games/racing/images/optimize/thumbnail/thumbnail.jpg', position: 'center center', color: 'from-red-500 to-blue-700' },
] as const

export default function LessonOnePage() {
  return (
    <><main className="min-h-[calc(100dvh-58px)] px-0 py-5 sm:py-8">
      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <h1 className="rounded-[28px] border-2 border-white/80 bg-sky-950/30 px-5 py-4 text-2xl font-black text-white shadow-[0_7px_0_#164e6380] backdrop-blur-sm sm:px-7 md:text-4xl">Các số từ 0 đến 5</h1>
        <LessonGameGrid lessonId={LESSON_IDS.TOAN_1_BAI_1} games={games} subtitle="Các số từ 0 đến 5" />
      </section>
    </main></>
  )
}

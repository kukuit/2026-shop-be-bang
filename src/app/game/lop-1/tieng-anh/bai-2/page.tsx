import LessonGameGrid from '@/components/games/general/LessonGameGrid'
import { LESSON_IDS } from '@/components/games/general/tracking/lesson-catalog'

const games = [
  { title: 'Bắn bóng', href: '/game/lop-1/tieng-anh/bai-2/bubble-shooter', image: '/games/bubble-shooter/images/optimize/thumbnail/thumbnail.png', color: 'from-sky-500 to-blue-700' },
  { title: 'Kéo thả', href: '/game/lop-1/tieng-anh/bai-2/drag-drop', image: '/games/drag-drop/images/optimize/thumbnail/thumbnail.png', color: 'from-emerald-500 to-teal-700' },
  { title: 'Đào vàng', href: '/game/lop-1/tieng-anh/bai-2/gold-mining', image: '/games/gold-mining/images/optimize/thumbnail/thumbnail.jpg', color: 'from-amber-500 to-orange-800' },
  { title: 'Đua xe', href: '/game/lop-1/tieng-anh/bai-2/racing', image: '/games/racing/images/optimize/thumbnail/thumbnail.jpg', color: 'from-red-500 to-blue-700' },
] as const

export default function Page() {
  return <><main className="min-h-[calc(100dvh-58px)] px-0 py-5 sm:py-8"><section className="mx-auto w-full max-w-6xl px-4 sm:px-6">

    <h1 className="rounded-[28px] border-2 border-white/80 bg-sky-950/30 px-5 py-4 text-2xl font-black text-white shadow-[0_7px_0_#164e6380] backdrop-blur-sm sm:px-7 md:text-4xl">In the dining room</h1>
    <LessonGameGrid lessonId={LESSON_IDS.TIENG_ANH_1_BAI_2} games={games} subtitle="Tiếng Anh lớp 1" />
  </section></main></>
}

import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, Play } from 'lucide-react'
import GameAuthHeader from '@/components/auth/GameAuthHeader'

const games = [
  { title: 'Bắn bóng', subtitle: 'Các số từ 0 đến 5', href: '/game/lop-1/toan/bai-1/bubble-shooter', image: '/games/bubble-shooter/images/thumbnail/thumbnail-v2.png', position: 'center 38%', color: 'from-sky-500 to-blue-700' },
  { title: 'Kéo thả số', subtitle: 'Các số từ 0 đến 5', href: '/game/lop-1/toan/bai-1/drag-drop', image: '/games/drag-drop/images/thumbnail/thumbnail-v2.png', position: 'center 68%', color: 'from-emerald-500 to-teal-700' },
  { title: 'Đào vàng', subtitle: 'Các số từ 0 đến 5', href: '/game/lop-1/toan/bai-1/gold-mining', image: '/games/gold-mining/images/thumbnail/thumbnail.jpg', position: 'center 22%', color: 'from-amber-500 to-orange-800' },
  { title: 'Đua xe', subtitle: 'Các số từ 0 đến 5', href: '/game/lop-1/toan/bai-1/racing', image: '/games/racing/images/thumbnail/thumbnail.jpg', position: 'center center', color: 'from-red-500 to-blue-700' },
] as const

export default function LessonOnePage() {
  return (
    <><GameAuthHeader /><main className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-sky-50 to-pink-50 px-4 py-7 md:px-6 md:py-10">
      <section className="mx-auto max-w-6xl">
        <nav aria-label="Điều hướng bài học" className="flex items-center gap-1 overflow-x-auto whitespace-nowrap text-sm font-bold text-slate-500">
          <Link href="/game" className="text-blue-700 hover:text-blue-800">Game</Link><ChevronRight size={15} />
          <Link href="/game/lop-1" className="text-blue-700 hover:text-blue-800">Lớp 1</Link><ChevronRight size={15} />
          <Link href="/game/lop-1/toan" className="text-blue-700 hover:text-blue-800">Toán</Link><ChevronRight size={15} />
          <span className="text-slate-800" aria-current="page">Bài 1</span>
        </nav>
        <div className="mt-5 md:mt-7"><h1 className="text-2xl font-black text-slate-800 md:text-4xl">Toán lớp 1 - Bài 1</h1></div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:mt-7 md:gap-5 lg:grid-cols-4">
          {games.map((game) => (
            <Link key={game.href} href={game.href} className="group relative aspect-square overflow-hidden rounded-2xl border-[3px] border-white bg-white shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 md:rounded-[2rem]" aria-label={`Chơi ${game.title}`}>
              <Image src={game.image} alt={`Ảnh game ${game.title}`} fill sizes="(min-width: 1024px) 270px, 48vw" className="object-cover transition duration-500 group-hover:scale-105" style={{ objectPosition: game.position }} priority />
              <div className="absolute inset-x-0 bottom-0 py-3 pl-3 pr-14 text-white md:py-4 md:pl-5 md:pr-16"><span className={`absolute inset-0 bg-gradient-to-t ${game.color} opacity-80`} /><p className="relative truncate text-base font-black leading-tight md:text-2xl">{game.title}</p><p className="relative mt-0.5 text-[10px] font-bold text-white/85 md:text-sm">{game.subtitle}</p></div>
              <span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-white/90 text-sky-600 shadow-lg md:bottom-4 md:right-4 md:h-11 md:w-11"><Play className="ml-0.5 h-4 w-4 fill-current md:h-5 md:w-5" /></span>
            </Link>
          ))}
        </div>
      </section>
    </main></>
  )
}

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Gamepad2, Play } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Trò chơi học tập',
  description: 'Các trò chơi học tập vui nhộn dành cho bé.',
}

const games = [
  {
    title: 'Bắn bong bóng',
    subtitle: 'Phép cộng đến 10',
    href: '/game/lop-1/toan/luyen-tap/cong-den-10',
    image: '/games/bubble-shooter/images/background.png',
    position: 'center 38%',
    color: 'from-sky-500 to-blue-700',
  },
  {
    title: 'Kéo thả số',
    subtitle: 'Các số từ 0 đến 5',
    href: '/game/lop-1/toan/bai-1/drag-drop',
    image: '/games/drag-drop/images/farm-background.png',
    position: 'center 68%',
    color: 'from-emerald-500 to-teal-700',
  },
  {
    title: 'Đào vàng',
    subtitle: 'Nhìn hình và đếm số',
    href: '/game/lop-1/toan/bai-1/gold-mining',
    image: '/games/gold-mining/images/mine-background.png',
    position: 'center 22%',
    color: 'from-amber-500 to-orange-800',
  },
  {
    title: 'Đua xe',
    subtitle: 'Nhận biết số từ 0 đến 5',
    href: '/game/lop-1/toan/bai-1/racing',
    image: '/games/racing/images/card.svg',
    position: 'center center',
    color: 'from-red-500 to-blue-700',
  },
]

export default function GamePage() {
  return (
    <main className="relative overflow-hidden bg-gradient-to-b from-sky-50 to-pink-50 px-3 py-7 md:py-10">
      <section className="relative mx-auto max-w-3xl">
        <div className="flex items-center justify-center gap-3 text-center">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-200">
            <Gamepad2 size={24} aria-hidden="true" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-900 md:text-3xl">Bé Băng Games</h1>
            <p className="text-xs font-bold text-slate-500 md:text-sm">Bé muốn chơi game nào?</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:gap-6">
          {games.map((game) => (
            <Link
              key={game.href}
              href={game.href}
              className="group relative aspect-square overflow-hidden rounded-2xl border-[3px] border-white bg-white shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 md:rounded-[2rem]"
              aria-label={`Chơi ${game.title}`}
            >
              <Image
                src={game.image}
                alt={`Ảnh game ${game.title}`}
                fill
                sizes="(min-width: 768px) 360px, 48vw"
                className="object-cover transition duration-500 group-hover:scale-105"
                style={{ objectPosition: game.position }}
                priority
              />
              <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t ${game.color} px-3 pb-3 pt-10 text-white md:px-5 md:pb-5 md:pt-16`}>
                <p className="text-base font-black leading-tight md:text-2xl">{game.title}</p>
                <p className="mt-0.5 text-[10px] font-bold text-white/85 md:text-sm">{game.subtitle}</p>
              </div>
              <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-white/90 text-sky-600 shadow-lg md:h-11 md:w-11">
                <Play className="ml-0.5 h-4 w-4 fill-current md:h-5 md:w-5" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}

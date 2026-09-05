import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, Play } from 'lucide-react'
import GameAuthHeader from '@/components/auth/GameAuthHeader'

const games = [
  { title: 'Bắn bóng', href: './bai-1/bubble-shooter', image: '/games/bubble-shooter/images/thumbnail/thumbnail-v2.png', color: 'from-sky-500 to-blue-700' },
  { title: 'Kéo thả', href: './bai-1/drag-drop', image: '/games/drag-drop/images/thumbnail/thumbnail-v2.png', color: 'from-emerald-500 to-teal-700' },
  { title: 'Đào vàng', href: './bai-1/gold-mining', image: '/games/gold-mining/images/thumbnail/thumbnail.jpg', color: 'from-amber-500 to-orange-800' },
  { title: 'Đua xe', href: './bai-1/racing', image: '/games/racing/images/thumbnail/thumbnail.jpg', color: 'from-red-500 to-blue-700' },
] as const

export default function Page() {
  return <><GameAuthHeader /><main className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-sky-50 to-pink-50 px-4 py-7 md:px-6 md:py-10"><section className="mx-auto max-w-6xl">
    <nav className="flex items-center gap-1 text-sm font-bold text-slate-500"><Link href="/game" className="text-blue-700">Game</Link><ChevronRight size={15}/><Link href="/game/lop-1" className="text-blue-700">Lớp 1</Link><ChevronRight size={15}/><Link href="/game/lop-1/tieng-anh" className="text-blue-700">Tiếng Anh</Link><ChevronRight size={15}/><span>Bài 1</span></nav>
    <h1 className="mt-5 text-2xl font-black text-slate-800 md:text-4xl">In the school playground</h1>
    <div className="mt-5 grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">{games.map((game) => <Link key={game.href} href={game.href} className="group relative aspect-square overflow-hidden rounded-2xl border-[3px] border-white bg-white shadow-xl md:rounded-[2rem]">
      <Image src={game.image} alt={`Ảnh game ${game.title}`} fill sizes="(min-width: 1024px) 270px, 48vw" className="object-cover transition group-hover:scale-105"/><div className="absolute inset-x-0 bottom-0 py-3 pl-3 pr-14 text-white"><span className={`absolute inset-0 bg-gradient-to-t ${game.color} opacity-80`}/><p className="relative text-base font-black md:text-2xl">{game.title}</p><p className="relative text-xs font-bold">Tiếng Anh lớp 1</p></div><span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-sky-600"><Play className="h-4 w-4 fill-current"/></span>
    </Link>)}</div>
  </section></main></>
}

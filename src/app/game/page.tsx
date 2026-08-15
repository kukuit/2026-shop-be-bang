import type { Metadata } from 'next'
import Link from 'next/link'
import { Gamepad2, Play } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Trò chơi học tập',
  description: 'Các trò chơi học tập vui nhộn dành cho bé.',
}

export default function GamePage() {
  return (
    <main className="min-h-[70vh] bg-gradient-to-b from-sky-50 to-white px-4 py-16">
      <section className="mx-auto max-w-3xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
          <Gamepad2 className="h-8 w-8" aria-hidden="true" />
        </div>

        <h1 className="mt-6 text-3xl font-black text-slate-900 md:text-4xl">Trò chơi học tập</h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-600">
          Vừa chơi vừa luyện toán với những thử thách vui nhộn dành cho bé.
        </p>

        <Link
          href="/game/lop-1/toan/luyen-tap/cong-den-10"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-sky-500 px-6 py-3 font-bold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          <Play className="h-5 w-5" aria-hidden="true" />
          Chơi game cộng đến 10
        </Link>
      </section>
    </main>
  )
}

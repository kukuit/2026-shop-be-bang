import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import GameAuthHeader from '@/components/auth/GameAuthHeader'

export default function ComingSoon({ title, backHref }: { title: string; backHref: string }) {
  return (
    <>
      <GameAuthHeader />
      <main className="grid min-h-[calc(100dvh-4rem)] place-items-center bg-gradient-to-b from-sky-50 to-pink-50 px-4 text-center">
        <div>
          <p className="text-5xl" aria-hidden="true">🚧</p>
          <h1 className="mt-4 text-3xl font-black text-slate-800">{title}</h1>
          <p className="mt-2 font-semibold text-slate-500">Nội dung đang được cập nhật.</p>
          <Link href={backHref} className="mt-6 inline-flex items-center gap-1 rounded-full bg-blue-600 px-5 py-3 font-black text-white shadow-lg hover:bg-blue-700">
            <ChevronLeft size={18} aria-hidden="true" /> Quay lại
          </Link>
        </div>
      </main>
    </>
  )
}

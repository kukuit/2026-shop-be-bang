import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function ComingSoon({ title, backHref }: { title: string; backHref: string }) {
  return (
    <>
      <main className="grid min-h-[calc(100dvh-58px)] place-items-center px-4 text-center">
        <div className="max-w-lg rounded-[30px] border-2 border-white/80 bg-sky-950/30 p-7 text-white shadow-[0_7px_0_#164e6380] backdrop-blur-sm sm:p-10">
          <p className="text-5xl" aria-hidden="true">🚧</p>
          <h1 className="mt-4 text-3xl font-black">{title}</h1>
          <p className="mt-2 font-semibold text-sky-50">Nội dung đang được cập nhật.</p>
          <Link href={backHref} className="mt-6 inline-flex min-h-12 items-center gap-1 rounded-full border-2 border-white bg-amber-400 px-5 py-3 font-black text-amber-950 shadow-[0_3px_0_#a16207] active:translate-y-0.5 active:shadow-none">
            <ChevronLeft size={18} aria-hidden="true" /> Quay lại
          </Link>
        </div>
      </main>
    </>
  )
}

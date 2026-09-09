import Image from 'next/image'
import type { ReactNode } from 'react'

export default function CappyJourneyLoading({ children, message }: { children?: ReactNode; message?: ReactNode }) {
  return <div className="fixed inset-x-0 bottom-0 top-16 z-40 grid w-full place-items-center overflow-y-auto bg-gradient-to-br from-sky-100 via-violet-50 to-pink-100 p-6" role="status" aria-live="polite">
    {children ?? <div className="text-center">
      <div aria-hidden="true" className="relative mx-auto mb-6 h-28 w-28 motion-safe:animate-bounce motion-safe:[animation-duration:2.4s]">
        <Image src="/games/general/images/loading-cappy-adventure.png" alt="" width={112} height={112} priority unoptimized className="h-full w-full object-contain drop-shadow-md" />
      </div>
      <p className="text-xl font-black leading-relaxed sm:text-2xl">
        {message ? <span className="text-sky-700">{message}</span> : <><span className="text-violet-600">Cappy</span>{' '}
        <span className="text-sky-700">đang chuẩn bị</span>{' '}
        <span className="text-pink-600">hành trình</span></>}
        <span className="sr-only">…</span>
      </p>
      <div aria-hidden="true" className="mt-5 flex justify-center gap-2">
        {['bg-sky-400', 'bg-violet-400', 'bg-pink-400'].map((color, index) => (
          <span key={color} className={`h-3 w-3 rounded-full ${color} motion-safe:animate-bounce motion-safe:[animation-duration:1.4s]`} style={{ animationDelay: `${index * 180}ms` }} />
        ))}
      </div>
    </div>}
  </div>
}

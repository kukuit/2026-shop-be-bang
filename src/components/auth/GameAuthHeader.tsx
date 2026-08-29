'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Gamepad2 } from 'lucide-react'
import AuthMenu from './AuthMenu'

export default function GameAuthHeader({ overlay = false }: { overlay?: boolean }) {
  return (
    <header
      className={
        overlay
          ? 'absolute inset-x-0 top-0 z-50 flex items-center justify-between p-2 pointer-events-none'
          : 'sticky top-0 z-50 border-b border-blue-100 bg-white/95 shadow-sm backdrop-blur'
      }
    >
      <div
        className={
          overlay
            ? 'pointer-events-auto ml-auto'
            : 'mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 md:px-6'
        }
      >
        {!overlay && (
          <>
            <Link href="/" className="flex min-w-0 items-center gap-2 font-black text-slate-800" aria-label="Về Shop Bé Băng">
              <Image src="/images/logo.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-full" priority />
              <span className="hidden truncate sm:inline">Shop Bé Băng</span>
            </Link>
            <Link href="/game" className="flex items-center justify-center gap-2 whitespace-nowrap font-black text-blue-700">
              <Gamepad2 size={21} aria-hidden="true" />
              <span>Game / Học tập</span>
            </Link>
          </>
        )}
        <div className={overlay ? 'pointer-events-auto ml-auto' : 'flex min-w-0 justify-end'}>
          <AuthMenu game />
        </div>
      </div>
    </header>
  )
}

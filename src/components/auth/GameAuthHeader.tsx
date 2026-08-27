'use client'
import Link from 'next/link'
import { Gamepad2 } from 'lucide-react'
import AuthMenu from './AuthMenu'

export default function GameAuthHeader({ overlay = false }: { overlay?: boolean }) {
  return (
    <header
      className={
        overlay
          ? 'absolute inset-x-0 top-0 z-50 flex items-center justify-between p-2 pointer-events-none'
          : 'border-b border-blue-100 bg-white'
      }
    >
      <div
        className={
          overlay
            ? 'pointer-events-auto ml-auto'
            : 'mx-auto flex h-16 max-w-5xl items-center justify-between px-4'
        }
      >
        {!overlay && (
          <Link href="/game" className="flex items-center gap-2 font-black text-blue-700">
            <Gamepad2 size={22} />
            Game / Học tập
          </Link>
        )}
        <div className={overlay ? 'pointer-events-auto ml-auto' : ''}>
          <AuthMenu game />
        </div>
      </div>
    </header>
  )
}

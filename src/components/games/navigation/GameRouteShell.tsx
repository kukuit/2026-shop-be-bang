'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import AuthMenu from '@/components/auth/AuthMenu'
import { useAuth } from '@/components/auth/AuthProvider'
import GameGradePopup from './GameGradePopup'

function routeInfo(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const current = segments.at(-1) ?? 'game'
  const parent = `/${segments.slice(0, -1).join('/')}`
  const subject = segments[2]
  const grade = segments[1]?.replace('lop-', 'Lớp ')
  const title = current.startsWith('bai-') ? `BÀI ${current.slice(4)} · ${subject === 'toan' ? 'TOÁN' : subject === 'tieng-viet' ? 'TIẾNG VIỆT' : 'TIẾNG ANH'} · ${grade.toUpperCase()}`
    : current === 'toan' ? 'QUẦN ĐẢO TOÁN HỌC'
      : current === 'tieng-viet' ? 'VÙNG ĐẤT TIẾNG VIỆT'
        : current === 'tieng-anh' ? 'VŨ TRỤ TIẾNG ANH'
          : `GAME ${grade.toUpperCase()}`
  return { parent, title }
}

export default function GameRouteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, loading: authLoading } = useAuth()
  const active = /^\/game\/lop-\d+/.test(pathname)
    && !/\/(bubble-shooter|drag-drop|gold-mining|racing|egg-hunt)(\/|$)/.test(pathname)
    && !pathname.includes('/luyen-tap/')
  if (!active) return <>{children}</>
  const { parent, title } = routeInfo(pathname)
  const isWorldSelect = /^\/game\/lop-\d+\/?$/.test(pathname)
  const accountTrigger = <span className="relative grid h-10 w-10 place-items-center">
    <Settings size={22} strokeWidth={2.8} />
    {user ? <span className="pointer-events-none absolute -right-1 -top-1 grid h-5 w-5 place-items-center overflow-hidden rounded-full border-2 border-white bg-sky-100 text-[9px] font-black text-sky-900">
      {user.avatar ? <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatar} alt="" aria-hidden="true" className="h-full w-full object-cover" />
      </> : Array.from(user.displayName.trim())[0]?.toLocaleUpperCase('vi-VN')}
    </span> : !authLoading && <span aria-hidden="true" className="pointer-events-none absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />}
  </span>

  return <div className="game-platform min-h-dvh overflow-x-hidden bg-[radial-gradient(ellipse_at_top,#b8edff_0%,#65c6ed_48%,#287fbd_100%)] text-sky-950">
    <header className="sticky top-0 z-50 h-[58px] w-full border-b-2 border-white/70 bg-sky-900/75 text-white shadow-[0_4px_0_#164e6380] backdrop-blur-md">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-3 sm:px-5">
        {isWorldSelect ? <GameGradePopup /> : <Link href={parent} aria-label="Quay lại" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 border-white/90 bg-blue-500 shadow-[0_3px_0_#164e63] transition active:translate-y-0.5 active:shadow-none"><ArrowLeft size={23} strokeWidth={3} /></Link>}
        <p className="min-w-0 truncate px-3 text-center text-sm font-black tracking-wide sm:text-base">{title}</p>
        <AuthMenu game gamePopup trigger={accountTrigger} menuAlign="right" triggerClassName="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 border-white/90 bg-amber-400 text-amber-950 shadow-[0_3px_0_#a16207] transition active:translate-y-0.5 active:shadow-none" />
      </div>
    </header>
    {children}
  </div>
}

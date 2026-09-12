'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SUBJECTS } from '@/lib/game-progress/config'

export default function MeNavigation() {
  const pathname = usePathname()
  const items = [{ route: '/game/me', label: 'Tổng quan' }, ...SUBJECTS, { route: '/game/me/session', label: 'Phiên chơi' }]
  return <nav aria-label="Tiến trình học" className="border-b border-slate-200 bg-white">
    <div className="game-container flex gap-2 overflow-x-auto py-3 text-sm font-bold">
      {items.map(item => <Link key={item.route} href={item.route} prefetch={false} aria-current={pathname === item.route ? 'page' : undefined}
        className={`whitespace-nowrap rounded-xl px-4 py-2 focus-visible:outline focus-visible:outline-1 focus-visible:outline-blue-600 ${pathname === item.route ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>{item.label}</Link>)}
    </div>
  </nav>
}

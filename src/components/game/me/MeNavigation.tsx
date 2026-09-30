'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { BookOpen, ChevronDown, Gift, History, LayoutDashboard } from 'lucide-react'
import { SUBJECTS } from '@/lib/game-progress/config'

const progressLinks = [
  { route: '/game/me', label: 'Tổng quan', icon: LayoutDashboard },
  ...SUBJECTS.map(subject => ({ route: subject.route, label: subject.label, icon: BookOpen })),
  { route: '/game/me/session', label: 'Phiên chơi', icon: History },
]

export default function MeNavigation() {
  const pathname = usePathname()
  const [progressOpen, setProgressOpen] = useState(true)
  const [rewardsOpen, setRewardsOpen] = useState(true)
  const onRewards = pathname.startsWith('/game/me/rewards')
  const activeHistory = pathname === '/game/me/rewards/history'
  const activeList = onRewards && !activeHistory
  const linkStyle = (active: boolean) => `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
  return <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" aria-label="Điều hướng khu phụ huynh">
    <nav className="space-y-2">
      <section>
        <button type="button" aria-expanded={progressOpen} onClick={() => setProgressOpen(value => !value)} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left font-black text-slate-800 hover:bg-slate-50">
          <span className="flex items-center gap-2"><BookOpen size={19} className="text-blue-600" /> Tiến trình học</span><ChevronDown size={17} className={`transition-transform ${progressOpen ? '' : '-rotate-90'}`} />
        </button>
        {progressOpen && <div className="ml-2 space-y-1 border-l border-slate-200 pl-2">{progressLinks.map(item => <Link key={item.route} href={item.route} prefetch={false} aria-current={pathname === item.route ? 'page' : undefined} className={linkStyle(pathname === item.route)}><item.icon size={16} />{item.label}</Link>)}</div>}
      </section>
      <section>
        <button type="button" aria-expanded={rewardsOpen} onClick={() => setRewardsOpen(value => !value)} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left font-black hover:bg-slate-50 ${onRewards ? 'text-blue-700' : 'text-slate-800'}`}>
          <span className="flex items-center gap-2"><Gift size={19} className="text-amber-500" /> Đổi quà</span><ChevronDown size={17} className={`transition-transform ${rewardsOpen ? '' : '-rotate-90'}`} />
        </button>
        {rewardsOpen && <div className="ml-2 space-y-1 border-l border-slate-200 pl-2">
          <Link href="/game/me/rewards/list" prefetch={false} aria-current={activeList ? 'page' : undefined} className={linkStyle(activeList)}><Gift size={16} />Danh sách quà</Link>
          <Link href="/game/me/rewards/history" prefetch={false} aria-current={activeHistory ? 'page' : undefined} className={linkStyle(activeHistory)}><History size={16} />Lịch sử đổi quà</Link>
        </div>}
      </section>
    </nav>
  </aside>
}

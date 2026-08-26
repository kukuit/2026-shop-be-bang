import type { Metadata } from 'next'
import Link from 'next/link'
import { Activity, BookOpenCheck, Gamepad2, ListChecks } from 'lucide-react'
import AdminShell from './AdminShell'

export const metadata: Metadata = { title: 'Quản trị theo dõi học tập', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const links = [
  { href: '/game/admin/dashboard', label: 'Dashboard học tập', icon: BookOpenCheck },
  { href: '/game/admin/tracking', label: 'Tổng quan', icon: Activity },
  { href: '/game/admin/session', label: 'Phiên chơi', icon: ListChecks },
  { href: '/game/admin/danh-gia', label: 'Đánh giá bài học', icon: BookOpenCheck },
]

export default function GameAdminLayout({ children }: { children: React.ReactNode }) {
  const legacy = <div className="min-h-screen bg-slate-100 text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white"><Gamepad2 /></span>
          <div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Shop Bé Băng</p><h1 className="text-xl font-black">Theo dõi học tập</h1></div>
        </div>
        <nav className="flex flex-wrap gap-2">
          {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold shadow-sm hover:border-blue-300 hover:text-blue-700"><Icon size={17} />{label}</Link>)}
        </nav>
      </div>
    </header>
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-800">Trang quản trị hiện chưa có xác thực và sẽ công khai nếu deploy.</div>
    <main className="mx-auto max-w-7xl px-4 py-7">{children}</main>
  </div>
  return <AdminShell dashboard={children} legacy={legacy} />
}


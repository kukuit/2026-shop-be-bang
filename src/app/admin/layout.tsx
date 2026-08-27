import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap, LayoutDashboard, Users } from 'lucide-react'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/current-user'
import { cookies } from 'next/headers'
import { REFRESH_COOKIE } from '@/lib/auth/config'

export const metadata: Metadata = {
  title: 'Quản trị Shop Bé Băng',
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    if (auth.status === 401 && cookies().get(REFRESH_COOKIE)?.value)
      redirect('/auth/continue?next=%2Fadmin%2Fusers')
    redirect('/?auth=required')
  }
  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-20 max-w-[1500px] items-center gap-3 px-4 lg:px-7">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-pink-500 text-white">
            <GraduationCap size={22} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-pink-500">
              Shop Bé Băng
            </p>
            <h1 className="font-black">Admin</h1>
          </div>
        </div>
      </header>
      <div className="mx-auto lg:grid lg:max-w-[1500px] lg:grid-cols-[16rem_1fr]">
        <aside className="border-b border-slate-200 bg-white p-4 lg:min-h-[calc(100vh-5rem)] lg:border-b-0 lg:border-r">
          <nav className="flex gap-2 lg:flex-col">
            <Link
              href="/game/me"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              <LayoutDashboard size={18} />
              Tiến trình của tôi
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-3 rounded-xl bg-pink-50 px-4 py-3 text-sm font-bold text-pink-700"
            >
              <Users size={18} />
              Users
            </Link>
          </nav>
        </aside>
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

import type { Metadata } from 'next'
import { GraduationCap, ShieldCheck } from 'lucide-react'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/current-user'
import { cookies } from 'next/headers'
import { REFRESH_COOKIE } from '@/lib/auth/config'
import AdminNavigation from '@/components/admin/AdminNavigation'
import AdminMobileDrawer from '@/components/admin/AdminMobileDrawer'
import AuthMenu from '@/components/auth/AuthMenu'

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
    <div className="min-h-screen min-w-0 overflow-x-clip bg-[#f7f8fb] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-4 lg:h-20 lg:px-6 xl:px-8">
          <AdminMobileDrawer />
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pink-500 text-white lg:h-10 lg:w-10">
            <GraduationCap size={22} />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-xs font-black uppercase tracking-[.2em] text-pink-500">
              Shop Bé Băng
            </p>
            <h1 className="text-sm font-black sm:text-base">Admin</h1>
          </div>
          <div className="ml-auto">
            <AuthMenu
              trigger={<><ShieldCheck size={18} /><span className="hidden sm:inline">Admin</span></>}
              triggerClassName="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            />
          </div>
        </div>
      </header>
      <div className="grid min-h-[calc(100dvh-3.5rem)] min-w-0 lg:min-h-[calc(100dvh-5rem)] lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="sticky top-20 hidden h-[calc(100dvh-5rem)] self-start overflow-y-auto border-r border-slate-200 bg-white p-3 lg:block">
          <AdminNavigation />
        </aside>
        <main className="flex min-h-[calc(100dvh-3.5rem)] min-w-0 w-full flex-col px-3 pb-4 pt-4 sm:px-4 sm:pb-6 lg:min-h-[calc(100dvh-5rem)] lg:px-6 lg:pb-8 xl:px-8">{children}</main>
      </div>
    </div>
  )
}

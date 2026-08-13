'use client'

import { usePathname } from 'next/navigation'
import HeaderTop from '@/components/HeaderTop'
import ChatWidget from '@/components/ChatWidget'

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isGameRoute = pathname === '/game/demo-phaser3' || pathname.startsWith('/game/demo-phaser3/')

  if (isGameRoute) return <>{children}</>

  return (
    <>
      <div className="min-h-screen flex relative">
        <input id="nav-toggle" type="checkbox" className="peer sr-only" />
        <div className="flex-1 flex flex-col">
          <HeaderTop />
          <div>{children}</div>
          <footer className="border-t border-pink-100 bg-pink-50/40">
            <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 text-sm text-slate-600">
              <div className="flex flex-col md:flex-row md:justify-center md:items-start gap-10 md:gap-16">
                <div className="text-center md:text-left">
                  <p className="font-semibold text-slate-800">Shop Bé Băng</p>
                  <p className="mt-1">Quần áo trẻ em mềm xinh, dễ mặc mỗi ngày</p>
                  <p className="mt-1">Giao hàng toàn quốc</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="font-semibold text-slate-800">Hotline:</p>
                  <p className="mt-1">0923 456 789</p>
                  <p className="mt-1">Email: hello@shopbebang.vn</p>
                </div>
              </div>
            </div>
          </footer>
        </div>
        <label
          htmlFor="nav-toggle"
          className="fixed inset-0 bg-black/30 z-40 hidden peer-checked:block sm:hidden"
          aria-hidden="true"
        />
      </div>
      <ChatWidget />
    </>
  )
}

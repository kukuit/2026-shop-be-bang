'use client'

import { usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import HeaderTop from '@/components/HeaderTop'
import ChatWidget from '@/components/ChatWidget'

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/demo/aqua' || pathname.startsWith('/demo/aqua/') || pathname === '/demo/ai-task' || pathname.startsWith('/demo/ai-task/')) return <>{children}</>
  // Giữ chat ở landing/chọn lớp và khu phụ huynh; ẩn trên world, map, mission và gameplay.
  const isGameRoute = pathname === '/game' || pathname.startsWith('/game/')
  const isGameplayRoute = isGameRoute && (
    /\/(bubble-shooter|drag-drop|gold-mining|racing|egg-hunt)(\/|$)/.test(pathname) ||
    /^\/game\/lop-1\/toan\/luyen-tap\/cong-den-10\/?$/.test(pathname)
  )
  const hasGameChat = isGameRoute && !isGameplayRoute && !pathname.startsWith('/game/lop-')
  const isAdminRoute = pathname.startsWith('/admin/')

  if (pathname === '/game/demo-3d' || pathname.startsWith('/game/demo-3d/')) return <>{children}</>

  if (hasGameChat)
    return (
      <>
        {children}
        <ChatWidget />
      </>
    )

  if (isGameRoute || isAdminRoute) return <>{children}</>

  return (
    <>
      <div className="min-h-screen flex relative">
        <input id="nav-toggle" type="checkbox" className="peer sr-only" />
        <div className="flex-1 flex flex-col">
          <HeaderTop />
          <div>{children}</div>
          <footer className="border-t border-pink-100 bg-pink-50/40">
            <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-6 text-sm text-slate-600 sm:px-6 md:flex-row md:justify-between lg:px-8">
              <Link href="/" aria-label="Shop Bé Băng — trang chủ" className="shrink-0">
                <Image src="/images/optimize/logo.png" alt="Shop Bé Băng" width={48} height={48} />
              </Link>
              <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" aria-label="Điều hướng cuối trang">
                <Link href="/" className="hover:text-rose-600">Trang chủ</Link>
                <Link href="/#new-arrivals" className="hover:text-rose-600">Mới về</Link>
                <Link href="/#sale" className="hover:text-rose-600">Sale</Link>
                <Link href="/#kids-learning" className="hover:text-rose-600">Bé học & chơi</Link>
                <Link href="/#contact" className="hover:text-rose-600">Liên hệ</Link>
              </nav>
              <div id="contact" className="scroll-mt-20 text-center md:text-right">
                <p className="mb-1 font-semibold text-slate-800">Liên hệ</p>
                <a className="font-semibold text-slate-800 hover:text-rose-600" href="tel:0981353619">0981 353 619</a>
                <p className="mt-1"><a className="hover:text-rose-600" href="mailto:info@shopbebang.com">info@shopbebang.com</a></p>
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

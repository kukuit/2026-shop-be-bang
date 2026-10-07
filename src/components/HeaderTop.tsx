'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import AuthMenu from '@/components/auth/AuthMenu'

type Item = { label: string; href: string }

const NAV_ITEMS: Item[] = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Mới về', href: '/#new-arrivals' },
  { label: 'Sale', href: '/#sale' },
  { label: 'Bé học & chơi', href: '/#kids-learning' },
]

const CONTAINER = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8'

function NavItem({
  href,
  label,
  isActive,
  onClick,
  isMobile = false,
}: {
  href: string
  label: string
  isActive: boolean
  onClick?: () => void
  isMobile?: boolean
}) {
  const base = 'font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-500'
  const desktop = 'hidden items-center border-b-2 border-transparent px-2 py-2 text-sm text-zinc-600 hover:border-rose-200 hover:text-rose-600 sm:flex'
  const mobile = 'flex rounded-lg px-3 py-3 text-sm text-zinc-700 hover:bg-rose-50'

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={[
        base,
        isMobile ? mobile : desktop,
        isActive ? 'border-rose-500 text-rose-600' : '',
      ].join(' ')}
    >
      {label}
    </Link>
  )
}

export default function HeaderTop() {
  const pathname = usePathname() || '/'
  const [open, setOpen] = useState(false)

  const isActive = (href: string) => href === '/' && pathname === '/'

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
      <div className={`${CONTAINER} flex h-16 items-center gap-3`}>
        <Link
          href="/"
          aria-label="Shop Bé Băng — trang chủ"
          className="inline-flex shrink-0 items-center gap-2 rounded-md"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/images/optimize/logo.png"
            alt="Shop Bé Băng"
            width={44}
            height={44}
            className="rounded-full"
            priority
          />
          <span className="whitespace-nowrap text-base font-bold tracking-tight text-rose-500 sm:text-lg">
            Shop Bé Băng
          </span>
        </Link>

        <nav className="ml-4 hidden flex-1 items-center justify-center gap-5 sm:flex lg:gap-8" aria-label="Điều hướng chính">
          {NAV_ITEMS.map((it) => (
            <NavItem key={it.href} href={it.href} label={it.label} isActive={isActive(it.href)} />
          ))}
        </nav>

        <div className="ml-auto sm:hidden">
          <AuthMenu />
        </div>

        <button
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-grid h-10 w-10 place-items-center rounded-full text-zinc-700 hover:bg-rose-50 sm:hidden"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-700">
            <path fill="currentColor" d="M3 6h18v2H3V6m0 5h18v2H3v-2m0 5h18v2H3v-2z" />
          </svg>
        </button>

        <div className="ml-auto hidden sm:block">
          <AuthMenu />
        </div>
      </div>

      {open && (
        <div className="border-t bg-white/95 backdrop-blur sm:hidden">
          <div className={`${CONTAINER}`}>
            <nav className="flex flex-col py-2" aria-label="Điều hướng chính">
              {NAV_ITEMS.map((it) => (
                <NavItem
                  key={it.href}
                  href={it.href}
                  label={it.label}
                  isActive={isActive(it.href)}
                  isMobile
                  onClick={() => setOpen(false)}
                />
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}

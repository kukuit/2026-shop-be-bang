'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Info, FolderKanban, ShoppingCart, BookOpen } from 'lucide-react'

type Item = { label: string; href: string; icon: React.ReactNode }

const NAV_ITEMS: Item[] = [
  { label: 'Shop Bé Băng', href: '/about', icon: <Info className="w-4 h-4" /> },
  { label: 'Sản Phẩm', href: '/products', icon: <FolderKanban className="w-4 h-4" /> },
  { label: 'Blog', href: '/blogs', icon: <BookOpen className="w-4 h-4" /> },
  {
    label: 'Liên Hệ',
    href: '/contact',
    icon: <ShoppingCart className="w-4 h-4" />,
  },
]

const CONTAINER = 'max-w-6xl mx-auto px-4'

function NavItem({
  href,
  label,
  icon,
  isActive,
  onClick,
  isMobile = false,
}: {
  href: string
  label: string
  icon: React.ReactNode
  isActive: boolean
  onClick?: () => void
  isMobile?: boolean
}) {
  const base =
    'flex items-center gap-2 px-2 py-2 text-[15px] sm:text-base font-medium transition-colors focus:outline-none focus-visible:ring-0 border-b-2 border-transparent'

  const desktop = 'hidden sm:flex text-gray-600 hover:text-gray-900 hover:border-pink-300'
  const desktopActive = 'border-[var(--shop-primary)] text-[var(--shop-primary)]'

  const mobile = 'sm:hidden text-gray-700 hover:bg-gray-50 active:bg-gray-100'
  const mobileActive = 'border-[var(--shop-primary)] bg-pink-50 text-[var(--shop-primary)]'

  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        base,
        isMobile ? mobile : desktop,
        isActive ? (isMobile ? mobileActive : desktopActive) : '',
      ].join(' ')}
    >
      <span className={isActive ? 'text-[var(--shop-primary)]' : 'text-gray-500'}>
        {icon}
      </span>
      <span className={isActive ? 'text-[var(--shop-primary)]' : ''}>{label}</span>
    </Link>
  )
}

export default function HeaderTop() {
  const pathname = usePathname() || '/'
  const [open, setOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
      <div className={`${CONTAINER} h-14 flex items-center gap-2`}>
        <Link
          href="/"
          aria-label="Go to home"
          className="inline-flex items-center rounded-md hover:bg-gray-50"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/images/logo.png"
            alt="Shop Bé Băng"
            width={56}
            height={56}
            className="rounded-full"
            priority
          />
        </Link>

        <button
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="sm:hidden ml-auto inline-grid place-items-center w-10 h-10 hover:bg-gray-100"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-700">
            <path fill="currentColor" d="M3 6h18v2H3V6m0 5h18v2H3v-2m0 5h18v2H3v-2z" />
          </svg>
        </button>

        <nav className="ml-2 hidden sm:flex items-stretch justify-start">
          <div className="flex items-end gap-3">
            {NAV_ITEMS.map((it) => (
              <NavItem
                key={it.href}
                href={it.href}
                label={it.label}
                icon={it.icon}
                isActive={isActive(it.href)}
              />
            ))}
          </div>
        </nav>
      </div>

      {open && (
        <div className="sm:hidden border-t bg-white/95 backdrop-blur">
          <div className={`${CONTAINER}`}>
            <nav className="flex flex-col py-1">
              {NAV_ITEMS.map((it) => (
                <NavItem
                  key={it.href}
                  href={it.href}
                  label={it.label}
                  icon={it.icon}
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

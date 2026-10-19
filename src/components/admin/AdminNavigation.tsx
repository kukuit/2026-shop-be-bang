'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Box, ClipboardList, Link2, Tags, Users } from 'lucide-react'

const links = [
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/products', label: 'Sản phẩm', icon: Box },
  { href: '/admin/orders', label: 'Đơn hàng', icon: ClipboardList },
  { href: '/admin/product-categories', label: 'Danh mục sản phẩm', icon: Tags },
  { href: '/admin/short-links', label: 'Short Links', icon: Link2 },
]

export default function AdminNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return <nav aria-label="Điều hướng admin" className="flex flex-col gap-2">{links.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`)
    return <Link key={href} href={href} aria-current={active ? 'page' : undefined}
      onClick={onNavigate} className={`flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${active ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}>
      <Icon size={18} />{label}
    </Link>
  })}</nav>
}

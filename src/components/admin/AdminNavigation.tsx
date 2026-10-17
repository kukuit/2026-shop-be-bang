'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Box, Tags, Users } from 'lucide-react'

const links = [
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/products', label: 'Sản phẩm', icon: Box },
  { href: '/admin/product-categories', label: 'Danh mục sản phẩm', icon: Tags },
]

export default function AdminNavigation() {
  const pathname = usePathname()
  return <nav className="flex flex-wrap gap-2 lg:flex-col">{links.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`)
    return <Link key={href} href={href} aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold ${active ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}>
      <Icon size={18} />{label}
    </Link>
  })}</nav>
}

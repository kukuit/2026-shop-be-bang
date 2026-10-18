'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Box, ClipboardList, Link2, Menu, Tags, Users, X } from 'lucide-react'

const links = [
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/products', label: 'Sản phẩm', icon: Box },
  { href: '/admin/orders', label: 'Đơn hàng', icon: ClipboardList },
  { href: '/admin/product-categories', label: 'Danh mục sản phẩm', icon: Tags },
  { href: '/admin/short-links', label: 'Short Links', icon: Link2 },
]

export default function AdminNavigation() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  return <div className="relative">
    <button type="button" aria-label={mobileOpen ? 'Đóng menu admin' : 'Mở menu admin'} aria-expanded={mobileOpen} aria-controls="admin-navigation-links" onClick={() => setMobileOpen(open => !open)} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 lg:hidden">
      {mobileOpen ? <X size={19} /> : <Menu size={19} />}<span>Menu admin</span>
    </button>
    <nav id="admin-navigation-links" aria-label="Điều hướng admin" className={`${mobileOpen ? 'absolute left-0 right-0 top-full z-50 mt-2 flex flex-col rounded-2xl border border-slate-200 bg-white p-2 shadow-lg' : 'hidden'} gap-2 lg:static lg:mt-0 lg:flex lg:flex-col lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}>{links.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`)
    return <Link key={href} href={href} aria-current={active ? 'page' : undefined}
      onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold ${active ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}>
      <Icon size={18} />{label}
    </Link>
  })}</nav>
  </div>
}

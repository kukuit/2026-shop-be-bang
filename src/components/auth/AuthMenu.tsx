'use client'
import Link from 'next/link'
import { useState } from 'react'
import { LogOut, UserRound } from 'lucide-react'
import { useAuth } from './AuthProvider'
import LoginModal from './LoginModal'

export default function AuthMenu({ game = false }: { game?: boolean }) {
  const { user, loading, logout } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  if (loading)
    return (
      <span
        className="h-9 w-24 animate-pulse rounded-xl bg-slate-100"
        aria-label="Đang tải tài khoản"
      />
    )
  if (!user)
    return (
      <>
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${game ? 'bg-blue-600' : 'bg-pink-500'}`}
        >
          Đăng nhập
        </button>
        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      </>
    )
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
      >
        <UserRound size={18} />
        {user.displayName}
      </button>
      {menuOpen && (
        <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {game && user.activeGame && (
            <Link href="/game/me" className="block px-4 py-2 text-sm hover:bg-slate-50">
              Tiến trình học
            </Link>
          )}
          {user.role === 'admin' && (
            <Link href="/admin/users" className="block px-4 py-2 text-sm hover:bg-slate-50">
              Quản trị user
            </Link>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut size={15} />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  )
}

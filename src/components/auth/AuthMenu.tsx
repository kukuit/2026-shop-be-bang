'use client'
import Link from 'next/link'
import { useState } from 'react'
import { LogIn, LogOut, UserRound } from 'lucide-react'
import { useAuth } from './AuthProvider'
import LoginModal from './LoginModal'

export default function AuthMenu({ game = false }: { game?: boolean }) {
  const { user, loading, logout } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  if (loading)
    return (
      <span
        className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-500"
        aria-label="Đang tải tài khoản"
      >
        <span className="grid h-7 w-7 shrink-0 animate-pulse place-items-center rounded-full bg-slate-200 text-slate-400">
          <UserRound size={16} aria-hidden="true" />
        </span>
        <span className="hidden whitespace-nowrap sm:inline">Đang tải user...</span>
      </span>
    )
  if (!user)
    return (
      <>
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          aria-label="Đăng nhập"
          className={`grid h-10 place-items-center rounded-xl text-sm font-bold text-white ${
            game ? 'w-10 bg-blue-600 px-0 sm:flex sm:w-auto sm:px-4' : 'px-4'
          } ${game ? '' : 'bg-pink-500'}`}
        >
          {game && <LogIn size={20} aria-hidden="true" className="sm:hidden" />}
          <span className={game ? 'hidden sm:inline' : ''}>Đăng nhập</span>
        </button>
        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      </>
    )
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white p-0 text-sm font-bold sm:h-auto sm:w-auto sm:justify-start sm:px-3 sm:py-2"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-black uppercase text-blue-700">
          {user.displayName.trim().charAt(0) || <UserRound size={16} />}
        </span>
        <span className="hidden max-w-32 truncate sm:inline">{user.displayName}</span>
      </button>
      {menuOpen && (
        <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 sm:hidden">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-black uppercase text-blue-700">
              {user.displayName.trim().charAt(0) || <UserRound size={16} />}
            </span>
            <span className="min-w-0 truncate text-sm font-bold text-slate-800">{user.displayName}</span>
          </div>
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

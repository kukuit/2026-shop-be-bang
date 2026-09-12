'use client'
import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LogIn, LogOut, Menu, UserRound } from 'lucide-react'
import { useAuth } from './AuthProvider'
import LoginModal from './LoginModal'

export default function AuthMenu({ game = false, children }: { game?: boolean; children?: ReactNode }) {
  const { user, loading, logout } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const nameCharacters = Array.from(user?.displayName.normalize('NFC') ?? '')
  const headerName = game && nameCharacters.length > 10
    ? `${nameCharacters.slice(0, 10).join('')}...`
    : user?.displayName
  useEffect(() => {
    if (!menuOpen) return
    const dismiss = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [menuOpen])
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
  if (!user && !game)
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
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Menu tài khoản và chọn lớp"
        aria-expanded={menuOpen}
        className={`flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white p-0 text-sm font-bold ${user ? 'sm:h-auto sm:w-auto sm:justify-start sm:px-3 sm:py-2' : ''}`}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-black uppercase text-blue-700">
          {user?.displayName.trim().charAt(0) || <Menu size={18} />}
        </span>
        {user && <span className="hidden max-w-32 truncate sm:inline" title={user.displayName}>{headerName}</span>}
      </button>
      {menuOpen && (
        <div className="absolute right-0 z-50 mt-2 max-h-[calc(100dvh-5rem)] w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 text-slate-800 shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 sm:hidden">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-black uppercase text-blue-700">
              {user?.displayName.trim().charAt(0) || <UserRound size={16} />}
            </span>
            <span className="min-w-0 truncate text-sm font-bold text-slate-800">{user?.displayName || 'Bé chơi game'}</span>
          </div>
          {children}
          {game && user?.activeGame && (
            <Link href="/game/me" className="block px-4 py-2 text-sm hover:bg-slate-50">
              Tiến trình học
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link href="/admin/users" className="block px-4 py-2 text-sm hover:bg-slate-50">
              Quản trị user
            </Link>
          )}
          <button
            type="button"
            onClick={() => { setMenuOpen(false); if (user) void logout(); else setLoginOpen(true) }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            {user ? <LogOut size={15} /> : <LogIn size={15} />}
            {user ? 'Đăng xuất' : 'Đăng nhập'}
          </button>
        </div>
      )}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}

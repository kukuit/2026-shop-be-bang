'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import AdminNavigation from './AdminNavigation'

export default function AdminMobileDrawer() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)

  const closeDrawer = useCallback(() => {
    setOpen(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }, [])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDrawer()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]') ?? [])
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeDrawer, open])

  return <>
    <button
      ref={triggerRef}
      type="button"
      aria-label={open ? 'Đóng menu admin' : 'Mở menu admin'}
      aria-expanded={open}
      aria-controls="admin-mobile-drawer"
      onClick={() => setOpen(true)}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 lg:hidden"
    >
      <Menu size={21} />
    </button>
    {open && <div className="fixed inset-0 z-[70] lg:hidden">
      <button type="button" aria-label="Đóng menu admin" onClick={closeDrawer} className="absolute inset-0 h-full w-full bg-slate-950/45" />
      <aside ref={drawerRef} id="admin-mobile-drawer" role="dialog" aria-modal="true" aria-label="Menu admin" className="absolute inset-y-0 left-0 flex w-[min(86vw,20rem)] flex-col bg-white p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
          <p className="font-black text-slate-900">Menu admin</p>
          <button ref={closeRef} type="button" aria-label="Đóng menu admin" onClick={closeDrawer} className="grid h-10 w-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500">
            <X size={20} />
          </button>
        </div>
        <AdminNavigation onNavigate={closeDrawer} />
      </aside>
    </div>}
  </>
}

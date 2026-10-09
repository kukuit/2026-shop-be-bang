'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BookOpen, Bot, CalendarDays, ChevronLeft, LayoutDashboard, Menu, Settings, Users } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import AuthMenu from '@/components/auth/AuthMenu'
import { teachingGet } from './teaching-client'
import WorkspaceProvider, { useTeachingWorkspace } from './WorkspaceProvider'
import WorkspaceManager from './WorkspaceManager'
import WorkspaceSwitcher from './WorkspaceSwitcher'

const nav = [
  ['/demo/ai-task', 'Tổng quan', LayoutDashboard, false],
  ['/demo/ai-task/calendar', 'Lịch học', CalendarDays, false],
  ['/demo/ai-task/chatbot', 'Trợ lý AI', Bot, false],
  ['/demo/ai-task/students', 'Học viên', Users, false],
  ['/demo/ai-task/settings', 'Cài đặt', Settings, false],
] as const
const mobileNav = nav.slice(0, 4)

export default function Shell({ children }: { children: React.ReactNode }) {
  return <WorkspaceProvider><ShellContent>{children}</ShellContent></WorkspaceProvider>
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const workspace = useTeachingWorkspace()
  const [collapsed, setCollapsed] = useState(false)
  const [reviewCount, setReviewCount] = useState(0)
  const reviewCountFetchedAt = useRef(0)
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null)
  const isAssistant = pathname === '/demo/ai-task/chatbot'
  const isAssistantChat = isAssistant && workspace.active?.mode === 'CLOUD' && !!user
  const isWorkspacePage = pathname === '/demo/ai-task/workspaces'
  const isTeaching = !!workspace.active && (workspace.active.mode === 'LOCAL' || !!user) && !isWorkspacePage
  const shellLoading = !workspace.ready || workspace.switching || (workspace.active?.mode === 'CLOUD' && loading)

  const refreshReviewCount = useCallback(async (force = false) => {
    if (!user || workspace.active?.mode !== 'CLOUD' || isAssistant) return
    const now = Date.now()
    if (!force && now - reviewCountFetchedAt.current < 30_000) return
    reviewCountFetchedAt.current = now
    try {
      const result = await teachingGet<{ count: number }>({ resource: 'reviewCount' })
      setReviewCount(result.count)
    } catch { /* The current page owns its own error state. */ }
  }, [user, workspace.active?.mode, isAssistant])

  useEffect(() => { reviewCountFetchedAt.current = 0; setReviewCount(0) }, [user?.id, workspace.active?.id])
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const enabled = workspace.active?.mode === 'LOCAL'
    const notifyWorker = (registration?: ServiceWorkerRegistration) => {
      const worker = navigator.serviceWorker.controller || registration?.active || registration?.waiting
      worker?.postMessage({ type: 'SET_LOCAL_MODE', enabled })
    }
    const onControllerChange = () => { void navigator.serviceWorker.getRegistration('/demo/ai-task/').then(notifyWorker).catch(() => undefined) }
    const reloadForFirstControl = () => {
      if (!enabled) return
      try {
        if (window.sessionStorage.getItem('ai-task.sw-shell-version') === 'v2') return
        window.sessionStorage.setItem('ai-task.sw-shell-version', 'v2')
        window.location.reload()
      } catch { /* IndexedDB remains usable when session storage is restricted. */ }
    }
    if (enabled) navigator.serviceWorker.addEventListener('controllerchange', reloadForFirstControl)
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    if (enabled) void navigator.serviceWorker.register('/demo/ai-task/sw.js', { scope: '/demo/ai-task/' }).then(registration => notifyWorker(registration)).catch(() => undefined)
    else void navigator.serviceWorker.getRegistration('/demo/ai-task/').then(registration => notifyWorker(registration)).catch(() => undefined)
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      navigator.serviceWorker.removeEventListener('controllerchange', reloadForFirstControl)
    }
  }, [workspace.active?.mode])
  useEffect(() => { if (pathname !== '/demo/ai-task') void refreshReviewCount() }, [refreshReviewCount, pathname])
  useEffect(() => {
    const onDataChanged = () => { void refreshReviewCount(true) }
    const onReviewCount = (event: Event) => { reviewCountFetchedAt.current = Date.now(); setReviewCount((event as CustomEvent<number>).detail) }
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; kind: 'success' | 'error' }>).detail
      setToast(detail)
      window.setTimeout(() => setToast(current => current === detail ? null : current), 3200)
    }
    window.addEventListener('teaching:data-changed', onDataChanged)
    window.addEventListener('teaching:review-count', onReviewCount)
    window.addEventListener('teaching:toast', onToast)
    return () => {
      window.removeEventListener('teaching:data-changed', onDataChanged)
      window.removeEventListener('teaching:review-count', onReviewCount)
      window.removeEventListener('teaching:toast', onToast)
    }
  }, [refreshReviewCount])

  return <div className={'demo-shell ai-task-shell' + (collapsed ? ' is-collapsed' : '') + (isAssistantChat ? ' ai-task-shell-chat' : '')}>
    <header className="ai-task-header">
      <Link className="ai-task-brand" href="/demo/ai-task" aria-label="Quản lý dạy thêm, về tổng quan"><span className="ai-task-brand-mark"><CalendarDays size={19} /></span><span>Quản lý dạy thêm<small>Học viên · Lịch dạy · Học phí</small></span></Link>
    {isTeaching && <button className="ai-task-collapse" type="button" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'} title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}>{collapsed ? <Menu size={19} /> : <ChevronLeft size={19} />}</button>}
      <div className="ai-task-header-actions">
        {workspace.active && <WorkspaceSwitcher/>}
        {workspace.active?.mode === 'CLOUD' && user && isAssistant && <Link className="ai-task-assistant-link" href="/demo/ai-task"><CalendarDays size={16} /> Quản lý dạy thêm</Link>}
        {workspace.active?.mode === 'CLOUD' && <AuthMenu
          containerClassName="ai-task-account"
          triggerClassName="ai-task-account-trigger"
          trigger={<span className="ai-task-account-avatar">{user?.displayName.trim().charAt(0) || <Users size={16} />}</span>}
        >
          <Link href="/demo/ai-task/settings" className="ai-task-account-settings"><Settings size={15} /> Cài đặt dạy thêm</Link>
        </AuthMenu>}
      </div>
    </header>

    {isTeaching && <aside className="ai-task-sidebar" aria-label="Điều hướng chính">
      <p className="ai-task-sidebar-label">MENU</p>
      <nav className="ai-task-nav" aria-label="Quản lý dạy thêm">
        {nav.map(([href, label, Icon, hasBadge]) => <Link href={href} key={href} aria-current={pathname === href ? 'page' : undefined} title={collapsed ? label : undefined}>
          <span className="ai-task-nav-icon"><Icon size={19} /></span><span className="ai-task-nav-text">{label}</span>
          {hasBadge && reviewCount > 0 && <span className="ai-task-review-badge" aria-label={`${reviewCount} buổi cần đánh giá`}>{reviewCount > 99 ? '99+' : reviewCount}</span>}
        </Link>)}
      </nav>
      <div className="ai-task-sidebar-note"><span className="ai-task-sidebar-note-icon"><BookOpen size={17} /></span><p>{workspace.active?.mode === 'LOCAL' ? 'Dữ liệu lưu trên thiết bị này. Hãy xuất bản sao lưu định kỳ.' : 'Buổi học, lịch cố định và học phí được lưu riêng theo tài khoản Cloud.'}</p></div>
    </aside>}

    <main className={'ai-task-main' + (isAssistantChat ? ' ai-task-main-chat' : '')}>
      {shellLoading ? <div className="teaching-loading-shell" role="status"><span className="teaching-skeleton-line" /><span className="teaching-skeleton-block" /><span className="teaching-skeleton-block" /></div>
        : !workspace.active || isWorkspacePage ? <WorkspaceManager/>
          : isAssistant && workspace.active.mode === 'LOCAL' ? <section className="teaching-empty-card"><Bot size={24}/><strong>Trợ lý AI cần chế độ Cloud</strong><p>Chuyển workspace sang Cloud để dùng trợ lý AI. Dữ liệu offline hiện tại sẽ không bị thay đổi.</p><button className="demo-primary" type="button" onClick={workspace.activateCloud}>Chuyển sang Cloud</button></section>
            : workspace.active.mode === 'CLOUD' && !user ? <WorkspaceManager/>
              : <div key={workspace.active.id}>{children}</div>}
    </main>

    {isTeaching && <nav className="ai-task-mobile-nav" aria-label="Điều hướng nhanh">
      {mobileNav.map(([href, label, Icon, hasBadge]) => <Link href={href} key={href} aria-current={pathname === href ? 'page' : undefined}>
        <span className="ai-task-mobile-icon"><Icon size={19} />{hasBadge && reviewCount > 0 && <i aria-hidden="true" />}</span><span>{label}</span>
      </Link>)}
    </nav>}

    {toast && <div role={toast.kind === 'error' ? 'alert' : 'status'} aria-live="polite" className={`teaching-toast teaching-toast-${toast.kind}`}>{toast.message}</div>}
  </div>
}

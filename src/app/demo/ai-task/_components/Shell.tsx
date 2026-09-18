'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, LayoutDashboard, ListTodo, MessageSquare } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import AuthMenu from '@/components/auth/AuthMenu'
import Provider from './Provider'

const nav = [['/demo/ai-task', 'Trợ lý', MessageSquare], ['/demo/ai-task/tasks', 'Công việc', ListTodo], ['/demo/ai-task/dashboard', 'Tổng quan & nhóm', LayoutDashboard]] as const
export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, loading } = useAuth()
  return <div className={`demo-shell ai-task-shell${user && pathname === '/demo/ai-task' ? ' ai-task-shell-chat' : ''}`}>
    <header className="ai-task-header"><Link className="ai-task-brand" href="/demo/ai-task"><Bot size={27} /><span>AI Task<small>Không gian công việc cá nhân</small></span></Link><AuthMenu /></header>
    <nav className="ai-task-nav" aria-label="AI Task">{nav.map(([href, label, Icon]) => <Link href={href} key={href} aria-current={pathname === href ? 'page' : undefined}><Icon size={18} />{label}</Link>)}</nav>
    <main className="ai-task-main">{loading ? <p role="status">Đang kiểm tra đăng nhập…</p> : !user ? <section className="demo-panel demo-padded ai-task-login"><Bot size={44} /><h1>Công việc của bạn, trong một cuộc trò chuyện</h1><p>Đăng nhập bằng tài khoản Shop Bé Băng để bắt đầu. Công việc và lịch sử được lưu riêng cho tài khoản của bạn.</p><AuthMenu /></section> : <Provider key={user.id}>{children}</Provider>}</main>
  </div>
}

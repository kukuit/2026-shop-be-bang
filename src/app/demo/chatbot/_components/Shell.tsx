'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Waves, LayoutDashboard, MessageSquare, CheckSquare, Wallet, Users, Landmark, Fish, Sprout, PackageCheck, FileSpreadsheet, Tags, History, Menu, X } from 'lucide-react'
import Provider from './Provider'
import DemoChatWidget from './DemoChatWidget'
const links = [['', 'Tổng quan', LayoutDashboard], ['chat', 'Trợ lý AI', MessageSquare], ['tasks', 'Công việc', CheckSquare], ['transactions', 'Thu / Chi', Wallet], ['partners', 'Đối tác', Users], ['debts', 'Công nợ', Landmark], ['ponds', 'Ao nuôi', Waves], ['crops', 'Vụ nuôi', Sprout], ['crop-expenses', 'Chi phí vụ nuôi', Fish], ['harvests', 'Thu hoạch', PackageCheck], ['categories', 'Danh mục', Tags], ['import-export', 'Nhập / Xuất Excel', FileSpreadsheet], ['audit', 'Nhật ký', History]] as const
export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const [open, setOpen] = useState(false)
  return <div className="demo-shell"><header className="demo-header"><button className="demo-mobile" aria-label="Mở menu" onClick={() => setOpen(!open)}><Menu /></button><Link href="/demo/chatbot" className="demo-brand"><span><Waves size={25} /></span>Aqua<span className="demo-brand-light">Manager</span></Link><div className="demo-header-right"><span className="demo-badge">BẢN DEMO</span><span className="demo-avatar">AQ</span></div></header>{open && <button className="demo-overlay" aria-label="Đóng menu" onClick={() => setOpen(false)} />}<aside className={`demo-sidebar ${open ? 'is-open' : ''}`}><div className="demo-sidebar-title">QUẢN LÝ TRẠI NUÔI <button className="demo-mobile" aria-label="Đóng menu" onClick={() => setOpen(false)}><X size={18} /></button></div><nav>{links.map(([slug, label, Icon]) => <Link onClick={() => setOpen(false)} key={slug} href={`/demo/chatbot${slug ? `/${slug}` : ''}`} className={(slug ? path.startsWith(`/demo/chatbot/${slug}`) : path === '/demo/chatbot' || path === '/demo/chatbot/dashboard') ? 'active' : ''}><Icon size={18} />{label}</Link>)}</nav><div className="demo-sidebar-note"><Fish size={22} /><strong>Một nơi cho mọi hoạt động</strong><p>Theo dõi công việc, tài chính và hiệu quả từng vụ nuôi.</p></div></aside><main className="demo-main"><Provider>{children}<DemoChatWidget /></Provider></main></div>
}

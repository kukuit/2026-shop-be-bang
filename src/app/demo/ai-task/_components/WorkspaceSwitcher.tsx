'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Cloud, HardDrive } from 'lucide-react'
import AuthMenu from '@/components/auth/AuthMenu'
import { useAuth } from '@/components/auth/AuthProvider'
import { useTeachingWorkspace } from './WorkspaceProvider'

export default function WorkspaceSwitcher() {
  const router = useRouter()
  const { user } = useAuth()
  const { active, workspaces, activateLocal, activateCloud } = useTeachingWorkspace()
  const [open, setOpen] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update); window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  const chooseLocal = async (id: string) => {
    setBusyId(id)
    try { await activateLocal(id); setOpen(false); router.push('/demo/ai-task') }
    finally { setBusyId('') }
  }

  return <div className="teaching-workspace-switcher">
    <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(value => !value)}><span>{active?.mode === 'LOCAL' ? <HardDrive size={16}/> : <Cloud size={16}/>}<span className="teaching-workspace-current"><b>{active?.name || 'Chọn dữ liệu'}</b><small>{active?.mode === 'LOCAL' ? 'Offline trên thiết bị' : online ? 'Cloud · có mạng' : 'Cloud · mất kết nối'}</small></span></span><ChevronDown size={15}/></button>
    {open && <div className="teaching-workspace-popover" role="menu">
      <strong>DỮ LIỆU CỦA BẠN</strong>
      {workspaces.map(workspace => <button type="button" role="menuitem" key={workspace.id} disabled={!!busyId} onClick={() => void chooseLocal(workspace.id)}>
        <HardDrive size={16}/><span><b>{workspace.name}</b><small>Offline trên thiết bị</small></span>{active?.mode === 'LOCAL' && active.id === workspace.id && <Check size={16}/>}
      </button>)}
      <button type="button" role="menuitem" onClick={() => { activateCloud(); setOpen(false) }}><Cloud size={16}/><span><b>Cloud</b><small>{user ? user.displayName : 'Đăng nhập để dùng Firebase'}</small></span>{active?.mode === 'CLOUD' && <Check size={16}/>}</button>
      {!user && <div className="teaching-workspace-popover-login"><AuthMenu/></div>}
      <Link href="/demo/ai-task/workspaces" role="menuitem" onClick={() => setOpen(false)}>Quản lý dữ liệu</Link>
    </div>}
  </div>
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Cloud, HardDrive, Pencil, Plus, Trash2 } from 'lucide-react'
import AuthMenu from '@/components/auth/AuthMenu'
import { useAuth } from '@/components/auth/AuthProvider'
import { countLocalWorkspaceData, type WorkspaceCounts } from '../_services/offline/workspaces'
import { useTeachingWorkspace } from './WorkspaceProvider'

export default function WorkspaceManager() {
  const router = useRouter()
  const { user } = useAuth()
  const { ready, error, workspaces, active, createWorkspace, renameWorkspace, deleteWorkspace, activateLocal, activateCloud, refreshWorkspaces } = useTeachingWorkspace()
  const [name, setName] = useState('')
  const [counts, setCounts] = useState<Record<string, WorkspaceCounts>>({})
  const [editingId, setEditingId] = useState('')
  const [editingName, setEditingName] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')
  const [persistentStorage, setPersistentStorage] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    void Promise.all(workspaces.map(async workspace => [workspace.id, await countLocalWorkspaceData(workspace.id)] as const))
      .then(entries => { if (!cancelled) setCounts(Object.fromEntries(entries)) })
      .catch(() => { if (!cancelled) setCounts({}) })
    return () => { cancelled = true }
  }, [workspaces])
  useEffect(() => {
    if (!navigator.storage?.persisted) return
    void navigator.storage.persisted().then(setPersistentStorage).catch(() => setPersistentStorage(false))
  }, [])

  const requestPersistentStorage = async () => {
    if (!navigator.storage?.persist) { setPersistentStorage(false); return }
    const granted = await navigator.storage.persist()
    setPersistentStorage(granted)
  }

  const openCloud = () => {
    activateCloud()
    if (user) router.push('/demo/ai-task')
  }

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true); setLocalError('')
    try {
      const workspace = await createWorkspace(name)
      setName('')
      await activateLocal(workspace.id)
      router.push('/demo/ai-task')
    } catch (reason) { setLocalError(reason instanceof Error ? reason.message : 'Không tạo được dữ liệu offline.') }
    finally { setBusy(false) }
  }

  const open = async (id: string) => {
    setBusy(true); setLocalError('')
    try { await activateLocal(id); router.push('/demo/ai-task') }
    catch (reason) { setLocalError(reason instanceof Error ? reason.message : 'Không mở được dữ liệu offline.') }
    finally { setBusy(false) }
  }

  const saveRename = async (id: string) => {
    try { await renameWorkspace(id, editingName); setEditingId('') }
    catch (reason) { setLocalError(reason instanceof Error ? reason.message : 'Không đổi được tên workspace.') }
  }

  const remove = async (id: string, workspaceName: string) => {
    if (!window.confirm(`Xóa bản offline “${workspaceName}” và toàn bộ dữ liệu trên thiết bị này? Thao tác này không thể hoàn tác. Nếu cần, hãy xuất bản sao lưu trước.`)) return
    setBusy(true); setLocalError('')
    try { await deleteWorkspace(id); await refreshWorkspaces() }
    catch (reason) { setLocalError(reason instanceof Error ? reason.message : 'Không xóa được workspace.') }
    finally { setBusy(false) }
  }

  return <section className="demo-panel demo-padded teaching-workspace-page">
    <p className="teaching-eyebrow">QUẢN LÝ DẠY THÊM</p>
    <h1>Dữ liệu của bạn</h1>
    <p className="teaching-workspace-intro">Tạo dữ liệu lưu trên thiết bị để quản lý lớp mà không cần đăng nhập hay kết nối Firebase.</p>
    {(error || localError) && <p role="alert" className="demo-alert">{localError || error}</p>}
    {!ready ? <p role="status">Đang kiểm tra dữ liệu trên thiết bị…</p> : <>
      <div className="teaching-workspace-list">
        {workspaces.map(workspace => <article className="teaching-workspace-card" key={workspace.id}>
          <HardDrive size={21} aria-hidden="true" />
          <div className="teaching-workspace-card-content">
            {editingId === workspace.id
              ? <form className="teaching-workspace-rename" onSubmit={event => { event.preventDefault(); void saveRename(workspace.id) }}><input aria-label="Tên workspace" maxLength={100} value={editingName} onChange={event => setEditingName(event.target.value)}/><button type="submit">Lưu</button><button type="button" onClick={() => setEditingId('')}>Hủy</button></form>
              : <><strong>{workspace.name}</strong><span>Offline trên thiết bị · cập nhật {new Date(workspace.updatedAt).toLocaleDateString('vi-VN')}</span><small>{counts[workspace.id]?.students ?? '—'} học viên · {counts[workspace.id]?.lessons ?? '—'} buổi học</small></>}
          </div>
          <button type="button" className="teaching-workspace-open" disabled={busy} onClick={() => void open(workspace.id)}>{active?.mode === 'LOCAL' && active.id === workspace.id ? 'Đang mở' : 'Mở dữ liệu'}</button>
          <button type="button" aria-label={`Đổi tên ${workspace.name}`} title="Đổi tên" disabled={busy} onClick={() => { setEditingId(workspace.id); setEditingName(workspace.name) }}><Pencil size={15}/></button>
          <button type="button" aria-label={`Xóa ${workspace.name}`} title="Xóa bản offline" disabled={busy} onClick={() => void remove(workspace.id, workspace.name)}><Trash2 size={15}/></button>
        </article>)}
      </div>
      <form className="teaching-workspace-create" onSubmit={create}>
        <label htmlFor="teaching-workspace-name">Tạo dữ liệu offline mới</label>
        <div><input id="teaching-workspace-name" maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="Ví dụ: Lớp học A"/><button className="demo-primary" type="submit" disabled={busy || !name.trim()}><Plus size={16}/> Tạo dữ liệu</button></div>
      </form>
      <article className="teaching-workspace-cloud"><Cloud size={20}/><span><strong>Cloud — Firebase</strong><small>{user ? `Tài khoản ${user.displayName}` : 'Đăng nhập để mở dữ liệu Cloud hiện có.'}</small></span><button type="button" onClick={openCloud}>{user ? 'Mở Cloud' : 'Chọn Cloud'}</button>{!user && <AuthMenu/>}</article>
      <div className="teaching-workspace-storage"><p className="teaching-workspace-warning">Dữ liệu offline chỉ có trên trình duyệt và thiết bị này. Xóa dữ liệu trình duyệt hoặc dùng cửa sổ ẩn danh có thể làm mất dữ liệu; hãy sao lưu định kỳ.</p><button type="button" onClick={() => void requestPersistentStorage()}>{persistentStorage === true ? 'Đã yêu cầu giữ dữ liệu' : 'Ưu tiên giữ dữ liệu trên thiết bị'}</button></div>
    </>}
  </section>
}

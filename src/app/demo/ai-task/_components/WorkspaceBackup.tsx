'use client'

import { useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { exportLocalWorkspace, importLocalWorkspace, parseWorkspaceBackup } from '../_services/offline/backup'
import { useTeachingWorkspace } from './WorkspaceProvider'
import { useRouter } from 'next/navigation'

function safeFileName(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'du-lieu-day-them'
}

export default function WorkspaceBackup() {
  const router = useRouter()
  const { active, activateLocal, refreshWorkspaces } = useTeachingWorkspace()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const download = async () => {
    if (!active || active.mode !== 'LOCAL') return
    setBusy(true); setError(''); setMessage('')
    try {
      const backup = await exportLocalWorkspace(active.id)
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${safeFileName(active.name)}-backup-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      setMessage('Đã tạo tệp sao lưu JSON.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không xuất được dữ liệu.') }
    finally { setBusy(false) }
  }

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true); setError(''); setMessage('')
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('Tệp sao lưu quá lớn (giới hạn 25 MB).')
      const backup = parseWorkspaceBackup(await file.text())
      if (!window.confirm(`Nhập “${backup.workspace.name}” thành một workspace offline mới? Dữ liệu hiện tại sẽ được giữ nguyên.`)) return
      const workspace = await importLocalWorkspace(backup)
      await refreshWorkspaces()
      await activateLocal(workspace.id)
      setMessage('Đã nhập bản sao lưu vào workspace mới.')
      router.push('/demo/ai-task')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không nhập được bản sao lưu.') }
    finally { setBusy(false) }
  }

  return <section className="demo-panel demo-padded teaching-backup-panel">
    <p className="teaching-eyebrow">DỮ LIỆU</p><h2>Sao lưu workspace offline</h2>
    <p>Xuất học viên, lịch tuần, buổi học, mục tiêu và cài đặt thành JSON. Khi nhập, ứng dụng tạo workspace mới và giữ nguyên dữ liệu hiện tại.</p>
    <div className="teaching-backup-actions">{active?.mode === 'LOCAL' && <button type="button" disabled={busy} onClick={() => void download()}><Download size={16}/> Xuất dữ liệu</button>}<label className="teaching-backup-import"><Upload size={16}/> {busy ? 'Đang xử lý…' : 'Nhập dữ liệu'}<input type="file" accept="application/json,.json" disabled={busy} onChange={event => void importFile(event)}/></label></div>
    {error && <p role="alert" className="demo-alert">{error}</p>}{message && <p role="status" className="teaching-success">{message}</p>}
    <small>Bản sao lưu có thông tin học viên và học phí. Hãy lưu tệp ở nơi an toàn. Tệp tối đa 25 MB; chỉ nhận schema phiên bản 1.</small>
  </section>
}

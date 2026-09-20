'use client'
import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { api, useTasks } from './Provider'
import type { Group } from '../_lib/model'

type Summary = { today: number; urgent: number; inProgress: number; waiting: number; overdue: number; groups: Record<string, number> }
export default function Dashboard() {
  const { groups, revision, busy, run, refresh, notify } = useTasks()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [editor, setEditor] = useState<{ group?: Group; name: string; color: string; order: number } | null>(null)
  const [formError, setFormError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const editorOpen = Boolean(editor)
  useEffect(() => {
    const controller = new AbortController()
    api<Summary>(undefined, { resource: 'summary' }, controller.signal).then(data => { setSummary(data); setError('') }).catch(e => { if (!controller.signal.aborted) setError(e.message) })
    return () => controller.abort()
  }, [revision, reload])
  useEffect(() => { if (editorOpen) { dialog.current?.showModal(); setFormError('') } else dialog.current?.close() }, [editorOpen])
  const toggle = async (g: Group) => {
    if (!window.confirm(`${g.isActive ? 'Ẩn' : 'Hiện lại'} nhóm “${g.name}”? Công việc trong nhóm vẫn được giữ nguyên.`)) return
    try { await run(async () => { await api({ operation: 'saveGroup', id: g.id, data: { name: g.name, color: g.color, order: g.order, isActive: !g.isActive } }); await refresh() }) }
    catch (reason) { notify(reason instanceof Error ? reason.message : 'Không lưu được nhóm.') }
  }
  return <>
    <div className="demo-page-heading"><div><h1>Tổng quan</h1><p>Một góc nhìn nhanh về những việc còn mở.</p></div><button onClick={() => setReload(v => v + 1)}>Tải lại</button></div>
    {error && <p className="demo-alert" role="alert">{error}</p>}
    <div className="demo-kpis">{([['today', 'Hạn hôm nay'], ['urgent', 'Gấp'], ['inProgress', 'Đang làm'], ['overdue', 'Đã quá hạn hoàn thành']] as const).map(([key, label]) => <article className="demo-kpi" key={key}><span>{label}</span><strong>{summary ? summary[key] : '…'}</strong></article>)}</div>
    <section className="demo-panel"><div className="demo-section-heading"><div><h2>Nhóm công việc</h2><p>Tạo nhóm theo cách bạn tổ chức công việc. Inbox luôn sẵn sàng cho ghi chú nhanh.</p></div><button className="demo-primary" disabled={busy} onClick={() => setEditor({ name: '', color: '', order: Math.max(-1, ...groups.map(g => g.order)) + 1 })}><Plus size={16} /> Thêm nhóm</button></div>
      {groups.map(g => <div className="demo-stat-row ai-task-group" key={g.id}><div><strong><span className="ai-task-dot" style={{ background: g.color || '#94a3b8' }} />{g.name}</strong><p>{summary?.groups[g.id] ?? '…'} việc đang mở{g.isDefault ? ' · Mặc định' : ''}{g.isActive ? '' : ' · Đã ẩn'}</p></div><div className="demo-inline"><button disabled={busy} onClick={() => setEditor({ group: g, name: g.name, color: g.color || '', order: g.order })}>Sửa</button>{!g.isDefault && <button disabled={busy} onClick={() => void toggle(g)}>{g.isActive ? 'Ẩn nhóm' : 'Hiện lại'}</button>}</div></div>)}
    </section>
    <dialog ref={dialog} className="ai-task-dialog" onCancel={e => { if (busy) e.preventDefault(); else setEditor(null) }} onClose={() => setEditor(null)}>{editor && <form onSubmit={async e => {
      e.preventDefault(); setFormError('')
      try { await run(async () => { await api({ operation: 'saveGroup', ...(editor.group ? { id: editor.group.id } : {}), data: { name: editor.name, color: editor.color || null, order: editor.order, isActive: editor.group?.isActive ?? true } }); await refresh(); setEditor(null) }) }
      catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Không lưu được nhóm.') }
    }}><h2>{editor.group ? 'Sửa nhóm' : 'Thêm nhóm'}</h2><fieldset disabled={busy} className="ai-task-group-form"><label>Tên nhóm<input required maxLength={80} value={editor.name} onChange={e => setEditor({ ...editor, name: e.target.value })} /></label><label>Màu (tùy chọn)<input type="color" value={editor.color || '#94a3b8'} onChange={e => setEditor({ ...editor, color: e.target.value })} /></label><button type="button" onClick={() => setEditor({ ...editor, color: '' })}>Không dùng màu</button><label>Thứ tự<input required type="number" min={0} max={10000} value={editor.order} onChange={e => setEditor({ ...editor, order: Number(e.target.value) })} /></label></fieldset>{formError && <p role="alert" className="demo-alert">{formError}</p>}<div className="demo-form-actions"><button type="button" disabled={busy} onClick={() => setEditor(null)}>Hủy</button><button disabled={busy} className="demo-primary">{busy ? 'Đang lưu…' : 'Lưu nhóm'}</button></div></form>}</dialog>
  </>
}

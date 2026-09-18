'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react'
import { api, useTasks } from './Provider'
import TaskForm, { emptyTask } from './TaskForm'
import { displayDate, priorities, priorityLabels, statuses, statusLabels, type Action, type Task, type TaskInput } from '../_lib/model'
import { visibleTree } from '../_lib/tree'

const viewLabels = { active: 'Đang mở', today: 'Hôm nay', upcoming: 'Sắp tới', overdue: 'Quá hạn', no_deadline: 'Không deadline', completed: 'Hoàn thành', all: 'Tất cả', deleted: 'Thùng rác' }
export default function Tasks() {
  const { groups, revision, busy, run, notify } = useTasks()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [total, setTotal] = useState(0)
  const [matchingIds, setMatchingIds] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ view: 'active', query: '', groupId: '', priority: '', status: '' })
  const [reload, setReload] = useState(0)
  const [editor, setEditor] = useState<{ initial: TaskInput; task?: Task; action: Action; requestId: string } | null>(null)
  const [search, setSearch] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { const query = new URLSearchParams(window.location.search).get('query'); if (query) { setSearch(query); setFilters(f => ({ ...f, view: 'all', query })) } }, [])
  useEffect(() => { const timer = setTimeout(() => { setFilters(old => old.query === search ? old : { ...old, query: search }) }, 300); return () => clearTimeout(timer) }, [search])
  useEffect(() => { setCollapsed(new Set()) }, [filters])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    api<{ tasks: Task[]; total: number; matchingIds: string[] }>(undefined, { resource: 'tree', ...filters }, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setTasks(data.tasks); setTotal(data.total); setMatchingIds(new Set(data.matchingIds)) } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [filters, revision, reload])
  useEffect(() => { if (editor) dialog.current?.showModal(); else dialog.current?.close() }, [editor])
  const changeFilter = (key: keyof typeof filters, value: string) => { setFilters(old => ({ ...old, [key]: value })) }
  const parentsWithChildren = new Set(tasks.map(t => t.parentId).filter(Boolean))
  const visibleTasks = visibleTree(tasks, collapsed)
  const toggleBranch = (id: string) => setCollapsed(old => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const inputFor = (t: Task): TaskInput => ({ title: t.title, description: t.description, groupId: t.groupId, priority: t.priority, status: t.status, deadline: t.deadline, parentId: t.parentId })
  const propose = async (task: Task, action: Action) => {
    try { await run(async () => { await api({ operation: 'propose', requestId: crypto.randomUUID(), action, taskId: task.id, expectedVersion: task.version }); router.push('/demo/ai-task') }) }
    catch (reason) { notify(reason instanceof Error ? reason.message : 'Không thực hiện được yêu cầu.') }
  }
  return <>
    <div className="demo-page-heading"><div><h1>Công việc</h1><p>Tổ chức công việc thành cây. Mở từng nhánh để xem hoặc thêm việc bên dưới.</p></div><button className="demo-primary" disabled={busy} onClick={() => setEditor({ initial: emptyTask(groups.find(g => g.isDefault)!.id), action: 'CREATE_TASK', requestId: crypto.randomUUID() })}><Plus size={17} /> Thêm công việc</button></div>
    <div className="demo-tabs">{Object.entries(viewLabels).map(([value, label]) => <button key={value} aria-pressed={filters.view === value} className={filters.view === value ? 'demo-primary' : ''} onClick={() => changeFilter('view', value)}>{label}</button>)}</div>
    <section className="demo-panel">
      <div className="demo-filters"><label className="demo-search"><Search size={17} /><input aria-label="Tìm công việc" placeholder="Tìm tên hoặc mô tả…" maxLength={250} value={search} onChange={e => setSearch(e.target.value)} /></label>
        <select aria-label="Lọc nhóm" value={filters.groupId} onChange={e => changeFilter('groupId', e.target.value)}><option value="">Tất cả nhóm</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}{g.isActive ? '' : ' (đã ẩn)'}</option>)}</select>
        <select aria-label="Lọc ưu tiên" value={filters.priority} onChange={e => changeFilter('priority', e.target.value)}><option value="">Mọi ưu tiên</option>{priorities.map(p => <option key={p} value={p}>{priorityLabels[p]}</option>)}</select>
        <select aria-label="Lọc trạng thái" value={filters.status} onChange={e => changeFilter('status', e.target.value)}><option value="">Mọi trạng thái</option>{statuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</select>
        <button onClick={() => setReload(v => v + 1)} disabled={loading}>Tải lại</button>
        <button onClick={() => setCollapsed(new Set())} disabled={loading}>Mở tất cả</button>
        <button onClick={() => setCollapsed(new Set(tasks.filter(t => parentsWithChildren.has(t.id)).map(t => t.id)))} disabled={loading}>Thu gọn tất cả</button>
      </div>
      {error ? <p className="demo-alert" role="alert">{error}</p> : loading ? <p className="demo-empty" role="status">Đang tìm công việc…</p> : !tasks.length ? <p className="demo-empty">Chưa có công việc phù hợp.</p> : <div className="demo-table-wrap"><table aria-label="Cây công việc"><thead><tr><th>Công việc</th><th>Nhóm</th><th>Ưu tiên</th><th>Trạng thái</th><th>Deadline</th><th>Thao tác</th></tr></thead><tbody>{visibleTasks.map(t => <tr key={t.id} data-task-id={t.id} data-depth={t.depth} className={`${t.status === 'done' ? 'is-done' : ''} ${matchingIds.has(t.id) ? '' : 'ai-task-tree-context'}`}>
        <td className="ai-task-tree-cell"><div style={{ paddingLeft: t.depth * 20 }}><div className="ai-task-tree-title">{parentsWithChildren.has(t.id) ? <button type="button" className="ai-task-tree-toggle" aria-expanded={!collapsed.has(t.id)} aria-label={`${collapsed.has(t.id) ? 'Mở' : 'Thu gọn'} nhánh ${t.title}`} onClick={() => toggleBranch(t.id)}>{collapsed.has(t.id) ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</button> : <span className="ai-task-tree-spacer" />}<strong>{t.title}</strong></div>{!matchingIds.has(t.id) && <small>Task tổ tiên · ngoài bộ lọc</small>}{t.deletedAt && <small>Đã xóa mềm</small>}{t.description && <details><summary>Mô tả</summary><p className="ai-task-description">{t.description}</p></details>}</div></td>
        <td>{groups.find(g => g.id === t.groupId)?.name}</td><td><span className={`ai-task-badge priority-${t.priority}`}>{priorityLabels[t.priority]}</span></td><td><span className={`ai-task-badge status-${t.status}`}>{statusLabels[t.status]}</span></td><td><span className={t.deadline && Date.parse(t.deadline) < Date.now() && !['done', 'cancelled'].includes(t.status) ? 'demo-danger-text' : ''}>{displayDate(t.deadline)}</span></td>
        <td><div className="demo-row-actions">{t.deletedAt ? <button disabled={busy} onClick={() => void propose(t, 'RESTORE_TASK')}>Khôi phục</button> : <><button disabled={busy} onClick={() => setEditor({ initial: inputFor(t), task: t, action: 'UPDATE_TASK', requestId: crypto.randomUUID() })}>Sửa / trạng thái</button><button disabled={busy} onClick={() => setEditor({ initial: { ...emptyTask(t.groupId), parentId: t.id }, action: 'CREATE_SUBTASK', requestId: crypto.randomUUID() })}>Thêm task con</button><button disabled={busy} className="demo-danger-text" onClick={() => void propose(t, 'DELETE_TASK')}>Xóa</button></>}</div></td>
      </tr>)}</tbody></table></div>}
      <div className="ai-task-pagination"><span>{total} công việc phù hợp · {visibleTasks.length} dòng đang mở{tasks.length > total ? ' · Giữ task tổ tiên để hiển thị đúng cây' : ''}</span></div>
    </section>
    <dialog ref={dialog} className="ai-task-dialog" onCancel={e => { if (busy) e.preventDefault(); else setEditor(null) }} onClose={() => setEditor(null)}>{editor && <><h2>{editor.action === 'UPDATE_TASK' ? 'Chỉnh sửa công việc' : editor.action === 'CREATE_SUBTASK' ? 'Thêm task con' : 'Thêm công việc'}</h2><TaskForm initial={editor.initial} before={editor.task} action={editor.action} groups={groups} busy={busy} onCancel={() => setEditor(null)} onSubmit={async data => { await run(async () => { await api({ operation: 'propose', requestId: editor.requestId, action: editor.action, data, ...(editor.task ? { taskId: editor.task.id, expectedVersion: editor.task.version } : {}) }); setEditor(null); router.push('/demo/ai-task') }) }} /></>}</dialog>
  </>
}

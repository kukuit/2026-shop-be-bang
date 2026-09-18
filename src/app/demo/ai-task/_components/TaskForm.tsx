'use client'
import { useCallback, useEffect, useState } from 'react'
import { displayDate, priorities, priorityLabels, statuses, statusLabels, type Group, type TaskInput, type Task, type Action, type TreeNode } from '../_lib/model'
import { treePath } from '../_lib/tree'
import { api } from './Provider'

export function emptyTask(groupId: string): TaskInput { return { title: '', description: null, groupId, priority: 'normal', status: 'todo', parentId: null, deadline: null } }
const localDate = (value: string | null) => value ? new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(0, 16) : ''
export default function TaskForm({ initial, groups, busy, onSubmit, onCancel, before, action, submitLabel = 'Xem lại trong chat' }: { initial: TaskInput; groups: Group[]; busy: boolean; onSubmit(data: TaskInput): Promise<void>; onCancel(): void; before?: Task | null; action?: Action; submitLabel?: string }) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState('')
  const [parents, setParents] = useState<{ nodes: TreeNode[]; candidates: TreeNode[] }>({ nodes: [], candidates: [] })
  const [parentLoading, setParentLoading] = useState(true)
  const [parentError, setParentError] = useState('')
  const taskId = before?.id
  const loadParents = useCallback(async (signal?: AbortSignal) => {
    setParentLoading(true); setParentError('')
    try {
      const result = await api<{ nodes: TreeNode[]; candidates: TreeNode[] }>(undefined, { resource: 'parents', ...(taskId ? { taskId } : {}) }, signal)
      if (!signal?.aborted) setParents(result)
    } catch (reason) { if (!signal?.aborted) setParentError(reason instanceof Error ? reason.message : 'Không tải được task cha.') }
    finally { if (!signal?.aborted) setParentLoading(false) }
  }, [taskId])
  useEffect(() => { const controller = new AbortController(); void loadParents(controller.signal); return () => controller.abort() }, [loadParents])
  const readonly = action === 'DELETE_TASK' || action === 'RESTORE_TASK'
  const parentEditable = !action || ['CREATE_TASK', 'CREATE_SUBTASK', 'UPDATE_TASK'].includes(action)
  const invalidParent = parentEditable && (value.parentId ? !parents.candidates.some(p => p.id === value.parentId) : action === 'CREATE_SUBTASK')
  const set = <K extends keyof TaskInput>(key: K, v: TaskInput[K]) => setValue(old => ({ ...old, [key]: v }))
  return <form className="ai-task-form" onSubmit={async e => { e.preventDefault(); setError(''); try { await onSubmit(value) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được công việc.') } }}>
    {before && <details className="ai-task-before"><summary>Thông tin hiện tại trước khi thay đổi</summary><p><strong>{before.title}</strong></p><p>{statusLabels[before.status]} · {priorityLabels[before.priority]} · {groups.find(g => g.id === before.groupId)?.name}</p><p>Task cha: {treePath(before.parentId, parents.nodes)}</p><p>{displayDate(before.deadline)}</p>{before.description && <p>{before.description}</p>}</details>}
    {action === 'DELETE_TASK' && <p className="demo-alert">Công việc sẽ vào thùng rác và có thể khôi phục. Task con phải được xử lý trước.</p>}
    <fieldset disabled={busy || readonly}>
      <div className="demo-form-grid">
        <label className="demo-full">Công việc<input required maxLength={250} value={value.title} onChange={e => set('title', e.target.value)} /></label>
        <label className="demo-full">Task cha{parentEditable ? <select aria-label="Task cha" disabled={parentLoading || !!parentError} value={value.parentId || ''} onChange={e => set('parentId', e.target.value || null)}>
          <option value="" disabled={action === 'CREATE_SUBTASK'}>{action === 'CREATE_SUBTASK' ? 'Chọn task cha' : 'Không có · Task gốc'}</option>
          {!!value.parentId && !parents.candidates.some(p => p.id === value.parentId) && <option value={value.parentId} disabled>{parentLoading ? 'Đang tải task cha…' : 'Task cha không còn hợp lệ — chọn lại'}</option>}
          {parents.candidates.map(p => <option key={p.id} value={p.id}>{treePath(p.id, parents.nodes)}</option>)}
        </select> : <p>{treePath(value.parentId, parents.nodes)}</p>}<small>{parentLoading ? 'Đang tải cây công việc…' : 'Có thể đặt dưới bất kỳ cấp nào. Không thể chọn chính task hoặc nhánh con của nó.'}</small></label>
        <label>Nhóm<select value={value.groupId} onChange={e => set('groupId', e.target.value)}>{groups.filter(g => g.isActive || g.id === initial.groupId).map(g => <option value={g.id} key={g.id} disabled={!g.isActive && g.id !== initial.groupId}>{g.name}{g.isActive ? '' : ' (đã ẩn)'}</option>)}</select></label>
        <label>Ưu tiên<select value={value.priority} onChange={e => set('priority', e.target.value as TaskInput['priority'])}>{priorities.map(p => <option key={p} value={p}>{priorityLabels[p]}</option>)}</select></label>
        <label>Trạng thái<select disabled={busy || readonly || action === 'COMPLETE_TASK' || action === 'CANCEL_TASK'} value={value.status} onChange={e => set('status', e.target.value as TaskInput['status'])}>{statuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></label>
        <label>Deadline (giờ Việt Nam)<input type="datetime-local" min="1900-01-01T00:00" max="9999-12-31T23:59" value={localDate(value.deadline)} onChange={e => { const parsed = e.target.value ? new Date(`${e.target.value}:00+07:00`) : null; if (!parsed || !Number.isNaN(parsed.getTime())) set('deadline', parsed?.toISOString() || null) }} /><small>Để trống nếu chưa có deadline.</small></label>
        <label className="demo-full">Mô tả<textarea maxLength={5000} value={value.description || ''} onChange={e => set('description', e.target.value || null)} /></label>
      </div>
    </fieldset>
    {before && before.parentId !== value.parentId && <p className="demo-alert">Chuyển cả nhánh từ “{treePath(before.parentId, parents.nodes)}” sang “{treePath(value.parentId, parents.nodes)}”. Tất cả task bên dưới sẽ đi cùng; trạng thái và deadline giữ nguyên.</p>}
    {parentError && <p className="demo-alert" role="alert">{parentError} <button type="button" onClick={() => void loadParents()}>Tải lại task cha</button></p>}
    {error && <p className="demo-alert" role="alert">{error}</p>}
    <div className="demo-form-actions"><button type="button" disabled={busy} onClick={onCancel}>Hủy</button><button className="demo-primary" disabled={busy || parentLoading || !!parentError || !!invalidParent}>{busy ? 'Đang xử lý…' : submitLabel}</button></div>
  </form>
}

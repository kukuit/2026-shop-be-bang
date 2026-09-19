'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { scheduledDeadline, taskInputSchema, displayDate, priorities, priorityLabels, statuses, statusLabels, type Group, type TaskInput, type Task, type Action, type TreeNode } from '../_lib/model'
import { treePath } from '../_lib/tree'
import { api } from './Provider'
import DurationPicker from './DurationPicker'

export function emptyTask(groupId: string): TaskInput { return { title: '', description: null, groupId, priority: 'normal', status: 'todo', parentId: null, deadline: null, startTime: null, duration: 1440, withinDay: false, startNow: true, scheduleMode: 'duration' } }
const localDate = (value: string | null) => value ? new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(0, 16) : ''
export default function TaskForm({ initial, groups, busy, onSubmit, onCancel, before, action, compact = false, submitLabel = 'Xác nhận lưu', onDraftChange }: { initial: TaskInput; onDraftChange?(data: TaskInput): void; groups: Group[]; busy: boolean; onSubmit(data: TaskInput): Promise<void>; onCancel(): void; before?: Task | null; action?: Action; submitLabel?: string; compact?: boolean }) {
  const [value, setValue] = useState(() => ({ ...initial, startTime: initial.startTime ?? null, duration: initial.duration ?? null, withinDay: initial.withinDay ?? false, startNow: initial.startNow ?? (!before && !initial.startTime), scheduleMode: initial.scheduleMode ?? (initial.duration ? 'duration' : 'deadline') }))
  const draftCallback = useRef(onDraftChange)
  draftCallback.current = onDraftChange
  useEffect(() => { draftCallback.current?.(value) }, [value])
  const [expanded, setExpanded] = useState(!compact)
  const [editPriority, setEditPriority] = useState(false)
  const [editStatus, setEditStatus] = useState(false)
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
  const parentCandidates = parents.candidates.filter(p => !p.groupId || p.groupId === value.groupId)
  const invalidParent = parentEditable && (value.parentId ? !parentCandidates.some(p => p.id === value.parentId) : action === 'CREATE_SUBTASK')
  const set = <K extends keyof TaskInput>(key: K, v: TaskInput[K]) => setValue(old => ({ ...old, [key]: v }))
  return <form className={`ai-task-form ${compact ? 'ai-task-form-compact' : ''}`} onSubmit={async e => { e.preventDefault(); setError(''); try { const result = taskInputSchema.safeParse(value); if (!result.success) { setExpanded(true); setError(result.error.issues.map(issue => issue.message).join(' ')); return } await onSubmit(result.data) } catch (reason) { setExpanded(true); setError(reason instanceof Error ? reason.message : 'Không lưu được công việc.') } }}>
    {before && expanded && <details className="ai-task-before"><summary>Thông tin hiện tại trước khi thay đổi</summary><p><strong>{before.title}</strong></p><p>{statusLabels[before.status]} · {priorityLabels[before.priority]} · {groups.find(g => g.id === before.groupId)?.name}</p><p>Task cha: {treePath(before.parentId, parents.nodes)}</p><p>{displayDate(before.deadline)}</p>{before.startTime && <p>Bắt đầu: {displayDate(before.startTime)}</p>}{before.duration && <p>Thời lượng: {before.duration} phút</p>}{before.description && <p>{before.description}</p>}</details>}
    {action === 'DELETE_TASK' && <p className="demo-alert">Công việc sẽ vào thùng rác và có thể khôi phục. Task con phải được xử lý trước.</p>}
    <fieldset disabled={busy || readonly}>
      <div className="demo-form-grid">
        <label className="demo-full">Công việc<input required maxLength={250} value={value.title} onChange={e => set('title', e.target.value)} /></label>
        {expanded && <>
        <label className="demo-full">Task cha{parentEditable ? <select aria-label="Task cha" disabled={parentLoading || !!parentError} value={value.parentId || ''} onChange={e => set('parentId', e.target.value || null)}>
          <option value="" disabled={action === 'CREATE_SUBTASK'}>{action === 'CREATE_SUBTASK' ? 'Chọn task cha' : 'Không có · Task gốc'}</option>
          {!!value.parentId && !parentCandidates.some(p => p.id === value.parentId) && <option value={value.parentId} disabled>{parentLoading ? 'Đang tải task cha…' : 'Task cha không còn hợp lệ — chọn lại'}</option>}
          {parentCandidates.map(p => <option key={p.id} value={p.id}>{treePath(p.id, parents.nodes)}</option>)}
        </select> : <p>{treePath(value.parentId, parents.nodes)}</p>}<small>{parentLoading ? 'Đang tải cây công việc…' : 'Có thể đặt dưới bất kỳ cấp nào. Không thể chọn chính task hoặc nhánh con của nó.'}</small></label>
        <label>Nhóm<select value={value.groupId} onChange={e => setValue(old => ({ ...old, groupId: e.target.value, parentId: parents.candidates.some(p => p.id === old.parentId && p.groupId === e.target.value) ? old.parentId : null }))}>{groups.filter(g => g.isActive || g.id === initial.groupId).map(g => <option value={g.id} key={g.id} disabled={!g.isActive && g.id !== initial.groupId}>{g.name}{g.isActive ? '' : ' (đã ẩn)'}</option>)}</select></label>
        </>}
        <div className="demo-full demo-inline ai-task-quick-fields">
          {expanded || editPriority ? <label>Ưu tiên<select aria-label="Ưu tiên" autoFocus={!expanded} value={value.priority} onBlur={() => setEditPriority(false)} onChange={e => { set('priority', e.target.value as TaskInput['priority']); setEditPriority(false) }}>{priorities.map(p => <option key={p} value={p}>{priorityLabels[p]}</option>)}</select></label> : <span>Ưu tiên: <button type="button" className="ai-task-text-link" onClick={() => setEditPriority(true)}>{priorityLabels[value.priority]}</button></span>}
          {expanded || editStatus ? <label>Trạng thái<select aria-label="Trạng thái" autoFocus={!expanded} disabled={busy || readonly || action === 'COMPLETE_TASK' || action === 'CANCEL_TASK'} value={value.status} onBlur={() => setEditStatus(false)} onChange={e => { set('status', e.target.value as TaskInput['status']); setEditStatus(false) }}>{statuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></label> : <span>Trạng thái: <button type="button" className="ai-task-text-link" disabled={action === 'COMPLETE_TASK' || action === 'CANCEL_TASK'} onClick={() => setEditStatus(true)}>{statusLabels[value.status]}</button></span>}
        </div>
        {!expanded && <div className="demo-full ai-task-compact-summary">
          <p>{groups.find(g => g.id === value.groupId)?.name || 'Chưa chọn nhóm'} · {parentLoading ? 'Đang tải nhánh…' : treePath(value.parentId, parents.nodes)}</p>
          <p>Bắt đầu: {value.startNow ? 'Ngay khi xác nhận' : value.startTime ? displayDate(value.startTime) : 'Chưa chọn'}</p>
          {value.scheduleMode === 'duration' ? <p>Đã chọn: {value.duration ? value.duration % 1440 === 0 ? value.duration / 1440 + ' ngày' : value.duration % 60 === 0 ? value.duration / 60 + ' giờ' : value.duration + ' phút' : 'Chưa chọn thời lượng'}</p> : <p>Deadline: {displayDate(value.deadline)}</p>}
        </div>}
        {expanded && <>
        <div className="demo-full"><strong>Bắt đầu</strong>{value.startNow ? <div className="demo-inline"><span>Ngay bây giờ</span><button type="button" onClick={() => setValue(old => ({ ...old, startNow: false, startTime: new Date(Math.floor(Date.now() / 60000) * 60000).toISOString() }))}>Đổi</button></div> : <><label>Ngày giờ bắt đầu (giờ Việt Nam)<input type="datetime-local" min="1900-01-01T00:00" max="9999-12-31T23:59" value={localDate(value.startTime)} onChange={e => { const parsed = e.target.value ? new Date(e.target.value + ':00+07:00') : null; if (!parsed || !Number.isNaN(parsed.getTime())) set('startTime', parsed?.toISOString() || null) }} /></label><button type="button" onClick={() => setValue(old => ({ ...old, startNow: true, startTime: null }))}>Ngay bây giờ</button></>}<small>{value.startNow ? 'Thời gian bắt đầu được chốt khi xác nhận lưu.' : 'Có thể chọn thời gian bắt đầu khác.'}</small></div>
        <div className="demo-tabs demo-full" role="group" aria-label="Cách đặt lịch"><button type="button" aria-pressed={value.scheduleMode === 'duration'} className={value.scheduleMode === 'duration' ? 'demo-primary' : ''} onClick={() => setValue(old => ({ ...old, scheduleMode: 'duration', duration: old.duration || 1440 }))}>Theo thời lượng</button><button type="button" aria-pressed={value.scheduleMode === 'deadline'} className={value.scheduleMode === 'deadline' ? 'demo-primary' : ''} onClick={() => setValue(old => ({ ...old, scheduleMode: 'deadline', deadline: old.deadline || scheduledDeadline(old.startTime || new Date().toISOString(), old.duration) }))}>Theo deadline</button></div>
        {value.scheduleMode === 'duration' ? <><DurationPicker value={value.duration} onChange={duration => setValue(old => ({ ...old, duration, deadline: null }))} /><div><strong>Deadline tự tính</strong><p>{value.duration ? value.startNow ? 'Sau ' + value.duration + ' phút kể từ khi xác nhận lưu.' : displayDate(scheduledDeadline(value.startTime, value.duration)) : 'Chưa chọn thời lượng.'}</p></div></> : <><label>Deadline (giờ Việt Nam)<input type="datetime-local" min="1900-01-01T00:00" max="9999-12-31T23:59" value={localDate(value.deadline)} onChange={e => { const parsed = e.target.value ? new Date(e.target.value + ':00+07:00') : null; if (!parsed || !Number.isNaN(parsed.getTime())) set('deadline', parsed?.toISOString() || null) }} /><small>Để trống nếu chưa có deadline.</small></label><div><strong>Thời lượng tự tính</strong><p>{value.startNow ? 'Tính từ lúc xác nhận lưu đến deadline.' : value.startTime && value.deadline ? (Date.parse(value.deadline) > Date.parse(value.startTime) ? Math.ceil((Date.parse(value.deadline) - Date.parse(value.startTime)) / 60000) + ' phút' : 'Deadline phải sau thời gian bắt đầu.') : 'Chọn thời gian bắt đầu và deadline.'}</p></div></>}
        <label className="demo-full">Mô tả<textarea maxLength={5000} value={value.description || ''} onChange={e => set('description', e.target.value || null)} /></label>
        </>}
      </div>
    </fieldset>
    {compact && <button type="button" className="ai-task-text-link ai-task-expand" disabled={busy} aria-expanded={expanded} onClick={() => setExpanded(old => !old)}>{expanded ? 'Thu gọn' : 'Mở rộng'}</button>}
    {before && before.parentId !== value.parentId && <p className="demo-alert">Chuyển cả nhánh từ “{treePath(before.parentId, parents.nodes)}” sang “{treePath(value.parentId, parents.nodes)}”. Tất cả task bên dưới sẽ đi cùng; trạng thái và deadline giữ nguyên.</p>}
    {invalidParent && !parentLoading && <p className="demo-alert">Hãy mở rộng để chọn lại task cha hợp lệ.</p>}
    {parentError && <p className="demo-alert" role="alert">{parentError} <button type="button" onClick={() => void loadParents()}>Tải lại task cha</button></p>}
    {error && <p className="demo-alert" role="alert">{error}</p>}
    <div className="demo-form-actions"><button type="button" disabled={busy} onClick={onCancel}>Hủy</button><button className="demo-primary" disabled={busy || parentLoading || !!parentError || !!invalidParent}>{busy ? 'Đang xử lý…' : submitLabel}</button></div>
  </form>
}

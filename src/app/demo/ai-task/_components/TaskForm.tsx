'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { taskInputSchema, displayDate, priorities, priorityLabels, statusLabels, type Group, type TaskInput, type Task, type Action, type TreeNode } from '../_lib/model'
import { uiStatuses, uiStatus } from '../_lib/status-presentation'
import { treePath } from '../_lib/tree'
import { capitalizeTaskTitle, displayTaskDate } from '../_lib/task-presentation'
import { api } from './Provider'
import TaskScheduleFields, { durationText } from './TaskScheduleFields'
import { CalendarDays, Clock3, Timer } from 'lucide-react'
import { useTaskCompletion } from './TaskWorkflow'
import CompletionSummary from './CompletionSummary'

export function emptyTask(groupId: string): TaskInput { return { title: '', description: null, groupId, priority: 'normal', status: 'todo', parentId: null, deadline: null, startTime: null, duration: 1440, withinDay: false, startNow: true, scheduleMode: 'duration' } }
export default function TaskForm({ initial, groups, busy, onSubmit, onCancel, before, action, compact = false, submitLabel, onDraftChange }: { initial: TaskInput; onDraftChange?(data: TaskInput): void; groups: Group[]; busy: boolean; onSubmit(data: TaskInput): Promise<void>; onCancel(): void; before?: Task | null; action?: Action; submitLabel?: string; compact?: boolean }) {
  const { requestCompletion } = useTaskCompletion()
  const [value, setValue] = useState(() => ({ ...initial, startTime: initial.startTime ?? null, duration: initial.duration ?? null, withinDay: initial.withinDay ?? false, startNow: initial.startNow ?? (!before && !initial.startTime), scheduleMode: initial.scheduleMode ?? (initial.duration ? 'duration' : 'deadline') }))
  const draftCallback = useRef(onDraftChange)
  draftCallback.current = onDraftChange
  useEffect(() => { draftCallback.current?.(value) }, [value])
  const [expanded, setExpanded] = useState(!compact)
  const [editingTitle, setEditingTitle] = useState(false)
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
    } catch (reason) { if (!signal?.aborted) setParentError(reason instanceof Error ? reason.message : 'Không tải được công việc cha.') }
    finally { if (!signal?.aborted) setParentLoading(false) }
  }, [taskId])
  useEffect(() => { const controller = new AbortController(); void loadParents(controller.signal); return () => controller.abort() }, [loadParents])
  const readonly = action === 'DELETE_TASK' || action === 'RESTORE_TASK'
  const creating = !before && (!action || action === 'CREATE_TASK' || action === 'CREATE_SUBTASK')
  const parentEditable = !action || ['CREATE_TASK', 'CREATE_SUBTASK', 'UPDATE_TASK'].includes(action)
  const parentCandidates = parents.candidates.filter(p => p.status !== 'done' && p.status !== 'cancelled' && groups.some(g => g.id === p.groupId && (g.isActive || before?.groupId === g.id)))
  const selectedParent = parents.nodes.find(p => p.id === value.parentId)
  useEffect(() => {
    if (!readonly && selectedParent?.groupId) setValue(old => old.groupId === selectedParent.groupId ? old : { ...old, groupId: selectedParent.groupId! })
  }, [selectedParent?.groupId, readonly])
  const invalidParent = parentEditable && (value.parentId ? !parentCandidates.some(p => p.id === value.parentId) : action === 'CREATE_SUBTASK')
  const submit = async (data: TaskInput, autoKey?: string) => {
    if (!readonly && data.status === 'done' && before?.status !== 'done') {
      requestCompletion({ data, nodes: parents.nodes, autoKey, onConfirm: onSubmit })
    } else await onSubmit(data)
  }
  const submitRef = useRef(submit)
  submitRef.current = submit
  useEffect(() => {
    if (compact && initial.status === 'done' && before?.status !== 'done' && !readonly && !parentLoading && !parentError && !invalidParent) {
      const parsed = taskInputSchema.safeParse(value)
      if (parsed.success) void submitRef.current(parsed.data, `chat:${before?.id || initial.title}:${before?.version || 0}:${action}`)
    }
  }, [compact, initial.status, initial.title, before?.id, before?.version, before?.status, readonly, parentLoading, parentError, invalidParent, action, value])
  const set = <K extends keyof TaskInput>(key: K, v: TaskInput[K]) => setValue(old => ({ ...old, [key]: v }))
  return <form className={`ai-task-form ${compact ? 'ai-task-form-compact' : ''}`} onSubmit={async e => { e.preventDefault(); setError(''); try { const result = taskInputSchema.safeParse(value); if (!result.success) { setExpanded(true); setEditingTitle(true); setError(result.error.issues.map(issue => issue.message).join(' ')); return } await submit(result.data) } catch (reason) { setExpanded(true); setError(reason instanceof Error ? reason.message : 'Không lưu được công việc.') } }}>
    {before && expanded && <details className="ai-task-before"><summary>Thông tin hiện tại trước khi thay đổi</summary><p><strong>{before.title}</strong></p><p>{statusLabels[before.status]} · {priorityLabels[before.priority]} · {groups.find(g => g.id === before.groupId)?.name}</p><p>{!compact && 'Thuộc công việc: '}{before.parentId ? treePath(before.parentId, parents.nodes).replaceAll(' / ', ' › ') : 'Không có'}</p><p>{displayDate(before.deadline)}</p>{before.startTime && <p>Bắt đầu: {displayDate(before.startTime)}</p>}{before.duration && <p>Thời lượng: {before.duration} phút</p>}{before.description && <p>{before.description}</p>}</details>}
    {action === 'DELETE_TASK' && <p className="demo-alert">Công việc sẽ vào thùng rác và có thể khôi phục. Công việc con phải được xử lý trước.</p>}
    {before && <CompletionSummary task={before} />}
    <fieldset disabled={busy || readonly}>
      <div className="demo-form-grid">
        <div className="demo-full">{!compact || editingTitle ? <label>Công việc<input autoFocus={compact} required maxLength={250} value={value.title} onChange={e => set('title', e.target.value)} /></label> : <h3 className="ai-task-confirm-title">{capitalizeTaskTitle(value.title)}</h3>}</div>
        {compact && <div className="demo-full ai-task-compact-summary">
          <p className="ai-task-confirm-context">{[groups.find(g => g.id === value.groupId)?.name, value.parentId ? parentLoading ? 'Đang tải…' : treePath(value.parentId, parents.nodes).replaceAll(' / ', ' › ') : null].filter(Boolean).join(' › ')}</p>
          <div className="ai-task-confirm-time"><span><Clock3 size={16} aria-hidden="true" />{value.startNow ? 'Bắt đầu ngay' : value.startTime ? 'Bắt đầu ' + displayTaskDate(value.startTime) : 'Chưa đặt giờ bắt đầu'}</span>
            <span>{value.scheduleMode === 'duration' && value.duration ? <><Timer size={16} aria-hidden="true" />Khoảng {durationText(value.duration)}</> : <><CalendarDays size={16} aria-hidden="true" />{value.deadline ? 'Hạn ' + displayTaskDate(value.deadline) : 'Chưa đặt hạn'}</>}</span></div>
          <div className="demo-inline"><span className={`ai-task-badge priority-${value.priority}`}>{priorityLabels[value.priority]}</span><span className={`ai-task-badge status-${uiStatus(value.status)}`}>{statusLabels[value.status]}</span></div>
          {!expanded && value.description && <p className="ai-task-confirm-note">{value.description}</p>}
        </div>}
        {value.status !== 'done' && (expanded || value.completionPercent != null) && <label className="demo-full">Tiến độ (%)<input type="number" min={0} max={100} step={1} value={value.completionPercent ?? ''} onChange={e => set('completionPercent', e.target.value === '' ? null : Number(e.target.value))} /></label>}
        {expanded && <>
        <label className="demo-full">Thuộc công việc{parentEditable ? <select aria-label="Thuộc công việc" disabled={parentLoading || !!parentError} value={value.parentId || ''} onChange={e => { const parent = parentCandidates.find(p => p.id === e.target.value); setValue(old => ({ ...old, parentId: parent?.id || null, groupId: parent?.groupId || old.groupId })) }}>
          <option value="" disabled={action === 'CREATE_SUBTASK'}>{action === 'CREATE_SUBTASK' ? 'Chọn công việc' : 'Không có'}</option>
          {!!value.parentId && !parentCandidates.some(p => p.id === value.parentId) && <option value={value.parentId} disabled>{parentLoading ? 'Đang tải công việc cha…' : 'Công việc cha không còn hợp lệ — chọn lại'}</option>}
          {parentCandidates.map(p => <option key={p.id} value={p.id}>{treePath(p.id, parents.nodes).replaceAll(' / ', ' › ')}</option>)}
        </select> : <p>{value.parentId ? treePath(value.parentId, parents.nodes).replaceAll(' / ', ' › ') : 'Không có'}</p>}{parentLoading ? <small>Đang tải cây công việc…</small> : before && parentEditable && <small>Không thể chọn chính công việc hoặc nhánh con của nó.</small>}</label>
        <label>Nhóm<select aria-label="Nhóm" disabled={!!value.parentId} value={value.groupId} onChange={e => set('groupId', e.target.value)}>{groups.filter(g => g.isActive || g.id === value.groupId).map(g => <option value={g.id} key={g.id} disabled={!g.isActive && g.id !== initial.groupId}>{g.name}{g.isActive ? '' : ' (đã ẩn)'}</option>)}</select>{value.parentId && <small>Nhóm theo công việc cha.</small>}</label>
        <label>Ưu tiên<select aria-label="Ưu tiên" value={value.priority} onChange={e => set('priority', e.target.value as TaskInput['priority'])}>{priorities.map(p => <option key={p} value={p}>{priorityLabels[p]}</option>)}</select></label>
        <label className="demo-full">Trạng thái<select aria-label="Trạng thái" disabled={action === 'COMPLETE_TASK' || action === 'CANCEL_TASK'} value={uiStatus(value.status)} onChange={e => set('status', e.target.value as TaskInput['status'])}>{uiStatuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></label>
        <label className="demo-full">{compact ? 'Ghi chú' : 'Mô tả'}<textarea maxLength={5000} value={value.description || ''} onChange={e => set('description', e.target.value || null)} /></label>
        <TaskScheduleFields value={value} onChange={patch => setValue(old => ({ ...old, ...patch }))} />
        </>}
      </div>
    </fieldset>
    {compact && <button type="button" className="ai-task-text-link ai-task-expand" disabled={busy} aria-expanded={expanded} onClick={() => setExpanded(old => !old)}>{expanded ? 'Thu gọn chi tiết' : readonly ? 'Xem chi tiết' : '+ Thêm chi tiết'}</button>}
    {before && before.parentId !== value.parentId && <p className="demo-alert">Chuyển cả nhánh từ “{treePath(before.parentId, parents.nodes)}” sang “{treePath(value.parentId, parents.nodes)}”. Tất cả công việc bên dưới sẽ đi cùng và dùng cùng nhóm với công việc này; trạng thái và deadline giữ nguyên.</p>}
    {before && before.groupId !== value.groupId && <p className="demo-alert">Công việc này và toàn bộ công việc con sẽ chuyển sang nhóm “{groups.find(g => g.id === value.groupId)?.name}”.</p>}
    {invalidParent && !parentLoading && <p className="demo-alert">Hãy chọn lại công việc cha trong phần chi tiết.</p>}
    {parentError && <p className="demo-alert" role="alert">{parentError} <button type="button" onClick={() => void loadParents()}>Tải lại công việc cha</button></p>}
    {error && <p className="demo-alert" role="alert">{error}</p>}
    <div className="demo-form-actions"><button type="button" className={compact ? 'ai-task-text-link ai-task-cancel' : undefined} disabled={busy} onClick={onCancel}>{compact ? 'Hủy yêu cầu' : 'Hủy'}</button>{compact && !readonly && <button type="button" disabled={busy} aria-pressed={editingTitle} onClick={() => setEditingTitle(old => !old)}>{editingTitle ? 'Xong' : 'Sửa'}</button>}<button className="demo-primary" disabled={busy || parentLoading || !!parentError || !!invalidParent}>{busy ? 'Đang xử lý…' : submitLabel || (creating ? compact ? 'Thêm' : 'Thêm công việc' : 'Cập nhật')}</button></div>
  </form>
}

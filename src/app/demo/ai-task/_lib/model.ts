import { z } from 'zod'

export const statuses = ['todo', 'in_progress', 'waiting', 'blocked', 'done', 'cancelled'] as const
export const priorities = ['urgent', 'normal', 'low'] as const
export const statusLabels: Record<Status, string> = { todo: 'Mới tạo', in_progress: 'Đang làm', waiting: 'Đang chờ', blocked: 'Đang chờ', done: 'Hoàn thành', cancelled: 'Đã hủy' }
export const priorityLabels = { urgent: 'Gấp', normal: 'Bình thường', low: 'Thấp' }
export type Status = typeof statuses[number]
export const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,150}$/)
const dateSchema = z.string().datetime({ offset: true }).nullable()
const durationSchema = z.number().int().positive().max(525600).nullable()
export function scheduledDeadline(startTime: string | null, duration: number | null) {
  return startTime && duration && Number.isFinite(Date.parse(startTime) + duration * 60000)
    ? new Date(Date.parse(startTime) + duration * 60000).toISOString() : null
}
export const taskInputSchema = z.object({
  title: z.string().trim().min(1, 'Cần nhập tên công việc').max(250),
  description: z.string().trim().max(5000).nullable().default(null),
  groupId: idSchema,
  priority: z.enum(priorities).default('normal'),
  status: z.enum(statuses).default('todo'),
  completionPercent: z.number().int().min(0).max(100).nullable().optional(),
  completionNote: z.string().trim().max(5000).nullable().optional(),
  parentId: idSchema.nullable().default(null),
  deadline: dateSchema.default(null),
  startTime: dateSchema.default(null),
  duration: durationSchema.default(null),
  withinDay: z.boolean().default(false),
  scheduleMode: z.enum(['duration', 'deadline']).optional(),
  startNow: z.boolean().optional(),
}).strict().superRefine((value, ctx) => {
  if (!value.startNow && value.startTime && value.deadline && value.scheduleMode === 'deadline' && Date.parse(value.deadline) <= Date.parse(value.startTime)) {
    ctx.addIssue({ code: 'custom', path: ['deadline'], message: 'Deadline phải sau thời gian bắt đầu.' })
  }
}).transform(value => {
  const scheduleMode = value.scheduleMode ?? (value.duration ? 'duration' : 'deadline')
  const startTime = value.startNow ? null : value.startTime
  return { ...value, startTime, withinDay: false,
    deadline: scheduleMode === 'duration' ? (value.startNow ? null : scheduledDeadline(startTime, value.duration) ?? value.deadline) : value.deadline,
    duration: value.scheduleMode === 'deadline' ? (startTime && value.deadline ? Math.ceil((Date.parse(value.deadline) - Date.parse(startTime)) / 60000) : null) : value.duration,
  }
})
export type TaskInput = z.infer<typeof taskInputSchema>
export function finalizeSchedule(value: TaskInput, now = Date.now()): TaskInput {
  if (!value.startNow) return value
  const startTime = new Date(now).toISOString()
  if (value.scheduleMode === 'deadline' && value.deadline && Date.parse(value.deadline) <= now) throw new Error('Deadline đã qua. Hãy chọn deadline sau thời điểm xác nhận lưu.')
  return taskInputSchema.parse({ ...value, startNow: false, startTime })
}
export type Task = TaskInput & { id: string; rootTaskId: string; depth: number; createdAt: string; updatedAt: string; completedAt: string | null; cancelledAt: string | null; deletedAt: string | null; version: number }
export type TreeNode = Pick<Task, 'id' | 'title' | 'parentId' | 'rootTaskId' | 'depth' | 'deletedAt'> & Partial<Pick<Task, 'groupId' | 'status'>>
export type Group = { id: string; name: string; slug: string; color: string | null; order: number; isDefault: boolean; isActive: boolean; createdAt: string; updatedAt: string }
export const groupInputSchema = z.object({ name: z.string().trim().min(1).max(80), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().default(null), order: z.number().int().min(0).max(10000), isActive: z.boolean().default(true) }).strict()
export const views = ['active', 'today', 'upcoming', 'overdue', 'no_deadline', 'completed', 'all', 'deleted'] as const
export const filterSchema = z.object({
  view: z.enum(views).default('active'), query: z.string().trim().max(250).default(''),
  groupId: idSchema.optional(), priority: z.enum(priorities).optional(), status: z.enum(statuses).optional(),
  parentId: idSchema.optional(), createdAfter: dateSchema.optional(), createdBefore: dateSchema.optional(),
  recommend: z.boolean().optional(),
}).strict()
export type Filters = z.infer<typeof filterSchema>
export const actions = ['CREATE_TASK', 'UPDATE_TASK', 'CREATE_SUBTASK', 'COMPLETE_TASK', 'CANCEL_TASK', 'DELETE_TASK', 'RESTORE_TASK', 'GET_TASKS', 'GET_TASK_DETAIL'] as const
export type Action = typeof actions[number]
const aiFields = z.object({ title: z.string().trim().min(1).max(250).optional(), description: z.string().max(5000).nullable().optional(), groupName: z.string().max(80).optional(), parentQuery: z.string().trim().min(1).max(250).nullable().optional(), completionPercent: z.number().int().min(0).max(100).nullable().optional(), priority: z.enum(priorities).optional(), status: z.enum(statuses).optional(), deadline: dateSchema.optional(), startTime: dateSchema.optional(), duration: durationSchema.optional(), withinDay: z.boolean().optional(), startNow: z.boolean().optional(), scheduleMode: z.enum(['duration', 'deadline']).optional() }).strict()
export const intentSchema = z.object({
  action: z.enum(actions), target: z.object({ query: z.string().trim().min(1).max(250) }).strict().optional(),
  data: aiFields.optional(), changes: aiFields.optional(),
  filters: filterSchema.omit({ groupId: true, parentId: true }).extend({ groupName: z.string().max(80).optional() }).optional(),
}).strict().superRefine((v, ctx) => {
  if (v.action === 'CREATE_TASK' || v.action === 'CREATE_SUBTASK') {
    if (!v.data?.title) ctx.addIssue({ code: 'custom', message: 'Thiếu tên công việc', path: ['data', 'title'] })
  }
  if (!['CREATE_TASK', 'GET_TASKS'].includes(v.action) && !v.target?.query) ctx.addIssue({ code: 'custom', message: 'Thiếu công việc cần tìm', path: ['target'] })
  if (v.action === 'UPDATE_TASK' && !Object.keys(v.changes || {}).length) ctx.addIssue({ code: 'custom', message: 'Thiếu nội dung thay đổi', path: ['changes'] })
})
export type Intent = z.infer<typeof intentSchema>
export type Proposal = { action: Action; taskId: string | null; expectedVersion: number | null; data: TaskInput; before: Task | null }
export type Message = { id: string; role: 'user' | 'assistant'; content: string; sequence: number; createdAt: string; status: 'normal' | 'choose' | 'pending' | 'confirmed' | 'cancelled'; proposal?: Proposal | null; intent?: Intent | null; candidates?: Task[]; candidatePaths?: Record<string, string>; tasks?: Task[]; displayGroups?: import('./task-display').TaskDisplayGroup[]; total?: number; resultTaskId?: string; recognition?: import('@/modules/ai-task/action-recognition/types').RecognitionRecord }
export const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()
export const slugify = (s: string) => normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'nhom'
export const dayKey = (date: string | number | Date) => new Date(new Date(date).getTime() + 7 * 3600000).toISOString().slice(0, 10)
export const displayDate = (date: string | null) => date ? new Date(date).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }) : 'Chưa có deadline'
export const isOpen = (t: Task) => !t.deletedAt && !['done', 'cancelled'].includes(t.status)
export function matches(t: Task, f: Filters, now = Date.now()) {
  if (f.view === 'deleted' ? !t.deletedAt : Boolean(t.deletedAt)) return false
  if (f.query && !normalize(`${t.title} ${t.description || ''}`).includes(normalize(f.query))) return false
  if (f.groupId && t.groupId !== f.groupId || f.priority && t.priority !== f.priority || f.status && t.status !== f.status || f.parentId && t.parentId !== f.parentId) return false
  if (f.createdAfter && Date.parse(t.createdAt) < Date.parse(f.createdAfter) || f.createdBefore && Date.parse(t.createdAt) >= Date.parse(f.createdBefore)) return false
  const today = dayKey(now)
  switch (f.view) {
    case 'active': return isOpen(t)
    case 'today': return isOpen(t) && !!t.deadline && dayKey(t.deadline) === today
    case 'upcoming': return isOpen(t) && !!t.deadline && dayKey(t.deadline) > today
    case 'overdue': return isOpen(t) && !!t.deadline && Date.parse(t.deadline) < now
    case 'no_deadline': return isOpen(t) && !t.deadline
    case 'completed': return t.status === 'done'
    default: return true
  }
}
export function rankTasks(tasks: Task[], now = Date.now()) {
  return [...tasks].sort((a, b) => {
    const overdue = (t: Task) => !!t.deadline && Date.parse(t.deadline) < now
    return Number(overdue(b)) - Number(overdue(a)) || Number(b.priority === 'urgent') - Number(a.priority === 'urgent') || (a.deadline ? Date.parse(a.deadline) : Infinity) - (b.deadline ? Date.parse(b.deadline) : Infinity) || Number(b.status === 'in_progress') - Number(a.status === 'in_progress') || a.id.localeCompare(b.id)
  })
}

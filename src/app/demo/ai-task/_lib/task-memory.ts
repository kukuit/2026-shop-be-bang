import { z } from 'zod'
import { dayKey, idSchema, isOpen, priorities, statuses, taskInputSchema, type Group, type Task, type TaskInput } from './model'
import { validParents } from './tree'

export const overviewSchema = z.object({
  groupId: idSchema.optional(), parentId: idSchema.nullable().optional(),
  priority: z.enum(priorities).optional(), status: z.enum(statuses).optional(),
  startNow: z.boolean().optional(), startClock: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  updatedAt: z.string().nullable().optional(),
})
export type TaskOverviewMemory = z.infer<typeof overviewSchema>
export const draftSchema = overviewSchema.omit({ updatedAt: true }).extend({
  title: z.string().max(250).optional(), description: z.string().max(5000).nullable().optional(),
  duration: z.number().int().positive().max(525600).nullable().optional(),
  startTime: z.string().datetime({ offset: true }).nullable().optional(), deadline: z.string().datetime({ offset: true }).nullable().optional(),
  scheduleMode: z.enum(['duration', 'deadline']).optional(), withinDay: z.boolean().optional(),
})
export const contextSchema = z.object({
  mode: z.enum(['idle', 'creating-task', 'editing-task']).default('idle'),
  activeDraft: draftSchema.default({}),
  conversationDefaults: overviewSchema.pick({ groupId: true, parentId: true, priority: true, status: true }).default({}),
  updatedAt: z.number().default(0),
})
export type TaskConversationMemory = z.infer<typeof contextSchema>
export const newContext = (): TaskConversationMemory => ({ mode: 'idle', activeDraft: {}, conversationDefaults: {}, updatedAt: Date.now() })
export const CONTEXT_TTL = 2 * 60 * 60 * 1000
export function readContext(value: unknown, now = Date.now()): TaskConversationMemory {
  const result = contextSchema.safeParse(value)
  return result.success && now - result.data.updatedAt < CONTEXT_TTL && result.data.updatedAt <= now ? result.data : newContext()
}
export function confirmedOverview(input: TaskInput, now: string): TaskOverviewMemory {
  return { groupId: input.groupId, parentId: input.parentId, priority: input.priority, status: input.status,
    startNow: input.startNow ?? false, startClock: !input.startNow && input.startTime ? new Date(Date.parse(input.startTime) + 7 * 3600000).toISOString().slice(11, 16) : null, updatedAt: now }
}
export const TASK_MEMORY_POLICY = {
  groupId: 'overview+context', parentId: 'overview+context', priority: 'overview+context', status: 'overview+context',
  startNow: 'overview+context', startClock: 'overview+context',
  title: 'context-only', description: 'context-only', deadline: 'context-only', duration: 'context-only', startTime: 'context-only', scheduleMode: 'context-only', withinDay: 'context-only',
} as const
export type ResolvedSource = 'explicit' | 'draft' | 'context' | 'overview' | 'default'
export function resolveTaskMemory(explicit: Partial<TaskInput> & { startClock?: string | null }, context: TaskConversationMemory, overview: TaskOverviewMemory, groups: Group[], tasks: Task[], now = Date.now()) {
  const fallback = groups.find(g => g.isActive && g.isDefault) || groups.find(g => g.isActive)
  if (!fallback) throw new Error('Không có nhóm đang hoạt động.')
  const values: Record<string, unknown> = { groupId: fallback.id, parentId: null, priority: 'normal', status: 'todo' }
  const sources: Partial<Record<keyof typeof TASK_MEMORY_POLICY, ResolvedSource>> = {}
  for (const [key, policy] of Object.entries(TASK_MEMORY_POLICY)) {
    const layers: [ResolvedSource, object][] = [['explicit', explicit], ['draft', context.activeDraft], ['context', context.conversationDefaults], ...(policy === 'overview+context' ? [['overview', overview] as [ResolvedSource, object]] : [])]
    const found = layers.find(([, layer]) => Object.prototype.hasOwnProperty.call(layer, key) && (layer as Record<string, unknown>)[key] !== undefined)
    if (found) values[key] = (found[1] as Record<string, unknown>)[key]
    sources[key as keyof typeof TASK_MEMORY_POLICY] = found?.[0] || 'default'
  }
  if (!groups.some(g => g.isActive && g.id === values.groupId)) { values.groupId = fallback.id; sources.groupId = 'default' }
  if (values.parentId) {
    const parent = validParents(tasks).find(t => t.id === values.parentId && isOpen(t) && groups.some(g => g.id === t.groupId && g.isActive))
    if (parent) { values.groupId = parent.groupId; sources.groupId = sources.parentId }
    else { values.parentId = null; sources.parentId = 'default' }
  }
  // Start controls describe one choice. A lower-layer "now" must never override
  // a date/clock supplied by a higher layer (or resurrect an explicitly cleared date).
  const startLayers: [ResolvedSource, Partial<TaskInput> & { startClock?: string | null }][] = [['explicit', explicit], ['draft', context.activeDraft], ['overview', overview]]
  const startChoice = startLayers.find(([, layer]) => ['startTime', 'startNow', 'startClock'].some(key => Object.prototype.hasOwnProperty.call(layer, key)))
  const startLayer = startChoice?.[1]
  if (startLayer) {
    values.startNow = startLayer.startNow ?? false
    values.startTime = startLayer.startTime ?? null
    values.startClock = startLayer.startClock ?? null
    sources.startNow = sources.startTime = sources.startClock = startChoice![0]
  }
  if (values.startNow) values.startTime = null
  else if (!values.startTime && values.startClock && !('startTime' in explicit)) {
    let start = Date.parse(`${dayKey(now)}T${values.startClock}:00+07:00`)
    if (start < now) start += 86400000
    values.startTime = new Date(start).toISOString()
  }
  delete values.startClock
  if ('deadline' in explicit && !('duration' in explicit)) values.scheduleMode = 'deadline'
  else if ('duration' in explicit) values.scheduleMode = 'duration'
  if (values.scheduleMode === 'duration' || values.duration && values.scheduleMode !== 'deadline') values.deadline = null
  return { data: taskInputSchema.parse(values), sources }
}

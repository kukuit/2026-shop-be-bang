import { z } from 'zod'
import type { TaskInput } from './model'

export type WorkDefaults = Partial<Pick<TaskInput, 'groupId' | 'parentId' | 'duration' | 'priority' | 'startNow' | 'startTime' | 'deadline' | 'scheduleMode'>> & { startClock?: string | null }
export type ContextMemory = { values: WorkDefaults; notes: string; recent: { role: string; content: string; status: string; id: string }[]; updatedAt: string | null }
export const emptyContext = (): ContextMemory => ({ values: {}, notes: '', recent: [], updatedAt: null })
export type WorkMemory = { context: WorkDefaults; preferences: WorkDefaults; lastForm: WorkDefaults; samples: (WorkDefaults & { taskId?: string })[]; notes: string; updatedAt: string | null }
export const emptyMemory = (): WorkMemory => ({ context: {}, preferences: {}, lastForm: {}, samples: [], notes: '', updatedAt: null })
export const conversationSchema = z.object({
  action: z.literal('CHAT'),
  reply: z.string().trim().min(1).max(2000),
  memory: z.object({
    scope: z.enum(['context', 'preferences']),
    groupName: z.string().trim().min(1).max(80).nullable().optional(),
    parentQuery: z.string().trim().min(1).max(250).nullable().optional(),
    duration: z.number().int().positive().max(525600).nullable().optional(),
    startClock: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
    startNow: z.boolean().optional(),
    startTime: z.string().datetime({ offset: true }).nullable().optional(),
    deadline: z.string().datetime({ offset: true }).nullable().optional(),
    priority: z.enum(['urgent', 'normal', 'low']).optional(),
    notes: z.string().max(1500).optional(),
    reset: z.boolean().optional(),
  }).strict().optional(),
}).strict()
export type Conversation = z.infer<typeof conversationSchema>
export type MemoryUpdate = { scope: 'context' | 'preferences'; values: WorkDefaults; notes?: string; reset?: boolean }

export function rememberForm(memory: WorkMemory, input: TaskInput, now: string, taskId: string): WorkMemory {
  const form: WorkDefaults = { groupId: input.groupId, parentId: input.parentId, priority: input.priority, duration: input.scheduleMode === 'deadline' ? null : input.duration,
    startNow: input.startNow ?? false, startClock: !input.startNow && input.startTime ? new Date(Date.parse(input.startTime) + 7 * 3600000).toISOString().slice(11, 16) : null }
  return { ...memory, context: { groupId: form.groupId, parentId: form.parentId }, lastForm: form, samples: [...memory.samples.filter(sample => sample.taskId !== taskId), { ...form, taskId }].slice(-20), updatedAt: now }
}

export function familiarDefaults(memory: WorkMemory): WorkDefaults {
  const habits: WorkDefaults = {}
  // Require repeated observations; a single form is only a fallback, not a habit.
  for (const key of ['duration', 'startClock'] as const) {
    const counts = new Map<string, number>()
    for (const sample of memory.samples) if (sample[key] != null) { const value = String(sample[key]); counts.set(value, (counts.get(value) || 0) + 1) }
    const best = Array.from(counts).sort((a, b) => b[1] - a[1])[0]
    if (best && best[1] >= 3 && best[1] > memory.samples.length / 2) {
      if (key === 'duration') habits.duration = Number(best[0]); else { habits.startClock = best[0]; habits.startNow = false }
    }
  }
  return { ...memory.lastForm, ...habits, ...memory.preferences, ...memory.context }
}

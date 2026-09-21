import { z } from 'zod'
import type { TaskInput } from './model'

export type WorkDefaults = Partial<TaskInput> & { startClock?: string | null }
export const conversationSchema = z.object({
  action: z.literal('CHAT'),
  reply: z.string().trim().min(1).max(2000),
  memory: z.object({
    scope: z.enum(['context', 'preferences']),
    title: z.string().trim().min(1).max(250).optional(),
    status: z.enum(['todo', 'in_progress', 'waiting', 'blocked', 'done', 'cancelled']).optional(),
    completionPercent: z.number().int().min(0).max(100).nullable().optional(),
    scheduleMode: z.enum(['duration', 'deadline']).optional(),
    groupName: z.string().trim().min(1).max(80).nullable().optional(),
    parentQuery: z.string().trim().min(1).max(250).nullable().optional(),
    duration: z.number().int().positive().max(525600).nullable().optional(),
    startClock: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
    startNow: z.boolean().optional(),
    startTime: z.string().datetime({ offset: true }).nullable().optional(),
    deadline: z.string().datetime({ offset: true }).nullable().optional(),
    priority: z.enum(['urgent', 'normal', 'low']).optional(),
    notes: z.string().max(5000).optional(),
    reset: z.boolean().optional(),
  }).strict().optional(),
}).strict()
export type Conversation = z.infer<typeof conversationSchema>
export type MemoryUpdate = { scope: 'context' | 'preferences'; values: WorkDefaults; notes?: string; reset?: boolean }

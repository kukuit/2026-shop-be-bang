import { z } from 'zod'
import { teachingPricingModes, teachingSessionStatuses, teachingStudentStatuses, weeklyScheduleInputSchema } from './teaching-model'

export const teachingChatIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,150}$/)

const studentFields = {
  name: z.string().trim().min(1).max(160).optional(),
  hourlyRate: z.number().int().min(0).max(100_000_000).nullable().optional(),
  pricingMode: z.enum(teachingPricingModes).nullable().optional(),
  sessionRate: z.number().int().min(0).max(100_000_000).nullable().optional(),
  status: z.enum(teachingStudentStatuses).optional(),
  note: z.string().trim().max(2000).nullable().optional(),
  weeklySchedules: z.array(weeklyScheduleInputSchema).max(50).optional(),
  scheduleEffectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}

const sessionFields = {
  title: z.string().trim().min(1).max(200).optional(),
  subject: z.string().trim().max(120).nullable().optional(),
  startAt: z.string().datetime({ offset: true }).optional(),
  scheduledDurationMinutes: z.number().int().min(1).max(1440).optional(),
  goals: z.array(z.object({ title: z.string().trim().min(1).max(200) }).strict()).max(50).optional(),
}

const targetSchema = z.object({
  studentName: z.string().trim().min(1).max(160).optional(),
  sessionQuery: z.string().trim().min(1).max(240).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict()

const sessionFiltersSchema = z.object({
  studentName: z.string().trim().min(1).max(160).optional(),
  status: z.enum(teachingSessionStatuses).optional(),
  needsReview: z.boolean().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  query: z.string().trim().max(200).optional(),
}).strict()

export const teachingChatIntentSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('CHAT'), reply: z.string().trim().min(1).max(1500) }).strict(),
  z.object({ action: z.literal('LIST_STUDENTS'), status: z.enum(teachingStudentStatuses).optional() }).strict(),
  z.object({ action: z.literal('GET_STUDENT'), target: targetSchema }).strict(),
  z.object({ action: z.literal('CREATE_STUDENT'), data: z.object({ ...studentFields, name: studentFields.name.unwrap() }).strict() }).strict(),
  z.object({ action: z.literal('UPDATE_STUDENT'), target: targetSchema, changes: z.object(studentFields).strict() }).strict(),
  z.object({ action: z.literal('LIST_SESSIONS'), filters: sessionFiltersSchema.optional() }).strict(),
  z.object({ action: z.literal('GET_SESSION'), target: targetSchema }).strict(),
  z.object({ action: z.literal('CREATE_SESSION'), data: z.object({ studentName: z.string().trim().min(1).max(160), ...sessionFields }).strict() }).strict(),
  z.object({ action: z.literal('UPDATE_SESSION'), target: targetSchema, changes: z.object({ studentName: z.string().trim().min(1).max(160).optional(), ...sessionFields }).strict() }).strict(),
  z.object({ action: z.literal('CANCEL_SESSION'), target: targetSchema, reason: z.string().trim().max(1000).nullable().optional() }).strict(),
  z.object({ action: z.literal('RESTORE_SESSION'), target: targetSchema }).strict(),
  z.object({ action: z.literal('COMPLETE_SESSION'), target: targetSchema, data: z.object({
    actualDurationMinutes: z.number().int().min(1).max(1440).optional(),
    progressPercent: z.number().int().min(0).max(100).optional(),
    evaluationNote: z.string().trim().min(1).max(5000).optional(),
    goals: z.array(z.object({ title: z.string().trim().min(1).max(200), isCompleted: z.boolean() }).strict()).max(50).optional(),
  }).strict() }).strict(),
  z.object({ action: z.literal('DASHBOARD') }).strict(),
  z.object({ action: z.literal('MONTH_OVERVIEW'), year: z.number().int().min(2000).max(9999).optional(), month: z.number().int().min(1).max(12).optional(), studentName: z.string().trim().min(1).max(160).optional() }).strict(),
  z.object({ action: z.literal('GET_SETTINGS') }).strict(),
  z.object({ action: z.literal('UPDATE_SETTINGS'), data: z.object({
    defaultPricingMode: z.enum(teachingPricingModes).optional(),
    defaultSessionRate: z.number().int().min(0).max(100_000_000).optional(),
    defaultHourlyRate: z.number().int().min(0).max(100_000_000).optional(),
    billingCycleCutoffDay: z.number().int().min(1).max(31).optional(),
  }).strict().refine(value => Object.keys(value).length > 0) }).strict(),
  z.object({ action: z.literal('REMEMBER'), note: z.string().trim().min(1).max(1000), defaultSubject: z.string().trim().max(120).optional(), defaultDurationMinutes: z.number().int().min(1).max(1440).optional() }).strict(),
  z.object({ action: z.literal('CLEAR_MEMORY') }).strict(),
])

export type TeachingChatIntent = z.infer<typeof teachingChatIntentSchema>
export type TeachingAssistantMemory = {
  note: string | null
  defaultSubject: string | null
  defaultDurationMinutes: number | null
  updatedAt: string | null
}
export type TeachingChatContext = {
  activeStudentId: string | null
  activeStudentName: string | null
  activeSessionId: string | null
  activeSessionSummary: string | null
  pendingDraft: { action: string; summary: string } | null
  updatedAt: number
}
export type TeachingChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sequence: number
  createdAt: string
  status: 'normal' | 'pending' | 'committing' | 'confirmed' | 'cancelled'
  result?: unknown
  proposal?: { action: string; data: Record<string, unknown>; summary: string } | null
}

export const newTeachingChatContext = (): TeachingChatContext => ({ activeStudentId: null, activeStudentName: null, activeSessionId: null, activeSessionSummary: null, pendingDraft: null, updatedAt: Date.now() })
export function readTeachingChatContext(value: unknown, now = Date.now()): TeachingChatContext {
  const schema = z.object({
    activeStudentId: z.string().nullable().default(null),
    activeStudentName: z.string().nullable().default(null),
    activeSessionId: z.string().nullable().default(null),
    activeSessionSummary: z.string().nullable().default(null),
    pendingDraft: z.object({ action: z.string(), summary: z.string() }).nullable().default(null),
    updatedAt: z.number().default(0),
  }).strict()
  const parsed = schema.safeParse(value)
  return parsed.success && parsed.data.updatedAt <= now && now - parsed.data.updatedAt < 2 * 60 * 60 * 1000 ? parsed.data : newTeachingChatContext()
}

export function readTeachingAssistantMemory(value: unknown): TeachingAssistantMemory {
  const schema = z.object({
    note: z.string().max(1000).nullable().default(null),
    defaultSubject: z.string().max(120).nullable().default(null),
    defaultDurationMinutes: z.number().int().min(1).max(1440).nullable().default(null),
    updatedAt: z.string().nullable().default(null),
  }).strict()
  const parsed = schema.safeParse(value)
  return parsed.success ? parsed.data : { note: null, defaultSubject: null, defaultDurationMinutes: null, updatedAt: null }
}

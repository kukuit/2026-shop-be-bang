import { z } from 'zod'

export const teachingStudentStatuses = ['ACTIVE', 'INACTIVE'] as const
export const teachingSessionStatuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED'] as const
export const teachingPricingModes = ['PER_SESSION', 'PER_HOUR'] as const
export const DEFAULT_PRICING_MODE = 'PER_SESSION' as const
export const DEFAULT_SESSION_RATE = 50_000
export const DEFAULT_HOURLY_RATE = 30_000
export const DEFAULT_BILLING_CYCLE_CUTOFF_DAY = 15
const pricingRateSchema = z.number().int().min(0).max(100_000_000)
export const weeklyScheduleInputSchema = z.object({
  seriesId: z.string().min(1).optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Giờ bắt đầu phải theo định dạng HH:mm.'),
  durationMinutes: z.number().int().min(1).max(1440),
}).strict()

const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}, 'Ngày hiệu lực không hợp lệ.')

export const studentOpeningBalanceSchema = z.object({
  periodStartDate: localDateSchema,
  amount: pricingRateSchema,
}).strict()

export const studentPaymentInputSchema = z.object({
  studentId: z.string().min(1),
  paymentId: z.string().min(1).max(160),
  amount: pricingRateSchema.refine(value => value > 0, 'Số tiền thanh toán phải lớn hơn 0.'),
}).strict()

export const studentInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1, 'Hãy nhập tên học viên.').max(160),
  hourlyRate: pricingRateSchema.nullable(),
  pricingMode: z.enum(teachingPricingModes).nullable().optional(),
  sessionRate: pricingRateSchema.nullable().optional(),
  status: z.enum(teachingStudentStatuses),
  note: z.string().trim().max(2000).nullable(),
  openingBalance: studentOpeningBalanceSchema.nullable().optional(),
  weeklySchedules: z.array(weeklyScheduleInputSchema).max(50).optional(),
  scheduleEffectiveFrom: localDateSchema.optional(),
}).strict()

export const teachingSettingsSchema = z.object({
  defaultPricingMode: z.enum(teachingPricingModes).optional(),
  defaultSessionRate: pricingRateSchema.optional(),
  defaultHourlyRate: pricingRateSchema.optional(),
  billingCycleCutoffDay: z.number().int().min(1).max(31).optional(),
}).strict().refine(value => Object.keys(value).length > 0, 'Hãy nhập ít nhất một cấu hình học phí.')

export const sessionGoalInputSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().trim().min(1, 'Mục tiêu không được để trống.').max(200),
}).strict()

export const sessionInputSchema = z.object({
  id: z.string().min(1).optional(),
  studentId: z.string().min(1),
  title: z.string().trim().min(1, 'Hãy nhập tên buổi học.').max(200),
  subject: z.string().trim().max(120).nullable(),
  startAt: z.string().datetime({ offset: true }),
  scheduledDurationMinutes: z.number().int().min(1).max(1440),
  // Kept for older clients; new writes resolve the price on the server.
  hourlyRateSnapshot: pricingRateSchema.optional(),
  pricingOverride: z.boolean().optional(),
  unitRateSnapshot: pricingRateSchema.optional(),
  goals: z.array(sessionGoalInputSchema).max(50),
}).strict().superRefine((value, context) => {
  if (value.pricingOverride && value.id && value.unitRateSnapshot === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['unitRateSnapshot'], message: 'Hãy nhập đơn giá riêng cho buổi học.' })
  }
})

export const completionInputSchema = z.object({
  sessionId: z.string().min(1),
  actualDurationMinutes: z.number().int().min(1).max(1440),
  // Kept for older clients; completion uses the saved session price snapshot.
  hourlyRateSnapshot: pricingRateSchema.optional(),
  pricingOverride: z.boolean().optional(),
  unitRateSnapshot: pricingRateSchema.optional(),
  progressPercent: z.number().int().min(0).max(100),
  evaluationNote: z.string().trim().min(1, 'Hãy nhập nhận xét buổi học.').max(5000),
  goals: z.array(z.object({ id: z.string().min(1), isCompleted: z.boolean() }).strict()).max(50),
}).strict().superRefine((value, context) => {
  if (value.pricingOverride && value.unitRateSnapshot === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['unitRateSnapshot'], message: 'Hãy nhập đơn giá riêng cho buổi học.' })
  }
})

export const attendanceConfirmationInputSchema = z.object({ sessionId: z.string().min(1) }).strict()

export const sessionListFiltersSchema = z.object({
  studentId: z.string().optional(),
  status: z.enum(teachingSessionStatuses).optional(),
  needsReview: z.enum(['true', 'false']).transform(value => value === 'true').optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  query: z.string().trim().max(200).optional(),
}).strict()

export const scheduleListInputSchema = z.object({ studentId: z.string().min(1), date: localDateSchema.optional() }).strict()

export type StudentStatus = typeof teachingStudentStatuses[number]
export type TeachingSessionStatus = typeof teachingSessionStatuses[number]
export type PricingMode = typeof teachingPricingModes[number]
export type ResolvedPricing = { mode: PricingMode; unitRate: number }
export type Student = {
  id: string
  userId: string
  name: string
  pricingMode: PricingMode | null
  sessionRate: number | null
  hourlyRate: number | null
  status: StudentStatus
  note: string | null
  openingBalance?: StudentOpeningBalance | null
  billingPayments?: StudentBillingPayment[]
  createdAt: string
  updatedAt: string
  weeklySchedules?: WeeklySchedule[]
}
export type StudentOpeningBalance = { periodStartDate: string; amount: number }
export type StudentBillingPayment = { id: string; periodStartDate: string; amount: number; paidAt: string }
export type WeeklySchedule = {
  id: string
  userId: string
  studentId: string
  seriesId: string
  dayOfWeek: number
  startTime: string
  durationMinutes: number
  effectiveFrom: string
  effectiveTo: string | null
  createdAt: string
  updatedAt: string
}
export type TeachingSettings = {
  id: string
  userId: string
  defaultPricingMode: PricingMode
  defaultSessionRate: number
  defaultHourlyRate: number
  billingCycleCutoffDay: number
  createdAt: string
  updatedAt: string
}
export type TeachingBillingPeriod = {
  cutoffDay: number
  startDate: string
  endDate: string
}
export type TeachingStudentBillingRow = {
  studentId: string
  completedSessions: number
  actualDurationMinutes: number
  perSessionCompletedSessions: number
  perHourDurationMinutes: number
  billingModes: PricingMode[]
  feeAmount: number
  openingBalanceAmount: number
  paidAmount: number
  amountDue: number
  remainingAmount: number
  overdueUnconfirmedSessions: number
  overdueUnconfirmedItems: { sessionId: string; occurrenceDate: string; startAt: string; title: string; scheduledDurationMinutes: number }[]
}
export type SessionGoal = { id: string; sessionId: string; title: string; isCompleted: boolean; note: string | null; sortOrder: number; createdAt: string; updatedAt: string }
export type TeachingSession = {
  id: string
  userId: string
  studentId: string
  title: string
  subject: string | null
  startAt: string
  scheduledDurationMinutes: number
  actualDurationMinutes: number | null
  status: TeachingSessionStatus
  progressPercent: number | null
  evaluationNote: string | null
  cancellationReason?: string | null
  pricingModeSnapshot: PricingMode
  unitRateSnapshot: number | null
  pricingOverride: boolean
  /** Legacy snapshot retained for Firestore migration and older records. */
  hourlyRateSnapshot?: number
  feeAmount: number | null
  completedAt: string | null
  source: 'RECURRING' | 'MANUAL'
  weeklyScheduleId: string | null
  occurrenceDate: string | null
  seriesId: string | null
  isOverride: boolean
  lifecycleStatus: 'ACTIVE' | 'SUPERSEDED'
  createdAt: string
  updatedAt: string
}
export type TeachingSessionView = TeachingSession & {
  studentName: string
  studentStatus: StudentStatus | null
  goals: SessionGoal[]
  goalsLoaded?: boolean
  goalCompletionRate: number | null
}

export function calculateTeachingFee(actualDurationMinutes: number, hourlyRateSnapshot: number) {
  return calculateSessionFee('PER_HOUR', hourlyRateSnapshot, actualDurationMinutes)
}

export function resolveStudentPricing(student: Student, settings: TeachingSettings): ResolvedPricing {
  const mode = student.pricingMode ?? settings.defaultPricingMode
  const unitRate = mode === 'PER_SESSION'
    ? student.sessionRate ?? settings.defaultSessionRate
    : student.hourlyRate ?? settings.defaultHourlyRate
  return { mode, unitRate }
}

export function calculateSessionFee(mode: PricingMode, unitRate: number, actualDurationMinutes: number) {
  if (mode === 'PER_SESSION') return unitRate
  return Math.round((unitRate * actualDurationMinutes) / 60)
}

export function pricingUnitLabel(mode: PricingMode) {
  return mode === 'PER_SESSION' ? 'đ/buổi' : 'đ/giờ'
}

const vietnamOffsetMs = 7 * 60 * 60 * 1000
export function toVietnamDateTimeLocal(iso: string) {
  return new Date(Date.parse(iso) + vietnamOffsetMs).toISOString().slice(0, 16)
}
export function fromVietnamDateTimeLocal(value: string) {
  return new Date(value + ':00+07:00').toISOString()
}
export function vietnamMonthRange(year: number, monthIndex: number) {
  const from = new Date(Date.UTC(year, monthIndex, 1, -7)).toISOString()
  const to = new Date(Date.UTC(year, monthIndex + 1, 1, -7)).toISOString()
  return { from, to }
}
export function vietnamMonthKey(iso: string) {
  return new Date(Date.parse(iso) + vietnamOffsetMs).toISOString().slice(0, 7)
}
export function vietnamTodayKey(now = new Date()) {
  return new Date(now.getTime() + vietnamOffsetMs).toISOString().slice(0, 10)
}
export function vietnamBillingPeriod(cutoffDay: number, now = new Date()): TeachingBillingPeriod {
  const safeCutoffDay = Math.max(1, Math.min(31, Math.trunc(cutoffDay)))
  const today = vietnamTodayKey(now)
  const [year, month, day] = today.split('-').map(Number)
  const currentMonthCutoff = new Date(Date.UTC(year, month, 0, 12)).getUTCDate()
  const endMonth = new Date(Date.UTC(year, month - 1 + (day > Math.min(safeCutoffDay, currentMonthCutoff) ? 1 : 0), 1, 12))
  const monthCutoffDate = (date: Date) => {
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12)).getUTCDate()
    const cutoff = Math.min(safeCutoffDay, lastDay)
    return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(cutoff).padStart(2, '0')}`
  }
  const previousMonth = new Date(Date.UTC(endMonth.getUTCFullYear(), endMonth.getUTCMonth() - 1, 1, 12))
  return {
    cutoffDay: safeCutoffDay,
    startDate: shiftVietnamDate(monthCutoffDate(previousMonth), 1),
    endDate: monthCutoffDate(endMonth),
  }
}
export function shiftVietnamDate(date: string, amount: number) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + amount, 12)).toISOString().slice(0, 10)
}
export function vietnamBillingPeriodForDate(cutoffDay: number, date: string) {
  return vietnamBillingPeriod(cutoffDay, new Date(`${date}T12:00:00+07:00`))
}
export function studentBillingAnchor(student: Student, cutoffDay: number, now = new Date()): StudentOpeningBalance {
  if (student.openingBalance) return student.openingBalance
  const createdAt = Date.parse(student.createdAt || '')
  const anchorDate = Number.isFinite(createdAt) ? vietnamTodayKey(new Date(createdAt)) : vietnamTodayKey(now)
  return { periodStartDate: vietnamBillingPeriodForDate(cutoffDay, anchorDate).startDate, amount: 0 }
}
export function carryStudentBalanceToPeriod(
  student: Student,
  cutoffDay: number,
  targetPeriod: TeachingBillingPeriod,
  feeByPeriod: Map<string, number>,
): number {
  const anchor = studentBillingAnchor(student, cutoffDay)
  let balance = anchor.amount
  let periodStart = anchor.periodStartDate
  if (periodStart > targetPeriod.startDate) return 0
  const paymentsByPeriod = new Map<string, number>()
  for (const payment of student.billingPayments || []) paymentsByPeriod.set(payment.periodStartDate, (paymentsByPeriod.get(payment.periodStartDate) || 0) + payment.amount)
  while (periodStart < targetPeriod.startDate) {
    balance += feeByPeriod.get(periodStart) || 0
    balance -= paymentsByPeriod.get(periodStart) || 0
    const period = vietnamBillingPeriodForDate(cutoffDay, periodStart)
    periodStart = shiftVietnamDate(period.endDate, 1)
  }
  return balance
}
export function vietnamDayOfWeek(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()
}
export function vietnamWeekStart(date: string) {
  const day = vietnamDayOfWeek(date)
  return shiftVietnamDate(date, -((day + 6) % 7))
}
export function vietnamDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00+07:00`).toISOString()
}
export function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value) + '₫'
}
export function goalCompletionRate(goals: Pick<SessionGoal, 'isCompleted'>[]) {
  return goals.length ? Math.round(goals.filter(goal => goal.isCompleted).length / goals.length * 100) : null
}

import {
  calculateSessionFee, DEFAULT_BILLING_CYCLE_CUTOFF_DAY, DEFAULT_HOURLY_RATE, DEFAULT_PRICING_MODE, DEFAULT_SESSION_RATE,
  goalCompletionRate, resolveStudentPricing, shiftVietnamDate, toVietnamDateTimeLocal, vietnamBillingPeriod,
  vietnamDateTime, vietnamDayOfWeek, vietnamMonthRange, vietnamTodayKey,
  type PricingMode, type SessionGoal, type Student, type TeachingBillingPeriod, type TeachingSession,
  type TeachingSessionView, type TeachingSettings, type TeachingStudentBillingRow, type WeeklySchedule,
} from '../../_lib/teaching-model'
import {
  attendanceConfirmationInputSchema, completionInputSchema, scheduleListInputSchema,
  sessionInputSchema, sessionListFiltersSchema, studentInputSchema, teachingSettingsSchema,
} from '../../_lib/teaching-model'
import { openTeachingDatabase, requestResult, transactionDone, workspaceKeyRange, type LocalStoreName } from './database'

type Scoped<T> = T & { workspaceId: string; deletedAt?: number | null }
type StoredStudent = Scoped<Student>
type StoredSchedule = Scoped<WeeklySchedule> & { isSuperseded?: boolean }
type StoredLesson = Scoped<TeachingSession> & { goals: SessionGoal[] }
type StoredSettings = Scoped<TeachingSettings>
type ScheduleInput = { seriesId?: string; dayOfWeek: number; startTime: string; durationMinutes: number }
type StudentInput = {
  id?: string; name: string; hourlyRate: number | null; pricingMode?: PricingMode | null; sessionRate?: number | null
  status: 'ACTIVE' | 'INACTIVE'; note: string | null; weeklySchedules?: ScheduleInput[]; scheduleEffectiveFrom?: string
}
type SessionInput = {
  id?: string; studentId: string; title: string; subject: string | null; startAt: string; scheduledDurationMinutes: number
  hourlyRateSnapshot?: number; pricingOverride?: boolean; unitRateSnapshot?: number; goals: { id?: string; title: string }[]
}
type MaterializedRange = { from: string; to: string }
type MaterializedResult = { students: Student[]; settings: TeachingSettings; materializedRanges: MaterializedRange[]; sessions: StoredLesson[]; sessionsFrom: string; sessionsTo: string }

const byWorkspace = <T>(store: IDBObjectStore, workspaceId: string) => requestResult(store.index('by-workspace').getAll(workspaceKeyRange(workspaceId))) as Promise<T[]>
const compoundKey = (workspaceId: string, id: string) => [workspaceId, id]
const nowIso = () => new Date().toISOString()
const newId = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
function recordSyncOperation(tx: IDBTransaction, workspaceId: string, entityType: string, entityId: string, operation: 'CREATE' | 'UPDATE' | 'DELETE') {
  tx.objectStore('syncOperations').add({ id: newId(), workspaceId, entityType, entityId, operation, createdAt: Date.now(), status: 'PENDING', attemptCount: 0 })
}
const defaultSettings = (workspaceId: string): TeachingSettings => ({ id: 'default', userId: workspaceId, defaultPricingMode: DEFAULT_PRICING_MODE, defaultSessionRate: DEFAULT_SESSION_RATE, defaultHourlyRate: DEFAULT_HOURLY_RATE, billingCycleCutoffDay: DEFAULT_BILLING_CYCLE_CUTOFF_DAY, createdAt: nowIso(), updatedAt: nowIso() })
const normalizeStudent = (student: Partial<Student> & { id: string; userId?: string }, workspaceId: string): Student => ({
  id: student.id, userId: workspaceId, name: student.name || 'Học viên', pricingMode: student.pricingMode ?? null,
  sessionRate: student.sessionRate ?? null, hourlyRate: student.hourlyRate ?? null, status: student.status || 'ACTIVE',
  note: student.note ?? null, createdAt: student.createdAt || nowIso(), updatedAt: student.updatedAt || nowIso(),
})

async function transaction<T>(stores: LocalStoreName[], mode: IDBTransactionMode, work: (tx: IDBTransaction) => Promise<T>): Promise<T> {
  const db = await openTeachingDatabase()
  const tx = db.transaction(stores, mode)
  const done = transactionDone(tx)
  try {
    const result = await work(tx)
    await done
    return result
  } catch (error) {
    try { tx.abort() } catch { /* The browser may already have aborted the transaction. */ }
    await done.catch(() => undefined)
    throw error
  }
}

function studentView(student: StoredStudent, schedules: StoredSchedule[], date = vietnamTodayKey()): Student {
  return {
    ...student,
    weeklySchedules: schedules.filter(schedule => schedule.studentId === student.id && schedule.isSuperseded !== true && schedule.effectiveFrom <= date && (!schedule.effectiveTo || schedule.effectiveTo >= date))
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)),
  }
}

function scheduleIsActive(schedule: StoredSchedule, date: string) {
  return schedule.isSuperseded !== true && schedule.effectiveFrom <= date && (!schedule.effectiveTo || schedule.effectiveTo >= date)
}

function scheduleConflicts(schedules: ScheduleInput[]) {
  const intervals = schedules.map(item => {
    const [hour, minute] = item.startTime.split(':').map(Number)
    const start = item.dayOfWeek * 1440 + hour * 60 + minute
    return { item, start, end: start + item.durationMinutes }
  })
  const conflicts: { first: ScheduleInput; second: ScheduleInput }[] = []
  for (let left = 0; left < intervals.length; left++) for (let right = left + 1; right < intervals.length; right++) {
    const a = intervals[left], b = intervals[right]
    if ([-10080, 0, 10080].some(offset => a.start < b.end + offset && a.end > b.start + offset)) conflicts.push({ first: a.item, second: b.item })
  }
  return conflicts
}

function serializeScheduleInput(input: ScheduleInput, workspaceId: string, studentId: string, effectiveFrom: string, current?: StoredSchedule): StoredSchedule {
  const now = nowIso()
  const seriesId = input.seriesId || newId()
  return {
    id: current?.id || newId(), workspaceId, userId: workspaceId, studentId, seriesId,
    dayOfWeek: input.dayOfWeek, startTime: input.startTime, durationMinutes: input.durationMinutes,
    effectiveFrom, effectiveTo: null, createdAt: current?.createdAt || now, updatedAt: now, isSuperseded: false,
  }
}

function signature(schedules: { seriesId: string; dayOfWeek: number; startTime: string; durationMinutes: number }[]) {
  return JSON.stringify(schedules.map(({ seriesId, dayOfWeek, startTime, durationMinutes }) => ({ seriesId, dayOfWeek, startTime, durationMinutes })).sort((a, b) => a.seriesId.localeCompare(b.seriesId)))
}

function viewOf(session: StoredLesson, student?: StoredStudent | Student | null, includeGoals = true): TeachingSessionView {
  const goals = includeGoals ? [...(session.goals || [])].sort((a, b) => a.sortOrder - b.sortOrder) : []
  return { ...session, studentName: student?.name || 'Học viên đã lưu trữ', studentStatus: student?.status || null, goals, goalsLoaded: includeGoals, goalCompletionRate: includeGoals ? goalCompletionRate(goals) : null }
}

function rangesForDates(dates: string[]): MaterializedRange[] {
  const sorted = Array.from(new Set(dates)).sort()
  if (!sorted.length) return []
  const output: MaterializedRange[] = []
  let first = sorted[0], previous = sorted[0]
  for (const date of sorted.slice(1)) {
    if (date !== shiftVietnamDate(previous, 1)) { output.push({ from: first, to: shiftVietnamDate(previous, 1) }); first = date }
    previous = date
  }
  output.push({ from: first, to: shiftVietnamDate(previous, 1) })
  return output
}

function recurringId(studentId: string, seriesId: string, date: string) {
  return `rec_${encodeURIComponent(studentId)}_${encodeURIComponent(seriesId)}_${date}`
}

function materializeRange(from?: string, to?: string) {
  const today = vietnamTodayKey()
  const included = new Set<string>()
  const rollingEnd = shiftVietnamDate(today, 30)
  for (let date = today; date < rollingEnd; date = shiftVietnamDate(date, 1)) included.add(date)
  const requestedStart = from ? toVietnamDateTimeLocal(from).slice(0, 10) : today
  const requestedEnd = to ? toVietnamDateTimeLocal(to).slice(0, 10) : shiftVietnamDate(requestedStart, 62)
  let date = requestedStart < today ? today : requestedStart
  let count = 0
  while (date < requestedEnd && count < 366) { included.add(date); date = shiftVietnamDate(date, 1); count++ }
  return { today, rollingEnd, dates: Array.from(included).sort(), through: requestedEnd > rollingEnd ? requestedEnd : rollingEnd }
}

export async function localGetSettings(workspaceId: string): Promise<TeachingSettings> {
  return transaction(['settings'], 'readwrite', async tx => {
    const store = tx.objectStore('settings')
    const current = await requestResult(store.get(compoundKey(workspaceId, 'default'))) as StoredSettings | undefined
    if (current) return current
    const value = { ...defaultSettings(workspaceId), workspaceId }
    store.put(value)
    return value
  })
}

export async function localListStudents(workspaceId: string): Promise<Student[]> {
  return transaction(['students', 'weeklySchedules'], 'readonly', async tx => {
    const [students, schedules] = await Promise.all([
      byWorkspace<StoredStudent>(tx.objectStore('students'), workspaceId),
      byWorkspace<StoredSchedule>(tx.objectStore('weeklySchedules'), workspaceId),
    ])
    return students.filter(student => !student.deletedAt).map(student => studentView(student, schedules)).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  })
}

export async function localListWeeklySchedules(workspaceId: string, studentId: string, date = vietnamTodayKey()): Promise<WeeklySchedule[]> {
  return transaction(['weeklySchedules'], 'readonly', async tx => {
    const schedules = await byWorkspace<StoredSchedule>(tx.objectStore('weeklySchedules'), workspaceId)
    return schedules.filter(schedule => schedule.studentId === studentId && scheduleIsActive(schedule, date)).sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
  })
}

async function syncFuturePricing(workspaceId: string, studentId?: string) {
  const now = Date.now()
  await transaction(['students', 'lessons', 'settings', 'syncOperations'], 'readwrite', async tx => {
    const [students, lessons] = await Promise.all([
      byWorkspace<StoredStudent>(tx.objectStore('students'), workspaceId),
      byWorkspace<StoredLesson>(tx.objectStore('lessons'), workspaceId),
    ])
    const settings = await requestResult(tx.objectStore('settings').get(compoundKey(workspaceId, 'default'))) as StoredSettings | undefined || { ...defaultSettings(workspaceId), workspaceId }
    const studentById = new Map(students.map(student => [student.id, student]))
    for (const session of lessons) {
      if ((studentId && session.studentId !== studentId) || session.status !== 'SCHEDULED' || session.lifecycleStatus === 'SUPERSEDED' || session.pricingOverride || Date.parse(session.startAt) <= now) continue
      const student = studentById.get(session.studentId)
      if (!student) continue
      const pricing = resolveStudentPricing(student, settings)
      if (session.pricingModeSnapshot === pricing.mode && session.unitRateSnapshot === pricing.unitRate && session.pricingOverride === false) continue
      tx.objectStore('lessons').put({ ...session, pricingModeSnapshot: pricing.mode, unitRateSnapshot: pricing.unitRate, pricingOverride: false, ...(pricing.mode === 'PER_HOUR' ? { hourlyRateSnapshot: pricing.unitRate } : {}), feeAmount: null, updatedAt: nowIso() })
      recordSyncOperation(tx, workspaceId, 'lesson', session.id, 'UPDATE')
    }
  })
}

export async function localSaveSettings(workspaceId: string, input: Partial<Pick<TeachingSettings, 'defaultPricingMode' | 'defaultSessionRate' | 'defaultHourlyRate' | 'billingCycleCutoffDay'>>) {
  const changes = teachingSettingsSchema.parse(input)
  const result = await transaction(['settings', 'syncOperations'], 'readwrite', async tx => {
    const store = tx.objectStore('settings')
    const old = await requestResult(store.get(compoundKey(workspaceId, 'default'))) as StoredSettings | undefined || { ...defaultSettings(workspaceId), workspaceId }
    const updated = { ...old, ...changes, id: 'default', userId: workspaceId, workspaceId, updatedAt: nowIso() }
    store.put(updated)
    recordSyncOperation(tx, workspaceId, 'settings', 'default', 'UPDATE')
    return { updated, pricingChanged: old.defaultPricingMode !== updated.defaultPricingMode || old.defaultSessionRate !== updated.defaultSessionRate || old.defaultHourlyRate !== updated.defaultHourlyRate }
  })
  if (result.pricingChanged) await syncFuturePricing(workspaceId)
  return result.updated
}

export async function localSaveStudent(workspaceId: string, rawInput: StudentInput, allowScheduleOverlap = false) {
  const input = studentInputSchema.parse(rawInput) as StudentInput
  if (input.weeklySchedules && !allowScheduleOverlap && scheduleConflicts(input.weeklySchedules).length) throw new LocalTeachingError('Lịch tuần của học viên có khung giờ bị trùng.', [], scheduleConflicts(input.weeklySchedules))
  const today = vietnamTodayKey()
  const effectiveFrom = input.weeklySchedules !== undefined ? input.scheduleEffectiveFrom || today : undefined
  if (effectiveFrom && effectiveFrom < today) throw new Error('Ngày hiệu lực phải là hôm nay hoặc một ngày trong tương lai.')
  const suppliedSeriesIds = (input.weeklySchedules || []).flatMap(item => item.seriesId ? [item.seriesId] : [])
  if (new Set(suppliedSeriesIds).size !== suppliedSeriesIds.length) throw new Error('Một lịch tuần bị lặp trong danh sách.')
  const id = input.id || newId()
  const result = await transaction(['students', 'weeklySchedules', 'syncOperations'], 'readwrite', async tx => {
    const studentStore = tx.objectStore('students')
    const scheduleStore = tx.objectStore('weeklySchedules')
    const [stored, allSchedules] = await Promise.all([
      requestResult(studentStore.get(compoundKey(workspaceId, id))) as Promise<StoredStudent | undefined>,
      byWorkspace<StoredSchedule>(scheduleStore, workspaceId),
    ])
    if (input.id && !stored) throw new Error('Không tìm thấy học viên này.')
    const oldStudent = stored ? normalizeStudent(stored, workspaceId) : null
    const nextStudent = normalizeStudent({
      id, userId: workspaceId, name: input.name,
      pricingMode: input.pricingMode === undefined ? oldStudent?.pricingMode ?? null : input.pricingMode,
      sessionRate: input.sessionRate === undefined ? oldStudent?.sessionRate ?? null : input.sessionRate,
      hourlyRate: input.hourlyRate === undefined ? oldStudent?.hourlyRate ?? null : input.hourlyRate,
      status: input.status, note: input.note, createdAt: stored?.createdAt || nowIso(), updatedAt: nowIso(),
    }, workspaceId)
    const pricingChanged = !oldStudent || oldStudent.pricingMode !== nextStudent.pricingMode || oldStudent.sessionRate !== nextStudent.sessionRate || oldStudent.hourlyRate !== nextStudent.hourlyRate
    const statusChanged = !oldStudent || oldStudent.status !== nextStudent.status
    studentStore.put({ ...nextStudent, workspaceId, deletedAt: null } satisfies StoredStudent)
    recordSyncOperation(tx, workspaceId, 'student', id, stored ? 'UPDATE' : 'CREATE')
    let schedulesChanged = false
    if (input.weeklySchedules !== undefined && effectiveFrom) {
      const records = allSchedules.filter(schedule => schedule.studentId === id)
      const active = records.filter(schedule => scheduleIsActive(schedule, effectiveFrom))
      const next = input.weeklySchedules.map(item => ({ ...item, seriesId: item.seriesId || newId() }))
      if (signature(active) !== signature(next)) {
        schedulesChanged = true
        const reused = new Set<string>()
        for (const current of records) {
          if (current.isSuperseded || (current.effectiveTo && current.effectiveTo < effectiveFrom)) continue
          const desired = next.find(item => item.seriesId === current.seriesId)
          if (current.effectiveFrom === effectiveFrom && desired) {
            const updatedSchedule = serializeScheduleInput(desired, workspaceId, id, effectiveFrom, current)
            scheduleStore.put(updatedSchedule)
            recordSyncOperation(tx, workspaceId, 'weeklySchedule', updatedSchedule.id, 'UPDATE')
            reused.add(current.seriesId)
          } else if (current.effectiveFrom >= effectiveFrom) {
            scheduleStore.put({ ...current, isSuperseded: true, updatedAt: nowIso() })
            recordSyncOperation(tx, workspaceId, 'weeklySchedule', current.id, 'UPDATE')
          } else {
            scheduleStore.put({ ...current, effectiveTo: shiftVietnamDate(effectiveFrom, -1), updatedAt: nowIso() })
            recordSyncOperation(tx, workspaceId, 'weeklySchedule', current.id, 'UPDATE')
          }
        }
        for (const schedule of next) if (!reused.has(schedule.seriesId)) {
          const createdSchedule = serializeScheduleInput(schedule, workspaceId, id, effectiveFrom)
          scheduleStore.put(createdSchedule)
          recordSyncOperation(tx, workspaceId, 'weeklySchedule', createdSchedule.id, 'CREATE')
        }
      }
    }
    return { student: nextStudent, pricingChanged, statusChanged, schedulesChanged }
  })
  if (result.schedulesChanged || (input.id && result.statusChanged)) await localMaterializeRecurringSessions(workspaceId)
  if (input.id && result.pricingChanged) await syncFuturePricing(workspaceId, id)
  const schedules = await localListWeeklySchedules(workspaceId, id)
  return { ...result.student, weeklySchedules: schedules }
}

export class LocalTeachingError extends Error {
  conflicts?: { id: string; title: string; startAt: string; scheduledDurationMinutes: number }[]
  scheduleConflicts?: { first: ScheduleInput; second: ScheduleInput }[]
  constructor(message: string, conflicts?: LocalTeachingError['conflicts'], scheduleConflicts?: LocalTeachingError['scheduleConflicts']) {
    super(message); this.name = 'LocalTeachingError'; this.conflicts = conflicts; this.scheduleConflicts = scheduleConflicts
  }
}

export async function localMaterializeRecurringSessions(workspaceId: string, from?: string, to?: string): Promise<MaterializedResult> {
  const range = materializeRange(from, to)
  const sessionFrom = vietnamDateTime(range.today, '00:00')
  const sessionTo = vietnamDateTime(range.through, '00:00')
  return transaction(['students', 'weeklySchedules', 'settings', 'lessons', 'syncOperations'], 'readwrite', async tx => {
    const [rawStudents, schedules, storedSettings, lessons] = await Promise.all([
      byWorkspace<StoredStudent>(tx.objectStore('students'), workspaceId),
      byWorkspace<StoredSchedule>(tx.objectStore('weeklySchedules'), workspaceId),
      requestResult(tx.objectStore('settings').get(compoundKey(workspaceId, 'default'))) as Promise<StoredSettings | undefined>,
      byWorkspace<StoredLesson>(tx.objectStore('lessons'), workspaceId),
    ])
    const settings = storedSettings || { ...defaultSettings(workspaceId), workspaceId }
    if (!storedSettings) tx.objectStore('settings').put(settings)
    const activeStudents = rawStudents.filter(student => !student.deletedAt && student.status === 'ACTIVE')
    const activeStudentById = new Map(activeStudents.map(student => [student.id, student]))
    const schedulesByStudent = new Map<string, StoredSchedule[]>()
    for (const schedule of schedules) {
      const list = schedulesByStudent.get(schedule.studentId) || []
      list.push(schedule); schedulesByStudent.set(schedule.studentId, list)
    }
    const existingById = new Map(lessons.map(session => [session.id, session]))
    const included = new Set(range.dates)
    const candidates: { student: StoredStudent; schedule: StoredSchedule; date: string }[] = []
    for (const student of activeStudents) for (const date of range.dates) for (const schedule of schedulesByStudent.get(student.id) || []) {
      if (schedule.dayOfWeek === vietnamDayOfWeek(date) && scheduleIsActive(schedule, date)) candidates.push({ student, schedule, date })
    }

    for (const candidate of candidates) {
      const id = recurringId(candidate.student.id, candidate.schedule.seriesId, candidate.date)
      const old = existingById.get(id)
      if (old && (old.status !== 'SCHEDULED' || old.isOverride || old.source !== 'RECURRING')) continue
      const pricing = resolveStudentPricing(candidate.student, settings)
      const oldMode = old?.pricingModeSnapshot ?? (old?.hourlyRateSnapshot != null ? 'PER_HOUR' : pricing.mode)
      const oldRate = old?.unitRateSnapshot ?? old?.hourlyRateSnapshot ?? null
      const override = old?.pricingOverride === true
      const mode = override ? oldMode : pricing.mode
      const rate = override && oldRate != null ? oldRate : pricing.unitRate
      const startAt = vietnamDateTime(candidate.date, candidate.schedule.startTime)
      if (old && old.startAt === startAt && old.scheduledDurationMinutes === candidate.schedule.durationMinutes && old.weeklyScheduleId === candidate.schedule.id && old.occurrenceDate === candidate.date && old.seriesId === candidate.schedule.seriesId && old.lifecycleStatus === 'ACTIVE' && old.pricingModeSnapshot === mode && old.unitRateSnapshot === rate && old.pricingOverride === override) continue
      const updated: StoredLesson = {
        ...(old || {} as StoredLesson), workspaceId, id, userId: workspaceId, studentId: candidate.student.id,
        title: old?.title || 'Buổi học định kỳ', subject: old?.subject ?? null, startAt,
        scheduledDurationMinutes: candidate.schedule.durationMinutes, actualDurationMinutes: old?.actualDurationMinutes ?? null,
        status: old?.status ?? 'SCHEDULED', progressPercent: old?.progressPercent ?? null, evaluationNote: old?.evaluationNote ?? null,
        cancellationReason: old?.cancellationReason ?? null, pricingModeSnapshot: mode, unitRateSnapshot: rate,
        pricingOverride: override, ...(mode === 'PER_HOUR' ? { hourlyRateSnapshot: rate } : old?.hourlyRateSnapshot != null ? { hourlyRateSnapshot: old.hourlyRateSnapshot } : {}),
        feeAmount: null, completedAt: old?.completedAt ?? null, source: 'RECURRING', weeklyScheduleId: candidate.schedule.id,
        occurrenceDate: candidate.date, seriesId: candidate.schedule.seriesId, isOverride: false, lifecycleStatus: 'ACTIVE',
        createdAt: old?.createdAt || nowIso(), updatedAt: nowIso(), goals: old?.goals || [],
      }
      tx.objectStore('lessons').put(updated)
      recordSyncOperation(tx, workspaceId, 'lesson', updated.id, old ? 'UPDATE' : 'CREATE')
      existingById.set(id, updated)
    }

    for (const session of lessons) {
      const date = session.occurrenceDate || toVietnamDateTimeLocal(session.startAt).slice(0, 10)
      if (!included.has(date) || session.status !== 'SCHEDULED' || session.isOverride || session.source !== 'RECURRING' || session.lifecycleStatus === 'SUPERSEDED') continue
      const student = activeStudentById.get(session.studentId)
      const stillScheduled = !!student && (schedulesByStudent.get(session.studentId) || []).some(schedule => schedule.seriesId === session.seriesId && scheduleIsActive(schedule, date) && schedule.dayOfWeek === vietnamDayOfWeek(date))
      if (!stillScheduled) {
        const updated = { ...session, lifecycleStatus: 'SUPERSEDED' as const, feeAmount: null, updatedAt: nowIso() }
        tx.objectStore('lessons').put(updated)
        recordSyncOperation(tx, workspaceId, 'lesson', updated.id, 'UPDATE')
        existingById.set(session.id, updated)
      }
    }

    const listedStudents = rawStudents.filter(student => !student.deletedAt).map(student => studentView(student, schedules, range.today)).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    const updatedLessons = Array.from(existingById.values())
    return {
      students: listedStudents, settings, materializedRanges: rangesForDates(range.dates),
      sessions: updatedLessons.filter(session => Date.parse(session.startAt) >= Date.parse(sessionFrom) && Date.parse(session.startAt) < Date.parse(sessionTo)),
      sessionsFrom: sessionFrom, sessionsTo: sessionTo,
    }
  })
}

export async function localGetSession(workspaceId: string, id: string): Promise<TeachingSessionView> {
  return transaction(['lessons', 'students'], 'readonly', async tx => {
    const [session, students] = await Promise.all([
      requestResult(tx.objectStore('lessons').get(compoundKey(workspaceId, id))) as Promise<StoredLesson | undefined>,
      byWorkspace<StoredStudent>(tx.objectStore('students'), workspaceId),
    ])
    if (!session) throw new Error('Không tìm thấy buổi học này.')
    return viewOf(session, students.find(student => student.id === session.studentId) || null, true)
  })
}

export async function localListSessions(workspaceId: string, rawFilters: Record<string, string | undefined> = {}, includeGoals = false): Promise<TeachingSessionView[]> {
  const filters = sessionListFiltersSchema.parse(Object.fromEntries(Object.entries(rawFilters).filter(([, value]) => value !== undefined)))
  const now = Date.now()
  const reviewWindowStart = now - 24 * 60 * 60_000
  const defaultFrom = now - 100 * 24 * 60 * 60_000
  const defaultTo = now + 180 * 24 * 60 * 60_000
  const from = filters.needsReview ? Math.max(filters.from ? Date.parse(filters.from) : 0, reviewWindowStart) : filters.from ? Date.parse(filters.from) : defaultFrom
  const to = filters.to ? Date.parse(filters.to) : filters.needsReview ? now : defaultTo
  const query = (filters.query || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi')
  return transaction(['lessons', 'students'], 'readonly', async tx => {
    const [lessons, students] = await Promise.all([
      byWorkspace<StoredLesson>(tx.objectStore('lessons'), workspaceId),
      byWorkspace<StoredStudent>(tx.objectStore('students'), workspaceId),
    ])
    const studentById = new Map(students.map(student => [student.id, student]))
    return lessons.filter(session => {
      const start = Date.parse(session.startAt)
      if (session.deletedAt || session.lifecycleStatus === 'SUPERSEDED' || start < from || start >= to) return false
      if (filters.studentId && session.studentId !== filters.studentId) return false
      if (filters.status && session.status !== filters.status) return false
      if (filters.needsReview && (session.status !== 'SCHEDULED' || start + session.scheduledDurationMinutes * 60_000 >= now)) return false
      if (query) {
        const studentName = studentById.get(session.studentId)?.name || ''
        const searchable = `${session.title} ${session.subject || ''} ${studentName}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi')
        if (!searchable.includes(query)) return false
      }
      return true
    }).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)).map(session => viewOf(session, studentById.get(session.studentId), includeGoals))
  })
}

export async function localSaveSession(workspaceId: string, rawInput: SessionInput, allowOverlap = false): Promise<TeachingSessionView> {
  const input = sessionInputSchema.parse(rawInput) as SessionInput
  const id = input.id || newId()
  const saved = await transaction(['students', 'settings', 'lessons', 'syncOperations'], 'readwrite', async tx => {
    const [old, student, settings, sessions] = await Promise.all([
      requestResult(tx.objectStore('lessons').get(compoundKey(workspaceId, id))) as Promise<StoredLesson | undefined>,
      requestResult(tx.objectStore('students').get(compoundKey(workspaceId, input.studentId))) as Promise<StoredStudent | undefined>,
      requestResult(tx.objectStore('settings').get(compoundKey(workspaceId, 'default'))) as Promise<StoredSettings | undefined>,
      byWorkspace<StoredLesson>(tx.objectStore('lessons'), workspaceId),
    ])
    if (input.id && !old) throw new Error('Không tìm thấy buổi học này.')
    if (old && old.status !== 'SCHEDULED') throw new Error('Chỉ có thể sửa thông tin buổi học đang lên lịch.')
    if (!student || student.deletedAt) throw new Error('Không tìm thấy học viên này.')
    if (student.status !== 'ACTIVE' && student.id !== old?.studentId) throw new Error('Chỉ chọn học viên đang hoạt động cho buổi học mới.')
    const start = Date.parse(input.startAt), end = start + input.scheduledDurationMinutes * 60_000
    const conflicts = sessions.filter(other => {
      if (other.id === id || other.studentId !== input.studentId || other.status !== 'SCHEDULED' || other.lifecycleStatus === 'SUPERSEDED' || other.deletedAt) return false
      const otherStart = Date.parse(other.startAt), otherEnd = otherStart + other.scheduledDurationMinutes * 60_000
      return start < otherEnd && end > otherStart
    }).map(session => ({ id: session.id, title: session.title, startAt: session.startAt, scheduledDurationMinutes: session.scheduledDurationMinutes }))
    if (conflicts.length && !allowOverlap) throw new LocalTeachingError('Học viên đã có buổi học trùng thời gian.', conflicts)

    const settingsValue = settings || { ...defaultSettings(workspaceId), workspaceId }
    const resolved = resolveStudentPricing(student, settingsValue)
    const legacyOverride = !!input.id && input.pricingOverride === undefined && input.hourlyRateSnapshot !== undefined
    const pricingOverride = old ? input.pricingOverride ?? (legacyOverride ? true : old.pricingOverride) : false
    const previousMode = old?.pricingModeSnapshot ?? (old?.hourlyRateSnapshot != null ? 'PER_HOUR' : resolved.mode)
    const priorRate = old?.unitRateSnapshot ?? old?.hourlyRateSnapshot ?? null
    const requestedRate = input.unitRateSnapshot ?? (legacyOverride ? input.hourlyRateSnapshot : undefined)
    const rate = pricingOverride ? requestedRate ?? priorRate : input.pricingOverride === false ? resolved.unitRate : old ? priorRate ?? resolved.unitRate : resolved.unitRate
    if (!Number.isSafeInteger(rate) || rate! < 0) throw new Error('Buổi học chưa có đơn giá hợp lệ.')
    const mode: PricingMode = old ? input.pricingOverride === false ? resolved.mode : previousMode : resolved.mode
    const goalsById = new Map((old?.goals || []).map(goal => [goal.id, goal]))
    const incomingIds = new Set<string>()
    const goals = input.goals.map((goal, sortOrder) => {
      if (goal.id && !goalsById.has(goal.id)) throw new Error('Một mục tiêu không thuộc buổi học này.')
      const goalId = goal.id || newId()
      if (incomingIds.has(goalId)) throw new Error('Danh sách mục tiêu bị lặp.')
      incomingIds.add(goalId)
      const current = goalsById.get(goalId)
      return { id: goalId, sessionId: id, title: goal.title, isCompleted: current?.isCompleted ?? false, note: current?.note ?? null, sortOrder, createdAt: current?.createdAt || nowIso(), updatedAt: nowIso() } satisfies SessionGoal
    })
    const timestamp = nowIso()
    const value: StoredLesson = {
      ...(old || {} as StoredLesson), workspaceId, id, userId: workspaceId, studentId: input.studentId,
      title: input.title, subject: input.subject, startAt: input.startAt, scheduledDurationMinutes: input.scheduledDurationMinutes,
      actualDurationMinutes: old?.actualDurationMinutes ?? null, status: old?.status ?? 'SCHEDULED',
      progressPercent: old?.progressPercent ?? null, evaluationNote: old?.evaluationNote ?? null, cancellationReason: old?.cancellationReason ?? null,
      pricingModeSnapshot: mode, unitRateSnapshot: rate as number, pricingOverride: old ? pricingOverride : false,
      ...(mode === 'PER_HOUR' ? { hourlyRateSnapshot: rate as number } : old?.hourlyRateSnapshot != null ? { hourlyRateSnapshot: old.hourlyRateSnapshot } : {}),
      feeAmount: null, completedAt: old?.completedAt ?? null, source: old?.source === 'RECURRING' ? 'RECURRING' : 'MANUAL',
      weeklyScheduleId: old?.weeklyScheduleId ?? null, occurrenceDate: old?.occurrenceDate ?? null, seriesId: old?.seriesId ?? null,
      isOverride: old?.source === 'RECURRING' ? true : old?.isOverride ?? false, lifecycleStatus: 'ACTIVE',
      createdAt: old?.createdAt || timestamp, updatedAt: timestamp, goals,
    }
    tx.objectStore('lessons').put(value)
    recordSyncOperation(tx, workspaceId, 'lesson', id, old ? 'UPDATE' : 'CREATE')
    return { value, student }
  })
  return viewOf(saved.value, saved.student, true)
}

export async function localSetSessionCancelled(workspaceId: string, sessionId: string, cancelled: boolean, reason: string | null = null) {
  await transaction(['lessons', 'syncOperations'], 'readwrite', async tx => {
    const store = tx.objectStore('lessons')
    const current = await requestResult(store.get(compoundKey(workspaceId, sessionId))) as StoredLesson | undefined
    if (!current) throw new Error('Không tìm thấy buổi học này.')
    const allowed = cancelled ? current.status === 'SCHEDULED' : current.status === 'CANCELLED'
    if (!allowed) throw new Error(cancelled ? 'Chỉ có thể hủy buổi đang lên lịch.' : 'Buổi học này không ở trạng thái đã hủy.')
    store.put({ ...current, status: cancelled ? 'CANCELLED' : 'SCHEDULED', cancellationReason: cancelled ? reason : null, feeAmount: null, updatedAt: nowIso() })
    recordSyncOperation(tx, workspaceId, 'lesson', sessionId, 'UPDATE')
  })
  return localGetSession(workspaceId, sessionId)
}

export async function localConfirmAttendance(workspaceId: string, sessionId: string) {
  await transaction(['lessons', 'syncOperations'], 'readwrite', async tx => {
    const store = tx.objectStore('lessons')
    const current = await requestResult(store.get(compoundKey(workspaceId, sessionId))) as StoredLesson | undefined
    if (!current) throw new Error('Không tìm thấy buổi học này.')
    if (current.status !== 'SCHEDULED') throw new Error('Buổi học này đã được xác nhận hoặc hủy.')
    if (current.lifecycleStatus === 'SUPERSEDED') throw new Error('Buổi học này không còn trong lịch.')
    const duration = current.scheduledDurationMinutes
    const mode = current.pricingModeSnapshot ?? (current.hourlyRateSnapshot != null ? 'PER_HOUR' : DEFAULT_PRICING_MODE)
    const rate = current.unitRateSnapshot ?? current.hourlyRateSnapshot
    if (!Number.isSafeInteger(duration) || duration < 1 || !Number.isSafeInteger(rate) || rate! < 0) throw new Error('Buổi học chưa có thời lượng hoặc đơn giá hợp lệ.')
    const updated = { ...current, status: 'COMPLETED' as const, actualDurationMinutes: duration, progressPercent: null, evaluationNote: null, feeAmount: calculateSessionFee(mode, rate as number, duration), completedAt: current.completedAt || nowIso(), updatedAt: nowIso() }
    store.put(updated); recordSyncOperation(tx, workspaceId, 'lesson', sessionId, 'UPDATE')
  })
  return localGetSession(workspaceId, sessionId)
}

export async function localCompleteSession(workspaceId: string, rawInput: { sessionId: string; actualDurationMinutes: number; hourlyRateSnapshot?: number; pricingOverride?: boolean; unitRateSnapshot?: number; progressPercent: number; evaluationNote: string; goals: { id: string; isCompleted: boolean }[] }) {
  const input = completionInputSchema.parse(rawInput)
  await transaction(['lessons', 'students', 'settings', 'syncOperations'], 'readwrite', async tx => {
    const store = tx.objectStore('lessons')
    const [current, students, settings] = await Promise.all([
      requestResult(store.get(compoundKey(workspaceId, input.sessionId))) as Promise<StoredLesson | undefined>,
      byWorkspace<StoredStudent>(tx.objectStore('students'), workspaceId),
      requestResult(tx.objectStore('settings').get(compoundKey(workspaceId, 'default'))) as Promise<StoredSettings | undefined>,
    ])
    if (!current) throw new Error('Không tìm thấy buổi học này.')
    if (current.status === 'CANCELLED') throw new Error('Hãy khôi phục buổi học trước khi hoàn thành.')
    if (current.lifecycleStatus === 'SUPERSEDED') throw new Error('Buổi học này không còn trong lịch.')
    const currentGoals = new Set(current.goals.map(goal => goal.id))
    const requestedGoals = new Map(input.goals.map(goal => [goal.id, goal.isCompleted]))
    if (requestedGoals.size !== input.goals.length || requestedGoals.size !== currentGoals.size || Array.from(requestedGoals.keys()).some(id => !currentGoals.has(id))) throw new Error('Danh sách mục tiêu đã thay đổi. Hãy tải lại rồi thử lại.')
    const oldMode = current.pricingModeSnapshot ?? (current.hourlyRateSnapshot != null ? 'PER_HOUR' : DEFAULT_PRICING_MODE)
    const oldRate = current.unitRateSnapshot ?? current.hourlyRateSnapshot
    if (!Number.isSafeInteger(oldRate) || oldRate! < 0) throw new Error('Buổi học chưa có đơn giá hợp lệ.')
    const legacyOverride = input.pricingOverride === undefined && input.hourlyRateSnapshot !== undefined
    const desiredOverride = input.pricingOverride ?? (legacyOverride ? true : current.pricingOverride === true)
    let mode: PricingMode = oldMode
    let rate = desiredOverride ? input.unitRateSnapshot ?? (legacyOverride ? input.hourlyRateSnapshot : undefined) ?? oldRate : oldRate
    if (!desiredOverride && current.pricingOverride === true && input.pricingOverride === false) {
      const student = students.find(item => item.id === current.studentId)
      if (student) {
        const pricing = resolveStudentPricing(student, settings || { ...defaultSettings(workspaceId), workspaceId })
        mode = pricing.mode; rate = pricing.unitRate
      }
    }
    if (!Number.isSafeInteger(rate) || rate! < 0) throw new Error('Buổi học chưa có đơn giá hợp lệ.')
    const goals = current.goals.map(goal => ({ ...goal, isCompleted: requestedGoals.get(goal.id)!, updatedAt: nowIso() }))
    store.put({ ...current, status: 'COMPLETED', actualDurationMinutes: input.actualDurationMinutes, pricingModeSnapshot: mode, unitRateSnapshot: rate as number, pricingOverride: desiredOverride, ...(mode === 'PER_HOUR' ? { hourlyRateSnapshot: rate as number } : {}), progressPercent: input.progressPercent, evaluationNote: input.evaluationNote, feeAmount: calculateSessionFee(mode, rate as number, input.actualDurationMinutes), completedAt: current.completedAt || nowIso(), updatedAt: nowIso(), goals })
    recordSyncOperation(tx, workspaceId, 'lesson', current.id, 'UPDATE')
  })
  return localGetSession(workspaceId, input.sessionId)
}

export async function localStudentBillingSummary(workspaceId: string, now = new Date()) {
  const settings = await localGetSettings(workspaceId)
  const period = vietnamBillingPeriod(settings.billingCycleCutoffDay, now)
  const from = vietnamDateTime(period.startDate, '00:00'), to = vietnamDateTime(shiftVietnamDate(period.endDate, 1), '00:00')
  const [students, sessions] = await transaction(['students', 'lessons'], 'readonly', async tx => Promise.all([
    byWorkspace<StoredStudent>(tx.objectStore('students'), workspaceId), byWorkspace<StoredLesson>(tx.objectStore('lessons'), workspaceId),
  ]))
  type Total = { completedSessions: number; actualDurationMinutes: number; perSessionCompletedSessions: number; perHourDurationMinutes: number; billingModes: Set<PricingMode>; feeAmount: number; overdueItems: TeachingStudentBillingRow['overdueUnconfirmedItems'] }
  const totals = new Map<string, Total>()
  for (const student of students.filter(item => !item.deletedAt)) totals.set(student.id, { completedSessions: 0, actualDurationMinutes: 0, perSessionCompletedSessions: 0, perHourDurationMinutes: 0, billingModes: new Set(), feeAmount: 0, overdueItems: [] })
  for (const session of sessions) {
    if (session.status !== 'COMPLETED' || session.lifecycleStatus === 'SUPERSEDED' || session.startAt < from || session.startAt >= to) continue
    const total = totals.get(session.studentId)
    if (!total) continue
    const duration = session.actualDurationMinutes ?? 0
    total.completedSessions++; total.actualDurationMinutes += duration; total.billingModes.add(session.pricingModeSnapshot)
    if (session.pricingModeSnapshot === 'PER_SESSION') total.perSessionCompletedSessions++
    else total.perHourDurationMinutes += duration
    total.feeAmount += session.feeAmount ?? calculateSessionFee(session.pricingModeSnapshot, session.unitRateSnapshot ?? 0, duration)
  }
  for (const session of sessions) {
    if (session.status !== 'SCHEDULED' || session.lifecycleStatus === 'SUPERSEDED' || Date.parse(session.startAt) + session.scheduledDurationMinutes * 60_000 >= now.getTime()) continue
    const total = totals.get(session.studentId)
    if (!total) continue
    total.overdueItems.push({ sessionId: session.id, occurrenceDate: session.occurrenceDate || vietnamTodayKey(new Date(Date.parse(session.startAt))), startAt: session.startAt, title: session.title, scheduledDurationMinutes: session.scheduledDurationMinutes })
  }
  const rows: TeachingStudentBillingRow[] = Array.from(totals, ([studentId, total]) => ({
    studentId, completedSessions: total.completedSessions, actualDurationMinutes: total.actualDurationMinutes,
    perSessionCompletedSessions: total.perSessionCompletedSessions, perHourDurationMinutes: total.perHourDurationMinutes,
    billingModes: Array.from(total.billingModes), feeAmount: total.feeAmount, overdueUnconfirmedSessions: total.overdueItems.length,
    overdueUnconfirmedItems: total.overdueItems.sort((a, b) => b.startAt.localeCompare(a.startAt)),
  }))
  return { period, rows }
}

export async function localMonthOverview(workspaceId: string, year: number, monthIndex: number) {
  const { from, to } = vietnamMonthRange(year, monthIndex)
  const [students, sessions] = await transaction(['students', 'lessons'], 'readonly', async tx => Promise.all([
    byWorkspace<StoredStudent>(tx.objectStore('students'), workspaceId), byWorkspace<StoredLesson>(tx.objectStore('lessons'), workspaceId),
  ]))
  const totals = new Map(students.filter(student => !student.deletedAt).map(student => [student.id, { studentId: student.id, studentName: student.name, studentStatus: student.status, actualDurationMinutes: 0, feeAmount: 0, completedSessions: 0 }]))
  for (const session of sessions) {
    if (session.status !== 'COMPLETED' || session.lifecycleStatus === 'SUPERSEDED' || session.startAt < from || session.startAt >= to) continue
    const total = totals.get(session.studentId)
    if (!total) continue
    total.actualDurationMinutes += session.actualDurationMinutes || 0
    total.feeAmount += session.feeAmount || 0
    total.completedSessions++
  }
  const rows = Array.from(totals.values()).sort((a, b) => a.studentName.localeCompare(b.studentName, 'vi'))
  return { year, month: monthIndex + 1, rows, totalActualDurationMinutes: rows.reduce((sum, row) => sum + row.actualDurationMinutes, 0), totalFeeAmount: rows.reduce((sum, row) => sum + row.feeAmount, 0) }
}

export async function localOverviewPageData(workspaceId: string, year: number, monthIndex: number, now = new Date()) {
  const today = vietnamTodayKey(now), tomorrow = shiftVietnamDate(today, 1)
  const todayStart = vietnamDateTime(today, '00:00'), todayEnd = vietnamDateTime(tomorrow, '00:00')
  const prepared = await localMaterializeRecurringSessions(workspaceId, todayStart, todayEnd)
  const [lessons] = await transaction(['lessons'], 'readonly', async tx => Promise.all([byWorkspace<StoredLesson>(tx.objectStore('lessons'), workspaceId)]))
  const { from, to } = vietnamMonthRange(year, monthIndex)
  const totals = new Map(prepared.students.map(student => [student.id, { studentId: student.id, studentName: student.name, studentStatus: student.status, actualDurationMinutes: 0, feeAmount: 0, completedSessions: 0 }]))
  for (const session of lessons) {
    if (session.status !== 'COMPLETED' || session.lifecycleStatus === 'SUPERSEDED' || session.startAt < from || session.startAt >= to) continue
    const total = totals.get(session.studentId)
    if (!total) continue
    total.actualDurationMinutes += session.actualDurationMinutes || 0
    total.feeAmount += session.feeAmount || 0
    total.completedSessions++
  }
  const rows = Array.from(totals.values()).sort((a, b) => a.studentName.localeCompare(b.studentName, 'vi'))
  const month = { year, month: monthIndex + 1, rows, totalActualDurationMinutes: rows.reduce((sum, row) => sum + row.actualDurationMinutes, 0), totalFeeAmount: rows.reduce((sum, row) => sum + row.feeAmount, 0) }
  const studentById = new Map(prepared.students.map(student => [student.id, student]))
  const todaySessions = prepared.sessions.filter(session => {
    const start = Date.parse(session.startAt)
    return start >= Date.parse(todayStart) && start < Date.parse(todayEnd) && session.lifecycleStatus !== 'SUPERSEDED'
  })
  const reviewFrom = now.getTime() - 24 * 60 * 60_000
  const overdue = lessons.filter(session => session.status === 'SCHEDULED' && session.lifecycleStatus !== 'SUPERSEDED' && Date.parse(session.startAt) >= reviewFrom && Date.parse(session.startAt) < now.getTime() && Date.parse(session.startAt) + session.scheduledDurationMinutes * 60_000 < now.getTime()).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
  const dashboard = { today, todaySessions: todaySessions.map(session => viewOf(session, studentById.get(session.studentId), true)), reviewCount: overdue.length, overdueSessions: overdue.slice(0, 5).map(session => viewOf(session, studentById.get(session.studentId), true)) }
  return { month, dashboard }
}

export async function localDashboard(workspaceId: string, now = new Date()) {
  const today = vietnamTodayKey(now), tomorrow = shiftVietnamDate(today, 1)
  const todayStart = vietnamDateTime(today, '00:00'), todayEnd = vietnamDateTime(tomorrow, '00:00')
  await localMaterializeRecurringSessions(workspaceId, todayStart, todayEnd)
  const [lessons, students] = await transaction(['lessons', 'students'], 'readonly', async tx => Promise.all([
    byWorkspace<StoredLesson>(tx.objectStore('lessons'), workspaceId), byWorkspace<StoredStudent>(tx.objectStore('students'), workspaceId),
  ]))
  const studentById = new Map(students.map(student => [student.id, student]))
  const active = lessons.filter(session => !session.deletedAt && session.lifecycleStatus !== 'SUPERSEDED')
  const todaySessions = active.filter(session => Date.parse(session.startAt) >= Date.parse(todayStart) && Date.parse(session.startAt) < Date.parse(todayEnd)).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)).map(session => viewOf(session, studentById.get(session.studentId), true))
  const overdue = active.filter(session => session.status === 'SCHEDULED' && Date.parse(session.startAt) > now.getTime() - 24 * 60 * 60_000 && Date.parse(session.startAt) < now.getTime() && Date.parse(session.startAt) + session.scheduledDurationMinutes * 60_000 < now.getTime()).sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt)).slice(0, 5).map(session => viewOf(session, studentById.get(session.studentId), true))
  const reviewFrom = now.getTime() - 24 * 60 * 60_000
  const reviewCount = active.filter(session => session.status === 'SCHEDULED' && Date.parse(session.startAt) >= reviewFrom && Date.parse(session.startAt) < now.getTime() && Date.parse(session.startAt) + session.scheduledDurationMinutes * 60_000 < now.getTime()).length
  return { today, todaySessions, reviewCount, overdueSessions: overdue }
}

export async function localReviewCount(workspaceId: string, now = new Date()) {
  const [sessions] = await transaction(['lessons'], 'readonly', async tx => Promise.all([byWorkspace<StoredLesson>(tx.objectStore('lessons'), workspaceId)]))
  const from = now.getTime() - 24 * 60 * 60_000
  return sessions.filter(session => session.status === 'SCHEDULED' && session.lifecycleStatus !== 'SUPERSEDED' && Date.parse(session.startAt) >= from && Date.parse(session.startAt) < now.getTime() && Date.parse(session.startAt) + session.scheduledDurationMinutes * 60_000 < now.getTime()).length
}

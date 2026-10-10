import 'server-only'
import { createHash } from 'node:crypto'
import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'
import {
  DEFAULT_HOURLY_RATE,
  DEFAULT_BILLING_CYCLE_CUTOFF_DAY,
  DEFAULT_PRICING_MODE,
  DEFAULT_SESSION_RATE,
  calculateSessionFee,
  goalCompletionRate,
  resolveStudentPricing,
  vietnamMonthKey,
  vietnamMonthRange,
  vietnamBillingPeriod,
  vietnamDateTime,
  vietnamDayOfWeek,
  vietnamTodayKey,
  shiftVietnamDate,
  toVietnamDateTimeLocal,
  type PricingMode,
  type SessionGoal,
  type Student,
  type TeachingSession,
  type TeachingSessionView,
  type TeachingSettings,
  type TeachingStudentBillingRow,
  type WeeklySchedule,
} from '../_lib/teaching-model'
import { calculateStudentBilling, calculateStudentOpeningBalanceAmount, teachingSessionFee } from '../_lib/student-billing'
import { idSchema } from '../_lib/model'

const userRoot = (userId: string) => getAdminDb().collection('demo').doc('ai-task').collection('users').doc(idSchema.parse(userId))
const studentsRef = (userId: string) => userRoot(userId).collection('students')
const sessionsRef = (userId: string) => userRoot(userId).collection('teachingSessions')
const weeklySchedulesRef = (userId: string) => userRoot(userId).collection('weeklySchedules')
const settingsRef = (userId: string) => userRoot(userId).collection('teachingSettings').doc('default')
const goalsRef = (userId: string, sessionId: string) => sessionsRef(userId).doc(sessionId).collection('goals')

function serialize(value: unknown): any {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (Array.isArray(value)) return value.map(serialize)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]))
  return value
}
function record<T>(doc: FirebaseFirestore.DocumentSnapshot) {
  return { ...serialize(doc.data()), id: doc.id } as T
}
function normalizeStudent(value: Partial<Student>): Student {
  return {
    ...value,
    // Existing Firestore student documents came from the hourly-only model.
    pricingMode: Object.hasOwn(value, 'pricingMode') ? value.pricingMode ?? null : 'PER_HOUR',
    sessionRate: value.sessionRate ?? null,
    hourlyRate: value.hourlyRate ?? null,
    openingBalance: value.openingBalance ?? null,
    billingPayments: value.billingPayments || [],
  } as Student
}
function studentRecord(doc: FirebaseFirestore.DocumentSnapshot): Student {
  return normalizeStudent(record<Partial<Student>>(doc))
}
function settingsRecord(doc: FirebaseFirestore.DocumentSnapshot): TeachingSettings {
  const value = record<Partial<TeachingSettings>>(doc)
  return {
    ...value,
    defaultPricingMode: value.defaultPricingMode ?? DEFAULT_PRICING_MODE,
    defaultSessionRate: value.defaultSessionRate ?? DEFAULT_SESSION_RATE,
    defaultHourlyRate: value.defaultHourlyRate ?? DEFAULT_HOURLY_RATE,
    billingCycleCutoffDay: value.billingCycleCutoffDay ?? DEFAULT_BILLING_CYCLE_CUTOFF_DAY,
  } as TeachingSettings
}
function defaultTeachingSettings(userId: string): TeachingSettings {
  return {
    id: 'default',
    userId,
    defaultPricingMode: DEFAULT_PRICING_MODE,
    defaultSessionRate: DEFAULT_SESSION_RATE,
    defaultHourlyRate: DEFAULT_HOURLY_RATE,
    billingCycleCutoffDay: DEFAULT_BILLING_CYCLE_CUTOFF_DAY,
    createdAt: '',
    updatedAt: '',
  }
}
function sessionRecord(doc: FirebaseFirestore.DocumentSnapshot): TeachingSession {
  const value = record<Partial<TeachingSession>>(doc)
  return {
    ...value,
    pricingModeSnapshot: value.pricingModeSnapshot ?? (value.hourlyRateSnapshot != null ? 'PER_HOUR' : DEFAULT_PRICING_MODE),
    unitRateSnapshot: value.unitRateSnapshot ?? value.hourlyRateSnapshot ?? null,
    pricingOverride: value.pricingOverride ?? false,
    source: value.source || 'MANUAL',
    weeklyScheduleId: value.weeklyScheduleId ?? null,
    occurrenceDate: value.occurrenceDate ?? null,
    seriesId: value.seriesId ?? null,
    isOverride: value.isOverride ?? false,
    lifecycleStatus: value.lifecycleStatus || 'ACTIVE',
  } as TeachingSession
}
async function scan<T>(ref: FirebaseFirestore.CollectionReference) {
  const out: T[] = []
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined
  while (true) {
    let query = ref.orderBy(FieldPath.documentId()).limit(300)
    if (cursor) query = query.startAfter(cursor)
    const page = await query.get()
    out.push(...page.docs.map(doc => record<T>(doc)))
    if (page.size < 300) return out
    cursor = page.docs[page.docs.length - 1]
  }
}
function sessionQuery(userId: string, options: { from?: string; to?: string; status?: string } = {}) {
  let query: FirebaseFirestore.Query = sessionsRef(userId)
  if (options.status) query = query.where('status', '==', options.status)
  if (options.from) query = query.where('startAt', '>=', Timestamp.fromDate(new Date(options.from)))
  if (options.to) query = query.where('startAt', '<', Timestamp.fromDate(new Date(options.to)))
  return query.orderBy('startAt').orderBy(FieldPath.documentId())
}
async function scanSessions(userId: string, options: { from?: string; to?: string; status?: string } = {}) {
  const out: TeachingSession[] = []
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined
  while (true) {
    let query = sessionQuery(userId, options).limit(300)
    if (cursor) query = query.startAfter(cursor)
    const page = await query.get()
    out.push(...page.docs.map(doc => sessionRecord(doc)))
    if (page.size < 300) return out
    cursor = page.docs[page.docs.length - 1]
  }
}
async function synchronizeFutureSessionPricing(userId: string, studentId?: string) {
  const now = Date.now()
  const candidates = (await scanSessions(userId, { from: new Date(now).toISOString(), status: 'SCHEDULED' })).filter(session =>
    session.status === 'SCHEDULED' &&
    session.lifecycleStatus !== 'SUPERSEDED' &&
    session.pricingOverride !== true &&
    Date.parse(session.startAt) > now &&
    (!studentId || session.studentId === studentId),
  )
  const syncOne = async (sessionId: string) => {
    const ref = sessionsRef(userId).doc(sessionId)
    await getAdminDb().runTransaction(async tx => {
      const current = await tx.get(ref)
      if (!current.exists) return
      const startAt = current.get('startAt')
      const startMillis = startAt instanceof Timestamp ? startAt.toDate().getTime() : Date.parse(startAt)
      if (current.get('status') !== 'SCHEDULED' || current.get('lifecycleStatus') === 'SUPERSEDED' || current.get('pricingOverride') === true || !Number.isFinite(startMillis) || startMillis <= Date.now()) return
      const [student, settings] = await Promise.all([
        tx.get(studentsRef(userId).doc(String(current.get('studentId')))),
        tx.get(settingsRef(userId)),
      ])
      if (!student.exists) return
      const pricing = resolveStudentPricing(studentRecord(student), settings.exists ? settingsRecord(settings) : defaultTeachingSettings(userId))
      const currentMode = current.get('pricingModeSnapshot') ?? (current.get('hourlyRateSnapshot') != null ? 'PER_HOUR' : pricing.mode)
      const currentRate = current.get('unitRateSnapshot') ?? current.get('hourlyRateSnapshot')
      if (currentMode === pricing.mode && currentRate === pricing.unitRate && current.get('pricingOverride') === false) return
      tx.update(ref, {
        pricingModeSnapshot: pricing.mode,
        unitRateSnapshot: pricing.unitRate,
        pricingOverride: false,
        ...(pricing.mode === 'PER_HOUR' ? { hourlyRateSnapshot: pricing.unitRate } : {}),
        feeAmount: null,
        updatedAt: FieldValue.serverTimestamp(),
      })
    })
  }
  for (let index = 0; index < candidates.length; index += 20) {
    await Promise.all(candidates.slice(index, index + 20).map(session => syncOne(session.id)))
  }
}

export async function getTeachingSettings(userId: string): Promise<TeachingSettings> {
  const ref = settingsRef(userId)
  const currentSettings = await getAdminDb().runTransaction(async tx => {
    const current = await tx.get(ref)
    const now = FieldValue.serverTimestamp()
    if (!current.exists) {
      tx.set(ref, {
        userId,
        defaultPricingMode: DEFAULT_PRICING_MODE,
        defaultSessionRate: DEFAULT_SESSION_RATE,
        defaultHourlyRate: DEFAULT_HOURLY_RATE,
        billingCycleCutoffDay: DEFAULT_BILLING_CYCLE_CUTOFF_DAY,
        createdAt: now,
        updatedAt: now,
      })
      return null
    }
    const patch: Record<string, unknown> = {}
    if (current.get('defaultPricingMode') === undefined) patch.defaultPricingMode = DEFAULT_PRICING_MODE
    if (current.get('defaultSessionRate') === undefined) patch.defaultSessionRate = DEFAULT_SESSION_RATE
    if (current.get('defaultHourlyRate') === undefined) patch.defaultHourlyRate = DEFAULT_HOURLY_RATE
    if (current.get('billingCycleCutoffDay') === undefined) patch.billingCycleCutoffDay = DEFAULT_BILLING_CYCLE_CUTOFF_DAY
    if (Object.keys(patch).length) {
      tx.set(ref, { ...patch, updatedAt: now }, { merge: true })
      return null
    }
    return settingsRecord(current)
  })
  return currentSettings || settingsRecord(await ref.get())
}

export async function saveTeachingSettings(userId: string, input: Partial<Pick<TeachingSettings, 'defaultPricingMode' | 'defaultSessionRate' | 'defaultHourlyRate' | 'billingCycleCutoffDay'>> | number) {
  const ref = settingsRef(userId)
  let pricingChanged = false
  await getAdminDb().runTransaction(async tx => {
    const current = await tx.get(ref)
    const changes = typeof input === 'number' ? { defaultHourlyRate: input } : input
    const previousPricing = {
      mode: current.get('defaultPricingMode') ?? DEFAULT_PRICING_MODE,
      sessionRate: current.get('defaultSessionRate') ?? DEFAULT_SESSION_RATE,
      hourlyRate: current.get('defaultHourlyRate') ?? DEFAULT_HOURLY_RATE,
    }
    const nextPricing = {
      mode: changes.defaultPricingMode ?? previousPricing.mode,
      sessionRate: changes.defaultSessionRate ?? previousPricing.sessionRate,
      hourlyRate: changes.defaultHourlyRate ?? previousPricing.hourlyRate,
    }
    pricingChanged = previousPricing.mode !== nextPricing.mode || previousPricing.sessionRate !== nextPricing.sessionRate || previousPricing.hourlyRate !== nextPricing.hourlyRate
    tx.set(ref, {
      userId,
      defaultPricingMode: nextPricing.mode,
      defaultSessionRate: nextPricing.sessionRate,
      defaultHourlyRate: nextPricing.hourlyRate,
      billingCycleCutoffDay: changes.billingCycleCutoffDay ?? current.get('billingCycleCutoffDay') ?? DEFAULT_BILLING_CYCLE_CUTOFF_DAY,
      createdAt: current.exists ? current.get('createdAt') : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
  })
  if (pricingChanged) await synchronizeFutureSessionPricing(userId)
  return getTeachingSettings(userId)
}

export async function listStudents(userId: string): Promise<Student[]> {
  const [students, schedules] = await Promise.all([
    scan<Student>(studentsRef(userId)),
    scan<WeeklySchedule & { isSuperseded?: boolean }>(weeklySchedulesRef(userId)),
  ])
  const today = vietnamTodayKey()
  return students.map(rawStudent => {
    const student = normalizeStudent(rawStudent)
    return ({
    ...student,
    weeklySchedules: schedules.filter(schedule => schedule.studentId === student.id && schedule.isSuperseded !== true && schedule.effectiveFrom <= today && (!schedule.effectiveTo || schedule.effectiveTo >= today)),
    })
  }).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
}

type WeeklyScheduleInput = { seriesId?: string; dayOfWeek: number; startTime: string; durationMinutes: number }
type SaveStudentInput = {
  id?: string
  name: string
  hourlyRate: number | null
  pricingMode?: PricingMode | null
  sessionRate?: number | null
  status: 'ACTIVE' | 'INACTIVE'
  note: string | null
  openingBalance?: Student['openingBalance']
  weeklySchedules?: WeeklyScheduleInput[]
  scheduleEffectiveFrom?: string
  allowScheduleOverlap?: boolean
}

function scheduleOverlaps(schedules: WeeklyScheduleInput[]) {
  const conflicts: { first: WeeklyScheduleInput; second: WeeklyScheduleInput }[] = []
  const intervals = schedules.map(item => {
    const [hour, minute] = item.startTime.split(':').map(Number)
    return { item, start: item.dayOfWeek * 1440 + hour * 60 + minute, end: item.dayOfWeek * 1440 + hour * 60 + minute + item.durationMinutes }
  })
  for (let left = 0; left < intervals.length; left++) for (let right = left + 1; right < intervals.length; right++) {
    const a = intervals[left], b = intervals[right]
    const overlaps = [-10080, 0, 10080].some(offset => a.start < b.end + offset && a.end > b.start + offset)
    if (overlaps) conflicts.push({ first: a.item, second: b.item })
  }
  return conflicts
}
export function findWeeklyScheduleConflicts(schedules: WeeklyScheduleInput[]) {
  return scheduleOverlaps(schedules)
}

function scheduleIsActive(schedule: WeeklySchedule & { isSuperseded?: boolean }, date: string) {
  return schedule.isSuperseded !== true && schedule.effectiveFrom <= date && (!schedule.effectiveTo || schedule.effectiveTo >= date)
}

function writeScheduleVersions(tx: FirebaseFirestore.Transaction, userId: string, studentId: string, nextSchedules: (WeeklyScheduleInput & { seriesId: string })[], effectiveFrom: string, snapshot: FirebaseFirestore.QuerySnapshot) {
  const ref = weeklySchedulesRef(userId)
  const records = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() as Omit<WeeklySchedule, 'id'> & { isSuperseded?: boolean }, ref: doc.ref }))
  const desiredBySeries = new Map(nextSchedules.map(schedule => [schedule.seriesId, schedule]))
  const activeAtDate = records.map(item => ({ ...item.data, id: item.id } as WeeklySchedule & { isSuperseded?: boolean })).filter(item => scheduleIsActive(item, effectiveFrom))
  const signature = (items: { seriesId: string; dayOfWeek: number; startTime: string; durationMinutes: number }[]) => JSON.stringify(items.map(({ seriesId, dayOfWeek, startTime, durationMinutes }) => ({ seriesId, dayOfWeek, startTime, durationMinutes })).sort((a, b) => a.seriesId.localeCompare(b.seriesId)))
  if (signature(activeAtDate) === signature(nextSchedules)) return false
  const reusedAtEffectiveDate = new Set<string>()
  const now = FieldValue.serverTimestamp()
  for (const current of records) {
    const schedule = { ...current.data, id: current.id } as WeeklySchedule & { isSuperseded?: boolean }
    if (schedule.isSuperseded || (schedule.effectiveTo && schedule.effectiveTo < effectiveFrom)) continue
    const desired = desiredBySeries.get(schedule.seriesId)
    if (schedule.effectiveFrom === effectiveFrom && desired) {
      tx.set(current.ref, { ...desired, userId, studentId, seriesId: schedule.seriesId, effectiveFrom, effectiveTo: null, isSuperseded: false, createdAt: current.data.createdAt ?? now, updatedAt: now })
      reusedAtEffectiveDate.add(schedule.seriesId)
    } else if (schedule.effectiveFrom >= effectiveFrom) {
      tx.set(current.ref, { isSuperseded: true, updatedAt: now }, { merge: true })
    } else if (!schedule.effectiveTo || schedule.effectiveTo >= effectiveFrom) {
      tx.set(current.ref, { effectiveTo: shiftVietnamDate(effectiveFrom, -1), updatedAt: now }, { merge: true })
    }
  }
  for (const schedule of nextSchedules) {
    if (reusedAtEffectiveDate.has(schedule.seriesId)) continue
    const versionRef = ref.doc()
    tx.set(versionRef, {
      userId, studentId, ...schedule, effectiveFrom, effectiveTo: null, isSuperseded: false,
      createdAt: now, updatedAt: now,
    })
  }
  return true
}

export async function saveStudent(userId: string, input: SaveStudentInput) {
  const ref = input.id ? studentsRef(userId).doc(input.id) : studentsRef(userId).doc()
  const now = FieldValue.serverTimestamp()
  if (input.weeklySchedules && !input.allowScheduleOverlap && scheduleOverlaps(input.weeklySchedules).length) {
    throw new Error('Lịch tuần của học viên có khung giờ bị trùng. Hãy điều chỉnh hoặc xác nhận lưu lịch trùng.')
  }
  const effectiveFrom = input.weeklySchedules !== undefined ? input.scheduleEffectiveFrom || vietnamTodayKey() : undefined
  if (effectiveFrom && effectiveFrom < vietnamTodayKey()) throw new Error('Ngày hiệu lực phải là hôm nay hoặc một ngày trong tương lai.')
  if (input.weeklySchedules) {
    const seriesIds = input.weeklySchedules.flatMap(schedule => schedule.seriesId ? [schedule.seriesId] : [])
    if (new Set(seriesIds).size !== seriesIds.length) throw new Error('Một lịch tuần bị lặp trong danh sách.')
  }
  const scheduleRef = weeklySchedulesRef(userId)
  const nextSchedules = input.weeklySchedules?.map(schedule => ({ ...schedule, seriesId: schedule.seriesId || scheduleRef.doc().id })) || []
  const reconciliation = await getAdminDb().runTransaction(async tx => {
    const [current, schedules] = await Promise.all([
      tx.get(ref),
      input.weeklySchedules !== undefined ? tx.get(scheduleRef.where('studentId', '==', ref.id)) : Promise.resolve(null),
    ])
    if (input.id && !current.exists) throw new Error('Không tìm thấy học viên này.')
    const oldStudent = current.exists ? normalizeStudent(current.data() as Partial<Student>) : null
    const pricingMode = input.pricingMode === undefined ? oldStudent?.pricingMode ?? null : input.pricingMode
    const sessionRate = input.sessionRate === undefined ? oldStudent?.sessionRate ?? null : input.sessionRate
    const hourlyRate = input.hourlyRate === undefined ? oldStudent?.hourlyRate ?? null : input.hourlyRate
    const openingBalance = input.openingBalance === undefined ? oldStudent?.openingBalance ?? null : input.openingBalance
    const statusChanged = !current.exists || current.get('status') !== input.status
    const pricingChanged = !oldStudent || oldStudent.pricingMode !== pricingMode || oldStudent.sessionRate !== sessionRate || oldStudent.hourlyRate !== hourlyRate
    tx.set(ref, {
      userId,
      name: input.name,
      pricingMode,
      sessionRate,
      hourlyRate,
      openingBalance,
      billingPayments: oldStudent?.billingPayments || [],
      status: input.status,
      note: input.note,
      createdAt: current.exists ? current.get('createdAt') : now,
      updatedAt: now,
    })
    const schedulesChanged = schedules && effectiveFrom ? writeScheduleVersions(tx, userId, ref.id, nextSchedules, effectiveFrom, schedules) : false
    return { schedulesChanged, statusChanged, pricingChanged }
  })
  if (reconciliation.schedulesChanged || (input.id && reconciliation.statusChanged)) await materializeRecurringSessions(userId)
  if (input.id && reconciliation.pricingChanged) await synchronizeFutureSessionPricing(userId, ref.id)
  const student = studentRecord(await ref.get())
  return { ...student, weeklySchedules: await listActiveWeeklySchedules(userId, ref.id) }
}

export async function recordStudentPayment(userId: string, input: { studentId: string; paymentId: string; amount: number }) {
  const ref = studentsRef(userId).doc(input.studentId)
  const settings = await getTeachingSettings(userId)
  const period = vietnamBillingPeriod(settings.billingCycleCutoffDay)
  const now = new Date().toISOString()
  await getAdminDb().runTransaction(async tx => {
    const current = await tx.get(ref)
    if (!current.exists) throw new Error('Không tìm thấy học viên này.')
    const student = normalizeStudent(current.data() as Partial<Student>)
    const payments = student.billingPayments || []
    if (payments.some(payment => payment.id === input.paymentId)) return
    tx.update(ref, {
      billingPayments: [...payments, { id: input.paymentId, periodStartDate: period.startDate, amount: input.amount, paidAt: now }],
      updatedAt: FieldValue.serverTimestamp(),
    })
  })
  return { student: studentRecord(await ref.get()), period }
}

export async function listActiveWeeklySchedules(userId: string, studentId: string, date = vietnamTodayKey()): Promise<WeeklySchedule[]> {
  const schedules = await scan<WeeklySchedule & { isSuperseded?: boolean }>(weeklySchedulesRef(userId))
  return schedules.filter(schedule => schedule.studentId === studentId && scheduleIsActive(schedule, date)).sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
}

function recurringSessionId(studentId: string, seriesId: string, occurrenceDate: string) {
  const digest = createHash('sha256').update(`${studentId}|${seriesId}|${occurrenceDate}`).digest('hex').slice(0, 40)
  return `rec_${digest}`
}

async function upsertRecurringOccurrence(userId: string, student: Student, schedule: WeeklySchedule, occurrenceDate: string, settings: TeachingSettings) {
  const sessionRef = sessionsRef(userId).doc(recurringSessionId(student.id, schedule.seriesId, occurrenceDate))
  const scheduleQuery = weeklySchedulesRef(userId).where('studentId', '==', student.id)
  const studentRef = studentsRef(userId).doc(student.id)
  await getAdminDb().runTransaction(async tx => {
    const [currentSchedules, currentStudent, currentSettings, current] = await Promise.all([
      tx.get(scheduleQuery), tx.get(studentRef), tx.get(settingsRef(userId)), tx.get(sessionRef),
    ])
    if (!currentStudent.exists || currentStudent.get('status') !== 'ACTIVE') return
    const currentSchedule = currentSchedules.docs.map(doc => ({ ...doc.data(), id: doc.id } as WeeklySchedule & { isSuperseded?: boolean }))
      .find(item => item.id === schedule.id && scheduleIsActive(item, occurrenceDate) && item.dayOfWeek === vietnamDayOfWeek(occurrenceDate))
    if (!currentSchedule) return
    const old = current.exists ? current.data()! : null
    if (old && (old.status !== 'SCHEDULED' || old.isOverride === true || old.source !== 'RECURRING')) return
    const pricing = resolveStudentPricing(studentRecord(currentStudent), currentSettings.exists ? settingsRecord(currentSettings) : settings)
    const oldMode = old?.pricingModeSnapshot ?? (old?.hourlyRateSnapshot != null ? 'PER_HOUR' : pricing.mode)
    const oldUnitRate = old?.unitRateSnapshot ?? old?.hourlyRateSnapshot ?? null
    const pricingOverride = old?.pricingOverride === true
    const pricingModeSnapshot = pricingOverride ? oldMode : pricing.mode
    const unitRateSnapshot = pricingOverride && oldUnitRate != null ? oldUnitRate : pricing.unitRate
    const nextStartMillis = Date.parse(vietnamDateTime(occurrenceDate, currentSchedule.startTime))
    const oldStartMillis = old?.startAt instanceof Timestamp ? old.startAt.toDate().getTime() : Date.parse(old?.startAt)
    if (old && oldStartMillis === nextStartMillis && old.scheduledDurationMinutes === currentSchedule.durationMinutes && old.weeklyScheduleId === currentSchedule.id && old.occurrenceDate === occurrenceDate && old.seriesId === currentSchedule.seriesId && old.lifecycleStatus === 'ACTIVE' && old.pricingModeSnapshot === pricingModeSnapshot && old.unitRateSnapshot === unitRateSnapshot && (old.pricingOverride === true) === pricingOverride) return
    const now = FieldValue.serverTimestamp()
    tx.set(sessionRef, {
      userId,
      studentId: student.id,
      title: old?.title || 'Buổi học định kỳ',
      subject: old?.subject ?? null,
      startAt: Timestamp.fromDate(new Date(nextStartMillis)),
      scheduledDurationMinutes: currentSchedule.durationMinutes,
      actualDurationMinutes: old?.actualDurationMinutes ?? null,
      status: old?.status ?? 'SCHEDULED',
      progressPercent: old?.progressPercent ?? null,
      evaluationNote: old?.evaluationNote ?? null,
      pricingModeSnapshot,
      unitRateSnapshot,
      pricingOverride,
      ...(pricingModeSnapshot === 'PER_HOUR' ? { hourlyRateSnapshot: unitRateSnapshot } : old?.hourlyRateSnapshot != null ? { hourlyRateSnapshot: old.hourlyRateSnapshot } : {}),
      feeAmount: null,
      completedAt: old?.completedAt ?? null,
      source: 'RECURRING',
      weeklyScheduleId: currentSchedule.id,
      occurrenceDate,
      seriesId: currentSchedule.seriesId,
      isOverride: false,
      lifecycleStatus: 'ACTIVE',
      createdAt: old?.createdAt ?? now,
      updatedAt: now,
    })
  })
}

async function supersedeIfNoLongerScheduled(userId: string, session: TeachingSession, includedDates: Set<string>) {
  const date = session.occurrenceDate || toVietnamDateTimeLocal(session.startAt).slice(0, 10)
  if (!includedDates.has(date) || session.status !== 'SCHEDULED' || session.isOverride || session.source !== 'RECURRING' || session.lifecycleStatus === 'SUPERSEDED') return
  const ref = sessionsRef(userId).doc(session.id)
  const schedulesQuery = weeklySchedulesRef(userId).where('studentId', '==', session.studentId)
  const studentRef = studentsRef(userId).doc(session.studentId)
  await getAdminDb().runTransaction(async tx => {
    const [current, scheduleSnapshot, student] = await Promise.all([tx.get(ref), tx.get(schedulesQuery), tx.get(studentRef)])
    if (!current.exists || current.get('status') !== 'SCHEDULED' || current.get('isOverride') === true || current.get('source') !== 'RECURRING') return
    const applicable = student.exists && student.get('status') === 'ACTIVE' && scheduleSnapshot.docs.some(doc => {
      const schedule = { ...doc.data(), id: doc.id } as WeeklySchedule & { isSuperseded?: boolean }
      return schedule.seriesId === session.seriesId && scheduleIsActive(schedule, date) && schedule.dayOfWeek === vietnamDayOfWeek(date)
    })
    if (applicable) return
    tx.update(ref, { lifecycleStatus: 'SUPERSEDED', feeAmount: null, updatedAt: FieldValue.serverTimestamp() })
  })
}

/** Materialize recurring appointments for the rolling 30 days and any future dates in the requested range. */
export async function materializeRecurringSessions(userId: string, from?: string, to?: string) {
  const today = vietnamTodayKey()
  const rollingEnd = shiftVietnamDate(today, 30)
  const includedDates = new Set<string>()
  for (let date = today; date < rollingEnd; date = shiftVietnamDate(date, 1)) includedDates.add(date)
  const requestedStart = from ? toVietnamDateTimeLocal(from).slice(0, 10) : today
  const requestedEnd = to ? toVietnamDateTimeLocal(to).slice(0, 10) : shiftVietnamDate(requestedStart, 62)
  let requestedDate = requestedStart < today ? today : requestedStart
  let requestedDays = 0
  while (requestedDate < requestedEnd && requestedDays < 366) {
    includedDates.add(requestedDate)
    requestedDate = shiftVietnamDate(requestedDate, 1)
    requestedDays++
  }
  const requestedThrough = requestedEnd > rollingEnd ? requestedEnd : rollingEnd
  const sessionsThrough = vietnamDateTime(requestedThrough, '00:00')
  const [students, schedules, settings, sessions] = await Promise.all([
    scan<Student>(studentsRef(userId)),
    scan<WeeklySchedule & { isSuperseded?: boolean }>(weeklySchedulesRef(userId)),
    getTeachingSettings(userId),
    scanSessions(userId, { from: vietnamDateTime(today, '00:00'), to: sessionsThrough }),
  ])
  const activeStudents = students.filter(student => student.status === 'ACTIVE')
  const activeStudentById = new Map(activeStudents.map(student => [student.id, student]))
  const schedulesByStudent = new Map<string, (WeeklySchedule & { isSuperseded?: boolean })[]>()
  for (const schedule of schedules) {
    const group = schedulesByStudent.get(schedule.studentId) || []
    group.push(schedule)
    schedulesByStudent.set(schedule.studentId, group)
  }
  const existingSessionById = new Map(sessions.map(session => [session.id, session]))
  const candidates: { student: Student; schedule: WeeklySchedule; date: string }[] = []
  for (const student of activeStudents) {
    const studentSchedules = schedulesByStudent.get(student.id) || []
    for (const date of Array.from(includedDates)) {
      for (const schedule of studentSchedules) {
        if (schedule.dayOfWeek === vietnamDayOfWeek(date) && scheduleIsActive(schedule, date)) candidates.push({ student, schedule, date })
      }
    }
  }
  const needsUpsert: typeof candidates = []
  for (const candidate of candidates) {
    const old = existingSessionById.get(recurringSessionId(candidate.student.id, candidate.schedule.seriesId, candidate.date))
    if (old && (old.status !== 'SCHEDULED' || old.isOverride || old.source !== 'RECURRING')) continue
    const pricing = resolveStudentPricing(normalizeStudent(candidate.student), settings)
    const oldMode = old?.pricingModeSnapshot ?? (old?.hourlyRateSnapshot != null ? 'PER_HOUR' : pricing.mode)
    const oldUnitRate = old?.unitRateSnapshot ?? old?.hourlyRateSnapshot ?? null
    const pricingOverride = old?.pricingOverride === true
    const pricingModeSnapshot = pricingOverride ? oldMode : pricing.mode
    const unitRateSnapshot = pricingOverride && oldUnitRate != null ? oldUnitRate : pricing.unitRate
    const nextStartMillis = Date.parse(vietnamDateTime(candidate.date, candidate.schedule.startTime))
    const oldStartMillis = old ? Date.parse(old.startAt) : Number.NaN
    if (old && oldStartMillis === nextStartMillis && old.scheduledDurationMinutes === candidate.schedule.durationMinutes && old.weeklyScheduleId === candidate.schedule.id && old.occurrenceDate === candidate.date && old.seriesId === candidate.schedule.seriesId && old.lifecycleStatus === 'ACTIVE' && old.pricingModeSnapshot === pricingModeSnapshot && old.unitRateSnapshot === unitRateSnapshot && old.pricingOverride === pricingOverride) continue
    needsUpsert.push(candidate)
  }
  await Promise.all(needsUpsert.map(candidate => upsertRecurringOccurrence(userId, candidate.student, candidate.schedule, candidate.date, settings)))
  const needsSupersede = sessions.filter(session => {
    const date = session.occurrenceDate || toVietnamDateTimeLocal(session.startAt).slice(0, 10)
    if (!includedDates.has(date) || session.status !== 'SCHEDULED' || session.isOverride || session.source !== 'RECURRING' || session.lifecycleStatus === 'SUPERSEDED') return false
    const student = activeStudentById.get(session.studentId)
    return !student || !(schedulesByStudent.get(session.studentId) || []).some(schedule => schedule.seriesId === session.seriesId && scheduleIsActive(schedule, date) && schedule.dayOfWeek === vietnamDayOfWeek(date))
  })
  await Promise.all(needsSupersede.map(session => supersedeIfNoLongerScheduled(userId, session, includedDates)))
  const sessionsForList = needsUpsert.length || needsSupersede.length
    ? await scanSessions(userId, { from: vietnamDateTime(today, '00:00'), to: sessionsThrough })
    : sessions
  const listedStudents = students.map(rawStudent => {
    const student = normalizeStudent(rawStudent)
    return { ...student, weeklySchedules: (schedulesByStudent.get(student.id) || []).filter(schedule => schedule.isSuperseded !== true && schedule.effectiveFrom <= today && (!schedule.effectiveTo || schedule.effectiveTo >= today)) }
  }).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  const materializedDates = Array.from(includedDates).sort()
  const materializedRanges: { from: string; to: string }[] = []
  if (materializedDates.length) {
    let rangeStart = materializedDates[0]
    let previous = materializedDates[0]
    for (const date of materializedDates.slice(1)) {
      if (date !== shiftVietnamDate(previous, 1)) {
        materializedRanges.push({ from: rangeStart, to: shiftVietnamDate(previous, 1) })
        rangeStart = date
      }
      previous = date
    }
    materializedRanges.push({ from: rangeStart, to: shiftVietnamDate(previous, 1) })
  }
  return { students: listedStudents, settings, materializedRanges, sessions: sessionsForList, sessionsFrom: vietnamDateTime(today, '00:00'), sessionsTo: sessionsThrough }
}

async function readSessionWindow(userId: string, from: string, to: string, status?: string, materialized?: { items: TeachingSession[]; from: string; to: string }) {
  if (!materialized) return scanSessions(userId, { from, to, status })
  const fromMillis = Date.parse(from)
  const toMillis = Date.parse(to)
  const materializedFrom = Date.parse(materialized.from)
  const materializedTo = Date.parse(materialized.to)
  const reads: Promise<TeachingSession[]>[] = []
  if (fromMillis < materializedFrom) reads.push(scanSessions(userId, { from, to: new Date(Math.min(toMillis, materializedFrom)).toISOString(), status }))
  if (toMillis > materializedTo) reads.push(scanSessions(userId, { from: new Date(Math.max(fromMillis, materializedTo)).toISOString(), to, status }))
  const overlapFrom = Math.max(fromMillis, materializedFrom)
  const overlapTo = Math.min(toMillis, materializedTo)
  const cached = overlapFrom < overlapTo ? materialized.items.filter(session => {
    const start = Date.parse(session.startAt)
    return start >= overlapFrom && start < overlapTo && (!status || session.status === status)
  }) : []
  const outside = (await Promise.all(reads)).flat()
  return [...outside, ...cached]
}

export async function listTeachingSessions(userId: string, filters: { studentId?: string; status?: string; needsReview?: boolean; from?: string; to?: string; query?: string } = {}, options: { students?: Student[]; includeGoals?: boolean; materializedSessions?: { items: TeachingSession[]; from: string; to: string } } = {}): Promise<TeachingSessionView[]> {
  const now = new Date()
  const reviewWindowStart = new Date(now.getTime() - 24 * 60 * 60_000).toISOString()
  const reviewFrom = filters.from && filters.from > reviewWindowStart ? filters.from : reviewWindowStart
  const defaultFrom = new Date(now.getTime() - 100 * 24 * 60 * 60_000).toISOString()
  const defaultTo = new Date(now.getTime() + 180 * 24 * 60 * 60_000).toISOString()
  const [sessions, students] = await Promise.all([
    readSessionWindow(userId,
      filters.needsReview ? reviewFrom : filters.from || defaultFrom,
      filters.to || (filters.needsReview ? now.toISOString() : defaultTo),
      filters.needsReview ? 'SCHEDULED' : undefined,
      options.materializedSessions,
    ),
    options.students ? Promise.resolve(options.students) : listStudents(userId),
  ])
  const studentById = new Map(students.map(student => [student.id, student]))
  const query = (filters.query || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi')
  const selected = sessions.filter(session => {
    if (session.lifecycleStatus === 'SUPERSEDED') return false
    if (filters.studentId && session.studentId !== filters.studentId) return false
    if (filters.status && session.status !== filters.status) return false
    if (filters.needsReview && (session.status !== 'SCHEDULED' || Date.parse(session.startAt) + session.scheduledDurationMinutes * 60_000 >= now.getTime())) return false
    if (filters.from && Date.parse(session.startAt) < Date.parse(filters.from)) return false
    if (filters.to && Date.parse(session.startAt) >= Date.parse(filters.to)) return false
    if (query) {
      const studentName = studentById.get(session.studentId)?.name || ''
      const searchable = `${session.title} ${session.subject || ''} ${studentName}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi')
      if (!searchable.includes(query)) return false
    }
    return true
  }).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
  return toTeachingSessionViews(userId, selected, studentById, options.includeGoals !== false)
}

async function toTeachingSessionViews(userId: string, sessions: TeachingSession[], studentById: Map<string, Student>, includeGoals = true) {
  return Promise.all(sessions.map(async session => {
    const student = studentById.get(session.studentId)
    const goals = includeGoals ? (await scan<SessionGoal>(goalsRef(userId, session.id))).sort((a, b) => a.sortOrder - b.sortOrder) : []
    return { ...session, studentName: student?.name || 'Học viên đã lưu trữ', studentStatus: student?.status || null, goals, goalsLoaded: includeGoals, goalCompletionRate: includeGoals ? goalCompletionRate(goals) : null }
  }))
}

export async function teachingDashboard(userId: string, now = new Date()) {
  const today = vietnamTodayKey(now)
  const tomorrow = shiftVietnamDate(today, 1)
  const todayStart = vietnamDateTime(today, '00:00')
  const todayEnd = vietnamDateTime(tomorrow, '00:00')
  const nowIso = now.toISOString()
  const reviewWindowStart = new Date(now.getTime() - 24 * 60 * 60_000).toISOString()
  const prepared = await materializeRecurringSessions(userId, todayStart, todayEnd)
  const [todaySessions, scheduledBeforeNow, students] = await Promise.all([
    scanSessions(userId, { from: todayStart, to: todayEnd }),
    scanSessions(userId, { from: reviewWindowStart, to: nowIso, status: 'SCHEDULED' }),
    Promise.resolve(prepared.students),
  ])
  const studentById = new Map(students.map(student => [student.id, student]))
  const overdue = scheduledBeforeNow
    .filter(session => session.lifecycleStatus !== 'SUPERSEDED' && Date.parse(session.startAt) + session.scheduledDurationMinutes * 60_000 < now.getTime())
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
  return {
    today,
    todaySessions: await toTeachingSessionViews(userId, todaySessions.filter(session => session.lifecycleStatus !== 'SUPERSEDED'), studentById),
    reviewCount: overdue.length,
    overdueSessions: await toTeachingSessionViews(userId, overdue.slice(0, 5), studentById),
  }
}

export async function teachingReviewCount(userId: string, now = new Date()) {
  const scheduled = await scanSessions(userId, { from: new Date(now.getTime() - 24 * 60 * 60_000).toISOString(), to: now.toISOString(), status: 'SCHEDULED' })
  return scheduled.filter(session => session.lifecycleStatus !== 'SUPERSEDED' && Date.parse(session.startAt) + session.scheduledDurationMinutes * 60_000 < now.getTime()).length
}

export async function getTeachingSession(userId: string, sessionId: string) {
  const snapshot = await sessionsRef(userId).doc(sessionId).get()
  if (!snapshot.exists) throw new Error('Không tìm thấy buổi học này.')
  const session = sessionRecord(snapshot)
  const [studentSnapshot, goals] = await Promise.all([
    studentsRef(userId).doc(session.studentId).get(),
    scan<SessionGoal>(goalsRef(userId, sessionId)),
  ])
  const student = studentSnapshot.exists ? record<Student>(studentSnapshot) : null
  goals.sort((a, b) => a.sortOrder - b.sortOrder)
  return { ...session, studentName: student?.name || 'Học viên đã lưu trữ', studentStatus: student?.status || null, goals, goalsLoaded: true, goalCompletionRate: goalCompletionRate(goals) }
}

export async function findSessionConflicts(userId: string, input: { id?: string; studentId: string; startAt: string; scheduledDurationMinutes: number }) {
  const start = Date.parse(input.startAt)
  const end = start + input.scheduledDurationMinutes * 60_000
  const sessions = await scanSessions(userId, { from: new Date(start - 24 * 60 * 60_000).toISOString(), to: new Date(end).toISOString() })
  return sessions.filter(session => {
    if (session.id === input.id || session.studentId !== input.studentId || session.status !== 'SCHEDULED' || session.lifecycleStatus === 'SUPERSEDED') return false
    const otherStart = Date.parse(session.startAt)
    const otherEnd = otherStart + session.scheduledDurationMinutes * 60_000
    return start < otherEnd && end > otherStart
  }).map(session => ({ id: session.id, title: session.title, startAt: session.startAt, scheduledDurationMinutes: session.scheduledDurationMinutes }))
}

async function writeGoals(tx: FirebaseFirestore.Transaction, userId: string, sessionId: string, inputGoals: { id?: string; title: string }[], existing: FirebaseFirestore.QuerySnapshot) {
  const currentById = new Map(existing.docs.map(doc => [doc.id, doc]))
  const incomingIds = new Set<string>()
  const now = FieldValue.serverTimestamp()
  inputGoals.forEach((goal, sortOrder) => {
    if (goal.id && !currentById.has(goal.id)) throw new Error('Một mục tiêu không thuộc buổi học này.')
    const ref = goal.id ? goalsRef(userId, sessionId).doc(goal.id) : goalsRef(userId, sessionId).doc()
    incomingIds.add(ref.id)
    const current = goal.id ? currentById.get(goal.id) : undefined
    tx.set(ref, {
      sessionId,
      title: goal.title,
      isCompleted: current?.get('isCompleted') ?? false,
      note: current?.get('note') ?? null,
      sortOrder,
      createdAt: current?.get('createdAt') ?? now,
      updatedAt: now,
    })
  })
  existing.docs.forEach(doc => { if (!incomingIds.has(doc.id)) tx.delete(doc.ref) })
}

export async function saveTeachingSession(userId: string, input: {
  id?: string
  studentId: string
  title: string
  subject: string | null
  startAt: string
  scheduledDurationMinutes: number
  hourlyRateSnapshot?: number
  pricingOverride?: boolean
  unitRateSnapshot?: number
  goals: { id?: string; title: string }[]
}) {
  const ref = input.id ? sessionsRef(userId).doc(input.id) : sessionsRef(userId).doc()
  const studentRef = studentsRef(userId).doc(input.studentId)
  const settingsDocument = settingsRef(userId)
  await getAdminDb().runTransaction(async tx => {
    const [current, student, settings, goals] = await Promise.all([
      tx.get(ref), tx.get(studentRef), tx.get(settingsDocument), tx.get(goalsRef(userId, ref.id)),
    ])
    if (input.id && !current.exists) throw new Error('Không tìm thấy buổi học này.')
    const old = current.exists ? current.data()! : null
    if (old && old.status !== 'SCHEDULED') throw new Error('Chỉ có thể sửa thông tin buổi học đang lên lịch.')
    if (!student.exists) throw new Error('Không tìm thấy học viên này.')
    if (student.get('status') !== 'ACTIVE' && student.id !== old?.studentId) throw new Error('Chỉ chọn học viên đang hoạt động cho buổi học mới.')
    const studentValue = studentRecord(student)
    const settingsValue = settings.exists ? settingsRecord(settings) : defaultTeachingSettings(userId)
    const resolved = resolveStudentPricing(studentValue, settingsValue)
    const oldSession = current.exists ? sessionRecord(current) : null
    const legacyOverride = input.id && input.pricingOverride === undefined && input.hourlyRateSnapshot !== undefined
    const pricingOverride = oldSession ? input.pricingOverride ?? (legacyOverride ? true : oldSession.pricingOverride) : false
    const pricingModeSnapshot: PricingMode = oldSession?.pricingModeSnapshot ?? resolved.mode
    const priorUnitRate = oldSession?.unitRateSnapshot ?? oldSession?.hourlyRateSnapshot ?? null
    const requestedUnitRate = input.unitRateSnapshot ?? (legacyOverride ? input.hourlyRateSnapshot : undefined)
    const unitRateSnapshot = pricingOverride
      ? requestedUnitRate ?? priorUnitRate
      : input.pricingOverride === false ? resolved.unitRate : oldSession ? priorUnitRate ?? resolved.unitRate : resolved.unitRate
    if (!Number.isSafeInteger(unitRateSnapshot) || unitRateSnapshot! < 0) throw new Error('Buổi học chưa có đơn giá hợp lệ.')
    const finalUnitRate = unitRateSnapshot as number
    const finalPricingMode = oldSession ? input.pricingOverride === false ? resolved.mode : pricingModeSnapshot : resolved.mode
    const finalPricingOverride = oldSession ? pricingOverride : false
    const now = FieldValue.serverTimestamp()
    tx.set(ref, {
      userId,
      studentId: input.studentId,
      title: input.title,
      subject: input.subject,
      startAt: Timestamp.fromDate(new Date(input.startAt)),
      scheduledDurationMinutes: input.scheduledDurationMinutes,
      actualDurationMinutes: old?.actualDurationMinutes ?? null,
      status: old?.status ?? 'SCHEDULED',
      progressPercent: old?.progressPercent ?? null,
      evaluationNote: old?.evaluationNote ?? null,
      cancellationReason: old?.cancellationReason ?? null,
      pricingModeSnapshot: finalPricingMode,
      unitRateSnapshot: finalUnitRate,
      pricingOverride: finalPricingOverride,
      ...(finalPricingMode === 'PER_HOUR' ? { hourlyRateSnapshot: finalUnitRate } : oldSession?.hourlyRateSnapshot != null ? { hourlyRateSnapshot: oldSession.hourlyRateSnapshot } : {}),
      feeAmount: null,
      completedAt: old?.completedAt ?? null,
      source: old?.source === 'RECURRING' ? 'RECURRING' : 'MANUAL',
      weeklyScheduleId: old?.weeklyScheduleId ?? null,
      occurrenceDate: old?.occurrenceDate ?? null,
      seriesId: old?.seriesId ?? null,
      isOverride: old?.source === 'RECURRING' ? true : old?.isOverride ?? false,
      lifecycleStatus: 'ACTIVE',
      createdAt: old?.createdAt ?? now,
      updatedAt: now,
    })
    await writeGoals(tx, userId, ref.id, input.goals, goals)
  })
  return getTeachingSession(userId, ref.id)
}

export async function setSessionCancelled(userId: string, sessionId: string, cancelled: boolean, reason: string | null = null) {
  const ref = sessionsRef(userId).doc(sessionId)
  await getAdminDb().runTransaction(async tx => {
    const current = await tx.get(ref)
    if (!current.exists) throw new Error('Không tìm thấy buổi học này.')
    const allowed = cancelled ? current.get('status') === 'SCHEDULED' : current.get('status') === 'CANCELLED'
    if (!allowed) throw new Error(cancelled ? 'Chỉ có thể hủy buổi đang lên lịch.' : 'Buổi học này không ở trạng thái đã hủy.')
    tx.update(ref, {
      status: cancelled ? 'CANCELLED' : 'SCHEDULED',
      cancellationReason: cancelled ? reason : null,
      feeAmount: null,
      updatedAt: FieldValue.serverTimestamp(),
    })
  })
  return getTeachingSession(userId, sessionId)
}

export async function confirmTeachingAttendance(userId: string, sessionId: string) {
  const ref = sessionsRef(userId).doc(sessionId)
  await getAdminDb().runTransaction(async tx => {
    const current = await tx.get(ref)
    if (!current.exists) throw new Error('Không tìm thấy buổi học này.')
    if (current.get('status') !== 'SCHEDULED') throw new Error('Buổi học này đã được xác nhận hoặc hủy.')
    if (current.get('lifecycleStatus') === 'SUPERSEDED') throw new Error('Buổi học này không còn trong lịch.')
    const duration = current.get('scheduledDurationMinutes')
    const mode: PricingMode = current.get('pricingModeSnapshot') ?? (current.get('hourlyRateSnapshot') != null ? 'PER_HOUR' : DEFAULT_PRICING_MODE)
    const rate = current.get('unitRateSnapshot') ?? current.get('hourlyRateSnapshot')
    if (!Number.isSafeInteger(duration) || duration < 1 || !Number.isSafeInteger(rate) || rate < 0) {
      throw new Error('Buổi học chưa có thời lượng hoặc đơn giá hợp lệ.')
    }
    const now = FieldValue.serverTimestamp()
    tx.update(ref, {
      status: 'COMPLETED',
      actualDurationMinutes: duration,
      progressPercent: null,
      evaluationNote: null,
      feeAmount: calculateSessionFee(mode, rate, duration),
      completedAt: current.get('completedAt') ?? now,
      updatedAt: now,
    })
  })
  return getTeachingSession(userId, sessionId)
}

export async function completeTeachingSession(userId: string, input: {
  sessionId: string
  actualDurationMinutes: number
  hourlyRateSnapshot?: number
  pricingOverride?: boolean
  unitRateSnapshot?: number
  progressPercent: number
  evaluationNote: string
  goals: { id: string; isCompleted: boolean }[]
}) {
  const ref = sessionsRef(userId).doc(input.sessionId)
  await getAdminDb().runTransaction(async tx => {
    const [current, goals] = await Promise.all([tx.get(ref), tx.get(goalsRef(userId, input.sessionId))])
    if (!current.exists) throw new Error('Không tìm thấy buổi học này.')
    if (current.get('status') === 'CANCELLED') throw new Error('Hãy khôi phục buổi học trước khi hoàn thành.')
    if (current.get('lifecycleStatus') === 'SUPERSEDED') throw new Error('Buổi học này không còn trong lịch.')
    const currentGoals = new Set(goals.docs.map(doc => doc.id))
    const requestedGoals = new Map(input.goals.map(goal => [goal.id, goal.isCompleted]))
    if (requestedGoals.size !== input.goals.length || requestedGoals.size !== currentGoals.size || Array.from(requestedGoals.keys()).some(id => !currentGoals.has(id))) {
      throw new Error('Danh sách mục tiêu đã thay đổi. Hãy tải lại rồi thử lại.')
    }
    const oldMode: PricingMode = current.get('pricingModeSnapshot') ?? (current.get('hourlyRateSnapshot') != null ? 'PER_HOUR' : DEFAULT_PRICING_MODE)
    const oldRate = current.get('unitRateSnapshot') ?? current.get('hourlyRateSnapshot')
    if (!Number.isSafeInteger(oldRate) || oldRate < 0) throw new Error('Buổi học chưa có đơn giá hợp lệ.')
    const legacyOverride = input.pricingOverride === undefined && input.hourlyRateSnapshot !== undefined
    const desiredOverride = input.pricingOverride ?? (legacyOverride ? true : current.get('pricingOverride') === true)
    let pricingModeSnapshot = oldMode
    let unitRateSnapshot = desiredOverride
      ? input.unitRateSnapshot ?? (legacyOverride ? input.hourlyRateSnapshot : undefined) ?? oldRate
      : oldRate
    if (!desiredOverride && current.get('pricingOverride') === true && input.pricingOverride === false) {
      const [student, settings] = await Promise.all([
        tx.get(studentsRef(userId).doc(String(current.get('studentId')))),
        tx.get(settingsRef(userId)),
      ])
      if (student.exists) {
        const pricing = resolveStudentPricing(studentRecord(student), settings.exists ? settingsRecord(settings) : defaultTeachingSettings(userId))
        pricingModeSnapshot = pricing.mode
        unitRateSnapshot = pricing.unitRate
      }
    }
    if (!Number.isSafeInteger(unitRateSnapshot) || unitRateSnapshot! < 0) throw new Error('Buổi học chưa có đơn giá hợp lệ.')
    const now = FieldValue.serverTimestamp()
    const completedAt = current.get('completedAt') ?? now
    tx.update(ref, {
      status: 'COMPLETED',
      actualDurationMinutes: input.actualDurationMinutes,
      pricingModeSnapshot,
      unitRateSnapshot,
      pricingOverride: desiredOverride,
      ...(pricingModeSnapshot === 'PER_HOUR' ? { hourlyRateSnapshot: unitRateSnapshot } : {}),
      progressPercent: input.progressPercent,
      evaluationNote: input.evaluationNote,
      feeAmount: calculateSessionFee(pricingModeSnapshot, unitRateSnapshot as number, input.actualDurationMinutes),
      completedAt,
      updatedAt: now,
    })
    goals.docs.forEach(doc => tx.update(doc.ref, { isCompleted: requestedGoals.get(doc.id)!, updatedAt: now }))
  })
  return getTeachingSession(userId, input.sessionId)
}

export async function teachingStudentBillingSummary(userId: string, now = new Date()) {
  const settings = await getTeachingSettings(userId)
  const period = vietnamBillingPeriod(settings.billingCycleCutoffDay, now)
  const students = await scan<Student>(studentsRef(userId))
  const to = vietnamDateTime(shiftVietnamDate(period.endDate, 1), '00:00')
  const [sessions, scheduledSessions] = await Promise.all([
    scanSessions(userId, { to }),
    scanSessions(userId, { to: now.toISOString(), status: 'SCHEDULED' }),
  ])
  const totals = new Map<string, { completedSessions: number; actualDurationMinutes: number; perSessionCompletedSessions: number; perHourDurationMinutes: number; billingModes: Set<PricingMode>; feeAmount: number; overdueItems: TeachingStudentBillingRow['overdueUnconfirmedItems'] }>()
  const feesByStudent = new Map<string, Map<string, number>>()
  for (const student of students) { totals.set(student.id, { completedSessions: 0, actualDurationMinutes: 0, perSessionCompletedSessions: 0, perHourDurationMinutes: 0, billingModes: new Set(), feeAmount: 0, overdueItems: [] }); feesByStudent.set(student.id, new Map()) }
  for (const session of sessions) {
    if (session.status !== 'COMPLETED' || session.lifecycleStatus === 'SUPERSEDED') continue
    const total = totals.get(session.studentId)
    if (!total) continue
    const actualDurationMinutes = session.actualDurationMinutes ?? 0
    const fee = teachingSessionFee(session)
    const sessionPeriod = vietnamBillingPeriod(settings.billingCycleCutoffDay, new Date(session.startAt))
    const feesByPeriod = feesByStudent.get(session.studentId)!
    feesByPeriod.set(sessionPeriod.startDate, (feesByPeriod.get(sessionPeriod.startDate) || 0) + fee)
    if (sessionPeriod.startDate !== period.startDate) continue
    total.completedSessions += 1
    total.actualDurationMinutes += actualDurationMinutes
    total.billingModes.add(session.pricingModeSnapshot)
    if (session.pricingModeSnapshot === 'PER_SESSION') total.perSessionCompletedSessions += 1
    else total.perHourDurationMinutes += actualDurationMinutes
    total.feeAmount += fee
  }
  for (const session of scheduledSessions) {
    if (session.lifecycleStatus === 'SUPERSEDED' || Date.parse(session.startAt) + session.scheduledDurationMinutes * 60_000 >= now.getTime()) continue
    const total = totals.get(session.studentId)
    if (!total) continue
    total.overdueItems.push({
      sessionId: session.id,
      occurrenceDate: session.occurrenceDate || vietnamTodayKey(new Date(Date.parse(session.startAt))),
      startAt: session.startAt,
      title: session.title,
      scheduledDurationMinutes: session.scheduledDurationMinutes,
    })
  }
  const studentById = new Map(students.map(student => [student.id, normalizeStudent(student)]))
  const rows: TeachingStudentBillingRow[] = Array.from(totals, ([studentId, total]) => {
    const student = studentById.get(studentId)!
    const openingBalanceAmount = calculateStudentOpeningBalanceAmount(student, settings.billingCycleCutoffDay, period, feesByStudent.get(studentId) || new Map(), now)
    const paidAmount = (student.billingPayments || []).filter(payment => payment.periodStartDate === period.startDate).reduce((sum, payment) => sum + payment.amount, 0)
    const amountDue = openingBalanceAmount + total.feeAmount
    return {
      studentId, completedSessions: total.completedSessions, actualDurationMinutes: total.actualDurationMinutes,
      perSessionCompletedSessions: total.perSessionCompletedSessions, perHourDurationMinutes: total.perHourDurationMinutes,
      billingModes: Array.from(total.billingModes), feeAmount: total.feeAmount, openingBalanceAmount, paidAmount, amountDue,
      remainingAmount: amountDue - paidAmount, overdueUnconfirmedSessions: total.overdueItems.length,
      overdueUnconfirmedItems: total.overdueItems.sort((a, b) => b.startAt.localeCompare(a.startAt)),
    }
  })
  return { period, rows }
}

export async function teachingStudentBillingDetails(userId: string, studentId: string, now = new Date()) {
  const [settings, studentSnapshot] = await Promise.all([getTeachingSettings(userId), studentsRef(userId).doc(studentId).get()])
  if (!studentSnapshot.exists) throw new Error('Không tìm thấy học viên này.')
  const student = studentRecord(studentSnapshot)
  const period = vietnamBillingPeriod(settings.billingCycleCutoffDay, now)
  const to = vietnamDateTime(shiftVietnamDate(period.endDate, 1), '00:00')
  const sessions = (await scanSessions(userId, { to })).filter(session => session.studentId === studentId)
  return { period, row: calculateStudentBilling(student, settings.billingCycleCutoffDay, period, sessions, now) }
}

export async function teachingMonthOverview(userId: string, year: number, monthIndex: number) {
  const { from, to } = vietnamMonthRange(year, monthIndex)
  const [students, sessions] = await Promise.all([listStudents(userId), scanSessions(userId, { from, to })])
  return monthOverviewFrom(students, sessions, year, monthIndex, from, to)
}

function monthOverviewFrom(students: Student[], sessions: TeachingSession[], year: number, monthIndex: number, from: string, to: string) {
  const totals = new Map(students.map(student => [student.id, { studentId: student.id, studentName: student.name, studentStatus: student.status, actualDurationMinutes: 0, feeAmount: 0, completedSessions: 0 }]))
  for (const session of sessions) {
    if (session.status !== 'COMPLETED' || session.startAt < from || session.startAt >= to) continue
    const total = totals.get(session.studentId)
    if (!total) continue
    total.actualDurationMinutes += session.actualDurationMinutes || 0
    total.feeAmount += session.feeAmount || 0
    total.completedSessions += 1
  }
  const rows = Array.from(totals.values()).sort((a, b) => a.studentName.localeCompare(b.studentName, 'vi'))
  return {
    year,
    month: monthIndex + 1,
    rows,
    totalActualDurationMinutes: rows.reduce((sum, row) => sum + row.actualDurationMinutes, 0),
    totalFeeAmount: rows.reduce((sum, row) => sum + row.feeAmount, 0),
  }
}

export async function teachingOverviewPageData(userId: string, now = new Date()) {
  const today = vietnamTodayKey(now)
  const todayStart = vietnamDateTime(today, '00:00')
  const todayEnd = vietnamDateTime(shiftVietnamDate(today, 1), '00:00')
  const nowIso = now.toISOString()
  const reviewWindowStart = new Date(now.getTime() - 24 * 60 * 60_000).toISOString()
  const prepared = await materializeRecurringSessions(userId, todayStart, todayEnd)
  const materializedSessions = { items: prepared.sessions, from: prepared.sessionsFrom, to: prepared.sessionsTo }
  const [recentScheduled, billing] = await Promise.all([
    readSessionWindow(userId, reviewWindowStart, nowIso, 'SCHEDULED', materializedSessions),
    teachingStudentBillingSummary(userId, now),
  ])
  const students = prepared.students
  const studentById = new Map(students.map(student => [student.id, student]))
  const todaySessions = prepared.sessions.filter(session => {
    const start = Date.parse(session.startAt)
    return start >= Date.parse(todayStart) && start < Date.parse(todayEnd) && session.lifecycleStatus !== 'SUPERSEDED'
  })
  const overdue = recentScheduled.filter(session => session.lifecycleStatus !== 'SUPERSEDED' && Date.parse(session.startAt) + session.scheduledDurationMinutes * 60_000 < now.getTime()).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
  const periodRows = billing.rows.map(row => {
    const student = studentById.get(row.studentId)
    if (!student) return null
    return {
      studentId: row.studentId,
      studentName: student.name,
      studentStatus: student.status,
      actualDurationMinutes: row.actualDurationMinutes,
      completedSessions: row.completedSessions,
      feeAmount: row.feeAmount,
      openingBalanceAmount: row.openingBalanceAmount,
      paidAmount: row.paidAmount,
      amountDue: row.amountDue,
      remainingAmount: Math.max(0, row.remainingAmount),
    }
  }).filter((row): row is NonNullable<typeof row> => row !== null).sort((a, b) => a.studentName.localeCompare(b.studentName, 'vi'))
  const period = {
    period: billing.period,
    rows: periodRows,
    totalActualDurationMinutes: periodRows.reduce((sum, row) => sum + row.actualDurationMinutes, 0),
    totalCompletedSessions: periodRows.reduce((sum, row) => sum + row.completedSessions, 0),
    totalFeeAmount: periodRows.reduce((sum, row) => sum + row.feeAmount, 0),
    totalOpeningBalanceAmount: periodRows.reduce((sum, row) => sum + row.openingBalanceAmount, 0),
    totalPaidAmount: periodRows.reduce((sum, row) => sum + row.paidAmount, 0),
    totalAmountDue: periodRows.reduce((sum, row) => sum + row.amountDue, 0),
    totalRemainingAmount: periodRows.reduce((sum, row) => sum + row.remainingAmount, 0),
  }
  return {
    period,
    dashboard: {
      today, todaySessions: await toTeachingSessionViews(userId, todaySessions, studentById),
      reviewCount: overdue.length, overdueSessions: await toTeachingSessionViews(userId, overdue.slice(0, 5), studentById),
    },
  }
}

export function sessionMonthKey(session: Pick<TeachingSession, 'startAt'>) { return vietnamMonthKey(session.startAt) }

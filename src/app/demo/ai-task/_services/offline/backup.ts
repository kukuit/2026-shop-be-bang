import { z } from 'zod'
import { openTeachingDatabase, requestResult, transactionDone, workspaceKeyRange } from './database'
import { type LocalWorkspace } from './workspaces'

const studentSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), pricingMode: z.enum(['PER_SESSION', 'PER_HOUR']).nullable().optional(),
  sessionRate: z.number().int().nonnegative().nullable().optional(), hourlyRate: z.number().int().nonnegative().nullable().optional(),
  openingBalance: z.object({ periodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), amount: z.number().int().nonnegative() }).strict().nullable().optional(),
  billingPayments: z.array(z.object({ id: z.string().min(1), periodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), amount: z.number().int().positive(), paidAt: z.string().datetime({ offset: true }) }).strict()).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']), note: z.string().nullable().optional(), createdAt: z.string(), updatedAt: z.string(),
}).passthrough()
const scheduleSchema = z.object({ id: z.string().min(1), studentId: z.string().min(1), seriesId: z.string().min(1), dayOfWeek: z.number().int().min(0).max(6), startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/), durationMinutes: z.number().int().min(1).max(1440), effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), createdAt: z.string(), updatedAt: z.string() }).passthrough()
const goalSchema = z.object({ id: z.string().min(1), sessionId: z.string().min(1), title: z.string(), isCompleted: z.boolean(), note: z.string().nullable(), sortOrder: z.number().int(), createdAt: z.string(), updatedAt: z.string() }).passthrough()
const lessonSchema = z.object({ id: z.string().min(1), studentId: z.string().min(1), title: z.string().min(1), subject: z.string().nullable(), startAt: z.string().datetime({ offset: true }), scheduledDurationMinutes: z.number().int().positive(), actualDurationMinutes: z.number().int().positive().nullable(), status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']), progressPercent: z.number().int().min(0).max(100).nullable(), evaluationNote: z.string().nullable(), pricingModeSnapshot: z.enum(['PER_SESSION', 'PER_HOUR']), unitRateSnapshot: z.number().int().nonnegative().nullable(), pricingOverride: z.boolean(), feeAmount: z.number().int().nonnegative().nullable(), completedAt: z.string().nullable(), source: z.enum(['RECURRING', 'MANUAL']), weeklyScheduleId: z.string().nullable(), occurrenceDate: z.string().nullable(), seriesId: z.string().nullable(), isOverride: z.boolean(), lifecycleStatus: z.enum(['ACTIVE', 'SUPERSEDED']), createdAt: z.string(), updatedAt: z.string(), goals: z.array(goalSchema) }).passthrough()
const settingsSchema = z.object({ id: z.string().min(1), defaultPricingMode: z.enum(['PER_SESSION', 'PER_HOUR']), defaultSessionRate: z.number().int().nonnegative(), defaultHourlyRate: z.number().int().nonnegative(), billingCycleCutoffDay: z.number().int().min(1).max(31), createdAt: z.string(), updatedAt: z.string() }).passthrough()
const backupSchema = z.object({ schemaVersion: z.number().int(), exportedAt: z.string().datetime({ offset: true }), app: z.literal('teaching-management'), workspace: z.object({ name: z.string().min(1).max(100) }).passthrough(), data: z.object({ students: z.array(studentSchema), weeklySchedules: z.array(scheduleSchema), lessons: z.array(lessonSchema), settings: settingsSchema, syncOperations: z.array(z.record(z.string(), z.unknown())).optional(), syncMetadata: z.array(z.record(z.string(), z.unknown())).optional() }).strict() }).strict()

type ParsedBackup = z.infer<typeof backupSchema>
const id = () => `local_${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`

export async function exportLocalWorkspace(workspaceId: string) {
  const db = await openTeachingDatabase()
  const tx = db.transaction(['workspaces', 'students', 'weeklySchedules', 'lessons', 'settings', 'syncOperations', 'syncMetadata'], 'readonly')
  const done = transactionDone(tx)
  const workspace = await requestResult(tx.objectStore('workspaces').get(workspaceId)) as LocalWorkspace | undefined
  if (!workspace || workspace.mode !== 'LOCAL') { tx.abort(); await done.catch(() => undefined); throw new Error('Không tìm thấy dữ liệu offline để sao lưu.') }
  const [students, weeklySchedules, lessons, settings, syncOperations, syncMetadata] = await Promise.all([
    requestResult(tx.objectStore('students').index('by-workspace').getAll(workspaceKeyRange(workspaceId))),
    requestResult(tx.objectStore('weeklySchedules').index('by-workspace').getAll(workspaceKeyRange(workspaceId))),
    requestResult(tx.objectStore('lessons').index('by-workspace').getAll(workspaceKeyRange(workspaceId))),
    requestResult(tx.objectStore('settings').index('by-workspace').getAll(workspaceKeyRange(workspaceId))),
    requestResult(tx.objectStore('syncOperations').index('by-workspace').getAll(workspaceKeyRange(workspaceId))),
    requestResult(tx.objectStore('syncMetadata').index('by-workspace').getAll(workspaceKeyRange(workspaceId))),
  ])
  await done
  const setting = (settings as Record<string, unknown>[]).find(item => item.id === 'default')
  const backup = {
    schemaVersion: 1, exportedAt: new Date().toISOString(), app: 'teaching-management' as const,
    workspace: { name: workspace.name },
    data: { students, weeklySchedules, lessons, settings: setting, syncOperations, syncMetadata },
  }
  const checked = backupSchema.parse(backup)
  validateRelationships(checked)
  return checked
}

export function parseWorkspaceBackup(text: string): ParsedBackup {
  if (text.length > 25 * 1024 * 1024) throw new Error('Tệp sao lưu quá lớn (giới hạn 25 MB).')
  let raw: unknown
  try { raw = JSON.parse(text) } catch { throw new Error('Tệp không phải JSON hợp lệ.') }
  const backup = backupSchema.parse(raw)
  if (backup.schemaVersion !== 1) throw new Error(`Phiên bản sao lưu ${backup.schemaVersion} chưa được hỗ trợ.`)
  validateRelationships(backup)
  return backup
}

function ensureUnique(ids: string[], label: string) {
  if (new Set(ids).size !== ids.length) throw new Error(`Bản sao lưu có ${label} bị trùng ID.`)
}

function validateRelationships(backup: ParsedBackup) {
  const { students, weeklySchedules, lessons } = backup.data
  ensureUnique(students.map(item => item.id), 'học viên')
  ensureUnique(weeklySchedules.map(item => item.id), 'lịch tuần')
  ensureUnique(lessons.map(item => item.id), 'buổi học')
  const studentIds = new Set(students.map(item => item.id))
  const scheduleIds = new Set(weeklySchedules.map(item => item.id))
  const lessonIds = new Set(lessons.map(item => item.id))
  for (const schedule of weeklySchedules) if (!studentIds.has(schedule.studentId)) throw new Error(`Lịch tuần “${schedule.id}” không liên kết đến học viên có trong bản sao lưu.`)
  for (const lesson of lessons) {
    if (!studentIds.has(lesson.studentId)) throw new Error(`Buổi học “${lesson.id}” không liên kết đến học viên có trong bản sao lưu.`)
    if (lesson.weeklyScheduleId && !scheduleIds.has(lesson.weeklyScheduleId)) throw new Error(`Buổi học “${lesson.id}” không liên kết đến lịch tuần có trong bản sao lưu.`)
    for (const goal of lesson.goals) if (goal.sessionId !== lesson.id) throw new Error(`Mục tiêu trong buổi “${lesson.id}” có liên kết không hợp lệ.`)
  }
  for (const goalId of lessons.flatMap(lesson => lesson.goals.map(goal => `${lesson.id}:${goal.id}`))) if (goalId.endsWith(':')) throw new Error('Bản sao lưu có mục tiêu không có ID.')
  if (!backup.data.settings) throw new Error('Bản sao lưu chưa có cài đặt học phí.')
}

export async function importLocalWorkspace(backup: ParsedBackup): Promise<LocalWorkspace> {
  const checked = parseWorkspaceBackup(JSON.stringify(backup))
  const now = Date.now()
  const workspace: LocalWorkspace = { id: id(), name: checked.workspace.name, mode: 'LOCAL', ownerId: null, cloudWorkspaceId: null, createdAt: now, updatedAt: now, lastOpenedAt: null, lastSyncedAt: null }
  const db = await openTeachingDatabase()
  const tx = db.transaction(['workspaces', 'students', 'weeklySchedules', 'lessons', 'settings', 'syncOperations', 'syncMetadata'], 'readwrite')
  const done = transactionDone(tx)
  try {
    tx.objectStore('workspaces').add(workspace)
    for (const student of checked.data.students) tx.objectStore('students').add({ ...student, workspaceId: workspace.id, userId: workspace.id, deletedAt: null })
    for (const schedule of checked.data.weeklySchedules) tx.objectStore('weeklySchedules').add({ ...schedule, workspaceId: workspace.id, userId: workspace.id })
    for (const lesson of checked.data.lessons) tx.objectStore('lessons').add({ ...lesson, workspaceId: workspace.id, userId: workspace.id, goals: lesson.goals.map(goal => ({ ...goal, sessionId: lesson.id })) })
    tx.objectStore('settings').add({ ...checked.data.settings, workspaceId: workspace.id, userId: workspace.id, id: 'default' })
    for (const operation of checked.data.syncOperations || []) tx.objectStore('syncOperations').add({ ...operation, id: id(), workspaceId: workspace.id, status: 'PENDING', attemptCount: 0, createdAt: now })
    for (const metadata of checked.data.syncMetadata || []) tx.objectStore('syncMetadata').add({ ...metadata, workspaceId: workspace.id })
    for (const student of checked.data.students) tx.objectStore('syncOperations').add({ id: id(), workspaceId: workspace.id, entityType: 'student', entityId: student.id, operation: 'CREATE', createdAt: now, status: 'PENDING', attemptCount: 0 })
    for (const schedule of checked.data.weeklySchedules) tx.objectStore('syncOperations').add({ id: id(), workspaceId: workspace.id, entityType: 'weeklySchedule', entityId: schedule.id, operation: 'CREATE', createdAt: now, status: 'PENDING', attemptCount: 0 })
    for (const lesson of checked.data.lessons) tx.objectStore('syncOperations').add({ id: id(), workspaceId: workspace.id, entityType: 'lesson', entityId: lesson.id, operation: 'CREATE', createdAt: now, status: 'PENDING', attemptCount: 0 })
    tx.objectStore('syncOperations').add({ id: id(), workspaceId: workspace.id, entityType: 'settings', entityId: 'default', operation: 'CREATE', createdAt: now, status: 'PENDING', attemptCount: 0 })
    await done
    return workspace
  } catch (error) {
    try { tx.abort() } catch { /* The transaction may already be complete. */ }
    await done.catch(() => undefined)
    throw error
  }
}


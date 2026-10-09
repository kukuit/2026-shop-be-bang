import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/current-user'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import {
  completionInputSchema,
  attendanceConfirmationInputSchema,
  sessionInputSchema,
  sessionListFiltersSchema,
  scheduleListInputSchema,
  studentInputSchema,
  studentPaymentInputSchema,
  teachingSettingsSchema,
  type Student,
  type TeachingSettings,
} from '../../_lib/teaching-model'
import {
  completeTeachingSession,
  confirmTeachingAttendance,
  findSessionConflicts,
  findWeeklyScheduleConflicts,
  getTeachingSession,
  getTeachingSettings,
  listStudents,
  listTeachingSessions,
  listActiveWeeklySchedules,
  materializeRecurringSessions,
  saveStudent,
  recordStudentPayment,
  saveTeachingSession,
  saveTeachingSettings,
  setSessionCancelled,
  teachingDashboard,
  teachingMonthOverview,
  teachingOverviewPageData,
  teachingStudentBillingSummary,
  teachingReviewCount,
} from '../../_services/teaching.repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
const mutationSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('saveStudent'), data: studentInputSchema, allowScheduleOverlap: z.boolean().optional() }).strict(),
  z.object({ operation: z.literal('recordStudentPayment'), data: studentPaymentInputSchema }).strict(),
  z.object({ operation: z.literal('saveSettings'), data: teachingSettingsSchema }).strict(),
  z.object({ operation: z.literal('saveSession'), data: sessionInputSchema, allowOverlap: z.boolean().optional() }).strict(),
  z.object({ operation: z.literal('sessionStatus'), sessionId: z.string().min(1), action: z.enum(['cancel', 'restore']), reason: z.string().trim().max(1000).nullable().optional() }).strict(),
  z.object({ operation: z.literal('completeSession'), data: completionInputSchema }).strict(),
  z.object({ operation: z.literal('confirmAttendance'), data: attendanceConfirmationInputSchema }).strict(),
])

function failure(error: unknown) {
  if (error instanceof z.ZodError) return json({ error: error.issues.map(issue => issue.message).join(' ') || 'Thông tin chưa hợp lệ.' }, 400)
  const message = error instanceof Error ? error.message : ''
  const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: unknown }).code : undefined
  if (code === 8 || code === 'resource-exhausted' || /RESOURCE_EXHAUSTED|Quota exceeded/i.test(message)) {
    console.error('[ai-task-teaching] Firestore resource limit:', message || code)
    return json({ error: 'Firebase đang vượt giới hạn tài nguyên hoặc quota nên chưa xử lý được. Vui lòng thử lại sau; nếu vẫn lỗi, kiểm tra Firestore Usage trong Firebase Console.' }, 503)
  }
  const safe = [
    'Không tìm thấy', 'Chỉ có thể', 'Hãy khôi phục', 'Buổi học này không',
    'Buổi học chưa', 'Một mục tiêu', 'Danh sách mục tiêu', 'Chỉ chọn học viên',
    'Ngày hiệu lực', 'Một lịch tuần', 'Lịch tuần',
  ].some(prefix => message.startsWith(prefix))
  if (!safe) console.error('[ai-task-teaching]', message || 'Request failed')
  return json({ error: safe ? message : 'Không thể xử lý yêu cầu. Vui lòng thử lại.' }, 400)
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth.ok) return json({ error: 'Vui lòng đăng nhập.' }, 401)
    const params = req.nextUrl.searchParams
    const resource = params.get('resource') || 'sessions'
    switch (resource) {
      case 'students': return json({ students: await listStudents(auth.user.id) })
      case 'studentsPageData': {
        const [students, settings] = await Promise.all([listStudents(auth.user.id), getTeachingSettings(auth.user.id)])
        return json({ students, settings })
      }
      case 'billingSummary': return json(await teachingStudentBillingSummary(auth.user.id))
      case 'weeklySchedules': {
        const input = scheduleListInputSchema.parse({ studentId: params.get('studentId'), date: params.get('date') || undefined })
        return json({ weeklySchedules: await listActiveWeeklySchedules(auth.user.id, input.studentId, input.date) })
      }
      case 'settings': return json({ settings: await getTeachingSettings(auth.user.id) })
      case 'dashboard': return json(await teachingDashboard(auth.user.id))
      case 'reviewCount': return json({ count: await teachingReviewCount(auth.user.id) })
      case 'sessions': {
        const filters = sessionListFiltersSchema.parse(Object.fromEntries(Array.from(params.entries()).filter(([key]) => key !== 'resource' && key !== 'materialize')))
        const prepared = params.get('materialize') === 'false' ? null : await materializeRecurringSessions(auth.user.id, filters.from, filters.to)
        return json({ sessions: await listTeachingSessions(auth.user.id, filters, { students: prepared?.students || [], includeGoals: false, materializedSessions: prepared ? { items: prepared.sessions, from: prepared.sessionsFrom, to: prepared.sessionsTo } : undefined }) })
      }
      case 'sessionsPageData': {
        const filters = sessionListFiltersSchema.parse(Object.fromEntries(Array.from(params.entries()).filter(([key]) => key !== 'resource' && key !== 'materialize')))
        const prepared = params.get('materialize') === 'false' ? null : await materializeRecurringSessions(auth.user.id, filters.from, filters.to)
        let students: Student[]
        let settings: TeachingSettings
        if (prepared) { students = prepared.students; settings = prepared.settings }
        else [students, settings] = await Promise.all([listStudents(auth.user.id), getTeachingSettings(auth.user.id)])
        const sessions = await listTeachingSessions(auth.user.id, filters, { students, includeGoals: false, materializedSessions: prepared ? { items: prepared.sessions, from: prepared.sessionsFrom, to: prepared.sessionsTo } : undefined })
        return json({ sessions, students, settings, materializedRanges: prepared?.materializedRanges || [] })
      }
      case 'sessionsRangeData': {
        const filters = sessionListFiltersSchema.parse(Object.fromEntries(Array.from(params.entries()).filter(([key]) => key !== 'resource' && key !== 'materialize')))
        const rangeFilters = { ...filters, query: undefined }
        return json({ sessions: await listTeachingSessions(auth.user.id, rangeFilters, { students: [], includeGoals: false }) })
      }
      case 'session': return json({ session: await getTeachingSession(auth.user.id, z.string().min(1).parse(params.get('id'))) })
      case 'overview': {
        const year = z.coerce.number().int().min(2000).max(9999).parse(params.get('year'))
        const month = z.coerce.number().int().min(1).max(12).parse(params.get('month'))
        return json(await teachingMonthOverview(auth.user.id, year, month - 1))
      }
      case 'overviewPageData': {
        const year = z.coerce.number().int().min(2000).max(9999).parse(params.get('year'))
        const month = z.coerce.number().int().min(1).max(12).parse(params.get('month'))
        return json(await teachingOverviewPageData(auth.user.id, year, month - 1))
      }
      default: return json({ error: 'Không tìm thấy tài nguyên.' }, 404)
    }
  } catch (error) { return failure(error) }
}

export async function POST(req: NextRequest) {
  const rejected = rejectCrossSiteMutation(req)
  if (rejected) return rejected
  try {
    const auth = await requireAuth()
    if (!auth.ok) return json({ error: 'Vui lòng đăng nhập.' }, 401)
    const raw = await req.text()
    if (raw.length > 100_000) return json({ error: 'Yêu cầu quá lớn.' }, 413)
    const input = mutationSchema.parse(JSON.parse(raw))
    const userId = auth.user.id
    switch (input.operation) {
      case 'saveStudent': {
        const scheduleConflicts = input.data.weeklySchedules ? findWeeklyScheduleConflicts(input.data.weeklySchedules) : []
        if (scheduleConflicts.length && !input.allowScheduleOverlap) return json({ error: 'Lịch tuần của học viên có khung giờ bị trùng.', scheduleConflicts }, 409)
        return json({ student: await saveStudent(userId, { ...input.data, allowScheduleOverlap: input.allowScheduleOverlap }) })
      }
      case 'recordStudentPayment': return json(await recordStudentPayment(userId, input.data))
      case 'saveSettings': return json({ settings: await saveTeachingSettings(userId, input.data) })
      case 'saveSession': {
        const conflicts = await findSessionConflicts(userId, input.data)
        if (conflicts.length && !input.allowOverlap) return json({ error: 'Học viên đã có buổi học trùng thời gian.', conflicts }, 409)
        return json({ session: await saveTeachingSession(userId, input.data) })
      }
      case 'sessionStatus': return json({ session: await setSessionCancelled(userId, input.sessionId, input.action === 'cancel', input.reason || null) })
      case 'completeSession': return json({ session: await completeTeachingSession(userId, input.data) })
      case 'confirmAttendance': return json({ session: await confirmTeachingAttendance(userId, input.data.sessionId) })
    }
  } catch (error) { return failure(error) }
}

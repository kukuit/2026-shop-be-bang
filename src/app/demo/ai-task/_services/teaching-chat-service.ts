import 'server-only'
import {
  calculateSessionFee, completionInputSchema, sessionInputSchema, studentInputSchema, teachingSettingsSchema,
  formatVnd, toVietnamDateTimeLocal, vietnamMonthKey, vietnamTodayKey, type Student, type TeachingSessionView,
} from '../_lib/teaching-model'
import type { TeachingAssistantMemory, TeachingChatContext, TeachingChatMessage } from '../_lib/teaching-chat'
import {
  completeTeachingSession, findSessionConflicts, getTeachingSession, getTeachingSettings, listStudents, listTeachingSessions,
  materializeRecurringSessions, saveStudent, saveTeachingSession, saveTeachingSettings, setSessionCancelled, teachingDashboard, teachingMonthOverview,
} from './teaching.repository'
import {
  clearTeachingAssistantMemory, getTeachingAssistantMemory, getTeachingChatMessages, getTeachingChatState, setTeachingAssistantMemory,
  getTeachingChatTurn,
} from './teaching-chat-store'
import { parseTeachingChatIntent } from './teaching-chat-parser'
import type { TeachingSession } from '../_lib/teaching-model'

const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi').trim()
const localDate = (iso: string) => toVietnamDateTimeLocal(iso).slice(0, 10)
const displayDateTime = (iso: string) => new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })
const displaySchedule = (student: Student) => (student.weeklySchedules || []).map(item => dayNames[item.dayOfWeek] + ' ' + item.startTime + ' (' + item.durationMinutes + ' phút)').join(', ') || 'Chưa có lịch cố định'
const rateDescription = (student: Student) => student.pricingMode === 'PER_HOUR'
  ? formatVnd(student.hourlyRate ?? 0) + '/giờ'
  : student.pricingMode === 'PER_SESSION' ? formatVnd(student.sessionRate ?? 0) + '/buổi' : 'Dùng mức học phí chung'

function studentLine(student: Student) {
  return '- ' + student.name + ' · ' + (student.status === 'ACTIVE' ? 'Đang học' : 'Tạm nghỉ') + ' · ' + rateDescription(student) + ' · Lịch: ' + displaySchedule(student) + (student.note ? ' · Ghi chú: ' + student.note : '')
}
function sessionLine(session: TeachingSessionView) {
  return '- ' + displayDateTime(session.startAt) + ' · ' + session.studentName + ' · ' + (session.subject || session.title) +
    ' · ' + session.scheduledDurationMinutes + ' phút · ' + sessionStatusLabel(session.status) +
    (session.status === 'COMPLETED' ? ' · Học phí ' + formatVnd(session.feeAmount || 0) : '') +
    (session.goals.length ? ' · Mục tiêu: ' + session.goals.map(goal => (goal.isCompleted ? '✓ ' : '○ ') + goal.title).join(', ') : '')
}
function sessionStatusLabel(status: TeachingSession['status']) {
  return status === 'SCHEDULED' ? 'Đã lên lịch' : status === 'COMPLETED' ? 'Đã dạy' : 'Đã hủy'
}
function textForResult(action: string, value: any): string {
  if (action === 'LIST_STUDENTS' || action === 'GET_STUDENT') {
    const students = Array.isArray(value) ? value : value ? [value] : []
    return students.length ? 'Mình tìm được ' + students.length + ' học viên:\n' + students.map(studentLine).join('\n') : 'Chưa có học viên phù hợp.'
  }
  if (action === 'LIST_SESSIONS' || action === 'GET_SESSION') {
    const sessions = Array.isArray(value) ? value : value ? [value] : []
    return sessions.length ? 'Mình tìm được ' + sessions.length + ' buổi học:\n' + sessions.map(sessionLine).join('\n') : 'Không tìm thấy buổi học phù hợp.'
  }
  if (action === 'DASHBOARD') {
    const data = value
    return [
      'Tổng quan dạy thêm hôm nay:',
      '- Buổi học hôm nay: ' + data.todaySessions.length,
      ...data.todaySessions.slice(0, 8).map(sessionLine),
      '- Buổi đã qua giờ cần đánh giá (tối đa 5 buổi hiển thị): ' + data.overdueSessions.length,
      ...data.overdueSessions.slice(0, 5).map(sessionLine),
      '- Học viên đang hoạt động: ' + data.activeStudents,
    ].join('\n')
  }
  if (action === 'MONTH_OVERVIEW') {
    return [
      'Tổng kết tháng ' + String(value.month).padStart(2, '0') + '/' + value.year + ':',
      '- Tổng học phí: ' + formatVnd(value.totalFeeAmount),
      '- Số buổi đã dạy: ' + value.rows.reduce((sum: number, row: any) => sum + row.completedSessions, 0),
      ...value.rows.filter((row: any) => row.completedSessions).map((row: any) => '- ' + row.studentName + ': ' + row.completedSessions + ' buổi · ' + formatVnd(row.feeAmount)),
    ].join('\n')
  }
  if (action === 'GET_SETTINGS') {
    return 'Cài đặt học phí chung:\n- Mức tính: ' + (value.defaultPricingMode === 'PER_HOUR' ? 'Theo giờ' : 'Theo buổi') +
      '\n- Theo buổi: ' + formatVnd(value.defaultSessionRate) +
      '\n- Theo giờ: ' + formatVnd(value.defaultHourlyRate) +
      '\n- Chốt tháng học phí vào ngày: ' + value.billingCycleCutoffDay
  }
  return String(value || '')
}

function resolveStudent(students: Student[], name?: string, context?: TeachingChatContext): { student?: Student; error?: string } {
  if (name) {
    const query = normalize(name)
    const exact = students.filter(student => normalize(student.name) === query)
    const candidates = exact.length ? exact : students.filter(student => normalize(student.name).includes(query) || query.includes(normalize(student.name)))
    if (candidates.length === 1) return { student: candidates[0] }
    if (candidates.length > 1) return { error: 'Có nhiều học viên trùng hoặc gần giống tên "' + name + '": ' + candidates.map(student => student.name).join(', ') + '. Bạn chọn rõ một bạn nhé.' }
    return { error: 'Mình chưa tìm thấy học viên "' + name + '". Bạn kiểm tra tên hoặc tạo hồ sơ trước nhé.' }
  }
  const contextual = context?.activeStudentId && students.find(student => student.id === context.activeStudentId)
  if (contextual) return { student: contextual }
  return { error: 'Bạn cho mình biết tên học viên nhé.' }
}

function resolveSession(sessions: TeachingSessionView[], target: { studentName?: string; sessionQuery?: string; date?: string }, context: TeachingChatContext, students: Student[]) {
  const contextualPhrase = /^(buoi do|buoi nay|buoi vua roi|no|cai do)$/.test(normalize(target.sessionQuery || ''))
  if ((!target.studentName && !target.sessionQuery && !target.date || contextualPhrase) && context.activeSessionId) {
    const current = sessions.find(session => session.id === context.activeSessionId)
    if (current) return { session: current }
  }
  let candidates = sessions
  if (target.studentName) {
    const resolved = resolveStudent(students, target.studentName, context)
    if (!resolved.student) return { error: resolved.error }
    candidates = candidates.filter(session => session.studentId === resolved.student!.id)
  }
  if (target.date) candidates = candidates.filter(session => localDate(session.startAt) === target.date)
  if (target.sessionQuery && !contextualPhrase) {
    const query = normalize(target.sessionQuery)
    candidates = candidates.filter(session => normalize([session.title, session.subject || '', session.studentName].join(' ')).includes(query))
  }
  if (candidates.length === 1) return { session: candidates[0] }
  if (candidates.length > 1) return { error: 'Mình thấy nhiều buổi phù hợp:\n' + candidates.slice(0, 8).map(sessionLine).join('\n') + '\nBạn nói rõ ngày hoặc môn học cần chọn nhé.' }
  return { error: 'Mình chưa tìm thấy buổi học đó trong lịch gần đây. Bạn cho mình biết tên học viên, môn học hoặc ngày học nhé.' }
}

async function recentSessions(uid: string) {
  const now = new Date()
  const from = new Date(now.getTime() - 120 * 86400000).toISOString()
  const to = new Date(now.getTime() + 120 * 86400000).toISOString()
  const prepared = await materializeRecurringSessions(uid, from, to)
  return listTeachingSessions(uid, { from, to }, { students: prepared.students })
}

function proposal(action: string, data: Record<string, unknown>, summary: string) {
  return {
    status: 'pending' as const,
    content: 'Mình đã chuẩn bị đề xuất. Kiểm tra thông tin bên dưới rồi xác nhận để lưu.',
    proposal: { action, data, summary },
  }
}

function contextWith(context: TeachingChatContext, updates: Partial<TeachingChatContext>) {
  return { ...context, ...updates, updatedAt: Date.now() }
}

function proposalForPrompt(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(proposalForPrompt)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !/(^|_)id$/i.test(key) && !/Id$/.test(key))
    .map(([key, item]) => [key, proposalForPrompt(item)]))
}

export async function prepareTeachingChatTurn(uid: string, text: string, requestId: string, replacing?: string) {
  const [students, memory, state, sessions] = await Promise.all([
    listStudents(uid), getTeachingAssistantMemory(uid), getTeachingChatState(uid), recentSessions(uid),
  ])
  const context = state.context
  const messages = await getTeachingChatMessages(uid, 12, state.historyResetSequence)
  if (state.pendingId && state.pendingId !== replacing) throw new Error('Hãy xác nhận hoặc hủy đề xuất đang chờ trước.')
  if (replacing && state.pendingId !== replacing) throw new Error('Đề xuất đã thay đổi. Hãy tải lại chat trước khi sửa.')
  const pendingTurn = replacing ? await getTeachingChatTurn(uid, replacing) : null
  const pendingMessage = pendingTurn?.messages.find(message => message.role === 'assistant' && message.status === 'pending')
  const intent = await parseTeachingChatIntent({
    message: text, students, recentSessions: sessions, memory, context,
    pendingProposal: pendingMessage?.proposal ? proposalForPrompt(pendingMessage.proposal) as NonNullable<TeachingChatMessage['proposal']> : undefined,
    history: messages.messages
      .filter(message => Date.parse(message.createdAt) >= Date.now() - 2 * 60 * 60 * 1000)
      .slice(-8)
      .map(message => ({ role: message.role, content: message.content.slice(0, 1200), status: message.status })),
  })
  let reply: Omit<TeachingChatMessage, 'id' | 'role' | 'sequence' | 'createdAt'> = { content: '', status: 'normal' }
  let nextContext = context
  let nextMemory = memory
  let proposalSummary: string | undefined

  if (intent.action === 'CHAT') reply.content = intent.reply
  else if (intent.action === 'LIST_STUDENTS') {
    const result = students.filter(student => !intent.status || student.status === intent.status)
    reply.content = textForResult(intent.action, result); reply.result = result
  } else if (intent.action === 'GET_STUDENT') {
    const resolved = resolveStudent(students, intent.target.studentName, context)
    if (!resolved.student) reply.content = resolved.error!
    else {
      const student = resolved.student
      reply.content = textForResult(intent.action, student); reply.result = student
      nextContext = contextWith(context, { activeStudentId: student.id, activeStudentName: student.name })
    }
  } else if (intent.action === 'CREATE_STUDENT') {
    const data = studentInputSchema.parse({
      name: intent.data.name, hourlyRate: intent.data.hourlyRate ?? null,
      pricingMode: intent.data.pricingMode ?? null, sessionRate: intent.data.sessionRate ?? null,
      status: intent.data.status ?? 'ACTIVE', note: intent.data.note ?? null,
      ...(intent.data.weeklySchedules !== undefined ? { weeklySchedules: intent.data.weeklySchedules, scheduleEffectiveFrom: intent.data.scheduleEffectiveFrom || vietnamTodayKey() } : {}),
    })
    proposalSummary = 'Tạo hồ sơ học viên ' + data.name
    reply = proposal('CREATE_STUDENT', { data: data as unknown as Record<string, unknown> }, proposalSummary)
  } else if (intent.action === 'UPDATE_STUDENT') {
    const resolved = resolveStudent(students, intent.target.studentName, context)
    if (!resolved.student) reply.content = resolved.error!
    else if (!Object.keys(intent.changes).length) reply.content = 'Bạn muốn thay đổi thông tin nào của ' + resolved.student.name + '?'
    else {
      const student = resolved.student
      const changes = intent.changes
      const data = studentInputSchema.parse({
        id: student.id, name: changes.name ?? student.name,
        hourlyRate: changes.hourlyRate === undefined ? student.hourlyRate : changes.hourlyRate,
        pricingMode: changes.pricingMode === undefined ? student.pricingMode : changes.pricingMode,
        sessionRate: changes.sessionRate === undefined ? student.sessionRate : changes.sessionRate,
        status: changes.status ?? student.status, note: changes.note === undefined ? student.note : changes.note,
        ...(changes.weeklySchedules !== undefined ? {
          weeklySchedules: changes.weeklySchedules,
          scheduleEffectiveFrom: changes.scheduleEffectiveFrom || vietnamTodayKey(),
        } : {}),
      })
      proposalSummary = 'Cập nhật hồ sơ học viên ' + student.name
      reply = proposal('UPDATE_STUDENT', { data: data as unknown as Record<string, unknown>, studentId: student.id }, proposalSummary)
      nextContext = contextWith(context, { activeStudentId: student.id, activeStudentName: student.name })
    }
  } else if (intent.action === 'LIST_SESSIONS') {
    const filters = intent.filters || {}
    const studentFilter = filters.studentName ? resolveStudent(students, filters.studentName, context) : null
    if (studentFilter && !studentFilter.student) reply.content = studentFilter.error!
    else {
      const prepared = await materializeRecurringSessions(uid, filters.from, filters.to)
      let result = await listTeachingSessions(uid, {
        ...(studentFilter?.student ? { studentId: studentFilter.student.id } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.needsReview !== undefined ? { needsReview: filters.needsReview } : {}),
        ...(filters.from ? { from: filters.from } : {}),
        ...(filters.to ? { to: filters.to } : {}),
        ...(filters.query ? { query: filters.query } : {}),
      }, { students: prepared.students })
      result = result.slice(0, 30)
      reply.content = textForResult(intent.action, result); reply.result = result
      if (studentFilter?.student) nextContext = contextWith(context, { activeStudentId: studentFilter.student.id, activeStudentName: studentFilter.student.name })
      if (result.length === 1) {
        const session = result[0]
        nextContext = contextWith(nextContext, {
          activeStudentId: session.studentId, activeStudentName: session.studentName,
          activeSessionId: session.id, activeSessionSummary: (session.subject || session.title) + ' · ' + displayDateTime(session.startAt),
        })
      }
    }
  } else if (intent.action === 'GET_SESSION' || intent.action === 'CANCEL_SESSION' || intent.action === 'RESTORE_SESSION' || intent.action === 'UPDATE_SESSION' || intent.action === 'COMPLETE_SESSION') {
    const target = intent.target
    const resolved = resolveSession(sessions, target, context, students)
    if (!resolved.session) reply.content = resolved.error!
    else {
      const session = await getTeachingSession(uid, resolved.session.id)
      nextContext = contextWith(context, {
        activeStudentId: session.studentId, activeStudentName: session.studentName,
        activeSessionId: session.id, activeSessionSummary: (session.subject || session.title) + ' · ' + displayDateTime(session.startAt),
      })
      if (intent.action === 'GET_SESSION') {
        reply.content = textForResult(intent.action, session); reply.result = session
      } else if (intent.action === 'CANCEL_SESSION') {
        proposalSummary = 'Hủy buổi ' + (session.subject || session.title) + ' của ' + session.studentName + ' ngày ' + displayDateTime(session.startAt)
        reply = proposal('CANCEL_SESSION', { sessionId: session.id, reason: intent.reason ?? null }, proposalSummary)
      } else if (intent.action === 'RESTORE_SESSION') {
        proposalSummary = 'Khôi phục buổi ' + (session.subject || session.title) + ' của ' + session.studentName
        reply = proposal('RESTORE_SESSION', { sessionId: session.id }, proposalSummary)
      } else if (intent.action === 'UPDATE_SESSION') {
        const changes = intent.changes
        if (!Object.keys(changes).length) {
          reply.content = 'Bạn muốn thay đổi thông tin nào của buổi học này?'
        } else {
          const studentForSession = changes.studentName ? resolveStudent(students, changes.studentName, context) : { student: students.find(student => student.id === session.studentId), error: undefined }
          if (!studentForSession.student) reply.content = studentForSession.error || 'Không tìm thấy học viên.'
          else {
            const data = sessionInputSchema.parse({
              id: session.id, studentId: studentForSession.student.id,
              title: changes.title ?? session.title, subject: changes.subject === undefined ? session.subject : changes.subject,
              startAt: changes.startAt ?? session.startAt, scheduledDurationMinutes: changes.scheduledDurationMinutes ?? session.scheduledDurationMinutes,
              goals: changes.goals ?? session.goals.map(goal => ({ id: goal.id, title: goal.title })),
            })
            proposalSummary = 'Sửa buổi ' + (data.subject || data.title) + ' của ' + studentForSession.student.name
            reply = proposal('UPDATE_SESSION', { data: data as unknown as Record<string, unknown>, sessionId: session.id }, proposalSummary)
          }
        }
      } else {
        const data = intent.data
        const missing: string[] = []
        if (!data.evaluationNote) missing.push('nhận xét sau buổi học')
        if (data.progressPercent === undefined) missing.push('tiến độ học tập')
        const missingGoals = session.goals.filter(goal => !data.goals?.some(item => normalize(item.title) === normalize(goal.title)))
        if (missingGoals.length) missing.push('trạng thái mục tiêu ' + missingGoals.map(goal => '“' + goal.title + '”').join(', '))
        if (missing.length) reply.content = 'Để ghi nhận kết quả buổi học, bạn cho mình biết ' + missing.join(', ') + ' nhé.'
        else {
          const goalResults = session.goals.map(goal => {
            const matched = data.goals?.find(item => normalize(item.title) === normalize(goal.title))
            return { id: goal.id, isCompleted: matched?.isCompleted ?? false }
          })
          const completion = {
            sessionId: session.id,
            actualDurationMinutes: data.actualDurationMinutes ?? session.scheduledDurationMinutes,
            progressPercent: data.progressPercent!,
            evaluationNote: data.evaluationNote!,
            goals: goalResults,
          }
          completionInputSchema.parse(completion)
          const expectedFee = calculateSessionFee(session.pricingModeSnapshot, session.unitRateSnapshot ?? session.hourlyRateSnapshot ?? 0, completion.actualDurationMinutes)
          proposalSummary = 'Ghi nhận kết quả buổi ' + (session.subject || session.title) + ' của ' + session.studentName + ' · ' + completion.actualDurationMinutes + ' phút thực tế · học phí ' + formatVnd(expectedFee)
          reply = proposal('COMPLETE_SESSION', { data: completion as unknown as Record<string, unknown>, sessionId: session.id }, proposalSummary)
        }
      }
    }
  } else if (intent.action === 'CREATE_SESSION') {
    const studentResult = resolveStudent(students, intent.data.studentName, context)
    if (!studentResult.student) reply.content = studentResult.error!
    else if (studentResult.student.status !== 'ACTIVE') reply.content = 'Học viên ' + studentResult.student.name + ' đang tạm nghỉ. Hãy kích hoạt hồ sơ trước khi tạo buổi mới.'
    else {
      const startAt = intent.data.startAt
      const duration = intent.data.scheduledDurationMinutes ?? memory.defaultDurationMinutes ?? undefined
      const subject = intent.data.subject ?? memory.defaultSubject ?? null
      const title = intent.data.title ?? subject ?? ''
      if (!startAt || !duration || !title) {
        const missing = [!startAt ? 'ngày và giờ học' : '', !duration ? 'thời lượng buổi' : '', !title ? 'môn học hoặc tên buổi' : ''].filter(Boolean)
        reply.content = 'Bạn cho mình biết ' + missing.join(', ') + ' để tạo lịch nhé.'
      } else {
        const data = sessionInputSchema.parse({
          studentId: studentResult.student.id, title, subject, startAt,
          scheduledDurationMinutes: duration, goals: intent.data.goals || [],
        })
        proposalSummary = 'Tạo buổi ' + (data.subject || data.title) + ' cho ' + studentResult.student.name + ' · ' + displayDateTime(data.startAt) + ' · ' + duration + ' phút'
        reply = proposal('CREATE_SESSION', { data: data as unknown as Record<string, unknown>, studentName: studentResult.student.name }, proposalSummary)
        nextContext = contextWith(context, { activeStudentId: studentResult.student.id, activeStudentName: studentResult.student.name })
      }
    }
  } else if (intent.action === 'DASHBOARD') {
    const [data, activeStudents] = await Promise.all([teachingDashboard(uid), Promise.resolve(students.filter(student => student.status === 'ACTIVE').length)])
    const result = { ...data, activeStudents }
    reply.content = textForResult(intent.action, result); reply.result = result
  } else if (intent.action === 'MONTH_OVERVIEW') {
    const key = vietnamMonthKey(new Date().toISOString())
    const [currentYear, currentMonth] = key.split('-').map(Number)
    const year = intent.year ?? currentYear
    const month = intent.month ?? currentMonth
    await materializeRecurringSessions(uid, new Date(Date.UTC(year, month - 1, 1, -7)).toISOString(), new Date(Date.UTC(year, month, 1, -7)).toISOString())
    let result = await teachingMonthOverview(uid, year, month - 1)
    if (intent.studentName) {
      const studentResult = resolveStudent(students, intent.studentName, context)
      if (!studentResult.student) {
        reply.content = studentResult.error!
      } else {
        const rows = result.rows.filter(row => row.studentId === studentResult.student!.id)
        result = {
          ...result,
          rows,
          totalActualDurationMinutes: rows.reduce((sum, row) => sum + row.actualDurationMinutes, 0),
          totalFeeAmount: rows.reduce((sum, row) => sum + row.feeAmount, 0),
        }
        nextContext = contextWith(context, { activeStudentId: studentResult.student.id, activeStudentName: studentResult.student.name })
      }
    }
    if (!reply.content) { reply.content = textForResult(intent.action, result); reply.result = result }
  } else if (intent.action === 'GET_SETTINGS') {
    const result = await getTeachingSettings(uid)
    reply.content = textForResult(intent.action, result); reply.result = result
  } else if (intent.action === 'UPDATE_SETTINGS') {
    const data = teachingSettingsSchema.parse(intent.data)
    proposalSummary = 'Cập nhật cài đặt học phí chung'
    reply = proposal('UPDATE_SETTINGS', { data: data as Record<string, unknown> }, proposalSummary)
  } else if (intent.action === 'REMEMBER') {
    const data = { note: intent.note, defaultSubject: intent.defaultSubject ?? memory.defaultSubject, defaultDurationMinutes: intent.defaultDurationMinutes ?? memory.defaultDurationMinutes }
    proposalSummary = 'Ghi nhớ cho trợ lý dạy thêm: ' + data.note
    reply = proposal('REMEMBER', data, proposalSummary)
  } else if (intent.action === 'CLEAR_MEMORY') {
    nextMemory = await clearTeachingAssistantMemory(uid)
    reply.content = 'Mình đã xóa bộ nhớ dạy thêm lâu dài. Lịch sử chat và dữ liệu học viên/buổi học vẫn được giữ.'
  }

  if (reply.status === 'pending' && reply.proposal) {
    nextContext = contextWith(nextContext, { pendingDraft: { action: reply.proposal.action, summary: reply.proposal.summary } })
    reply.content = proposalSummary ? 'Mình đã chuẩn bị đề xuất: ' + proposalSummary + '. Kiểm tra thông tin rồi xác nhận để lưu.' : reply.content
  } else if (nextContext.pendingDraft) nextContext = contextWith(nextContext, { pendingDraft: null })
  return { requestId, text, reply, context: nextContext, memory: nextMemory, proposalSummary }
}

export async function executeTeachingChatProposal(uid: string, pending: NonNullable<TeachingChatMessage['proposal']>) {
  const data = pending.data
  if (pending.action === 'CREATE_STUDENT' || pending.action === 'UPDATE_STUDENT') {
    const input = studentInputSchema.parse(data.data)
    const saved = await saveStudent(uid, input)
    return { content: 'Đã lưu hồ sơ học viên ' + saved.name + '.', data: saved }
  }
  if (pending.action === 'CREATE_SESSION' || pending.action === 'UPDATE_SESSION') {
    const input = sessionInputSchema.parse(data.data)
    const conflicts = await findSessionConflicts(uid, input)
    if (conflicts.length) throw new Error('Học viên đã có buổi học trùng thời gian. Hãy kiểm tra lịch trước khi xác nhận.')
    const saved = await saveTeachingSession(uid, input)
    return { content: 'Đã lưu lịch học ' + (saved.subject || saved.title) + ' của ' + saved.studentName + ' vào ' + displayDateTime(saved.startAt) + '.', data: saved }
  }
  if (pending.action === 'CANCEL_SESSION' || pending.action === 'RESTORE_SESSION') {
    const saved = await setSessionCancelled(uid, String(data.sessionId), pending.action === 'CANCEL_SESSION', data.reason ? String(data.reason) : null)
    return { content: pending.action === 'CANCEL_SESSION' ? 'Đã hủy buổi học.' : 'Đã khôi phục buổi học.', data: saved }
  }
  if (pending.action === 'COMPLETE_SESSION') {
    const input = completionInputSchema.parse(data.data)
    const saved = await completeTeachingSession(uid, input)
    return { content: 'Đã ghi nhận buổi học. Học phí được tính là ' + formatVnd(saved.feeAmount || 0) + '.', data: saved }
  }
  if (pending.action === 'UPDATE_SETTINGS') {
    const input = teachingSettingsSchema.parse(data.data)
    const saved = await saveTeachingSettings(uid, input)
    return { content: 'Đã cập nhật cài đặt học phí chung.', data: saved }
  }
  if (pending.action === 'REMEMBER') {
    const saved = await setTeachingAssistantMemory(uid, {
      note: String(data.note || ''),
      defaultSubject: data.defaultSubject == null ? null : String(data.defaultSubject),
      defaultDurationMinutes: data.defaultDurationMinutes == null ? null : Number(data.defaultDurationMinutes),
    })
    return { content: 'Mình đã lưu ghi nhớ dạy thêm cho những lần trò chuyện sau.', data: saved }
  }
  throw new Error('Đề xuất này không còn được hỗ trợ.')
}

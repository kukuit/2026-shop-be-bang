const test = require('node:test')
const assert = require('node:assert/strict')
const harness = require('./lib/ai-task-test-harness.cjs')
const pricingMigration = require('./migrate-teaching-pricing.cjs')
const { NextRequest } = require('next/server')
const model = harness.load('_lib/teaching-model.ts')
const repo = harness.load('_services/teaching.repository.ts')
const route = harness.load('api/teaching/route.ts')

let serial = 0
const id = () => `teaching_${++serial}`
const makeStudent = (name = 'Học viên', hourlyRate = null, status = 'ACTIVE', pricing = {}) => repo.saveStudent('alice', { name, hourlyRate, pricingMode: pricing.pricingMode ?? null, sessionRate: pricing.sessionRate ?? null, status, note: null })
const futureStartAt = () => new Date(Date.now() + 2 * 24 * 60 * 60_000).toISOString()
const makeSession = (studentId, overrides = {}) => repo.saveTeachingSession('alice', {
  studentId,
  title: 'Toán lớp 2',
  subject: 'Toán',
  startAt: futureStartAt(),
  scheduledDurationMinutes: 90,
  goals: [{ title: 'Ôn số đến 100' }, { title: 'So sánh số' }, { title: 'Toán có lời văn' }],
  ...overrides,
})
const complete = (session, overrides = {}) => repo.completeTeachingSession('alice', {
  sessionId: session.id,
  actualDurationMinutes: 90,
  progressPercent: 80,
  evaluationNote: 'Bé hiểu bài tốt.',
  goals: session.goals.map((goal, index) => ({ id: goal.id, isCompleted: index < 2 })),
  ...overrides,
})
const post = body => route.POST(new NextRequest('http://localhost/demo/ai-task/api/teaching', { method: 'POST', headers: { origin: 'http://localhost' }, body: JSON.stringify(body) }))

test.beforeEach(() => { harness.reset(); serial = 0 })

test('pricing migration preserves existing hourly defaults and safely identifies legacy session rates', () => {
  assert.deepEqual(pricingMigration.planSettingsPatch({ defaultHourlyRate: 25_000 }), {
    defaultPricingMode: 'PER_SESSION', defaultSessionRate: 50_000,
  })
  assert.deepEqual(pricingMigration.planStudentPatch({ hourlyRate: 25_000 }), { pricingMode: 'PER_HOUR', sessionRate: null })

  const legacyStudent = { hourlyRate: 25_000 }
  const settings = { defaultPricingMode: 'PER_SESSION', defaultSessionRate: 50_000, defaultHourlyRate: 25_000 }
  const legacy = pricingMigration.planSessionPatch({ status: 'SCHEDULED', hourlyRateSnapshot: 25_000 }, legacyStudent, settings)
  assert.equal(legacy.patch.pricingModeSnapshot, 'PER_HOUR')
  assert.equal(legacy.patch.unitRateSnapshot, 25_000)
  assert.equal(legacy.patch.pricingOverride, false)
  assert.equal(legacy.unresolvedPricing, false)

  const historical = pricingMigration.planSessionPatch({ status: 'COMPLETED', hourlyRateSnapshot: 25_000, feeAmount: 37_500 }, legacyStudent, settings)
  assert.equal(historical.patch.feeAmount, undefined)
  assert.equal(historical.completedMissingFee, false)
  const missingSnapshot = pricingMigration.planSessionPatch({ status: 'SCHEDULED', feeAmount: 10_000 }, legacyStudent, settings)
  assert.equal(missingSnapshot.unresolvedPricing, true)
  assert.equal(missingSnapshot.patch.feeAmount, null)
})

test('new settings default to per-session pricing and preserve account isolation', async () => {
  const alice = await repo.getTeachingSettings('alice')
  assert.equal(alice.defaultPricingMode, 'PER_SESSION')
  assert.equal(alice.defaultSessionRate, 50_000)
  assert.equal(alice.defaultHourlyRate, 30_000)
  await repo.saveTeachingSettings('alice', { defaultPricingMode: 'PER_SESSION', defaultSessionRate: 65_000 })
  assert.equal((await repo.getTeachingSettings('alice')).defaultSessionRate, 65_000)
  assert.equal((await repo.getTeachingSettings('alice')).defaultHourlyRate, 30_000)
  assert.equal((await repo.getTeachingSettings('bob')).defaultSessionRate, 50_000)
})

test('fee calculation keeps per-session prices fixed and prorates per-hour prices', () => {
  for (const duration of [60, 90, 120]) assert.equal(model.calculateSessionFee('PER_SESSION', 50_000, duration), 50_000)
  assert.equal(model.calculateSessionFee('PER_HOUR', 30_000, 60), 30_000)
  assert.equal(model.calculateSessionFee('PER_HOUR', 30_000, 90), 45_000)
  assert.equal(model.calculateSessionFee('PER_HOUR', 30_000, 120), 60_000)
  assert.equal(model.calculateSessionFee('PER_HOUR', 30_001, 1), 500)
})

test('new session pricing is resolved from student override or account default and snapshotted', async () => {
  const defaultStudent = await makeStudent('Minh Anh')
  const customStudent = await makeStudent('Thiên Phúc', null, 'ACTIVE', { pricingMode: 'PER_SESSION', sessionRate: 70_000 })
  const normal = await makeSession(defaultStudent.id)
  const custom = await makeSession(customStudent.id, { title: 'Tiếng Việt' })
  assert.equal(normal.unitRateSnapshot, 50_000)
  await repo.saveTeachingSettings('alice', { defaultSessionRate: 60_000 })
  const synced = await repo.getTeachingSession('alice', normal.id)
  assert.equal(synced.pricingModeSnapshot, 'PER_SESSION')
  assert.equal(synced.unitRateSnapshot, 60_000)
  assert.equal(custom.pricingModeSnapshot, 'PER_SESSION')
  assert.equal(custom.unitRateSnapshot, 70_000)
  assert.equal((await repo.getTeachingSession('alice', custom.id)).unitRateSnapshot, 70_000)
})

test('inactive students remain available in history but cannot be assigned a new session', async () => {
  const student = await makeStudent('Nhật Anh')
  const session = await makeSession(student.id)
  await repo.saveStudent('alice', { id: student.id, name: student.name, hourlyRate: null, status: 'INACTIVE', note: null })
  const history = await repo.listTeachingSessions('alice', { studentId: student.id })
  assert.equal(history.length, 1)
  assert.equal(history[0].studentStatus, 'INACTIVE')
  await assert.rejects(() => makeSession(student.id, { title: 'Buổi mới' }), /Chỉ chọn học viên/)
})

test('goal completion rate stays separate from teacher rating and completion fee is calculated on the server', async () => {
  const student = await makeStudent()
  const session = await makeSession(student.id)
  const completed = await complete(session)
  assert.equal(completed.goalCompletionRate, 67)
  assert.equal(completed.progressPercent, 80)
  assert.equal(completed.feeAmount, 50_000)
  assert.equal(completed.pricingModeSnapshot, 'PER_SESSION')
  assert.equal(completed.status, 'COMPLETED')
})

test('scheduled and cancelled sessions do not hold a fee; per-session duration edits keep the fee fixed', async () => {
  const student = await makeStudent()
  const scheduled = await makeSession(student.id)
  assert.equal(scheduled.feeAmount, null)
  const cancelled = await repo.setSessionCancelled('alice', scheduled.id, true)
  assert.equal(cancelled.feeAmount, null)
  const active = await makeSession(student.id)
  const completed = await complete(active, { actualDurationMinutes: 60 })
  const revised = await complete(completed, { actualDurationMinutes: 120 })
  assert.equal(completed.feeAmount, 50_000)
  assert.equal(revised.feeAmount, 50_000)
})

test('hourly session fees use the saved rate and review overrides recalculate from actual minutes', async () => {
  const student = await makeStudent('Duy Quý', 30_000, 'ACTIVE', { pricingMode: 'PER_HOUR' })
  const completed = await complete(await makeSession(student.id))
  const revised = await complete(completed, { actualDurationMinutes: 120, progressPercent: 75, evaluationNote: 'Đã cập nhật.' })
  assert.equal(revised.feeAmount, 60_000)
  const overridden = await complete(revised, { actualDurationMinutes: 120, pricingOverride: true, unitRateSnapshot: 33_000 })
  assert.equal(overridden.feeAmount, 66_000)
  const finalized = await complete(overridden, { actualDurationMinutes: 90, pricingOverride: false })
  assert.equal(finalized.feeAmount, 45_000)
  assert.equal(finalized.pricingOverride, false)
  const finalEdit = await complete(finalized, { actualDurationMinutes: 120, progressPercent: 75, evaluationNote: 'Đã cập nhật.' })
  assert.equal(finalEdit.feeAmount, 60_000)
  assert.equal(finalEdit.actualDurationMinutes, 120)
  assert.equal(finalEdit.progressPercent, 75)
  assert.equal(finalEdit.evaluationNote, 'Đã cập nhật.')
  assert.equal(finalEdit.completedAt, completed.completedAt)
})

test('goals can be edited while scheduled and completion writes session and goal states atomically', async () => {
  const student = await makeStudent()
  let session = await makeSession(student.id)
  session = await repo.saveTeachingSession('alice', { id: session.id, studentId: student.id, title: session.title, subject: session.subject, startAt: session.startAt, scheduledDurationMinutes: 100, hourlyRateSnapshot: session.hourlyRateSnapshot, goals: [{ id: session.goals[0].id, title: 'Mục tiêu đã sửa' }, { title: 'Mục tiêu mới' }] })
  assert.equal(session.goals.length, 2)
  assert.equal(session.goals[0].title, 'Mục tiêu đã sửa')
  assert.equal(session.scheduledDurationMinutes, 100)
  harness.failNextCommit()
  await assert.rejects(() => complete(session))
  const unchanged = await repo.getTeachingSession('alice', session.id)
  assert.equal(unchanged.status, 'SCHEDULED')
  assert.equal(unchanged.goals.some(goal => goal.isCompleted), false)
  await complete(session)
  await assert.rejects(() => repo.saveTeachingSession('alice', { id: session.id, studentId: student.id, title: 'Đổi', subject: null, startAt: session.startAt, scheduledDurationMinutes: 90, goals: [] }), /Chỉ có thể sửa/)
})

test('overlap checks include only scheduled sessions and ignore other students', async () => {
  const firstStudent = await makeStudent('An')
  const secondStudent = await makeStudent('Bình')
  const first = await makeSession(firstStudent.id)
  const overlapStart = new Date(Date.parse(first.startAt) + 30 * 60_000).toISOString()
  const overlap = await repo.findSessionConflicts('alice', { studentId: firstStudent.id, startAt: overlapStart, scheduledDurationMinutes: 60 })
  assert.equal(overlap.length, 1)
  assert.equal((await repo.findSessionConflicts('alice', { studentId: secondStudent.id, startAt: overlapStart, scheduledDurationMinutes: 60 })).length, 0)
  await complete(first)
  assert.equal((await repo.findSessionConflicts('alice', { studentId: firstStudent.id, startAt: overlapStart, scheduledDurationMinutes: 60 })).length, 0)
})

test('review queue only contains scheduled sessions that have ended and keeps the dashboard count in sync', async () => {
  const student = await makeStudent('Cần đánh giá')
  const overdue = await makeSession(student.id, { startAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString(), scheduledDurationMinutes: 60 })
  await makeSession(student.id, { title: 'Sắp học', startAt: new Date(Date.now() + 2 * 60 * 60_000).toISOString() })
  const completed = await makeSession(student.id, { title: 'Đã đánh giá', startAt: new Date(Date.now() - 5 * 60 * 60_000).toISOString() })
  await complete(completed)

  const needsReview = await repo.listTeachingSessions('alice', { needsReview: true })
  const dashboard = await repo.teachingDashboard('alice')
  assert.deepEqual(needsReview.map(session => session.id), [overdue.id])
  assert.equal(await repo.teachingReviewCount('alice'), 1)
  assert.equal(dashboard.reviewCount, 1)
  assert.equal(dashboard.overdueSessions[0].id, overdue.id)
})

test('cancellation reason is visible in details and is cleared when a session is restored', async () => {
  const student = await makeStudent('Nghỉ học')
  const session = await makeSession(student.id)
  const cancelled = await repo.setSessionCancelled('alice', session.id, true, 'Học viên xin nghỉ vì bị ốm.')
  assert.equal(cancelled.cancellationReason, 'Học viên xin nghỉ vì bị ốm.')
  const restored = await repo.setSessionCancelled('alice', session.id, false)
  assert.equal(restored.status, 'SCHEDULED')
  assert.equal(restored.cancellationReason, null)
})

test('monthly totals use session start time in Vietnam, include completed sessions only, and keep owners isolated', async () => {
  const student = await makeStudent('Cô Mai')
  const hourlyStudent = await makeStudent('Học viên theo giờ', 30_000, 'ACTIVE', { pricingMode: 'PER_HOUR' })
  const october = await makeSession(student.id, { startAt: '2026-10-31T16:30:00.000Z', title: 'Buổi cuối tháng' })
  const november = await makeSession(student.id, { startAt: '2026-10-31T17:30:00.000Z', title: 'Buổi đầu tháng sau' })
  const octoberHourly = await makeSession(hourlyStudent.id, { startAt: '2026-10-12T10:00:00.000Z', title: 'Buổi theo giờ' })
  await complete(october)
  await complete(november)
  await complete(octoberHourly)
  const cancelled = await makeSession(student.id, { startAt: '2026-10-20T11:00:00.000Z', title: 'Buổi hủy' })
  await repo.setSessionCancelled('alice', cancelled.id, true)
  const octoberStats = await repo.teachingMonthOverview('alice', 2026, 9)
  const novemberStats = await repo.teachingMonthOverview('alice', 2026, 10)
  assert.equal(octoberStats.rows.reduce((sum, row) => sum + row.completedSessions, 0), 2)
  assert.equal(octoberStats.totalFeeAmount, 95_000)
  assert.equal(novemberStats.rows[0].completedSessions, 1)
  assert.equal((await repo.listStudents('bob')).length, 0)
  assert.deepEqual(model.vietnamMonthRange(2026, 9), { from: '2026-09-30T17:00:00.000Z', to: '2026-10-31T17:00:00.000Z' })
  assert.equal(model.vietnamMonthKey('2026-10-31T17:30:00.000Z'), '2026-11')
  assert.equal(model.calculateTeachingFee(90, 25_000), 37_500)
})

test('weekly schedule records are stored separately and rolling occurrence generation is idempotent', async () => {
  const today = model.vietnamTodayKey()
  const student = await repo.saveStudent('alice', {
    name: 'Lịch tuần', hourlyRate: null, status: 'ACTIVE', note: null,
    scheduleEffectiveFrom: today,
    weeklySchedules: [{ dayOfWeek: model.vietnamDayOfWeek(today), startTime: '18:15', durationMinutes: 90 }],
  })
  const data = harness.data()
  const studentDoc = data.get(`demo/ai-task/users/alice/students/${student.id}`)
  const scheduleDocs = [...data.entries()].filter(([path]) => path.startsWith('demo/ai-task/users/alice/weeklySchedules/'))
  assert.equal(Object.hasOwn(studentDoc, 'weeklySchedules'), false)
  assert.equal(scheduleDocs.length, 1)
  assert.equal(scheduleDocs[0][1].studentId, student.id)
  assert.equal(scheduleDocs[0][1].effectiveFrom, today)
  const first = await repo.listTeachingSessions('alice', { studentId: student.id })
  assert.ok(first.length >= 4)
  assert.ok(first.every(session => session.source === 'RECURRING' && session.weeklyScheduleId && session.occurrenceDate))
  await Promise.all([repo.materializeRecurringSessions('alice'), repo.materializeRecurringSessions('alice'), repo.materializeRecurringSessions('alice')])
  const second = await repo.listTeachingSessions('alice', { studentId: student.id })
  assert.equal(second.length, first.length)
  assert.equal(new Set(second.map(session => session.id)).size, second.length)
  assert.deepEqual(second.map(session => session.updatedAt), first.map(session => session.updatedAt))
})

test('a requested future calendar range is materialized outside the rolling window', async () => {
  const today = model.vietnamTodayKey()
  const student = await repo.saveStudent('alice', {
    name: 'Lịch xa', hourlyRate: null, status: 'ACTIVE', note: null, scheduleEffectiveFrom: today,
    weeklySchedules: [{ dayOfWeek: model.vietnamDayOfWeek(today), startTime: '10:00', durationMinutes: 45 }],
  })
  const expectedDate = model.shiftVietnamDate(today, 35)
  await repo.materializeRecurringSessions('alice', model.vietnamDateTime(expectedDate, '00:00'), model.vietnamDateTime(model.shiftVietnamDate(expectedDate, 7), '00:00'))
  const sessions = await repo.listTeachingSessions('alice', { studentId: student.id, from: model.vietnamDateTime(expectedDate, '00:00'), to: model.vietnamDateTime(model.shiftVietnamDate(expectedDate, 1), '00:00') })
  assert.equal(sessions.filter(session => session.occurrenceDate === expectedDate).length, 1)
})

test('legacy session documents read as manual sessions without rewriting stored data', async () => {
  const student = await makeStudent('Lịch cũ')
  const path = `demo/ai-task/users/alice/teachingSessions/legacy-session`
  harness.put(path, {
    userId: 'alice', studentId: student.id, title: 'Buổi học trước đây', subject: null,
    startAt: '2026-10-08T10:00:00.000Z', scheduledDurationMinutes: 60, actualDurationMinutes: null,
    status: 'SCHEDULED', progressPercent: null, evaluationNote: null, hourlyRateSnapshot: 25_000,
    feeAmount: null, completedAt: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
  })
  const session = await repo.getTeachingSession('alice', 'legacy-session')
  assert.equal(session.source, 'MANUAL')
  assert.equal(session.weeklyScheduleId, null)
  assert.equal(session.occurrenceDate, null)
  assert.equal(session.isOverride, false)
  assert.equal(session.lifecycleStatus, 'ACTIVE')
  assert.equal(Object.hasOwn(harness.data().get(path), 'source'), false)
})

test('legacy students without a pricing mode retain their hourly pricing behavior', async () => {
  const path = 'demo/ai-task/users/alice/students/legacy-student'
  harness.put(path, { userId: 'alice', name: 'Học viên cũ', hourlyRate: 28_000, status: 'ACTIVE', note: null })
  const students = await repo.listStudents('alice')
  assert.equal(students[0].pricingMode, 'PER_HOUR')
  const session = await makeSession('legacy-student')
  assert.equal(session.pricingModeSnapshot, 'PER_HOUR')
  assert.equal(session.unitRateSnapshot, 28_000)
  assert.equal(harness.data().get(path).pricingMode, undefined)
})

test('price updates sync future scheduled sessions but preserve overrides and completed fees', async () => {
  const student = await makeStudent('Đồng bộ giá', 30_000, 'ACTIVE', { pricingMode: 'PER_HOUR' })
  const scheduled = await makeSession(student.id)
  const overridden = await makeSession(student.id, { title: 'Buổi có giá riêng' })
  const custom = await repo.saveTeachingSession('alice', {
    id: overridden.id, studentId: student.id, title: overridden.title, subject: overridden.subject,
    startAt: overridden.startAt, scheduledDurationMinutes: overridden.scheduledDurationMinutes,
    pricingOverride: true, unitRateSnapshot: 33_000, goals: overridden.goals.map(goal => ({ id: goal.id, title: goal.title })),
  })
  const completed = await complete(await makeSession(student.id, { title: 'Buổi đã hoàn thành' }))
  const cancelled = await makeSession(student.id, { title: 'Buổi đã hủy' })
  await repo.setSessionCancelled('alice', cancelled.id, true)

  await repo.saveStudent('alice', { id: student.id, name: student.name, hourlyRate: 45_000, pricingMode: 'PER_HOUR', sessionRate: null, status: student.status, note: student.note })
  assert.equal((await repo.getTeachingSession('alice', scheduled.id)).unitRateSnapshot, 45_000)
  assert.equal((await repo.getTeachingSession('alice', custom.id)).unitRateSnapshot, 33_000)
  const completedAfter = await repo.getTeachingSession('alice', completed.id)
  assert.equal(completedAfter.unitRateSnapshot, 30_000)
  assert.equal(completedAfter.feeAmount, completed.feeAmount)
  assert.equal((await repo.getTeachingSession('alice', cancelled.id)).unitRateSnapshot, 30_000)
  assert.equal((await repo.getTeachingSession('alice', cancelled.id)).feeAmount, null)
})

test('schedule override does not block future session price synchronization', async () => {
  const date = model.shiftVietnamDate(model.vietnamTodayKey(), 1)
  const student = await repo.saveStudent('alice', {
    name: 'Lịch và giá độc lập', hourlyRate: 30_000, pricingMode: 'PER_HOUR', sessionRate: null,
    status: 'ACTIVE', note: null, scheduleEffectiveFrom: date,
    weeklySchedules: [{ dayOfWeek: model.vietnamDayOfWeek(date), startTime: '17:00', durationMinutes: 60 }],
  })
  const target = (await repo.listTeachingSessions('alice', { studentId: student.id })).find(session => session.occurrenceDate === date)
  assert.ok(target)
  const edited = await repo.saveTeachingSession('alice', {
    id: target.id, studentId: student.id, title: target.title, subject: target.subject, startAt: target.startAt,
    scheduledDurationMinutes: target.scheduledDurationMinutes, goals: target.goals.map(goal => ({ id: goal.id, title: goal.title })),
  })
  assert.equal(edited.isOverride, true)
  assert.equal(edited.pricingOverride, false)
  await repo.saveStudent('alice', { id: student.id, name: student.name, hourlyRate: 42_000, pricingMode: 'PER_HOUR', sessionRate: null, status: student.status, note: student.note })
  const synced = await repo.getTeachingSession('alice', target.id)
  assert.equal(synced.isOverride, true)
  assert.equal(synced.unitRateSnapshot, 42_000)
})

test('schedule revisions move only eligible future sessions and preserve completed history', async () => {
  const today = model.vietnamTodayKey()
  let student = await repo.saveStudent('alice', {
    name: 'Đổi lịch', hourlyRate: null, status: 'ACTIVE', note: null, scheduleEffectiveFrom: today,
    weeklySchedules: [{ dayOfWeek: model.vietnamDayOfWeek(today), startTime: '17:00', durationMinutes: 90 }],
  })
  const oldSchedule = student.weeklySchedules[0]
  const sessions = await repo.listTeachingSessions('alice', { studentId: student.id })
  const completed = await complete(sessions[0])
  student = await repo.saveStudent('alice', {
    id: student.id, name: student.name, hourlyRate: student.hourlyRate, status: student.status, note: student.note,
    scheduleEffectiveFrom: today,
    weeklySchedules: [{ seriesId: oldSchedule.seriesId, dayOfWeek: oldSchedule.dayOfWeek, startTime: '19:30', durationMinutes: 75 }],
  })
  const revised = await repo.getTeachingSession('alice', completed.id)
  assert.equal(revised.status, 'COMPLETED')
  assert.equal(revised.startAt, completed.startAt)
  const changedVersion = harness.data().get(`demo/ai-task/users/alice/weeklySchedules/${oldSchedule.id}`)
  assert.equal(changedVersion.startTime, '19:30')
  assert.equal(changedVersion.durationMinutes, 75)
  const scheduled = (await repo.listTeachingSessions('alice', { studentId: student.id })).filter(session => session.status === 'SCHEDULED')
  assert.ok(scheduled.length)
  assert.ok(scheduled.every(session => new Date(session.startAt).getUTCHours() === 12))
  assert.ok(scheduled.every(session => session.scheduledDurationMinutes === 75))
})

test('recurring session edits become overrides and cancellation is not regenerated', async () => {
  const today = model.vietnamTodayKey()
  const weekday = model.vietnamDayOfWeek(today)
  const student = await repo.saveStudent('alice', {
    name: 'Ngoại lệ', hourlyRate: null, status: 'ACTIVE', note: null, scheduleEffectiveFrom: today,
    weeklySchedules: [{ dayOfWeek: weekday, startTime: '16:00', durationMinutes: 60 }],
  })
  const scheduled = await repo.listTeachingSessions('alice', { studentId: student.id })
  const target = scheduled.find(session => session.occurrenceDate > today)
  assert.ok(target)
  const overrideStart = new Date(Date.parse(target.startAt) + 60 * 60_000).toISOString()
  const overridden = await repo.saveTeachingSession('alice', {
    id: target.id, studentId: student.id, title: target.title, subject: target.subject, startAt: overrideStart,
    scheduledDurationMinutes: target.scheduledDurationMinutes, goals: target.goals.map(goal => ({ id: goal.id, title: goal.title })),
  })
  assert.equal(overridden.source, 'RECURRING')
  assert.equal(overridden.isOverride, true)
  assert.equal(overridden.occurrenceDate, target.occurrenceDate)
  await repo.materializeRecurringSessions('alice')
  assert.equal((await repo.getTeachingSession('alice', target.id)).startAt, overrideStart)

  const cancelledTarget = scheduled.find(session => session.id !== target.id && session.status === 'SCHEDULED')
  assert.ok(cancelledTarget)
  await repo.setSessionCancelled('alice', cancelledTarget.id, true)
  await repo.materializeRecurringSessions('alice')
  assert.equal((await repo.getTeachingSession('alice', cancelledTarget.id)).status, 'CANCELLED')
})

test('removing a recurring slot hides its future generated sessions without treating them as cancellations', async () => {
  const today = model.vietnamTodayKey()
  const student = await repo.saveStudent('alice', {
    name: 'Gỡ lịch', hourlyRate: null, status: 'ACTIVE', note: null, scheduleEffectiveFrom: today,
    weeklySchedules: [{ dayOfWeek: model.vietnamDayOfWeek(today), startTime: '15:00', durationMinutes: 60 }],
  })
  const future = (await repo.listTeachingSessions('alice', { studentId: student.id })).find(session => session.occurrenceDate > today)
  assert.ok(future)
  await repo.saveStudent('alice', {
    id: student.id, name: student.name, hourlyRate: student.hourlyRate, status: student.status, note: student.note,
    scheduleEffectiveFrom: today, weeklySchedules: [],
  })
  assert.equal((await repo.listTeachingSessions('alice', { studentId: student.id })).some(session => session.id === future.id), false)
  assert.equal((await repo.getTeachingSession('alice', future.id)).lifecycleStatus, 'SUPERSEDED')
  assert.equal((await repo.getTeachingSession('alice', future.id)).status, 'SCHEDULED')
})

test('schedule overlap is reported for confirmation and effective dates cannot be in the past', async () => {
  const today = model.vietnamTodayKey()
  const overlapBody = { operation: 'saveStudent', data: { name: 'Trùng lịch', hourlyRate: null, status: 'ACTIVE', note: null, scheduleEffectiveFrom: today, weeklySchedules: [
    { dayOfWeek: 1, startTime: '17:00', durationMinutes: 90 },
    { dayOfWeek: 1, startTime: '18:00', durationMinutes: 60 },
  ] } }
  const conflict = await post(overlapBody)
  assert.equal(conflict.status, 409)
  assert.equal((await conflict.json()).scheduleConflicts.length, 1)
  const accepted = await post({ ...overlapBody, allowScheduleOverlap: true })
  assert.equal(accepted.status, 200)
  const student = (await accepted.json()).student
  await assert.rejects(() => repo.saveStudent('alice', {
    id: student.id, name: student.name, hourlyRate: null, status: 'ACTIVE', note: null,
    scheduleEffectiveFrom: model.shiftVietnamDate(today, -1), weeklySchedules: [],
  }), /Ngày hiệu lực/)
})

test('teaching API requires authentication, scopes reads to the signed-in user, and rejects client-supplied owners', async () => {
  const body = { operation: 'saveStudent', data: { name: 'Chỉ Alice', hourlyRate: null, status: 'ACTIVE', note: null } }
  harness.identity(null)
  assert.equal((await post(body)).status, 401)
  harness.identity('alice')
  assert.equal((await post({ ...body, data: { ...body.data, userId: 'bob' } })).status, 400)
  assert.equal((await post(body)).status, 200)
  harness.identity('bob')
  const response = await route.GET(new NextRequest('http://localhost/demo/ai-task/api/teaching?resource=students'))
  assert.equal(response.status, 200)
  assert.deepEqual((await response.json()).students, [])
})

const test = require('node:test')
const assert = require('node:assert/strict')
const harness = require('./lib/ai-task-test-harness.cjs')
const { FakeIndexedDB, KeyRange } = require('./lib/fake-indexeddb.cjs')

const indexedDB = new FakeIndexedDB()
const storage = new Map()
global.window = { indexedDB, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) } }
global.IDBKeyRange = KeyRange
global.crypto = require('node:crypto').webcrypto

const repo = harness.load('_services/offline/local-teaching.repository.ts')
const workspaces = harness.load('_services/offline/workspaces.ts')
const backup = harness.load('_services/offline/backup.ts')
const gateway = harness.load('_services/offline/local-teaching.gateway.ts')
const runtime = harness.load('_services/offline/workspace-runtime.ts')
const model = harness.load('_lib/teaching-model.ts')

test.beforeEach(() => { indexedDB.clear(); storage.clear(); runtime.setActiveTeachingWorkspace(null) })

function studentInput(name, extra = {}) {
  return { name, hourlyRate: null, pricingMode: null, sessionRate: null, status: 'ACTIVE', note: null, ...extra }
}

test('LOCAL workspaces isolate student/settings records and reload from IndexedDB', async () => {
  const first = await workspaces.createLocalWorkspace('Lớp A')
  const second = await workspaces.createLocalWorkspace('Lớp B')
  await repo.localSaveStudent(first.id, studentInput('Minh Anh'))
  await repo.localSaveStudent(second.id, studentInput('Nhật Anh'))
  assert.deepEqual((await repo.localListStudents(first.id)).map(item => item.name), ['Minh Anh'])
  assert.deepEqual((await repo.localListStudents(second.id)).map(item => item.name), ['Nhật Anh'])
  assert.equal((await repo.localGetSettings(first.id)).defaultPricingMode, 'PER_SESSION')
  assert.equal((await repo.localGetSettings(second.id)).defaultSessionRate, model.DEFAULT_SESSION_RATE)
  assert.equal((await workspaces.listLocalWorkspaces()).length, 2)
  runtime.persistActiveTeachingWorkspace({ id: first.id, name: first.name, mode: 'LOCAL' })
  runtime.setActiveTeachingWorkspace(null)
  assert.deepEqual(runtime.readPersistedWorkspaceSelection(), { id: first.id, mode: 'LOCAL' })
  assert.equal((await workspaces.getLocalWorkspace(first.id)).name, 'Lớp A')
})

test('recurring generation is idempotent and effective schedule changes preserve completed history', async () => {
  const workspace = await workspaces.createLocalWorkspace('Lớp lịch tuần')
  const today = model.vietnamTodayKey()
  const occurrence = model.shiftVietnamDate(today, 3)
  const dayOfWeek = model.vietnamDayOfWeek(occurrence)
  const student = await repo.localSaveStudent(workspace.id, studentInput('Minh Anh', { weeklySchedules: [{ dayOfWeek, startTime: '18:30', durationMinutes: 90 }], scheduleEffectiveFrom: today }))
  await repo.localMaterializeRecurringSessions(workspace.id, `${today}T00:00:00+07:00`, `${model.shiftVietnamDate(today, 20)}T00:00:00+07:00`)
  const findOccurrence = () => repo.localListSessions(workspace.id, { from: `${occurrence}T00:00:00+07:00`, to: `${model.shiftVietnamDate(occurrence, 1)}T00:00:00+07:00` }, true)
  const firstLoad = await findOccurrence()
  assert.equal(firstLoad.length, 1)
  const stableId = firstLoad[0].id
  await repo.localMaterializeRecurringSessions(workspace.id, `${today}T00:00:00+07:00`, `${model.shiftVietnamDate(today, 20)}T00:00:00+07:00`)
  assert.equal((await findOccurrence()).length, 1)
  const completed = await repo.localCompleteSession(workspace.id, { sessionId: stableId, actualDurationMinutes: 60, progressPercent: 90, evaluationNote: 'Đã học xong.', goals: [] })
  assert.equal(completed.feeAmount, model.DEFAULT_SESSION_RATE)
  const effectiveFrom = model.shiftVietnamDate(occurrence, 1)
  const schedule = student.weeklySchedules[0]
  await repo.localSaveStudent(workspace.id, studentInput(student.name, { id: student.id, weeklySchedules: [{ seriesId: schedule.seriesId, dayOfWeek: schedule.dayOfWeek, startTime: '19:00', durationMinutes: schedule.durationMinutes }], scheduleEffectiveFrom: effectiveFrom }))
  const historical = await repo.localGetSession(workspace.id, stableId)
  assert.equal(historical.status, 'COMPLETED')
  assert.equal(historical.startAt.slice(0, 10), occurrence)
  assert.equal(historical.feeAmount, model.DEFAULT_SESSION_RATE)
})

test('attendance and monthly billing use the saved pricing mode and duration', async () => {
  const workspace = await workspaces.createLocalWorkspace('Lớp học phí')
  const hourly = await repo.localSaveStudent(workspace.id, studentInput('Theo giờ', { pricingMode: 'PER_HOUR', hourlyRate: 30_000 }))
  const perSession = await repo.localSaveStudent(workspace.id, studentInput('Theo buổi', { pricingMode: 'PER_SESSION', sessionRate: 25_000 }))
  const startAt = new Date(Date.now() - 3_600_000).toISOString()
  const createSession = (studentId, title) => repo.localSaveSession(workspace.id, { studentId, title, subject: null, startAt, scheduledDurationMinutes: 90, goals: [] })
  const hourlySession = await createSession(hourly.id, 'Buổi theo giờ')
  const fixedSession = await createSession(perSession.id, 'Buổi theo buổi')
  assert.equal((await repo.localConfirmAttendance(workspace.id, hourlySession.id)).feeAmount, 45_000)
  assert.equal((await repo.localConfirmAttendance(workspace.id, fixedSession.id)).feeAmount, 25_000)
  const summary = await repo.localStudentBillingSummary(workspace.id)
  assert.equal(summary.rows.find(row => row.studentId === hourly.id).feeAmount, 45_000)
  assert.equal(summary.rows.find(row => row.studentId === perSession.id).feeAmount, 25_000)
})

test('monthly billing honors the configured Vietnamese cutoff date inclusively', async () => {
  const workspace = await workspaces.createLocalWorkspace('Kỳ học phí')
  const student = await repo.localSaveStudent(workspace.id, studentInput('Học viên'))
  const createAndComplete = async (date, title) => {
    const session = await repo.localSaveSession(workspace.id, { studentId: student.id, title, subject: null, startAt: model.vietnamDateTime(date, '18:00'), scheduledDurationMinutes: 60, goals: [] })
    return repo.localCompleteSession(workspace.id, { sessionId: session.id, actualDurationMinutes: 60, progressPercent: 100, evaluationNote: 'Đã học.', goals: [] })
  }
  await createAndComplete('2026-10-15', 'Trước ngày bắt đầu')
  await createAndComplete('2026-10-16', 'Ngày đầu kỳ')
  await createAndComplete('2026-11-15', 'Ngày chốt kỳ')
  await createAndComplete('2026-11-16', 'Sau ngày chốt')
  const summary = await repo.localStudentBillingSummary(workspace.id, new Date('2026-10-20T12:00:00+07:00'))
  assert.deepEqual([summary.period.startDate, summary.period.endDate], ['2026-10-16', '2026-11-15'])
  assert.equal(summary.rows[0].completedSessions, 2)
  assert.equal(summary.rows[0].feeAmount, 2 * model.DEFAULT_SESSION_RATE)
})

test('backup round-trip creates a new isolated workspace and rejects broken references before writing', async () => {
  const source = await workspaces.createLocalWorkspace('Lớp sao lưu')
  const today = model.vietnamTodayKey()
  const student = await repo.localSaveStudent(source.id, studentInput('An', { weeklySchedules: [{ dayOfWeek: model.vietnamDayOfWeek(today), startTime: '17:00', durationMinutes: 60 }], scheduleEffectiveFrom: today }))
  await repo.localMaterializeRecurringSessions(source.id, `${today}T00:00:00+07:00`, `${model.shiftVietnamDate(today, 4)}T00:00:00+07:00`)
  const saved = backup.parseWorkspaceBackup(JSON.stringify(await backup.exportLocalWorkspace(source.id)))
  const imported = await backup.importLocalWorkspace(saved)
  assert.notEqual(imported.id, source.id)
  assert.equal(imported.name, source.name)
  assert.deepEqual((await repo.localListStudents(imported.id)).map(item => item.name), ['An'])
  assert.equal((await repo.localListStudents(imported.id))[0].weeklySchedules.length, 1)
  assert.ok((await repo.localListStudents(source.id)).some(item => item.id === student.id))
  const before = (await workspaces.listLocalWorkspaces()).length
  const invalid = { ...saved, data: { ...saved.data, students: [] } }
  assert.throws(() => backup.parseWorkspaceBackup(JSON.stringify(invalid)), /không liên kết/)
  await assert.rejects(() => backup.importLocalWorkspace(invalid), /không liên kết/)
  assert.equal((await workspaces.listLocalWorkspaces()).length, before)
})

test('LOCAL gateway completes reads and writes without making network requests', async () => {
  const workspace = await workspaces.createLocalWorkspace('Không gọi mạng')
  runtime.setActiveTeachingWorkspace({ id: workspace.id, name: workspace.name, mode: 'LOCAL' })
  let requestCount = 0
  const oldFetch = global.fetch
  global.fetch = async () => { requestCount++; throw new Error('unexpected network request') }
  try {
    const initial = await gateway.localTeachingGet({ resource: 'studentsPageData' })
    assert.equal(initial.students.length, 0)
    await gateway.localTeachingPost({ operation: 'saveStudent', data: studentInput('Local only') })
    assert.equal((await gateway.localTeachingGet({ resource: 'students' })).students.length, 1)
    const overview = await gateway.localTeachingGet({ resource: 'overviewPageData', year: String(new Date().getUTCFullYear()), month: String(new Date().getUTCMonth() + 1) })
    assert.equal(overview.dashboard.today, model.vietnamTodayKey())
    assert.ok(Array.isArray(overview.month.rows))
    assert.equal(requestCount, 0)
  } finally { global.fetch = oldFetch }
})

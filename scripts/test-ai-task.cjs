const test = require('node:test')
const assert = require('node:assert/strict')
const harness = require('./lib/ai-task-test-harness.cjs')
const { NextRequest } = require('next/server')
const model = harness.load('_lib/model.ts')
const repo = harness.load('_services/repository.ts')
const service = harness.load('_services/task.service.ts')
const routes = harness.load('api/route.ts')
const parser = harness.load('_services/ai-task-parser.ts')
const tree = harness.load('_lib/tree.ts')
const memoryService = harness.load('_services/work-memory.ts')
const memoryModel = harness.load('_lib/work-memory.ts')
let sequence = 0
const id = () => `request_${++sequence}`
const input = (title = 'Code EDA cho MSD') => ({ title, groupId: 'ainka', description: null, priority: 'normal', status: 'todo', deadline: null, parentId: null, startTime: null, duration: null, withinDay: false })
const propose = (uid, data = input()) => service.proposeManual(uid, id(), 'CREATE_TASK', data)
async function create(uid = 'alice', data = input()) { const p = await propose(uid, data); const r = await service.confirmProposal(uid, p.id, data); return (await repo.scanTasks(uid)).find(t => t.id === r.id) }
async function mutate(task, action, changes = {}, uid = 'alice') {
  const data = { ...input(), ...Object.fromEntries(Object.keys(input()).map(k => [k, task[k]])), ...changes }
  const p = await service.proposeManual(uid, id(), action, data, task.id, task.version)
  await service.confirmProposal(uid, p.id, data)
  return (await repo.scanTasks(uid)).find(t => t.id === task.id)
}
test.beforeEach(async () => { harness.reset(); await repo.initialize('alice') })

test('short numbered creation opens a proposal with remembered branch instead of asking for a group', async () => {
  const student = await service.saveManualTask('alice', id(), 'CREATE_TASK', { ...input('Nhật Anh'), groupId: 'personal' })
  const subject = await service.saveManualTask('alice', id(), 'CREATE_SUBTASK', { ...input('Toán lớp 2'), groupId: 'personal', parentId: student.id })
  await service.saveManualTask('alice', id(), 'CREATE_SUBTASK', { ...input('bài 3'), groupId: 'personal', parentId: subject.id, duration: 120, startTime: '2026-09-19T17:00:00+07:00' })
  const originalFetch = global.fetch
  global.fetch = async () => { throw new Error('A clear short creation should not need AI clarification') }
  try {
    const requestId = id()
    const response = await routes.POST(new NextRequest('http://localhost/demo/ai-task/api', { method: 'POST', body: JSON.stringify({ operation: 'chat', requestId, text: 'thêm bài 4' }) }))
    assert.equal(response.status, 200)
    const message = (await repo.messageCollection('alice').doc(requestId).get()).data()
    assert.equal(message.status, 'pending')
    assert.equal(message.proposal.data.title, 'bài 4')
    assert.equal(message.proposal.data.parentId, subject.id)
    assert.equal(message.proposal.data.groupId, 'personal')
    assert.equal(message.proposal.data.duration, 120)
    assert.equal((await repo.scanTasks('alice')).length, 3)
    await service.cancelProposal('alice', requestId)
    await repo.initialize('bob')
    const intent = await parser.parseTaskIntent('thêm bài 5 nhé', [])
    const fallback = await service.prepareIntent('bob', intent)
    assert.equal(fallback.status, 'pending')
    assert.equal(fallback.proposal.data.groupId, 'inbox')
    assert.equal(fallback.proposal.data.parentId, null)
  } finally { global.fetch = originalFetch }
})

test('quick creation keeps explicit parent, scheduling, questions and multiple actions for AI', () => {
  const { quickCreateIntent } = harness.load('_lib/quick-create.ts')
  for (const text of ['thêm bài 4 vào nhóm Cá nhân', 'thêm bài 4 dưới Toán', 'thêm bài 4 ngày mai', 'thêm bài 4 lúc 17h', 'thêm bài 4 và xóa bài 3', 'đừng thêm bài 4', 'có nên thêm bài 4?', 'thêm bài 4?', 'thêm bài']) assert.equal(quickCreateIntent(text), null, text)
  for (const text of ['thêm bài 4', 'Thêm giúp tôi bài 12 nhé', 'tạo task bài 10', 'them bai 7', 'thêm bài tập 2', 'thêm chương 3']) assert.equal(quickCreateIntent(text).action, 'CREATE_TASK', text)
})

test('direct form save is atomic, idempotent and leaves a pending chat proposal untouched', async () => {
  const pending = await propose('alice', input('Chat draft'))
  const requestId = id()
  const data = { ...input('Direct form'), startNow: true, scheduleMode: 'duration', duration: 120 }
  const [first, second] = await Promise.all([service.saveManualTask('alice', requestId, 'CREATE_TASK', data), service.saveManualTask('alice', requestId, 'CREATE_TASK', data)])
  assert.equal(first.id, second.id)
  const tasks = await repo.scanTasks('alice')
  assert.equal(tasks.length, 1)
  assert.equal(tasks[0].title, 'Direct form')
  assert.equal(Date.parse(tasks[0].deadline) - Date.parse(tasks[0].startTime), 120 * 60000)
  assert.equal((await repo.sessionRef('alice').get()).get('pendingId'), pending.id)
  assert.equal((await repo.messageCollection('alice').doc(pending.id).get()).get('status'), 'pending')
  assert.equal((await memoryService.getWorkMemory('alice')).lastForm.duration, 120)
  await service.confirmProposal('alice', pending.id, input('Chat draft'))
  assert.equal((await repo.scanTasks('alice')).length, 2)
})

test('direct edits enforce version, owner, parent and subtree validation without partial writes', async () => {
  const first = await service.saveManualTask('alice', id(), 'CREATE_TASK', input('Parent'))
  const parent = (await repo.scanTasks('alice')).find(t => t.id === first.id)
  const childInput = { ...input('Child'), parentId: parent.id }
  const child = await service.saveManualTask('alice', id(), 'CREATE_SUBTASK', childInput)
  await assert.rejects(() => service.saveManualTask('alice', id(), 'UPDATE_TASK', { ...input('Parent'), parentId: child.id }, parent.id, parent.version))
  await assert.rejects(() => service.saveManualTask('bob', id(), 'UPDATE_TASK', input(), parent.id, parent.version))
  await assert.rejects(() => service.saveManualTask('alice', id(), 'UPDATE_TASK', input()))
  await assert.rejects(() => service.saveManualTask('alice', id(), 'CREATE_SUBTASK', input()))
  await service.saveManualTask('alice', id(), 'UPDATE_TASK', { ...input('Renamed'), status: 'done' }, parent.id, parent.version)
  await assert.rejects(() => service.saveManualTask('alice', id(), 'UPDATE_TASK', input('Stale'), parent.id, parent.version))
  const saved = (await repo.scanTasks('alice')).find(t => t.id === parent.id)
  assert.equal(saved.title, 'Renamed'); assert.ok(saved.completedAt)
})

test('direct save API requires authentication and rejects fields outside the save contract', async () => {
  const request = body => new NextRequest('http://localhost/demo/ai-task/api', { method: 'POST', body: JSON.stringify(body) })
  const body = { operation: 'saveTask', requestId: id(), action: 'CREATE_TASK', data: input('From API') }
  harness.identity(null)
  assert.equal((await routes.POST(request(body))).status, 401)
  harness.identity('alice')
  assert.equal((await routes.POST(request({ ...body, userId: 'bob' }))).status, 400)
  assert.equal((await routes.POST(request({ ...body, action: 'DELETE_TASK' }))).status, 400)
  assert.equal((await routes.POST(request(body))).status, 200)
  assert.equal((await repo.scanTasks('alice')).length, 1)
  assert.equal((await repo.getMessages('alice')).messages.length, 0)
})

test('confirmed forms remember group and sibling branch, explicit input wins, memory is isolated', async () => {
  const student = await create('alice', { ...input('Nhat Anh'), groupId: 'personal' })
  const subject = await create('alice', { ...input('Toan lop 2'), groupId: 'personal', parentId: student.id })
  const task = await create('alice', { ...input('A'), groupId: 'personal', parentId: subject.id, duration: 120, startTime: '2026-09-19T17:00:00+07:00' })
  const reply = await service.prepareIntent('alice', { action: 'CREATE_TASK', data: { title: 'B' } })
  assert.equal(reply.proposal.data.parentId, subject.id)
  assert.notEqual(reply.proposal.data.parentId, task.id)
  assert.equal(reply.proposal.data.groupId, 'personal')
  assert.equal(reply.proposal.data.duration, 120)
  assert.equal(new Date(Date.parse(reply.proposal.data.startTime) + 7 * 3600000).toISOString().slice(11, 16), '17:00')
  assert.ok(Date.parse(reply.proposal.data.startTime) >= Date.now() - 1000)
  const explicit = await service.prepareIntent('alice', { action: 'CREATE_TASK', data: { title: 'C', groupName: 'Ainka', duration: 30, startTime: null } })
  assert.equal(explicit.proposal.data.groupId, 'ainka'); assert.equal(explicit.proposal.data.parentId, null)
  assert.equal(explicit.proposal.data.duration, 30); assert.equal(explicit.proposal.data.startTime, null)
  await repo.initialize('bob')
  assert.deepEqual(await memoryService.getWorkMemory('bob'), memoryModel.emptyMemory())
  const other = await service.prepareIntent('bob', { action: 'CREATE_TASK', data: { title: 'B' } })
  assert.equal(other.proposal.data.groupId, 'inbox'); assert.equal(other.proposal.data.parentId, null)
})

test('cancelled forms do not teach memory, confirmed retries and edits do not inflate habits', async () => {
  const p = await propose('alice', { ...input(), duration: 120 })
  await service.cancelProposal('alice', p.id)
  assert.equal((await memoryService.getWorkMemory('alice')).updatedAt, null)
  let task = await create('alice', { ...input(), duration: 120 })
  for (let i = 0; i < 3; i++) task = await mutate(task, 'UPDATE_TASK', { priority: 'urgent' })
  assert.equal((await memoryService.getWorkMemory('alice')).samples.length, 1)
})

test('natural conversation and explicit preferences persist atomically and can be cleared', async () => {
  const chat = await service.prepareIntent('alice', { action: 'CHAT', reply: 'Hello' })
  assert.equal(chat.content, 'Hello'); assert.equal(chat.proposal, undefined)
  const reply = await service.prepareIntent('alice', memoryModel.conversationSchema.parse({ action: 'CHAT', reply: 'Remember', memory: { scope: 'preferences', duration: 120, startClock: '17:00', notes: 'Prefer short steps' } }))
  const requestId = id()
  await service.appendTurn('alice', requestId, 'Remember my hours', reply)
  await service.appendTurn('alice', requestId, 'Remember my hours', reply)
  const memory = await memoryService.getWorkMemory('alice')
  assert.equal(memory.preferences.duration, 120); assert.equal(memory.notes, 'Prefer short steps')
  const proposed = await service.prepareIntent('alice', { action: 'CREATE_TASK', data: { title: 'New' } })
  assert.equal(proposed.proposal.data.duration, 120)
  const reset = await service.prepareIntent('alice', { action: 'CHAT', reply: 'Reset', memory: { scope: 'context', reset: true } })
  await service.appendTurn('alice', id(), 'Reset', reset)
  const cleared = await memoryService.getWorkMemory('alice')
  assert.deepEqual(cleared.preferences, {}); assert.deepEqual(cleared.lastForm, {}); assert.equal(cleared.samples.length, 0)
  assert.equal((await service.prepareIntent('alice', { action: 'CREATE_TASK', data: { title: 'After reset' } })).proposal.data.duration, null)
})

test('context resolves full paths and ignores deleted or hidden remembered destinations', async () => {
  const parent = await create('alice', input('Student'))
  const subject = await create('alice', { ...input('Math'), parentId: parent.id })
  const context = await service.prepareIntent('alice', { action: 'CHAT', reply: 'Context', memory: { scope: 'context', parentQuery: 'Student > Math' } })
  assert.equal(context.memoryUpdate.values.parentId, subject.id)
  await service.appendTurn('alice', id(), 'Use Math', context)
  await mutate(subject, 'DELETE_TASK')
  const proposal = await service.prepareIntent('alice', { action: 'CREATE_TASK', data: { title: 'No deleted parent' } })
  assert.equal(proposal.proposal.data.parentId, null)
  await service.saveGroup('alice', { name: 'Ainka', color: null, order: 1, isActive: false }, 'ainka')
  assert.equal((await service.prepareIntent('alice', { action: 'CREATE_TASK', data: { title: 'No hidden group' } })).proposal.data.groupId, 'inbox')
})

test('habits require three distinct samples and explicit preferences override observed values', () => {
  let memory = memoryModel.emptyMemory()
  for (let i = 0; i < 3; i++) memory = memoryModel.rememberForm(memory, { ...input(), duration: 120 }, new Date().toISOString(), String(i))
  memory = memoryModel.rememberForm(memory, { ...input(), duration: 30 }, new Date().toISOString(), 'fourth')
  assert.equal(memoryModel.familiarDefaults(memory).duration, 120)
  memory.preferences.duration = 45
  assert.equal(memoryModel.familiarDefaults(memory).duration, 45)
})

test('missing memory falls back to the last historical confirmed form, reset does not resurrect it', async () => {
  await create('alice', { ...input(), duration: 120 })
  const rootPath = 'demo/ai-task/users/alice'
  const owner = { ...harness.data().get(rootPath) }
  delete owner.workMemory
  harness.put(rootPath, owner)
  assert.equal((await memoryService.getWorkMemory('alice')).lastForm.duration, 120)
  const reset = await service.prepareIntent('alice', { action: 'CHAT', reply: 'Reset', memory: { scope: 'context', reset: true } })
  await service.appendTurn('alice', id(), 'Reset', reset)
  assert.equal((await memoryService.getWorkMemory('alice')).lastForm.duration, undefined)
})

test('start now is resolved at confirmation and repeated confirmation keeps the same start', async () => {
  const data = { ...input(), startNow: true, scheduleMode: 'deadline', deadline: new Date(Date.now() + 3600000).toISOString() }
  const proposal = await propose('alice', data)
  assert.equal((await repo.messageCollection('alice').doc(proposal.id).get()).get('proposal').data.startTime, null)
  const before = Date.now()
  const result = await service.confirmProposal('alice', proposal.id, data)
  const task = (await repo.scanTasks('alice')).find(t => t.id === result.id)
  assert.ok(Date.parse(task.startTime) >= before && Date.parse(task.startTime) <= Date.now())
  assert.equal(task.deadline, data.deadline)
  assert.equal(task.duration, Math.ceil((Date.parse(data.deadline) - Date.parse(task.startTime)) / 60000))
  assert.equal(task.startNow, false)
  await service.confirmProposal('alice', proposal.id, data)
  assert.equal((await repo.scanTasks('alice')).find(t => t.id === result.id).startTime, task.startTime)
  const prepared = await service.prepareIntent('alice', model.intentSchema.parse({ action: 'UPDATE_TASK', target: { query: task.title }, changes: { priority: 'urgent' } }))
  assert.equal(prepared.proposal.data.startTime, task.startTime)
  assert.equal(prepared.proposal.data.deadline, task.deadline)
})

test('duration from now, fixed deadline and expired deadline are handled independently', async () => {
  const now = Date.parse('2026-09-20T10:00:30Z')
  const duration = model.finalizeSchedule(model.taskInputSchema.parse({ ...input(), scheduleMode: 'duration', startNow: true, duration: 1440 }), now)
  assert.equal(duration.startTime, '2026-09-20T10:00:30.000Z')
  assert.equal(duration.deadline, '2026-09-21T10:00:30.000Z')
  const deadline = model.finalizeSchedule(model.taskInputSchema.parse({ ...input(), scheduleMode: 'deadline', startNow: true, deadline: '2026-09-20T11:00:00Z', duration: 1440 }), now)
  assert.equal(deadline.deadline, '2026-09-20T11:00:00Z')
  assert.equal(deadline.duration, 60)
  assert.deepEqual(model.taskInputSchema.parse(deadline), deadline)
  assert.throws(() => model.finalizeSchedule(model.taskInputSchema.parse({ ...input(), scheduleMode: 'deadline', startNow: true, deadline: '2026-09-20T10:00:00Z' }), now))
  assert.equal(model.taskInputSchema.safeParse({ ...input(), scheduleMode: 'deadline', startTime: '2026-09-20T11:00:00Z', deadline: '2026-09-20T10:00:00Z' }).success, false)
  const stale = { ...input(), scheduleMode: 'deadline', startNow: true, deadline: new Date(Date.now() - 60000).toISOString() }
  const proposal = await propose('alice', stale)
  await assert.rejects(() => service.confirmProposal('alice', proposal.id, stale))
  assert.equal((await repo.scanTasks('alice')).length, 0)
})

test('schedule computes authoritative deadline and survives chat updates and completion', async () => {
  let task = await create('alice', { ...input(), startTime: '2026-09-19T09:00:00+07:00', duration: 90, withinDay: true, deadline: '2030-01-01T00:00:00Z' })
  assert.equal(task.startTime, '2026-09-19T02:00:00.000Z')
  assert.equal(task.deadline, '2026-09-19T03:30:00.000Z')
  const prepared = await service.prepareIntent('alice', model.intentSchema.parse({ action: 'UPDATE_TASK', target: { query: task.title }, changes: { duration: 120 } }))
  assert.equal(prepared.proposal.data.startTime, task.startTime)
  assert.equal(prepared.proposal.data.deadline, '2026-09-19T04:00:00.000Z')
  task = await mutate(task, 'UPDATE_TASK', { duration: 120 })
  assert.equal(task.deadline, '2026-09-19T04:00:00.000Z')
  task = await mutate(task, 'COMPLETE_TASK', { status: 'done' })
  assert.equal(task.duration, 120)
  assert.equal(task.withinDay, false)
  task = await mutate(task, 'UPDATE_TASK', { duration: null, deadline: null })
  assert.equal(task.deadline, null)
  assert.equal(task.duration, null)
})

test('schedule supports multiple days and midnight, rejects invalid durations and accepts legacy tasks', async () => {
  const scheduled = { ...input(), withinDay: true, startTime: '2026-09-19T23:30:00+07:00', duration: 30 }
  const midnight = await create('alice', scheduled)
  assert.equal(midnight.deadline, '2026-09-19T17:00:00.000Z')
  for (const duration of [1440, 2880, 4320, 5760]) {
    const data = model.taskInputSchema.parse({ ...scheduled, duration })
    assert.equal(Date.parse(data.deadline) - Date.parse(data.startTime), duration * 60000)
  }
  for (const changes of [{ duration: 0 }, { duration: -1 }, { duration: 1.5 }]) {
    assert.equal(model.taskInputSchema.safeParse({ ...scheduled, ...changes }).success, false)
  }
  const valid = model.taskInputSchema.parse({ ...scheduled, duration: 29 })
  assert.equal(valid.deadline, '2026-09-19T16:59:00.000Z')
  assert.equal(model.matches({ ...valid, deletedAt: null }, model.filterSchema.parse({ view: 'today' }), Date.parse('2026-09-19T22:00:00+07:00')), true)
  const legacy = model.taskInputSchema.parse({ title: 'Legacy', groupId: 'inbox' })
  assert.equal(legacy.startTime, null); assert.equal(legacy.duration, null); assert.equal(legacy.withinDay, false)
})

test('initialization is idempotent, creates dynamic groups and isolates accounts', async () => {
  await repo.initialize('alice'); await repo.initialize('bob')
  assert.equal((await repo.getGroups('alice')).length, 4)
  const task = await create()
  assert.equal((await repo.scanTasks('bob')).length, 0)
  assert.ok(task.createdAt && task.updatedAt)
  assert.equal('source' in task, false)
  assert.ok([...harness.data().keys()].every(p => p.startsWith('demo/ai-task/users/')))
})
test('proposal and cancel do not mutate tasks; cancelled confirmation is rejected', async () => {
  const p = await propose('alice')
  assert.equal((await repo.scanTasks('alice')).length, 0)
  await service.cancelProposal('alice', p.id)
  await assert.rejects(() => service.confirmProposal('alice', p.id, input()))
  assert.equal((await repo.scanTasks('alice')).length, 0)
})
test('confirmed edits, double clicks and retried requests produce exactly one task', async () => {
  const requestId = id()
  const p = await service.proposeManual('alice', requestId, 'CREATE_TASK', input())
  const again = await service.proposeManual('alice', requestId, 'CREATE_TASK', input())
  assert.equal(p.id, again.id)
  const edited = { ...input(), title: 'Đã chỉnh trước khi lưu', priority: 'urgent' }
  const results = await Promise.all([service.confirmProposal('alice', p.id, edited), service.confirmProposal('alice', p.id, edited)])
  assert.equal(results[0].id, results[1].id)
  const tasks = await repo.scanTasks('alice')
  assert.equal(tasks.length, 1); assert.equal(tasks[0].title, edited.title); assert.equal(tasks[0].priority, 'urgent')
})
test('task lifecycle maintains completedAt/cancelledAt and soft-delete restoration', async () => {
  let task = await create()
  task = await mutate(task, 'UPDATE_TASK', { status: 'done' }); assert.ok(task.completedAt); assert.equal(task.cancelledAt, null)
  task = await mutate(task, 'UPDATE_TASK', { status: 'in_progress' }); assert.equal(task.completedAt, null)
  task = await mutate(task, 'UPDATE_TASK', { status: 'cancelled' }); assert.ok(task.cancelledAt)
  task = await mutate(task, 'UPDATE_TASK', { status: 'todo' }); assert.equal(task.cancelledAt, null)
  task = await mutate(task, 'DELETE_TASK'); assert.ok(task.deletedAt)
  assert.equal((await repo.findTasks('alice', model.filterSchema.parse({ view: 'all' }))).total, 0)
  task = await mutate(task, 'RESTORE_TASK'); assert.equal(task.deletedAt, null)
  assert.equal((await repo.scanTasks('alice')).length, 1)
})
test('another account cannot select, edit, confirm or cancel another user data', async () => {
  await repo.initialize('bob')
  const task = await create()
  const p = await service.proposeManual('alice', id(), 'UPDATE_TASK', { ...input(), priority: 'urgent' }, task.id, task.version)
  await assert.rejects(() => service.confirmProposal('bob', p.id, input()))
  await assert.rejects(() => service.cancelProposal('bob', p.id))
  await assert.rejects(() => service.proposeManual('bob', id(), 'DELETE_TASK', undefined, task.id, task.version))
  await assert.rejects(() => service.chooseTask('bob', p.id, task.id))
  assert.equal((await repo.scanTasks('alice'))[0].priority, 'normal')
})
test('dynamic group rename/hide keeps task relation, protects Inbox and resolves unknown group', async () => {
  const group = await service.saveGroup('alice', { name: 'Shop Bé Băng', color: '#123456', order: 4, isActive: true })
  const intent = model.intentSchema.parse({ action: 'CREATE_TASK', data: { title: 'Làm banner', groupName: 'Shop Bé Băng' } })
  const prepared = await service.prepareIntent('alice', intent)
  assert.equal(prepared.proposal.data.groupId, group.id)
  const p = await service.appendTurn('alice', id(), 'Tạo banner', prepared)
  await service.confirmProposal('alice', p.id, prepared.proposal.data)
  await service.saveGroup('alice', { name: 'Shop mới', color: null, order: 4, isActive: false }, group.id)
  assert.equal((await repo.scanTasks('alice'))[0].groupId, group.id)
  await assert.rejects(() => service.saveGroup('alice', { name: 'Inbox', color: null, order: 0, isActive: false }, 'inbox'))
  const unknown = await service.prepareIntent('alice', { action: 'CREATE_TASK', data: { title: 'Banner', groupName: 'Nhóm lạ' } })
  assert.equal(unknown.proposal.data.groupId, 'inbox'); assert.match(unknown.content, /Inbox/)
  const groups = await repo.getGroups('alice'); assert.equal(groups.length, 5)
})
test('duplicate names require explicit selection, then confirmation', async () => {
  const first = await create('alice', input('EDA cho MSD'))
  await create('alice', input('EDA cho ABC'))
  const prepared = await service.prepareIntent('alice', { action: 'COMPLETE_TASK', target: { query: 'EDA' } })
  assert.equal(prepared.status, 'choose'); assert.equal(prepared.candidates.length, 2)
  const p = await service.appendTurn('alice', id(), 'EDA xong rồi', prepared)
  await assert.rejects(() => service.confirmProposal('alice', p.id, input()))
  await service.chooseTask('alice', p.id, first.id)
  const message = (await repo.getMessages('alice')).messages.find(m => m.id === p.id)
  assert.equal(message.status, 'pending')
  assert.ok((await repo.scanTasks('alice')).every(t => t.status === 'todo'))
  await service.confirmProposal('alice', p.id, message.proposal.data)
  assert.equal((await repo.scanTasks('alice')).filter(t => t.status === 'done').length, 1)
})
test('stale version prevents overwriting a task changed after proposal', async () => {
  const task = await create()
  const p = await service.proposeManual('alice', id(), 'UPDATE_TASK', input(), task.id, task.version)
  const path = `demo/ai-task/users/alice/tasks/${task.id}`
  harness.put(path, { ...harness.data().get(path), version: task.version + 1, title: 'Changed elsewhere' })
  await assert.rejects(() => service.confirmProposal('alice', p.id, input()), /đã thay đổi/)
  assert.equal((await repo.scanTasks('alice'))[0].title, 'Changed elsewhere')
})
test('subtasks stay in tasks at any depth; rejects cross-account parent and parent deletion', async () => {
  const parent = await create()
  const child = await create('alice', { ...input('Test API'), parentId: parent.id })
  assert.equal(child.parentId, parent.id)
  const nested = await create('alice', { ...input('Nested'), parentId: child.id })
  assert.equal(nested.depth, 2); assert.equal(nested.rootTaskId, parent.id)
  await assert.rejects(() => mutate(parent, 'DELETE_TASK'), /task con/)
  const pending = (await repo.getMessages('alice')).messages.find(m => m.status === 'pending')
  await service.cancelProposal('alice', pending.id)
  await repo.initialize('bob')
  const foreign = await propose('bob', { ...input(), parentId: parent.id })
  await assert.rejects(() => service.confirmProposal('bob', foreign.id, { ...input(), parentId: parent.id }), /cha/)
})

test('roots and a four-level teaching tree derive depth/root from persisted relations', async () => {
  const root = await create('alice', input('Dạy thêm'))
  const a = await create('alice', { ...input('Bạn A'), parentId: root.id })
  const math = await create('alice', { ...input('Toán'), parentId: a.id })
  const lesson = await create('alice', { ...input('Phân số'), parentId: math.id })
  assert.equal(root.parentId, null); assert.equal(root.rootTaskId, root.id); assert.equal(root.depth, 0)
  assert.equal(lesson.parentId, math.id); assert.equal(lesson.rootTaskId, root.id); assert.equal(lesson.depth, 3)
  for (const task of [root, a, math, lesson]) {
    const saved = harness.data().get(`demo/ai-task/users/alice/tasks/${task.id}`)
    assert.equal(saved.rootTaskId, root.id); assert.equal(saved.depth, task.depth); assert.equal('parentTaskId' in saved, false)
  }
})

test('moving a subtree updates all descendants including deleted descendants atomically', async () => {
  const root = await create('alice', input('Dạy thêm'))
  const a = await create('alice', { ...input('Bạn A'), parentId: root.id })
  const math = await create('alice', { ...input('Toán'), parentId: a.id })
  const exercise = await create('alice', { ...input('Bài tập'), parentId: math.id })
  const deleted = await mutate(exercise, 'DELETE_TASK')
  const other = await create('alice', input('Lớp mới'))
  const group = await create('alice', { ...input('Nhóm sáng'), parentId: other.id })
  await mutate(a, 'UPDATE_TASK', { parentId: group.id })
  let tasks = await repo.scanTasks('alice')
  const movedMath = tasks.find(t => t.id === math.id)
  const movedExercise = tasks.find(t => t.id === exercise.id)
  assert.equal(movedMath.rootTaskId, other.id); assert.equal(movedMath.depth, 3); assert.equal(movedMath.version, math.version + 1)
  assert.equal(movedExercise.depth, 4); assert.equal(movedExercise.deletedAt, deleted.deletedAt)
  assert.equal(movedMath.status, math.status); assert.equal(movedMath.groupId, math.groupId)
  for (const t of tasks) assert.equal(harness.data().get(`demo/ai-task/users/alice/tasks/${t.id}`).depth, t.depth)
  // Move the branch back to the root level.
  await mutate(tasks.find(t => t.id === a.id), 'UPDATE_TASK', { parentId: null })
  tasks = await repo.scanTasks('alice')
  assert.equal(tasks.find(t => t.id === a.id).depth, 0)
  assert.equal(tasks.find(t => t.id === a.id).rootTaskId, a.id)
  assert.equal(tasks.find(t => t.id === math.id).rootTaskId, a.id)
  assert.equal(tasks.find(t => t.id === exercise.id).depth, 2)
})

test('self-parent and move into any descendant are rejected with no partial writes', async () => {
  const root = await create()
  const child = await create('alice', { ...input('Child'), parentId: root.id })
  const grandchild = await create('alice', { ...input('Grandchild'), parentId: child.id })
  for (const parentId of [root.id, child.id, grandchild.id]) {
    const before = JSON.stringify(await repo.scanTasks('alice'))
    const p = await service.proposeManual('alice', id(), 'UPDATE_TASK', { ...input(), parentId }, root.id, root.version)
    await assert.rejects(() => service.confirmProposal('alice', p.id, { ...input(), parentId }), /chính nó|quan hệ vòng/)
    assert.equal(JSON.stringify(await repo.scanTasks('alice')), before)
    await service.cancelProposal('alice', p.id)
  }
  await assert.rejects(() => propose('alice', { ...input(), rootTaskId: 'forged', depth: 42 }))
})

test('parent picker excludes self, all descendants and deleted branches, keeps valid cousins', async () => {
  const root = await create()
  const a = await create('alice', { ...input('A'), parentId: root.id })
  const child = await create('alice', { ...input('Child'), parentId: a.id })
  const cousin = await create('alice', { ...input('B'), parentId: root.id })
  const deleted = await create('alice', input('Trash')); await mutate(deleted, 'DELETE_TASK')
  const choices = await repo.getParentOptions('alice', a.id)
  assert.deepEqual(choices.candidates.map(t => t.id).sort(), [root.id, cousin.id].sort())
  assert.equal(tree.treePath(child.id, choices.nodes), 'Code EDA cho MSD / A / Child')
  await repo.initialize('bob')
  await assert.rejects(() => repo.getParentOptions('bob', a.id), /không tồn tại/)
})

test('tree filtering retains ancestors and collapse hides the complete branch', async () => {
  const root = await create('alice', { ...input('Dạy thêm'), status: 'done' })
  const a = await create('alice', { ...input('Bạn A'), parentId: root.id })
  const math = await create('alice', { ...input('Toán'), parentId: a.id })
  const result = await repo.findTaskTree('alice', model.filterSchema.parse({ query: 'toan' }))
  assert.deepEqual(result.matchingIds, [math.id]); assert.equal(result.total, 1)
  assert.equal(result.tasks.length, 3)
  assert.deepEqual(tree.visibleTree(result.tasks).map(t => t.id), [root.id, a.id, math.id])
  assert.deepEqual(tree.visibleTree(result.tasks, new Set([root.id])).map(t => t.id), [root.id])
  assert.deepEqual(tree.visibleTree(result.tasks, new Set([a.id])).map(t => t.id), [root.id, a.id])
})

test('legacy tasks and pending proposals migrate without losing relation, content or version', async () => {
  const { Timestamp } = require('firebase-admin/firestore')
  const ownerPath = 'demo/ai-task/users/alice'
  harness.put(ownerPath, { ...harness.data().get(ownerPath), treeSchemaVersion: 1 })
  const base = { ...input(), createdAt: Timestamp.now(), updatedAt: Timestamp.now(), completedAt: null, cancelledAt: null, deletedAt: null, version: 5 }
  delete base.parentId
  harness.put(`${ownerPath}/tasks/legacy_root`, { ...base, title: 'Dạy thêm', parentTaskId: null })
  harness.put(`${ownerPath}/tasks/legacy_child`, { ...base, title: 'Bạn A', parentTaskId: 'legacy_root' })
  const pendingId = id()
  const data = { ...input('Bạn A đã sửa'), parentTaskId: 'legacy_root' }; delete data.parentId
  await service.appendTurn('alice', pendingId, 'Sửa Bạn A', { status: 'pending', content: 'Legacy', proposal: { action: 'UPDATE_TASK', taskId: 'legacy_child', expectedVersion: 5, data, before: null } })
  await repo.initialize('alice'); await repo.initialize('alice')
  const saved = harness.data().get(`${ownerPath}/tasks/legacy_child`)
  assert.equal(saved.parentId, 'legacy_root'); assert.equal(saved.rootTaskId, 'legacy_root'); assert.equal(saved.depth, 1); assert.equal(saved.version, 5); assert.equal('parentTaskId' in saved, false)
  const messages = await repo.getMessages('alice')
  const normalized = messages.messages.find(m => m.id === pendingId).proposal.data
  assert.equal(normalized.parentId, 'legacy_root'); assert.equal('parentTaskId' in normalized, false)
  await service.confirmProposal('alice', pendingId, normalized)
  assert.equal((await repo.scanTasks('alice')).find(t => t.id === 'legacy_child').title, 'Bạn A đã sửa')
})

test('invalid legacy cycle or dangling parent fails migration without partial writes', async () => {
  const ownerPath = 'demo/ai-task/users/alice'
  for (const parentId of ['legacy', 'missing']) {
    harness.put(ownerPath, { ...harness.data().get(ownerPath), treeSchemaVersion: 1 })
    harness.put(`${ownerPath}/tasks/legacy`, { ...input(), parentId, version: 1 })
    const before = JSON.stringify([...harness.data()])
    await assert.rejects(() => repo.migrateTaskTree('alice'))
    assert.equal(JSON.stringify([...harness.data()]), before)
  }
})

test('arbitrarily deep tree algorithms are iterative rather than recursive or depth-capped', () => {
  const nodes = Array.from({ length: 12000 }, (_, i) => ({ id: `n${i}`, parentId: i ? `n${i - 1}` : null }))
  const positions = tree.treePositions(nodes.slice().reverse())
  assert.equal(positions.get('n11999').depth, 11999); assert.equal(positions.get('n11999').rootTaskId, 'n0')
  assert.equal(tree.descendants(nodes, 'n0').size, 11999)
  assert.equal(tree.visibleTree(nodes).length, 12000)
})

test('chat resolves all three tree examples at different depths and never creates a parent', async () => {
  const teaching = await create('alice', input('Dạy thêm'))
  const student = await create('alice', { ...input('Bạn A'), parentId: teaching.id })
  const sewing = await create('alice', input('May đồ'))
  const customer = await create('alice', { ...input('Út Nhung'), parentId: sewing.id })
  for (const [title, query, parent, depth] of [['Toán', 'Bạn A', student, 2], ['Bạn C', 'Dạy thêm', teaching, 1], ['Đo áo', 'Út Nhung', customer, 2]]) {
    const reply = await service.prepareIntent('alice', model.intentSchema.parse({ action: 'CREATE_SUBTASK', target: { query }, data: { title } }))
    assert.equal(reply.proposal.data.parentId, parent.id)
    const proposal = await service.appendTurn('alice', id(), title, reply)
    const saved = await service.confirmProposal('alice', proposal.id, reply.proposal.data)
    assert.equal((await repo.scanTasks('alice')).find(t => t.id === saved.id).depth, depth)
  }
  const before = (await repo.scanTasks('alice')).length
  assert.equal((await service.prepareIntent('alice', { action: 'CREATE_SUBTASK', target: { query: 'Người lạ' }, data: { title: 'Toán' } })).status, 'normal')
  assert.equal((await repo.scanTasks('alice')).length, before)
})
test('no AI reads create a proposal or require confirmation', async () => {
  await create()
  const reply = await service.prepareIntent('alice', { action: 'GET_TASKS', filters: { view: 'active', query: '' } })
  assert.equal(reply.status, 'normal'); assert.equal(reply.tasks.length, 1); assert.equal(reply.proposal, undefined)
})
test('Vietnamese date boundaries, null deadlines, creation period and deterministic ranking', () => {
  const now = Date.parse('2026-09-18T08:00:00Z')
  const base = { ...input(), id: 'a', version: 1, deletedAt: null, completedAt: null, cancelledAt: null, createdAt: '2026-09-17T18:00:00Z', updatedAt: '2026-09-17T18:00:00Z' }
  const today = { ...base, deadline: '2026-09-18T16:59:59Z' }
  const tomorrow = { ...base, id: 'b', deadline: '2026-09-18T17:00:00Z' }
  assert.equal(model.matches(today, model.filterSchema.parse({ view: 'today' }), now), true)
  assert.equal(model.matches(tomorrow, model.filterSchema.parse({ view: 'today' }), now), false)
  assert.equal(model.matches(tomorrow, model.filterSchema.parse({ view: 'upcoming' }), now), true)
  assert.equal(model.matches(base, model.filterSchema.parse({ view: 'no_deadline' }), now), true)
  assert.equal(model.matches(base, model.filterSchema.parse({ createdAfter: '2026-09-18T00:00:00+07:00' }), now), true)
  const overdue = { ...base, id: 'c', deadline: '2026-09-17T10:00:00Z' }
  const urgent = { ...base, id: 'd', priority: 'urgent' }
  assert.deepEqual(model.rankTasks([today, urgent, overdue], now).map(t => t.id), ['c', 'd', 'a'])
  assert.equal(model.matches({ ...overdue, status: 'done' }, model.filterSchema.parse({ view: 'overdue' }), now), false)
})
test('search scans beyond first database page without silently missing matches', async () => {
  const { Timestamp } = require('firebase-admin/firestore')
  for (let i = 0; i < 305; i++) harness.put(`demo/ai-task/users/alice/tasks/task_${String(i).padStart(3, '0')}`, { ...input(i === 304 ? 'Công việc cuối' : `Task ${i}`), createdAt: Timestamp.now(), updatedAt: Timestamp.now(), deletedAt: null, version: 1 })
  const found = await repo.findTasks('alice', model.filterSchema.parse({ query: 'cong viec cuoi' }))
  assert.equal(found.total, 1); assert.equal(found.tasks[0].title, 'Công việc cuối')
})
test('API denies guest, cross-site mutation, unknown fields and owner spoofing', async () => {
  harness.identity(null)
  assert.equal((await routes.GET(new NextRequest('http://localhost/demo/ai-task/api'))).status, 401)
  assert.equal((await routes.POST(new NextRequest('http://localhost/demo/ai-task/api', { method: 'POST', body: JSON.stringify({ operation: 'initialize' }) }))).status, 401)
  harness.identity('alice')
  const request = body => new NextRequest('http://localhost/demo/ai-task/api', { method: 'POST', body: JSON.stringify(body) })
  assert.equal((await routes.POST(new NextRequest('http://localhost/demo/ai-task/api', { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' }))).status, 403)
  assert.equal((await routes.POST(request({ operation: 'initialize', userId: 'bob' }))).status, 400)
  assert.equal((await routes.POST(request({ operation: 'confirm', messageId: 'fake', data: input() }))).status, 400)
  assert.equal((await routes.GET(new NextRequest('http://localhost/demo/ai-task/api?resource=tasks&userId=bob'))).status, 400)
})
test('AI output validation rejects arbitrary fields/actions, supports dynamic groups and dates', async () => {
  assert.equal(model.intentSchema.safeParse({ action: 'CREATE_TASK_GROUP', data: { name: 'Foo' } }).success, false)
  assert.equal(model.intentSchema.safeParse({ action: 'CREATE_TASK', data: { title: 'Task', groupId: 'forged' } }).success, false)
  assert.equal(model.intentSchema.safeParse({ action: 'UPDATE_TASK', target: { query: 'EDA' }, changes: { deadline: 'tomorrow' } }).success, false)
  assert.equal(model.intentSchema.safeParse({ action: 'CREATE_TASK', data: {} }).success, false)
  const oldFetch = global.fetch, oldProvider = process.env.CHAT_PROVIDER, oldKey = process.env.GROQ_API_KEY
  process.env.CHAT_PROVIDER = 'groq'; process.env.GROQ_API_KEY = 'test-only-placeholder'
  let reply = { action: 'CREATE_TASK', data: { title: 'Banner', groupName: 'Shop Bé Băng', deadline: '2026-09-19T17:00:00+07:00' } }
  global.fetch = async (_url, options) => { const body = JSON.parse(options.body); assert.match(body.messages[0].content, /Shop Bé Băng/); return Response.json({ choices: [{ message: { content: JSON.stringify(reply) } }] }) }
  try {
    const groups = [{ name: 'Shop Bé Băng', slug: 'shop-be-bang', isActive: true }]
    assert.equal((await parser.parseTaskIntent('Tạo banner', groups)).data.groupName, 'Shop Bé Băng')
    reply = { action: 'CHAT', reply: 'Mình có thể giúp bạn sắp xếp công việc.', memory: { scope: 'preferences', duration: 120, startClock: '17:00' } }
    const conversation = await parser.parseTaskIntent('Tôi thường làm 2 giờ', groups, new Date(), { memory: 'Own memory only', history: [{ role: 'user', content: 'Hello', status: 'normal' }] })
    assert.equal(conversation.action, 'CHAT')
    assert.equal(conversation.memory.duration, 120)
    reply = { action: 'CHAT', reply: 'Bad reference', memory: { scope: 'context', parentId: 'foreign-owner-task' } }
    await assert.rejects(() => parser.parseTaskIntent('Use foreign memory', groups), /chưa hiểu/)
    reply = { action: 'DROP_DATABASE' }
    await assert.rejects(() => parser.parseTaskIntent('Xóa hết', groups), /chưa hiểu/)
  } finally {
    global.fetch = oldFetch
    if (oldProvider === undefined) delete process.env.CHAT_PROVIDER; else process.env.CHAT_PROVIDER = oldProvider
    if (oldKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = oldKey
  }
})

const test = require('node:test')
const assert = require('node:assert/strict')
const harness = require('./lib/ai-task-test-harness.cjs')
const model = harness.load('_lib/model.ts')
const repo = harness.load('_services/repository.ts')
const service = harness.load('_services/task.service.ts')
const { getReviewableTasks, expectedEnd, taskToInput } = harness.load('_lib/task-review.ts')
let sequence = 0
const id = () => `completion_${++sequence}`
const input = (patch = {}) => ({ title: 'Bài 7 nhân phân số', groupId: 'inbox', status: 'todo', ...patch })
const get = async id => (await repo.scanTasks('alice')).find(t => t.id === id)
const create = async (patch = {}) => get((await service.saveManualTask('alice', id(), 'CREATE_TASK', input(patch))).id)
test.beforeEach(async () => { harness.reset(); await repo.initialize('alice') })

test('optional rating is null, server owns completedAt, retry is idempotent', async () => {
  const task = await create(), requestId = id()
  const data = { ...taskToInput(task), status: 'done', completionNote: '   ' }
  await service.saveManualTask('alice', requestId, 'UPDATE_TASK', data, task.id, task.version)
  const saved = await get(task.id)
  assert.equal(saved.status, 'done'); assert.equal(saved.completionPercent, null); assert.equal(saved.completionNote, null)
  assert.ok(Number.isFinite(Date.parse(saved.completedAt)))
  await service.saveManualTask('alice', requestId, 'UPDATE_TASK', data, task.id, task.version)
  assert.deepEqual(await get(task.id), saved)
  assert.equal(model.taskInputSchema.safeParse({ ...data, completedAt: '2026-01-01T00:00:00Z' }).success, false)
})
test('0, 50, 68 and 100 are valid final ratings; regular edits preserve them and reopening clears them', async () => {
  for (const percent of [0, 50, 68, 100]) {
    const task = await create()
    await service.saveManualTask('alice', id(), 'UPDATE_TASK', { ...taskToInput(task), status: 'done', completionPercent: percent, completionNote: '  Còn bài tập cuối.  ' }, task.id, task.version)
    const done = await get(task.id)
    assert.equal(done.completionPercent, percent); assert.equal(done.completionNote, 'Còn bài tập cuối.')
    await service.saveManualTask('alice', id(), 'UPDATE_TASK', { ...taskToInput(done), title: 'Đổi tiêu đề' }, done.id, done.version)
    const edited = await get(done.id)
    assert.equal(edited.completionPercent, percent); assert.equal(edited.completionNote, done.completionNote); assert.equal(edited.completedAt, done.completedAt)
    await service.saveManualTask('alice', id(), 'UPDATE_TASK', { ...taskToInput(edited), status: 'todo' }, edited.id, edited.version)
    const reopened = await get(done.id)
    assert.equal(reopened.completionPercent, null); assert.equal(reopened.completionNote, null); assert.equal(reopened.completedAt, null)
  }
})
test('invalid ratings reject; active work cannot acquire completion progress; stale versions cannot overwrite', async () => {
  for (const percent of [-1, 101, 1.5, '50']) assert.equal(model.taskInputSchema.safeParse(input({ completionPercent: percent })).success, false)
  const task = await create({ completionPercent: 70, completionNote: 'Not progress' })
  assert.equal(task.completionPercent, null); assert.equal(task.completionNote, null)
  await service.saveManualTask('alice', id(), 'UPDATE_TASK', { ...taskToInput(task), title: 'Changed' }, task.id, task.version)
  await assert.rejects(service.saveManualTask('alice', id(), 'UPDATE_TASK', { ...taskToInput(task), status: 'done', completionPercent: 68 }, task.id, task.version), /thay đổi/)
  assert.equal((await get(task.id)).status, 'todo')
})
test('chat completion confirmation stores the same final rating and closes the pending proposal', async () => {
  const task = await create()
  const reply = await service.prepareIntent('alice', { action: 'COMPLETE_TASK', target: { query: task.title } })
  const turn = await service.appendTurn('alice', id(), 'bài 7 xong rồi', reply)
  assert.equal((await get(task.id)).status, 'todo')
  await service.confirmProposal('alice', turn.id, { ...reply.proposal.data, completionPercent: 80, completionNote: 'Đã dạy xong, còn bài tập.' })
  const done = await get(task.id)
  assert.equal(done.status, 'done'); assert.equal(done.completionPercent, 80)
  assert.equal((await repo.sessionRef('alice').get()).get('pendingId'), null)
})
test('review thresholds, ordering, expected end, hierarchy and closed task exclusion', () => {
  const now = Date.parse('2026-09-20T12:00:00+07:00'), hour = 3600000
  const ago = h => new Date(now - h * hour).toISOString()
  const fixture = (id, fields = {}) => ({ id, status: 'todo', title: id, startTime: null, deadline: null, createdAt: ago(200), updatedAt: ago(200), parentId: null, ...fields })
  const tasks = [fixture('parent'), fixture('old', { parentId: 'parent' }), fixture('new', { createdAt: ago(1), updatedAt: ago(1) }), fixture('overdue', { deadline: ago(5) }), fixture('due', { startTime: ago(3), duration: 120, scheduleMode: 'duration' }), fixture('started', { startTime: ago(3), updatedAt: ago(2) }), fixture('done', { status: 'done', deadline: ago(5) }), fixture('cancelled', { status: 'cancelled' }), fixture('deleted', { deletedAt: ago(1) })]
  const snapshot = JSON.stringify(tasks)
  assert.deepEqual(getReviewableTasks(tasks, now).map(r => r.task.id), ['overdue', 'due', 'started', 'old'])
  assert.equal(expectedEnd(tasks.find(t => t.id === 'due')), now - hour)
  assert.equal(JSON.stringify(tasks), snapshot)
})

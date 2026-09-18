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
let sequence = 0
const id = () => `request_${++sequence}`
const input = (title = 'Code EDA cho MSD') => ({ title, groupId: 'ainka', description: null, priority: 'normal', status: 'todo', deadline: null, parentId: null })
const propose = (uid, data = input()) => service.proposeManual(uid, id(), 'CREATE_TASK', data)
async function create(uid = 'alice', data = input()) { const p = await propose(uid, data); const r = await service.confirmProposal(uid, p.id, data); return (await repo.scanTasks(uid)).find(t => t.id === r.id) }
async function mutate(task, action, changes = {}, uid = 'alice') {
  const data = { ...input(), ...Object.fromEntries(Object.keys(input()).map(k => [k, task[k]])), ...changes }
  const p = await service.proposeManual(uid, id(), action, data, task.id, task.version)
  await service.confirmProposal(uid, p.id, data)
  return (await repo.scanTasks(uid)).find(t => t.id === task.id)
}
test.beforeEach(async () => { harness.reset(); await repo.initialize('alice') })

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
    reply = { action: 'DROP_DATABASE' }
    await assert.rejects(() => parser.parseTaskIntent('Xóa hết', groups), /chưa hiểu/)
  } finally {
    global.fetch = oldFetch
    if (oldProvider === undefined) delete process.env.CHAT_PROVIDER; else process.env.CHAT_PROVIDER = oldProvider
    if (oldKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = oldKey
  }
})

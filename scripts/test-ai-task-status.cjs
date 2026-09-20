const assert = require('node:assert/strict')
const { load } = require('./lib/ai-task-test-harness.cjs')
const { uiStatuses, uiStatus, waitingTree } = load('_lib/status-presentation.ts')
const { statusLabels, taskInputSchema, statuses } = load('_lib/model.ts')

assert.deepEqual(uiStatuses.map(s => statusLabels[s]), ['Mới tạo', 'Đang làm', 'Đang chờ', 'Hoàn thành', 'Đã hủy'])
assert.equal(new Set(statuses.map(s => statusLabels[s])).size, 5)
assert.equal(statusLabels[taskInputSchema.parse({ title: 'Việc mới', groupId: 'g' }).status], 'Mới tạo')
assert.equal(uiStatus('blocked'), 'waiting')
assert.equal(taskInputSchema.parse({ title: 'Việc cũ', groupId: 'g', status: 'blocked' }).status, 'blocked')
const tasks = [{ id: 'parent', parentId: null, status: 'todo' }, { id: 'old', parentId: 'parent', status: 'blocked' }, { id: 'wait', parentId: null, status: 'waiting' }, { id: 'unmatched', parentId: null, status: 'waiting' }]
const data = { tasks, matchingIds: ['old', 'wait'], total: 2 }
const before = JSON.stringify(data)
const result = waitingTree(data)
assert.deepEqual(result.matchingIds, ['old', 'wait'])
assert.deepEqual(result.tasks.map(t => t.id), ['parent', 'old', 'wait'])
assert.equal(result.total, 2)
assert.equal(JSON.stringify(data), before)
for (const deadline of [null, '2000-01-01T00:00:00Z', '2099-01-01T00:00:00Z']) {
  const t = taskInputSchema.parse({ title: 'Không suy diễn', groupId: 'g', status: 'todo', deadline })
  assert.equal(uiStatus(t.status), 'todo')
}
console.log('PASS: exactly five UI states, new task default, legacy blocked compatibility, waiting tree filter and no time-derived status')

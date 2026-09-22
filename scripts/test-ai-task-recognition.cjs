const test = require('node:test')
const assert = require('node:assert/strict')
const harness = require('./lib/ai-task-test-harness.cjs')
const { NextRequest } = require('next/server')
const root = '../src/modules/ai-task/action-recognition/'
const { recognizeAction } = require(root + 'recognizeAction.ts')
const { explicitAction } = require(root + 'explicitAction.ts')
const { normalizePattern } = require(root + 'normalizePattern.ts')
const { resolveTarget } = require(root + 'resolveTarget.ts')
const { detectSpeechAct, extractEntities } = require(root + 'signals.ts')
const { readBrowserContext, loadBrowserContext, saveBrowserContext } = require(
  root + 'context/browserContext.ts'
)
const { loadIntentPattern } = require(root + 'memory/memoryRepository.ts')
const { learnFromTurn } = require(root + 'feedback/feedbackService.ts')
const repo = harness.load('_services/repository.ts')
const service = harness.load('_services/task.service.ts')
const routes = harness.load('api/route.ts')
let sequence = 0
const id = () => `recognition_${++sequence}`
const input = (title) => ({
  title,
  groupId: 'inbox',
  description: null,
  priority: 'normal',
  status: 'todo',
  deadline: null,
  parentId: null,
  startTime: null,
  duration: null,
  withinDay: false,
  startNow: false,
  scheduleMode: 'deadline',
})
async function create(title, uid = 'alice', extra = {}) {
  const saved = await service.saveManualTask(uid, id(), 'CREATE_TASK', {
    ...input(title),
    ...extra,
  })
  return (await repo.scanTasks(uid)).find((task) => task.id === saved.id)
}
const ctx = (values) => ({ updatedAt: Date.now(), ...values })
async function chat(text, fields = {}) {
  const requestId = fields.requestId || id()
  const response = await routes.POST(
    new NextRequest('http://localhost/demo/ai-task/api', {
      method: 'POST',
      body: JSON.stringify({ operation: 'chat', requestId, text, ...fields }),
    })
  )
  const body = await response.json()
  assert.equal(response.status, 200, JSON.stringify(body))
  const message = (await repo.messageCollection('alice').doc(requestId).get()).data()
  return { ...body.result, message }
}
async function withAI(result, work) {
  const previous = global.fetch
  const previousProvider = process.env.CHAT_PROVIDER,
    previousKey = process.env.GROQ_API_KEY
  process.env.CHAT_PROVIDER = 'groq'
  process.env.GROQ_API_KEY = 'offline-test'
  global.fetch = async (_url, options) => {
    const body = JSON.parse(options.body)
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify(typeof result === 'function' ? result(body) : result),
          },
        },
      ],
    })
  }
  try {
    return await work()
  } finally {
    global.fetch = previous
    if (previousProvider === undefined) delete process.env.CHAT_PROVIDER
    else process.env.CHAT_PROVIDER = previousProvider
    if (previousKey === undefined) delete process.env.GROQ_API_KEY
    else process.env.GROQ_API_KEY = previousKey
  }
}
test.beforeEach(async () => {
  harness.reset()
  await repo.initialize('alice')
})

test('generic explicit actions distinguish queries, cancellation, deletion and all MVP updates', () => {
  const examples = {
    'Thêm việc làm landing page': 'task.create',
    'Hôm nay tôi có việc gì?': 'task.list',
    'Tìm các việc của Shop Bé Băng': 'task.search',
    'Việc landing page thế nào rồi?': 'task.detail',
    'Đổi tên việc này thành Trang chủ': 'task.update',
    'Dời nó sang mai': 'task.reschedule',
    'Cho việc đó trễ thêm 2 ngày': 'task.reschedule',
    'Mai mới làm': 'task.reschedule',
    'Việc này được 50% rồi': 'task.progress',
    'Mới làm được khoảng một nửa': 'task.progress',
    'Xong rồi': 'task.complete',
    'Không làm việc này nữa': 'task.cancel',
    'Xóa task này': 'task.delete',
    'Ghi chú cần gọi khách trước': 'task.note',
    'Cái này gấp': 'task.priority',
    'Dạy Nhật Anh hôm nay mấy giờ?': 'task.search',
    'Dạy Nhật Anh đổi sang 6h': 'task.reschedule',
    'Dạy Nhật Anh xong rồi': 'task.complete',
  }
  for (const [text, action] of Object.entries(examples))
    assert.equal(explicitAction(text), action, text)
  for (const text of ['Đừng xóa việc này', 'Có nên thêm việc này?', 'Nếu xóa việc đó thì sao?'])
    assert.equal(explicitAction(text), undefined)
})

test('normalization groups numeric variations without removing query/action semantics', () => {
  assert.equal(normalizePattern('Dạy Nhật Anh bài 3'), normalizePattern('Dạy Nhật Anh bài 10'))
  assert.equal(
    normalizePattern('Gọi khách 6h30 ngày 25 thứ 3'),
    'goi khach {time} ngay {day} thu {weekday}'
  )
  assert.notEqual(normalizePattern('Tìm bài 3'), normalizePattern('Thêm bài 3'))
})

test('speech acts and entities keep supplied context out of task mutations', async () => {
  assert.equal(detectSpeechAct('CÃ³ nÃªn dá»i task nÃ y khÃ´ng?'), 'QUESTION')
  assert.equal(detectSpeechAct('Van de day Nhat Anh nhe'), 'CONTEXT_SETTING')
  assert.equal(extractEntities('Mai bai 3').date, 'tomorrow')
  const output = await recognizeAction({
    text: 'Mai bai 3', tasks: [], groups: [], context: ctx(),
    parse: async () => { throw new Error('inform must not invoke semantic task parsing') },
  })
  assert.equal(output.intent.action, 'CHAT')
  assert.equal(output.result.intent, 'INFORM')
  assert.equal(output.result.action, undefined)
})

test('recognition is side effect free and explicit query beats personal prior', async () => {
  const text = 'Tìm việc kiểm tra 5'
  const pattern = {
    pattern: normalizePattern(text),
    preferredAction: 'task.create',
    confidence: 0.95,
  }
  const before = harness.metrics().writes.length
  const output = await recognizeAction({
    text,
    tasks: [],
    groups: [],
    context: ctx(),
    pattern,
    parse: async () => ({ action: 'GET_TASKS', filters: { query: 'kiểm tra 5' } }),
  })
  assert.equal(output.result.action, 'task.search')
  assert.equal(output.result.source, 'explicit')
  assert.equal(output.result.requiresConfirmation, false)
  assert.equal(harness.metrics().writes.length, before)
})

test('browser context expires, is bounded and is isolated per account', () => {
  assert.equal(
    readBrowserContext({ lastTaskId: 'a', updatedAt: Date.now() - 7200001 }).lastTaskId,
    undefined
  )
  assert.equal(
    readBrowserContext({ lastTaskId: 'a', updatedAt: Date.now() + 60000 }).lastTaskId,
    undefined
  )
  assert.equal(readBrowserContext(ctx({ lastTaskIds: Array(31).fill('a') })).lastTaskIds, undefined)
  const storage = new Map()
  global.sessionStorage = {
    getItem: (key) => storage.get(key),
    setItem: (key, value) => storage.set(key, value),
  }
  try {
    saveBrowserContext('alice', ctx({ lastTaskId: 'a' }))
    assert.equal(loadBrowserContext('alice').lastTaskId, 'a')
    assert.equal(loadBrowserContext('bob').lastTaskId, undefined)
  } finally {
    delete global.sessionStorage
  }
})

test('references and ordinals select owned live tasks and do not guess duplicate names', async () => {
  const first = await create('Landing page'),
    second = await create('Landing page')
  const tasks = await repo.scanTasks('alice')
  assert.equal(
    resolveTarget('cái thứ 2', ctx({ lastTaskIds: [first.id, second.id] }), tasks).task.id,
    second.id
  )
  assert.equal(resolveTarget('nó', ctx({ lastTaskId: first.id }), tasks).task.id, first.id)
  assert.equal(resolveTarget('Landing page', ctx(), tasks).task, undefined)
  assert.equal(resolveTarget('cái thứ 9', ctx({ lastTaskIds: [first.id] }), tasks).task, undefined)
  assert.equal(resolveTarget('nó', ctx({ lastTaskId: 'foreign' }), tasks).task, undefined)
})

test('rescheduling a referenced task only proposes a change until confirmation', async () => {
  const task = await create('Landing page', 'alice', { deadline: '2030-10-01T10:00:00Z' })
  await withAI(
    {
      action: 'UPDATE_TASK',
      target: { query: 'nó' },
      changes: { deadline: '2030-10-03T10:00:00Z' },
    },
    async () => {
      const turn = await chat('Dời nó sang thứ 4', { browserContext: ctx({ lastTaskId: task.id }) })
      assert.equal(turn.message.proposal.taskId, task.id)
      assert.equal(turn.message.recognition.result.action, 'task.reschedule')
      assert.equal((await repo.scanTasks('alice'))[0].deadline, task.deadline)
      await service.confirmProposal('alice', turn.id, turn.message.proposal.data)
      assert.equal((await repo.scanTasks('alice'))[0].deadline, '2030-10-03T10:00:00.000Z')
    }
  )
})

test('unknown or foreign contextual IDs ask for a target without creating tasks', async () => {
  await repo.initialize('bob')
  const foreign = await create('Private task', 'bob')
  await withAI({ action: 'COMPLETE_TASK', target: { query: 'việc đó' } }, async () => {
    const turn = await chat('Xong rồi', { browserContext: ctx({ lastTaskId: foreign.id }) })
    assert.equal(turn.message.status, 'normal')
    assert.equal(turn.message.proposal, undefined)
    assert.equal((await repo.scanTasks('alice')).length, 0)
  })
})

test('progress survives confirmation and unrelated edits without marking task done', async () => {
  const task = await create('Call customer')
  await withAI(
    { action: 'UPDATE_TASK', target: { query: 'việc này' }, changes: { completionPercent: 50 } },
    async () => {
      const turn = await chat('Việc này được 50% rồi', {
        browserContext: ctx({ lastTaskId: task.id }),
      })
      assert.equal(turn.message.proposal.data.completionPercent, 50)
      await service.confirmProposal('alice', turn.id, turn.message.proposal.data)
      const saved = (await repo.scanTasks('alice'))[0]
      assert.equal(saved.status, 'in_progress')
      assert.equal(saved.completionPercent, 50)
      assert.equal(saved.completedAt, null)
      await service.saveManualTask(
        'alice',
        id(),
        'UPDATE_TASK',
        { ...input(saved.title), status: 'in_progress', priority: 'urgent' },
        saved.id,
        saved.version
      )
      assert.equal((await repo.scanTasks('alice'))[0].completionPercent, 50)
    }
  )
})

test('note appends to existing description, including disambiguated target', async () => {
  await create('Customer', 'alice', { description: 'Old note' })
  const task = await create('Customer', 'alice', { description: 'Keep this' })
  await withAI(
    {
      action: 'UPDATE_TASK',
      target: { query: 'Customer' },
      changes: { description: 'Call first' },
    },
    async () => {
      const turn = await chat('Ghi chú cần gọi khách trước')
      assert.equal(turn.message.status, 'choose')
      await service.chooseTask('alice', turn.id, task.id)
      const chosen = (await repo.messageCollection('alice').doc(turn.id).get()).data()
      assert.equal(chosen.proposal.data.description, 'Keep this\nCall first')
    }
  )
})

test('correction learns +3 once, subsequent ambiguous variants use memory and confirmation adds +1 once', async () => {
  await withAI({ action: 'GET_TASKS', filters: { query: 'kiểm tra 5' } }, async () => {
    const original = await chat('Kiểm tra hợp đồng 5')
    const corrected = await chat('Không, thêm công việc.', {
      browserContext: ctx({ lastMessageId: original.id }),
    })
    assert.equal(corrected.message.proposal.action, 'CREATE_TASK')
    let pattern = await loadIntentPattern('alice', 'Kiểm tra hợp đồng 8')
    assert.equal(pattern.preferredAction, 'task.create')
    assert.equal(pattern.scores['task.create'], 3)
    await learnFromTurn('alice', corrected.id, 'correction')
    assert.equal((await loadIntentPattern('alice', 'Kiểm tra hợp đồng 8')).scores['task.create'], 3)
    await service.confirmProposal('alice', corrected.id, corrected.message.proposal.data)
    await service.confirmProposal('alice', corrected.id, corrected.message.proposal.data)
    pattern = await loadIntentPattern('alice', 'Kiểm tra hợp đồng 8')
    assert.equal(pattern.scores['task.create'], 4)
    const next = await chat('Kiểm tra hợp đồng 8')
    assert.equal(next.message.recognition.result.source, 'personal_memory')
    assert.equal(next.message.proposal.action, 'CREATE_TASK')
    assert.equal(await loadIntentPattern('bob', 'Kiểm tra hợp đồng 8'), undefined)
  })
})

test('pending action can be corrected to a read without mutating or leaving a stale confirmation', async () => {
  await withAI({ action: 'CREATE_TASK', data: { title: 'Contract 5' } }, async () => {
    const original = await chat('Contract 5')
    const corrected = await chat('Không, tìm công việc.', {
      pendingId: original.id,
      context: original.context,
      browserContext: ctx({ lastMessageId: original.id }),
    })
    assert.equal(corrected.message.status, 'normal')
    assert.equal((await repo.sessionRef('alice').get()).get('pendingId'), null)
    assert.equal(
      (await repo.messageCollection('alice').doc(original.id).get()).get('status'),
      'cancelled'
    )
    assert.equal((await repo.scanTasks('alice')).length, 0)
    const pattern = await loadIntentPattern('alice', 'Contract 5')
    assert.equal(pattern.preferredAction, 'task.search')
  })
})

test('cancelled proposals and failed/stale task saves never learn confirmation signals', async () => {
  await withAI({ action: 'CREATE_TASK', data: { title: 'Contract 5' } }, async () => {
    const turn = await chat('Contract 5')
    await service.cancelProposal('alice', turn.id)
    await learnFromTurn('alice', turn.id, 'confirmation')
    assert.equal(await loadIntentPattern('alice', 'Contract 5'), undefined)
    await assert.rejects(() =>
      service.confirmProposal('alice', turn.id, turn.message.proposal.data)
    )
    assert.equal(await loadIntentPattern('alice', 'Contract 5'), undefined)
  })
})

test('new recognition API fields never allow UID injection', async () => {
  const response = await routes.POST(
    new NextRequest('http://localhost/demo/ai-task/api', {
      method: 'POST',
      body: JSON.stringify({
        operation: 'chat',
        requestId: id(),
        text: 'Xong rồi',
        browserContext: ctx({ userId: 'bob' }),
      }),
    })
  )
  assert.equal(response.status, 400)
})

test('reschedule and progress on an unsaved draft keep one create proposal and no task writes', async () => {
  await withAI(
    (body) => {
      const text = body.messages.at(-1).content
      return text === 'Chuẩn bị hợp đồng'
        ? { action: 'CREATE_TASK', data: { title: text } }
        : text === 'Dời nó sang mai'
          ? {
              action: 'UPDATE_TASK',
              target: { query: 'nó' },
              changes: { deadline: '2030-10-01T10:00:00Z' },
            }
          : {
              action: 'UPDATE_TASK',
              target: { query: 'việc này' },
              changes: { completionPercent: 50 },
            }
    },
    async () => {
      const first = await chat('Chuẩn bị hợp đồng')
      const moved = await chat('Dời nó sang mai', {
        context: first.context,
        pendingId: first.id,
        browserContext: ctx({ lastMessageId: first.id }),
      })
      assert.equal(moved.message.proposal.action, 'CREATE_TASK')
      assert.equal(moved.message.proposal.taskId, null)
      assert.equal(moved.message.proposal.data.title, 'Chuẩn bị hợp đồng')
      assert.equal(moved.message.proposal.data.deadline, '2030-10-01T10:00:00Z')
      const progress = await chat('Việc này được 50% rồi', {
        context: moved.context,
        pendingId: moved.id,
        browserContext: ctx({ lastMessageId: moved.id }),
      })
      assert.equal(progress.message.proposal.data.completionPercent, 50)
      assert.equal(progress.message.proposal.data.status, 'in_progress')
      assert.equal((await repo.scanTasks('alice')).length, 0)
      await service.confirmProposal('alice', progress.id, progress.message.proposal.data)
      assert.equal((await repo.scanTasks('alice')).length, 1)
    }
  )
})

test('cancel and delete remain distinct actions with independent confirmations', async () => {
  const task = await create('Contract')
  await withAI(
    (body) =>
      body.messages.at(-1).content.startsWith('Hủy')
        ? { action: 'CANCEL_TASK', target: { query: 'việc đó' } }
        : { action: 'DELETE_TASK', target: { query: 'việc đó' } },
    async () => {
      const cancelled = await chat('Hủy việc đó', { browserContext: ctx({ lastTaskId: task.id }) })
      assert.equal((await repo.scanTasks('alice'))[0].status, 'todo')
      await service.confirmProposal('alice', cancelled.id, cancelled.message.proposal.data)
      let saved = (await repo.scanTasks('alice'))[0]
      assert.equal(saved.status, 'cancelled')
      assert.equal(saved.deletedAt, null)
      const deleted = await chat('Xóa việc đó', { browserContext: ctx({ lastTaskId: task.id }) })
      assert.equal(deleted.message.proposal.action, 'DELETE_TASK')
      await service.confirmProposal('alice', deleted.id, deleted.message.proposal.data)
      saved = (await repo.scanTasks('alice'))[0]
      assert.ok(saved.deletedAt)
    }
  )
})

test('detailed corrections preserve their new payload instead of replaying original text', async () => {
  const task = await create('Contract')
  await withAI(
    (body) =>
      body.messages.at(-1).content === 'Contract'
        ? { action: 'GET_TASKS', filters: { query: 'Contract' } }
        : {
            action: 'UPDATE_TASK',
            target: { query: 'Contract' },
            changes: { deadline: '2030-10-02T10:00:00Z' },
          },
    async () => {
      const original = await chat('Contract')
      const corrected = await chat('Không, dời Contract sang ngày 2.', {
        browserContext: ctx({ lastMessageId: original.id }),
      })
      assert.equal(corrected.message.proposal.taskId, task.id)
      assert.equal(corrected.message.proposal.data.deadline, '2030-10-02T10:00:00Z')
      assert.equal(corrected.message.recognition.originalText, 'Contract')
    }
  )
})

test('reversed corrections lower the old action score and preserve other users memory', () => {
  const { updateIntentPattern } = require(root + 'memory/intentMemory.ts')
  const previous = { scores: { 'task.create': 5, 'task.search': 1 }, examples: [], usageCount: 3 }
  const next = updateIntentPattern(
    previous,
    'contract {number}',
    'Contract 5',
    'task.search',
    'task.create'
  )
  assert.equal(next.scores['task.create'], 3)
  assert.equal(next.scores['task.search'], 4)
  assert.equal(next.preferredAction, 'task.search')
  assert.equal(previous.scores['task.create'], 5)
})

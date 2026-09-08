const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function load(relative, mocks = {}) {
  const filename = path.resolve(__dirname, '..', relative)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  const localRequire = name => {
    if (name in mocks) return mocks[name]
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`, mocks)
    return require(name)
  }
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports)
  return module.exports
}

function endpoint(auth, rows = {}, fail = false) {
  const reads = []
  const collection = {
    collection: () => collection,
    doc: id => ({
      collection: () => collection,
      get: async () => {
        reads.push(id)
        if (fail) throw new Error('Database unavailable')
        return { data: () => rows[id] }
      },
    }),
  }
  const { GET } = load('src/app/api/chat/learning-progress/route.ts', {
    '@/lib/auth/current-user': { requireGameUser: async () => auth },
    '@/lib/firebaseAdmin': { getAdminDb: () => collection },
  })
  return { GET, reads }
}

test('denies unauthenticated and disabled accounts before reading progress', async () => {
  for (const status of [401, 403]) {
    const { GET, reads } = endpoint({ ok: false, status })
    const response = await GET(new Request('http://localhost/api/chat/learning-progress?grade=1'))
    assert.equal(response.status, status)
    assert.deepEqual(reads, [])
  }
})

test('summary is scoped to authenticated user and weights goals across the catalog', async () => {
  const { GET, reads } = endpoint({ ok: true, user: { id: 'child-a', activeGrade: 1 } }, {
    'child-a_toan-1-bai-1': { totalSessions: 2, keys: {
      'recognize-number-0': { attempts: 3, correct: 2, wrong: 1 },
      'recognize-number-1': { attempts: 1, correct: 0, wrong: 1 },
    } },
  })
  const response = await GET(new Request('http://localhost/api/chat/learning-progress?grade=1&userId=child-b'))
  const report = await response.json()
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.ok(reads.every(id => id.startsWith('child-a_')))
  assert.equal(report.practiced, 2)
  assert.equal(report.percent, Math.round(2 / report.total * 100))
  assert.equal(report.lessons.length, 3)
  assert.ok(report.lessons.every(lesson => !('goals' in lesson)))
  assert.equal(report.lessons[0].percent, 33)
})

test('details fetch fresh goal counts; missing lessons remain unpracticed', async () => {
  const { GET } = endpoint({ ok: true, user: { id: 'child-a', activeGrade: 1 } }, {
    'child-a_toan-1-bai-1': { keys: { 'recognize-number-0': { attempts: 3, correct: 2, wrong: 1 } } },
  })
  const report = await (await GET(new Request('http://localhost/api/chat/learning-progress?grade=1&detail=1'))).json()
  assert.deepEqual(report.lessons[0].goals[0], { title: 'Nhận biết số 0', attempts: 3, correct: 2, wrong: 1 })
  assert.equal(report.lessons[1].percent, 0)
  assert.ok(report.lessons.every(lesson => lesson.goals.length === lesson.total))
})

test('empty history is reported without claiming mastery', async () => {
  const { GET } = endpoint({ ok: true, user: { id: 'new-child', activeGrade: 1 } })
  const report = await (await GET(new Request('http://localhost/api/chat/learning-progress?grade=1'))).json()
  assert.equal(report.percent, 0)
  const { formatProgress } = load('src/lib/chat/learning-progress.ts')
  assert.match(formatProgress(report, false), /Chưa ghi nhận/)
})

test('database failure returns an error, not fabricated progress', async () => {
  const { GET } = endpoint({ ok: true, user: { id: 'child-a', activeGrade: 1 } }, {}, true)
  const originalError = console.error
  console.error = () => {}
  try {
    const response = await GET(new Request('http://localhost/api/chat/learning-progress?grade=1'))
    assert.equal(response.status, 500)
    assert.ok((await response.json()).error)
  } finally { console.error = originalError }
})

test('recognizes progress requests and detail follow-ups without intercepting ordinary game links', () => {
  const { isProgressRequest, isProgressDetailRequest } = load('src/lib/chat/learning-progress.ts')
  for (const text of ['Cho biết tiến trình học hiện tại của bé', 'Bé học đến đâu?', 'Kết quả học của bé', 'Bé đã hoàn thành bao nhiêu %?', 'tien do hoc']) assert.ok(isProgressRequest(text), text)
  for (const text of ['Cho xem chi tiết', 'Kết quả từng bài', 'Xem thêm', 'Bé trả lời đúng và sai bao nhiêu?']) assert.ok(isProgressDetailRequest(text), text)
  for (const text of ['Gửi link Đào vàng bài 1', 'Cách chơi Đua xe']) {
    assert.equal(isProgressRequest(text), false)
    assert.equal(isProgressDetailRequest(text), false)
  }
})

test('other grades never read or expose grade one progress', async () => {
  for (const grade of [2, 3]) {
    const { GET, reads } = endpoint({ ok: true, user: { id: 'child-a', activeGrade: grade } })
    const report = await (await GET(new Request(`http://localhost/api/chat/learning-progress?grade=${grade}`))).json()
    assert.equal(report.grade, grade)
    assert.deepEqual(report.lessons, [])
    assert.equal(report.total, 0)
    assert.deepEqual(reads, [])
    const { formatProgress } = load('src/lib/chat/learning-progress.ts')
    const message = formatProgress(report, false)
    for (const subject of ['Toán', 'Tiếng Anh', 'Tiếng Việt']) assert.ok(message.includes(`${subject} - Chưa có bài học`))
  }
})

test('subject detail only reads the selected subject within the confirmed grade', async () => {
  const { GET, reads } = endpoint({ ok: true, user: { id: 'child-a', activeGrade: 1 } })
  const report = await (await GET(new Request('http://localhost/api/chat/learning-progress?grade=1&detail=1&subject=tieng-anh'))).json()
  assert.deepEqual(reads, ['child-a_tieng-anh-1-bai-1'])
  assert.equal(report.lessons.length, 1)
  assert.equal(report.subject, 'tieng-anh')
  const { formatProgress } = load('src/lib/chat/learning-progress.ts')
  const message = formatProgress(report, true)
  assert.ok(message.includes('Tiếng Anh -'))
  assert.ok(!message.includes('Toán -'))
})

test('rejects invalid subjects without reads', async () => {
  for (const query of ['?subject=unknown', '?subject=toString']) {
    const { GET, reads } = endpoint({ ok: true, user: { id: 'child-a', activeGrade: 1 } })
    const response = await GET(new Request(`http://localhost/api/chat/learning-progress${query}`))
    assert.equal(response.status, 400)
    assert.deepEqual(reads, [])
  }
})

test('summary groups all three subjects and asks whether to show more detail', async () => {
  const { GET } = endpoint({ ok: true, user: { id: 'child-a', activeGrade: 1 } })
  const report = await (await GET(new Request('http://localhost/api/chat/learning-progress?grade=1'))).json()
  const { formatProgress } = load('src/lib/chat/learning-progress.ts')
  const message = formatProgress(report, false)
  assert.ok(message.indexOf('Toán -') < message.indexOf('Tiếng Anh -'))
  assert.ok(message.indexOf('Tiếng Anh -') < message.indexOf('Tiếng Việt -'))
  assert.ok(message.endsWith('Bạn có muốn biết thêm chi tiết từng môn không?'))
})

test('uses the database active grade even when the client supplies another grade', async () => {
  const { GET, reads } = endpoint({ ok: true, user: { id: 'child-a', activeGrade: 2, primaryGrade: 1 } })
  const report = await (await GET(new Request('http://localhost/api/chat/learning-progress?grade=1'))).json()
  assert.equal(report.grade, 2)
  assert.deepEqual(reads, [])
})

test('falls back to the database primary grade without asking for a grade', async () => {
  const { GET } = endpoint({ ok: true, user: { id: 'child-a', activeGrade: null, primaryGrade: 1 } })
  const response = await GET(new Request('http://localhost/api/chat/learning-progress'))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).grade, 1)
})

test('missing database grade does not guess a grade or read tracking', async () => {
  const { GET, reads } = endpoint({ ok: true, user: { id: 'child-a', activeGrade: null, primaryGrade: null } })
  const response = await GET(new Request('http://localhost/api/chat/learning-progress?grade=1'))
  assert.equal(response.status, 422)
  assert.deepEqual(reads, [])
})


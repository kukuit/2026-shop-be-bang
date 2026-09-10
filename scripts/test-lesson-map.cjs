const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const { test } = require('node:test')

function load(file, dependencies = {}) {
  const source = readFileSync(path.join(__dirname, '..', file), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } })
  const exports = {}
  new Function('exports', 'require', outputText)(exports, name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`)
    return dependencies[name]
  })
  return exports
}
const progress = load('src/components/games/lesson-map/progress.ts')
const { buildLessonMapItems, getLessonStarCount } = progress
const games = ['bubble-shooter', 'drag-drop', 'gold-mining', 'racing']
const lessons = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1, lessonId: `lesson-${index + 1}`, title: `Lesson ${index + 1}`,
  href: '/', available: index < 10, games, requiredGames: 2,
}))
const completed = (lesson, count) => games.slice(0, count).map(gameId => ({ lessonId: `lesson-${lesson}`, gameId, completedAt: true }))

test('new user: one current, remaining open lessons available, future lessons locked', () => {
  const items = buildLessonMapItems(lessons, [])
  assert.equal(items[0].status, 'current')
  assert.equal(items[0].stars, 0)
  assert.ok(items.slice(1, 10).every(item => item.status === 'available'))
  assert.ok(items.slice(10).every(item => item.status === 'locked'))
})
test('four-game milestones: 0, 1, 3, 4, 5 stars and completion at two games', () => {
  for (let count = 0; count <= 4; count++) {
    const items = buildLessonMapItems(lessons, completed(1, count))
    assert.equal(items[0].stars, [0, 1, 3, 4, 5][count])
    assert.equal(items[0].status, count >= 2 ? 'completed' : 'current')
    assert.equal(items[1].status, count >= 2 ? 'current' : 'available')
  }
})
test('soft progression and out-of-order completion retain earliest recommendation', () => {
  let items = buildLessonMapItems(lessons, [...completed(1, 2), ...completed(2, 2), ...completed(5, 1)])
  assert.equal(items[2].status, 'current')
  assert.equal(items[4].status, 'available')
  assert.equal(items[4].stars, 1)
  items = buildLessonMapItems(lessons, [...completed(1, 2), ...completed(3, 2)])
  assert.equal(items[1].status, 'current')
  assert.equal(items[2].status, 'completed')
})
test('replays, unfinished records and unrelated game IDs do not inflate progress', () => {
  const items = buildLessonMapItems(lessons, [
    ...Array.from({ length: 10 }, () => completed(1, 1)[0]),
    { lessonId: 'lesson-1', gameId: 'drag-drop' },
    { lessonId: 'lesson-1', gameId: 'unknown', completedAt: true },
  ])
  assert.equal(items[0].completedGames, 1)
  assert.equal(items[0].stars, 1)
})
test('completed overrides closed availability; order determines current, not input order', () => {
  const items = buildLessonMapItems([...lessons].reverse(), completed(11, 2))
  assert.equal(items.find(item => item.id === 11).status, 'completed')
  assert.equal(items.find(item => item.status === 'current').id, 1)
  assert.equal(buildLessonMapItems(lessons.slice(0, 1), completed(1, 2)).filter(item => item.status === 'current').length, 0)
})
test('20-game milestones and configurable overrides', () => {
  for (const [count, stars] of [[0, 0], [1, 1], [2, 1], [3, 2], [4, 3], [14, 3], [15, 4], [20, 5]]) {
    assert.equal(getLessonStarCount({ completedGameCount: count, totalGames: 20, requiredGames: 4 }), stars)
  }
  assert.equal(getLessonStarCount({ completedGameCount: 10, totalGames: 20, requiredGames: 4, starMilestones: { fourStars: 10 } }), 4)
})
test('zero and small game counts do not award false completion or invalid stars', () => {
  const empty = buildLessonMapItems([{ ...lessons[0], available: false, games: [], requiredGames: 0 }], [])[0]
  assert.equal(empty.completed, false)
  assert.equal(empty.stars, 0)
  for (let total = 1; total <= 20; total++) for (let required = 1; required <= total; required++) {
    let previous = 0
    for (let count = 0; count <= total; count++) {
      const stars = getLessonStarCount({ completedGameCount: count, totalGames: total, requiredGames: required })
      assert.ok(stars >= previous && stars <= 5)
      assert.equal(stars >= 3, count >= required)
      assert.equal(stars === 5, count === total)
      previous = stars
    }
  }
})
test('server loader merges aggregate and legacy sessions in one batch without writes', async () => {
  let historyReads = 0
  const docs = [{ data: () => ({ lessonId: 'lesson-1', games: { 'bubble-shooter': { completedAt: true } } }) }]
  const query = {
    collection: () => query, doc: () => query,
    where: (field, op, value) => { assert.deepEqual([field, op, value], ['userId', '==', 'user-a']); return query },
    select: () => query, get: async () => ({ docs }),
  }
  const history = {
    where: (field, op, ids) => { assert.equal(field, 'lessonId'); assert.equal(op, 'in'); assert.equal(ids.length, 12); return history },
    select: () => history,
    get: async () => { historyReads++; return { docs: [...completed(1, 2), ...completed(3, 2)].map(data => ({ data: () => data })) } },
  }
  const { getLessonMapProgress } = load('src/lib/lessonMapProgress.ts', {
    'server-only': {}, './firebaseAdmin': { getAdminDb: () => query },
    './gameTrackingPaths': { userGameSessions: userId => { assert.equal(userId, 'user-a'); return history } },
    '@/components/games/lesson-map/progress': progress,
    '@/components/games/lesson-map/progress-config': { getProgressLessons: () => lessons },
  })
  const items = await getLessonMapProgress('user-a', 'toan')
  assert.equal(historyReads, 1)
  assert.equal(items[0].completedGames, 2)
  assert.equal(items[1].status, 'current')
  assert.equal(items[2].status, 'completed')
})

test('map API requires login, validates scope and uses the authenticated user only', async () => {
  let user = null
  const calls = []
  const { GET } = load('src/app/api/game-tracking/lesson-map/route.ts', {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200, headers: options.headers }) } },
    '@/lib/auth/current-user': { getCurrentUser: async () => user },
    '@/lib/lessonMapProgress': { getLessonMapProgress: async (...args) => { calls.push(args); return [] } },
    '@/components/games/lesson-map/progress-config': { isMapSubject: value => ['toan', 'tieng-anh', 'tieng-viet'].includes(value) },
  })
  const request = query => ({ url: `http://localhost/api/game-tracking/lesson-map?${query}` })
  assert.equal((await GET(request('grade=lop-1&subject=toan'))).status, 401)
  assert.equal(calls.length, 0)
  user = { id: 'user-a', activeGame: false }
  assert.equal((await GET(request('grade=lop-2&subject=toan'))).status, 400)
  assert.equal((await GET(request('grade=lop-1&subject=invalid'))).status, 400)
  const response = await GET(request('grade=lop-1&subject=toan&userId=user-b'))
  assert.equal(response.status, 200)
  assert.equal(response.body.userId, 'user-a')
  assert.deepEqual(calls, [['user-a', 'toan']])
  assert.equal(response.headers['Cache-Control'], 'private, no-store')
  const vietnamese = await GET(request('grade=lop-1&subject=tieng-viet&userId=user-b'))
  assert.equal(vietnamese.status, 200)
  assert.equal(vietnamese.body.userId, 'user-a')
  assert.deepEqual(calls.at(-1), ['user-a', 'tieng-viet'])
})

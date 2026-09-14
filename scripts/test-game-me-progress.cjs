const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { QueryClient, QueryObserver } = require('@tanstack/react-query')
const createLoader = require('./lib/load-project-ts.cjs')
const firestoreMock = require('./lib/progress-firestore-mock.cjs')

const load = createLoader()
const model = load('src/lib/game-progress/model.ts')
const config = load('src/lib/game-progress/config.ts')
const subjectPath = (user = 'child', subject = 'toan', grade = 1) => `shopbebangcom/users/users/${user}/subjectProgress/${subject}-${grade}`
const goalPath = (lesson = 'toan-1-bai-1', user = 'child') => `shopbebangcom/game/learning_progress/${user}_${lesson}`
const sessionsPath = user => `shopbebangcom/game/user_sessions/${user}/sessions`
const user = { id: 'child', activeGame: true, activeGrade: 1, primaryGrade: 1 }

function context(seed = {}, auth = { ok: true, user }) {
  const store = firestoreMock(seed)
  const loader = createLoader({
    'firebase-admin/firestore': store.firestore,
    '@/lib/firebaseAdmin': { getAdminDb: () => store.db },
    '@/lib/auth/current-user': { requireGameUser: async () => auth, getCurrentUser: async () => auth.ok ? auth.user : null },
    '@/lib/auth/request-security': { rejectCrossSiteMutation: () => null },
    '@/lib/auth/cookies': { setGuestCookie: () => {} },
  })
  return { ...store, load: loader }
}

function session(overrides = {}) {
  return {
    sessionId: randomUUID(), lessonId: 'toan-1-bai-1', gameId: 'bubble-shooter', score: 8,
    totalQuestions: 2, correctCount: 1, wrongCount: 1, duration: 1000, startedAt: Date.now() - 1000,
    results: [
      { learningKey: 'recognize-number-0', correct: false, attempt: 1, responseTime: 300 },
      { learningKey: 'recognize-number-0', correct: true, attempt: 2, responseTime: 400 },
    ], ...overrides,
  }
}
const request = data => new Request('http://localhost/api/game-tracking/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })

test('one accuracy formula, retry attempts, minimum evidence and every status boundary', () => {
  assert.equal(model.accuracyOf(0, 0), null)
  assert.equal(model.accuracyOf(1, 2), 50)
  for (const [correct, attempts, label] of [[0,0,'Chưa học'],[1,1,'Chưa đủ dữ liệu'],[4,4,'Chưa đủ dữ liệu'],[3,5,'Cần luyện thêm'],[70,100,'Đang luyện'],[84,100,'Đang luyện'],[85,100,'Đã nắm'],[99,100,'Đã nắm'],[5,5,'Xuất sắc']])
    assert.equal(model.goalStatus(correct, attempts).label, label)
})

test('completion reuses published requirements and does not depend on accuracy', () => {
  for (const [subject, required] of [['toan',2],['tieng-anh',2],['tieng-viet',4]]) {
    const definition = config.getSubjectLessons(1, subject)[0]
    const games = Object.fromEntries(definition.games.slice(0, required).map(id => [id, {completedAt: true}]))
    const summary = model.summarizeLesson(definition, { a: {correct:0,wrong:10,attempts:10} }, games, null)
    assert.equal(summary.completed, true)
    assert.equal(summary.accuracy, 0)
    delete games[definition.games[required - 1]]
    assert.equal(model.summarizeLesson(definition, {}, games, null).completed, false)
  }
})

test('subject totals are weighted by attempts, current follows lesson order and grade does not leak', () => {
  const definitions = config.getSubjectLessons(1,'toan')
  const summaries = Object.fromEntries(definitions.slice(0,2).map((lesson,index) => [lesson.lessonId,
    model.summarizeLesson(lesson, {a:{correct:index ? 9:1,wrong:index ? 1:0,attempts:index ? 10:1}},
      Object.fromEntries(lesson.games.slice(0,2).map(id=>[id,{completedAt:true}])), null)]))
  const complete = model.buildSubjectProgress('child',1,'toan',summaries)
  assert.equal(complete.totalLessons,41)
  assert.equal(complete.completedLessons,2)
  assert.equal(complete.accuracy,91)
  assert.equal(complete.currentLessonId,'toan-1-bai-3')
  delete summaries['toan-1-bai-1']
  assert.equal(model.buildSubjectProgress('child',1,'toan',summaries).currentLessonId,'toan-1-bai-1')
  const empty = model.buildSubjectProgress('child',2,'toan',summaries)
  assert.equal(empty.totalLessons,0)
  assert.equal(empty.attempts,0)
  assert.equal(empty.accuracy,null)
})

test('recent mastery replaces early mistakes without erasing history; trends need evidence', () => {
  const improved = model.recentGoalProgress([...Array(20).fill(true), ...Array(20).fill(false), ...Array(900).fill(false)])
  assert.equal(improved.recent.accuracy, 100)
  assert.equal(improved.improvement, 100)
  assert.equal(model.goalStatus(improved.recent.correct, improved.recent.attempts).label, 'Xuất sắc')
  const declined = model.recentGoalProgress([...Array(20).fill(false), ...Array(20).fill(true)])
  assert.equal(declined.improvement, -100)
  assert.equal(model.recentGoalProgress(Array(24).fill(true)).improvement, null)
  assert.equal(model.goalStatus(4, 4).label, 'Chưa đủ dữ liệu')
  assert.equal(model.recentGoalProgress([]).recent.accuracy, null)
})

test('legacy lesson counts and unique completion evidence recover a missing subject summary', async () => {
  const ctx = context({ [goalPath()]: { keys: { 'recognize-number-0': {correct:38,wrong:56,attempts:94} } } })
  const completedAt = ctx.firestore.Timestamp.fromMillis(1700000000000)
  for (const [id, gameId] of [['a','racing'],['b','racing'],['c','bubble-shooter']]) {
    ctx.documents.set(`${sessionsPath('child')}/${id}`, { lessonId:'toan-1-bai-1',gameId,completedAt })
  }
  ctx.documents.set(`${sessionsPath('other')}/d`, {lessonId:'toan-1-bai-1',gameId:'drag-drop',completedAt})
  const progress = await ctx.load('src/lib/game-progress/service.ts').getSubjectProgress('child',1,'toan')
  assert.equal(progress.lessons['toan-1-bai-1'].attempts,94)
  assert.equal(progress.lessons['toan-1-bai-1'].completedGames,2)
  assert.equal(progress.completedLessons,1)
  assert.equal(ctx.writes.length,0)
  assert.ok(ctx.reads.filter(read=>read.filters?.length).every(read=>read.limit===1))
  // A later live save may create a partial subject summary; reconciliation must
  // still retain historical game types, even when attempts are no longer zero.
  ctx.documents.set(subjectPath(),model.buildSubjectProgress('child',1,'toan',{
    'toan-1-bai-1':{...progress.lessons['toan-1-bai-1'],completedGames:1,completed:false},
  }))
  const refreshed = await ctx.load('src/lib/game-progress/service.ts').getSubjectProgress('child',1,'toan')
  assert.equal(refreshed.lessons['toan-1-bai-1'].completedGames,2)
})

test('legacy attempts without completion evidence are unknown rather than zero games', async () => {
  const ctx = context({ [goalPath()]: {keys:{'recognize-number-0':{correct:1,wrong:1,attempts:2}}} })
  const progress = await ctx.load('src/lib/game-progress/service.ts').getSubjectProgress('child',1,'toan')
  assert.equal(progress.lessons['toan-1-bai-1'].completionKnown,false)
  assert.equal(progress.lessons['toan-1-bai-1'].attempts,2)
})

test('recent goals use chronological answers, preserve lifetime counts and isolate owner/lesson', async () => {
  const ctx = context({[goalPath()]:{keys:{'recognize-number-0':{correct:20,wrong:980,attempts:1000}}}})
  const at = n => ctx.firestore.Timestamp.fromMillis(1700000000000+n)
  const results = correct => Array.from({length:20},()=>({learningKey:'recognize-number-0',correct}))
  ctx.documents.set(`${sessionsPath('child')}/old`,{lessonId:'toan-1-bai-1',completedAt:at(0),results:results(false)})
  ctx.documents.set(`${sessionsPath('child')}/new`,{lessonId:'toan-1-bai-1',completedAt:at(1),results:results(true)})
  ctx.documents.set(`${sessionsPath('child')}/unrelated`,{lessonId:'toan-1-bai-2',completedAt:at(2),results:results(false)})
  ctx.documents.set(`${sessionsPath('other')}/other`,{lessonId:'toan-1-bai-1',completedAt:at(3),results:results(false)})
  const report = await ctx.load('src/lib/game-progress/service.ts').getLessonGoalProgress('child','toan-1-bai-1')
  assert.equal(report.goals[0].accuracy,2)
  assert.equal(report.goals[0].recent.accuracy,100)
  assert.equal(report.goals[0].improvement,100)
  assert.equal(report.goals[1].recent.accuracy,null)
  assert.equal(ctx.reads.at(-1).limit,50)
  assert.equal(ctx.writes.length,0)
})

test('overview renders navigation with zero progress reads', () => {
  const React = require('react')
  const {renderToStaticMarkup} = require('react-dom/server')
  const page = createLoader({ 'next/link': ({children, href}) => React.createElement('a',{href},children),
    '@/lib/gameTrackingUser': {getUserGameData: () => {throw new Error('Unexpected progress read')}},
    '@/components/auth/AuthProvider': { useAuth: () => ({ user, loading: false }) },
    '@/components/games/profile/GameProfileProvider': { useGameProfile: () => ({ ...user, isLoading: false }) },
    '@/lib/auth/client-fetch': { fetchWithAuthRetry: () => { throw new Error('Unexpected progress request') } },
  })('src/app/game/me/page.tsx').default
  const client = new QueryClient()
  const html = renderToStaticMarkup(React.createElement(require('@tanstack/react-query').QueryClientProvider, { client }, React.createElement(page)))
  assert.ok(html.includes('/game/me/toan'))
  assert.ok(html.includes('/game/me/session'))
  assert.equal(client.isFetching(), 0)
  assert.equal((html.match(/>Xem thống kê<\/button>/g) ?? []).length, 3)
  client.clear()
})

test('overview uses only selected subject aggregates and keeps completion and weakest goal accurate', async () => {
  const definition = config.getSubjectLessons(1, 'toan')[0]
  const goals = load('src/components/games/general/tracking/lesson-catalog.ts').getLessonDefinition(definition.lessonId).learningGoals
  const ctx = context({
    [goalPath()]: { keys: { [goals[0].key]: { correct: 13, wrong: 7, attempts: 20 }, [goals[1].key]: { correct: 9, wrong: 1, attempts: 10 } },
      games: Object.fromEntries(definition.games.map(id => [id, { completedAt: '2026-09-14' }])) },
  })
  const response = await ctx.load('src/app/api/game/me/route.ts').GET(new Request('http://localhost/api/game/me?resource=overview&grade=1&subject=toan&userId=other'))
  const data = await response.json()
  assert.equal(response.status, 200)
  assert.equal(data.userId, 'child')
  assert.equal(data.completedLessons, 1)
  assert.equal(data.totalLessons, 41)
  assert.equal(data.accuracy, 73)
  assert.equal(data.weakestGoal.title, goals[0].title)
  assert.equal(data.weakestGoal.accuracy, 65)
  assert.deepEqual(ctx.reads.map(read => read.path), [subjectPath(), goalPath(), goalPath('toan-1-bai-2'), sessionsPath('child')])
  assert.equal(data.weakestGoal.source, 'lifetime')
  assert.equal(ctx.writes.length, 0)
})

test('overview empty data is unknown and legacy completion lookups are bounded to selected lessons', async () => {
  const empty = context()
  const data = await empty.load('src/lib/game-progress/service.ts').getSubjectOverview('child', 1, 'toan')
  assert.equal(data.accuracy, null)
  assert.equal(data.weakestGoal, null)
  assert.equal(data.hasGoalData, false)
  const ctx = context({ [goalPath()]: { keys: { 'recognize-number-0': { correct: 1, wrong: 0, attempts: 1 } } } })
  const legacy = await ctx.load('src/lib/game-progress/service.ts').getSubjectOverview('child', 1, 'toan')
  assert.equal(legacy.completedLessons, 0)
  assert.equal(legacy.weakestGoal.accuracy, 100)
  const queries = ctx.reads.filter(read => read.limit === 1)
  assert.equal(queries.length, config.getSubjectLessons(1, 'toan')[0].games.length)
  for (const query of queries) {
    assert.equal(query.path, sessionsPath('child'))
    assert.equal(query.limit, 1)
    assert.ok(query.filters.some(filter => filter.key === 'lessonId' && filter.value === 'toan-1-bai-1'))
    assert.ok(query.filters.some(filter => filter.key === 'gameId'))
  }
})

test('goal percentage switches at five recent answers and never averages percentages', () => {
  const lifetime = { correct: 40, wrong: 60, attempts: 999 }
  for (const count of [0, 1, 4]) {
    assert.deepEqual(model.currentGoalAccuracy(lifetime, model.recentGoalProgress(Array(count).fill(true)).recent), { accuracy: 40, source: 'lifetime' })
  }
  assert.deepEqual(model.currentGoalAccuracy(lifetime, model.recentGoalProgress([true, true, true, false, false]).recent), { accuracy: 60, source: 'recent' })
  assert.equal(model.currentGoalAccuracy({}, model.recentGoalProgress([]).recent).accuracy, null)
  assert.equal(model.currentGoalAccuracy({ correct: 0, wrong: 4 }, model.recentGoalProgress([]).recent).accuracy, 0)
  assert.equal(model.currentGoalAccuracy(lifetime, model.recentGoalProgress([...Array(20).fill(true), ...Array(20).fill(false)]).recent).accuracy, 100)
})

test('overview and detail use the same latest answers, scoped history, and fallback', async () => {
  const ctx = context()
  const definition = config.getSubjectLessons(1, 'toan')[0]
  const goals = load('src/components/games/general/tracking/lesson-catalog.ts').getLessonDefinition(definition.lessonId).learningGoals
  ctx.documents.set(goalPath(), {
    keys: { [goals[0].key]: { correct: 40, wrong: 60, attempts: 100 }, [goals[1].key]: { correct: 3, wrong: 7, attempts: 10 } },
    games: Object.fromEntries(definition.games.map(id => [id, { completedAt: true }])),
  })
  const timestamp = ctx.firestore.Timestamp.fromMillis(1700000000000)
  ctx.documents.set(`${sessionsPath('child')}/old`, { lessonId: definition.lessonId, completedAt: timestamp,
    results: Array(20).fill({ learningKey: goals[0].key, correct: false }) })
  ctx.documents.set(`${sessionsPath('child')}/new`, { lessonId: definition.lessonId, completedAt: ctx.firestore.Timestamp.fromMillis(1700000000001),
    results: [...Array(20).fill({ learningKey: goals[0].key, correct: true }), ...Array(4).fill({ learningKey: goals[1].key, correct: true })] })
  for (let index = 0; index < 60; index++) ctx.documents.set(`${sessionsPath('child')}/other-${index}`, {
    lessonId: 'tieng-viet-1-bai-1', completedAt: ctx.firestore.Timestamp.fromMillis(1700000000010 + index),
    results: [{ learningKey: goals[0].key, correct: false }],
  })
  const service = ctx.load('src/lib/game-progress/service.ts')
  let overview = await service.getSubjectOverview('child', 1, 'toan')
  let detail = await service.getLessonGoalProgress('child', definition.lessonId)
  assert.equal(model.currentGoalAccuracy(detail.goals[0], detail.goals[0].recent).accuracy, 100)
  assert.equal(overview.weakestGoal.title, goals[1].title)
  assert.equal(overview.weakestGoal.accuracy, 30)
  assert.equal(overview.weakestGoal.source, 'lifetime')
  ctx.documents.get(`${sessionsPath('child')}/new`).results.push({ learningKey: goals[1].key, correct: false })
  overview = await service.getSubjectOverview('child', 1, 'toan')
  detail = await service.getLessonGoalProgress('child', definition.lessonId)
  assert.equal(model.currentGoalAccuracy(detail.goals[1], detail.goals[1].recent).accuracy, 80)
  assert.equal(overview.weakestGoal.accuracy, 80)
  assert.deepEqual(overview.weakGoals.map(goal => goal.accuracy), [80, 100])
  for (const read of ctx.reads.filter(read => read.limit === 50)) {
    assert.equal(read.path, sessionsPath('child'))
    assert.deepEqual(read.filters, [{ key: 'lessonId', op: '==', value: definition.lessonId }])
  }
})

test('overview queries stay idle until selected, deduplicate and reuse fresh subject cache', async () => {
  const calls = []
  const options = createLoader({ '@/lib/auth/client-fetch': { fetchWithAuthRetry: async url => {
    calls.push(url)
    return new Response(JSON.stringify({ userId: 'child', lessons: {}, weakestGoal: null }))
  } } })('src/lib/game-progress/queries.ts').subjectOverviewOptions
  const client = new QueryClient()
  const observers = config.SUBJECTS.map(subject => new QueryObserver(client, { ...options('child', 1, subject.id), enabled: false }))
  const unsubscribes = observers.map(observer => observer.subscribe(() => {}))
  assert.equal(calls.length, 0)
  observers[0].setOptions({ ...options('child', 1, 'toan'), enabled: true })
  await client.fetchQuery(options('child', 1, 'toan'))
  await client.fetchQuery(options('child', 1, 'toan'))
  assert.equal(calls.length, 1)
  assert.ok(calls[0].includes('subject=toan'))
  unsubscribes.forEach(unsubscribe => unsubscribe())
  client.clear()
})

test('overview resumes first unfinished started lesson, then uses the existing next lesson', () => {
  const { getOverviewLesson } = load('src/lib/game-progress/overview-presentation.ts')
  const definitions = config.getSubjectLessons(1, 'toan')
  let progress = model.buildSubjectProgress('child', 1, 'toan')
  assert.equal(getOverviewLesson(progress).label, 'Bài bắt đầu')
  assert.equal(getOverviewLesson(progress).lesson.href, definitions[0].href)
  const summary = (index, count) => model.summarizeLesson(definitions[index], { a: { correct: 1, wrong: 1, attempts: 2 } },
    Object.fromEntries(definitions[index].games.slice(0, count).map(id => [id, { completedAt: true }])), null)
  progress = model.buildSubjectProgress('child', 1, 'toan', { [definitions[1].lessonId]: summary(1, 1) })
  assert.equal(progress.currentLessonId, definitions[0].lessonId)
  assert.equal(getOverviewLesson(progress).lesson.lessonId, definitions[1].lessonId)
  assert.equal(getOverviewLesson(progress).summary.completedGames, 1)
  assert.equal(getOverviewLesson(progress).summary.totalGames, 4)
  assert.equal(getOverviewLesson(progress).action, 'Tiếp tục')
  progress = model.buildSubjectProgress('child', 1, 'toan', {
    [definitions[0].lessonId]: summary(0, 1), [definitions[1].lessonId]: summary(1, 1),
  })
  assert.equal(getOverviewLesson(progress).lesson.lessonId, definitions[0].lessonId)
  progress = model.buildSubjectProgress('child', 1, 'toan', {
    [definitions[0].lessonId]: summary(0, 2), [definitions[1].lessonId]: summary(1, 2),
  })
  assert.equal(getOverviewLesson(progress).label, 'Bài tiếp theo')
  assert.equal(getOverviewLesson(progress).lesson.lessonId, definitions[2].lessonId)
  assert.equal(getOverviewLesson(progress).lesson.available, false)
  assert.equal(getOverviewLesson({ ...progress, completedLessons: 41, currentLessonId: null }).allCompleted, true)
  const empty = getOverviewLesson(model.buildSubjectProgress('child', 2, 'toan'))
  assert.equal(empty.lesson, undefined)
  assert.equal(empty.allCompleted, false)
})

test('overview returns at most three weakest played goals with lesson mapping and no extra reads', async () => {
  const definition = config.getSubjectLessons(1, 'toan')[0]
  const goals = load('src/components/games/general/tracking/lesson-catalog.ts').getLessonDefinition(definition.lessonId).learningGoals
  const ctx = context({ [goalPath()]: {
    keys: Object.fromEntries([62, 40, 55, 79, 80].map((correct, index) => [goals[index].key, { correct, wrong: 100 - correct, attempts: 100 }])),
    games: Object.fromEntries(definition.games.map(id => [id, { completedAt: true }])),
  } })
  const data = await ctx.load('src/lib/game-progress/service.ts').getSubjectOverview('child', 1, 'toan')
  assert.deepEqual(data.weakGoals.map(goal => goal.accuracy), [40, 55, 62])
  assert.deepEqual(data.weakGoals.map(goal => goal.id), [goals[1].key, goals[2].key, goals[0].key])
  assert.ok(data.weakGoals.every(goal => goal.lessonId === definition.lessonId))
  assert.equal(ctx.reads.length, 4)
  assert.equal(ctx.writes.length, 0)
})

test('overview keeps the lowest goals even when all scores are at least 80 and excludes unplayed goals', async () => {
  const definition = config.getSubjectLessons(1, 'toan')[0]
  const goals = load('src/components/games/general/tracking/lesson-catalog.ts').getLessonDefinition(definition.lessonId).learningGoals
  const ctx = context({ [goalPath()]: {
    keys: Object.fromEntries([100, 95, 80, 90].map((correct, index) => [goals[index].key, { correct, wrong: 100 - correct, attempts: 100 }])),
    games: Object.fromEntries(definition.games.map(id => [id, { completedAt: true }])),
  } })
  const data = await ctx.load('src/lib/game-progress/service.ts').getSubjectOverview('child', 1, 'toan')
  assert.deepEqual(data.weakGoals.map(goal => goal.accuracy), [80, 90, 95])
  assert.equal(ctx.reads.length, 4)
  const empty = await context().load('src/lib/game-progress/service.ts').getSubjectOverview('child', 1, 'toan')
  assert.deepEqual(empty.weakGoals, [])
})

test('overview renders lesson links and three goal rows without total game count or explanations', () => {
  const React = require('react')
  const { renderToStaticMarkup } = require('react-dom/server')
  const definitions = config.getSubjectLessons(1, 'toan')
  const first = definitions[0]
  const progress = model.buildSubjectProgress('child', 1, 'toan', { [first.lessonId]: model.summarizeLesson(first,
    { a: { correct: 4, wrong: 6, attempts: 10 } }, { [first.games[0]]: { completedAt: true } }, null) })
  const data = { ...progress, hasGoalData: true, weakGoals: [40,55,62].map((accuracy, index) => ({ id: String(index), title: `Mục tiêu ${index}`, accuracy, lessonId: definitions[index % 2].lessonId })) }
  const component = createLoader({
    react: { ...React, useState: () => [true, () => {}] },
    'next/link': ({ children, href, prefetch, ...props }) => React.createElement('a', { ...props, href }, children),
    '@tanstack/react-query': { useQuery: () => ({ data }) },
    '@/lib/game-progress/queries': { subjectOverviewOptions: () => ({}) },
    '@/components/auth/AuthProvider': { useAuth: () => ({ user, loading: false }) },
    '@/components/games/profile/GameProfileProvider': { useGameProfile: () => ({ ...user, isLoading: false }) },
  })('src/components/game/me/SubjectOverviewCard.tsx').default
  const html = renderToStaticMarkup(React.createElement(component, { subject: config.SUBJECTS[0] }))
  assert.ok(html.includes('Tiếp tục bài hiện tại'))
  assert.ok(html.includes('1 / 4 game'))
  assert.ok(html.includes(definitions[1].href))
  assert.equal((html.match(/<li>/g) ?? []).length, 3)
  assert.ok(!html.includes('Game hoàn thành'))
  assert.ok(!html.includes('Dựa trên'))
  assert.ok(!html.includes('dùng kết quả tích lũy'))
  // Cached pre-list responses must not turn a known weak goal into a positive rating.
  data.weakestGoal = data.weakGoals[0]
  delete data.weakGoals
  const legacyHtml = renderToStaticMarkup(React.createElement(component, { subject: config.SUBJECTS[0] }))
  assert.ok(legacyHtml.includes('Cần luyện thêm'))
  assert.ok(legacyHtml.includes('40%'))
  assert.ok(!legacyHtml.includes('Đang học tốt'))
  data.weakestGoal = null
  const missingHtml = renderToStaticMarkup(React.createElement(component, { subject: config.SUBJECTS[0] }))
  assert.ok(!missingHtml.includes('Đang học tốt'))
  data.weakGoals = []
  const emptyHtml = renderToStaticMarkup(React.createElement(component, { subject: config.SUBJECTS[0] }))
  assert.ok(!emptyHtml.includes('Đang học tốt'))
  assert.ok(!emptyHtml.includes('Cần luyện thêm'))
})

test('overview list cache does not reuse a fresh legacy single-goal response', async () => {
  let calls = 0
  const options = createLoader({ '@/lib/auth/client-fetch': { fetchWithAuthRetry: async () => {
    calls++
    return new Response(JSON.stringify({ userId: 'child', weakGoals: [{ id: 'zero', accuracy: 55 }] }))
  } } })('src/lib/game-progress/queries.ts').subjectOverviewOptions
  const client = new QueryClient()
  client.setQueryData(['game', 'me', 'subject-overview', 'child', 1, 'toan'], { userId: 'child', hasGoalData: true, weakestGoal: { accuracy: 55 } })
  client.setQueryData(['game', 'me', 'subject-overview', 'child', 1, 'toan', 'v2'], { userId: 'child', hasGoalData: true, weakGoals: [] })
  const data = await client.fetchQuery(options('child', 1, 'toan'))
  assert.equal(calls, 1)
  assert.equal(data.weakGoals[0].accuracy, 55)
  client.clear()
})

test('subject fills missing summaries from owned lessons; goals use bounded recent history', async () => {
  const ctx = context()
  const {GET} = ctx.load('src/app/api/game/me/route.ts')
  let response = await GET(new Request('http://localhost/api/game/me?resource=subject&grade=1&subject=toan&userId=other'))
  assert.equal(response.status,200)
  assert.equal((await response.json()).accuracy,null)
  const subjectReads = [subjectPath(), goalPath(), goalPath('toan-1-bai-2')]
  assert.deepEqual(ctx.reads.map(read=>read.path),subjectReads)
  response = await GET(new Request('http://localhost/api/game/me?resource=goals&grade=1&subject=toan&lessonId=toan-1-bai-1'))
  const goals = await response.json()
  assert.equal(goals.goals.length,6)
  assert.equal(goals.goals[0].accuracy,null)
  assert.equal(goals.goals[0].recent.accuracy,null)
  assert.deepEqual(ctx.reads.map(read=>read.path),[...subjectReads,goalPath(),sessionsPath('child')])
  assert.equal(ctx.reads.at(-1).limit,50)
})

test('auth, invalid grade/subject/lesson/cursor are rejected without progress reads', async () => {
  for (const status of [401,403]) {
    const ctx = context({}, {ok:false,status})
    const response = await ctx.load('src/app/api/game/me/route.ts').GET(new Request('http://localhost/api/game/me?resource=subject&grade=1&subject=toan'))
    assert.equal(response.status,status)
    assert.equal(ctx.reads.length,0)
  }
  const ctx = context()
  for (const params of ['resource=subject&grade=6&subject=toan','resource=subject&grade=1&subject=bad','resource=goals&grade=2&subject=toan&lessonId=toan-1-bai-1','resource=sessions&cursor=invalid','resource=session&sessionId=../other']) {
    const response = await ctx.load('src/app/api/game/me/route.ts').GET(new Request('http://localhost/api/game/me?'+params))
    assert.equal(response.status,400)
  }
  assert.equal(ctx.reads.length,0)
})

test('session transaction updates both aggregates once; replay adds attempts but not completed games', async () => {
  const ctx = context()
  const {POST} = ctx.load('src/app/api/game-tracking/sessions/route.ts')
  const first = session()
  assert.equal((await POST(request(first))).status,200)
  assert.equal(ctx.documents.get(subjectPath()).attempts,2)
  assert.equal(ctx.documents.get(goalPath()).keys['recognize-number-0'].attempts,2)
  const written = ctx.writes.length
  assert.equal((await POST(request(first))).status,200)
  assert.equal(ctx.writes.length,written)
  assert.equal((await POST(request(session()))).status,200)
  let summary = ctx.documents.get(subjectPath())
  assert.equal(summary.attempts,4)
  assert.equal(summary.lessons['toan-1-bai-1'].completedGames,1)
  assert.equal(summary.completedLessons,0)
  await POST(request(session({gameId:'racing'})))
  summary = ctx.documents.get(subjectPath())
  assert.equal(summary.completedLessons,1)
  assert.equal(summary.currentLessonId,'toan-1-bai-2')
  assert.equal(summary.accuracy,50)
  assert.equal(ctx.reads.filter(read=>read.orders).length,0)
})

test('failed commit writes nothing and guest/disabled saves do not create user progress', async () => {
  const ctx = context()
  ctx.setFailWrites(true)
  const quiet = console.error; console.error = () => {}
  try { assert.equal((await ctx.load('src/app/api/game-tracking/sessions/route.ts').POST(request(session()))).status,500) }
  finally { console.error=quiet }
  assert.equal(ctx.documents.size,0)
  for (const auth of [{ok:false,status:401}, {ok:true,user:{...user,activeGame:false}}]) {
    const other = context({},auth)
    assert.equal((await other.load('src/app/api/game-tracking/sessions/route.ts').POST(request(session()))).status,200)
    assert.equal(other.writes.length,1)
    assert.ok(other.writes[0].includes('/sessions/'))
  }
})

test('session pages use stable timestamp+id cursors, project out attempts and isolate details', async () => {
  const ctx = context()
  for (let i=0;i<45;i++) ctx.documents.set(`${sessionsPath('child')}/s${String(i).padStart(2,'0')}`, {...session(),completedAt:ctx.firestore.Timestamp.fromMillis(1000)})
  ctx.documents.set(`${sessionsPath('other')}/private`,session())
  const service = ctx.load('src/lib/game-progress/service.ts')
  const first=await service.getSessionPage('child')
  const second=await service.getSessionPage('child',first.nextCursor)
  const third=await service.getSessionPage('child',second.nextCursor)
  assert.equal(first.items.length,20)
  assert.equal(second.items.length,20)
  assert.equal(third.items.length,5)
  assert.equal(third.nextCursor,null)
  assert.equal(new Set([...first.items,...second.items,...third.items].map(item=>item.id)).size,45)
  assert.ok(first.items.every(item=>!('results' in item)))
  assert.equal(ctx.reads.length,3)
  assert.ok(ctx.reads.every(read=>read.limit===20 && !read.fields.includes('results')))
  assert.equal((await service.getSessionDetail('child','s00')).results.length,2)
  assert.equal(await service.getSessionDetail('child','private'),null)
})

test('TanStack only requests expanded lessons, reuses cached goals and isolates user/subject keys', async () => {
  const calls=[]
  const queries = createLoader({ '@/lib/auth/client-fetch': {fetchWithAuthRetry: async url => {
    const params=new URL('http://localhost'+url).searchParams
    calls.push(Object.fromEntries(params))
    return {ok:true,json:async()=>({userId:'child',goals:[]})}
  }} })('src/lib/game-progress/queries.ts')
  const client=new QueryClient()
  const options=queries.lessonGoalOptions('child',1,'toan','toan-1-bai-1')
  const observer=new QueryObserver(client,{...options,enabled:false})
  const unsubscribe=observer.subscribe(()=>{})
  const settle=()=>new Promise(resolve=>setTimeout(resolve,0))
  await settle(); assert.equal(calls.length,0)
  observer.setOptions({...options,enabled:true}); await settle(); assert.equal(calls.length,1)
  observer.setOptions({...options,enabled:false}); observer.setOptions({...options,enabled:true}); await settle(); assert.equal(calls.length,1)
  await client.fetchQuery(queries.lessonGoalOptions('child',1,'toan','toan-1-bai-2')); assert.equal(calls.length,2)
  await client.fetchQuery(queries.subjectProgressOptions('child',1,'toan'))
  await client.fetchQuery(queries.subjectProgressOptions('child',1,'tieng-anh'))
  await client.invalidateQueries({queryKey:queries.progressKeys.subject('child',1,'toan'),exact:true})
  assert.equal(client.getQueryState(queries.progressKeys.subject('child',1,'tieng-anh')).isInvalidated,false)
  assert.equal(client.getQueryData(queries.progressKeys.goals('other','toan-1-bai-1')),undefined)
  unsubscribe(); client.clear()
})

test('backfill dry-run is read-only, preserves legacy totals, restores missing games and is repeatable', async () => {
  const ctx=context({'shopbebangcom/users/users/child':user})
  const timestamp=ctx.firestore.Timestamp.fromMillis(1000)
  ctx.documents.set(goalPath(),{userId:'child',lessonId:'toan-1-bai-1',keys:{'recognize-number-0':{correct:30,wrong:10,attempts:40,responseTime:100,sessions:20}},totalSessions:20,updatedAt:timestamp})
  ctx.documents.set(`${sessionsPath('child')}/a`,{...session(),completedAt:timestamp})
  ctx.documents.set(`${sessionsPath('child')}/b`,{...session({gameId:'racing'}),completedAt:timestamp})
  const {rebuildUserProgress}=ctx.load('src/lib/game-progress/backfill.ts')
  const dry=await rebuildUserProgress('child')
  assert.equal(dry.subjects.find(item=>item.documentId==='toan-1').attempts,40)
  assert.equal(ctx.writes.length,0)
  await rebuildUserProgress('child',true)
  assert.equal(ctx.documents.get(subjectPath()).completedLessons,1)
  assert.equal(ctx.documents.get(subjectPath()).attempts,40)
  await rebuildUserProgress('child',true)
  assert.equal(ctx.documents.get(subjectPath()).attempts,40)
  assert.equal(ctx.documents.get(goalPath()).totalSessions,20)
  assert.equal(ctx.documents.get(`${sessionsPath('child')}/a`).totalQuestions,2)
})

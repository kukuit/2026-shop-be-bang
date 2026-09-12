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

test('overview renders navigation with zero progress reads', () => {
  const React = require('react')
  const {renderToStaticMarkup} = require('react-dom/server')
  const page = createLoader({ 'next/link': ({children, href}) => React.createElement('a',{href},children),
    '@/lib/gameTrackingUser': {getUserGameData: () => {throw new Error('Unexpected progress read')}},
  })('src/app/game/me/page.tsx').default
  const html = renderToStaticMarkup(React.createElement(page))
  assert.ok(html.includes('/game/me/toan'))
  assert.ok(html.includes('/game/me/session'))
})

test('subject GET reads exactly one owned doc, goal GET exactly one lesson doc, no session scans', async () => {
  const ctx = context()
  const {GET} = ctx.load('src/app/api/game/me/route.ts')
  let response = await GET(new Request('http://localhost/api/game/me?resource=subject&grade=1&subject=toan&userId=other'))
  assert.equal(response.status,200)
  assert.equal((await response.json()).accuracy,null)
  assert.deepEqual(ctx.reads.map(read=>read.path),[subjectPath()])
  response = await GET(new Request('http://localhost/api/game/me?resource=goals&grade=1&subject=toan&lessonId=toan-1-bai-1'))
  const goals = await response.json()
  assert.equal(goals.goals.length,6)
  assert.equal(goals.goals[0].accuracy,null)
  assert.deepEqual(ctx.reads.map(read=>read.path),[subjectPath(),goalPath()])
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

// Real Next UI/API/services with isolated Firestore and authentication fixtures.
// Requires Next :3252 and headless Chrome :9352. Never writes production data.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const harness = require('./lib/ai-task-test-harness.cjs')
const { NextRequest } = require('next/server')
const routes = harness.load('api/route.ts'), repo = harness.load('_services/repository.ts'), service = harness.load('_services/task.service.ts')
const output = path.resolve('node_modules/.cache/ai-task-workflow')
fs.mkdirSync(output, { recursive: true })
;(async () => {
  harness.reset(); harness.identity('alice'); await repo.initialize('alice')
  let seq = 0
  const create = async (title, patch = {}) => (await service.saveManualTask('alice', `seed_${++seq}`, 'CREATE_TASK', { title, groupId: 'inbox', ...patch })).id
  const past = new Date(Date.now() - 7200000).toISOString()
  const parent = await create('Nhật Anh'), subject = await create('Toán lớp 2', { parentId: parent })
  const first = await create('bài 7 nhân phân số', { parentId: subject, deadline: past })
  const second = await create('Việc đánh giá', { deadline: past })
  const third = await create('Việc sửa trạng thái')
  const chatTask = await create('Việc chat hoàn thành')
  const due = await create('Việc vừa đến hạn', { startTime: new Date().toISOString(), duration: 2, scheduleMode: 'duration' })
  const get = async id => (await repo.scanTasks('alice')).find(t => t.id === id)
  const targets = await (await fetch('http://localhost:9352/json')).json()
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl)
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
  const pending = new Map(), errors = []
  let sequence = 0, rejectNextSave = false
  const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
  ws.addEventListener('message', async e => {
    const message = JSON.parse(e.data)
    if (message.id) { const p = pending.get(message.id); pending.delete(message.id); message.error ? p.reject(new Error(JSON.stringify(message.error))) : p.resolve(message.result); return }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text)
    if (message.method !== 'Fetch.requestPaused') return
    const { requestId, request } = message.params
    try {
      let body, status = 200
      if (request.url.includes('/api/auth/')) body = { authenticated: true, user: { id: 'alice', username: 'fixture', displayName: 'Kiểm thử', role: 'user', status: 'active' }, accessTokenExpiresAt: Date.now() + 900000 }
      else if (rejectNextSave && request.postData && JSON.parse(request.postData).operation === 'saveTask') { rejectNextSave = false; status = 500; body = { error: 'Chưa lưu được, hãy thử lại.' } }
      else {
        const response = await routes[request.method](new NextRequest(request.url, { method: request.method, headers: { 'Content-Type': 'application/json', origin: new URL(request.url).origin }, ...(request.method === 'POST' ? { body: request.postData } : {}) }))
        body = await response.json(); status = response.status
      }
      await cdp('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') })
    } catch (error) { if (!/Invalid InterceptionId/.test(error.message)) errors.push(error.stack) }
  })
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
  const evaluate = async expression => { const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value }
  const wait = async expression => { const end = Date.now() + 45000; while (Date.now() < end) { if (await evaluate(`Boolean(${expression})`)) return; await delay(100) } throw new Error(`Timed out: ${expression}; ${errors.join('; ')}`) }
  const click = async selector => { await wait(`document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).disabled`); await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`) }
  const textClick = async (text, root = 'document') => { const expr = `Array.from(${root}.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled)`; await wait(expr); await evaluate(expr + '.click()') }
  const setValue = async (selector, value, kind = 'input') => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(${kind === 'select' ? 'HTMLSelectElement' : kind === 'textarea' ? 'HTMLTextAreaElement' : 'HTMLInputElement'}.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('${kind === 'select' ? 'change' : 'input'}',{bubbles:true}));})()`)
  const screenshot = async name => { await delay(250); fs.writeFileSync(path.join(output, name + '.png'), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64')) }
  const complete = () => click('[data-completion-dialog] .demo-primary')
  try {
    await cdp('Page.enable'); await cdp('Runtime.enable')
    await cdp('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/auth/*' }, { urlPattern: '*://*/demo/ai-task/api*' }] })
    await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `window.testClockOffset=0;const realNow=Date.now;Date.now=()=>realNow()+window.testClockOffset` })
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 960, deviceScaleFactor: 1, mobile: false })
    await cdp('Page.navigate', { url: 'http://localhost:3252/demo/ai-task/calendar' })
    await wait(`document.querySelector('.ai-task-nav')`)
    await evaluate(`localStorage.removeItem('ai-task-review:alice:day');localStorage.removeItem('ai-task-review:alice:dismissedUntil');sessionStorage.removeItem('ai-task-review:alice:shown')`)
    await cdp('Page.reload')
    await wait(`document.querySelector('[data-review-dialog][open]')`)
    assert.equal(await evaluate(`document.querySelector('[data-review-dialog]').textContent.includes('2 công việc')`), true)
    await screenshot('review-desktop')
    await click('[data-review-dialog] button[aria-label="Hoàn thành bài 7 nhân phân số"]')
    await wait(`document.querySelector('[data-completion-dialog][open]')`)
    assert.equal(await evaluate(`document.querySelector('[data-completion-dialog] output').textContent`), '—%')
    assert.equal(await evaluate(`document.querySelector('#completion-slider').value`), '50')
    assert.equal(await evaluate(`document.querySelector('[data-completion-dialog]').textContent.includes('Inbox › Nhật Anh › Toán lớp 2')`), true)
    await screenshot('completion-ghost-desktop')
    await setValue('[data-completion-dialog] textarea', 'Đã dạy xong, còn bài tập cuối.', 'textarea')
    rejectNextSave = true; await complete(); await wait(`document.querySelector('[data-completion-dialog] [role=alert]')`)
    assert.equal((await get(first)).status, 'todo')
    await complete(); await wait(`!document.querySelector('[data-completion-dialog]')`)
    await wait(`!document.querySelector('[data-review-dialog] button[aria-label="Hoàn thành bài 7 nhân phân số"]')`)
    assert.equal((await get(first)).completionPercent, null)
    assert.equal((await get(first)).completionNote, 'Đã dạy xong, còn bài tập cuối.')
    assert.equal(await evaluate(`document.querySelector('[data-review-dialog]').open`), true)
    await click('[data-review-dialog] button[aria-label="Hoàn thành Việc đánh giá"]')
    const rect = await evaluate(`(()=>{const r=document.querySelector('#completion-slider').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...rect }); await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...rect })
    assert.equal(await evaluate(`document.querySelector('[data-completion-dialog] output').textContent`), '50%')
    await click('[aria-label="Đánh giá 75%"]')
    assert.equal(await evaluate(`document.querySelector('#completion-slider').value`), '75')
    await setValue('#completion-slider', '68')
    assert.equal(await evaluate(`document.querySelector('[data-completion-dialog] output').textContent`), '68%')
    await click('[aria-label="Đóng đánh giá hoàn thành"]')
    assert.equal((await get(second)).status, 'todo')
    await click('[data-review-dialog] button[aria-label="Hoàn thành Việc đánh giá"]')
    assert.equal(await evaluate(`document.querySelector('[data-completion-dialog] output').textContent`), '—%')
    await click('[aria-label="Đánh giá 0%"]'); await complete(); await wait(`!document.querySelector('[data-completion-dialog]')`)
    assert.equal((await get(second)).completionPercent, 0)
    await textClick('Để sau', `document.querySelector('[data-review-dialog]')`)
    assert.ok(await evaluate(`Number(localStorage.getItem('ai-task-review:alice:dismissedUntil')) > Date.now()+2*3600000`))
    await cdp('Page.reload'); await wait(`document.querySelector('h1')?.textContent==='Lịch'`); await delay(1700)
    assert.equal(await evaluate(`Boolean(document.querySelector('[data-review-dialog]'))`), false)
    await click('.ai-task-nav a[href="/demo/ai-task/tasks"]')
    await click(`tr[data-task-id="${third}"] .demo-row-actions button`)
    await wait(`document.querySelector('.ai-task-form select[aria-label="Trạng thái"]')`)
    await setValue('.ai-task-form select[aria-label="Trạng thái"]', 'done', 'select')
    await click('.ai-task-form .demo-primary'); await wait(`document.querySelector('[data-completion-dialog]')`)
    assert.equal((await get(third)).status, 'todo')
    await setValue('#completion-slider', '68'); await complete(); await wait(`!document.querySelector('[data-completion-dialog]')`)
    assert.equal((await get(third)).completionPercent, 68)
    // Actual chatbot proposal/confirmation API, with task resolution performed by the service.
    const reply = await service.prepareIntent('alice', { action: 'COMPLETE_TASK', target: { query: 'Việc chat hoàn thành' } })
    await service.appendTurn('alice', 'chat_completion_browser', 'Việc chat hoàn thành xong rồi', reply)
    await wait(`!document.querySelector('dialog[open]')`)
    await cdp('Page.navigate', { url: 'http://localhost:3252/demo/ai-task' })
    await wait(`document.querySelector('[data-completion-dialog][open]')`)
    assert.equal((await get(chatTask)).status, 'todo')
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    await screenshot('completion-mobile')
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), true)
    await click('[aria-label="Đánh giá 100%"]'); await complete(); await wait(`!document.querySelector('[data-completion-dialog]')`)
    assert.equal((await get(chatTask)).completionPercent, 100)
    assert.equal((await repo.sessionRef('alice').get()).get('pendingId'), null)
    // Remove the snooze for this fixture, then cross a due boundary without waiting minutes.
    await evaluate(`localStorage.removeItem('ai-task-review:alice:dismissedUntil')`)
    await cdp('Page.reload'); await wait(`document.querySelector('textarea[aria-label="Tin nhắn"]')`)
    await delay(500)
    await evaluate(`window.testClockOffset=180000;document.dispatchEvent(new Event('visibilitychange'))`)
    await wait(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Đã xong')`)
    assert.equal(await evaluate(`Boolean(document.querySelector('dialog[open]'))`), false)
    await screenshot('due-toast-mobile')
    await textClick('Đã xong'); await wait(`document.querySelector('[data-completion-dialog]')`)
    await complete(); await wait(`!document.querySelector('[data-completion-dialog]')`)
    assert.equal((await get(due)).status, 'done')
    // A fresh reminder must not interrupt a draft being typed into Chat.
    await create('Việc cần rà soát tiếp', { deadline: past })
    await evaluate(`localStorage.removeItem('ai-task-review:alice:day');sessionStorage.removeItem('ai-task-review:alice:shown')`)
    await cdp('Page.reload'); await wait(`document.querySelector('textarea[aria-label="Tin nhắn"]') && !document.querySelector('textarea[aria-label="Tin nhắn"]').disabled`)
    await setValue('textarea[aria-label="Tin nhắn"]', 'Đang soạn nội dung công việc', 'textarea')
    await delay(1800)
    assert.equal(await evaluate(`Boolean(document.querySelector('[data-review-dialog][open]'))`), false)
    assert.equal(await evaluate(`document.querySelector('textarea[aria-label="Tin nhắn"]').value`), 'Đang soạn nội dung công việc')
    await click('[aria-label="Rà soát công việc"]'); await wait(`document.querySelector('[data-review-dialog][open]')`)
    await click('[aria-label="Đóng rà soát"]')
    await cdp('Page.reload'); await wait(`document.querySelector('textarea[aria-label="Tin nhắn"]')`); await delay(1800)
    assert.equal(await evaluate(`Boolean(document.querySelector('[data-review-dialog][open]'))`), false)
    assert.deepEqual(errors, [])
    console.log('PASS: actual completion persistence via review/form/chat/toast; ghost, thumb, markers, 0/68/100, note-only null, retry, cancel, snooze, desktop/mobile. Screenshots:', output)
  } finally { ws.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })

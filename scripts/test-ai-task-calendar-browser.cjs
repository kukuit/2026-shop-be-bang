// Run Next on :3252 and isolated headless Chrome on :9352. All account/task
// requests are intercepted; this test never writes to a real account/database.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const output = path.resolve('node_modules/.cache/ai-task-calendar')
fs.mkdirSync(output, { recursive: true })
const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10)
const add = n => new Date(Date.parse(today) + n * 86400000).toISOString().slice(0, 10)
const at = (clock, offset = 0) => `${add(offset)}T${clock}:00+07:00`
const groups = [{ id: 'g', name: 'AI Task', color: '#17705d', isDefault: true, isActive: true }]
const task = (id, title, fields = {}) => ({ id, title, groupId: 'g', parentId: null, rootTaskId: id, depth: 0, description: 'Ghi chú kiểm thử lịch.', status: 'todo', priority: 'normal', startTime: null, deadline: null, duration: null, withinDay: false, scheduleMode: 'deadline', version: 1, deletedAt: null, ...fields })
let tasks = [task('parent', 'Dự án giao diện'), task('timed', 'Làm UI lịch', { parentId: 'parent', startTime: at('09:00'), deadline: at('11:00'), priority: 'urgent' }), task('overlap', 'Họp thiết kế', { startTime: at('09:30'), deadline: at('10:30') }), task('long', 'Landing page nhiều ngày', { startTime: at('09:00', -3), deadline: at('17:00', 9) }), task('deadline', 'Gửi bản thiết kế', { deadline: at('17:00') }), task('unscheduled', 'Viết nội dung mới'), task('all', 'Chuẩn bị bài Toán', { startTime: at('00:00'), withinDay: true }), task('done', 'Đã duyệt bố cục', { status: 'done', startTime: at('13:00') }), task('cancelled', 'Cuộc họp đã hủy', { status: 'cancelled', startTime: at('14:00') })]
tasks.find(t => t.id === 'unscheduled').status = 'blocked'
;(async () => {
  const targets = await (await fetch('http://localhost:9352/json')).json()
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl)
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
  let sequence = 0, writes = 0
  const pending = new Map(), errors = []
  const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
  ws.addEventListener('message', async event => {
    const message = JSON.parse(event.data)
    if (message.id) { const p = pending.get(message.id); pending.delete(message.id); message.error ? p.reject(new Error(JSON.stringify(message.error))) : p.resolve(message.result); return }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text)
    if (message.method !== 'Fetch.requestPaused') return
    const { requestId, request } = message.params
    try {
      let body = {}
      const url = new URL(request.url)
      if (url.pathname.startsWith('/api/auth/')) body = { authenticated: true, user: { id: 'calendar-fixture', username: 'fixture', displayName: 'Kiểm thử', role: 'user', status: 'active' }, accessTokenExpiresAt: Date.now() + 900000 }
      else if (request.method === 'POST') {
        const input = JSON.parse(request.postData)
        if (input.operation === 'initialize') body = { result: { groups } }
        else if (input.operation === 'saveTask') { writes++; tasks = tasks.map(t => t.id === input.taskId ? { ...t, ...input.data, version: t.version + 1 } : t); body = { result: { id: input.taskId } } }
        else throw new Error(`Unexpected mutation ${input.operation}`)
      } else if (url.searchParams.get('resource') === 'tree') body = { tasks, total: tasks.length, matchingIds: tasks.map(t => t.id) }
      else if (url.searchParams.get('resource') === 'groups') body = { groups }
      else if (url.searchParams.get('resource') === 'parents') body = { nodes: tasks, candidates: tasks.filter(t => t.id !== url.searchParams.get('taskId')) }
      await cdp('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') })
    } catch (error) { if (!/Invalid InterceptionId/.test(error.message)) errors.push(error.message) }
  })
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
  const evaluate = async expression => { const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value }
  const wait = async expression => { const end = Date.now() + 60000; while (Date.now() < end) { if (await evaluate(`Boolean(${expression})`)) return; await delay(150) } throw new Error('Timed out: ' + expression) }
  const clickText = async text => { const selector = `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled)`; await wait(selector); await evaluate(`${selector}.click()`) }
  const clickTask = async title => { const selector = `document.querySelector('button[aria-label^="${title},"]')`; await wait(selector); await evaluate(`${selector}.click()`); await wait(`document.querySelector('dialog[open]')`) }
  const close = () => evaluate(`document.querySelector('button[aria-label="Đóng chi tiết"]').click()`)
  const screenshot = async name => fs.writeFileSync(path.join(output, name + '.png'), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  try {
    await cdp('Page.enable'); await cdp('Runtime.enable')
    await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `sessionStorage.setItem('ai-task-review:calendar-fixture:shown','1')` })
    await cdp('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/auth/*' }, { urlPattern: '*://*/demo/ai-task/api*' }] })
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
    await cdp('Page.navigate', { url: 'http://localhost:3252/demo/ai-task/calendar' })
    await wait(`document.querySelector('button[aria-label^="Làm UI lịch,"]')`)
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('.ai-task-nav a')).map(a=>a.textContent)`), ['Chat', 'Công việc', 'Tổng quan', 'Lịch'])
    assert.equal(await evaluate(`document.querySelector('button[aria-pressed=true]').textContent`), 'Tuần')
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true)
    assert.equal(writes, 0)
    await screenshot('week-desktop')
    await clickTask('Làm UI lịch'); await wait(`document.querySelector('dialog').textContent.includes('Dự án giao diện')`)
    assert.equal(await evaluate(`document.querySelector('dialog').textContent.includes('Mới tạo')`), true)
    await screenshot('task-detail'); await close()
    await clickText('Tháng'); await screenshot('month-desktop')
    await wait(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.startsWith('+') && b.textContent.endsWith(' việc'))`)
    await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.startsWith('+') && b.textContent.endsWith(' việc')).click()`)
    assert.equal(await evaluate(`document.querySelector('button[aria-pressed=true]').textContent`), 'Ngày')
    await clickText('Hôm nay'); await clickTask('Viết nội dung mới')
    assert.equal(await evaluate(`document.querySelector('dialog').textContent.includes('Chưa xếp lịch')`), true)
    assert.equal(await evaluate(`document.querySelector('dialog').textContent.includes('Đang chờ')`), true)
    await clickText('Chỉnh sửa'); await wait(`document.querySelector('.ai-task-form input[maxlength="250"]')`)
    assert.deepEqual(await evaluate(`Array.from(document.querySelector('select[aria-label="Trạng thái"]').options).map(o=>o.textContent)`), ['Mới tạo', 'Đang làm', 'Đang chờ', 'Hoàn thành', 'Đã hủy'])
    await evaluate(`(()=>{const e=document.querySelector('.ai-task-form input[maxlength="250"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'Nội dung đã sửa');e.dispatchEvent(new Event('input',{bubbles:true}));})()`)
    await clickText('Cập nhật'); await wait(`!document.querySelector('dialog[open]')`)
    assert.equal(tasks.find(t => t.id === 'unscheduled').status, 'blocked', 'Editing content preserves the legacy stored status')
    await clickTask('Nội dung đã sửa'); await clickText('Hoàn thành'); await wait(`document.querySelector('[data-completion-dialog][open]')`)
    await evaluate(`document.querySelector('[data-completion-dialog] .demo-primary').click()`); await wait(`!document.querySelector('dialog[open]')`)
    assert.equal(tasks.find(t => t.id === 'unscheduled').status, 'done'); assert.equal(writes, 2)
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    await cdp('Page.reload'); await wait(`document.querySelector('button[aria-label^="Làm UI lịch,"]')`)
    assert.equal(await evaluate(`document.querySelector('button[aria-pressed=true]').textContent`), 'Ngày')
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true)
    await screenshot('day-mobile'); await clickTask('Làm UI lịch'); await screenshot('detail-mobile')
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await wait(`!document.querySelector('dialog[open]')`)
    await clickText('Tháng'); assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true)
    await clickText('Ngày')
    await evaluate(`document.querySelector('button[aria-label="Kỳ sau"]').click()`)
    await screenshot('next-day-mobile')
    await evaluate(`document.querySelector('.ai-task-nav a[href="/demo/ai-task/tasks"]').click()`)
    await clickText('Thêm công việc')
    await wait(`document.querySelector('dialog[open] select[aria-label="Trạng thái"]')`)
    assert.deepEqual(await evaluate(`Array.from(document.querySelector('dialog select[aria-label="Trạng thái"]').options).map(o=>o.textContent)`), ['Mới tạo', 'Đang làm', 'Đang chờ', 'Hoàn thành', 'Đã hủy'])
    assert.equal(await evaluate(`document.querySelector('dialog select[aria-label="Trạng thái"]').selectedOptions[0].textContent`), 'Mới tạo')
    assert.deepEqual(errors, [])
    console.log('PASS: real calendar pages with intercepted fixtures; desktop/mobile, navigation, overflow, detail, Escape, editing, completion, month overflow; screenshots:', output)
  } finally { ws.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })

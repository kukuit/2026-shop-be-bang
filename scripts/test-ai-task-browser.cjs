// Actual Next pages + actual API/services, with intercepted authentication/LLM and
// transactional in-memory Firestore. No real account, AI request or database writes.
// Start Next on :3252 and a dedicated headless Chrome debugging on :9352 first.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const harness = require('./lib/ai-task-test-harness.cjs')
const { NextRequest } = require('next/server')
const routes = harness.load('api/route.ts')
const repo = harness.load('_services/repository.ts')
const service = harness.load('_services/task.service.ts')
const output = path.resolve(__dirname, '../node_modules/.cache/ai-task-browser')
fs.mkdirSync(output, { recursive: true })
const nativeFetch = global.fetch
const fixtureDeadline = new Date(Date.now() + 7 * 86400000).toISOString()
process.env.CHAT_PROVIDER = 'groq'; process.env.GROQ_API_KEY = 'offline-browser-test'
global.fetch = async (url, options) => {
  if (String(url).startsWith('https://api.groq.com/')) {
    const text = JSON.parse(options.body).messages.at(-1).content
    const treeExamples = {
      'Thêm môn Toán cho Bạn A': { action: 'CREATE_SUBTASK', target: { query: 'Bạn A' }, data: { title: 'Toán' } },
      'Thêm Bạn C vào Dạy thêm': { action: 'CREATE_SUBTASK', target: { query: 'Dạy thêm' }, data: { title: 'Bạn C' } },
      'Thêm việc đo áo dưới Út Nhung': { action: 'CREATE_SUBTASK', target: { query: 'Út Nhung' }, data: { title: 'Đo áo' } },
    }
    const memoryExamples = {
      'Thêm task kiểm tra bộ nhớ': { action: 'CREATE_TASK', data: { title: 'Kiểm tra bộ nhớ' } },
      'nhóm Shop Bé Băng': { action: 'CHAT', reply: 'Nhóm', memory: { scope: 'context', groupName: 'Shop Bé Băng' } },
      'ưu tiên thấp': { action: 'CHAT', reply: 'Ưu tiên', memory: { scope: 'context', priority: 'low' } },
      '2 ngày': { action: 'CHAT', reply: 'Thời lượng', memory: { scope: 'context', duration: 2880 } },
      'bắt đầu ngay': { action: 'CHAT', reply: 'Bắt đầu', memory: { scope: 'context', startNow: true } },
      'Thêm task tiếp theo': { action: 'CREATE_TASK', data: { title: 'Task tiếp theo' } },
    }
    const recognitionExamples = process.argv.includes('--recognition-only') ? {
      'Rà soát hợp đồng 5': { action: 'GET_TASKS', filters: { query: 'hợp đồng 5' } },
      'Rà soát hợp đồng 8': { action: 'GET_TASKS', filters: { query: 'hợp đồng 8' } },
      'Dời nó sang mai': { action: 'UPDATE_TASK', target: { query: 'nó' }, changes: { deadline: fixtureDeadline } },
      'Việc này được 50% rồi': { action: 'UPDATE_TASK', target: { query: 'việc này' }, changes: { completionPercent: 50 } },
      'Ghi chú cần gọi trước': { action: 'UPDATE_TASK', target: { query: 'việc đó' }, changes: { description: 'Cần gọi trước' } },
      'Xong rồi': { action: 'COMPLETE_TASK', target: { query: 'việc đó' } },
    } : {}
    const intent = recognitionExamples[text] || memoryExamples[text] || treeExamples[text] || (text.includes('xong rồi') ? { action: 'COMPLETE_TASK', target: { query: 'EDA' } }
      : text.includes('còn việc') ? { action: 'GET_TASKS', filters: { view: 'active' } }
      : { action: 'CREATE_TASK', data: { title: text.includes('ABC') ? 'Code EDA cho ABC' : 'Code EDA cho MSD', groupName: 'Ainka', priority: 'urgent', deadline: fixtureDeadline } })
    return Response.json({ choices: [{ message: { content: JSON.stringify(intent) } }] })
  }
  return nativeFetch(url, options)
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
;(async () => {
  const targets = await (await nativeFetch('http://localhost:9352/json')).json()
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl)
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
  let sequence = 0, signedIn = false
  const pending = new Map(), errors = [], requests = []
  const user = { id: 'alice', username: 'fixture', displayName: 'Người kiểm thử', role: 'user', status: 'active', activeGame: true }
  const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
  ws.addEventListener('message', async event => {
    const message = JSON.parse(event.data)
    if (message.id) { const p = pending.get(message.id); pending.delete(message.id); message.error ? p.reject(new Error(JSON.stringify(message.error))) : p.resolve(message.result); return }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text)
    if (message.method !== 'Fetch.requestPaused') return
    const { requestId, request } = message.params
    try {
      let body, status = 200
      if (request.url.includes('/api/auth/')) {
        if (request.url.includes('/login')) signedIn = true
        if (request.url.includes('/logout')) signedIn = false
        body = { authenticated: signedIn, user: signedIn ? user : null, accessTokenExpiresAt: Date.now() + 900000 }
      } else {
        requests.push({ url: request.url, method: request.method, body: request.postData ? JSON.parse(request.postData) : null })
        harness.identity(signedIn ? 'alice' : null)
        const response = await routes[request.method](new NextRequest(request.url, { method: request.method, headers: { 'Content-Type': 'application/json', origin: new URL(request.url).origin }, ...(request.method === 'POST' ? { body: request.postData } : {}) }))
        status = response.status; body = await response.json()
      }
      await cdp('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') })
    } catch (error) {
      // React StrictMode/AbortController can cancel an intercepted GET before reply.
      if (!/Invalid InterceptionId/.test(error.message)) {
        errors.push(error.stack)
        await cdp('Fetch.fulfillRequest', { requestId, responseCode: 500, body: Buffer.from('{"error":"Fixture failure"}').toString('base64') }).catch(() => {})
      }
    }
  })
  const evaluate = async expression => { const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value }
  const wait = async expression => { const deadline = Date.now() + 60000; while (Date.now() < deadline) { if (await evaluate(`Boolean(${expression})`)) return; await delay(150) } throw new Error(`Timed out: ${expression}; errors: ${errors.join('\n')}`) }
  const clickText = async text => {
    await wait(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()===${JSON.stringify(text)} && !b.disabled)`)
    return evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)} && !b.disabled).click()`)
  }
  const setInput = (selector, value) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`)
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const navigate = async route => { await click(`nav a[href="${route}"]`); await delay(150) }
  const screenshot = async name => fs.writeFileSync(path.join(output, name + '.png'), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64'))
  const send = async text => { await setInput('textarea[aria-label="Tin nhắn"]', text); await click('[aria-label="Gửi tin nhắn"]'); await wait(`!document.querySelector('[aria-label="Gửi tin nhắn"]') || !document.body.textContent.includes('Đang phân tích…')`) }
  try {
    await cdp('Page.enable'); await cdp('Runtime.enable')
    await evaluate('try { localStorage.clear(); sessionStorage.clear() } catch {}')
    await cdp('Network.clearBrowserCookies')
    await cdp('Page.navigate', { url: 'about:blank' }); await delay(200)
    await cdp('Fetch.enable', { patterns: [{ urlPattern: '*/api/auth/*' }, { urlPattern: '*/demo/ai-task/api*' }] })
    await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `window.SpeechRecognition=class{start(){window.fixtureRecognition=this}stop(){this.onend?.()}abort(){} };window.fixtureSpeech=text=>{const r=window.fixtureRecognition;r.onresult({results:[[{transcript:text}]]});r.onend()}` })
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 960, deviceScaleFactor: 1, mobile: false })
    await cdp('Page.navigate', { url: 'http://localhost:3252/demo/ai-task' })
    await wait(`document.querySelector('.ai-task-login')`)
    assert.equal(requests.length, 0, 'Guest must not load task data')
    await clickText('Đăng nhập'); await wait(`document.querySelector('input[autocomplete="username"]')`)
    await setInput('input[autocomplete="username"]', 'fixture'); await setInput('input[autocomplete="current-password"]', 'test-only')
    await click('[role="dialog"] button[type="submit"], [role="dialog"] form>button')
    await wait(`document.querySelector('textarea[aria-label="Tin nhắn"]') && !document.querySelector('textarea[aria-label="Tin nhắn"]').disabled`)
    assert.equal((await repo.getGroups('alice')).length, 4)
    if (process.argv.includes('--recognition-only')) {
      assert.equal(await evaluate(`document.querySelector('.ai-task-memory').getBoundingClientRect().left > document.querySelector('h1').getBoundingClientRect().right`), true)
      const confirm = async () => {
        await wait(`document.querySelector('.ai-task-form .demo-primary') && !document.querySelector('.ai-task-form .demo-primary').disabled`)
        await click('.ai-task-form .demo-primary')
        await wait(`!document.querySelector('.demo-chat-confirmation')`)
      }
      await send('Rà soát hợp đồng 5')
      await wait(`JSON.parse(sessionStorage.getItem('ai-task-action-context:alice') || '{}').lastMessageId`)
      await send('Không, thêm công việc.')
      await wait(`document.querySelector('.ai-task-form')`)
      assert.equal((await repo.scanTasks('alice')).length, 0)
      await confirm()
      let task = (await repo.scanTasks('alice'))[0]
      assert.equal(task.title, 'Rà soát hợp đồng 5')
      assert.equal(await evaluate(`JSON.parse(sessionStorage.getItem('ai-task-action-context:alice')).lastTaskId`), task.id)
      await cdp('Page.reload')
      await wait(`document.querySelector('textarea[aria-label="Tin nhắn"]') && !document.querySelector('textarea[aria-label="Tin nhắn"]').disabled`)
      await send('Dời nó sang mai')
      await wait(`document.querySelector('.ai-task-form')`)
      assert.equal((await repo.scanTasks('alice'))[0].deadline, null)
      await confirm()
      assert.equal((await repo.scanTasks('alice')).length, 1)
      assert.equal((await repo.scanTasks('alice'))[0].deadline, new Date(fixtureDeadline).toISOString())
      await send('Việc này được 50% rồi')
      await wait(`document.querySelector('.ai-task-form input[type="number"][max="100"]')`)
      assert.equal(await evaluate(`document.querySelector('.ai-task-form input[type="number"][max="100"]').value`), '50')
      await screenshot('recognition-progress-desktop')
      await confirm()
      task = (await repo.scanTasks('alice'))[0]
      assert.equal(task.completionPercent, 50); assert.equal(task.status, 'in_progress')
      await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('.ai-task-memory')).display`), 'none')
      await send('Ghi chú cần gọi trước'); await wait(`document.querySelector('.ai-task-form')`); await confirm()
      assert.equal((await repo.scanTasks('alice'))[0].description, 'Cần gọi trước')
      await send('Xong rồi'); await wait(`document.querySelector('[data-completion-dialog][open]')`)
      assert.equal((await repo.scanTasks('alice'))[0].status, 'in_progress')
      await click('[data-completion-dialog] .demo-primary')
      await wait(`!document.querySelector('[data-completion-dialog]') && !document.querySelector('.demo-chat-confirmation')`)
      assert.equal((await repo.scanTasks('alice'))[0].status, 'done')
      await send('Rà soát hợp đồng 8'); await wait(`document.querySelector('.ai-task-form')`)
      const pending = (await repo.sessionRef('alice').get()).get('pendingId')
      assert.equal((await repo.messageCollection('alice').doc(pending).get()).get('recognition').result.source, 'personal_memory')
      assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true)
      await screenshot('recognition-personal-memory-mobile')
      await clickText('Hủy yêu cầu'); await wait(`!document.querySelector('.demo-chat-confirmation')`)
      assert.equal((await repo.scanTasks('alice')).length, 1)
      assert.deepEqual(errors, [])
      console.log('PASS: recognition browser flow, correction learning, confirmed target persistence across reload, rescheduling, progress, notes, completion confirmation, learned variants, mobile layout; screenshots:', output)
      return
    }
    await screenshot('chat-desktop')
    // Voice fills the composer; it never sends by itself.
    const beforeVoice = requests.filter(r => r.body?.operation === 'chat').length
    await click('[aria-label="Nhập bằng giọng nói"]')
    await evaluate(`window.fixtureSpeech('Tạo task Ainka code EDA cho MSD, gấp, mai xong')`)
    await wait(`document.querySelector('textarea').value.includes('EDA')`)
    assert.equal(requests.filter(r => r.body?.operation === 'chat').length, beforeVoice)
    await click('[aria-label="Gửi tin nhắn"]')
    await wait(`document.querySelector('.demo-chat-confirmation .ai-task-form')`)
    assert.equal((await repo.scanTasks('alice')).length, 0)
    assert.equal(await evaluate(`document.querySelector('.ai-task-form select')===null`), true)
    assert.equal(await evaluate(`document.querySelector('.ai-task-form input') === null`), true)
    await clickText('+ Thêm chi tiết'); await wait(`document.querySelector('select[aria-label="Ưu tiên"]')`)
    await evaluate(`(()=>{const e=document.querySelector('select[aria-label="Ưu tiên"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,'normal');e.dispatchEvent(new Event('change',{bubbles:true}));})()`)
    const deadlineInput = new Date(Date.parse(fixtureDeadline) + 7 * 3600000).toISOString().slice(0, 16)
    assert.equal(await evaluate(`document.querySelector('input[type="datetime-local"]').value`), deadlineInput)
    await setInput('.ai-task-form input[type="datetime-local"]', '')
    assert.equal(await evaluate(`document.querySelector('.ai-task-form input[type="datetime-local"]') !== null`), true)
    await setInput('.ai-task-form input[type="datetime-local"]', deadlineInput)
    await clickText('Thu gọn chi tiết')
    await clickText('Sửa'); await setInput('.ai-task-form input[maxlength="250"]', 'Code EDA cho MSD đã chỉnh')
    await screenshot('confirmation-desktop')
    await click('.ai-task-form .demo-form-actions .demo-primary')
    await wait(`document.body.textContent.includes('Xong, mình đã thêm “Code EDA cho MSD đã chỉnh”.') && !document.querySelector('.demo-chat-confirmation')`)
    assert.equal((await repo.scanTasks('alice'))[0].title, 'Code EDA cho MSD đã chỉnh')
    await send('Tạo task EDA cho ABC'); await wait(`document.querySelector('.demo-chat-confirmation .ai-task-form')`); await click('.ai-task-form .demo-form-actions .demo-primary'); await wait(`!document.querySelector('.demo-chat-confirmation')`)
    await send('EDA xong rồi'); await wait(`document.querySelector('.ai-task-choice')`)
    assert.equal((await repo.scanTasks('alice')).filter(t => t.status === 'done').length, 0)
    await clickText('Chọn Code EDA cho ABC'); await wait(`document.querySelector('.ai-task-form')`); await click('.ai-task-form .demo-form-actions .demo-primary'); await wait(`!document.querySelector('.demo-chat-confirmation')`)
    assert.equal((await repo.scanTasks('alice')).filter(t => t.status === 'done').length, 1)
    await navigate('/demo/ai-task/tasks'); await wait(`document.querySelector('tbody tr')`)
    assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 1)
    await clickText('Thêm công việc'); await wait(`document.querySelector('dialog[open]')`)
    assert.equal(await evaluate(`document.querySelector('dialog select[aria-label="Trạng thái"]') === null`), true)
    assert.equal(await evaluate(`document.querySelector('dialog select[aria-label="Thuộc công việc"] option').textContent`), 'Không có')
    await setInput('dialog input[aria-label="Số lượng thời gian"]', '')
    assert.equal(await evaluate(`document.querySelector('dialog input[aria-label="Số lượng thời gian"]') !== null`), true)
    await setInput('dialog input[aria-label="Số lượng thời gian"]', '3')
    await clickText('2 giờ')
    assert.equal(await evaluate(`document.querySelector('dialog input[aria-label="Số lượng thời gian"]').value`), '2')
    assert.equal(await evaluate(`document.querySelector('dialog .ai-task-schedule-hint').textContent.startsWith('Dự kiến hoàn thành:')`), true)
    await click('dialog .ai-task-schedule-choice:last-of-type input')
    assert.equal(await evaluate(`document.querySelector('dialog .ai-task-duration') === null && document.querySelector('dialog input[type="datetime-local"]') === null`), true)
    await click('dialog .ai-task-schedule-choice:last-of-type label:last-child input')
    await setInput('dialog input[type="datetime-local"]', new Date(Date.now() + 86400000 + 7 * 3600000).toISOString().slice(0, 16))
    assert.equal(await evaluate(`document.querySelector('dialog .ai-task-schedule-hint').textContent.startsWith('Còn khoảng')`), true)
    await click('dialog .ai-task-schedule-choice:first-of-type label:last-child input')
    assert.equal(await evaluate(`document.querySelectorAll('dialog input[type="datetime-local"]').length`), 2)
    await wait(`!document.querySelector('dialog select[aria-label="Thuộc công việc"]').disabled`)
    await evaluate(`(()=>{const e=document.querySelector('dialog select[aria-label="Thuộc công việc"]');e.value=e.options[1].value;e.dispatchEvent(new Event('change',{bubbles:true}));})()`)
    assert.equal(await evaluate(`document.querySelector('dialog select[aria-label="Nhóm"]').disabled`), true)
    assert.equal(await evaluate(`document.querySelector('dialog select[aria-label="Nhóm"]').value`), 'ainka')
    await evaluate(`(()=>{const e=document.querySelector('dialog select[aria-label="Thuộc công việc"]');e.value='';e.dispatchEvent(new Event('change',{bubbles:true}));})()`)
    assert.equal(await evaluate(`document.querySelector('dialog select[aria-label="Nhóm"]').disabled`), false)
    await screenshot('manual-schedule-desktop')
    await setInput('dialog input[maxlength="250"]', 'Mua đồ dùng cá nhân'); await clickText('Hủy'); await wait(`!document.querySelector('dialog[open]')`)
    assert.equal((await repo.scanTasks('alice')).length, 2)
    await navigate('/demo/ai-task/dashboard'); await wait(`document.querySelector('.ai-task-group')`)
    await clickText('Thêm nhóm'); await wait(`document.querySelector('dialog[open]')`)
    await setInput('dialog input[maxlength="80"]', 'Shop Bé Băng'); await clickText('Lưu nhóm'); await wait(`!document.querySelector('dialog[open]') && document.body.textContent.includes('Shop Bé Băng')`)
    assert.equal((await repo.getGroups('alice')).length, 5)
    await screenshot('dashboard-desktop')
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    await delay(200)
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), true, 'Mobile dashboard overflow')
    await screenshot('dashboard-mobile')
    await navigate('/demo/ai-task'); await wait(`document.querySelector('textarea') && !document.querySelector('textarea').disabled`)
    await send('Tạo task mới'); await wait(`document.querySelector('.ai-task-form')`)
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), true, 'Mobile confirmation overflow')
    await screenshot('confirmation-mobile')
    await clickText('Hủy yêu cầu'); await wait(`!document.querySelector('.demo-chat-confirmation')`)
    await navigate('/demo/ai-task/tasks'); await wait(`document.querySelector('tbody tr')`)
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), true, 'Mobile task table overflow')
    await screenshot('tasks-mobile')
    await clickText('Xóa'); await wait(`document.querySelector('.ai-task-form')`); await clickText('Xác nhận xóa'); await wait(`!document.querySelector('.demo-chat-confirmation')`)
    assert.equal((await repo.scanTasks('alice')).filter(t => t.deletedAt).length, 1)
    await navigate('/demo/ai-task/tasks'); await wait(`document.querySelector('.demo-tabs')`); await clickText('Thùng rác'); await wait(`document.querySelector('tbody tr')`); await clickText('Khôi phục')
    await wait(`document.querySelector('.ai-task-form')`); await clickText('Xác nhận khôi phục'); await wait(`!document.querySelector('.demo-chat-confirmation')`)
    assert.equal((await repo.scanTasks('alice')).filter(t => t.deletedAt).length, 0)
    // Build the requested multi-level examples entirely inside the isolated DB.
    const makeTask = async (title, parentId = null, groupId = 'inbox') => {
      if (parentId) groupId = (await repo.scanTasks('alice')).find(t => t.id === parentId).groupId
      const data = { title, parentId, groupId, priority: 'normal', status: 'todo', deadline: null, description: null }
      const proposal = await service.proposeManual('alice', crypto.randomUUID(), 'CREATE_TASK', data)
      return (await service.confirmProposal('alice', proposal.id, data)).id
    }
    const teaching = await makeTask('Dạy thêm')
    const student = await makeTask('Bạn A', teaching)
    const sewing = await makeTask('May đồ', null, 'personal')
    const customer = await makeTask('Út Nhung', sewing)
    await makeTask('Mợ 8', sewing)
    for (const [text, parentId, title, depth] of [
      ['Thêm môn Toán cho Bạn A', student, 'Toán', 2],
      ['Thêm Bạn C vào Dạy thêm', teaching, 'Bạn C', 1],
      ['Thêm việc đo áo dưới Út Nhung', customer, 'Đo áo', 2],
    ]) {
      await send(text); await wait(`document.querySelector('.ai-task-form')`); await clickText('+ Thêm chi tiết'); await wait(`document.querySelector('.ai-task-form select[aria-label="Thuộc công việc"]') && !document.querySelector('.ai-task-form select[aria-label="Thuộc công việc"]').disabled`)
      assert.equal(await evaluate(`document.querySelector('select[aria-label="Thuộc công việc"]').value`), parentId)
      assert.equal(await evaluate(`document.querySelector('select[aria-label="Nhóm"]').disabled`), true)
      assert.equal(await evaluate(`document.querySelector('select[aria-label="Nhóm"]').value`), (await repo.scanTasks('alice')).find(t => t.id === parentId).groupId)
      assert.equal((await repo.scanTasks('alice')).some(t => t.title === title), false)
      await click('.ai-task-form .demo-form-actions .demo-primary'); await wait(`!document.querySelector('.demo-chat-confirmation')`)
      assert.equal((await repo.scanTasks('alice')).find(t => t.title === title).depth, depth)
    }
    let all = await repo.scanTasks('alice')
    const math = all.find(t => t.title === 'Toán').id
    const rowButton = async (taskId, text) => {
      const expression = `Array.from(document.querySelector('[data-task-id="${taskId}"]').querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)})`
      await wait(`${expression} && !(${expression}).disabled`)
      await evaluate(`(${expression}).click()`)
    }
    await navigate('/demo/ai-task/tasks'); await wait(`document.querySelector('[data-task-id="${math}"]')`)
    await rowButton(math, 'Thêm công việc con'); await wait(`document.querySelector('dialog[open] select[aria-label="Thuộc công việc"]')`)
    await setInput('dialog input[maxlength="250"]', 'Phân số')
    await click('.ai-task-form .demo-form-actions .demo-primary'); await wait(`!document.querySelector('dialog[open]')`); assert.equal(await evaluate(`location.pathname`), '/demo/ai-task/tasks')
    const exercise = (await repo.scanTasks('alice')).find(t => t.title === 'Phân số')
    assert.equal(exercise.depth, 3)
    await navigate('/demo/ai-task/tasks'); await wait(`document.querySelector('[data-task-id="${exercise.id}"]')`)
    await click(`[data-task-id="${teaching}"] .ai-task-tree-toggle`)
    assert.equal(await evaluate(`document.querySelector('[data-task-id="${exercise.id}"]')===null`), true)
    await click(`[data-task-id="${teaching}"] .ai-task-tree-toggle`)
    await wait(`document.querySelector('[data-task-id="${exercise.id}"]')`)
    assert.equal(await evaluate(`document.querySelector('[data-task-id="${exercise.id}"]').dataset.depth`), '3')
    await screenshot('tree-mobile')
    await rowButton(student, 'Sửa / trạng thái')
    await wait(`document.querySelector('dialog[open] select[aria-label="Thuộc công việc"]') && !document.querySelector('dialog[open] select[aria-label="Thuộc công việc"]').disabled`)
    const optionIds = await evaluate(`Array.from(document.querySelector('dialog select[aria-label="Thuộc công việc"]').options).filter(o=>!o.disabled).map(o=>o.value)`)
    for (const excluded of [student, math, exercise.id]) assert.equal(optionIds.includes(excluded), false)
    assert.equal(optionIds.includes(customer), true)
    await evaluate(`(()=>{const e=document.querySelector('dialog select[aria-label="Thuộc công việc"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(customer)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`)
    assert.equal(await evaluate(`document.querySelector('dialog select[aria-label="Nhóm"]').value`), 'personal')
    assert.equal(await evaluate(`document.querySelector('dialog select[aria-label="Nhóm"]').disabled`), true)
    assert.equal((await repo.scanTasks('alice')).find(t => t.id === student).parentId, teaching)
    await click('.ai-task-form .demo-form-actions .demo-primary'); await wait(`!document.querySelector('dialog[open]')`)
    all = await repo.scanTasks('alice')
    assert.equal(all.find(t => t.id === student).parentId, customer)
    assert.equal(all.find(t => t.id === exercise.id).rootTaskId, sewing)
    assert.equal(all.find(t => t.id === exercise.id).depth, 4)
    for (const taskId of [student, math, exercise.id]) assert.equal(all.find(t => t.id === taskId).groupId, 'personal')
    await navigate('/demo/ai-task/tasks'); await wait(`document.querySelector('[data-task-id="${exercise.id}"]')`)
    await setInput('[aria-label="Tìm công việc"]', 'Phân số')
    await wait(`document.querySelectorAll('tbody tr').length===5 && !document.body.textContent.includes('Đang tìm công việc')`)
    assert.equal(await evaluate(`document.querySelectorAll('.ai-task-tree-context').length`), 4)
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), true)
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1400, height: 960, deviceScaleFactor: 1, mobile: false })
    await screenshot('tree-filtered-desktop')
    await navigate('/demo/ai-task'); await wait(`document.querySelector('textarea[aria-label="Tin nhắn"]') && !document.querySelector('textarea[aria-label="Tin nhắn"]').disabled`)
    const memoryReads = () => requests.filter(r => r.url.includes('resource=memory')).length
    const readsBeforeChat = memoryReads()
    await send('Thêm task kiểm tra bộ nhớ'); await wait(`document.querySelector('.ai-task-form')`)
    for (const message of ['nhóm Shop Bé Băng', 'ưu tiên thấp', '2 ngày', 'bắt đầu ngay']) {
      const count = requests.filter(r => r.body?.operation === 'chat').length
      await wait(`!document.querySelector('[aria-label="Gửi tin nhắn"]').disabled || !document.querySelector('textarea[aria-label="Tin nhắn"]').disabled`)
      await send(message)
      await wait(`!document.body.textContent.includes('Đang phân tích…') && document.querySelector('.ai-task-form')`)
      assert.equal(requests.filter(r => r.body?.operation === 'chat').length, count + 1)
    }
    await clickText('Sửa'); await setInput('.ai-task-form input[maxlength="250"]', 'Bản nháp giữ sau refresh')
    await wait(`JSON.parse(sessionStorage.getItem('ai-task-chat-context:alice')).activeDraft.title === 'Bản nháp giữ sau refresh'`)
    assert.equal(memoryReads(), readsBeforeChat, 'Chat must not refetch overview')
    await cdp('Page.reload')
    await wait(`document.querySelector('.ai-task-form')`)
    assert.equal(await evaluate(`document.querySelector('.ai-task-confirm-title').textContent`), 'Bản nháp giữ sau refresh')
    assert.equal(await evaluate(`JSON.parse(sessionStorage.getItem('ai-task-chat-context:alice')).activeDraft.duration`), 2880)
    const readsAfterReload = memoryReads()
    await click('details.ai-task-memory summary')
    assert.equal(await evaluate(`document.querySelector('details.ai-task-memory').textContent.includes('{"groupId"')`), false)
    await screenshot('memory-context-desktop')
    await click('.ai-task-form .demo-form-actions .demo-primary'); await wait(`!document.querySelector('.demo-chat-confirmation')`)
    await wait(`JSON.parse(sessionStorage.getItem('ai-task-chat-context:alice')).mode === 'idle'`)
    assert.equal(memoryReads(), readsAfterReload, 'Confirm must update overview cache without refetch')
    const savedMemoryTask = (await repo.scanTasks('alice')).find(t => t.title === 'Bản nháp giữ sau refresh')
    assert.equal(savedMemoryTask.priority, 'low'); assert.equal(savedMemoryTask.duration, 2880)
    await send('Thêm task tiếp theo'); await wait(`document.querySelector('.ai-task-form')`)
    const nextDraft = await evaluate(`JSON.parse(sessionStorage.getItem('ai-task-chat-context:alice')).activeDraft`)
    assert.equal(nextDraft.groupId, savedMemoryTask.groupId); assert.equal(nextDraft.priority, 'low')
    assert.equal(nextDraft.duration, null); assert.equal(nextDraft.description, null); assert.equal(nextDraft.deadline, null)
    await clickText('Hủy yêu cầu'); await wait(`!document.querySelector('.demo-chat-confirmation')`)
    const tasksBeforeQuery = await repo.scanTasks('alice')
    await send('còn việc gì?')
    await wait(`document.querySelector('.ai-task-result-group')`)
    const shownTitles = await evaluate(`Array.from(document.querySelectorAll('.ai-task-result-group li>strong')).map(e => e.textContent)`)
    const expectedLeaves = harness.load('_lib/task-display.ts').leafTasks(tasksBeforeQuery.filter(t => !t.deletedAt && !['done', 'cancelled'].includes(t.status)), tasksBeforeQuery)
    assert.deepEqual([...shownTitles].sort(), expectedLeaves.map(t => t.title).sort())
    assert.equal(shownTitles.includes('Toán'), false)
    assert.equal(shownTitles.includes('Bạn A'), false)
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('.ai-task-result-group h3')).some(e => e.textContent.includes('May đồ · Út Nhung · Bạn A · Toán'))`), true)
    assert.deepEqual(await repo.scanTasks('alice'), tasksBeforeQuery)
    await screenshot('grouped-results-desktop')
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    await delay(150)
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, 'Grouped results mobile overflow')
    await screenshot('grouped-results-mobile')
    assert.deepEqual(errors, [])
    console.log('PASS: actual Next desktop/mobile UI, auth, confirmation, task tree at multiple levels, three subtask chat examples, collapse/expand, valid parent choices, subtree move and ancestor-preserving search; screenshots:', output)
  } finally { ws.close(); global.fetch = nativeFetch }
})().catch(error => { console.error(error); process.exitCode = 1 })

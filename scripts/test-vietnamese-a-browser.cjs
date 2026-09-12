// Requires a local Next server (:3217) and Chrome headless debugging (:9337).
// Uses real renderers/answer handlers, mock HTTP tracking; never writes Firestore.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const sessions = [], errors = []
;(async () => {
  const targets = await (await fetch('http://localhost:9337/json')).json()
  const ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl)
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
  let id = 0
  const pending = new Map()
  const cdp = (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); ws.send(JSON.stringify({ id: requestId, method, params })) })
  ws.addEventListener('message', async event => {
    const message = JSON.parse(event.data)
    if (message.id) { const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(message.error) : request.resolve(message.result); return }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text)
    if (message.method !== 'Fetch.requestPaused') return
    const { requestId, request } = message.params
    let body = {}, status = 200
    if (request.url.includes('/api/auth/')) { body = { user: null }; status = 401 }
    else if (request.url.includes('/sessions') && request.method === 'POST') { const session = JSON.parse(request.postData); sessions.push(session); body = { sessionId: session.sessionId } }
    else body = { keys: {}, games: {} }
    await cdp('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') })
  })
  const evaluate = async expression => { const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value }
  const wait = async (expression, ms = 30000) => {
    const end = Date.now() + ms
    while (Date.now() < end) { if (await evaluate(`Boolean(${expression})`)) return; await delay(100) }
    throw new Error(`Timed out: ${expression}; errors=${errors.join('\n')}`)
  }
  const click = async selector => {
    const point = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 })
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 })
  }
  await cdp('Page.enable'); await cdp('Runtime.enable')
  await cdp('Fetch.enable', { patterns: [{ urlPattern: '*/api/game-tracking/*' }, { urlPattern: '*/api/auth/*' }] })
  await cdp('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 1, mobile: true })
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.gameTest = {
      hooks(element, predicate) {
        const key = Object.keys(element || {}).find(key => key.startsWith('__reactFiber'));
        let fiber = element?.[key];
        while (fiber) {
          for (const f of [fiber, fiber.alternate]) {
            if (!f) continue;
            let hook = f.memoizedState;
            while (hook && 'memoizedState' in hook) { if (predicate(hook.memoizedState)) return hook.memoizedState; hook = hook.next; }
          }
          fiber = fiber.return;
        }
      },
      getGame() { return this.hooks(document.querySelector('canvas')?.parentElement, state => state?.current?.scene?.scenes)?.current; },
      getLevels() { return this.hooks(document.querySelector('[data-answer-tile]'), state => Array.isArray(state) && state.length === 10 && state[0]?.answers); },
      dragProps() { const el = document.querySelector('[data-answer-tile]'); const key = Object.keys(el || {}).find(key => key.startsWith('__reactFiber')); let f = el?.[key]; while(f){ if(f.memoizedProps?.currentRound !== undefined && f.memoizedProps?.onRestart) return f.memoizedProps; f = f.return; } }
    };
  ` })
  const games = ['bubble-shooter', 'gold-mining', 'racing', 'drag-drop']
  const selected = process.argv.includes('--vietnamese-only') ? ['tieng-viet'] : ['tieng-viet', 'toan']
  for (const subject of selected) for (const game of games) {
    console.log(`START ${subject}/${game}`)
    const before = sessions.length
    await cdp('Page.navigate', { url: `http://localhost:3217/game/lop-1/${subject}/bai-1/${game}` })
    await wait(`document.querySelector('[aria-label="Bắt đầu trò chơi"]')`, 90000)
    await click('[aria-label="Bắt đầu trò chơi"]')
    await wait(`!document.querySelector('[aria-label="Bắt đầu trò chơi"]')`)
    if (game !== 'drag-drop') {
      await wait(`window.gameTest.getGame()?.scene.scenes[0]?.gameStarted`)
      await evaluate(`window.sceneTest = gameTest.getGame().scene.scenes[0]; sceneTest.time.timeScale = 3; sceneTest.tweens.timeScale = 3;`)
      const signature = () => evaluate(`JSON.stringify((Array.isArray(sceneTest.questions) ? sceneTest.questions : sceneTest.questions.questions).map(q=>q.id||q.text))`)
      const original = await signature()
      const wolf = await evaluate(`[...sceneTest.wolfRounds]`)
      if (game === 'racing' && subject === 'tieng-viet') assert.equal(wolf.length, 0)
      else { assert.equal(wolf.length, 4); assert.ok(wolf.every(round => game === 'bubble-shooter' ? round >= 3 && round <= 10 : round >= 2 && round <= 9)) }
      for (let round = 1; round <= 10; round++) {
        const ready = game === 'bubble-shooter'
          ? `sceneTest.questionNumber === ${round} && sceneTest.roundState === 'PLAYING' && sceneTest.bubbles.getChildren().some(b=>b.active&&b.value===sceneTest.currentQuestion.answer)`
          : game === 'gold-mining' ? `sceneTest.round === ${round - 1} && sceneTest.state === 'AIMING'`
          : `sceneTest.questionIndex === ${round - 1} && sceneTest.state === 'RUNNING' && sceneTest.gates.length === 3`
        await wait(ready)
        if (round === 1) {
          const screenshot = await cdp('Page.captureScreenshot', { format: 'png' })
          fs.writeFileSync(path.join(os.tmpdir(), `${subject}-${game}.png`), Buffer.from(screenshot.data, 'base64'))
        }
        if (subject === 'tieng-viet' && game === 'bubble-shooter' && round === 3) {
          // Force the wolf's target selection; it must never select the correct balloon.
          const protectedAnswer = await evaluate(`(() => { sceneTest.clearWolfAction(); const targets = []; const originalPop = sceneTest.pop; sceneTest.pop = function(b,...rest){targets.push(b.value); return originalPop.call(this,b,...rest)}; sceneTest.fireWolfArrow(); window.wolfTargetsTest = targets; return sceneTest.currentQuestion.answer; })()`)
          await delay(550)
          assert.ok(!(await evaluate('wolfTargetsTest')).includes(protectedAnswer))
        }
        if (round === 2) {
          if (game === 'bubble-shooter') {
            await wait(`sceneTest.bubbles.getChildren().some(b=>b.active&&b.value!==sceneTest.currentQuestion.answer)`)
            await evaluate(`sceneTest.handleHitFlow({active:true,destroy(){}},sceneTest.bubbles.getChildren().find(b=>b.active&&b.value!==sceneTest.currentQuestion.answer))`)
          } else if (game === 'gold-mining') await evaluate(`sceneTest.grabbed=sceneTest.mineItems.find(item=>item.active&&!item.taken&&item.value!==sceneTest.question.correctAnswer); sceneTest.finishReturn()`)
          else await evaluate(`sceneTest.hasCheckedCurrentGate=true;sceneTest.resolveGate(sceneTest.gates.find(g=>g.answer!==sceneTest.getExpectedAnswer(sceneTest.questions[sceneTest.questionIndex])).answer)`)
          await wait(ready)
          assert.equal(await evaluate(`typeof sceneTest.score === 'number' ? sceneTest.score : sceneTest.score.current`), 8)
        }
        if (game === 'bubble-shooter') await evaluate(`sceneTest.handleHitFlow({active:true,destroy(){}},sceneTest.bubbles.getChildren().find(b=>b.active&&b.value===sceneTest.currentQuestion.answer))`)
        else if (game === 'gold-mining') await evaluate(`sceneTest.grabbed=sceneTest.mineItems.find(item=>item.active&&!item.taken&&item.value===sceneTest.question.correctAnswer);sceneTest.finishReturn()`)
        else await evaluate(`sceneTest.hasCheckedCurrentGate=true;sceneTest.resolveGate(sceneTest.getExpectedAnswer(sceneTest.questions[sceneTest.questionIndex]))`)
      }
      await wait(`document.querySelector('[aria-label="Kết quả trò chơi"] fieldset:not(:disabled)')`)
      assert.equal(sessions.length, before + 1)
      const result = sessions.at(-1)
      assert.equal(result.score, 98); assert.equal(result.correctCount, 10); assert.equal(result.wrongCount, 1)
      await click('[aria-label="Kết quả trò chơi"] button')
      await wait(`window.gameTest.getGame()?.scene.scenes[0]?.gameStarted && !document.querySelector('[aria-label="Kết quả trò chơi"]')`)
      await evaluate(`window.sceneTest = gameTest.getGame().scene.scenes[0]`)
      if (subject === 'tieng-viet') assert.notEqual(await signature(), original)
      assert.equal(await evaluate(`typeof sceneTest.score === 'number' ? sceneTest.score : sceneTest.score.current`), 0)
    } else {
      await wait(`gameTest.getLevels() && gameTest.dragProps()`)
      const original = await evaluate(`gameTest.getLevels().map(q=>q.questionId||q.id).join('|')`)
      for (let round = 1; round <= 10; round++) {
        await wait(`gameTest.dragProps()?.currentRound === ${round}`)
        const level = await evaluate(`gameTest.getLevels()[${round - 1}]`)
        if (round === 1 || subject === 'tieng-viet' && level.groups?.some(group => group.textMatch)) {
          const screenshot = await cdp('Page.captureScreenshot', { format: 'png' })
          fs.writeFileSync(path.join(os.tmpdir(), `${subject}-${game}${level.groups?.some(group => group.textMatch) ? '-fill' : ''}.png`), Buffer.from(screenshot.data, 'base64'))
        }
        const drag = async (target, answer) => {
          const points = await evaluate(`(() => { const a = document.querySelector('[data-answer-value="${answer}"]').getBoundingClientRect(); const b = document.querySelector('[data-target-id="${target}"]').getBoundingClientRect(); return {a:{x:a.x+a.width/2,y:a.y+a.height/2},b:{x:b.x+b.width/2,y:b.y+b.height/2}} })()`)
          await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...points.a })
          await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...points.a, button: 'left', clickCount: 1 })
          await delay(30)
          await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...points.b, button: 'left', buttons: 1 })
          await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...points.b, button: 'left', clickCount: 1 })
          await delay(80)
        }
        if (round === 2) {
          const [target, answer] = Object.entries(level.answers)[0]
          const wrong = (level.answerDomain || [0,1,2,3,4,5]).find(value => value !== answer)
          await drag(target, wrong)
          assert.equal(await evaluate(`gameTest.dragProps().score`), 8)
          assert.equal(await evaluate(`gameTest.dragProps().currentRound`), round)
        }
        for (const [target, answer] of Object.entries(level.answers)) await drag(target, answer)
      }
      await wait(`document.querySelector('[aria-label="Kết quả trò chơi"] fieldset:not(:disabled)')`)
      assert.equal(sessions.length, before + 1)
      assert.equal(sessions.at(-1).score, 98)
      assert.equal(sessions.at(-1).wrongCount, 1)
      if (subject === 'tieng-viet') assert.equal(sessions.at(-1).correctCount, 10)
      await click('[aria-label="Kết quả trò chơi"] button')
      await wait(`gameTest.dragProps()?.currentRound === 1 && !document.querySelector('[aria-label="Kết quả trò chơi"]')`)
      if (subject === 'tieng-viet') {
        await wait(`gameTest.getLevels().map(q=>q.questionId||q.id).join('|') !== ${JSON.stringify(original)}`)
        assert.equal(await evaluate(`gameTest.dragProps().score`), 0)
      }
    }
    const saved = sessions.at(-1)
    assert.equal(saved.lessonId, `${subject}-1-bai-1`)
    assert.equal(saved.gameId, game)
    if (subject === 'tieng-viet') assert.ok(saved.results.every(result => ['RECOGNIZE_A','RECOGNIZE_A_CASE','LISTEN_A','FIND_A_IN_TEXT','MATCH_A'].includes(result.learningKey)))
    console.log(`PASS ${subject}/${game}: 10 rounds, wrong/retry, score 98, saved scoped tracking, replay reset${subject === 'tieng-viet' ? ' + fresh content' : ''}`)
  }
  assert.deepEqual(errors, [])
  console.log(`PASS browser suite: ${sessions.length} completed sessions; no uncaught browser exceptions`)
  ws.close()
})().catch(error => { console.error(error); process.exit(1) })

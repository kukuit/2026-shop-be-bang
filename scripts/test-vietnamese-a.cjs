// Offline tests: no credentials, Firebase writes or external voice requests.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const resolve = Module._resolveFilename
Module._resolveFilename = function (id, ...args) { return resolve.call(this, id.startsWith('@/') ? path.join(root, 'src', id.slice(2)) : id, ...args) }
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename)
const lessonPath = '../src/app/game/lop-1/tieng-viet/bai-1'
const { DEFAULT_GOAL_COUNTS, generateQuestionSet, createQuestionPool, A_WORDS } = require(`${lessonPath}/content.ts`)
const { TIENG_VIET_1_BAI_1 } = require(`${lessonPath}/lesson.ts`)
const { GameTracker } = require('../src/components/games/general/tracking/game-session.ts')
const { isLearningKeyForLesson } = require('../src/components/games/general/tracking/lesson-catalog.ts')
const { ScoreSystem } = require('../src/components/games/bubble-shooter/systems/ScoreSystem.ts')
const tracking = require('../src/components/games/general/tracking/index.ts')
const adaptive = require('../src/components/games/general/adaptive.ts')
const configs = require('../src/components/games/vietnamese/tieng-viet-1-bai-1.ts')
const seeded = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296 }
const countsOf = questions => questions.reduce((counts, q) => ({ ...counts, [q.goalKey]: (counts[q.goalKey] || 0) + 1 }), {})

async function main() {
  for (const game of Object.keys(DEFAULT_GOAL_COUNTS)) {
    const pool = createQuestionPool(game)
    assert.ok(pool.length > 10)
    assert.equal(new Set(pool.map(q => q.id)).size, pool.length)
    const correctPositions = new Set(), schedules = new Set(), words = new Set(), variants = new Set()
    let previous = []
    for (let seed = 1; seed <= 200; seed++) {
      const questions = generateQuestionSet(game, { random: seeded(seed), previousIds: previous.map(q => q.id) })
      assert.equal(questions.length, 10)
      assert.equal(new Set(questions.map(q => q.id)).size, 10)
      assert.deepEqual(countsOf(questions), DEFAULT_GOAL_COUNTS[game])
      if (previous.length) assert.notDeepEqual(questions.map(q => q.id).sort(), previous.map(q => q.id).sort(), 'Replay must change content, not just order')
      for (const q of questions) {
        assert.equal(q.options.filter(value => value === q.answer).length, 1)
        assert.equal(new Set(q.options).size, q.options.length)
        assert.ok(isLearningKeyForLesson(TIENG_VIET_1_BAI_1.lessonId, q.goalKey))
        assert.ok(!isLearningKeyForLesson('toan-1-bai-1', q.goalKey))
        if (game === 'racing') assert.equal(q.options.length, 3)
        if (q.word) { assert.ok(A_WORDS.includes(q.word)); words.add(q.word) }
        if (q.textMatch) assert.equal(q.textMatch.before + q.answer + q.textMatch.after, q.word)
        if (q.inputMode === 'audio') { assert.ok(q.voice.endsWith('/sound-a.mp3')); assert.equal(q.displayText, '🔊'); assert.equal(q.spokenTarget, 'a') }
        // All incorrect letters are visual distractors, never separate learning goals.
        if (game === 'gold-mining' && q.goalKey === 'FIND_A_IN_TEXT') assert.equal(q.options.filter(word => /a/i.test(word.normalize('NFD'))).length, 1)
        else assert.ok(q.options.every(value => ['a', 'o', 'e', 'c', 'd', 'b', 'q', 'g'].includes(value.toLowerCase())))
        correctPositions.add(q.options.indexOf(q.answer)); variants.add(q.id)
      }
      schedules.add(questions.map(q => q.goalKey).join(','))
      previous = questions
    }
    assert.ok(correctPositions.size >= 3)
    assert.ok(schedules.size > 20)
    assert.ok(variants.size > 20)
    assert.equal(words.size, A_WORDS.length)
    for (const weak of Object.keys(DEFAULT_GOAL_COUNTS[game])) {
      const adapted = countsOf(generateQuestionSet(game, { random: seeded(42), weakTargets: [weak, 'recognize-number-0'], adaptiveCount: 4 }))
      assert.equal(Object.values(adapted).reduce((a, b) => a + b, 0), 10)
      assert.ok(adapted[weak] > DEFAULT_GOAL_COUNTS[game][weak])
      for (const goal of Object.keys(DEFAULT_GOAL_COUNTS[game])) assert.ok(adapted[goal] >= 1)
    }
    const unrelated = generateQuestionSet(game, { random: seeded(10), weakTargets: ['recognize-number-0', 'recognize-ball'], adaptiveCount: 4 })
    assert.deepEqual(countsOf(unrelated), DEFAULT_GOAL_COUNTS[game])
    console.log(`PASS ${game}: pool=${pool.length}, 200 sessions, unique variants/options, structured/adaptive coverage`)
  }
  const gameConfigs = [configs.TIENG_VIET_1_BAI_1_BUBBLE_CONFIG, configs.TIENG_VIET_1_BAI_1_GOLD_CONFIG, configs.TIENG_VIET_1_BAI_1_RACING_CONFIG, configs.TIENG_VIET_1_BAI_1_DRAG_CONFIG]
  for (const config of gameConfigs) {
    const load = config.loadQuestions || config.loadLevels
    const first = await load(), second = await load(first)
    assert.equal(second.length, 10)
    assert.notDeepEqual(first.map(q => q.questionId || q.id).sort(), second.map(q => q.questionId || q.id).sort())
    let saved
    const tracker = new GameTracker({ lessonId: config.lessonId || config.tracking.lessonId, gameId: config.gameId || config.tracking.gameId, repository: { saveSession: async value => { saved = value; return { sessionId: value.sessionId } } } })
    const score = new ScoreSystem()
    assert.equal(score.wrong().score, 0)
    for (const q of first) {
      const goal = q.learningKey || Object.values(q.learningKeys)[0]
      const answer = q.answer ?? q.correctAnswer ?? Object.values(q.answers)[0]
      const choices = q.options || q.choices || q.answerDomain
      tracker.startQuestion({ learningKey: goal, expectedAnswer: answer })
      tracker.recordAnswer({ learningKey: goal, expectedAnswer: answer, selectedAnswer: choices.find(value => value !== answer), correct: false })
      score.wrong()
      tracker.recordAnswer({ learningKey: goal, expectedAnswer: answer, selectedAnswer: answer, correct: true })
      score.correct()
    }
    await tracker.finishSession(score.current)
    assert.equal(saved.lessonId, 'tieng-viet-1-bai-1')
    assert.equal(saved.correctCount, 10); assert.equal(saved.wrongCount, 10); assert.equal(saved.score, 82)
    assert.ok(saved.results.every(result => isLearningKeyForLesson(saved.lessonId, result.learningKey)))
  }
  assert.equal(configs.TIENG_VIET_1_BAI_1_RACING_CONFIG.wolfEnabled, false)
  console.log('PASS all four adapters: fresh 10 rounds on replay, scoped tracking, +10/-2/min 0')

  const originalGet = tracking.getLearningProgress
  const originalEnabled = adaptive.ADAPTIVE_ENABLED
  const requests = []
  tracking.getLearningProgress = async lessonId => { requests.push(lessonId); return { LISTEN_A: { attempts: 10, correct: 1, wrong: 9, responseTime: 2000 }, 'recognize-number-0': { attempts: 20, correct: 0, wrong: 20, responseTime: 100 } } }
  adaptive.ADAPTIVE_ENABLED = true
  let qs = await configs.loadVietnameseQuestions('racing')
  assert.ok(countsOf(qs).LISTEN_A > 5)
  assert.deepEqual(requests, ['tieng-viet-1-bai-1'])
  tracking.getLearningProgress = async () => { throw new Error('offline') }
  assert.deepEqual(countsOf(await configs.loadVietnameseQuestions('racing')), DEFAULT_GOAL_COUNTS.racing)
  adaptive.ADAPTIVE_ENABLED = false
  tracking.getLearningProgress = async () => { throw new Error('Must not fetch when adaptive is disabled') }
  assert.deepEqual(countsOf(await configs.loadVietnameseQuestions('racing')), DEFAULT_GOAL_COUNTS.racing)
  tracking.getLearningProgress = originalGet
  adaptive.ADAPTIVE_ENABLED = originalEnabled
  console.log('PASS adaptive: only the Vietnamese lesson is queried; offline/off retain default counts')

  // Existing numeric providers are exercised unchanged, including their replay entry points.
  const math = [
    require('../src/app/game/lop-1/toan/bai-1/bubble-shooter/config.ts').TOAN_1_BAI_1_BUBBLE_SHOOTER_CONFIG,
    require('../src/components/games/gold-miner/lessons/toan-1-bai-1.ts').TOAN_1_BAI_1_GOLD_MINER_CONFIG,
    require('../src/components/games/racing/lessons/toan-1-bai-1.ts').TOAN_1_BAI_1_RACING_CONFIG,
    require('../src/components/games/drag-drop/lessons/toan-1-bai-1.ts').TOAN_1_BAI_1_DRAG_DROP_CONFIG,
  ]
  for (const config of math) {
    assert.equal(config.wolfEnabled, undefined)
    assert.equal(config.awaitLevelReload, undefined)
    const load = config.loadQuestions || config.loadLevels
    for (const q of [...await load(), ...await load()]) {
      const answers = q.answers ? Object.values(q.answers) : [q.answer ?? q.correctAnswer]
      assert.ok(answers.every(answer => typeof answer === 'number' && answer >= 0 && answer <= 5))
      assert.ok(!q.voiceFallback)
      const goals = q.learningKeys ? Object.values(q.learningKeys) : [q.learningKey]
      assert.ok(goals.every(goal => isLearningKeyForLesson('toan-1-bai-1', goal)))
    }
  }
  console.log('PASS math regression: four existing providers keep numeric answers, goals and defaults')

  const recordings = [], speech = []
  let cancelled = 0
  global.Audio = class {
    constructor(src) { this.src = src; recordings.push(this) }
    play() { return Promise.resolve() }
    pause() {}
    removeAttribute() {}
    load() {}
  }
  global.SpeechSynthesisUtterance = class { constructor(text) { this.text = text } }
  global.window = { speechSynthesis: { getVoices: () => [{ lang: 'vi-VN' }], speak: utterance => speech.push(utterance), cancel: () => { cancelled++ } } }
  const { QuestionVoicePlayer } = require('../src/components/games/general/QuestionVoicePlayer.ts')
  const voice = new QuestionVoicePlayer()
  voice.play(['missing-instruction.mp3', 'missing-a.mp3'], { instruction: 'Bé hãy nghe và chọn.', target: 'a' })
  recordings[0].onerror()
  assert.equal(speech[0].lang, 'vi-VN')
  voice.setBlocked(true)
  assert.equal(cancelled, 1)
  voice.setBlocked(false)
  assert.equal(speech[1].text, 'Bé hãy nghe và chọn.')
  speech[1].onend()
  recordings[1].onerror()
  assert.equal(speech[2].text, 'a')
  voice.stop()
  assert.equal(speech[2].onend, null)
  assert.equal(cancelled, 2)
  console.log('PASS voice fallback: Vietnamese speech, instruction before a, pause/resume and cleanup')
}
main().catch(error => { console.error(error); process.exitCode = 1 })

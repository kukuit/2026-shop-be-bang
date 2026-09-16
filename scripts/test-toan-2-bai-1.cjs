const assert = require('node:assert/strict')
const createLoader = require('./lib/load-project-ts.cjs')
let progressReads = []
const load = createLoader({
  '@/components/games/general/adaptive': {
    ADAPTIVE_ENABLED: true, ADAPTIVE_RATIO: .4,
    normalizeLessonLearningProfile: p => p, getWeakTargets: () => ['COMPOSE_NUMBER'],
  },
  '@/components/games/general/tracking': {
    GAME_IDS: { BUBBLE_SHOOTER: 'bubble-shooter', GOLD_MINING: 'gold-mining', RACING: 'racing', DRAG_DROP: 'drag-drop' },
    getLearningProgress: async id => { progressReads.push(id); return {} },
  },
})
const base = 'src/app/game/lop-2/toan/bai-1/'
const { GAME_GOALS, createQuestionPool, generateQuestionSet, readNumber, createNumberChartBlock, createEstimateAndCount } = load(base + 'content.ts')
const config = load(base + 'config.ts')
const catalog = load('src/components/games/general/tracking/lesson-catalog.ts')
let seed = 12345
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296)
for (const [n, text] of [[0, 'không'], [10, 'mười'], [14, 'mười bốn'], [15, 'mười lăm'], [21, 'hai mươi mốt'], [47, 'bốn mươi bảy'], [54, 'năm mươi tư'], [80, 'tám mươi'], [91, 'chín mươi mốt'], [100, 'một trăm']]) assert.equal(readNumber(n), text)
assert.equal(new Set(Array.from({ length: 101 }, (_, n) => readNumber(n))).size, 101)
for (const game of Object.keys(GAME_GOALS)) {
  const pool = createQuestionPool(game, random)
  assert.ok(pool.length > 100)
  assert.equal(new Set(pool.map(q => q.id)).size, pool.length)
  assert.deepEqual(new Set(pool.map(q => q.goalKey)), new Set(GAME_GOALS[game]))
  for (const q of pool) {
    assert.equal(q.numericOptions.filter(q.accepts).length, 1)
    assert.equal(q.options.filter(a => a === q.answer).length, 1)
    assert.equal(new Set(q.options).size, game === 'racing' ? 3 : game === 'drag-drop' ? 6 : 4)
    assert.ok(q.voiceText && q.prompt)
    assert.ok(catalog.isLearningKeyForLesson(q.lessonId, q.goalKey))
    if (q.questionType === 'COMPARE') {
      const predicate = q.variant === 'GT' ? v => v > q.number : q.variant === 'LT' ? v => v < q.number : v => v > q.number && v < q.number + 10
      assert.equal(q.numericOptions.filter(predicate).length, 1)
      assert.ok(predicate(Number(q.answer)))
    }
    if (q.questionType === 'DECOMPOSE' && q.variant === 'TENS') assert.equal(Number(q.answer), Math.floor(q.number / 10) * 10)
    if (q.questionType === 'COMPOSE') assert.equal(Number(q.answer), q.number)
    if (q.questionType === 'DECOMPOSE' && q.variant === 'ONES') assert.equal(Number(q.answer), q.number % 10)
    if (q.questionType === 'ORDER' && ['MAX', 'MIN'].includes(q.variant)) assert.equal(Number(q.answer), (q.variant === 'MAX' ? Math.max : Math.min)(...q.numericOptions))
    const mapped = game === 'bubble-shooter' ? config.toBubble(q) : game === 'gold-mining' ? config.toGold(q) : game === 'racing' ? config.toRacing(q) : config.toDrag(q, 0)
    assert.equal(mapped.voiceFallback.instruction, q.voiceText)
    if (game === 'drag-drop') {
      if (q.questionType === 'READ_WRITE' && q.variant === 'READ') {
        assert.equal(mapped.groups[0].icon, String(q.number), 'show the number whose reading is requested')
        assert.equal(mapped.answers.answer, readNumber(q.number))
      }
      assert.ok(Object.values(mapped.learningKeys).every(key => key === q.goalKey))
      assert.ok(Object.values(mapped.answers).every(answer => mapped.answerDomain.includes(answer)))
      if (q.questionType === 'FORM') {
        assert.equal(mapped.answers.tens + mapped.answers.ones, String(q.number))
        assert.equal(mapped.groups.length, 2)
        assert.equal(new Set(mapped.answerDomain).size, 6)
      }
    } else assert.equal(mapped.learningKey, q.goalKey)
  }
  const sets = new Set(), positions = new Set(), ids = new Set()
  let normalWeak = 0, adaptiveWeak = 0
  for (let i = 0; i < 60; i++) {
    const questions = generateQuestionSet(game, { random })
    assert.equal(questions.length, 10)
    assert.deepEqual(new Set(questions.map(q => q.goalKey)), new Set(GAME_GOALS[game]))
    assert.ok(questions.every(q => !['RECOGNIZE', 'AFTER', 'BEFORE', 'ASC', 'DESC'].includes(q.questionType) && !['AFTER', 'BEFORE', 'ASC', 'DESC'].includes(q.variant)))
    assert.equal(new Set(questions.map(q => q.id)).size, 10)
    sets.add(questions.map(q => q.id).sort().join('|'))
    questions.forEach(q => { positions.add(q.options.indexOf(q.answer)); ids.add(q.id) })
    normalWeak += questions.filter(q => q.goalKey === 'COMPOSE_NUMBER').length
    const adaptive = generateQuestionSet(game, { random, weakTargets: ['COMPOSE_NUMBER', 'unrelated-goal'], adaptiveCount: 4 })
    assert.equal(new Set(adaptive.map(q => q.id)).size, 10)
    const count = adaptive.filter(q => q.goalKey === 'COMPOSE_NUMBER').length
    assert.ok(count >= 4)
    adaptiveWeak += count
  }
  assert.equal(sets.size, 60)
  assert.ok(ids.size > 100)
  assert.equal(positions.size, game === 'racing' ? 3 : game === 'drag-drop' ? 6 : 4)
  assert.ok(adaptiveWeak > normalWeak)
  console.log(`${game}: ${pool.length} question identities; 60 random + 60 adaptive sessions passed`)
}
for (let i = 0; i < 100; i++) {
  const chart = createNumberChartBlock(random), estimate = createEstimateAndCount(random)
  assert.ok(chart.missingCells.every(n => n >= 1 && n <= 100))
  assert.equal(chart.draggableBlock[1][0] - chart.draggableBlock[0][0], 10)
  assert.equal(estimate.groups.reduce((a, b) => a + b), estimate.count)
}
assert.equal(catalog.LESSON_CATALOG['toan-2-bai-1'].learningGoals.length, 10)
assert.ok(catalog.isLearningKeyForLesson('toan-1-bai-1', 'recognize-number-0'))
const loadGrade1 = createLoader({
  '../../general/adaptive': {},
  '../../general/tracking': {
    GAME_IDS: { RACING: 'racing' }, LESSON_IDS: { TOAN_1_BAI_1: 'toan-1-bai-1' },
    getRecognizeNumberKey: n => `recognize-number-${n}`,
  },
})
const { createRacingQuestions } = loadGrade1('src/components/games/racing/lessons/toan-1-bai-1.ts')
for (let i = 0; i < 20; i++) {
  const rounds = createRacingQuestions()
  assert.equal(rounds.length, 10)
  for (const q of rounds) {
    assert.ok(q.answer >= 0 && q.answer <= 5)
    assert.ok(catalog.isLearningKeyForLesson('toan-1-bai-1', q.learningKey))
    assert.equal((q.options ?? q.quantities).filter(value => value === q.answer).length, 1)
  }
}
const { getMathLessonItems } = load('src/components/games/navigation/catalog.ts')
assert.equal(getMathLessonItems('lop-2').length, 10)
assert.equal(getMathLessonItems('lop-1').length, 2)
;(async () => {
  for (const [key, game] of [['BUBBLE_CONFIG', 'bubble-shooter'], ['GOLD_CONFIG', 'gold-mining'], ['RACING_CONFIG', 'racing'], ['DRAG_CONFIG', 'drag-drop']]) {
    const c = config[key]
    assert.equal(c.totalRounds, 10)
    assert.equal((c.tracking ?? c).lessonId, 'toan-2-bai-1')
    const rounds = await (c.loadQuestions ?? c.loadLevels)()
    assert.equal(rounds.length, 10)
    assert.equal((c.tracking ?? c).gameId, game)
  }
  assert.deepEqual(progressReads, Array(4).fill('toan-2-bai-1'))
  console.log('Adapters, lesson-scoped adaptive loading, tracking keys, reading and navigation passed')
})().catch(error => { console.error(error); process.exitCode = 1 })

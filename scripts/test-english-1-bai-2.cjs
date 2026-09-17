const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const cache = new Map()
function load(file) {
  const filename = path.resolve(file)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', source)(name => {
    if (!name.startsWith('.') && !name.startsWith('@/')) return require(name)
    const base = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(filename), name)
    return load(fs.existsSync(base + '.ts') ? base + '.ts' : path.join(base, 'index.ts'))
  }, module, module.exports)
  return module.exports
}
const base = 'src/app/game/lop-1/tieng-anh/bai-2'
const { ENGLISH_1_LESSON_2_LEARNING_GOALS: goals } = load(base + '/lesson.ts')
const { createEnglishQuestions, TIENG_ANH_1_BAI_2_QUESTION_POOL: pool } = load(base + '/content.ts')
const configs = load('src/components/games/english/tieng-anh-1-bai-2.ts')
test('ten exact goals, varied rounds, valid assets and review stays within sentence goal', () => {
  assert.equal(goals.length, 10)
  assert.deepEqual(goals.map(g => g.key).sort(), ['recognize_cup','recognize_cake','recognize_cat','recognize_car','recognize_letter_c','recognize_c_sound','match_word_picture','listen_and_identify','understand_i_have_a','complete_i_have_a'].sort())
  const rounds = new Set()
  for (let i = 0; i < 100; i++) {
    const questions = createEnglishQuestions()
    assert.equal(questions.length, 10)
    assert.equal(new Set(questions.map(q => q.goalKey)).size, 10)
    assert.equal(new Set(questions.map(q => q.id)).size, 10)
    rounds.add(JSON.stringify(questions))
  }
  assert.ok(rounds.size > 90)
  for (const q of pool) {
    assert.ok(goals.some(g => g.key === q.goalKey))
    assert.ok(q.options.includes(q.answer))
    if (q.voice) assert.ok(fs.statSync('public' + q.voice).size > 1000)
    if (q.instructionVoice) assert.ok(fs.existsSync('public' + q.instructionVoice))
    if (q.id.includes('review')) assert.equal(q.goalKey, 'understand_i_have_a')
  }
})
test('all four adapters preserve answer, goal and randomize reloads', async () => {
  for (const [name, config] of Object.entries(configs)) {
    const loader = config.loadQuestions || config.loadLevels
    const variants = new Set()
    for (let i = 0; i < 20; i++) {
      const questions = await loader()
      assert.equal(questions.length, 10, name)
      const keys = []
      for (const q of questions) {
        const answer = q.answer ?? q.correctAnswer ?? Object.values(q.answers)[0]
        const choices = q.options ?? q.choices ?? q.answerDomain
        assert.ok(choices.includes(answer), name)
        assert.equal(new Set(choices).size, choices.length)
        keys.push(q.learningKey ?? Object.values(q.learningKeys)[0])
      }
      assert.equal(new Set(keys).size, 10)
      variants.add(JSON.stringify(questions))
    }
    assert.ok(variants.size > 15)
  }
})
test('chatbot publishes each route and atlas metadata matches PNG', () => {
  const { GAME_LESSON_ROUTES_TRAINING: training } = load('src/lib/chat/game-training/lesson-routes.ts')
  for (const slug of ['bubble-shooter','drag-drop','gold-mining','racing']) {
    assert.ok(training.includes('/game/lop-1/tieng-anh/bai-2/' + slug))
    assert.ok(fs.existsSync(base + '/' + slug + '/page.tsx'))
  }
  const { TIENG_ANH_1_BAI_2_IMAGES: images } = load(base + '/images.ts')
  for (const entry of Object.values(images)) {
    const png = fs.readFileSync('public' + entry.src)
    assert.equal(png.readUInt32BE(16), entry.sourceWidth)
    assert.equal(png.readUInt32BE(20), entry.sourceHeight)
    assert.ok(entry.frame.x + entry.frame.width <= entry.sourceWidth)
    assert.ok(entry.frame.y + entry.frame.height <= entry.sourceHeight)
  }
})

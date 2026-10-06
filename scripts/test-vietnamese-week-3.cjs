// Offline checks for the Vietnamese Grade 1 Week 3 generator and adapters.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const resolve = Module._resolveFilename
Module._resolveFilename = function (id, ...args) {
  return resolve.call(this, id.startsWith('@/') ? path.join(root, 'src', id.slice(2)) : id, ...args)
}
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename)

const weekPath = '../src/app/game/lop-1/tieng-viet/tuan-3'
const content = require(`${weekPath}/content.ts`)
const { TIENG_VIET_1_WEEK_3 } = require(`${weekPath}/lesson.ts`)
const voices = require('../src/components/games/vietnamese/voice-manifest.ts')
const adapters = require('../src/components/games/vietnamese/tieng-viet-1-tuan-3.ts')
const questionModel = require('../src/components/games/vietnamese/question-model.ts')
const sprites = require('../src/components/games/vietnamese/week3-sprites.ts')
const { isLearningKeyForLesson } = require('../src/components/games/general/tracking/lesson-catalog.ts')
const seeded = seed => () => {
  seed |= 0
  seed = seed + 0x6D2B79F5 | 0
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
  t ^= t + Math.imul(t ^ t >>> 7, 61 | t)
  return ((t ^ t >>> 14) >>> 0) / 4294967296
}
const games = ['bubble-shooter', 'gold-mining', 'racing', 'drag-drop']

function questionId(question) { return question.questionId || question.id }
function isPairCompletion(question) { return question.questionType === 'CHOOSE_PAIR' || question.answerDomain?.length === 2 || question.options?.length === 2 || question.choices?.length === 2 }
function expectedOptionCount(question, game) {
  if (question.questionType === 'CHOOSE_PAIR' || isPairCompletion(question)) return game === 'drag-drop' ? 6 : game === 'gold-mining' ? 4 : game === 'racing' ? 3 : 2
  return game === 'drag-drop' ? 6 : game === 'gold-mining' ? 4 : 3
}
function containsWholeAnswer(text, answer) {
  const normalizedText = text.normalize('NFC').toLocaleLowerCase('vi-VN')
  const normalizedAnswer = answer.normalize('NFC').toLocaleLowerCase('vi-VN')
  const escaped = normalizedAnswer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^\\p{L}\\p{M}])${escaped}($|[^\\p{L}\\p{M}])`, 'u').test(normalizedText)
}
function validateChoices(question, game) {
  const answer = question.answer ?? question.correctAnswer ?? Object.values(question.answers || {})[0]
  const options = question.options || question.choices || question.answerDomain
  const sourceLesson = question.sourceLesson ?? Object.values(question.sourceLessons || {})[0]
  const learningKey = question.learningKey ?? Object.values(question.learningKeys || {})[0]
  assert.equal(options.filter(value => value === answer).length, 1, `${game}: expected exactly one correct choice in ${questionId(question)}`)
  assert.equal(new Set(options).size, options.length, `${game}: duplicate choice in ${questionId(question)}`)
  assert.equal(options.length, expectedOptionCount(question, game), `${game}: incorrect choice count`)
  assert.ok(sourceLesson >= 11 && sourceLesson <= 15, `${game}: source lesson missing or out of range`)
  assert.ok(isLearningKeyForLesson(TIENG_VIET_1_WEEK_3.lessonId, learningKey))
}

async function main() {
  assert.equal(TIENG_VIET_1_WEEK_3.lessonId, 'tieng-viet-1-tuan-3')
  assert.deepEqual(TIENG_VIET_1_WEEK_3.sourceLessons, [11, 12, 13, 14, 15])
  assert.equal(content.WEEK_3_SYLLABLES.length, 24, 'The brief lists 24 syllables despite one heading saying 22')
  assert.equal(content.WEEK_3_WORDS.length, 18)
  assert.equal(content.WEEK_3_SENTENCES.length, 11)
  assert.equal(content.WEEK_3_KNOWLEDGE_POOL.filter(item => item.type === 'letterGroup').length, 2)

  const templates = content.getQuestionTemplateCounts()
  assert.equal(Object.keys(templates).length, 60)
  assert.ok(Object.values(templates).every(count => count > 0), 'Every declared learning key needs at least one template')
  assert.equal(templates.DISTINGUISH_U_UHORN >= 2, true, 'u/ư distinction needs both contrasting letters')
  assert.equal(content.areWeek3VoicesEnabled(), true)

  const targetChecks = [
    ...content.WEEK_3_LETTER_GROUPS.map(item => ['letters', item.lower]),
    ...content.WEEK_3_SYLLABLES.map(item => ['syllables', item.text]),
    ...content.WEEK_3_WORDS.map(item => ['words', item.text]),
    ...content.WEEK_3_SENTENCES.map(item => ['sentences', item.text]),
  ]
  for (const [type, text] of targetChecks) assert.ok(voices.resolveVietnameseTargetVoice(type, text), `Missing explicit voice mapping for ${type}/${text}`)
  assert.equal(voices.resolveVietnameseTargetVoice('words', 'dù'), undefined, 'Do not duplicate dù as a word; its target voice is the syllable recording')
  assert.equal(voices.TIENG_VIET_1_WEEK_3_REQUIRED_VOICE_PATHS.length, 68)
  assert.equal(new Set(voices.TIENG_VIET_1_WEEK_3_REQUIRED_VOICE_PATHS).size, 68)
  const missingVoices = voices.TIENG_VIET_1_WEEK_3_REQUIRED_VOICE_PATHS.filter(src => !fs.existsSync(path.join(root, 'public', src.replace(/^\//, ''))))
  assert.equal(missingVoices.length, 0, `All Week 3 target recordings must exist: ${missingVoices.join(', ')}`)

  const manifest = sprites.WEEK_3_SPRITE_MANIFEST
  assert.deepEqual(manifest.grid, { columns: 4, rows: 4, cellWidth: 384, cellHeight: 256 })
  assert.equal(manifest.items.length, 16)
  const imagePath = path.join(root, 'public', manifest.image.replace(/^\//, ''))
  assert.ok(fs.existsSync(imagePath), `Missing Week 3 sprite sheet: ${manifest.image}`)
  const imageBytes = fs.readFileSync(imagePath)
  assert.equal(imageBytes.readUInt32BE(16), 1536)
  assert.equal(imageBytes.readUInt32BE(20), 1024)
  assert.equal(content.WEEK_3_IMAGE_KNOWLEDGE.length, 7)
  for (const item of content.WEEK_3_IMAGE_KNOWLEDGE) {
    const sprite = sprites.getWeek3SpriteById(item.imageId)
    assert.ok(sprite, `Missing image sprite ${item.imageId}`)
    const target = [...content.WEEK_3_SYLLABLES, ...content.WEEK_3_WORDS].find(value => value.text === item.targetText)
    assert.ok(target, `Image target must already be taught: ${item.targetText}`)
  }
  manifest.items.forEach((item, index) => {
    assert.equal(item.row, Math.floor(index / 4))
    assert.equal(item.col, index % 4)
    assert.deepEqual(sprites.getWeek3SpriteRect(item.id), { x: item.col * 384, y: item.row * 256, width: 384, height: 256 })
  })

  for (const game of games) {
    const pool = content.createQuestionPool(game)
    assert.ok(pool.length > 40, `${game}: expected a varied content pool`)
    assert.equal(new Set(pool.map(question => question.id)).size, pool.length)
    assert.ok(pool.every(question => question.voiceSequence?.length || question.voiceFallback?.instruction), `${game}: every question should have mapped audio or a dynamic speech fallback`)
    assert.ok(pool.some(question => question.inputMode === 'audio'), `${game}: recorded listening questions should be available`)
    const imageQuestions = pool.filter(question => question.imageId)
    assert.equal(imageQuestions.length, content.WEEK_3_IMAGE_KNOWLEDGE.length, `${game}: all additive image prompts should be available`)
    for (const question of imageQuestions) {
      assert.deepEqual(questionModel.validateVietnameseQuestion(question), [], `${game}/${question.imageId}: image contract`)
      assert.ok(fs.existsSync(path.join(root, 'public', sprites.WEEK_3_IMAGE_QUESTION_IMAGES[question.imageId].src.replace(/^\//, ''))))
    }
    for (const question of pool) {
      for (const segment of question.voiceSequence ?? []) {
        assert.ok(fs.existsSync(path.join(root, 'public', segment.src.replace(/^\//, ''))), `${game}: missing question voice ${segment.src}`)
      }
    }
    assert.ok(pool.every(question => isLearningKeyForLesson(TIENG_VIET_1_WEEK_3.lessonId, question.goalKey)))
    if (game === 'racing') {
      assert.ok(pool.every(question => question.questionType !== 'READ_AND_CHOOSE'))
      assert.ok(pool.every(question => question.options.length === expectedOptionCount(question, game)))
    }
    if (game === 'gold-mining') assert.ok(pool.every(question => question.questionType !== 'READ_AND_CHOOSE'), 'Gold mining should not use sentence-length prompts')
    if (game === 'bubble-shooter') assert.ok(pool.filter(question => question.questionType === 'READ_AND_CHOOSE').every(question => question.data.targetText.replace(/[.!?]/g, '').trim().split(/\s+/).length <= 4))
    for (const question of pool) {
      assert.equal(question.options.filter(value => value === question.answer).length, 1)
      assert.equal(new Set(question.options).size, question.options.length)
      assert.equal(question.options.length, expectedOptionCount(question, game))
      assert.ok(question.sourceLesson >= 11 && question.sourceLesson <= 15)
      if (question.questionType === 'CHOOSE_PAIR') {
        const declared = [...question.data.choicePair, ...(question.data.additionalDistractors ?? [])]
        assert.equal(question.options.length, expectedOptionCount(question, game))
        assert.deepEqual(new Set(question.options), new Set(declared))
        assert.ok(question.displayText.includes('_'))
        assert.ok(question.data.targetText.startsWith(question.data.onset))
        assert.ok(question.data.spokenContext, `${game}: onset question needs a complete spoken context`)
        const sequence = question.voiceSequence ?? []
        assert.equal(sequence.at(-1)?.text.normalize('NFC').toLocaleLowerCase('vi-VN'),
          question.data.spokenContext.normalize('NFC').toLocaleLowerCase('vi-VN'), `${game}: voice should finish by reading the completed context`)
        const instruction = [question.prompt, question.displayText, question.spokenInstruction, question.voiceFallback?.instruction,
          question.voiceFallback?.target, ...sequence.slice(0, -1).map(segment => segment.text)].filter(Boolean).join(' ').toLocaleLowerCase('vi-VN')
        assert.equal(containsWholeAnswer(instruction, question.data.targetText), false, `${game}: onset instruction is visible or spoken early`)
      }
      if (question.questionType === 'FIND_WORD_START') {
        const spoken = [question.prompt, question.displayText, question.voice, question.spokenInstruction,
          ...(question.voiceSequence ?? []).map(segment => segment.text)].filter(Boolean).join(' ').toLocaleLowerCase('vi-VN')
        assert.equal(containsWholeAnswer(spoken, question.answer), false, `${game}: find-word answer is visible or spoken early`)
        assert.ok(question.answer.startsWith(question.data.onset))
      }
    }
    assert.ok(pool.filter(question => question.goalKey === 'FIND_CH_KH_IN_TEXT').every(question =>
      ['ch', 'kh'].some(onset => question.answer.startsWith(onset) && onset === question.data.onset)))
    assert.ok(pool.filter(question => question.goalKey === 'DISTINGUISH_I_K').every(question => question.stage === 'distinguish'))

    let previous = []
    const sampledImages = new Set()
    for (let seed = 1; seed <= 200; seed++) {
      const questions = content.generateQuestionSet(game, { random: seeded(seed), previousIds: previous.map(question => question.id) })
      assert.equal(questions.length, 25)
      assert.equal(new Set(questions.map(question => question.id)).size, 25)
      assert.equal(new Set(questions.map(question => question.variant)).size, 25)
      assert.equal(questions.filter(question => question.stage === 'recognize').length, 5)
      assert.equal(questions.filter(question => question.stage === 'find').length, 5)
      assert.equal(questions.filter(question => question.stage === 'distinguish').length, 7)
      assert.equal(questions.filter(question => question.stage === 'read').length, 5)
      assert.equal(questions.filter(question => question.stage === 'mixed').length, 3)
      assert.ok(questions.filter(question => question.goalKey === 'DISTINGUISH_U_UHORN').length >= 2)
      assert.ok(questions.every(question => question.options.filter(value => value === question.answer).length === 1))
      assert.ok(questions.every(question => question.options.length === expectedOptionCount(question, game)))
      assert.ok(questions.every(question => isLearningKeyForLesson(TIENG_VIET_1_WEEK_3.lessonId, question.goalKey)))
      assert.ok(questions.every(question => question.sourceLesson >= 11 && question.sourceLesson <= 15))
      questions.filter(question => question.imageId).forEach(question => sampledImages.add(question.imageId))
      if (previous.length) assert.ok(questions.every(question => !previous.some(old => old.id === question.id)), `${game}: replay should avoid exact repeats where the pool permits`)
      previous = questions
    }
    assert.deepEqual([...sampledImages].sort(), content.WEEK_3_IMAGE_KNOWLEDGE.map(item => item.imageId).sort(), `${game}: randomized sessions should include every image template`)
    const sourceCounts = [11, 12, 13, 14, 15].map(source => `${source}:${pool.filter(question => question.sourceLesson === source).length}`).join(', ')
    console.log(`PASS ${game}: pool=${pool.length} (${sourceCounts}), 200 randomized 25-question sessions, staged mix, unique answers and choices`)
  }

  const configs = [
    adapters.TIENG_VIET_1_WEEK_3_BUBBLE_CONFIG, adapters.TIENG_VIET_1_WEEK_3_GOLD_CONFIG,
    adapters.TIENG_VIET_1_WEEK_3_RACING_CONFIG, adapters.TIENG_VIET_1_WEEK_3_DRAG_CONFIG,
  ]
  for (let index = 0; index < configs.length; index++) {
    const config = configs[index]
    const game = games[index]
    const load = config.loadQuestions || config.loadLevels
    const questions = await load()
    assert.equal(questions.length, 25)
    questions.forEach(question => {
      validateChoices(question, game)
      assert.ok(question.voiceSequence?.length || question.voiceFallback?.instruction, `${game}: adapter must retain audio or dynamic fallback`)
      for (const segment of question.voiceSequence ?? []) {
        assert.ok(fs.existsSync(path.join(root, 'public', segment.src.replace(/^\//, ''))), `${game}: missing adapter voice ${segment.src}`)
      }
    })
    for (const item of content.WEEK_3_IMAGE_KNOWLEDGE) assert.ok(config.images[item.imageId], `${game}: missing configured image ${item.imageId}`)
    for (const item of content.WEEK_3_IMAGE_KNOWLEDGE) {
      const question = content.createQuestionPool(game).find(value => value.imageId === item.imageId)
      if (game === 'bubble-shooter') assert.equal(adapters.toVietnameseWeek3Bubble(question).text, item.imageId)
      if (game === 'gold-mining') assert.equal(adapters.toVietnameseWeek3Gold(question).prompt, item.imageId)
      if (game === 'racing') assert.equal(adapters.toVietnameseWeek3Racing(question).prompt, item.imageId)
    }
  }

  for (const item of content.WEEK_3_IMAGE_KNOWLEDGE) {
    const question = content.createQuestionPool('drag-drop').find(value => value.imageId === item.imageId)
    const level = adapters.toVietnameseWeek3Drag(question, 0)
    const sprite = sprites.getWeek3SpriteById(item.imageId)
    assert.equal(level.groups[0].imageSrc, manifest.image)
    assert.deepEqual(level.groups[0].imageCrop, { row: sprite.row, column: sprite.col, rows: 4, columns: 4 })
  }
  assert.equal(adapters.TIENG_VIET_1_WEEK_3_BUBBLE_CONFIG.tracking.lessonId, TIENG_VIET_1_WEEK_3.lessonId)
  assert.equal(adapters.TIENG_VIET_1_WEEK_3_RACING_CONFIG.wolfEnabled, true)
  console.log('PASS all four game adapters: 25 rounds, registered learning keys and source lessons 11–15')

  console.log(`VOICE_FILES_REQUIRED=${voices.TIENG_VIET_1_WEEK_3_REQUIRED_VOICE_PATHS.length}`)
  console.log(`VOICE_FILES_MISSING=${missingVoices.length}`)
  missingVoices.forEach(src => console.log(`MISSING ${src}`))
}

main().catch(error => { console.error(error); process.exitCode = 1 })

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

const model = require('../src/components/games/vietnamese/question-model.ts')
const sprites = require('../src/components/games/vietnamese/week4-sprites.ts')
const content = require('../src/app/game/lop-1/tieng-viet/tuan-4/content.ts')
const adapter = require('../src/components/games/vietnamese/tieng-viet-1-tuan-4.ts')
const manifest = sprites.WEEK_4_SPRITE_MANIFEST
const games = ['bubble-shooter', 'gold-mining', 'racing', 'drag-drop']
const expectedIds = [
  'me', 'ca_me', 'no', 'ca_no', 'ga', 'go', 'gio', 'gia_do',
  'ghe', 'ghe_cua', 'nha', 'nho', 'ngo', 'ngu', 'nghe', 'cu_nghe',
]

function imageQuestionTypes(pool) {
  return pool.filter(question => question.questionType.startsWith('IMAGE_'))
}

function isWordContrastQuestion(question, pair) {
  const normalize = value => value.normalize('NFC').toLocaleLowerCase('vi-VN')
  if (question.connectPairs?.length) {
    return pair.every(onset => question.connectPairs.some(link => normalize(link.right).startsWith(onset)))
  }
  const choicePair = (question.data.choicePair || []).map(normalize)
  const hasTargetContext = Boolean(question.data.targetText && question.data.spokenContext
    && normalize(question.data.spokenContext).includes(normalize(question.data.targetText)))
  if (['CHOOSE_PAIR', 'IMAGE_MISSING_ONSET'].includes(question.questionType)
    && pair.every(onset => choicePair.includes(onset)) && hasTargetContext) return true

  return pair[0] === 'ng' && pair[1] === 'ngh'
    && question.questionType === 'LISTEN_AND_CHOOSE_LETTER'
    && question.goalKey === 'LISTEN_NG_NGH'
    && question.answer === 'ngh'
    && ['e', 'ê', 'i'].includes(question.data.vowel)
    && question.data.pair === 'ng/ngh'
    && Boolean(question.data.listeningExample)
    && question.voiceSequence?.at(-1)?.text === question.data.listeningExample
}

function checkQuestion(question, game) {
  assert.deepEqual(model.validateVietnameseQuestion(question), [], `${game}/${question.id}`)
  assert.equal(new Set(question.options.map(option => option.normalize('NFC').toLocaleLowerCase('vi-VN'))).size, question.options.length,
    `${game}/${question.id}: duplicate choices`)
  const normalizedOptions = question.options.map(option => option.normalize('NFC').toLocaleLowerCase('vi-VN'))
  for (const pair of [['g', 'gh'], ['ng', 'ngh']]) {
    if (pair.every(onset => normalizedOptions.includes(onset))) {
      assert.ok(isWordContrastQuestion(question, pair),
        `${game}/${question.id}: ${pair.join('/')} choices need an explicit word-context contrast`)
    }
  }
  if (question.connectPairs?.length) {
    for (const pair of question.connectPairs) {
      if (pair.left.kind !== 'image' || !pair.left.imageId) continue
      const sprite = sprites.getSpriteById(pair.left.imageId)
      assert.ok(sprite, `${game}/${question.id}: missing sprite ${pair.left.imageId}`)
      assert.deepEqual(pair.left.crop, { row: sprite.row, column: sprite.col, rows: 4, columns: 4 })
    }
    return
  }
  assert.equal(question.options.filter(option => option === question.answer).length, 1, `${game}/${question.id}: must have one correct choice`)
  if (question.questionType.startsWith('IMAGE_')) {
    assert.ok(sprites.getSpriteById(question.imageId), `${game}/${question.id}: imageId does not resolve`)
    assert.equal(question.data.onset, question.answer, `${game}/${question.id}: image onset metadata mismatch`)
  }
  if (question.questionType === 'IMAGE_MISSING_ONSET') {
      assert.equal(question.displayText.match(/_+/)?.[0], '_', `${game}/${question.id}: onset clusters should use one blank token`)
      assert.equal(question.voiceSequence.at(-1)?.text, question.data.spokenContext, `${game}/${question.id}: voice must speak the completed target context`)
    assert.equal(question.options.length, 6, `${game}/${question.id}: drag-drop needs six choices`)
  }
}

async function main() {
  assert.equal(manifest.width, 1536)
  assert.equal(manifest.height, 1024)
  assert.deepEqual(manifest.grid, { columns: 4, rows: 4, cellWidth: 384, cellHeight: 256 })
  assert.deepEqual(manifest.items.map(item => item.id), expectedIds)
  assert.equal(new Set(manifest.items.map(item => item.id)).size, 16)

  const imagePath = path.join(root, 'public', manifest.image.replace(/^\//, ''))
  assert.ok(fs.existsSync(imagePath), `Missing sprite sheet: ${manifest.image}`)
  const png = fs.readFileSync(imagePath)
  assert.equal(png.readUInt32BE(16), manifest.width, 'PNG width must match manifest')
  assert.equal(png.readUInt32BE(20), manifest.height, 'PNG height must match manifest')

  for (const [index, item] of manifest.items.entries()) {
    assert.equal(item.row, Math.floor(index / 4))
    assert.equal(item.col, index % 4)
    assert.deepEqual(sprites.getSpriteRect(item.id), { x: item.col * 384, y: item.row * 256, width: 384, height: 256 })
    assert.deepEqual(sprites.getPhaserSpriteFrame(item.id), { name: item.id, x: item.x, y: item.y, width: 384, height: 256 })
    const style = sprites.getImageStyle(item.id)
    assert.equal(style.backgroundImage, `url("${manifest.image}")`)
    assert.equal(style.backgroundSize, '400% 400%')
  }

  assert.equal(content.WEEK_4_IMAGE_KNOWLEDGE.length, 16)
  assert.ok(content.WEEK_4_IMAGE_KNOWLEDGE.every(item => item.id === item.imageId && item.tags.includes('image')))
  assert.ok(content.WEEK_4_IMAGE_KNOWLEDGE.filter(item => item.onset === 'ng' || item.onset === 'ngh').every(item => item.onsetFamily === 'ng'))
  assert.deepEqual(model.validateVietnameseQuestion({
    id: 'bad-image-id', goalKey: 'RECOGNIZE_G', questionType: 'IMAGE_CHOOSE_ONSET', prompt: 'Chọn âm đầu.',
    answer: 'g', options: ['g', 'gi'], imageId: 'missing', data: { onset: 'g', targetText: 'gà' },
  }).some(error => error.includes('unknown sprite imageId')), true)

  const pools = Object.fromEntries(games.map(game => [game, content.createQuestionPool(game)]))
  for (const game of games) {
    const pool = pools[game]
    for (const question of pool) checkQuestion(question, game)
    const imagePool = imageQuestionTypes(pool)
    assert.ok(imagePool.length > 0, `${game}: image questions must be available`)
    assert.ok(imagePool.some(question => question.questionType === 'IMAGE_CHOOSE_ONSET'), `${game}: onset selection missing`)
    assert.ok(pool.some(question => ['CHOOSE_PAIR', 'LISTEN_AND_CHOOSE_LETTER', 'READ_AND_CHOOSE'].includes(question.questionType)),
      `${game}: existing text question templates must remain available`)
    if (game === 'drag-drop') {
      for (const type of ['IMAGE_CHOOSE_ONSET', 'IMAGE_MISSING_ONSET', 'IMAGE_ONSET_MATCH', 'IMAGE_WORD_MATCH']) {
        assert.ok(pool.some(question => question.questionType === type), `drag-drop: ${type} missing`)
      }
      const onsetMatch = pool.find(question => question.questionType === 'IMAGE_ONSET_MATCH')
      const wordMatch = pool.find(question => question.questionType === 'IMAGE_WORD_MATCH')
      assert.equal(onsetMatch.connectPairs.length, 6)
      assert.equal(wordMatch.connectPairs.length, 6)
      for (const pair of onsetMatch.connectPairs) {
        const knowledge = content.WEEK_4_IMAGE_KNOWLEDGE.find(item => item.imageId === pair.left.imageId)
        assert.equal(pair.right, knowledge.onset, `${pair.left.imageId}: onset mapping`)
      }
      for (const pair of wordMatch.connectPairs) {
        const knowledge = content.WEEK_4_IMAGE_KNOWLEDGE.find(item => item.imageId === pair.left.imageId)
        assert.equal(pair.right, knowledge.text, `${pair.left.imageId}: word mapping`)
      }
      const fill = pool.find(question => question.questionType === 'IMAGE_MISSING_ONSET')
      const level = adapter.toVietnameseWeek4Drag(fill, 0)
      assert.equal(level.groups[0].imageId, fill.imageId)
      assert.equal(level.groups[0].promptText, fill.displayText)
      assert.equal(level.groups[0].imageCrop.row, sprites.getSpriteById(fill.imageId).row)
      const matchingLevel = adapter.toVietnameseWeek4Drag(onsetMatch, 1)
      assert.equal(matchingLevel.groups.length, 6)
      assert.ok(matchingLevel.groups.every(group => group.imageCrop && group.imageSrc === manifest.image))
    }
    if (['bubble-shooter', 'gold-mining', 'racing'].includes(game)) {
      const imageQuestion = pool.find(question => question.questionType === 'IMAGE_CHOOSE_ONSET')
      const mapped = game === 'bubble-shooter' ? adapter.toVietnameseWeek4Bubble(imageQuestion)
        : game === 'gold-mining' ? adapter.toVietnameseWeek4Gold(imageQuestion) : adapter.toVietnameseWeek4Racing(imageQuestion)
      assert.equal(game === 'bubble-shooter' ? mapped.text : mapped.prompt, imageQuestion.imageId)
      assert.ok((game === 'bubble-shooter' ? adapter.TIENG_VIET_1_WEEK_4_BUBBLE_CONFIG
        : game === 'gold-mining' ? adapter.TIENG_VIET_1_WEEK_4_GOLD_CONFIG : adapter.TIENG_VIET_1_WEEK_4_RACING_CONFIG).images[imageQuestion.imageId])
    }
    console.log(`PASS Week 4/${game}: ${imagePool.length} additive image templates validated`)
  }

  let seed = 4172026
  const random = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647 }
  const sourceCounts = Object.fromEntries([16, 17, 18, 19].map(lesson => [lesson, 0]))
  for (let round = 0; round < 100; round++) {
    for (const game of games) {
      const questions = content.generateQuestionSet(game, { random })
      assert.equal(questions.length, 25)
      assert.equal(new Set(questions.map(question => question.id)).size, 25)
      for (const question of questions) {
        checkQuestion(question, game)
        if (question.sourceLesson in sourceCounts) sourceCounts[question.sourceLesson]++
      }
    }
  }
  for (const [lesson, count] of Object.entries(sourceCounts)) assert.ok(count >= 500, `Lesson ${lesson}: expected 500 random samples, got ${count}`)
  console.log(`PASS 10,000 generated questions across lessons 16–19: ${JSON.stringify(sourceCounts)}`)
}

main().catch(error => { console.error(error); process.exitCode = 1 })

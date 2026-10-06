// Offline contract for the Vietnamese Grade 1 Week 2 image questions.
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

const content = require('../src/app/game/lop-1/tieng-viet/tuan-2/content.ts')
const model = require('../src/components/games/vietnamese/question-model.ts')
const sprites = require('../src/components/games/vietnamese/week2-sprites.ts')
const adapter = require('../src/components/games/vietnamese/tieng-viet-1-tuan-2.ts')
const games = ['bubble-shooter', 'gold-mining', 'racing', 'drag-drop']
const expectedIds = ['de', 'co', 'co_cay', 'cho', 'o_to', 'o', 'nha', 'ca', 'du_du', 'dua', 'dua_coconut', 'den', 'mo', 'no', 'vo', 'ga_trong']
const expectedQuestionImages = ['de', 'co', 'du_du', 'no']

function expectedChoices(question, game) {
  if (game === 'drag-drop') return 6
  if (game === 'gold-mining') return 4
  if (game === 'racing') return 3
  return question.options.length === 3 || question.options.length === 4
}

async function main() {
  const manifest = sprites.WEEK_2_SPRITE_MANIFEST
  assert.equal(manifest.id, 'tieng-viet-lop-1-tuan-2')
  assert.equal(manifest.image, '/games/lessons/lop-1/tieng-viet/tuan-2/images/week2-sheet.png')
  assert.deepEqual(manifest.grid, { columns: 4, rows: 4, cellWidth: 384, cellHeight: 256 })
  assert.deepEqual(manifest.items.map(item => item.id), expectedIds)
  assert.equal(new Set(manifest.items.map(item => item.id)).size, 16)

  const imagePath = path.join(root, 'public', manifest.image.replace(/^\//, ''))
  assert.ok(fs.existsSync(imagePath), `Missing sprite sheet: ${manifest.image}`)
  const png = fs.readFileSync(imagePath)
  assert.equal(png.readUInt32BE(16), 1536)
  assert.equal(png.readUInt32BE(20), 1024)
  manifest.items.forEach((item, index) => {
    assert.equal(item.row, Math.floor(index / 4))
    assert.equal(item.col, index % 4)
    assert.deepEqual(sprites.getWeek2SpriteRect(item.id), { x: item.col * 384, y: item.row * 256, width: 384, height: 256 })
  })

  assert.deepEqual(content.WEEK_2_IMAGE_KNOWLEDGE.map(item => item.imageId), expectedQuestionImages)
  for (const item of content.WEEK_2_IMAGE_KNOWLEDGE) {
    assert.ok(sprites.getWeek2SpriteById(item.imageId), `${item.imageId}: sprite must resolve`)
    assert.ok(item.learningKey in require('../src/app/game/lop-1/tieng-viet/tuan-2/lesson.ts').TIENG_VIET_1_WEEK_2_LEARNING_KEYS)
  }

  const configs = [
    adapter.TIENG_VIET_1_WEEK_2_BUBBLE_CONFIG, adapter.TIENG_VIET_1_WEEK_2_GOLD_CONFIG,
    adapter.TIENG_VIET_1_WEEK_2_RACING_CONFIG, adapter.TIENG_VIET_1_WEEK_2_DRAG_CONFIG,
  ]
  for (let gameIndex = 0; gameIndex < games.length; gameIndex++) {
    const game = games[gameIndex]
    const pool = content.createQuestionPool(game)
    const imagePool = pool.filter(question => question.imageId)
    assert.ok(imagePool.length > 0, `${game}: image questions should be available`)
    assert.deepEqual([...new Set(imagePool.map(question => question.imageId))].sort(), [...expectedQuestionImages].sort())
    assert.equal(new Set(pool.map(question => question.id)).size, pool.length)

    for (const question of imagePool) {
      assert.deepEqual(model.validateVietnameseQuestion(question), [], `${game}/${question.imageId}: image question contract`)
      assert.equal(question.data.imageId, question.imageId)
      assert.equal(question.data.targetLetter, question.answer)
      assert.ok(expectedChoices(question, game), `${game}/${question.imageId}: wrong choice count`)
      assert.ok(question.voiceSequence?.length, `${game}/${question.imageId}: use the exact recorded target voice`)
      assert.equal(question.voiceSequence.at(-1).text, question.data.targetText)
      for (const segment of question.voiceSequence) {
        assert.ok(fs.existsSync(path.join(root, 'public', segment.src.replace(/^\//, ''))), `${game}: missing voice ${segment.src}`)
      }
    }

    for (const item of content.WEEK_2_IMAGE_KNOWLEDGE) {
      assert.ok(configs[gameIndex].images[sprites.getWeek2ImageLookupKey(item.imageId)])
      assert.equal(configs[gameIndex].images[item.imageId], undefined, `${game}/${item.imageId}: keep sprite keys distinct from answer text`)
    }
    const imageQuestion = imagePool.find(question => question.imageId === 'de')
    if (game === 'bubble-shooter') assert.equal(adapter.toVietnameseWeek2Bubble(imageQuestion).text, sprites.getWeek2ImageLookupKey(imageQuestion.imageId))
    if (game === 'gold-mining') assert.equal(adapter.toVietnameseWeek2Gold(imageQuestion).prompt, sprites.getWeek2ImageLookupKey(imageQuestion.imageId))
    if (game === 'racing') assert.equal(adapter.toVietnameseWeek2Racing(imageQuestion).prompt, sprites.getWeek2ImageLookupKey(imageQuestion.imageId))
    if (game === 'drag-drop') {
      const level = adapter.toVietnameseWeek2Drag(imageQuestion, 0)
      const sprite = sprites.getWeek2SpriteById(imageQuestion.imageId)
      assert.equal(level.groups[0].imageSrc, manifest.image)
      assert.deepEqual(level.groups[0].imageCrop, { row: sprite.row, column: sprite.col, rows: 4, columns: 4 })
    }

    const sampledImages = new Set()
    for (let seed = 1; seed <= 100; seed++) {
      const questions = content.generateQuestionSet(game, { random: seeded(seed) })
      assert.equal(questions.length, 25)
      assert.equal(new Set(questions.map(question => question.goalKey)).size, 25)
      for (const question of questions) {
        assert.ok(question.sourceLesson >= 6 && question.sourceLesson <= 9)
        if (question.imageId) sampledImages.add(question.imageId)
      }
    }
    assert.deepEqual([...sampledImages].sort(), [...expectedQuestionImages].sort(), `${game}: image templates must rotate into new sets`)
    console.log(`PASS Week 2/${game}: ${imagePool.length} image variants; 100 sampled 25-question sets; mapped image and voice`)
  }
}

function seeded(seed) {
  return () => {
    seed |= 0
    seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })

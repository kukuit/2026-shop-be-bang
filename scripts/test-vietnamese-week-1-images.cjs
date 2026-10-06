// Offline contract for the Vietnamese Grade 1 Week 1 image questions.
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

const content = require('../src/app/game/lop-1/tieng-viet/tuan-1/content.ts')
const model = require('../src/components/games/vietnamese/question-model.ts')
const sprites = require('../src/components/games/vietnamese/week1-sprites.ts')
const adapter = require('../src/components/games/vietnamese/tieng-viet-1-tuan-1.ts')
const games = ['bubble-shooter', 'gold-mining', 'racing', 'drag-drop']
const expectedIds = ['ca', 'ca_tim', 'tho', 'vai', 'ba', 'ban', 'ghe', 'bo', 'cua', 'cau', 'co', 'khi', 've', 'le', 'me', 'khe']
const expectedQuestions = [
  ['ca', 'cá', 'IMAGE_CHOOSE_ONSET', 'c'],
  ['ca_tim', 'cà', 'IMAGE_CHOOSE_VOWEL', 'a'],
  ['ba', 'ba', 'IMAGE_CHOOSE_ONSET', 'b'],
  ['bo', 'bò', 'IMAGE_CHOOSE_ONSET', 'b'],
  ['co', 'cò', 'IMAGE_CHOOSE_ONSET', 'c'],
  ['ghe', 'ghế', 'IMAGE_CHOOSE_VOWEL', 'ê'],
  ['me', 'me', 'IMAGE_CHOOSE_VOWEL', 'e'],
  ['khe', 'khế', 'IMAGE_CHOOSE_VOWEL', 'ê'],
]

function expectedChoiceCount(question, game) {
  if (game === 'drag-drop') return question.options.length === 6
  if (game === 'gold-mining') return question.options.length === 4
  if (game === 'racing') return question.options.length === 3
  return question.options.length === 3 || question.options.length === 4
}

function main() {
  const manifest = sprites.WEEK_1_SPRITE_MANIFEST
  assert.equal(manifest.id, 'tieng-viet-lop-1-tuan-1')
  assert.equal(manifest.image, '/games/lessons/lop-1/tieng-viet/tuan-1/week1-sheet.png')
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
    assert.deepEqual(sprites.getWeek1SpriteRect(item.id), { x: item.col * 384, y: item.row * 256, width: 384, height: 256 })
  })

  assert.deepEqual(content.WEEK_1_IMAGE_KNOWLEDGE.map(item => [
    item.imageId, item.targetText, item.feature.type === 'onset' ? 'IMAGE_CHOOSE_ONSET' : 'IMAGE_CHOOSE_VOWEL', item.feature.value,
  ]), expectedQuestions)
  const configs = [
    adapter.TIENG_VIET_1_WEEK_1_BUBBLE_CONFIG, adapter.TIENG_VIET_1_WEEK_1_GOLD_CONFIG,
    adapter.TIENG_VIET_1_WEEK_1_RACING_CONFIG, adapter.TIENG_VIET_1_WEEK_1_DRAG_CONFIG,
  ]

  for (let gameIndex = 0; gameIndex < games.length; gameIndex++) {
    const game = games[gameIndex]
    const pool = content.createQuestionPool(game)
    const imagePool = pool.filter(question => question.imageId)
    assert.ok(imagePool.length >= expectedQuestions.length, `${game}: image variants should be available`)
    assert.deepEqual([...new Set(imagePool.map(question => question.imageId))].sort(), expectedQuestions.map(([id]) => id).sort())
    assert.equal(new Set(pool.map(question => question.id)).size, pool.length)

    for (const question of imagePool) {
      assert.deepEqual(model.validateVietnameseQuestion(question), [], `${game}/${question.imageId}: image question contract`)
      assert.equal(question.data.imageId, question.imageId)
      assert.equal(question.data.targetLetter, question.answer)
      assert.ok(expectedChoiceCount(question, game), `${game}/${question.imageId}: wrong choice count`)
      assert.ok(question.voiceSequence?.length, `${game}/${question.imageId}: exact target voice sequence is required`)
      assert.equal(question.voiceSequence.at(-1).text, question.data.targetText)
      for (const segment of question.voiceSequence) {
        assert.ok(fs.existsSync(path.join(root, 'public', segment.src.replace(/^\//, ''))), `${game}: missing voice ${segment.src}`)
      }
    }

    for (const [id] of expectedQuestions) {
      assert.ok(configs[gameIndex].images[sprites.getWeek1ImageLookupKey(id)])
      assert.equal(configs[gameIndex].images[id], undefined, `${game}/${id}: keep sprite keys distinct from answer text`)
    }
    for (const [id] of expectedQuestions) {
      const question = imagePool.find(item => item.imageId === id)
      if (game === 'bubble-shooter') {
        const adapted = adapter.toVietnameseBubble(question)
        assert.equal(adapted.text, sprites.getWeek1ImageLookupKey(id))
        assert.equal(adapted.presentation, undefined)
      }
      if (game === 'gold-mining') assert.equal(adapter.toVietnameseGold(question).prompt, sprites.getWeek1ImageLookupKey(id))
      if (game === 'racing') assert.equal(adapter.toVietnameseRacing(question).prompt, sprites.getWeek1ImageLookupKey(id))
      if (game === 'drag-drop') {
        const level = adapter.toVietnameseDrag(question, 0)
        const sprite = sprites.getWeek1SpriteById(id)
        assert.equal(level.groups[0].imageSrc, manifest.image)
        assert.deepEqual(level.groups[0].imageCrop, { row: sprite.row, column: sprite.col, rows: 4, columns: 4 })
      }
    }
    console.log(`PASS Week 1/${game}: ${imagePool.length} image variants; image mapping, exact voices, and adapters`)
  }
}

try { main() } catch (error) { console.error(error); process.exitCode = 1 }

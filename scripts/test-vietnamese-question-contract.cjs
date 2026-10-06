// Contract checks for the shared Vietnamese Grade 1 question model and Week 1–4 data.
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
const week1 = require('../src/app/game/lop-1/tieng-viet/tuan-1/content.ts')
const week2 = require('../src/app/game/lop-1/tieng-viet/tuan-2/content.ts')
const week3 = require('../src/app/game/lop-1/tieng-viet/tuan-3/content.ts')
const week4 = require('../src/app/game/lop-1/tieng-viet/tuan-4/content.ts')
const week4Adapter = require('../src/components/games/vietnamese/tieng-viet-1-tuan-4.ts')
const games = ['bubble-shooter', 'gold-mining', 'racing', 'drag-drop']
const weekModules = [week1, week2, week3, week4]
const voiceFiles = new Set()

function answerShown(text, answer) {
  const normalizedText = text.normalize('NFC').toLocaleLowerCase('vi-VN')
  const normalizedAnswer = answer.normalize('NFC').toLocaleLowerCase('vi-VN')
  const escaped = normalizedAnswer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^\\p{L}\\p{M}])${escaped}($|[^\\p{L}\\p{M}])`, 'u').test(normalizedText)
}

function checkQuestion(question, game) {
  assert.ok(question.questionModel, `${game}: question must carry its canonical model`)
  assert.deepEqual(model.validateVietnameseQuestion(question), [], `${game}/${question.id}`)
  const normalizedChoices = question.options.map(value => value.normalize('NFC').toLocaleLowerCase('vi-VN'))
  assert.equal(new Set(normalizedChoices).size, normalizedChoices.length, `${game}/${question.id}: repeated choices`)
  assert.equal(normalizedChoices.filter(value => value === question.answer.normalize('NFC').toLocaleLowerCase('vi-VN')).length, 1,
    `${game}/${question.id}: should have one correct answer`)

  if (question.questionType === 'FIND_WORD_START') {
    const visible = [question.prompt, question.displayText, question.voice, question.spokenInstruction,
      question.voiceFallback?.instruction, question.voiceFallback?.target,
      ...(question.voiceSequence ?? []).map(segment => segment.text)].filter(Boolean).join(' ').toLocaleLowerCase('vi-VN')
    assert.equal(answerShown(visible, question.answer), false, `${game}/${question.id}: answer leak`)
    assert.ok(question.answer.startsWith(question.data.onset), `${game}/${question.id}: onset mismatch`)
    assert.equal(question.data.targetText, question.answer)
  }

  if (question.data?.questionSemantics === 'contains-letter') {
    assert.ok(model.containsVietnameseLetter(question.answer, question.data.targetLetter), `${game}/${question.id}: target letter mismatch`)
    const visible = [question.prompt, question.displayText, question.spokenInstruction,
      ...(question.voiceSequence ?? []).map(segment => segment.text)].filter(Boolean).join(' ').toLocaleLowerCase('vi-VN')
    assert.equal(answerShown(visible, question.answer), false, `${game}/${question.id}: context answer leak`)
  }

  if (question.questionType === 'CHOOSE_PAIR') {
    const declared = [...question.data.choicePair, ...(question.data.additionalDistractors ?? [])]
    const expectedCount = game === 'drag-drop' ? 6 : game === 'gold-mining' ? 4 : game === 'racing' ? 3 : 2
    assert.equal(question.options.length, expectedCount)
    assert.deepEqual(new Set(question.options), new Set(declared))
    assert.ok(question.displayText.includes('_'), `${game}/${question.id}: missing visible blank`)
    assert.ok(question.data.targetText.startsWith(question.data.onset))
    assert.equal(question.data.visibleContext, question.displayText)
    const sequence = question.voiceSequence ?? []
    const spokenContext = question.data.spokenContext
    assert.ok(spokenContext, `${game}/${question.id}: missing spoken context`)
    assert.equal(sequence.at(-1)?.text.normalize('NFC').toLocaleLowerCase('vi-VN'), spokenContext.normalize('NFC').toLocaleLowerCase('vi-VN'),
      `${game}/${question.id}: voice should finish by reading the completed context`)
    const spokenInstruction = [question.prompt, question.spokenInstruction, question.voiceFallback?.instruction,
      ...sequence.slice(0, -1).map(segment => segment.text)].filter(Boolean).join(' ')
    assert.equal(answerShown(spokenInstruction, question.data.targetText), false, `${game}/${question.id}: instruction leaks the fill target`)
  }

  const isAudioTargetQuestion = question.questionType === 'WORD_RECOGNITION' || question.questionType === 'SYLLABLE_RECOGNITION'
    || (question.questionType === 'listen' && Number(question.data?.week) >= 2)
  if (isAudioTargetQuestion && question.inputMode === 'audio') {
    assert.equal(answerShown(`${question.prompt} ${question.displayText ?? ''}`, question.answer), false,
      `${game}/${question.id}: listening prompt should hide the answer from the board`)
    const expectedDisplay = question.goalKey === 'LISTEN_NG_NGH' && question.answer === 'ngh'
      ? `🔊 ${question.data.vowel}` : '🔊'
    assert.equal(question.displayText, expectedDisplay, `${game}/${question.id}: listening target should show its speaker and any spelling clue`)
    const targetVoice = question.voiceSequence?.[question.voiceSequence.length - 1]
    assert.equal(targetVoice?.text.normalize('NFC').toLocaleLowerCase('vi-VN'), question.answer.normalize('NFC').toLocaleLowerCase('vi-VN'),
      `${game}/${question.id}: audio clue should identify the target to select`)
  }

  if (question.goalKey === 'LISTEN_NG_NGH') {
    const expectedExample = question.answer === 'ng' ? 'ngõ' : 'nghỉ'
    assert.equal(question.data.listeningExample, expectedExample, `${game}/${question.id}: use a syllable that clarifies ng/ngh spelling`)
    assert.ok(question.options.includes(question.answer))
    if (question.answer === 'ng') assert.equal(question.options.includes('ngh'), false, `${game}/${question.id}: ng before õ must not be contrasted with ngh`)
    else assert.ok(question.options.includes('ng') && question.options.includes('ngh'), `${game}/${question.id}: contrast ng/ngh only with the visible i/e/ê clue`)
    assert.ok(question.prompt.includes('Nghe tiếng'), `${game}/${question.id}: explain that the clue is a spoken syllable`)
    assert.equal(question.voiceSequence?.[question.voiceSequence.length - 1]?.text.normalize('NFC'), expectedExample.normalize('NFC'))
  }

  if (question.goalKey === 'LISTEN_G_GI' && question.answer === 'g') {
    assert.equal(question.data.listeningExample, 'gà')
    assert.ok(question.options.includes('g'))
    assert.equal(question.options.includes('gh'), false, `${game}/${question.id}: g and gh share the same letter name`)
    assert.equal(question.voiceSequence?.at(-1)?.text.normalize('NFC'), 'gà'.normalize('NFC'))
  }
  if (question.goalKey === 'LISTEN_GH_NH' && question.answer === 'gh') {
    assert.equal(question.data.listeningExample, 'ghế')
    assert.ok(question.options.includes('gh'))
    assert.equal(question.options.includes('g'), false, `${game}/${question.id}: g and gh share the same letter name`)
    assert.equal(question.voiceSequence?.at(-1)?.text.normalize('NFC'), 'ghế'.normalize('NFC'))
  }

  if (question.inputMode === 'audio' && question.voiceSequence?.length > 1 && Number(question.data?.week) >= 2) {
    assert.equal(question.voiceSequence[0].pauseAfterMs, 240, `${game}/${question.id}: pause briefly before the spoken target`)
  }

  for (const src of [question.voice, question.instructionVoice, ...(question.voiceSequence ?? []).map(segment => segment.src)]) {
    if (src) voiceFiles.add(src)
  }
}

function answerCount(question, game, week) {
  if (question.connectPairs?.length) return question.connectPairs.length
  if (game === 'drag-drop') return 6
  if (game === 'gold-mining') return 4
  if (game === 'racing') return 3
  if (question.questionType === 'CHOOSE_PAIR') return 2
  if (week <= 2) return question.options.length >= 3 && question.options.length <= 4 ? question.options.length : -1
  return 3
}

async function main() {
  assert.equal(model.containsVietnameseLetter('bà', 'a'), true)
  assert.equal(model.containsVietnameseLetter('bế', 'ê'), true)
  assert.equal(model.containsVietnameseLetter('bế', 'e'), false)

  const validFind = {
    id: 'find-safe', goalKey: 'FIND_G_GI_IN_TEXT', questionType: 'FIND_WORD_START',
    prompt: 'Từ nào bắt đầu bằng gh?', answer: 'ghế đá', displayText: 'gh', options: ['ghế đá', 'ngõ nhỏ', 'cụ già'],
    data: { onset: 'gh', targetText: 'ghế đá' },
  }
  assert.deepEqual(model.validateVietnameseQuestion(validFind), [])
  assert.ok(model.validateVietnameseQuestion({ ...validFind, displayText: 'ghế đá' }).some(error => error.includes('reveals the answer')))

  const validFill = {
    id: 'fill-ngh', goalKey: 'BUILD_NGH_SYLLABLES', questionType: 'CHOOSE_PAIR', prompt: 'Điền ng hoặc ngh: _ệ',
    answer: 'ngh', options: ['ng', 'ngh'], displayText: '_ệ',
    voiceSequence: [{ src: '/games/general/voices/tieng-viet/syllables/nghe-nang.mp3', text: 'nghệ' }],
    data: { ...model.createVietnamesePairFillData(['ng', 'ngh'], 'nghệ', '_ệ'), vowel: 'ê' },
  }
  assert.deepEqual(model.validateVietnameseQuestion(validFill), [])
  assert.ok(model.validateVietnameseQuestion({ ...validFill, prompt: 'Điền ng hoặc ngh: _', displayText: '_', data: { ...validFill.data, visibleContext: '_' } }).length > 0)
  assert.ok(model.validateVietnameseQuestion({ ...validFill, goalKey: 'BUILD_G_SYLLABLES' }).some(error => error.includes('learning key')))

  const connectPairs = [
    { id: 'one', left: { kind: 'text', value: 'g' }, right: 'gà', learningKey: 'BUILD_G_SYLLABLES', sourceLesson: 17 },
    { id: 'two', left: { kind: 'text', value: 'gi' }, right: 'giỏ', learningKey: 'BUILD_GI_SYLLABLES', sourceLesson: 17 },
  ]
  const validConnect = {
    id: 'connect-safe', goalKey: 'REVIEW_LETTERS_WEEK_4', questionType: 'CONNECT_TEXT_TEXT', prompt: 'Nối phụ âm đầu với tiếng đúng.',
    answer: 'gà', options: ['gà', 'giỏ'], displayText: '', connectPairs,
  }
  assert.deepEqual(model.validateVietnameseQuestion(validConnect), [])
  assert.ok(model.validateVietnameseQuestion({ ...validConnect, spokenInstruction: 'Nối gà với tiếng phù hợp.' }).length > 0)

  for (let index = 0; index < weekModules.length; index++) {
    const week = index + 1
    for (const game of games) {
      const pool = weekModules[index].createQuestionPool(game)
      assert.ok(pool.length > 0, `Week ${week}/${game}: empty pool`)
      for (const question of pool) checkQuestion(question, game)
      const round = weekModules[index].generateQuestionSet(game, { random: () => 0.37 })
      assert.equal(round.length, 25, `Week ${week}/${game}: round size`)
      assert.equal(new Set(round.map(question => question.id)).size, 25, `Week ${week}/${game}: repeated round entries`)
      assert.ok(round.every(question => question.options.length === answerCount(question, game, week)), `Week ${week}/${game}: choice count`)
      console.log(`PASS Week ${week}/${game}: pool ${pool.length}; 25 unique questions; canonical validation`)
    }
  }

  const matchingPool = week4.createQuestionPool('drag-drop').filter(question => question.connectPairs?.length)
  assert.ok(matchingPool.length > 0, 'Week 4 should include a reusable text connection set')
  const textLevel = week4Adapter.toVietnameseWeek4Drag(matchingPool[0], 0)
  assert.equal(textLevel.type, 'matching')
  assert.equal(textLevel.groups.length, matchingPool[0].connectPairs.length)
  assert.equal(new Set(Object.values(textLevel.answers)).size, textLevel.groups.length)
  assert.equal(model.validateVietnameseQuestion(matchingPool[0]).length, 0)

  const imagePool = week4.createQuestionPool('drag-drop').find(question => question.questionType === 'CONNECT_IMAGE_WORD')
  assert.ok(imagePool, 'Week 4 should use the reusable image-word question type with its available sprite sheet')
  const imageAsset = path.join(root, 'public', imagePool.connectPairs[0].left.src.replace(/^\//, ''))
  assert.ok(fs.existsSync(imageAsset), `Missing image matching asset: ${imagePool.connectPairs[0].left.src}`)
  assert.equal(model.validateVietnameseQuestion(imagePool).length, 0)
  const actualImageLevel = week4Adapter.toVietnameseWeek4Drag(imagePool, 1)
  assert.equal(actualImageLevel.type, 'matching')
  assert.ok(actualImageLevel.groups.every(group => group.imageCrop && group.imageSrc === imagePool.connectPairs[0].left.src))

  const imageQuestion = model.normalizeVietnameseQuestion({
    id: 'connect-image-contract', goalKey: 'REVIEW_LETTERS_WEEK_4', questionType: 'CONNECT_IMAGE_WORD',
    prompt: model.VIETNAMESE_QUESTION_TEMPLATES.connectImageWord, answer: 'gà', options: ['gà', 'gỗ'], displayText: '',
    spokenInstruction: model.VIETNAMESE_QUESTION_TEMPLATES.connectImageWordInstruction,
    connectPairs: [
      { id: 'chicken', left: { kind: 'image', src: '/games/vietnamese/chicken.png', label: 'Hình con gà' }, right: 'gà', learningKey: 'BUILD_G_SYLLABLES', sourceLesson: 17 },
      { id: 'wood', left: { kind: 'image', src: '/games/vietnamese/wood.png', label: 'Hình khúc gỗ' }, right: 'gỗ', learningKey: 'BUILD_G_SYLLABLES', sourceLesson: 17 },
    ],
  })
  const imageLevel = week4Adapter.toVietnameseWeek4Drag(imageQuestion, 1)
  assert.equal(imageLevel.type, 'matching')
  assert.deepEqual(imageLevel.groups.map(group => group.imageSrc), ['/games/vietnamese/chicken.png', '/games/vietnamese/wood.png'])
  assert.ok(imageLevel.groups.every(group => group.imageAlt))

  for (const src of voiceFiles) {
    assert.ok(fs.existsSync(path.join(root, 'public', src.replace(/^\//, ''))), `Missing voice asset: ${src}`)
  }
  console.log(`PASS validator guards; text/image matching adapter; ${voiceFiles.size} mapped static voice assets exist`)
}

main().catch(error => { console.error(error); process.exitCode = 1 })

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')

const resolveFilename = Module._resolveFilename
Module._resolveFilename = function (request, ...args) {
  const resolvedRequest = request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request
  return resolveFilename.call(this, resolvedRequest, ...args)
}
const loadModule = Module._load
Module._load = function (request, ...args) {
  if (request === 'server-only') return {}
  return loadModule.call(this, request, ...args)
}
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename)

const { MOCK_EXAM_VERSION, MOCK_EXAM_QUESTION_COUNT } = require('../src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/config.ts')
const { generateMockTrangNguyenExam, sanitizeGeneratedExam, validateGeneratedExam } = require('../src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/exam-generator.ts')
const { isQuestionAnswered } = require('../src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/answer-utils.ts')
const { gradeQuestion, gradeTrangNguyenAnswers, isValidTrangNguyenAnswerMap } = require('../src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_lib/exam-grading.server.ts')
const { ANIMALS, FLOWERS, FRUITS, OBJECTS, VEHICLES, VEGETABLES, WORD_BANK } = require('../src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/vietnamese-data.ts')

function validateVoiceAssets(exam) {
  const audioPaths = new Set()
  const visit = value => {
    if (typeof value === 'string' && value.startsWith('/games/') && value.endsWith('.mp3')) audioPaths.add(value)
    else if (Array.isArray(value)) value.forEach(visit)
    else if (value && typeof value === 'object') Object.values(value).forEach(visit)
  }
  visit(exam.questions)
  for (const audioPath of audioPaths) {
    const diskPath = path.join(root, 'public', audioPath.replace(/^\//, ''))
    assert.ok(fs.existsSync(diskPath), `Missing voice asset: ${audioPath}`)
  }
}

function hasAnswerKey(value) {
  if (Array.isArray(value)) return value.some(hasAnswerKey)
  if (!value || typeof value !== 'object') return false
  return Object.entries(value).some(([key, item]) => /^(correctAnswer|correctItemId|answerKey)$/i.test(key) || hasAnswerKey(item))
}

function main() {
  assert.ok(WORD_BANK.length >= 30, 'word pool should contain at least 30 entries')
  assert.ok(ANIMALS.length >= 8, 'animal pool should contain at least 8 entries')
  assert.ok(OBJECTS.length >= 8, 'object pool should contain at least 8 entries')
  assert.ok(FRUITS.length >= 8, 'fruit pool should contain at least 8 entries')
  assert.ok(FLOWERS.length >= 8, 'flower pool should contain at least 8 entries')
  assert.ok(VEHICLES.length >= 8, 'vehicle pool should contain at least 8 entries')
  assert.ok(VEGETABLES.length >= 8, 'vegetable pool should contain at least 8 entries')
  const textQuestion = { type: 'text-input', correctAnswer: 'cá' }
  assert.equal(gradeQuestion(textQuestion, 'CA\u0301'), true, 'Vietnamese text grading should normalize NFC and case')
  assert.equal(gradeQuestion(textQuestion, 'ca'), false, 'Vietnamese text grading should preserve diacritics')

  const examples = []
  for (let index = 0; index < 100; index += 1) {
    const seed = `trang-nguyen-seed-${index}`
    const exam = generateMockTrangNguyenExam({ seed, examVersion: MOCK_EXAM_VERSION })
    const repeated = generateMockTrangNguyenExam({ seed, examVersion: MOCK_EXAM_VERSION })
    assert.deepEqual(repeated, exam, `seed ${index} should generate a stable exam`)
    assert.equal(exam.questions.length, MOCK_EXAM_QUESTION_COUNT)
    validateGeneratedExam(exam)

    const templates = exam.questions.map(question => question.templateId)
    assert.equal(new Set(templates).size, 30, `seed ${index} should use every template once`)
    for (let block = 0; block < 6; block += 1) {
      const expected = Array.from({ length: 5 }, (_, item) => `T${String(block * 5 + item + 1).padStart(2, '0')}`).sort()
      const actual = templates.slice(block * 5, block * 5 + 5).sort()
      assert.deepEqual(actual, expected, `seed ${index}, block ${block + 1} should contain its five fixed templates`)
    }

    for (const question of exam.questions) {
      const optionIds = (question.options ?? []).map(option => option.id)
      assert.equal(new Set(optionIds).size, optionIds.length, `${question.id} option ids should be unique`)
      const optionTexts = (question.options ?? []).map(option => option.text?.normalize('NFC').toLocaleLowerCase('vi-VN')).filter(Boolean)
      assert.equal(new Set(optionTexts).size, optionTexts.length, `${question.id} option text should be unique`)
      const optionLabels = (question.options ?? []).map(option => option.label).filter(Boolean)
      assert.equal(new Set(optionLabels).size, optionLabels.length, `${question.id} option labels should be unique`)
    }

    const answers = Object.fromEntries(exam.questions.map(question => [question.id, question.correctAnswer]))
    assert.equal(isValidTrangNguyenAnswerMap(answers, exam), true, `seed ${index} generated correct-answer map should validate`)
    assert.equal(gradeTrangNguyenAnswers(answers, exam).correctCount, 30, `seed ${index} should grade all generated answers correctly`)
    assert.equal(isValidTrangNguyenAnswerMap({ ...answers, unknown: 'bad' }, exam), false, 'unknown answer question ids should be rejected')
    const safeExam = sanitizeGeneratedExam(exam)
    assert.equal(safeExam.questions.some(question => Object.hasOwn(question, 'correctAnswer')), false, 'client exam should not include answer keys')
    assert.equal(hasAnswerKey(safeExam), false, 'client exam data should not include nested answer keys')
    validateVoiceAssets(exam)
    examples.push(JSON.stringify(exam.questions.map(question => [question.templateId, question.prompt, question.options, question.data])))
  }

  assert.ok(new Set(examples).size > 1, 'different seeds should vary question content and option order')
  const sortQuestion = generateMockTrangNguyenExam({ seed: 'sorting-answered-state' }).questions.find(question => question.type === 'sorting')
  assert.equal(isQuestionAnswered(sortQuestion, undefined), false)
  assert.equal(isQuestionAnswered(sortQuestion, (sortQuestion.data.items ?? []).map(item => item.id)), true)
  console.log('PASS Trang Nguyên mock exam: 100 deterministic seeds, templates/blocks, grading, pools, and voice assets')
}

try { main() } catch (error) { console.error(error); process.exitCode = 1 }

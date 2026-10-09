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
const {
  FIND_TARGET_EXCLUDED_COMPOUNDS,
  FIND_TARGET_OBJECT_THEMES,
  FIND_TARGET_OBJECT_VARIANTS,
  FIND_TARGET_PLANNED_VOICE_PATHS,
  FIND_TARGET_SINGLE_LETTERS,
  ANIMAL_VOICE_MAP,
  FIND_ANIMAL_BY_NAME_COMMON_VOICE,
  HEAR_IDENTIFY_COMMON_VOICE,
  HEAR_IDENTIFY_LETTERS,
  HEAR_IDENTIFY_VOICE_MAP,
  TAG_NAME_COMMON_VOICE,
  TAG_NAME_TARGET_LETTERS,
  TONE_LABELS,
  TONE_SYLLABLE_BANK,
  TONE_QUESTION_VOICE_END,
  TONE_QUESTION_VOICE_START,
  TONE_VOICE_MAP,
  VIETNAMESE_TONES,
  FIND_OBJECT_BY_NAME_COMMON_VOICE,
  FIND_FLOWER_BY_IMAGE_COMMON_VOICE,
  FIND_LETTERS_IN_IMAGE_COMMON_VOICE,
  RECOGNIZE_NUMBER_PROMPT_VOICE,
  FILL_LETTER_IN_BLANK_COMMON_VOICE,
  LETTER_BOARD_DECORATIONS,
  LETTER_INPUT_ALLOWED_LETTERS,
  LETTER_CARD_SHAPES,
  LETTER_CARD_COLORS,
  LETTER_CARD_BORDER_COLORS,
  LETTER_CARD_DECORATION_ICONS,
  COUNT_TARGET_LETTER_PROMPT,
  COUNT_TARGET_LETTER_PREFIX_TEXT,
  COUNT_TARGET_LETTER_PREFIX_VOICE,
  COUNT_TARGET_LETTER_TOTAL_ITEMS,
  COUNT_TARGET_LETTER_GRID_SIZE,
  COUNT_TARGET_LETTER_COLORS,
  COUNT_TARGET_LETTER_ICONS,
  HIDDEN_LETTER_INTRO_TEXT,
  HIDDEN_LETTER_INTRO_VOICE,
  HIDDEN_LETTER_PROMPT_VOICE,
  HIDDEN_LETTER_RELATION_VOICE_MAP,
  HIDDEN_LETTER_COLORS,
  HIDDEN_LETTER_CONTAINER_POOL,
  ROTATED_LETTER_ANSWER_TEXT,
  ROTATED_LETTER_ALLOWED_LETTERS,
  ROTATED_LETTER_BOARD_POOL,
  ROTATED_LETTER_BOARD_STYLES,
  ROTATED_LETTER_COLORS,
  ROTATED_LETTER_PROMPT,
  ROTATED_LETTER_PROMPT_VOICE,
  ROTATED_LETTER_QUESTION_VOICE,
  ROTATED_LETTER_TARGET_POOL,
  MATCH_SAME_LETTER_COMMON_VOICE,
  MATCH_SAME_LETTER_ASSET_COUNTS,
  MATCH_LOWER_UPPER_CASE_PROMPT,
  MATCH_LOWER_UPPER_CASE_VOICE_SEQUENCE,
  MATCH_IMAGE_WITH_SOUND_PROMPT,
  MATCH_IMAGE_WITH_SOUND_PROMPT_VOICE,
  MATCH_IMAGE_WITH_SOUND_SINGLE_SOUNDS,
  generateImageWithSoundMatchQuestion,
  getImageWithSoundCombinationKey,
  MATCH_OBJECT_WITH_NAME_PROMPT,
  MATCH_OBJECT_WITH_NAME_PROMPT_VOICE,
  MATCH_OBJECT_WITH_NAME_POOL_IDS,
  generateObjectImageWithAudioQuestion,
  getObjectWithNameCombinationKey,
  CLASSIFY_NUMBER_AND_LETTER_PROMPT,
  CLASSIFY_NUMBER_AND_LETTER_NOTE,
  CLASSIFY_NUMBER_AND_LETTER_LETTER_POOL,
  CLASSIFY_NUMBER_AND_LETTER_COLORS,
  CLASSIFY_COMMON_VOICE_SEQUENCE,
  CATEGORY_21_META,
  CATEGORY_21_IDS,
  CATEGORY_21_ASSET_POOLS,
  getCategory21VoiceSequence,
  generateCategoryPairClassificationQuestion,
  ORDER_ALPHABET_PROMPT,
  ORDER_ALPHABET_VOICE,
  ORDER_ALPHABET_ALLOWED_LETTERS,
  ORDER_ALPHABET_VARIANT_LETTERS,
  generateAlphabetOrderQuestion,
  VEHICLE_ORDER_PROMPT,
  generateVehicleOrderQuestion,
  generateQuestion27,
  QUESTION_27_VALID_SOUNDS,
  generateQuestion28,
  generateQuestion29,
  generateQuestion30,
  NUMBER_CARD_VALUES,
  NUMBER_CARD_DECORATIONS,
  NUMBER_CARD_COLORS,
  OBJECT_NAME_MANIFEST,
  FLOWER_NAME_MANIFEST,
  OBJECT_QUESTION_TEXT,
  OBJECT_VOICE_MAP,
  FLOWER_NAME_VOICE_MAP,
  generateFindLetterInAnimalNameQuestion,
  generateFindTargetLetterInObjectQuestion,
  generateFindTargetLetterInObjectImageQuestion,
  generateFindAnimalByNameQuestion,
  generateFindObjectByNameQuestion,
  generateFindFlowerByImageQuestion,
  generateFindLettersInImageQuestion,
  generateRecognizeNumberOnCardQuestion,
  generateFillLetterInBlankQuestion,
  validateFillLetterInBlankQuestion,
  generateCountTargetLetterQuestion,
  validateCountTargetLetterQuestion,
  resolveFindTargetLetterVoice,
  generateFindHiddenLetterQuestion,
  validateFindHiddenLetterQuestion,
  generateRotatedLetterQuestion,
  generateSameLetterTwoGroupsQuestion,
  getSameLetterMatchCombinationKey,
  generateLowerUpperMatchQuestion,
  getLowerUpperMatchCombinationKey,
  validateRotatedLetterQuestion,
  getAnimalDistractors,
  generateHearIdentifyQuestions,
  generateIdentifyToneQuestion,
  resolveToneSyllableVoice,
} = require('../src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/question-generators.ts')
const TAG_NAME_MANIFEST = require('../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/tag-name.manifest.json')
const OBJECT_NAME_JSON = require('../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/object-name.manifest.json')
const FLOWER_NAME_JSON = require('../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/flower-name.manifest.json')
const VEGETABLE_JSON = require('../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/vegetable.manifest.json')
const TUBER_JSON = require('../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/tuber.manifest.json')
const FRUIT_NONE_COLOR_JSON = require('../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/fruit-none-color.manifest.json')
const LETTER_CARD_ANIMALS_JSON = require('../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/letter-card-animals.manifest.json')
const DINO_LETTER_SOUND_JSON = require('../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/dino-letter-sound.manifest.json')
const REAL_OBJECT_LETTER_SHAPES_JSON = require('../public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/real-object-letter-shapes.manifest.json')
const { createSeededRandom } = require('../src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/shuffle.ts')
const { previewQuestion } = require('../src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/test/_components/preview-question.ts')
const { QUESTION_27_WORDS, QUESTION_27_TEXT_MATCHED_WORDS, isQuestion27VoiceTextAligned, getQuestion27Sounds } = require('../src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/question27-knowledge.ts')
const {
  QUESTION_28_29_ENABLED_ASSETS,
  QUESTION_29_ALLOWED_LETTERS,
  QUESTION_29_ASSETS,
  QUESTION_29_LETTER_CONFUSION_MAP,
  QUESTION_29_SENTENCE_PREFIX,
  getQuestion29AssetVisual,
} = require('../src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/question28-29-knowledge.ts')
const {
  QUESTION_30_ALLOWED_LETTERS,
  QUESTION_30_COLOR_POOL,
  QUESTION_30_COMMON_VOICE,
  QUESTION_30_FRUIT_POOL,
  getQuestion30FruitVisual,
} = require('../src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/question30-knowledge.ts')
const { isQuestionAnswered, sanitizeSingleVietnameseLetter } = require('../src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/answer-utils.ts')
const { gradeQuestion, gradeTrangNguyenAnswers, isValidTrangNguyenAnswerMap } = require('../src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_lib/exam-grading.server.ts')
const { ANIMALS, FLOWERS, FRUITS, OBJECTS, VEHICLES, VEGETABLES, VIETNAMESE_ALPHABET, WORD_BANK } = require('../src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_exam/vietnamese-data.ts')

const missingExpectedVoicePaths = new Set()
const pendingVoicePaths = new Set([
  TAG_NAME_COMMON_VOICE,
])

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
    if (!fs.existsSync(diskPath) && pendingVoicePaths.has(audioPath)) {
      missingExpectedVoicePaths.add(audioPath)
      continue
    }
    assert.ok(fs.existsSync(diskPath), `Missing voice asset: ${audioPath}`)
  }
}

function hasAnswerKey(value) {
  if (Array.isArray(value)) return value.some(hasAnswerKey)
  if (!value || typeof value !== 'object') return false
  return Object.entries(value).some(([key, item]) => /^(correctAnswer|correctItemId|answerKey|matchKey)$/i.test(key) || hasAnswerKey(item))
}

function main() {
  const tagNameSheetPath = path.join(root, 'public', TAG_NAME_MANIFEST.image.replace(/^\//, ''))
  assert.ok(fs.existsSync(tagNameSheetPath), 'tag-name sprite sheet must exist')
  const tagNameSheet = fs.readFileSync(tagNameSheetPath)
  assert.equal(tagNameSheet.readUInt32BE(16), TAG_NAME_MANIFEST.width, 'tag-name sheet width must match its manifest')
  assert.equal(tagNameSheet.readUInt32BE(20), TAG_NAME_MANIFEST.height, 'tag-name sheet height must match its manifest')
  assert.equal(TAG_NAME_MANIFEST.id, 'trang-nguyen-tag-name-tight')
  assert.equal(TAG_NAME_MANIFEST.grid.columns, 8)
  assert.equal(TAG_NAME_MANIFEST.grid.rows, 4)
  assert.equal(TAG_NAME_MANIFEST.grid.cellWidth, 192)
  assert.equal(TAG_NAME_MANIFEST.grid.cellHeight, 256)
  assert.equal(TAG_NAME_MANIFEST.width, TAG_NAME_MANIFEST.grid.columns * TAG_NAME_MANIFEST.grid.cellWidth)
  assert.equal(TAG_NAME_MANIFEST.height, TAG_NAME_MANIFEST.grid.rows * TAG_NAME_MANIFEST.grid.cellHeight)
  assert.equal(TAG_NAME_MANIFEST.items.length, TAG_NAME_TARGET_LETTERS.length)
  assert.deepEqual(TAG_NAME_MANIFEST.items.map(item => item.targetLetter), [...TAG_NAME_TARGET_LETTERS], 'manifest targets should follow the requested single-letter pool')
  assert.equal(new Set(TAG_NAME_MANIFEST.items.map(item => item.id)).size, TAG_NAME_MANIFEST.items.length, 'manifest item ids must be unique')
  for (const [index, item] of TAG_NAME_MANIFEST.items.entries()) {
    const expectedRow = Math.floor(index / TAG_NAME_MANIFEST.grid.columns)
    const expectedCol = index % TAG_NAME_MANIFEST.grid.columns
    assert.equal(item.row, expectedRow, `${item.id} should be in row-major order`)
    assert.equal(item.col, expectedCol, `${item.id} should be in row-major order`)
    assert.deepEqual(item.cell, {
      x: expectedCol * TAG_NAME_MANIFEST.grid.cellWidth,
      y: expectedRow * TAG_NAME_MANIFEST.grid.cellHeight,
      width: TAG_NAME_MANIFEST.grid.cellWidth,
      height: TAG_NAME_MANIFEST.grid.cellHeight,
    }, `${item.id} source cell should match the sheet grid`)
    assert.ok(item.x >= item.cell.x && item.y >= item.cell.y, `${item.id} tight crop should start inside its cell`)
    assert.ok(item.width > 0 && item.height > 0, `${item.id} tight crop should have a visible size`)
    assert.ok(item.x + item.width <= item.cell.x + item.cell.width && item.y + item.height <= item.cell.y + item.cell.height, `${item.id} tight crop should fit its cell`)
    assert.ok(item.letters.includes(item.targetLetter), `${item.word} should contain its target letter ${item.targetLetter}`)
    assert.ok(item.x + item.width <= TAG_NAME_MANIFEST.width && item.y + item.height <= TAG_NAME_MANIFEST.height, `${item.id} crop should fit the sheet`)
  }

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
  const q20DecorationCoverage = { numbers: new Set(), letters: new Set() }
  const q20ColorCoverage = { numbers: new Set(), letters: new Set() }
  const questionVariantsByPosition = Array.from({ length: MOCK_EXAM_QUESTION_COUNT }, () => new Set())
  for (let index = 0; index < 100; index += 1) {
    const seed = `trang-nguyen-seed-${index}`
    const exam = generateMockTrangNguyenExam({ seed, examVersion: MOCK_EXAM_VERSION })
    const repeated = generateMockTrangNguyenExam({ seed, examVersion: MOCK_EXAM_VERSION })
    assert.deepEqual(repeated, exam, `seed ${index} should generate a stable exam`)
    assert.equal(exam.questions.length, MOCK_EXAM_QUESTION_COUNT)
    validateGeneratedExam(exam)
    exam.questions.forEach((question, questionIndex) => {
      questionVariantsByPosition[questionIndex].add(JSON.stringify({
        prompt: question.prompt,
        options: question.options,
        data: question.data,
        correctAnswer: question.correctAnswer,
      }))
    })

    const templates = exam.questions.map(question => question.templateId)
    assert.equal(new Set(templates).size, 30, `seed ${index} should use every template once`)
    assert.equal(exam.questions[0].templateId, 'T01', `seed ${index} should put the new generator in question 1`)
    assert.equal(exam.questions[0].data.generator, 'FIND_TARGET_LETTER_IN_OBJECT')
    assert.equal(exam.questions[1].templateId, 'T02', `seed ${index} should put the bubble generator in question 2`)
    assert.equal(exam.questions[1].data.generator, 'FIND_TARGET_LETTER_IN_OBJECT_IMAGE')
    assert.equal(exam.questions[2].templateId, 'T03', `seed ${index} should put T03 in question 3`)
    assert.equal(exam.questions[3].templateId, 'T04', `seed ${index} should put T04 in question 4`)
    assert.notEqual(exam.questions[2].data.target, exam.questions[3].data.target, `seed ${index} should use different question 3 and 4 targets`)
    assert.equal(exam.questions[4].templateId, 'T05', `seed ${index} should put T05 in question 5`)
    assert.equal(exam.questions[4].data.generator, 'FIND_LETTER_IN_ANIMAL_NAME')
    assert.equal(exam.questions[5].templateId, 'T06', `seed ${index} should put the tone generator in question 6`)
    assert.equal(exam.questions[5].data.generator, 'IDENTIFY_TONE_FROM_SYLLABLE')
    assert.equal(exam.questions[6].templateId, 'T07', `seed ${index} should put the animal generator in question 7`)
    assert.equal(exam.questions[6].data.generator, 'FIND_ANIMAL_BY_NAME')
    assert.equal(exam.questions[7].templateId, 'T08', `seed ${index} should put object recognition in question 8`)
    assert.equal(exam.questions[7].data.generator, 'FIND_OBJECT_BY_NAME')
    assert.equal(exam.questions[8].templateId, 'T09', `seed ${index} should put flower recognition in question 9`)
    assert.equal(exam.questions[8].data.generator, 'FIND_FLOWER_BY_IMAGE')
    assert.equal(exam.questions[9].templateId, 'T10', `seed ${index} should put multi-select letter recognition in question 10`)
    assert.equal(exam.questions[9].data.generator, 'RECOGNIZE_LETTERS_IN_IMAGE')
    assert.equal(exam.questions[10].templateId, 'T11', `seed ${index} should put number recognition in question 11`)
    assert.equal(exam.questions[10].data.generator, 'RECOGNIZE_NUMBER_ON_CARD')
    assert.equal(exam.questions[11].templateId, 'T12', `seed ${index} should put letter input in question 12`)
    assert.equal(exam.questions[11].data.generator, 'FILL_LETTER_IN_BLANK')
    assert.equal(exam.questions[12].templateId, 'T13', `seed ${index} should put count-letter input in question 13`)
    assert.equal(exam.questions[12].data.generator, 'COUNT_TARGET_LETTER')
    assert.equal(exam.questions[13].templateId, 'T14', `seed ${index} should put hidden-letter input in question 14`)
    assert.equal(exam.questions[13].data.generator, 'FIND_HIDDEN_LETTER')
    assert.equal(exam.questions[14].templateId, 'T15', `seed ${index} should put rotated-letter input in question 15`)
    assert.equal(exam.questions[14].type, 'rotated-letter-input')
    assert.equal(exam.questions[14].data.generator, 'ROTATED_LETTER_INPUT')
    assert.equal(exam.questions[15].templateId, 'T16', `seed ${index} should put two-group matching in question 16`)
    assert.equal(exam.questions[15].type, 'drag-match')
    assert.equal(exam.questions[15].data.generator, 'MATCH_SAME_LETTER_TWO_GROUPS')
    assert.equal(exam.questions[16].templateId, 'T17', `seed ${index} should put lowercase-uppercase matching in question 17`)
    assert.equal(exam.questions[16].type, 'drag-match')
    assert.equal(exam.questions[16].data.generator, 'MATCH_LOWER_UPPER_CASE')
    assert.equal(exam.questions[17].templateId, 'T18', `seed ${index} should put image-to-sound matching in question 18`)
    assert.equal(exam.questions[17].type, 'drag-match')
    assert.equal(exam.questions[17].data.generator, 'MATCH_IMAGE_WITH_SOUND')
    assert.equal(exam.questions[18].templateId, 'T19', `seed ${index} should put object image-to-audio matching in question 19`)
    assert.equal(exam.questions[18].type, 'drag-match')
    assert.equal(exam.questions[18].data.generator, 'MATCH_OBJECT_WITH_NAME')
    const q20 = exam.questions[19]
    const q20Data = q20.data
    assert.equal(q20.templateId, 'T20', 'question 20 should use its assigned template')
    assert.equal(q20.type, 'categorize')
    assert.equal(q20.data.generator, 'CLASSIFY_NUMBER_AND_LETTER')
    assert.equal(q20.prompt, CLASSIFY_NUMBER_AND_LETTER_PROMPT)
    assert.equal(q20.data.note, CLASSIFY_NUMBER_AND_LETTER_NOTE)
    assert.equal(q20Data.subType, 'number-vs-letter')
    assert.equal(q20Data.items.length, 6)
    const q20Numbers = q20Data.items.filter(item => item.id.startsWith('number-'))
    const q20Letters = q20Data.items.filter(item => item.id.startsWith('letter-'))
    assert.equal(q20Numbers.length, 3)
    assert.equal(q20Letters.length, 3)
    assert.equal(new Set(q20Numbers.map(item => item.value)).size, 3)
    assert.equal(new Set(q20Letters.map(item => item.value)).size, 3)
    assert.ok(q20Numbers.every(item => item.kind === 'text' && /^[0-9]$/.test(item.value) && item.groupId === 'numbers'))
    assert.ok(q20Letters.every(item => item.kind === 'text' && CLASSIFY_NUMBER_AND_LETTER_LETTER_POOL.includes(item.value) && item.groupId === 'letters'))
    assert.deepEqual(q20Data.groups.map(group => group.id), ['numbers', 'letters'])
    assert.equal(q20Data.maxItemsPerGroup, 3)
    assert.equal(q20Data.acceptIncorrectPlacement, true)
    assert.ok(q20Data.items.every(item => ['flower', 'ball'].includes(item.decoration.type) && CLASSIFY_NUMBER_AND_LETTER_COLORS.includes(item.color)))
    assert.equal(new Set(q20Data.items.map(item => item.decoration.type)).size, 1, 'question 20 should use one shared background decoration')
    for (const item of q20Data.items) {
      const category = item.id.startsWith('number-') ? 'numbers' : 'letters'
      q20DecorationCoverage[category].add(item.decoration.type)
      q20ColorCoverage[category].add(item.color)
    }
    assert.deepEqual(q20.correctAnswer, Object.fromEntries(q20Data.items.map(item => [item.id, item.groupId])))
    const q20VoiceAvailable = CLASSIFY_COMMON_VOICE_SEQUENCE.every(file => fs.existsSync(path.join(root, 'public', file.replace(/^\//, ''))))
    assert.deepEqual(q20Data.voiceSequence, q20VoiceAvailable ? [...CLASSIFY_COMMON_VOICE_SEQUENCE] : [])
    assert.equal(q20.promptVoice, q20VoiceAvailable ? q20Data.voiceSequence : undefined)
    assert.ok(!q20.promptVoice || !q20.promptVoice.includes('/common/em-hay-xep-cac-hinh-anh-vao-nhom-thich-hop-luu-y.mp3'),
      'question 20 should not use the long recording')

    const q21 = exam.questions.find(question => question.templateId === 'T21')
    const q21Data = q21.data
    assert.equal(q21.templateId, 'T21')
    assert.equal(q21.data.generator, 'CLASSIFY_CATEGORY_PAIRS')
    assert.equal(q21.prompt, CLASSIFY_NUMBER_AND_LETTER_PROMPT)
    assert.equal(q21Data.subType, 'category-vs-category')
    assert.equal(q21Data.items.length, 6)
    assert.equal(q21Data.groups.length, 2)
    assert.notEqual(q21Data.groups[0].id, q21Data.groups[1].id)
    assert.ok(q21Data.groups.every((group, index) => CATEGORY_21_IDS.includes(group.id)
      && group.label === (index + 1) + '. ' + CATEGORY_21_META[group.id].label))
    assert.ok(q21Data.groups.every(group => q21Data.items.filter(item => item.groupId === group.id).length === 3))
    assert.ok(q21Data.items.every(item => item.kind === 'image' && !item.value && item.image
      && item.image.manifestId === item.groupId
      && CATEGORY_21_ASSET_POOLS[item.groupId].some(asset => asset.id === item.image.imageId)))
    assert.deepEqual(q21.correctAnswer, Object.fromEntries(q21Data.items.map(item => [item.id, item.groupId])))
    assert.equal(q21Data.maxItemsPerGroup, 3)
    assert.equal(q21Data.acceptIncorrectPlacement, false)
    assert.deepEqual(q21Data.voiceSequence, getCategory21VoiceSequence(q21Data.groups[0].id, q21Data.groups[1].id))
    assert.deepEqual(q21.promptVoice, q21Data.voiceSequence)

    const q22 = exam.questions.find(question => question.templateId === 'T22')
    const q22Data = q22.data
    assert.equal(q22.templateId, 'T22')
    assert.equal(q22.data.generator, 'ORDER_VIETNAMESE_ALPHABET')
    assert.equal(q22.prompt, ORDER_ALPHABET_PROMPT)
    assert.equal(q22Data.items.length, 5)
    assert.equal(q22Data.allowedLetters.length, ORDER_ALPHABET_ALLOWED_LETTERS.length)
    assert.deepEqual(q22Data.allowedLetters, ORDER_ALPHABET_ALLOWED_LETTERS)
    assert.equal(new Set(q22Data.items.map(item => item.value.normalize('NFC'))).size, 5)
    assert.ok(q22Data.items.every(item => q22Data.allowedLetters.includes(item.value)))
    const q22ValueById = new Map(q22Data.items.map(item => [item.id, item.value]))
    const q22CorrectLetters = q22.correctAnswer.map(id => q22ValueById.get(id))
    assert.deepEqual(q22CorrectLetters, [...q22CorrectLetters].sort((left, right) => VIETNAMESE_ALPHABET.indexOf(left) - VIETNAMESE_ALPHABET.indexOf(right)))
    assert.notDeepEqual(q22Data.items.map(item => item.value), q22CorrectLetters, 'question 22 should not start in the correct order')
    assert.ok(q22Data.items.filter(item => ORDER_ALPHABET_VARIANT_LETTERS.includes(item.value)).length <= 2)
    assert.equal(q22.promptVoice, fs.existsSync(path.join(root, 'public', ORDER_ALPHABET_VOICE.replace(/^\//, ''))) ? ORDER_ALPHABET_VOICE : undefined)
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
  assert.equal(q20DecorationCoverage.numbers.size, 2, 'number background decorations should vary between flower and ball questions')
  assert.equal(q20DecorationCoverage.letters.size, 2, 'letter background decorations should vary between flower and ball questions')
  assert.ok(q20ColorCoverage.numbers.size > 1 && q20ColorCoverage.letters.size > 1, 'each category should vary item colors')

  assert.ok(new Set(examples).size > 1, 'different seeds should vary question content and option order')
  questionVariantsByPosition.forEach((variants, index) => {
    assert.ok(variants.size > 1, `question ${index + 1} should vary across exam seeds`)
  })

  const targetLetters = new Set()
  const targetThemes = new Set()
  const correctPositions = new Set()
  const promptsByTheme = new Map(FIND_TARGET_OBJECT_THEMES.map(theme => [theme, new Set()]))
  assert.equal(FIND_TARGET_PLANNED_VOICE_PATHS.length, 7, 'the new voice set should use the seven requested recordings')
  assert.ok(FIND_TARGET_PLANNED_VOICE_PATHS.every(file => file.startsWith('/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/')))
  for (let index = 0; index < 1000; index += 1) {
    const question = generateFindTargetLetterInObjectQuestion({
      seedHash: `find-target-${index}`,
      random: createSeededRandom(`find-target-${index}`),
      difficulty: index % 2 === 0 ? 'easy' : 'medium',
    })
    const theme = question.data.objectTheme
    const target = question.data.targetLetter
    const optionLetters = question.options.map(option => option.visual.value)
    const correct = question.options.filter(option => option.id === question.correctAnswer)
    assert.equal(question.templateId, 'T01')
    assert.equal(question.options.length, 4)
    assert.equal(new Set(optionLetters).size, 4)
    assert.equal(correct.length, 1)
    assert.equal(correct[0].visual.value, target)
    assert.ok(FIND_TARGET_SINGLE_LETTERS.includes(target), `target ${target} must be a single allowed letter`)
    assert.ok(!FIND_TARGET_EXCLUDED_COMPOUNDS.includes(target))
    assert.ok(optionLetters.every(letter => FIND_TARGET_SINGLE_LETTERS.includes(letter)), 'choices must only use allowed single letters')
    assert.ok(!(optionLetters.includes('i') && optionLetters.includes('y')), 'question one must not show i and y together')
    assert.equal(new Set(question.options.map(option => option.visual.objectTheme)).size, 1, 'one question must use one object theme')
    assert.ok(question.options.every(option => option.visual.objectTheme === theme))
    assert.ok(question.options.every(option => FIND_TARGET_OBJECT_VARIANTS[theme].includes(option.visual.objectVariant)))
    assert.equal(new Set(question.options.map(option => option.visual.objectVariant)).size, 4, 'each object must have a randomized skin')
    assert.equal(question.options.map(option => option.label).filter(Boolean).length, 4)
    targetLetters.add(target)
    targetThemes.add(theme)
    promptsByTheme.get(theme).add(question.prompt)
    correctPositions.add(question.options.findIndex(option => option.id === question.correctAnswer))

    if (theme === 'star') assert.ok(!question.prompt.includes('Bong bóng'))
    if (theme === 'balloon') assert.ok(!question.prompt.includes('Ngôi sao'))
    if (theme === 'gift' || theme === 'candy') {
      assert.ok(!question.prompt.includes('Ngôi sao'))
      assert.ok(!question.prompt.includes('Bong bóng'))
    }
    if (question.promptVoice) validateVoiceAssets({ questions: [question] })
    const findTargetVoicePaths = []
    const collectVoicePaths = value => {
      if (typeof value === 'string' && value.startsWith('/games/')) findTargetVoicePaths.push(value)
      else if (Array.isArray(value)) value.forEach(collectVoicePaths)
      else if (value && typeof value === 'object') Object.values(value).forEach(collectVoicePaths)
    }
    collectVoicePaths(question.promptVoice)
    assert.ok(findTargetVoicePaths.every(file => file.startsWith('/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/')), 'question one must only use its dedicated voice assets')
  }
  assert.equal(targetLetters.size, FIND_TARGET_SINGLE_LETTERS.length, 'the target pool should cover all allowed letters')
  assert.equal(targetThemes.size, FIND_TARGET_OBJECT_THEMES.length, 'all four object themes should be generated')
  assert.deepEqual([...correctPositions].sort(), [0, 1, 2, 3], 'the correct option should reach every A-D position')
  for (const theme of FIND_TARGET_OBJECT_THEMES) assert.ok(promptsByTheme.get(theme).size > 1, `${theme} prompts should vary`)

  const imageTargets = new Set()
  const imageThemes = new Set()
  const imageCorrectPositions = new Set()
  const imagePrompts = new Set()
  for (let index = 0; index < 1000; index += 1) {
    const seed = `find-target-object-image-${index}`
    const question = generateFindTargetLetterInObjectImageQuestion({
      seedHash: seed,
      random: createSeededRandom(seed),
    })
    const target = question.data.targetLetter
    const objectTheme = question.data.objectTheme
    const letters = question.options.map(option => option.visual?.value)
    const correct = question.options.find(option => option.id === question.correctAnswer)
    assert.equal(question.templateId, 'T02')
    assert.equal(question.type, 'image-choice')
    assert.equal(question.data.generator, 'FIND_TARGET_LETTER_IN_OBJECT_IMAGE')
    assert.equal(question.options.length, 4)
    assert.equal(new Set(letters).size, 4)
    assert.ok(FIND_TARGET_SINGLE_LETTERS.includes(target))
    assert.ok(FIND_TARGET_OBJECT_THEMES.includes(objectTheme))
    assert.equal(letters.filter(letter => letter === target).length, 1)
    assert.equal(correct?.visual?.value, target)
    assert.ok(question.options.every(option => option.visual?.type === 'object-letter' && option.visual.objectTheme === objectTheme))
    assert.ok(question.options.every(option => FIND_TARGET_OBJECT_VARIANTS[objectTheme].includes(option.visual.objectVariant)))
    assert.equal(new Set(question.options.map(option => option.visual.objectVariant)).size, 4, 'each image answer should use a different variant')
    assert.ok(question.options.every(option => !option.voice), 'image choices should not have answer voices')
    assert.ok(!(letters.includes('i') && letters.includes('y')), 'question two must not show i and y together')
    assert.ok(Array.isArray(question.promptVoice) && question.promptVoice.length >= 3)
    assert.ok(question.promptVoice.every(file => file.startsWith('/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/')))
    const objectName = { star: 'Ngôi sao', balloon: 'Bong bóng', gift: 'Hộp quà', candy: 'Viên kẹo' }[objectTheme]
    assert.ok(question.prompt.toLocaleLowerCase('vi-VN').includes(objectName.toLocaleLowerCase('vi-VN')))
    assert.equal(question.promptVoice.at(-1), HEAR_IDENTIFY_VOICE_MAP[target], 'question voice should end with the dedicated target recording')
    validateVoiceAssets({ questions: [question] })
    imageTargets.add(target)
    imageThemes.add(objectTheme)
    imageCorrectPositions.add(question.options.findIndex(option => option.id === question.correctAnswer))
    imagePrompts.add(question.prompt)
  }
  assert.equal(imageTargets.size, FIND_TARGET_SINGLE_LETTERS.length, 'question two should cover every voiced single-letter target')
  assert.equal(imageThemes.size, FIND_TARGET_OBJECT_THEMES.length, 'question two should generate all four object themes')
  assert.deepEqual([...imageCorrectPositions].sort(), [0, 1, 2, 3], 'question two image answer should reach every A-D position')
  assert.ok(imagePrompts.size > 1, 'question two should vary its target prompt')

  const hearIdentifyTargets = new Set()
  const hearIdentifyCorrectPositions = new Set()
  assert.equal(Object.keys(HEAR_IDENTIFY_VOICE_MAP).length, HEAR_IDENTIFY_LETTERS.length, 'every allowed target must have a dedicated voice mapping')
  assert.ok(fs.existsSync(path.join(root, 'public', HEAR_IDENTIFY_COMMON_VOICE.replace(/^\//, ''))), 'common question voice must exist')
  for (const [letter, voicePath] of Object.entries(HEAR_IDENTIFY_VOICE_MAP)) {
    assert.ok(HEAR_IDENTIFY_LETTERS.includes(letter), `${letter} must be an allowed target`)
    assert.ok(voicePath.startsWith('/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/letters/'))
    assert.ok(fs.existsSync(path.join(root, 'public', voicePath.replace(/^\//, ''))), `missing dedicated voice for ${letter}: ${voicePath}`)
  }
  for (let index = 0; index < 1000; index += 1) {
    const seed = `hear-identify-${index}`
    const [question3, question4] = generateHearIdentifyQuestions({
      seedHash: seed,
      random: createSeededRandom(seed),
    })
    assert.equal(question3.templateId, 'T03')
    assert.equal(question4.templateId, 'T04')
    assert.equal(question3.data.generator, 'HEAR_AND_IDENTIFY_LETTER')
    assert.equal(question4.data.generator, 'HEAR_AND_IDENTIFY_LETTER')
    assert.notEqual(question3.data.target, question4.data.target, `pair ${index} must use different targets`)

    for (const question of [question3, question4]) {
      const choices = question.options.map(option => option.text)
      assert.equal(question.prompt, 'Đây là phát âm của chữ gì?')
      assert.equal(question.options.length, 4)
      assert.equal(new Set(choices).size, 4)
      assert.ok(choices.every(choice => /^Chữ ".+"$/.test(choice)), 'choices should render as plain text in the Chữ "x" format')
      assert.equal(choices.filter(choice => choice === `Chữ "${question.data.target}"`).length, 1)
      assert.equal(question.options.filter(option => option.id === question.correctAnswer).length, 1)
      assert.ok(!(choices.includes('Chữ "i"') && choices.includes('Chữ "y"')), 'i and y must not appear together')
      assert.ok(!(choices.includes('Chữ "g"') && choices.includes('Chữ "gh"')), 'g and gh must not appear together')
      assert.ok(!(choices.includes('Chữ "ng"') && choices.includes('Chữ "ngh"')), 'ng and ngh must not appear together')
      assert.deepEqual(question.promptVoice, [HEAR_IDENTIFY_COMMON_VOICE, HEAR_IDENTIFY_VOICE_MAP[question.data.target]])
      assert.equal(question.promptVoice[1], HEAR_IDENTIFY_VOICE_MAP[question.data.target], 'target voice must be in the mapping')
      hearIdentifyTargets.add(question.data.target)
      hearIdentifyCorrectPositions.add(question.options.findIndex(option => option.id === question.correctAnswer))
    }
  }
  assert.equal(hearIdentifyTargets.size, HEAR_IDENTIFY_LETTERS.length, 'the 1000 pairs should exercise every allowed target')
  assert.deepEqual([...hearIdentifyCorrectPositions].sort(), [0, 1, 2, 3], 'the correct answer should reach every A-D position')

  const tagNameTargets = new Set()
  const tagNameCorrectPositions = new Set()
  assert.equal(TAG_NAME_TARGET_LETTERS.length, 27, 'question five should use the 27 single-letter targets')
  assert.equal(TAG_NAME_COMMON_VOICE, '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common/the-ten-con-vat-nao-co-chu.mp3')
  for (const targetLetter of TAG_NAME_TARGET_LETTERS) {
    const seed = `find-letter-in-animal-name-target-${targetLetter}`
    const question = generateFindLetterInAnimalNameQuestion({
      seedHash: seed,
      random: createSeededRandom(seed),
      targetLetter,
    })
    assert.equal(question.templateId, 'T05')
    assert.equal(question.type, 'image-choice')
    assert.equal(question.data.generator, 'FIND_LETTER_IN_ANIMAL_NAME')
    assert.equal(question.data.targetLetter, targetLetter)
    assert.equal(question.data.manifestId, TAG_NAME_MANIFEST.id)
    assert.equal(question.prompt, `Thẻ tên con vật nào có chữ "${targetLetter}"?`)
    assert.equal(question.options.length, 4)
    assert.equal(new Set(question.options.map(option => option.id)).size, 4)
    assert.equal(new Set(question.options.map(option => option.text)).size, 4)
    const correct = question.options.filter(option => option.id === question.correctAnswer)
    assert.equal(correct.length, 1)
    const correctItem = TAG_NAME_MANIFEST.items.find(item => item.id === correct[0].id.replace(/^tag-name-/, ''))
    assert.equal(correctItem.targetLetter, targetLetter)
    for (const option of question.options) {
      const item = TAG_NAME_MANIFEST.items.find(candidate => candidate.id === option.id.replace(/^tag-name-/, ''))
      assert.ok(item, `unknown tag-name choice ${option.id}`)
      assert.equal(option.text, item.word)
      assert.equal(option.visual.type, 'image')
      assert.equal(option.visual.value, TAG_NAME_MANIFEST.image)
      assert.equal(option.visual.label, item.word)
      assert.deepEqual(option.visual.sprite, {
        spriteSheet: TAG_NAME_MANIFEST.image,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        sheetWidth: TAG_NAME_MANIFEST.width,
        sheetHeight: TAG_NAME_MANIFEST.height,
      })
      if (item.id !== correctItem.id) assert.ok(!item.letters.includes(targetLetter), `${item.word} must not contain distractor target ${targetLetter}`)
    }
    assert.deepEqual(question.promptVoice, [TAG_NAME_COMMON_VOICE, HEAR_IDENTIFY_VOICE_MAP[targetLetter]])
    tagNameTargets.add(targetLetter)
    tagNameCorrectPositions.add(question.options.findIndex(option => option.id === question.correctAnswer))
  }
  assert.equal(tagNameTargets.size, TAG_NAME_TARGET_LETTERS.length, 'direct question-five cases should cover every target')

  for (let index = 0; index < 1000; index += 1) {
    const seed = `find-letter-in-animal-name-${index}`
    const question = generateFindLetterInAnimalNameQuestion({
      seedHash: seed,
      random: createSeededRandom(seed),
    })
    const targetLetter = question.data.targetLetter
    const correctItemId = question.correctAnswer.replace(/^tag-name-/, '')
    assert.ok(TAG_NAME_TARGET_LETTERS.includes(targetLetter), `question-five target ${targetLetter} must be supported`)
    assert.equal(question.options.length, 4)
    assert.equal(question.options.filter(option => option.id === question.correctAnswer).length, 1)
    assert.equal(TAG_NAME_MANIFEST.items.find(item => item.id === correctItemId).targetLetter, targetLetter)
    assert.deepEqual(question.promptVoice, [TAG_NAME_COMMON_VOICE, HEAR_IDENTIFY_VOICE_MAP[targetLetter]])
    for (const option of question.options) {
      const item = TAG_NAME_MANIFEST.items.find(candidate => candidate.id === option.id.replace(/^tag-name-/, ''))
      assert.ok(item)
      if (item.id !== correctItemId) assert.ok(!item.letters.includes(targetLetter), `${item.word} must not contain ${targetLetter}`)
    }
    tagNameTargets.add(targetLetter)
    tagNameCorrectPositions.add(question.options.findIndex(option => option.id === question.correctAnswer))
    validateVoiceAssets({ questions: [question] })
  }
  assert.equal(tagNameTargets.size, TAG_NAME_TARGET_LETTERS.length, '1000 question-five variants should cover every target')
  assert.deepEqual([...tagNameCorrectPositions].sort(), [0, 1, 2, 3], 'question-five answer should reach every A-D position')
  if (!fs.existsSync(path.join(root, 'public', TAG_NAME_COMMON_VOICE.replace(/^\//, ''))))
    console.warn(`WARN voice recording still needed: ${TAG_NAME_COMMON_VOICE}`)

  assert.equal(TONE_SYLLABLE_BANK.length, 30, 'question six should use exactly 30 syllables')
  const syllablesByTone = new Map(VIETNAMESE_TONES.map(tone => [tone, TONE_SYLLABLE_BANK.filter(item => item.tone === tone)]))
  for (const tone of VIETNAMESE_TONES) assert.equal(syllablesByTone.get(tone).length, 5, `${tone} should have five syllables`)
  for (const item of TONE_SYLLABLE_BANK) {
    const seed = `identify-tone-target-${item.text}`
    const question = generateIdentifyToneQuestion({ seedHash: seed, random: createSeededRandom(seed), targetText: item.text })
    const targetVoice = resolveToneSyllableVoice(item.voice)
    assert.equal(question.templateId, 'T06')
    assert.equal(question.type, 'audio-choice')
    assert.equal(question.data.generator, 'IDENTIFY_TONE_FROM_SYLLABLE')
    assert.equal(question.data.target.text, item.text)
    assert.equal(question.data.target.tone, item.tone)
    assert.equal(question.prompt, `Tiếng "${item.text}" mang thanh gì?`)
    assert.equal(question.options.length, 4)
    assert.equal(new Set(question.options.map(option => option.id)).size, 4)
    assert.equal(new Set(question.options.map(option => option.text)).size, 4)
    assert.deepEqual(question.promptVoice, [TONE_QUESTION_VOICE_START, targetVoice, TONE_QUESTION_VOICE_END])
    for (const option of question.options) {
      const tone = VIETNAMESE_TONES.find(value => option.id === `tone-${encodeURIComponent(value)}`)
      assert.ok(tone, `unknown tone option ${option.id}`)
      assert.equal(option.text, TONE_LABELS[tone])
      assert.equal(option.voice, TONE_VOICE_MAP[tone])
    }
    assert.equal(question.correctAnswer, `tone-${encodeURIComponent(item.tone)}`)
    assert.ok(fs.existsSync(path.join(root, 'public', targetVoice.replace(/^\//, ''))), `missing target voice ${targetVoice}`)
    validateVoiceAssets({ questions: [question] })
  }
  assert.throws(() => generateIdentifyToneQuestion({ targetText: 'không có' }), /Unknown tone syllable/)
  assert.throws(() => generateIdentifyToneQuestion({ excludeSyllables: TONE_SYLLABLE_BANK.map(item => item.text) }), /No available syllables/)

  const toneTargets = new Set()
  const toneCorrectPositions = new Set()
  for (let index = 0; index < 1000; index += 1) {
    const seed = `identify-tone-${index}`
    const question = generateIdentifyToneQuestion({ seedHash: seed, random: createSeededRandom(seed) })
    const target = question.data.target
    assert.ok(TONE_SYLLABLE_BANK.some(item => item.text === target.text && item.tone === target.tone && item.voice === target.voice))
    assert.equal(question.options.length, 4)
    assert.equal(new Set(question.options.map(option => option.id)).size, 4)
    assert.equal(question.options.filter(option => option.id === question.correctAnswer).length, 1)
    assert.equal(question.options.find(option => option.id === question.correctAnswer).text, TONE_LABELS[target.tone])
    toneTargets.add(target.tone)
    toneCorrectPositions.add(question.options.findIndex(option => option.id === question.correctAnswer))
    validateVoiceAssets({ questions: [question] })
  }
  assert.equal(toneTargets.size, 6, 'question-six random targets should cover all six tones')
  assert.deepEqual([...toneCorrectPositions].sort(), [0, 1, 2, 3], 'question-six correct option should reach every A-D position')
  console.log('PASS question six: all 30 syllables, five per tone, 1000 random variants, voice files, and A-D answer positions')

  assert.equal(TAG_NAME_MANIFEST.items.length, 27, 'question seven should use all 27 animals in the existing tag-name manifest')
  assert.equal(Object.keys(ANIMAL_VOICE_MAP).length, TAG_NAME_MANIFEST.items.length, 'every manifest animal should have a mapped voice')
  assert.equal(new Set(Object.values(ANIMAL_VOICE_MAP)).size, TAG_NAME_MANIFEST.items.length, 'each manifest animal should map to its own voice file')
  assert.ok(FIND_ANIMAL_BY_NAME_COMMON_VOICE.endsWith('/common/dau-la-con.mp3'))
  assert.ok(fs.existsSync(path.join(root, 'public', FIND_ANIMAL_BY_NAME_COMMON_VOICE.replace(/^\//, ''))), 'question-seven common voice must exist')

  const animalTargets = new Set()
  const animalCorrectPositions = new Set()
  for (const animal of TAG_NAME_MANIFEST.items) {
    const seed = `find-animal-by-name-target-${animal.id}`
    const question = generateFindAnimalByNameQuestion({
      seedHash: seed,
      random: createSeededRandom(seed),
      targetAnimalId: animal.id,
    })
    assert.equal(question.templateId, 'T07')
    assert.equal(question.type, 'image-choice')
    assert.equal(question.data.generator, 'FIND_ANIMAL_BY_NAME')
    assert.equal(question.data.manifestId, TAG_NAME_MANIFEST.id)
    assert.equal(question.data.targetAnimalId, animal.id)
    assert.equal(question.data.targetWord, animal.word)
    assert.equal(question.prompt, `Đâu là con ${animal.word}?`)
    assert.equal(question.options.length, 4)
    assert.equal(new Set(question.options.map(option => option.id)).size, 4)
    assert.ok(question.options.every(option => option.text === undefined), 'animal image choices must not render a word below the sprite')
    assert.equal(question.correctAnswer, `animal-${animal.id}`)
    assert.equal(question.options.filter(option => option.id === question.correctAnswer).length, 1)
    assert.deepEqual(question.promptVoice, [FIND_ANIMAL_BY_NAME_COMMON_VOICE, ANIMAL_VOICE_MAP[animal.word]])
    for (const option of question.options) {
      const animalId = option.id.replace(/^animal-/, '')
      const item = TAG_NAME_MANIFEST.items.find(candidate => candidate.id === animalId)
      assert.ok(item, `unknown question-seven animal ${animalId}`)
      assert.equal(option.visual.type, 'image')
      assert.equal(option.visual.value, TAG_NAME_MANIFEST.image)
      assert.equal(option.visual.label, item.word)
      assert.deepEqual(option.visual.sprite, {
        spriteSheet: TAG_NAME_MANIFEST.image,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        sheetWidth: TAG_NAME_MANIFEST.width,
        sheetHeight: TAG_NAME_MANIFEST.height,
      })
    }
    assert.ok(fs.existsSync(path.join(root, 'public', ANIMAL_VOICE_MAP[animal.word].replace(/^\//, ''))), `missing voice for ${animal.word}`)
    validateVoiceAssets({ questions: [question] })
    animalTargets.add(animal.id)
    animalCorrectPositions.add(question.options.findIndex(option => option.id === question.correctAnswer))
  }
  assert.equal(animalTargets.size, TAG_NAME_MANIFEST.items.length, 'direct question-seven cases should cover all manifest animals')
  assert.throws(() => generateFindAnimalByNameQuestion({ seedHash: 'bad-animal', random: createSeededRandom('bad-animal'), targetAnimalId: 'missing' }), /Unknown animal id/)
  assert.throws(() => generateFindAnimalByNameQuestion({ seedHash: 'no-animals', random: createSeededRandom('no-animals'), excludeAnimalIds: TAG_NAME_MANIFEST.items.map(item => item.id) }), /No available animals/)
  assert.equal(getAnimalDistractors(TAG_NAME_MANIFEST.items[0].id, 3, createSeededRandom('animal-distractors')).length, 3)

  const randomAnimalTargets = new Set()
  for (let index = 0; index < 1000; index += 1) {
    const seed = `find-animal-by-name-${index}`
    const question = generateFindAnimalByNameQuestion({ seedHash: seed, random: createSeededRandom(seed) })
    const targetId = question.data.targetAnimalId
    const target = TAG_NAME_MANIFEST.items.find(item => item.id === targetId)
    assert.ok(target)
    assert.equal(question.options.length, 4)
    assert.equal(new Set(question.options.map(option => option.id)).size, 4)
    assert.equal(question.options.filter(option => option.id === question.correctAnswer).length, 1)
    assert.ok(question.options.some(option => option.id === `animal-${targetId}`))
    assert.ok(question.options.every(option => option.text === undefined))
    assert.equal(question.prompt, `Đâu là con ${target.word}?`)
    randomAnimalTargets.add(targetId)
    animalCorrectPositions.add(question.options.findIndex(option => option.id === question.correctAnswer))
    validateVoiceAssets({ questions: [question] })
  }
  assert.equal(randomAnimalTargets.size, TAG_NAME_MANIFEST.items.length, '1000 question-seven variants should cover every animal target')
  assert.deepEqual([...animalCorrectPositions].sort(), [0, 1, 2, 3], 'question-seven correct answer should reach every A-D position')
  console.log('PASS question seven: all 27 manifest animals, image-only choices, voice paths, 1000 random variants, and A-D answer positions')

  const objectNameSheetPath = path.join(root, 'public', OBJECT_NAME_MANIFEST.image.replace(/^\//, ''))
  assert.equal(OBJECT_NAME_MANIFEST, OBJECT_NAME_JSON)
  assert.equal(OBJECT_NAME_MANIFEST.id, 'trang-nguyen-object-name-tight')
  assert.equal(OBJECT_NAME_MANIFEST.cropMode, 'tight-bounds')
  assert.equal(OBJECT_NAME_MANIFEST.items.length, 27, 'question eight should use all 27 object images')
  assert.ok(fs.existsSync(objectNameSheetPath), 'object-name sprite sheet must exist')
  const objectNameSheet = fs.readFileSync(objectNameSheetPath)
  assert.equal(objectNameSheet.readUInt32BE(16), OBJECT_NAME_MANIFEST.width, 'object-name sheet width must match its manifest')
  assert.equal(objectNameSheet.readUInt32BE(20), OBJECT_NAME_MANIFEST.height, 'object-name sheet height must match its manifest')
  assert.ok(fs.existsSync(path.join(root, 'public', FIND_OBJECT_BY_NAME_COMMON_VOICE.replace(/^\//, ''))), 'question-eight common voice must exist')
  assert.equal(Object.keys(OBJECT_VOICE_MAP).length, OBJECT_NAME_MANIFEST.items.length, 'every object needs a dedicated voice mapping')
  assert.equal(new Set(Object.values(OBJECT_VOICE_MAP)).size, OBJECT_NAME_MANIFEST.items.length, 'each object must map to its own target voice')

  const objectTargets = new Set()
  const objectCorrectPositions = new Set()
  let availableObjectVoices = 0
  for (const object of OBJECT_NAME_MANIFEST.items) {
    const seed = `find-object-by-name-target-${object.id}`
    const question = generateFindObjectByNameQuestion({
      seedHash: seed,
      random: createSeededRandom(seed),
      targetObjectId: object.id,
    })
    const targetVoiceFile = OBJECT_VOICE_MAP[object.id]
    const targetVoiceAvailable = fs.existsSync(path.join(root, 'public', targetVoiceFile.replace(/^\//, '')))
    assert.equal(question.templateId, 'T08')
    assert.equal(question.type, 'image-choice')
    assert.equal(question.data.generator, 'FIND_OBJECT_BY_NAME')
    assert.equal(question.data.manifestId, OBJECT_NAME_MANIFEST.id)
    assert.equal(question.data.targetObjectId, object.id)
    assert.equal(question.data.targetWord, object.word)
    assert.equal(question.data.targetVoiceFileName, targetVoiceFile.slice(targetVoiceFile.lastIndexOf('/') + 1))
    assert.equal(question.data.targetVoiceAvailable, targetVoiceAvailable)
    assert.equal(question.prompt, OBJECT_QUESTION_TEXT[object.id])
    assert.equal(question.options.length, 4)
    assert.equal(new Set(question.options.map(option => option.id)).size, 4)
    assert.ok(question.options.every(option => option.text === undefined), 'object choices must not render a word below the image')
    assert.equal(question.correctAnswer, `object-name-${object.id}`)
    assert.equal(question.options.filter(option => option.id === question.correctAnswer).length, 1)
    assert.deepEqual(question.promptVoice, targetVoiceAvailable
      ? [FIND_OBJECT_BY_NAME_COMMON_VOICE, targetVoiceFile]
      : undefined)
    for (const option of question.options) {
      const item = OBJECT_NAME_MANIFEST.items.find(candidate => candidate.id === option.id.replace(/^object-name-/, ''))
      assert.ok(item, `unknown question-eight object ${option.id}`)
      assert.equal(option.visual.type, 'image')
      assert.equal(option.visual.value, OBJECT_NAME_MANIFEST.image)
      assert.equal(option.visual.label, item.word)
      assert.deepEqual(option.visual.sprite, {
        spriteSheet: OBJECT_NAME_MANIFEST.image,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        sheetWidth: OBJECT_NAME_MANIFEST.width,
        sheetHeight: OBJECT_NAME_MANIFEST.height,
      })
    }
    validateVoiceAssets({ questions: [question] })
    objectTargets.add(object.id)
    objectCorrectPositions.add(question.options.findIndex(option => option.id === question.correctAnswer))
    if (targetVoiceAvailable) availableObjectVoices += 1
  }
  assert.equal(objectTargets.size, OBJECT_NAME_MANIFEST.items.length, 'direct question-eight cases should cover every object')
  assert.deepEqual([...objectCorrectPositions].sort(), [0, 1, 2, 3], 'question-eight correct answer should reach every A-D position')
  assert.throws(() => generateFindObjectByNameQuestion({ seedHash: 'bad-object', random: createSeededRandom('bad-object'), targetObjectId: 'missing' }), /Unknown object id/)
  assert.throws(() => generateFindObjectByNameQuestion({ seedHash: 'no-objects', random: createSeededRandom('no-objects'), excludeObjectIds: OBJECT_NAME_MANIFEST.items.map(item => item.id) }), /No available objects/)

  const uniqueTestTargets = new Set()
  const testTargets = []
  for (let index = 0; index < 10; index += 1) {
    const seed = `find-object-by-name-test-route-${index}`
    const question = generateFindObjectByNameQuestion({
      seedHash: seed,
      random: createSeededRandom(seed),
      excludeObjectIds: [...uniqueTestTargets],
    })
    uniqueTestTargets.add(question.data.targetObjectId)
    testTargets.push(question.data.targetObjectId)
  }
  assert.equal(testTargets.length, 10)
  assert.equal(uniqueTestTargets.size, 10, 'the question-eight test route should show ten different targets')

  const randomObjectTargets = new Set()
  for (let index = 0; index < 1000; index += 1) {
    const seed = `find-object-by-name-${index}`
    const question = generateFindObjectByNameQuestion({ seedHash: seed, random: createSeededRandom(seed) })
    const targetId = question.data.targetObjectId
    assert.equal(question.options.length, 4)
    assert.equal(question.options.filter(option => option.id === question.correctAnswer).length, 1)
    assert.ok(question.options.some(option => option.id === `object-name-${targetId}`))
    assert.ok(question.options.every(option => option.text === undefined))
    assert.equal(question.prompt, OBJECT_QUESTION_TEXT[targetId])
    randomObjectTargets.add(targetId)
    objectCorrectPositions.add(question.options.findIndex(option => option.id === question.correctAnswer))
    validateVoiceAssets({ questions: [question] })
  }
  assert.equal(randomObjectTargets.size, OBJECT_NAME_MANIFEST.items.length, '1000 question-eight variants should cover all object targets')
  assert.deepEqual([...objectCorrectPositions].sort(), [0, 1, 2, 3], 'question-eight correct answer should reach every A-D position')
  console.log(`PASS question eight: all 27 tight-cropped object images, unique ten-question test batches, 1000 random variants, and A-D answer positions; ${availableObjectVoices}/27 target voices available`)

  const flowerNameSheetPath = path.join(root, 'public', FLOWER_NAME_MANIFEST.image.replace(/^\//, ''))
  assert.equal(FLOWER_NAME_MANIFEST, FLOWER_NAME_JSON)
  assert.equal(FLOWER_NAME_MANIFEST.id, 'trang-nguyen-flower-name-tight')
  assert.equal(FLOWER_NAME_MANIFEST.cropMode, 'tight-bounds')
  assert.equal(FLOWER_NAME_MANIFEST.items.length, 8, 'question nine should use all eight flower images')
  assert.ok(fs.existsSync(flowerNameSheetPath), 'flower-name sprite sheet must exist')
  const flowerNameSheet = fs.readFileSync(flowerNameSheetPath)
  assert.equal(flowerNameSheet.readUInt32BE(16), FLOWER_NAME_MANIFEST.width, 'flower-name sheet width must match its manifest')
  assert.equal(flowerNameSheet.readUInt32BE(20), FLOWER_NAME_MANIFEST.height, 'flower-name sheet height must match its manifest')
  assert.ok(fs.existsSync(path.join(root, 'public', FIND_FLOWER_BY_IMAGE_COMMON_VOICE.replace(/^\//, ''))), 'question-nine prompt voice must exist')
  assert.equal(Object.keys(FLOWER_NAME_VOICE_MAP).length, FLOWER_NAME_MANIFEST.items.length, 'each flower needs a dedicated voice mapping')
  assert.equal(new Set(Object.values(FLOWER_NAME_VOICE_MAP)).size, FLOWER_NAME_MANIFEST.items.length, 'each flower must map to its own voice')

  const flowerTargets = new Set()
  const flowerCorrectPositions = new Set()
  for (const flower of FLOWER_NAME_MANIFEST.items) {
    const seed = `find-flower-by-image-target-${flower.id}`
    const question = generateFindFlowerByImageQuestion({ seedHash: seed, random: createSeededRandom(seed), targetFlowerId: flower.id })
    const targetVoice = FLOWER_NAME_VOICE_MAP[flower.id]
    assert.equal(question.templateId, 'T09')
    assert.equal(question.type, 'image-choice')
    assert.equal(question.data.generator, 'FIND_FLOWER_BY_IMAGE')
    assert.equal(question.data.manifestId, FLOWER_NAME_MANIFEST.id)
    assert.equal(question.data.targetFlowerId, flower.id)
    assert.equal(question.data.imageId, flower.id)
    assert.equal(question.data.targetWord, flower.word)
    assert.equal(question.prompt, 'Đây là hoa gì?')
    assert.equal(question.knowledgeKey, 'FLOWER_RECOGNITION')
    assert.equal(question.content.type, 'visual')
    assert.equal(question.content.visual.label, 'Hình bông hoa')
    assert.deepEqual(question.content.visual.sprite, {
      spriteSheet: FLOWER_NAME_MANIFEST.image,
      x: flower.x,
      y: flower.y,
      width: flower.width,
      height: flower.height,
      sheetWidth: FLOWER_NAME_MANIFEST.width,
      sheetHeight: FLOWER_NAME_MANIFEST.height,
    })
    assert.deepEqual(question.promptVoice, [FIND_FLOWER_BY_IMAGE_COMMON_VOICE])
    assert.equal(question.options.length, 4)
    assert.equal(new Set(question.options.map(option => option.id)).size, 4)
    assert.deepEqual(question.options.map(option => option.label).sort(), ['A', 'B', 'C', 'D'])
    assert.equal(question.correctAnswer, `flower-name-${flower.id}`)
    assert.equal(question.options.filter(option => option.id === question.correctAnswer).length, 1)
    assert.ok(question.options.some(option => option.id === question.correctAnswer))
    assert.ok(question.options.every(option => option.visual === undefined), 'flower answer rows should not show images')
    assert.ok(question.options.every(option => option.text === FLOWER_NAME_MANIFEST.items.find(item => `flower-name-${item.id}` === option.id).word))
    for (const option of question.options) {
      const item = FLOWER_NAME_MANIFEST.items.find(candidate => option.id === `flower-name-${candidate.id}`)
      assert.ok(item, `unknown question-nine flower ${option.id}`)
      assert.equal(option.voice, FLOWER_NAME_VOICE_MAP[item.id])
    }
    validateVoiceAssets({ questions: [question] })
    flowerTargets.add(flower.id)
    flowerCorrectPositions.add(question.options.findIndex(option => option.id === question.correctAnswer))
  }
  assert.equal(flowerTargets.size, FLOWER_NAME_MANIFEST.items.length, 'direct question-nine cases should cover all flower targets')
  assert.deepEqual([...flowerCorrectPositions].sort(), [0, 1, 2, 3], 'question-nine correct answer should reach every A-D position')
  const uniqueFlowerBatch = new Set()
  for (let index = 0; index < FLOWER_NAME_MANIFEST.items.length; index += 1) {
    const seed = `find-flower-test-batch-${index}`
    const question = generateFindFlowerByImageQuestion({
      seedHash: seed,
      random: createSeededRandom(seed),
      excludeFlowerIds: [...uniqueFlowerBatch],
    })
    uniqueFlowerBatch.add(question.data.targetFlowerId)
  }
  assert.equal(uniqueFlowerBatch.size, 8, 'an eight-question test batch should use every flower target once')
  assert.throws(() => generateFindFlowerByImageQuestion({ seedHash: 'flower-test-batch-full', random: createSeededRandom('flower-test-batch-full'), excludeFlowerIds: [...uniqueFlowerBatch] }), /No available flowers/)
  assert.throws(() => generateFindFlowerByImageQuestion({ seedHash: 'bad-flower', random: createSeededRandom('bad-flower'), targetFlowerId: 'missing' }), /Unknown flower id/)
  assert.throws(() => generateFindFlowerByImageQuestion({ seedHash: 'no-flowers', random: createSeededRandom('no-flowers'), excludeFlowerIds: FLOWER_NAME_MANIFEST.items.map(item => item.id) }), /No available flowers/)

  for (let index = 0; index < 1000; index += 1) {
    const seed = `find-flower-by-image-${index}`
    const question = generateFindFlowerByImageQuestion({ seedHash: seed, random: createSeededRandom(seed) })
    const targetId = question.data.targetFlowerId
    assert.equal(question.options.length, 4)
    assert.equal(new Set(question.options.map(option => option.id)).size, 4)
    assert.equal(question.options.filter(option => option.id === question.correctAnswer).length, 1)
    assert.ok(question.options.some(option => option.id === `flower-name-${targetId}`))
    assert.ok(question.options.every(option => option.text && option.voice && option.visual === undefined))
    assert.equal(question.prompt, 'Đây là hoa gì?')
    flowerTargets.add(targetId)
    flowerCorrectPositions.add(question.options.findIndex(option => option.id === question.correctAnswer))
    validateVoiceAssets({ questions: [question] })
  }
  assert.equal(flowerTargets.size, FLOWER_NAME_MANIFEST.items.length, 'random question-nine variants should cover all eight flower targets')
  assert.deepEqual([...flowerCorrectPositions].sort(), [0, 1, 2, 3], 'random question-nine correct answer should reach every A-D position')
  console.log('PASS question nine: all eight tight-cropped flowers, unique voice-only answer choices, voice paths, 1000 random variants, and A-D answer positions')

  assert.equal(fs.existsSync(path.join(root, 'public', FIND_LETTERS_IN_IMAGE_COMMON_VOICE.replace(/^\//, ''))), true, 'question-ten prompt voice must exist')
  const targetLetterSetKey = letters => [...letters].sort((left, right) => VIETNAMESE_ALPHABET.indexOf(left) - VIETNAMESE_ALPHABET.indexOf(right)).join('|')
  const letterTargetSets = new Set()
  for (let index = 0; index < 1000; index += 1) {
    const seed = `recognize-letters-in-image-${index}`
    const question = generateFindLettersInImageQuestion({ seedHash: seed, random: createSeededRandom(seed) })
    const targetLetters = question.data.targetLetters
    const optionIds = question.options.map(option => option.id)
    assert.equal(question.templateId, 'T10')
    assert.equal(question.type, 'multi-select')
    assert.equal(question.prompt, 'Những chữ cái nào có trong hình dưới đây?')
    assert.equal(targetLetters.length, 3)
    assert.equal(new Set(targetLetters).size, 3)
    assert.ok(targetLetters.every(letter => VIETNAMESE_ALPHABET.includes(letter)))
    assert.equal(question.data.board.letters.length, 3)
    assert.equal(new Set(question.data.board.letters.map(item => item.slot)).size, 3)
    assert.deepEqual([...question.data.board.letters.map(item => item.letter)].sort(), [...targetLetters].sort())
    assert.equal(question.data.board.decorations.length, 4)
    assert.equal(new Set(question.data.board.decorations).size, 4)
    assert.ok(question.data.board.decorations.every(item => LETTER_BOARD_DECORATIONS.includes(item)))
    assert.equal(question.options.length, 5)
    assert.equal(new Set(optionIds).size, 5)
    assert.deepEqual(question.options.map(option => option.label).sort(), ['A', 'B', 'C', 'D', 'E'])
    assert.equal(question.correctAnswer.length, 3)
    assert.equal(new Set(question.correctAnswer).size, 3)
    assert.deepEqual([...question.correctAnswer].sort(), targetLetters.map(letter => `letter-${letter}`).sort())
    assert.ok(question.options.every(option => option.text === `Chữ "${option.id.slice('letter-'.length)}"` && option.visual === undefined && option.voice === undefined))
    assert.equal(question.data.promptVoiceAvailable, true)
    assert.equal(question.promptVoice, FIND_LETTERS_IN_IMAGE_COMMON_VOICE)
    assert.equal(gradeQuestion(question, question.correctAnswer), true)
    assert.equal(gradeQuestion(question, question.correctAnswer.slice(0, 2)), false, 'question ten must reject an incomplete selection')
    const distractor = question.options.find(option => !question.correctAnswer.includes(option.id))
    assert.equal(gradeQuestion(question, [...question.correctAnswer, distractor.id]), false, 'question ten must reject an extra distractor')
    assert.equal(gradeQuestion(question, [...question.correctAnswer, question.correctAnswer[0]]), false, 'question ten must reject duplicate selected ids')
    letterTargetSets.add(targetLetterSetKey(targetLetters))
  }
  assert.ok(letterTargetSets.size > 1, 'question-ten target letters should vary across random variants')
  const uniqueLetterSetBatch = new Set()
  for (let index = 0; index < 12; index += 1) {
    const seed = `recognize-letters-in-image-batch-${index}`
    const question = generateFindLettersInImageQuestion({ seedHash: seed, random: createSeededRandom(seed), excludeTargetSetKeys: [...uniqueLetterSetBatch] })
    uniqueLetterSetBatch.add(targetLetterSetKey(question.data.targetLetters))
  }
  assert.equal(uniqueLetterSetBatch.size, 12, 'question-ten generator should avoid repeating target sets in a batch')
  console.log('PASS question ten: three unique board letters, four corner decorations, five A-E options, exact set scoring, random target sets, and prompt voice')

  assert.equal(fs.existsSync(path.join(root, 'public', RECOGNIZE_NUMBER_PROMPT_VOICE.replace(/^\//, ''))), true, 'question-eleven prompt voice must exist')
  const numberTargets = new Set()
  for (const value of NUMBER_CARD_VALUES) {
    const seed = `recognize-number-on-card-${value}`
    const question = generateRecognizeNumberOnCardQuestion({ seedHash: seed, random: createSeededRandom(seed), targetValue: value })
    assert.equal(question.templateId, 'T11')
    assert.equal(question.type, 'number-input')
    assert.equal(question.prompt, 'Điền số thích hợp vào chỗ trống.')
    assert.equal(question.knowledgeKey, 'RECOGNIZE_NUMBER')
    assert.equal(question.data.targetValue, value)
    assert.equal(question.data.card.value, value)
    assert.equal(question.data.card.decorations.length, 4)
    assert.equal(new Set(question.data.card.decorations).size, 4)
    assert.ok(question.data.card.decorations.every(item => NUMBER_CARD_DECORATIONS.includes(item)))
    assert.ok(NUMBER_CARD_COLORS.includes(question.data.card.color))
    assert.equal(question.correctAnswer, String(value))
    assert.equal(question.promptVoice, RECOGNIZE_NUMBER_PROMPT_VOICE)
    assert.equal(question.data.promptVoiceAvailable, true)
    assert.equal(gradeQuestion(question, String(value)), true)
    assert.equal(gradeQuestion(question, String((value + 1) % 11)), false)
    assert.equal(isQuestionAnswered(question, undefined), false)
    assert.equal(isQuestionAnswered(question, ''), false)
    assert.equal(isQuestionAnswered(question, String(value)), true)
    numberTargets.add(value)
    validateVoiceAssets({ questions: [question] })
  }
  assert.equal(numberTargets.size, 11, 'question-eleven pool should cover zero through ten')
  const uniqueNumberBatch = new Set()
  for (let index = 0; index < NUMBER_CARD_VALUES.length; index += 1) {
    const seed = `recognize-number-on-card-batch-${index}`
    const question = generateRecognizeNumberOnCardQuestion({ seedHash: seed, random: createSeededRandom(seed), excludeNumbers: [...uniqueNumberBatch] })
    uniqueNumberBatch.add(question.data.targetValue)
  }
  assert.equal(uniqueNumberBatch.size, 11, 'question eleven should avoid repeating numbers until the pool is exhausted')
  assert.throws(() => generateRecognizeNumberOnCardQuestion({ seedHash: 'number-pool-empty', random: createSeededRandom('number-pool-empty'), excludeNumbers: [...NUMBER_CARD_VALUES] }), /No available numbers/)
  assert.throws(() => generateRecognizeNumberOnCardQuestion({ seedHash: 'number-out-of-range', random: createSeededRandom('number-out-of-range'), targetValue: 11 }), /Unknown number/)
  console.log('PASS question eleven: values 0–10, numeric answer scoring including zero, decorations, colors, and prompt voice')

  assert.ok(fs.existsSync(path.join(root, 'public', FILL_LETTER_IN_BLANK_COMMON_VOICE.replace(/^\//, ''))), 'question-twelve prompt voice must exist')
  assert.equal(LETTER_INPUT_ALLOWED_LETTERS.length, 29, 'question twelve should use the Vietnamese alphabet')
  assert.equal(new Set(LETTER_INPUT_ALLOWED_LETTERS).size, LETTER_INPUT_ALLOWED_LETTERS.length, 'question-twelve letter pool must be unique')
  const letterTargets = new Set()
  const letterCardShapes = new Set()
  for (const letter of LETTER_INPUT_ALLOWED_LETTERS) {
    const seed = `fill-letter-in-blank-target-${letter}`
    const question = generateFillLetterInBlankQuestion({ seedHash: seed, random: createSeededRandom(seed), targetLetter: letter })
    const target = question.data.target
    assert.equal(question.templateId, 'T12')
    assert.equal(question.type, 'text-input')
    assert.equal(question.data.generator, 'FILL_LETTER_IN_BLANK')
    assert.equal(question.data.subType, 'letter-input')
    assert.equal(question.prompt, 'Điền chữ cái thích hợp vào chỗ trống.')
    assert.equal(question.knowledgeKey, 'RECOGNIZE_LETTER')
    assert.equal(question.promptVoice, FILL_LETTER_IN_BLANK_COMMON_VOICE)
    assert.equal(question.correctAnswer, letter)
    assert.equal(target.letter, letter)
    assert.ok(LETTER_CARD_SHAPES.includes(target.shape))
    assert.ok(LETTER_CARD_COLORS.includes(target.color))
    assert.ok(LETTER_CARD_BORDER_COLORS.includes(target.borderColor))
    assert.ok(target.decorations.length >= 1 && target.decorations.length <= 3)
    assert.equal(new Set(target.decorations.map(item => item.icon)).size, target.decorations.length)
    assert.equal(new Set(target.decorations.map(item => item.position)).size, target.decorations.length)
    assert.ok(target.decorations.every(item => LETTER_CARD_DECORATION_ICONS.includes(item.icon)))
    assert.deepEqual(question.data.allowedLetters, [...LETTER_INPUT_ALLOWED_LETTERS])
    assert.equal(question.options, undefined, 'question twelve must be an input, not a choice question')
    assert.equal(gradeQuestion(question, letter.toLocaleUpperCase('vi-VN')), true, 'question twelve grading should ignore case')
    assert.equal(gradeQuestion(question, LETTER_INPUT_ALLOWED_LETTERS.find(candidate => candidate !== letter)), false)
    assert.equal(isQuestionAnswered(question, undefined), false)
    assert.equal(isQuestionAnswered(question, ''), false)
    assert.equal(isQuestionAnswered(question, letter), true)
    validateFillLetterInBlankQuestion(question)
    validateVoiceAssets({ questions: [question] })
    letterTargets.add(target.letter)
    letterCardShapes.add(target.shape)
  }
  assert.equal(letterTargets.size, LETTER_INPUT_ALLOWED_LETTERS.length, 'question twelve should support every Vietnamese letter')
  assert.deepEqual([...letterCardShapes].sort(), [...LETTER_CARD_SHAPES].sort(), 'random cards should cover all three shapes')
  assert.equal(sanitizeSingleVietnameseLetter(' T ', LETTER_INPUT_ALLOWED_LETTERS), 't')
  assert.equal(sanitizeSingleVietnameseLetter('Ư', LETTER_INPUT_ALLOWED_LETTERS), 'ư')
  assert.equal(sanitizeSingleVietnameseLetter('ab', LETTER_INPUT_ALLOWED_LETTERS), 'a', 'input sanitizing should keep only the first letter')
  assert.equal(sanitizeSingleVietnameseLetter('12', LETTER_INPUT_ALLOWED_LETTERS), '')
  assert.equal(sanitizeSingleVietnameseLetter('?', LETTER_INPUT_ALLOWED_LETTERS), '')

  const usedLetters = new Set()
  for (let index = 0; index < 10; index += 1) {
    const seed = `fill-letter-in-blank-test-batch-${index}`
    const question = generateFillLetterInBlankQuestion({ seedHash: seed, random: createSeededRandom(seed), excludeLetters: [...usedLetters] })
    assert.ok(!usedLetters.has(question.data.target.letter), 'question-twelve test batch must not repeat letters')
    usedLetters.add(question.data.target.letter)
  }
  assert.equal(usedLetters.size, 10, 'question-twelve test route should generate ten unique letters')

  const letterExam = generateMockTrangNguyenExam({ seed: 'letter-answer-validation' })
  const questionTwelve = letterExam.questions[11]
  assert.equal(isValidTrangNguyenAnswerMap({ [questionTwelve.id]: questionTwelve.correctAnswer.toLocaleUpperCase('vi-VN') }, letterExam), true)
  assert.equal(isValidTrangNguyenAnswerMap({ [questionTwelve.id]: 'ab' }, letterExam), false)
  assert.equal(isValidTrangNguyenAnswerMap({ [questionTwelve.id]: '12' }, letterExam), false)
  assert.equal(isValidTrangNguyenAnswerMap({ [questionTwelve.id]: '?' }, letterExam), false)
  console.log('PASS question twelve: 29 Vietnamese letters, three random card shapes, bounded decorations, prompt voice, sanitized input, case-insensitive grading, and unique ten-question test batches')

  assert.ok(fs.existsSync(path.join(root, 'public', COUNT_TARGET_LETTER_PREFIX_VOICE.replace(/^\//, ''))), 'question-thirteen count prompt voice must exist')
  assert.ok(fs.existsSync(path.join(root, 'public', RECOGNIZE_NUMBER_PROMPT_VOICE.replace(/^\//, ''))), 'question-thirteen number instruction voice must exist')
  const countTargetLetters = new Set()
  const countBoardColors = new Set()
  const countBoardSizes = new Set()
  for (const letter of FIND_TARGET_SINGLE_LETTERS) {
    const seed = `count-target-letter-${letter}`
    const question = generateCountTargetLetterQuestion({ seedHash: seed, random: createSeededRandom(seed), targetLetter: letter })
    const items = question.data.boardItems
    const targetCount = items.filter(item => item.kind === 'letter' && item.value === letter).length
    const noiseCounts = new Map()
    for (const item of items) {
      assert.ok(['letter', 'number', 'icon'].includes(item.kind))
      assert.ok(Number.isFinite(item.x) && item.x >= 0 && item.x <= 100)
      assert.ok(Number.isFinite(item.y) && item.y >= 0 && item.y <= 100)
      assert.ok(COUNT_TARGET_LETTER_COLORS.includes(item.color))
      assert.ok(item.size >= 20 && item.size <= 36)
      assert.ok(item.rotation >= -12 && item.rotation <= 12)
      assert.equal(Object.hasOwn(item, 'isTarget'), false, 'board items must not expose a target flag')
      assert.equal(Object.hasOwn(item, 'answer'), false, 'board items must not expose an answer')
      countBoardColors.add(item.color)
      countBoardSizes.add(item.size)
      if (item.kind === 'letter' && item.value !== letter)
        noiseCounts.set(item.value, (noiseCounts.get(item.value) ?? 0) + 1)
    }
    assert.equal(question.templateId, 'T13')
    assert.equal(question.type, 'number-input')
    assert.equal(question.data.generator, 'COUNT_TARGET_LETTER')
    assert.equal(question.data.subType, 'count-letter')
    assert.equal(question.prompt, COUNT_TARGET_LETTER_PROMPT)
    assert.equal(question.knowledgeKey, 'COUNT_TARGET_LETTER')
    assert.equal(question.promptVoice, RECOGNIZE_NUMBER_PROMPT_VOICE)
    assert.equal(question.data.prefixText, COUNT_TARGET_LETTER_PREFIX_TEXT)
    assert.equal(question.data.prefixVoice, COUNT_TARGET_LETTER_PREFIX_VOICE)
    assert.equal(question.data.targetLetterVoice, resolveFindTargetLetterVoice(letter))
    assert.equal(items.length, COUNT_TARGET_LETTER_TOTAL_ITEMS)
    assert.equal(question.data.boardColumns, COUNT_TARGET_LETTER_GRID_SIZE)
    assert.ok(targetCount >= 5 && targetCount <= 8)
    assert.equal(String(question.correctAnswer), String(targetCount))
    assert.equal(items.filter(item => item.kind === 'number').length, 7)
    const iconCount = items.filter(item => item.kind === 'icon').length
    assert.ok(iconCount >= 4 && iconCount <= 6)
    assert.ok(items.filter(item => item.kind === 'letter' && item.value !== letter).length >= 17)
    assert.ok(items.filter(item => item.kind === 'letter' && item.value !== letter).length <= 18)
    assert.ok([...noiseCounts.values()].every(count => count <= 3 && count < targetCount))
    assert.ok(items.some(item => item.kind === 'icon' && COUNT_TARGET_LETTER_ICONS.includes(item.value)))
    const rows = Array(COUNT_TARGET_LETTER_GRID_SIZE).fill(0)
    const columns = Array(COUNT_TARGET_LETTER_GRID_SIZE).fill(0)
    for (const item of items) {
      rows[Math.floor(item.y * COUNT_TARGET_LETTER_GRID_SIZE / 100)] += 1
      columns[Math.floor(item.x * COUNT_TARGET_LETTER_GRID_SIZE / 100)] += 1
    }
    assert.deepEqual(rows, Array(COUNT_TARGET_LETTER_GRID_SIZE).fill(COUNT_TARGET_LETTER_GRID_SIZE), 'board items should cover all six rows')
    assert.deepEqual(columns, Array(COUNT_TARGET_LETTER_GRID_SIZE).fill(COUNT_TARGET_LETTER_GRID_SIZE), 'board items should cover all six columns')
    assert.equal(question.options, undefined, 'question thirteen must be an input, not a choice question')
    assert.equal(gradeQuestion(question, String(targetCount)), true)
    assert.equal(gradeQuestion(question, String((targetCount + 1) % 10)), false)
    validateCountTargetLetterQuestion(question)
    validateVoiceAssets({ questions: [question] })
    countTargetLetters.add(letter)
  }
  assert.equal(countTargetLetters.size, FIND_TARGET_SINGLE_LETTERS.length, 'question thirteen should have a recorded voice for every eligible target')
  assert.ok(countBoardColors.size > 1, 'board items should use varied colors')
  assert.ok(countBoardSizes.size > 1, 'board items should use varied sizes')
  assert.equal(COUNT_TARGET_LETTER_ICONS.length >= 6, true, 'board should have a varied icon pool')

  const uniqueCountTargets = new Set()
  for (let index = 0; index < 10; index += 1) {
    const seed = `count-target-letter-test-batch-${index}`
    const question = generateCountTargetLetterQuestion({ seedHash: seed, random: createSeededRandom(seed), excludeTargetLetters: [...uniqueCountTargets] })
    assert.equal(uniqueCountTargets.has(question.data.targetLetter), false, 'question-thirteen test batch must not repeat target letters')
    uniqueCountTargets.add(question.data.targetLetter)
  }
  assert.equal(uniqueCountTargets.size, 10, 'question-thirteen test route should generate ten unique target letters')

  const countExam = generateMockTrangNguyenExam({ seed: 'count-letter-answer-validation' })
  const questionThirteen = countExam.questions[12]
  assert.equal(isValidTrangNguyenAnswerMap({ [questionThirteen.id]: questionThirteen.correctAnswer }, countExam), true)
  assert.equal(isValidTrangNguyenAnswerMap({ [questionThirteen.id]: 'abc' }, countExam), false)
  assert.equal(isValidTrangNguyenAnswerMap({ [questionThirteen.id]: '123' }, countExam), false)
  assert.equal(isValidTrangNguyenAnswerMap({ [questionThirteen.id]: ' ' }, countExam), false)
  const q11Input = fs.readFileSync(path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_components/renderers/NumberInputQuestion.tsx'), 'utf8')
  const q12Input = fs.readFileSync(path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_components/renderers/LetterInputQuestion.tsx'), 'utf8')
  const q13Input = fs.readFileSync(path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_components/renderers/CountLetterInputQuestion.tsx'), 'utf8')
  const genericTextInput = fs.readFileSync(path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_components/renderers/TextInputQuestion.tsx'), 'utf8')
  for (const [number, source] of [[11, q11Input], [12, q12Input], [13, q13Input]]) {
    assert.match(source, /type="text"/, `question ${number} input must use text type`)
    assert.match(source, /styles\.numberCardAnswerInput/, `question ${number} input must share the approved answer style`)
  }
  assert.match(q13Input, /inputMode="numeric"/, 'question thirteen should request numeric keyboard')
  assert.match(q13Input, /styles\.countLetterAnswerPrefix/, 'question thirteen prompt prefix should have the shared prompt style')
  assert.match(genericTextInput, /className={styles\.numberCardAnswerInput}/, 'generic text-answer input should use the question-eleven style')
  const q13Styles = fs.readFileSync(path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_components/exam.module.css'), 'utf8')
  assert.match(q13Styles, /\.countLetterAnswerPrefix\s*\{[^}]*font-size:\s*20px;[^}]*font-weight:\s*400;/s, 'question thirteen prefix should match the question prompt font size and weight')
  console.log('PASS question thirteen: 36-cell 6×6 random board, balanced target counts, mixed letters/numbers/icons, voice sequence, text input style, grading, and unique ten-question test batches')

  assert.ok(fs.existsSync(path.join(root, 'public', HIDDEN_LETTER_INTRO_VOICE.replace(/^\//, ''))), 'question-fourteen intro voice must exist')
  assert.ok(fs.existsSync(path.join(root, 'public', HIDDEN_LETTER_PROMPT_VOICE.replace(/^\//, ''))), 'question-fourteen input instruction voice must exist')
  assert.ok(HIDDEN_LETTER_CONTAINER_POOL.length >= 4, 'question fourteen should reuse several existing picture assets')
  for (const container of HIDDEN_LETTER_CONTAINER_POOL)
    assert.ok(fs.existsSync(path.join(root, 'public', container.voice.replace(/^\//, ''))), `question-fourteen container voice should exist: ${container.voice}`)
  const questionFourteenIntroVoiceExists = fs.existsSync(path.join(root, 'public', HIDDEN_LETTER_INTRO_VOICE.replace(/^\//, '')))
  const missingHiddenRelationVoices = Object.values(HIDDEN_LETTER_RELATION_VOICE_MAP).filter(voice => !fs.existsSync(path.join(root, 'public', voice.replace(/^\//, ''))))
  const hiddenRelations = new Set()
  const hiddenCategories = new Set()
  for (const container of HIDDEN_LETTER_CONTAINER_POOL) {
    for (const relation of container.allowedRelations) {
      const seed = `find-hidden-letter-${container.id}-${relation}`
      const question = generateFindHiddenLetterQuestion({
        seedHash: seed,
        random: createSeededRandom(seed),
        targetLetter: 'a',
        containerId: container.id,
        relation,
      })
      const data = question.data
      const scene = data.scene
      const hiddenLetters = scene.letters.filter(item => item.value === question.correctAnswer)
      assert.equal(question.templateId, 'T14')
      assert.equal(question.type, 'hidden-letter-input')
      assert.equal(data.generator, 'FIND_HIDDEN_LETTER')
      assert.equal(data.subType, 'hidden-letter')
      assert.equal(question.prompt, 'Điền chữ cái thích hợp vào chỗ trống.')
      assert.equal(question.promptVoice, HIDDEN_LETTER_PROMPT_VOICE)
      assert.equal(question.knowledgeKey, 'FIND_HIDDEN_LETTER')
      assert.equal(data.introText, HIDDEN_LETTER_INTRO_TEXT)
      assert.equal(data.introVoice, HIDDEN_LETTER_INTRO_VOICE)
      assert.match(data.questionText, new RegExp(`(?:trong|sau|dưới|cạnh) ${container.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
      assert.equal(scene.container.id, container.id)
      assert.equal(scene.container.category, container.category)
      assert.equal(scene.relation, relation)
      assert.equal(hiddenLetters.length, 1, 'exactly one scene letter should be the answer')
      assert.ok(scene.letters.length >= 7 && scene.letters.length <= 11)
      assert.equal(scene.letters.length - hiddenLetters.length, scene.letters.filter(item => item.value !== question.correctAnswer).length)
      assert.ok(scene.letters.every(item => HIDDEN_LETTER_COLORS.includes(item.color)))
      assert.ok(scene.letters.every(item => !Object.hasOwn(item, 'isTarget') && !Object.hasOwn(item, 'answer')))
      assert.ok(Array.isArray(data.allowedLetters) && data.allowedLetters.includes(question.correctAnswer))
      assert.equal(data.questionVoiceAvailable, questionFourteenIntroVoiceExists)
      assert.deepEqual(data.questionVoice, questionFourteenIntroVoiceExists ? [HIDDEN_LETTER_INTRO_VOICE, container.voice] : undefined)
      assert.ok(fs.existsSync(path.join(root, 'public', HIDDEN_LETTER_RELATION_VOICE_MAP[relation].replace(/^\//, ''))) === !missingHiddenRelationVoices.includes(HIDDEN_LETTER_RELATION_VOICE_MAP[relation]))
      assert.equal(gradeQuestion(question, 'A'), true, 'hidden-letter grading should be case-insensitive')
      assert.equal(gradeQuestion(question, 'b'), false)
      validateFindHiddenLetterQuestion(question)
      validateVoiceAssets({ questions: [question] })
      hiddenRelations.add(relation)
      hiddenCategories.add(container.category)
    }
  }
  assert.deepEqual([...hiddenRelations], ['inside'])
  assert.deepEqual([...hiddenCategories].sort(), ['flower', 'object'])
  const usedHiddenPairs = new Set()
  for (let index = 0; index < 10; index += 1) {
    const seed = `find-hidden-letter-test-batch-${index}`
    const question = generateFindHiddenLetterQuestion({ seedHash: seed, random: createSeededRandom(seed), excludeCombinations: [...usedHiddenPairs] })
    const scene = question.data.scene
    const combination = `${question.correctAnswer}:${scene.container.id}:${scene.relation}`
    assert.equal(usedHiddenPairs.has(combination), false, 'question-fourteen test batch should not repeat a letter/container/relation pair')
    usedHiddenPairs.add(combination)
  }
  assert.equal(usedHiddenPairs.size, 10, 'question-fourteen test route should generate ten different combinations')
  const hiddenExam = generateMockTrangNguyenExam({ seed: 'hidden-letter-answer-validation' })
  const questionFourteen = hiddenExam.questions[13]
  assert.equal(isValidTrangNguyenAnswerMap({ [questionFourteen.id]: questionFourteen.correctAnswer.toLocaleUpperCase('vi-VN') }, hiddenExam), true)
  assert.equal(isValidTrangNguyenAnswerMap({ [questionFourteen.id]: 'ab' }, hiddenExam), false)
  assert.equal(isValidTrangNguyenAnswerMap({ [questionFourteen.id]: '?' }, hiddenExam), false)
  const q14Input = fs.readFileSync(path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_components/renderers/HiddenLetterInputQuestion.tsx'), 'utf8')
  assert.match(q14Input, /type="text"/, 'question fourteen input must use text type')
  assert.match(q14Input, /styles\.numberCardAnswerInput/, 'question fourteen input should share the approved answer style')
  assert.match(q14Input, /styles\.hiddenLetterAnswerSentence/, 'question fourteen should place the input inside the question sentence')
  assert.match(q14Input, /styles\.questionPrompt/, 'question fourteen sentence should match the question prompt style')
  assert.match(q14Input, /styles\.answerVoiceRow/, 'question fourteen voice should occupy its own row')
  const q13AudioLayout = fs.readFileSync(path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_components/renderers/CountLetterInputQuestion.tsx'), 'utf8')
  assert.ok(q13AudioLayout.indexOf('countLetterAnswerRow') < q13AudioLayout.indexOf('answerVoiceRow'), 'question thirteen voice should be below the answer row')
  console.log('PASS question fourteen: reused object/flower sprite manifests, inside relation, unique hidden target, distractors, voice mapping, text input style, grading, and unique ten-question test batches')

  assert.ok(ROTATED_LETTER_TARGET_POOL.length >= 10, 'question-fifteen target pool should support a ten-question batch without repeats')
  assert.ok(fs.existsSync(path.join(root, 'public', ROTATED_LETTER_PROMPT_VOICE.replace(/^\//, ''))), 'question-fifteen prompt voice must exist')
  const questionVoicePath = path.join(root, 'public', ROTATED_LETTER_QUESTION_VOICE.replace(/^\//, ''))
  const questionVoiceExists = fs.existsSync(questionVoicePath)
  assert.ok(ROTATED_LETTER_ALLOWED_LETTERS.includes('ă') && ROTATED_LETTER_ALLOWED_LETTERS.includes('đ'), 'question fifteen should allow Vietnamese letters')
  assert.deepEqual(ROTATED_LETTER_BOARD_STYLES, ['scallop', 'rounded-square', 'double-border'])
  const usedRotatedTargets = new Set()
  for (let index = 0; index < 100; index += 1) {
    const seed = `rotated-letter-${index}`
    const question = generateRotatedLetterQuestion({ seedHash: seed, random: createSeededRandom(seed) })
    const data = question.data
    const board = data.board
    const items = board.items
    const rotated = items.filter(item => item.rotation === 180)
    assert.equal(question.templateId, 'T15')
    assert.equal(question.type, 'rotated-letter-input')
    assert.equal(question.prompt, ROTATED_LETTER_PROMPT)
    assert.equal(question.promptVoice, ROTATED_LETTER_PROMPT_VOICE)
    assert.equal(question.knowledgeKey, 'FIND_ROTATED_LETTER')
    assert.equal(data.generator, 'ROTATED_LETTER_INPUT')
    assert.equal(data.subType, 'rotated-letter')
    assert.equal(data.questionText, ROTATED_LETTER_ANSWER_TEXT)
    assert.equal(items.length, 5, 'question fifteen board must have exactly five letters')
    assert.equal(new Set(items.map(item => item.letter)).size, 5, 'question fifteen letters must be unique')
    assert.equal(rotated.length, 1, 'exactly one letter should be upside-down')
    assert.equal(rotated[0].letter, question.correctAnswer, 'the rotated letter should be the answer')
    assert.ok(ROTATED_LETTER_TARGET_POOL.includes(question.correctAnswer), 'target should use a clearly asymmetric lowercase letter')
    assert.ok(items.every(item => ROTATED_LETTER_BOARD_POOL.includes(item.letter)), 'board should exclude symmetric or confusing letters')
    assert.ok(items.every(item => [0, 180].includes(item.rotation)))
    assert.ok(items.every(item => item.size >= 50 && item.size <= 66))
    assert.ok(items.every(item => ROTATED_LETTER_COLORS.includes(item.color)))
    assert.ok(ROTATED_LETTER_BOARD_STYLES.includes(board.style))
    assert.ok(!items.some(item => Object.hasOwn(item, 'isTarget') || Object.hasOwn(item, 'answer')))
    assert.equal(data.questionVoiceAvailable, questionVoiceExists)
    assert.equal(data.questionVoice, questionVoiceExists ? ROTATED_LETTER_QUESTION_VOICE : undefined)
    assert.equal(gradeQuestion(question, question.correctAnswer.toLocaleUpperCase('vi-VN')), true, 'rotated-letter grading should ignore case')
    assert.equal(gradeQuestion(question, 'z'), question.correctAnswer === 'z')
    validateRotatedLetterQuestion(question)
    usedRotatedTargets.add(question.correctAnswer)
  }
  assert.ok(usedRotatedTargets.size >= 10, 'random seeds should exercise at least ten rotated target letters')

  const usedTestTargets = new Set()
  const batch = Array.from({ length: 10 }, (_, index) => {
    const seed = `rotated-letter-test-batch-${index}`
    const question = generateRotatedLetterQuestion({ seedHash: seed, random: createSeededRandom(seed), excludeTargets: [...usedTestTargets] })
    usedTestTargets.add(question.correctAnswer)
    return question
  })
  assert.equal(batch.length, 10)
  assert.equal(usedTestTargets.size, 10, 'question-fifteen test route must use ten distinct target letters')
  const rotatedExam = generateMockTrangNguyenExam({ seed: 'rotated-letter-answer-validation' })
  const questionFifteen = rotatedExam.questions[14]
  assert.equal(isValidTrangNguyenAnswerMap({ [questionFifteen.id]: questionFifteen.correctAnswer.toLocaleUpperCase('vi-VN') }, rotatedExam), true)
  assert.equal(isValidTrangNguyenAnswerMap({ [questionFifteen.id]: 'ab' }, rotatedExam), false)
  assert.equal(isValidTrangNguyenAnswerMap({ [questionFifteen.id]: '?' }, rotatedExam), false)
  assert.equal(sanitizeSingleVietnameseLetter('Đ', ROTATED_LETTER_ALLOWED_LETTERS), 'đ')
  assert.equal(sanitizeSingleVietnameseLetter('ăabc', ROTATED_LETTER_ALLOWED_LETTERS), 'ă')
  assert.equal(isQuestionAnswered(questionFifteen, undefined), false)
  assert.equal(isQuestionAnswered(questionFifteen, 'a'), true)
  const q15Input = fs.readFileSync(path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_components/renderers/RotatedLetterInputQuestion.tsx'), 'utf8')
  assert.match(q15Input, /type="text"/, 'question fifteen input must use text type')
  assert.match(q15Input, /styles\.numberCardAnswerInput/, 'question fifteen input should share the approved answer style')
  assert.match(q15Input, /styles\.answerVoiceRow/, 'question fifteen voice should occupy its own row')
  for (const number of [12, 13, 14, 15])
    assert.ok(fs.existsSync(path.join(root, `src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/test/cau-${number}/page.tsx`)), `test route for question ${number} must exist`)
  if (!questionVoiceExists) console.log(`NOTE question fifteen: missing inline question voice: ${ROTATED_LETTER_QUESTION_VOICE}`)
  console.log('PASS question fifteen: five distinct letters, one rotated target, random positions/styles, Vietnamese text input, grading, voice mapping, and unique ten-question test batch')

  assert.ok(MATCH_SAME_LETTER_ASSET_COUNTS.animals > 0, 'question sixteen needs animals with images and voices')
  assert.ok(MATCH_SAME_LETTER_ASSET_COUNTS.objects > 0, 'question sixteen needs objects with images and voices')
  for (const voice of Object.values(MATCH_SAME_LETTER_COMMON_VOICE))
    assert.ok(fs.existsSync(path.join(root, 'public', voice.replace(/^\//, ''))), `question-sixteen common voice must exist: ${voice}`)
  const q16UsedCombinations = new Set()
  const questionSixteenBatch = Array.from({ length: 10 }, (_, index) => {
    const seed = `same-letter-test-batch-${index}`
    const question = generateSameLetterTwoGroupsQuestion({
      seedHash: seed,
      random: createSeededRandom(seed),
      excludeCombinations: [...q16UsedCombinations],
    })
    const data = question.data
    const key = getSameLetterMatchCombinationKey(data.leftAsset.id, data.rightAsset.id, data.letters)
    q16UsedCombinations.add(key)
    assert.equal(question.templateId, 'T16')
    assert.equal(question.type, 'drag-match')
    assert.equal(data.generator, 'MATCH_SAME_LETTER_TWO_GROUPS')
    assert.equal(data.subType, 'same-letter-two-groups')
    assert.equal(data.leftAsset.id === data.rightAsset.id, false)
    assert.notEqual(data.leftAsset.category, data.rightAsset.category, 'the two columns should use different asset groups')
    assert.equal(data.leftItems.length, 3)
    assert.equal(data.rightItems.length, 3)
    assert.equal(new Set(data.letters).size, 3)
    assert.equal(data.letters.includes('i') && data.letters.includes('y'), false, 'avoid the previously noted i/y confusion')
    assert.ok(data.leftItems.every(item => item.asset.id === data.leftAsset.id), 'all left cards must reuse image A')
    assert.ok(data.rightItems.every(item => item.asset.id === data.rightAsset.id), 'all right cards must reuse image B')
    for (const letter of data.letters) {
      assert.equal(data.leftItems.filter(item => item.letter === letter).length, 1)
      assert.equal(data.rightItems.filter(item => item.letter === letter).length, 1)
    }
    assert.equal(question.prompt, `Hãy ghép ${data.leftAsset.label} và ${data.rightAsset.label} có chữ cái giống nhau.`)
    assert.equal(data.questionVoiceAvailable, true)
    assert.deepEqual(question.promptVoice, [
      MATCH_SAME_LETTER_COMMON_VOICE.hayGhep,
      data.leftAsset.voice,
      MATCH_SAME_LETTER_COMMON_VOICE.va,
      data.rightAsset.voice,
      MATCH_SAME_LETTER_COMMON_VOICE.coChuCaiGiongNhau,
    ])
    assert.ok(question.promptVoice.every(voice => fs.existsSync(path.join(root, 'public', voice.replace(/^\//, '')))))
    assert.deepEqual(question.correctAnswer, Object.fromEntries(data.leftItems.map(item => [item.id, data.rightItems.find(right => right.letter === item.letter).id])))
    return question
  })
  assert.equal(q16UsedCombinations.size, 10, 'question-sixteen test batch should avoid repeated combinations')
  assert.ok(questionSixteenBatch.some(question => question.data.rightItems.map(item => item.letter).join('') !== question.data.letters.join('')), 'the right column should be shuffled')
  const questionSixteen = generateMockTrangNguyenExam({ seed: 'same-letter-answer-validation' }).questions[15]
  const partialQ16Answer = Object.fromEntries(Object.entries(questionSixteen.correctAnswer).slice(0, 2))
  assert.equal(isQuestionAnswered(questionSixteen, partialQ16Answer), false, 'question sixteen is unanswered until all three matches are made')
  assert.equal(isQuestionAnswered(questionSixteen, questionSixteen.correctAnswer), true)
  assert.equal(isValidTrangNguyenAnswerMap({ [questionSixteen.id]: partialQ16Answer }, generateMockTrangNguyenExam({ seed: 'same-letter-answer-validation' })), false)
  const questionSixteenExam = generateMockTrangNguyenExam({ seed: 'same-letter-answer-validation' })
  assert.equal(isValidTrangNguyenAnswerMap({ [questionSixteen.id]: questionSixteen.correctAnswer }, questionSixteenExam), true)
  assert.equal(gradeQuestion(questionSixteen, questionSixteen.correctAnswer), true)
  const wrongQ16Answer = { ...questionSixteen.correctAnswer }
  const q16LeftIds = Object.keys(wrongQ16Answer)
  ;[wrongQ16Answer[q16LeftIds[0]], wrongQ16Answer[q16LeftIds[1]]] = [wrongQ16Answer[q16LeftIds[1]], wrongQ16Answer[q16LeftIds[0]]]
  assert.equal(gradeQuestion(questionSixteen, wrongQ16Answer), false)
  assert.ok(fs.existsSync(path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/test/cau-16/page.tsx')))
  console.log('PASS question sixteen: two reused image assets, three unique letters per side, shuffled targets, drag-match grading, five-segment voice sequence, and unique ten-question test batch')

  assert.equal(LETTER_CARD_ANIMALS_JSON.cropMode, 'tight-bounds')
  assert.equal(LETTER_CARD_ANIMALS_JSON.items.length, 4)
  assert.ok(fs.existsSync(path.join(root, 'public/games/lessons/lop-1/tieng-viet/trang-nguyen/images/letter-card-animals.webp')))
  const q17UsedCombinations = new Set()
  const questionSeventeenBatch = Array.from({ length: 10 }, (_, index) => {
    const seed = `lower-upper-test-batch-${index}`
    const question = generateLowerUpperMatchQuestion({
      seedHash: seed,
      random: createSeededRandom(seed),
      excludeCombinations: [...q17UsedCombinations],
    })
    const data = question.data
    const combination = getLowerUpperMatchCombinationKey(data.leftBackgroundId, data.rightBackgroundId, data.letters)
    q17UsedCombinations.add(combination)
    assert.equal(question.templateId, 'T17')
    assert.equal(question.type, 'drag-match')
    assert.equal(question.prompt, MATCH_LOWER_UPPER_CASE_PROMPT)
    assert.equal(data.generator, 'MATCH_LOWER_UPPER_CASE')
    assert.equal(data.subType, 'lowercase-uppercase')
    assert.notEqual(data.leftBackgroundId, data.rightBackgroundId)
    assert.equal(data.leftItems.length, 3)
    assert.equal(data.rightItems.length, 3)
    assert.equal(new Set(data.letters).size, 3)
    assert.ok(data.leftItems.every(item => item.backgroundId === data.leftBackgroundId && item.displayLetter === item.matchKey))
    assert.ok(data.rightItems.every(item => item.backgroundId === data.rightBackgroundId
      && item.displayLetter === item.matchKey.toLocaleUpperCase('vi-VN')))
    assert.ok(data.leftItems.every(item => item.visual.sprite?.spriteSheet === LETTER_CARD_ANIMALS_JSON.image))
    assert.ok(data.rightItems.every(item => item.visual.sprite?.spriteSheet === LETTER_CARD_ANIMALS_JSON.image))
    for (const letter of data.letters) {
      assert.equal(data.leftItems.filter(item => item.matchKey === letter).length, 1)
      assert.equal(data.rightItems.filter(item => item.matchKey === letter).length, 1)
    }
    const voicesAvailable = MATCH_LOWER_UPPER_CASE_VOICE_SEQUENCE.every(voice => fs.existsSync(path.join(root, 'public', voice.replace(/^\//, ''))))
    assert.equal(data.questionVoiceAvailable, voicesAvailable)
    assert.deepEqual(data.voiceSequence, voicesAvailable ? MATCH_LOWER_UPPER_CASE_VOICE_SEQUENCE : [])
    assert.deepEqual(question.promptVoice, voicesAvailable ? data.voiceSequence : undefined)
    assert.deepEqual(question.correctAnswer, Object.fromEntries(data.leftItems.map(item => [
      item.id,
      data.rightItems.find(right => right.matchKey === item.matchKey).id,
    ])))
    return question
  })
  const q17VoiceAvailable = MATCH_LOWER_UPPER_CASE_VOICE_SEQUENCE.every(voice => fs.existsSync(path.join(root, 'public', voice.replace(/^\//, ''))))
  assert.equal(q17VoiceAvailable, true, 'question seventeen should use its complete recorded prompt voice')
  assert.equal(q17UsedCombinations.size, 10, 'question-seventeen test batch should avoid repeated backgrounds and letter sets')
  assert.ok(questionSeventeenBatch.some(question => question.data.rightItems.map(item => item.displayLetter).join('')
    !== question.data.letters.map(letter => letter.toLocaleUpperCase('vi-VN')).join('')), 'the right column should be shuffled')
  const questionSeventeen = generateMockTrangNguyenExam({ seed: 'lower-upper-answer-validation' }).questions[16]
  const partialQ17Answer = Object.fromEntries(Object.entries(questionSeventeen.correctAnswer).slice(0, 2))
  assert.equal(isQuestionAnswered(questionSeventeen, partialQ17Answer), false)
  assert.equal(isQuestionAnswered(questionSeventeen, questionSeventeen.correctAnswer), true)
  const wrongQ17Answer = { ...questionSeventeen.correctAnswer }
  const q17LeftIds = Object.keys(wrongQ17Answer)
  ;[wrongQ17Answer[q17LeftIds[0]], wrongQ17Answer[q17LeftIds[1]]] = [wrongQ17Answer[q17LeftIds[1]], wrongQ17Answer[q17LeftIds[0]]]
  assert.equal(isQuestionAnswered(questionSeventeen, wrongQ17Answer), true, 'a complete wrong match should be accepted and submitted')
  assert.equal(gradeQuestion(questionSeventeen, questionSeventeen.correctAnswer), true)
  assert.equal(gradeQuestion(questionSeventeen, wrongQ17Answer), false)
  const questionSeventeenExam = generateMockTrangNguyenExam({ seed: 'lower-upper-answer-validation' })
  const sanitizedQ17Exam = sanitizeGeneratedExam(questionSeventeenExam)
  assert.equal(hasAnswerKey(sanitizedQ17Exam), false, 'sanitized exam must not expose question-seventeen match keys')
  const sanitizedQuestionSeventeen = sanitizedQ17Exam.questions[16]
  assert.ok([...sanitizedQuestionSeventeen.data.leftItems, ...sanitizedQuestionSeventeen.data.rightItems]
    .every(item => !Object.hasOwn(item, 'matchKey')))
  assert.equal(isValidTrangNguyenAnswerMap({ [questionSeventeen.id]: wrongQ17Answer }, questionSeventeenExam), true)
  assert.ok(fs.existsSync(path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/test/cau-17/page.tsx')))
  const q17TestPage = fs.readFileSync(path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/test/cau-17/page.tsx'), 'utf8')
  assert.match(q17TestPage, /correctAnswer: _correctAnswer/, 'question-seventeen test route must not expose the correct mapping')
  assert.match(q17TestPage, /matchKey: _matchKey/, 'question-seventeen test route must not expose the matching keys')
  console.log('PASS question seventeen: lower/uppercase Vietnamese pairs, two unique sprite backgrounds, shuffled uppercase targets, grading and ten-question test batch')

  assert.equal(DINO_LETTER_SOUND_JSON.items.length, 24)
  assert.deepEqual(DINO_LETTER_SOUND_JSON.items.map(item => item.id), MATCH_IMAGE_WITH_SOUND_SINGLE_SOUNDS.map(item => item.id))
  assert.ok(fs.existsSync(path.join(root, 'public', DINO_LETTER_SOUND_JSON.image.replace(/^\//, ''))))
  for (const item of MATCH_IMAGE_WITH_SOUND_SINGLE_SOUNDS) {
    assert.ok(fs.existsSync(path.join(root, 'public/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/letters', `${item.audioId}.mp3`)), `missing question-eighteen audio for ${item.id}`)
  }
  const q18UsedSoundIds = new Set()
  const q18UsedCombinations = new Set()
  const questionEighteenBatch = Array.from({ length: 10 }, (_, index) => {
    if (MATCH_IMAGE_WITH_SOUND_SINGLE_SOUNDS.length - q18UsedSoundIds.size < 3) {
      q18UsedSoundIds.clear()
    }
    const seed = `image-sound-test-batch-${index}`
    const question = generateImageWithSoundMatchQuestion({
      seedHash: seed,
      random: createSeededRandom(seed),
      excludeSoundIds: [...q18UsedSoundIds],
      excludeCombinations: [...q18UsedCombinations],
    })
    const data = question.data
    const leftIds = data.leftItems.map(item => item.soundId)
    const rightIds = data.rightItems.map(item => item.soundId)
    const combination = getImageWithSoundCombinationKey(leftIds)
    q18UsedCombinations.add(combination)
    leftIds.forEach(id => q18UsedSoundIds.add(id))
    assert.equal(question.templateId, 'T18')
    assert.equal(question.type, 'drag-match')
    assert.equal(question.prompt, MATCH_IMAGE_WITH_SOUND_PROMPT)
    assert.equal(question.knowledgeKey, 'MATCH_IMAGE_WITH_SOUND')
    assert.equal(data.generator, 'MATCH_IMAGE_WITH_SOUND')
    assert.equal(data.subType, 'image-to-audio')
    assert.equal(data.leftItems.length, 3)
    assert.equal(data.rightItems.length, 3)
    assert.equal(new Set(leftIds).size, 3)
    assert.equal(new Set(rightIds).size, 3)
    assert.deepEqual([...leftIds].sort(), [...rightIds].sort())
    assert.ok(data.leftItems.every(item => {
      const sprite = DINO_LETTER_SOUND_JSON.items.find(candidate => candidate.id === item.imageId)
      return sprite && item.visual.sprite?.spriteSheet === DINO_LETTER_SOUND_JSON.image
        && item.visual.sprite.x === sprite.x && item.visual.sprite.y === sprite.y
        && item.visual.sprite.width === sprite.width && item.visual.sprite.height === sprite.height
    }))
    assert.ok(data.rightItems.every(item => fs.existsSync(path.join(root, 'public', item.audioPath.replace(/^\//, '')))))
    assert.deepEqual(question.correctAnswer, Object.fromEntries(data.leftItems.map(item => [
      item.id,
      data.rightItems.find(right => right.soundId === item.soundId).id,
    ])))
    const promptVoiceAvailable = fs.existsSync(path.join(root, 'public', MATCH_IMAGE_WITH_SOUND_PROMPT_VOICE.replace(/^\//, '')))
    assert.equal(data.questionVoiceAvailable, promptVoiceAvailable)
    assert.equal(question.promptVoice, promptVoiceAvailable ? MATCH_IMAGE_WITH_SOUND_PROMPT_VOICE : undefined)
    return question
  })
  assert.equal(q18UsedCombinations.size, 10, 'question-eighteen test batch should not repeat combinations')
  assert.equal(new Set(questionEighteenBatch.slice(0, 8).flatMap(question => question.data.leftItems.map(item => item.soundId))).size, 24,
    'question-eighteen test batch should prioritize unused sounds until all 24 have appeared')
  assert.ok(questionEighteenBatch.some(question => question.data.leftItems.map(item => item.soundId).join('|')
    !== question.data.rightItems.map(item => item.soundId).join('|')), 'question-eighteen right audio buttons should be shuffled')
  const questionEighteenExam = generateMockTrangNguyenExam({ seed: 'image-sound-answer-validation' })
  const questionEighteen = questionEighteenExam.questions[17]
  assert.equal(isQuestionAnswered(questionEighteen, questionEighteen.correctAnswer), true)
  assert.equal(gradeQuestion(questionEighteen, questionEighteen.correctAnswer), true)
  const wrongQ18Answer = { ...questionEighteen.correctAnswer }
  const q18LeftIds = Object.keys(wrongQ18Answer)
  ;[wrongQ18Answer[q18LeftIds[0]], wrongQ18Answer[q18LeftIds[1]]] = [wrongQ18Answer[q18LeftIds[1]], wrongQ18Answer[q18LeftIds[0]]]
  assert.equal(isQuestionAnswered(questionEighteen, wrongQ18Answer), true)
  assert.equal(gradeQuestion(questionEighteen, wrongQ18Answer), false)
  const safeQuestionEighteen = sanitizeGeneratedExam(questionEighteenExam).questions[17]
  assert.equal(Object.hasOwn(safeQuestionEighteen, 'correctAnswer'), false)
  assert.equal(hasAnswerKey(safeQuestionEighteen), false)
  assert.ok(fs.existsSync(path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/test/cau-18/page.tsx')))
  console.log('PASS question eighteen: 24 dino-letter sprites and sound clips, unique shuffled triples, prompt voice fallback, grading and ten-question test batch')

  const selectedObjectManifestItems = OBJECT_NAME_JSON.items.filter(item => MATCH_OBJECT_WITH_NAME_POOL_IDS.includes(item.id))
  assert.equal(selectedObjectManifestItems.length, 24)
  assert.ok(fs.existsSync(path.join(root, 'public', OBJECT_NAME_JSON.image.replace(/^\//, ''))))
  const q19UsedObjectIds = new Set()
  const q19UsedCombinations = new Set()
  const questionNineteenBatch = Array.from({ length: 10 }, (_, index) => {
    if (MATCH_OBJECT_WITH_NAME_POOL_IDS.length - q19UsedObjectIds.size < 3) q19UsedObjectIds.clear()
    const seed = `object-sound-test-batch-${index}`
    const question = generateObjectImageWithAudioQuestion({
      seedHash: seed,
      random: createSeededRandom(seed),
      excludeObjectIds: [...q19UsedObjectIds],
      excludeCombinations: [...q19UsedCombinations],
    })
    const data = question.data
    const leftIds = data.leftItems.map(item => item.objectId)
    const rightIds = data.rightItems.map(item => item.objectId)
    q19UsedCombinations.add(getObjectWithNameCombinationKey(leftIds))
    leftIds.forEach(id => q19UsedObjectIds.add(id))
    assert.equal(question.templateId, 'T19')
    assert.equal(question.type, 'drag-match')
    assert.equal(question.prompt, MATCH_OBJECT_WITH_NAME_PROMPT)
    assert.equal(question.knowledgeKey, 'MATCH_OBJECT_WITH_NAME')
    assert.equal(data.generator, 'MATCH_OBJECT_WITH_NAME')
    assert.equal(data.subType, 'object-image-to-audio')
    assert.equal(data.leftItems.length, 3)
    assert.equal(data.rightItems.length, 3)
    assert.equal(new Set(data.leftItems.map(item => item.matchKey)).size, 3)
    assert.equal(new Set(data.rightItems.map(item => item.matchKey)).size, 3)
    assert.deepEqual([...leftIds].sort(), [...rightIds].sort())
    assert.ok(leftIds.every(id => MATCH_OBJECT_WITH_NAME_POOL_IDS.includes(id)))
    assert.ok(data.leftItems.every(item => {
      const sprite = OBJECT_NAME_JSON.items.find(candidate => candidate.id === item.imageId)
      return sprite && item.visual.sprite?.spriteSheet === OBJECT_NAME_JSON.image
        && item.visual.sprite.x === sprite.x && item.visual.sprite.y === sprite.y
        && item.visual.sprite.width === sprite.width && item.visual.sprite.height === sprite.height
        && fs.existsSync(path.join(root, 'public', item.voice.replace(/^\//, '')))
    }))
    assert.ok(data.rightItems.every(item => fs.existsSync(path.join(root, 'public', item.voice.replace(/^\//, '')))))
    assert.deepEqual(question.correctAnswer, Object.fromEntries(data.leftItems.map(item => [
      item.id,
      data.rightItems.find(right => right.matchKey === item.matchKey).id,
    ])))
    const promptVoiceAvailable = fs.existsSync(path.join(root, 'public', MATCH_OBJECT_WITH_NAME_PROMPT_VOICE.replace(/^\//, '')))
    assert.equal(data.questionVoiceAvailable, promptVoiceAvailable)
    assert.equal(question.promptVoice, promptVoiceAvailable ? MATCH_OBJECT_WITH_NAME_PROMPT_VOICE : undefined)
    return question
  })
  assert.equal(q19UsedCombinations.size, 10, 'question-nineteen test batch should not repeat combinations')
  assert.equal(new Set(questionNineteenBatch.slice(0, 8).flatMap(question => question.data.leftItems.map(item => item.objectId))).size, 24,
    'question-nineteen test batch should prioritize unused objects until all 24 have appeared')
  assert.ok(questionNineteenBatch.some(question => question.data.leftItems.map(item => item.objectId).join('|')
    !== question.data.rightItems.map(item => item.objectId).join('|')), 'question-nineteen voice buttons should be shuffled')
  const questionNineteenExam = generateMockTrangNguyenExam({ seed: 'object-sound-answer-validation' })
  const questionNineteen = questionNineteenExam.questions[18]
  assert.equal(isQuestionAnswered(questionNineteen, questionNineteen.correctAnswer), true)
  assert.equal(gradeQuestion(questionNineteen, questionNineteen.correctAnswer), true)
  const wrongQ19Answer = { ...questionNineteen.correctAnswer }
  const q19LeftIds = Object.keys(wrongQ19Answer)
  ;[wrongQ19Answer[q19LeftIds[0]], wrongQ19Answer[q19LeftIds[1]]] = [wrongQ19Answer[q19LeftIds[1]], wrongQ19Answer[q19LeftIds[0]]]
  assert.equal(isQuestionAnswered(questionNineteen, wrongQ19Answer), true)
  assert.equal(gradeQuestion(questionNineteen, wrongQ19Answer), false)
  const safeQuestionNineteen = sanitizeGeneratedExam(questionNineteenExam).questions[18]
  assert.equal(Object.hasOwn(safeQuestionNineteen, 'correctAnswer'), false)
  assert.equal(hasAnswerKey(safeQuestionNineteen), false)
  assert.ok([...safeQuestionNineteen.data.leftItems, ...safeQuestionNineteen.data.rightItems]
    .every(item => !Object.hasOwn(item, 'matchKey')))
  assert.ok(safeQuestionNineteen.data.leftItems.every(item => !Object.hasOwn(item, 'word') && !Object.hasOwn(item, 'voice')),
    'question-nineteen exam data must not expose object names alongside the pictures')
  assert.ok(fs.existsSync(path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/test/cau-19/page.tsx')))
  const q19TestPage = fs.readFileSync(path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/test/cau-19/page.tsx'), 'utf8')
  assert.match(q19TestPage, /correctAnswer: _correctAnswer/, 'question-nineteen test route must not expose the correct mapping')
  assert.match(q19TestPage, /matchKey: _matchKey/, 'question-nineteen test route must not expose matching keys')
  console.log('PASS question nineteen: 24 tight-cropped object images and voices, shuffled unique triples, grading and ten-question test batch')

  const questionTwentyExam = generateMockTrangNguyenExam({ seed: 'number-letter-classify-answer-validation' })
  const questionTwenty = questionTwentyExam.questions[19]
  const questionTwentyPartial = Object.fromEntries(Object.entries(questionTwenty.correctAnswer).slice(0, 5))
  assert.equal(isQuestionAnswered(questionTwenty, undefined), false)
  assert.equal(isQuestionAnswered(questionTwenty, questionTwentyPartial), false, 'question twenty completes only after all six items are classified')
  assert.equal(isQuestionAnswered(questionTwenty, questionTwenty.correctAnswer), true)
  assert.equal(gradeQuestion(questionTwenty, questionTwenty.correctAnswer), true)
  const wrongQ20Answer = { ...questionTwenty.correctAnswer }
  const q20ItemId = Object.keys(wrongQ20Answer)[0]
  wrongQ20Answer[q20ItemId] = wrongQ20Answer[q20ItemId] === 'numbers' ? 'letters' : 'numbers'
  assert.equal(isQuestionAnswered(questionTwenty, wrongQ20Answer), true)
  assert.equal(gradeQuestion(questionTwenty, wrongQ20Answer), false)
  const safeQuestionTwenty = sanitizeGeneratedExam(questionTwentyExam).questions[19]
  assert.equal(Object.hasOwn(safeQuestionTwenty, 'correctAnswer'), false)
  assert.equal(hasAnswerKey(safeQuestionTwenty), false)
  const q20TestPagePath = path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/test/cau-20/page.tsx')
  const q20TestClientPath = path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/test/_components/ClassificationTestClient.tsx')
  assert.ok(fs.existsSync(q20TestPagePath), 'question-twenty test route should exist')
  assert.ok(fs.existsSync(q20TestClientPath), 'shared classification test client should exist')
  const q20TestPage = fs.readFileSync(q20TestPagePath, 'utf8')
  assert.match(q20TestPage, /Array\.from\(\{ length: 10 \}/, 'question-twenty route should generate ten examples')
  assert.match(q20TestPage, /correctAnswer: _correctAnswer/, 'question-twenty route must not send its answer key')
  assert.match(q20TestPage, /groupId: _groupId/, 'question-twenty route must not send item category keys')
  assert.equal(safeQuestionTwenty.data.items.every(item => !Object.hasOwn(item, 'groupId')), true,
    'the real exam must not send the number/letter answer category to the client')
  assert.equal(questionTwenty.data.acceptIncorrectPlacement, true)
  assert.equal(questionTwenty.data.maxItemsPerGroup, 3)
  console.log('PASS question twenty: shared text-token renderer, modular voice availability, accepted wrong placements, capacity and grading')

  const questionTwentyOne = questionTwentyExam.questions.find(question => question.templateId === 'T21')
  const q21Partial = Object.fromEntries(Object.entries(questionTwentyOne.correctAnswer).slice(0, 5))
  assert.equal(isQuestionAnswered(questionTwentyOne, undefined), false)
  assert.equal(isQuestionAnswered(questionTwentyOne, q21Partial), false)
  assert.equal(isQuestionAnswered(questionTwentyOne, questionTwentyOne.correctAnswer), true)
  assert.equal(gradeQuestion(questionTwentyOne, questionTwentyOne.correctAnswer), true)
  const q21WrongAnswer = { ...questionTwentyOne.correctAnswer }
  const q21ItemId = Object.keys(q21WrongAnswer)[0]
  q21WrongAnswer[q21ItemId] = questionTwentyOne.data.groups.find(group => group.id !== q21WrongAnswer[q21ItemId]).id
  assert.equal(gradeQuestion(questionTwentyOne, q21WrongAnswer), false)
  const safeQuestionTwentyOne = sanitizeGeneratedExam(questionTwentyExam).questions.find(question => question.data.generator === 'CLASSIFY_CATEGORY_PAIRS')
  assert.equal(Object.hasOwn(safeQuestionTwentyOne, 'correctAnswer'), false)
  assert.equal(hasAnswerKey(safeQuestionTwentyOne), false)
  assert.ok(safeQuestionTwentyOne.data.items.every(item => item.kind === 'image' && item.image && item.groupId))
  const q21RoutePath = path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/test/cau-21/page.tsx')
  assert.ok(fs.existsSync(q21RoutePath), 'question twenty-one test route should exist')
  const q21Route = fs.readFileSync(q21RoutePath, 'utf8')
  assert.match(q21Route, /Array\.from\(\{ length: 10 \}/)
  assert.match(q21Route, /recentPairKeys/)
  const recentPairs = []
  const recentPairKeys = []
  for (let index = 0; index < 10; index += 1) {
    const seed = 'category-pair-no-repeat-' + index
    const generated = generateCategoryPairClassificationQuestion({ seedHash: String(index), random: createSeededRandom(seed), recentPairKeys })
    const key = generated.data.groups.map(group => group.id).sort().join('-')
    assert.equal(recentPairs.includes(key), false, 'question twenty-one test samples should avoid recent category pairs')
    recentPairs.push(key)
    recentPairKeys.push(key)
  }
  for (const category of CATEGORY_21_IDS) {
    const manifest = ({ vegetable: VEGETABLE_JSON, tuber: TUBER_JSON, fruit: FRUIT_JSON, animal: TAG_NAME_MANIFEST, flower: FLOWER_NAME_JSON })[category]
    const spritePath = path.join(root, 'public', manifest.image.replace(/^\//, ''))
    assert.ok(fs.existsSync(spritePath), category + ' sprite sheet should exist at its project URL')
    const sprite = fs.readFileSync(spritePath)
    assert.equal(sprite.readUInt32BE(16), manifest.width, category + ' sheet width should match its manifest')
    assert.equal(sprite.readUInt32BE(20), manifest.height, category + ' sheet height should match its manifest')
    assert.equal(CATEGORY_21_ASSET_POOLS[category].length >= 3, true, category + ' should offer at least three crop choices')
  }
  console.log('PASS question twenty-one: shared image-token renderer, two unique categories, six manifest crops, modular voice and grading')

  const questionTwentyTwo = questionTwentyExam.questions.find(question => question.templateId === 'T22')
  const q22RoutePath = path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/test/cau-22/page.tsx')
  assert.ok(fs.existsSync(q22RoutePath), 'question twenty-two test route should exist')
  const q22Route = fs.readFileSync(q22RoutePath, 'utf8')
  assert.match(q22Route, /Array\.from\(\{ length: 10 \}/)
  assert.match(q22Route, /correctAnswer: _correctAnswer/)
  const safeQuestionTwentyTwo = sanitizeGeneratedExam(questionTwentyExam).questions.find(question => question.data.generator === 'ORDER_VIETNAMESE_ALPHABET')
  assert.equal(Object.hasOwn(safeQuestionTwentyTwo, 'correctAnswer'), false)
  assert.equal(hasAnswerKey(safeQuestionTwentyTwo), false)
  assert.equal(isQuestionAnswered(questionTwentyTwo, questionTwentyTwo.correctAnswer), true)
  console.log('PASS question twenty-two: horizontal sortable letters, hidden answer, Vietnamese ordering and ten-question test route')

  const questionTwentyThree = questionTwentyExam.questions.find(question => question.templateId === 'T23')
  const q23RoutePath = path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/test/cau-23/page.tsx')
  assert.ok(fs.existsSync(q23RoutePath), 'question twenty-three test route should exist')
  const q23Route = fs.readFileSync(q23RoutePath, 'utf8')
  assert.match(q23Route, /Array\.from\(\{ length: 10 \}/)
  assert.match(q23Route, /generateVehicleOrderQuestion/)
  const q23Renderer = fs.readFileSync(path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_components/renderers/VehicleOrderQuestion.tsx'), 'utf8')
  assert.doesNotMatch(q23Renderer, /vehicleSortLabel/)
  assert.equal(questionTwentyThree.data.generator, 'ORDER_VEHICLES')
  assert.equal(questionTwentyThree.prompt, VEHICLE_ORDER_PROMPT.replace('{category}', questionTwentyThree.data.categoryLabel))
  assert.ok(['animal', 'object', 'flower', 'fruit', 'transportation'].includes(questionTwentyThree.data.category))
  assert.equal(questionTwentyThree.data.items.length, 4)
  assert.ok(questionTwentyThree.data.items.every(item => item.voice && item.visual?.sprite
    && fs.existsSync(path.join(root, 'public', item.voice.replace(/^\//, '')))))
  const questionTwentyThreeReadoutItems = questionTwentyThree.correctAnswer
    .map(id => questionTwentyThree.data.items.find(item => item.id === id))
  assert.equal(questionTwentyThree.data.readoutText, questionTwentyThreeReadoutItems.map(item => item.text).join(', '))
  assert.deepEqual(questionTwentyThree.promptVoice, [
    '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common/sap-xep-cac.mp3',
    `/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common/${questionTwentyThree.data.category === 'transportation' ? 'phuong-tien-giao-thong' : questionTwentyThree.data.category === 'animal' ? 'con-vat' : questionTwentyThree.data.category === 'flower' ? 'hoa' : questionTwentyThree.data.category === 'fruit' ? 'qua' : 'do-vat'}.mp3`,
    '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common/theo-dung-thu-tu-sau.mp3',
    ...questionTwentyThreeReadoutItems.map(item => item.voice),
  ])
  assert.ok(!questionTwentyThree.prompt.includes(questionTwentyThree.data.items[0].text), 'question 23 prompt should not reveal its sorted answer')
  const safeQuestionTwentyThree = sanitizeGeneratedExam(questionTwentyExam).questions.find(question => question.data.generator === 'ORDER_VEHICLES')
  assert.equal(Object.hasOwn(safeQuestionTwentyThree, 'correctAnswer'), false)
  assert.equal(hasAnswerKey(safeQuestionTwentyThree), false)
  const sortItemsAnsweredState = generateMockTrangNguyenExam({ seed: 'sorting-vehicles-answered-state' }).questions.find(question => question.data?.generator === 'ORDER_VEHICLES')
  assert.equal(isQuestionAnswered(sortItemsAnsweredState, undefined), false)
  assert.equal(isQuestionAnswered(sortItemsAnsweredState, sortItemsAnsweredState.correctAnswer), true)
  const q23Samples = Array.from({ length: 32 }, (_, index) => generateVehicleOrderQuestion({
    seedHash: String(index), random: createSeededRandom(`vehicle-order-test-${index}`),
  }))
  assert.equal(q23Samples.every(question => question.data.items.length === 4 && question.data.generator === 'ORDER_VEHICLES'
    && question.data.items.every(item => item.voice && item.visual?.sprite)), true)
  assert.ok(q23Samples.some(question => question.data.category === 'flower'), 'question twenty-three should include the voiced flower pool')
  assert.ok(q23Samples.some(question => question.data.category === 'fruit'), 'question twenty-three should include the voiced fruit pool')
  console.log('PASS question twenty-three: horizontal draggable picture ordering with readout voices, hidden answer and ten-question test route')

  assert.equal(QUESTION_29_ASSETS.length, 24, 'Q28/Q29 must map every asset in the real-object letter shape manifest')
  assert.deepEqual(QUESTION_29_ASSETS.map(asset => asset.imageId), REAL_OBJECT_LETTER_SHAPES_JSON.items.map(item => item.id))
  assert.ok(QUESTION_29_ASSETS.every(asset => asset.manifestId === 'real-object-letter-shapes'
    && asset.resemblesLetter === REAL_OBJECT_LETTER_SHAPES_JSON.items.find(item => item.id === asset.imageId)?.letter
    && getQuestion29AssetVisual(asset)?.sprite?.spriteSheet === REAL_OBJECT_LETTER_SHAPES_JSON.image))
  assert.deepEqual(QUESTION_28_29_ENABLED_ASSETS.map(asset => asset.imageId), ['c', 's', 't', 'u', 'x', 'h'])
  const questionTwentySix = questionTwentyExam.questions.find(question => question.templateId === 'T26')
  const questionTwentyEight = questionTwentyExam.questions.find(question => question.templateId === 'T28')
  const questionTwentyNine = questionTwentyExam.questions.find(question => question.templateId === 'T29')
  assert.equal(questionTwentyEight?.data?.generator, 'IMAGE_RESEMBLES_LETTER')
  assert.equal(questionTwentyNine?.data?.generator, 'IMAGE_RESEMBLES_LETTER')
  assert.deepEqual(questionTwentyEight?.promptVoice, questionTwentySix?.promptVoice, 'Q28 top voice should reuse Q26 instruction voice')
  assert.deepEqual(questionTwentyNine?.promptVoice, questionTwentySix?.promptVoice, 'Q29 top voice should reuse Q26 instruction voice')
  assert.notEqual(questionTwentyEight?.data?.asset?.imageId, questionTwentyNine?.data?.asset?.imageId,
    'Q28 and Q29 should avoid using the same shape consecutively')
  assert.equal(questionTwentyEight?.data?.sentencePrefix, QUESTION_29_SENTENCE_PREFIX)
  assert.equal(questionTwentyNine?.data?.sentencePrefix, QUESTION_29_SENTENCE_PREFIX)
  assert.equal(questionTwentyEight?.options?.length, 4)
  assert.equal(questionTwentyNine?.options?.length, 4)
  assert.equal(questionTwentyEight?.correctAnswer, questionTwentyEight?.data?.asset?.resemblesLetter)
  assert.equal(questionTwentyNine?.correctAnswer, questionTwentyNine?.data?.asset?.resemblesLetter)
  assert.equal(gradeQuestion(questionTwentyEight, questionTwentyEight.correctAnswer), true)
  assert.equal(gradeQuestion(questionTwentyNine, questionTwentyNine.correctAnswer), true)
  assert.equal(gradeQuestion(questionTwentyEight, 'a'), false)
  const sanitizedQ28Q29 = sanitizeGeneratedExam(questionTwentyExam)
  for (const templateId of ['T28', 'T29']) {
    const sanitizedQuestion = sanitizedQ28Q29.questions.find(question => question.templateId === templateId)
    assert.equal(Object.hasOwn(sanitizedQuestion, 'correctAnswer'), false)
    assert.equal(Object.hasOwn(sanitizedQuestion.data.asset, 'resemblesLetter'), false,
      `${templateId} must not expose the correct letter in asset metadata`)
    assert.equal(Object.hasOwn(sanitizedQuestion.data, 'selectionKey'), false)
  }

  for (const [templateId, generateQuestion] of [['T28', generateQuestion28], ['T29', generateQuestion29]]) {
    const recentAssetIds = []
    const samples = Array.from({ length: 32 }, (_, index) => {
      const seed = `image-resembles-letter-${templateId}-${index}`
      const question = generateQuestion({ seedHash: seed, random: createSeededRandom(seed), recentAssetIds })
      const data = question.data
      const asset = QUESTION_29_ASSETS.find(candidate => candidate.id === data.asset.id)
      const correctLetter = asset?.resemblesLetter
      const distractors = QUESTION_29_LETTER_CONFUSION_MAP[correctLetter] ?? []
      assert.equal(question.templateId, templateId)
      assert.equal(question.type, 'select-input')
      assert.equal(question.subType, 'image-resembles-letter')
      assert.equal(question.knowledgeKey, 'RECOGNIZE_LETTER_BY_SHAPE')
      assert.equal(data.subType, 'image-resembles-letter')
      assert.equal(question.prompt, questionTwentySix.prompt)
      assert.deepEqual(question.promptVoice, questionTwentySix.promptVoice)
      assert.ok(asset && QUESTION_28_29_ENABLED_ASSETS.some(candidate => candidate.id === asset.id))
      assert.equal(data.asset.manifestId, 'real-object-letter-shapes')
      assert.equal(data.asset.resemblesLetter, correctLetter)
      assert.equal(question.content.visual.label, 'Hình ảnh minh họa')
      assert.equal(question.content.visual.sprite.spriteSheet, REAL_OBJECT_LETTER_SHAPES_JSON.image)
      assert.equal(question.options.length, 4)
      assert.equal(new Set(question.options.map(option => option.id)).size, 4)
      assert.equal(new Set(question.options.map(option => option.text)).size, 4)
      assert.ok(question.options.every(option => option.id === option.text && QUESTION_29_ALLOWED_LETTERS.includes(option.text)))
      assert.equal(question.options.filter(option => option.id === correctLetter && option.text === correctLetter).length, 1)
      assert.ok(question.options.filter(option => option.text !== correctLetter)
        .every(option => distractors.includes(option.text) && QUESTION_29_ALLOWED_LETTERS.includes(option.text)))
      assert.deepEqual(data.choices, question.options.map(option => option.id))
      assert.deepEqual(question.promptVoice, ['/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common/chon-dap-an-thich-hop-dien-vao-cho-trong.mp3'])
      assert.equal(fs.existsSync(path.join(root, 'public', question.content.visual.sprite.spriteSheet.replace(/^\//, ''))), true)
      assert.equal(isQuestionAnswered(question, undefined), false)
      assert.equal(isQuestionAnswered(question, correctLetter), true)
      const visiblePreview = previewQuestion(question)
      assert.equal(Object.hasOwn(visiblePreview.data.asset, 'resemblesLetter'), false)
      assert.equal(Object.hasOwn(visiblePreview.data, 'selectionKey'), false)
      recentAssetIds.push(data.asset.imageId)
      if (recentAssetIds.length > 2) recentAssetIds.shift()
      return data.asset.imageId
    })
    assert.ok(samples.every((imageId, index) => index === 0 || imageId !== samples[index - 1]), `${templateId} should avoid consecutive image repeats`)
    const routePath = path.join(root, `src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/test/cau-${templateId.slice(1)}/page.tsx`)
    assert.ok(fs.existsSync(routePath), `${templateId} test route should exist`)
    assert.match(fs.readFileSync(routePath, 'utf8'), /Array\.from\(\{ length: 10 \}/)
  }
  console.log('PASS questions twenty-eight and twenty-nine: curated image-letter mapping, shared generator, inline select, 4 valid choices and Q26 prompt voice')

  const questionTwentySeven = questionTwentyExam.questions.find(question => question.templateId === 'T27')
  assert.equal(questionTwentySeven?.data?.generator, 'FIND_COMMON_SOUND')
  assert.equal(questionTwentySeven?.data?.subType, 'common-sound')
  assert.ok(QUESTION_27_TEXT_MATCHED_WORDS.some(word => word.word === 'thỏ'), 'Q27 should keep the exact-text thỏ recording')
  assert.equal(QUESTION_27_TEXT_MATCHED_WORDS.some(word => word.word === 'thước' || word.word === 'thìa'), false,
    'Q27 should wait for bare-word recordings instead of using cây thước/cái thìa recordings')
  assert.ok(QUESTION_27_TEXT_MATCHED_WORDS.every(isQuestion27VoiceTextAligned), 'Q27 word voice filenames should match visible word text')
  const q27RoutePath = path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/test/cau-27/page.tsx')
  assert.ok(fs.existsSync(q27RoutePath), 'question twenty-seven test route should exist')
  const q27Route = fs.readFileSync(q27RoutePath, 'utf8')
  assert.match(q27Route, /Array\.from\(\{ length: 10 \}/)
  assert.match(q27Route, /âm có thể ở đầu, giữa hoặc cuối từ/)
  const q27SentenceVoicePrefix = '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common/cac-tu.mp3'
  const q27SentenceVoiceSuffix = '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common/co-chung-am-gi.mp3'
  const q27InstructionVoice = '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common/chon-dap-an-thich-hop-dien-vao-cho-trong.mp3'
  const recentQ27Keys = []
  const q27Samples = Array.from({ length: 64 }, (_, index) => {
    const seed = `common-sound-q27-${index}`
    const question = generateQuestion27({ seedHash: seed, random: createSeededRandom(seed), recentCombinationKeys: recentQ27Keys })
    recentQ27Keys.push(question.data.selectionKey)
    const sharedSounds = QUESTION_27_VALID_SOUNDS.filter(sound => question.data.words.every(word => getQuestion27Sounds(word.word).includes(sound)))
    assert.equal(question.data.words.length, 3)
    assert.equal(sharedSounds.length, 1, 'three words should have exactly one common sound answer')
    assert.equal(sharedSounds[0], question.data.targetSound)
    assert.equal(question.data.sentencePrefix.endsWith('có chung âm'), true)
    assert.equal(question.options.length, 4)
    assert.equal(new Set(question.options.map(option => option.text)).size, 4)
    assert.ok(question.options.some(option => option.id === question.correctAnswer && option.text === question.data.targetSound))
    assert.deepEqual(question.promptVoice, [q27InstructionVoice])
    assert.deepEqual(question.data.voiceSequence, [q27SentenceVoicePrefix, ...question.data.words.map(word => word.voice), q27SentenceVoiceSuffix])
    assert.ok(question.data.words.every(isQuestion27VoiceTextAligned), 'Q27 spoken word voice should match each visible word exactly')
    assert.ok(question.data.words.every(word => QUESTION_27_WORDS.some(canonical => canonical.id === word.id)
      && fs.existsSync(path.join(root, 'public', word.voice.replace(/^\//, '')))))
    return question
  })
  assert.equal(new Set(q27Samples.map(question => question.data.selectionKey)).size, q27Samples.length, 'Q27 sample batch should not repeat word combinations')
  assert.ok(q27Samples.some(question => question.data.words.some(word => word.initial !== question.data.targetSound)),
    'Q27 should include common sounds outside the first sound of every word')
  const safeQuestionTwentySeven = sanitizeGeneratedExam(questionTwentyExam).questions.find(question => question.data?.generator === 'FIND_COMMON_SOUND')
  assert.equal(Object.hasOwn(safeQuestionTwentySeven.data, 'targetSound'), false, 'question twenty-seven should not reveal its answer')
  console.log('PASS question twenty-seven: unique sound shared anywhere in three words, voices, choices, and ten-question test route')

  const questionThirty = questionTwentyExam.questions.find(question => question.templateId === 'T30')
  assert.equal(questionThirty?.type, 'drag-fill')
  assert.equal(questionThirty?.subType, 'fruit-color-letter')
  assert.equal(questionThirty?.data?.generator, 'FILL_FRUIT_COLOR_LETTER')
  assert.equal(questionThirty?.data?.subType, 'fruit-color-letter')
  assert.equal(questionThirty?.prompt, 'Kéo thả chữ cái thích hợp vào chỗ trống.')
  const q30Data = questionThirty.data
  assert.equal(q30Data.items.length, 3)
  assert.equal(new Set(q30Data.items.map(item => item.fruit.id)).size, 3)
  assert.equal(new Set(q30Data.items.map(item => item.color.id)).size, 3)
  assert.equal(new Set(q30Data.items.map(item => item.letter)).size, 3)
  assert.equal(q30Data.letterBank.length, 5)
  assert.equal(new Set(q30Data.letterBank).size, 5)
  assert.ok(q30Data.items.every(item => q30Data.letterBank.includes(item.letter)))
  assert.equal(q30Data.letterBank.filter(letter => !q30Data.items.some(item => item.letter === letter)).length, 2)
  assert.ok(q30Data.items.every(item => QUESTION_30_FRUIT_POOL.some(fruit => JSON.stringify(fruit) === JSON.stringify(item.fruit))))
  assert.ok(q30Data.items.every(item => QUESTION_30_COLOR_POOL.some(color => JSON.stringify(color) === JSON.stringify(item.color))))
  assert.ok(q30Data.items.every(item => QUESTION_30_ALLOWED_LETTERS.includes(item.letter)))
  assert.ok(q30Data.items.every(item => {
    const visual = getQuestion30FruitVisual(item.fruit)
    assert.equal(visual?.sprite?.spriteSheet, FRUIT_NONE_COLOR_JSON.image)
    assert.ok(visual?.sprite?.width > 0 && visual?.sprite?.height > 0)
    return fs.existsSync(path.join(root, 'public', item.fruit.voice.replace(/^\//, '')))
  }))
  assert.ok(q30Data.items.every(item => {
    const expectedSequence = [QUESTION_30_COMMON_VOICE.fruitClassifier, item.fruit.voice, item.color.voice, QUESTION_30_COMMON_VOICE.askForLetter]
    assert.deepEqual(item.voiceSequence, expectedSequence)
    return item.voiceAvailable === expectedSequence.every(voice => fs.existsSync(path.join(root, 'public', voice.replace(/^\//, ''))))
  }))
  assert.deepEqual(questionThirty.correctAnswer, Object.fromEntries(q30Data.items.map(item => [item.id, item.letter])))
  assert.equal(isQuestionAnswered(questionThirty, undefined), false)
  assert.equal(isQuestionAnswered(questionThirty, { [q30Data.items[0].id]: q30Data.items[0].letter }), false)
  assert.equal(isQuestionAnswered(questionThirty, questionThirty.correctAnswer), true)
  assert.equal(gradeQuestion(questionThirty, questionThirty.correctAnswer), true)
  const q30WrongAnswer = {
    ...questionThirty.correctAnswer,
    [q30Data.items[0].id]: q30Data.items[1].letter,
    [q30Data.items[1].id]: q30Data.items[0].letter,
  }
  assert.equal(gradeQuestion(questionThirty, q30WrongAnswer), false)
  assert.equal(isValidTrangNguyenAnswerMap({ [questionThirty.id]: { [q30Data.items[0].id]: q30Data.items[0].letter } }, questionTwentyExam), true,
    'partial Q30 placements must remain valid while the learner edits')
  assert.equal(isValidTrangNguyenAnswerMap({ [questionThirty.id]: { [q30Data.items[0].id]: q30Data.items[0].letter, [q30Data.items[1].id]: q30Data.items[0].letter } }, questionTwentyExam), false,
    'the same Q30 letter cannot be used in two slots')
  assert.equal(isValidTrangNguyenAnswerMap({ [questionThirty.id]: questionThirty.correctAnswer }, questionTwentyExam), true)
  assert.equal(isValidTrangNguyenAnswerMap({ [questionThirty.id]: q30WrongAnswer }, questionTwentyExam), true,
    'a valid but incorrect Q30 placement should reach grading')
  const sanitizedQuestionThirty = sanitizeGeneratedExam(questionTwentyExam).questions.find(question => question.templateId === 'T30')
  assert.equal(Object.hasOwn(sanitizedQuestionThirty, 'correctAnswer'), false)
  assert.equal(Object.hasOwn(sanitizedQuestionThirty.data, 'combinationKey'), false)
  assert.equal(Object.hasOwn(sanitizedQuestionThirty.data, 'selectionSignature'), false)
  assert.equal(Object.hasOwn(previewQuestion(questionThirty).data, 'combinationKey'), false)
  const q30RoutePath = path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/test/cau-30/page.tsx')
  assert.ok(fs.existsSync(q30RoutePath), 'question thirty test route should exist')
  assert.match(fs.readFileSync(q30RoutePath, 'utf8'), /Array\.from\(\{ length: 10 \}/)

  const recentQ30Signatures = []
  const q30Samples = Array.from({ length: 64 }, (_, index) => {
    const seed = `fruit-color-letter-q30-${index}`
    const question = generateQuestion30({ seedHash: seed, random: createSeededRandom(seed), recentSelectionSignatures: recentQ30Signatures })
    const data = question.data
    const signatureParts = data.selectionSignature.split('::')
    for (const recentSignature of recentQ30Signatures) {
      const recentParts = recentSignature.split('::')
      assert.ok(signatureParts.every((part, partIndex) => part !== recentParts[partIndex]), 'Q30 should avoid repeating the same fruit, color, or letter set consecutively')
    }
    assert.equal(question.type, 'drag-fill')
    assert.equal(data.items.length, 3)
    assert.equal(new Set(data.items.map(item => item.fruit.id)).size, 3)
    assert.equal(new Set(data.items.map(item => item.color.id)).size, 3)
    assert.equal(new Set(data.items.map(item => item.letter)).size, 3)
    assert.equal(data.letterBank.length, 5)
    assert.equal(new Set(data.letterBank).size, 5)
    assert.ok(data.items.every(item => data.letterBank.includes(item.letter)))
    assert.equal(data.letterBank.filter(letter => !data.items.some(item => item.letter === letter)).length, 2)
    validateVoiceAssets({ questions: [question] })
    recentQ30Signatures.push(data.selectionSignature)
    if (recentQ30Signatures.length > 2) recentQ30Signatures.shift()
    return data.selectionSignature
  })
  assert.equal(new Set(q30Samples).size, q30Samples.length, 'Q30 test batch should vary fruit, color, and letter sets')
  assert.match(fs.readFileSync(path.join(root, 'src/app/game/lop-1/tieng-viet/trang-nguyen/thi-thu/_components/renderers/DragFillQuestion.tsx'), 'utf8'), /data-q30-slot-id/)
  console.log('PASS question thirty: fruit sprite pool, unique colors/letters, five-tile bank, editable pointer drag, grading, voice readiness, recent-repeat avoidance, and ten-question test route')

  const sortQuestion = generateMockTrangNguyenExam({ seed: 'sorting-answered-state' }).questions.find(question => question.data?.generator === 'ORDER_VIETNAMESE_ALPHABET')
  assert.equal(isQuestionAnswered(sortQuestion, undefined), false)
  assert.equal(isQuestionAnswered(sortQuestion, (sortQuestion.data.items ?? []).map(item => item.id)), true)
  console.log('PASS Trang Nguyên exam: 100 stable exams, random generators and validation through question thirty, template positions, grading, choices, and available voice assets')
}

try { main() } catch (error) { console.error(error); process.exitCode = 1 }

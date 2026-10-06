import { APPLE_COLORS, emojiVisual, letterVisual } from './mock-assets'
import { pick, pickDistractors, shuffle, stableHash } from './shuffle'
import {
  ANIMALS, AVAILABLE_WORD_VOICES, FLOWERS, FRUITS, OBJECTS, ROOTS, TONE_NAMES,
  VEHICLES, VEGETABLES, VIETNAMESE_ALPHABET, WORD_BANK, letterVoice, toneVoice,
  type VietnameseWord,
} from './vietnamese-data'
import type { ExamOption, ExamOptionLabel, ExamQuestion, ExamQuestionType, ExamVisual, GeneratedExamQuestion } from './types'

type Random = () => number
const labels: ExamOptionLabel[] = ['A', 'B', 'C', 'D', 'E', 'F']
const alphOrder = new Map<string, number>(VIETNAMESE_ALPHABET.map((letter, index) => [letter, index]))
const optionId = (value: string) => encodeURIComponent(value.normalize('NFC').toLocaleLowerCase('vi-VN'))
const visualForWord = (word: VietnameseWord): ExamVisual => emojiVisual(word.emoji, word.word)
const questionId = (seedHash: string, templateId: string) => `q-${seedHash}-${templateId}`

function baseQuestion(
  seedHash: string,
  templateId: `T${string}`,
  type: ExamQuestionType,
  prompt: string,
  correctAnswer: GeneratedExamQuestion['correctAnswer'],
  args: { difficulty?: 1 | 2 | 3; promptVoice?: string; options?: ExamOption[]; data?: Record<string, unknown>; content?: ExamQuestion['content']; knowledgeKey?: string } = {},
): GeneratedExamQuestion {
  return {
    id: questionId(seedHash, templateId), templateId, number: 0, type, prompt, correctAnswer,
    difficulty: args.difficulty ?? 1, options: args.options, data: args.data, content: args.content,
    promptVoice: args.promptVoice, knowledgeKey: args.knowledgeKey ?? templateId,
  }
}

function makeOptions(items: Array<{ id: string; text?: string; visual?: ExamVisual; voice?: string }>, random: Random): ExamOption[] {
  return shuffle(items, random).map((item, index) => ({ ...item, label: labels[index] }))
}

function textOptions(values: readonly string[], random: Random): ExamOption[] {
  return makeOptions(values.map(value => ({ id: `letter-${optionId(value)}`, text: value, visual: letterVisual(value) })), random)
}

function selectChoice<T extends { id: string; word: string; emoji: string; audio?: string }>(
  items: readonly T[], random: Random, count = 4,
): { selected: T[]; options: ExamOption[] } {
  const selected = pickDistractors({ pool: items, exclude: [], count, random })
  const options = makeOptions(selected.map(item => ({ id: item.id, text: item.word, visual: emojiVisual(item.emoji, item.word), voice: item.audio })), random)
  return { selected, options }
}

function matchingQuestion(args: {
  seedHash: string; templateId: `T${string}`; prompt: string; random: Random
  pairs: Array<{ id: string; left: ExamOption; right: ExamOption }>; difficulty?: 1 | 2 | 3
}): GeneratedExamQuestion {
  const left = shuffle(args.pairs, args.random).map(pair => pair.left)
  const right = shuffle(args.pairs, args.random).map(pair => pair.right)
  const correctAnswer = Object.fromEntries(args.pairs.map(pair => [pair.left.id, pair.right.id]))
  return baseQuestion(args.seedHash, args.templateId, 'matching', args.prompt, correctAnswer, {
    difficulty: args.difficulty ?? 2, data: { leftItems: left, rightItems: right },
  })
}

function generateT01(seedHash: string, random: Random) {
  const target = pick(VIETNAMESE_ALPHABET, random)
  const choices = [target, ...pickDistractors({ pool: VIETNAMESE_ALPHABET, exclude: [target], count: 3, random })]
  const options = makeOptions(choices.map(letter => ({ id: `star-${letter}`, text: letter, visual: letterVisual(letter), voice: letterVoice(letter) })), random)
  return baseQuestion(seedHash, 'T01', 'single-choice', `Ngôi sao nào có chữ “${target}”?`, `star-${target}`, { options, content: { type: 'visual', visual: emojiVisual('⭐') } })
}

function generateT02(seedHash: string, random: Random) {
  const target = pick(VIETNAMESE_ALPHABET, random)
  const choices = [target, ...pickDistractors({ pool: VIETNAMESE_ALPHABET, exclude: [target], count: 3, random })]
  const options = makeOptions(choices.map((letter, index) => ({ id: `balloon-${letter}`, text: letter, visual: emojiVisual(['🎈', '🎈', '🎈', '🎈'][index]), voice: letterVoice(letter) })), random)
  return baseQuestion(seedHash, 'T02', 'image-choice', `Quả bóng nào có chữ “${target}”?`, `balloon-${target}`, { options, difficulty: 1 })
}

function generateT03(seedHash: string, random: Random) {
  const voicedLetters = VIETNAMESE_ALPHABET.filter(letter => letterVoice(letter))
  const target = pick(voicedLetters, random)
  const choices = [target, ...pickDistractors({ pool: voicedLetters, exclude: [target], count: 3, random })]
  return baseQuestion(seedHash, 'T03', 'audio-choice', 'Đây là phát âm của chữ gì?', `letter-${optionId(target)}`, {
    promptVoice: letterVoice(target), options: textOptions(choices, random), difficulty: 1,
  })
}

function generateT04(seedHash: string, random: Random) {
  const voicedLetters = VIETNAMESE_ALPHABET.filter(letter => letterVoice(letter))
  const target = pick(voicedLetters, random)
  const choices = [target, ...pickDistractors({ pool: voicedLetters, exclude: [target], count: 3, random })]
  return baseQuestion(seedHash, 'T04', 'audio-choice', 'Đây là phát âm của chữ gì?', `letter-${optionId(target)}`, {
    promptVoice: letterVoice(target), options: textOptions(choices, random), difficulty: 1,
  })
}

function generateT05(seedHash: string, random: Random) {
  const target = pick(['a', 'b', 'c', 'e', 'ê', 'o', 'm', 'n'], random)
  const correctPool = WORD_BANK.filter(word => word.word.normalize('NFC').toLocaleLowerCase('vi-VN').includes(target))
  const wrongPool = WORD_BANK.filter(word => !word.word.normalize('NFC').toLocaleLowerCase('vi-VN').includes(target))
  const answer = pick(correctPool, random)
  const selected = [answer, ...pickDistractors({ pool: wrongPool, exclude: [answer], count: 3, random })]
  const options = makeOptions(selected.map(word => ({ id: word.id, text: word.word, visual: visualForWord(word), voice: word.audio })), random)
  return baseQuestion(seedHash, 'T05', 'image-choice', `Thẻ tên nào có chữ “${target}”?`, answer.id, {
    options, difficulty: 1,
  })
}

const voicedSyllables = [
  { text: 'cá', tone: 'sắc', src: '/games/general/voices/tieng-viet/syllables/ca-sac.mp3' },
  { text: 'bà', tone: 'huyền', src: '/games/general/voices/tieng-viet/syllables/ba-huyen.mp3' },
  { text: 'bè', tone: 'huyền', src: '/games/general/voices/tieng-viet/syllables/be-huyen.mp3' },
  { text: 'bé', tone: 'sắc', src: '/games/general/voices/tieng-viet/syllables/be-sac.mp3' },
  { text: 'bố', tone: 'sắc', src: '/games/general/voices/tieng-viet/syllables/bo-ocirc-sac.mp3' },
  { text: 'bộ', tone: 'nặng', src: '/games/general/voices/tieng-viet/syllables/bo-ocirc-nang.mp3' },
  { text: 'khỉ', tone: 'hỏi', src: '/games/general/voices/tieng-viet/syllables/khi-hoi.mp3' },
] as const

function generateT06(seedHash: string, random: Random) {
  const stimulus = pick(voicedSyllables, random)
  const choices = [stimulus.tone, ...pickDistractors({ pool: TONE_NAMES, exclude: [stimulus.tone], count: 3, random })]
  const options = makeOptions(choices.map(tone => ({ id: `tone-${optionId(tone)}`, text: tone, voice: toneVoice(tone) })), random)
  return baseQuestion(seedHash, 'T06', 'audio-choice', `Tiếng “${stimulus.text}” mang thanh gì?`, `tone-${optionId(stimulus.tone)}`, {
    promptVoice: stimulus.src, options, difficulty: 2,
  })
}

function generateT07(seedHash: string, random: Random) {
  const { selected, options } = selectChoice(ANIMALS, random)
  const answer = selected[0]
  return baseQuestion(seedHash, 'T07', 'image-choice', `Đâu là ${answer.word}?`, answer.id, {
    options, difficulty: 1,
  })
}

function generateT08(seedHash: string, random: Random) {
  const { selected, options } = selectChoice(OBJECTS, random)
  const answer = selected[0]
  return baseQuestion(seedHash, 'T08', 'image-choice', `Đâu là ${answer.word}?`, answer.id, { options, difficulty: 1 })
}

function generateT09(seedHash: string, random: Random) {
  const answer = pick(FLOWERS, random)
  const others = pickDistractors({ pool: FLOWERS, exclude: [answer], count: 3, random })
  const selected = [answer, ...others]
  const options = makeOptions(selected.map(flower => ({
    id: flower.id, text: flower.word, visual: emojiVisual(flower.emoji, flower.word),
    voice: AVAILABLE_WORD_VOICES[flower.word],
  })), random)
  return baseQuestion(seedHash, 'T09', 'image-choice', 'Tên của bông hoa trong hình là gì?', answer.id, {
    options, difficulty: 2, content: { type: 'visual', visual: emojiVisual(answer.emoji, answer.word) },
  })
}

function generateT10(seedHash: string, random: Random) {
  const targetLetters = pickDistractors({ pool: VIETNAMESE_ALPHABET, exclude: [], count: 3, random })
  const distractors = pickDistractors({ pool: VIETNAMESE_ALPHABET, exclude: targetLetters, count: 2, random })
  const choices = shuffle([...targetLetters, ...distractors], random)
  const options = makeOptions(choices.map(letter => ({ id: `letter-${letter}`, text: letter, visual: letterVisual(letter) })), random)
  const scene = targetLetters.map(letter => letterVisual(letter))
  return baseQuestion(seedHash, 'T10', 'multi-select', 'Những chữ cái nào có trong hình? Chọn tất cả đáp án đúng.', targetLetters.map(letter => `letter-${letter}`), {
    options, difficulty: 2, content: { type: 'visuals', visuals: scene },
  })
}

function generateT11(seedHash: string, random: Random) {
  const target = Math.floor(random() * 11)
  const dots = Array.from({ length: target }, () => emojiVisual('●'))
  return baseQuestion(seedHash, 'T11', 'number-input', 'Hãy nhập số lượng hình tròn.', String(target), {
    difficulty: 1, content: { type: 'visuals', visuals: dots }, data: { minimum: 0, maximum: 10 },
  })
}

function generateT12(seedHash: string, random: Random) {
  const target = pick(VIETNAMESE_ALPHABET, random)
  return baseQuestion(seedHash, 'T12', 'text-input', 'Gõ chữ cái được in trên thẻ.', target, {
    difficulty: 1, content: { type: 'visual', visual: letterVisual(target) }, data: { normalizeCase: true },
  })
}

function generateT13(seedHash: string, random: Random) {
  const target = pick(['a', 'b', 'c', 'd', 'e', 'g', 'm', 'n'], random)
  const count = 2 + Math.floor(random() * 4)
  const fillers = pickDistractors({ pool: VIETNAMESE_ALPHABET, exclude: [target], count: 5, random })
  const cells = [...Array.from({ length: count }, () => target), ...Array.from({ length: 16 - count }, (_, index) => fillers[index % fillers.length])]
  const grid = shuffle(cells, random)
  return baseQuestion(seedHash, 'T13', 'number-input', `Trong hình trên có bao nhiêu chữ “${target}”?`, String(count), {
    difficulty: 2, data: { targetLetter: target, grid, columns: 4, minimum: 2, maximum: 5 },
  })
}

function generateT14(seedHash: string, random: Random) {
  const target = pick(VIETNAMESE_ALPHABET, random)
  const objects = [
    { id: 'shell', label: 'vỏ trai', emoji: '🐚' },
    { id: 'fish', label: 'con cá', emoji: '🐟' },
    { id: 'plant', label: 'rong biển', emoji: '🌿' },
  ]
  const hidden = pick(objects, random)
  const scene = objects.map((item, index) => ({ ...item, letter: item.id === hidden.id ? target : pick(VIETNAMESE_ALPHABET.filter(letter => letter !== target), random), place: index + 1 }))
  return baseQuestion(seedHash, 'T14', 'text-input', `Chữ nào đang ẩn trong ${hidden.label}?`, target, {
    difficulty: 2, data: { scene, instruction: 'Gõ chữ cái em tìm thấy.' },
  })
}

function generateT15(seedHash: string, random: Random) {
  const candidates = ['b', 'd', 'p', 'q', 'n', 'r']
  const target = pick(candidates, random)
  const distractors = pickDistractors({ pool: VIETNAMESE_ALPHABET, exclude: [...candidates], count: 4, random })
  const letters = shuffle([target, ...distractors], random)
  const rotatedIndex = Math.floor(random() * letters.length)
  const display = letters.map((letter, index) => ({ letter, rotation: index === rotatedIndex ? 180 : 0 }))
  return baseQuestion(seedHash, 'T15', 'text-input', 'Chữ nào trong hình đang bị xoay ngược?', letters[rotatedIndex], {
    difficulty: 2, data: { letters: display },
  })
}

function generateT16(seedHash: string, random: Random) {
  const letters = pickDistractors({ pool: VIETNAMESE_ALPHABET, exclude: [], count: 3, random })
  const pairs = letters.map((letter, index) => ({
    id: `${index}`,
    left: { id: `left-${index}-${letter}`, text: letter, visual: letterVisual(letter) },
    right: { id: `right-${index}-${letter}`, text: letter, visual: letterVisual(letter) },
  }))
  return matchingQuestion({ seedHash, templateId: 'T16', prompt: 'Nối những chữ cái giống nhau.', random, pairs, difficulty: 1 })
}

function generateT17(seedHash: string, random: Random) {
  const letters = pickDistractors({ pool: VIETNAMESE_ALPHABET, exclude: [], count: 3, random })
  const pairs = letters.map((letter, index) => ({
    id: `${index}`,
    left: { id: `lower-${index}-${letter}`, text: letter, visual: letterVisual(letter) },
    right: { id: `upper-${index}-${letter}`, text: letter.toLocaleUpperCase('vi-VN'), visual: letterVisual(letter.toLocaleUpperCase('vi-VN')) },
  }))
  return matchingQuestion({ seedHash, templateId: 'T17', prompt: 'Nối chữ thường với chữ hoa tương ứng.', random, pairs })
}

function generateT18(seedHash: string, random: Random) {
  const voicedLetters = VIETNAMESE_ALPHABET.filter(letter => letterVoice(letter))
  const selected = pickDistractors({ pool: voicedLetters, exclude: [], count: 3, random })
  const pairs = selected.map((letter, index) => ({
    id: `${index}`,
    left: { id: `letter-${index}-${letter}`, text: letter, visual: letterVisual(letter) },
    right: { id: `sound-${index}-${letter}`, text: `Âm thanh ${index + 1}`, voice: letterVoice(letter) },
  }))
  return matchingQuestion({ seedHash, templateId: 'T18', prompt: 'Nối mỗi chữ cái với âm thanh tương ứng.', random, pairs, difficulty: 3 })
}

function generateT19(seedHash: string, random: Random) {
  const recordedObjects = [
    { id: 'wooden-items', word: 'đồ gỗ', emoji: '🪵', voice: AVAILABLE_WORD_VOICES['đồ gỗ'] },
    { id: 'wooden-chair', word: 'ghế gỗ', emoji: '🪑', voice: AVAILABLE_WORD_VOICES['ghế gỗ'] },
    { id: 'wooden-house', word: 'nhà gỗ', emoji: '🏠', voice: '/games/general/voices/tieng-viet/words/nha-go.mp3' },
  ]
  const pairs = recordedObjects.map((item, index) => ({
    id: `${index}`,
    left: { id: `object-${index}-${item.id}`, text: item.word, visual: emojiVisual(item.emoji, item.word) },
    right: { id: `object-sound-${index}-${item.id}`, text: `Tên đồ vật ${index + 1}`, voice: item.voice },
  }))
  return matchingQuestion({ seedHash, templateId: 'T19', prompt: 'Nối hình đồ vật với tên được đọc.', random, pairs, difficulty: 3 })
}

function generateT20(seedHash: string, random: Random) {
  const numbers = pickDistractors({ pool: Array.from({ length: 10 }, (_, index) => String(index)), exclude: [], count: 3, random })
  const letters = pickDistractors({ pool: VIETNAMESE_ALPHABET, exclude: [], count: 3, random })
  const items = shuffle([
    ...numbers.map((value, index) => ({ id: `number-${index}-${value}`, text: value, visual: letterVisual(value) })),
    ...letters.map((value, index) => ({ id: `letter-${index}-${value}`, text: value, visual: letterVisual(value) })),
  ], random)
  const correctAnswer = Object.fromEntries(items.map(item => [item.id, item.id.startsWith('number-') ? 'numbers' : 'letters']))
  return baseQuestion(seedHash, 'T20', 'categorize', 'Xếp từng thẻ vào nhóm chữ số hoặc chữ cái.', correctAnswer, {
    difficulty: 2, data: { items, groups: [{ id: 'numbers', label: 'Chữ số' }, { id: 'letters', label: 'Chữ cái' }] },
  })
}

function generateT21(seedHash: string, random: Random) {
  const vegetables = pickDistractors({ pool: VEGETABLES, exclude: [], count: 3, random })
  const roots = pickDistractors({ pool: ROOTS, exclude: [], count: 3, random })
  const items = shuffle([
    ...vegetables.map(word => ({ id: word.id, text: word.word, visual: visualForWord(word) })),
    ...roots.map(word => ({ id: word.id, text: word.word, visual: visualForWord(word) })),
  ], random)
  const correctAnswer = Object.fromEntries(items.map(item => [item.id, roots.some(root => root.id === item.id) ? 'roots' : 'vegetables']))
  return baseQuestion(seedHash, 'T21', 'categorize', 'Xếp rau vào nhóm 1 và củ vào nhóm 2.', correctAnswer, {
    difficulty: 2, data: { items, groups: [{ id: 'vegetables', label: '1 · Rau' }, { id: 'roots', label: '2 · Củ' }] },
  })
}

function generateT22(seedHash: string, random: Random) {
  const letters = pickDistractors({ pool: VIETNAMESE_ALPHABET, exclude: [], count: 5, random })
  const ordered = [...letters].sort((left, right) => (alphOrder.get(left) ?? 100) - (alphOrder.get(right) ?? 100))
  const items = shuffle(letters, random).map(letter => ({ id: `letter-${letter}`, text: letter, visual: letterVisual(letter), value: letter }))
  return baseQuestion(seedHash, 'T22', 'sorting', 'Sắp xếp chữ cái theo đúng thứ tự trong bảng chữ cái tiếng Việt.', ordered.map(letter => `letter-${letter}`), {
    difficulty: 2, data: { items },
  })
}

function generateT23(seedHash: string, random: Random) {
  const selected = pickDistractors({ pool: VEHICLES, exclude: [], count: 4, random })
  const ordered = [...selected].sort((left, right) => (left.rank ?? 99) - (right.rank ?? 99))
  const items = shuffle(selected, random).map(item => ({ id: item.id, text: item.word, visual: emojiVisual(item.emoji, item.word) }))
  return baseQuestion(seedHash, 'T23', 'sorting', `Sắp xếp theo thứ tự: ${ordered.map(item => item.word).join(' → ')}.`, ordered.map(item => item.id), {
    difficulty: 2, data: { items },
  })
}

function generateT24(seedHash: string, random: Random) {
  const flowers = pickDistractors({ pool: FLOWERS, exclude: [], count: 3, random })
  const letters = pickDistractors({ pool: VIETNAMESE_ALPHABET, exclude: [], count: flowers.length, random })
  const flowerData = flowers.map((flower, index) => ({ ...flower, letter: letters[index] }))
  const targetIndex = Math.floor(random() * flowerData.length)
  const target = flowerData[targetIndex]
  const options = makeOptions(letters.map(letter => ({ id: `letter-${letter}`, text: letter, visual: letterVisual(letter) })), random)
  return baseQuestion(seedHash, 'T24', 'video-select', 'Quan sát chú ong bay và chọn chữ cái trên bông hoa nơi ong đậu.', `letter-${target.letter}`, {
    difficulty: 2, options, data: { mediaType: 'animation', animation: 'bee-flight', flowers: flowerData.map(flower => ({ id: flower.id, emoji: flower.emoji, word: flower.word, letter: flower.letter })), targetId: target.id },
  })
}

function propertyForWord(word: VietnameseWord, property: 'initial' | 'rhyme' | 'tone') {
  return word[property]
}

function generatePropertySelect(seedHash: string, random: Random, templateId: 'T25' | 'T26', source: readonly VietnameseWord[], group: 'fruit' | 'object') {
  const word = pick(source, random)
  const property = pick(['initial', 'rhyme', 'tone'] as const, random)
  const answer = propertyForWord(word, property)
  const candidates = WORD_BANK.filter(item => item.id !== word.id).map(item => propertyForWord(item, property)).filter(value => value !== answer)
  const choices = [answer, ...pickDistractors({ pool: candidates, exclude: [answer], count: 2, random })]
  const labelsByProperty = { initial: 'âm đầu', rhyme: 'vần', tone: 'thanh' }
  return baseQuestion(seedHash, templateId, 'select-input', `Tên ${group === 'fruit' ? 'trái cây' : 'đồ vật'} trong hình có ${labelsByProperty[property]} nào?`, answer, {
    difficulty: 2, content: { type: 'visual', visual: visualForWord(word) },
    data: { word: word.word, wordId: word.id, property, propertyLabel: labelsByProperty[property], choices: shuffle(Array.from(new Set(choices)), random) },
  })
}

function generateT25(seedHash: string, random: Random) {
  return generatePropertySelect(seedHash, random, 'T25', FRUITS, 'fruit')
}

function generateT26(seedHash: string, random: Random) {
  return generatePropertySelect(seedHash, random, 'T26', OBJECTS, 'object')
}

function generateT27(seedHash: string, random: Random) {
  const initialPools = new Map<string, VietnameseWord[]>()
  for (const word of WORD_BANK) initialPools.set(word.initial, [...(initialPools.get(word.initial) ?? []), word])
  const availableInitials = Array.from(initialPools.entries()).filter(([, pool]) => pool.length >= 3)
  const [initial, pool] = pick<[string, VietnameseWord[]]>(availableInitials, random)
  const words = pickDistractors({ pool, exclude: [], count: 3, random })
  const choices = [initial, ...pickDistractors({ pool: VIETNAMESE_ALPHABET, exclude: [initial], count: 2, random })]
  return baseQuestion(seedHash, 'T27', 'select-input', `Các tiếng “${words.map(word => word.word).join('”, “')}” có chung âm đầu nào?`, initial, {
    difficulty: 2, data: { words: words.map(word => word.word), property: 'initial', choices: shuffle(choices, random) },
  })
}

function generateT28(seedHash: string, random: Random) {
  const target = 'x'
  const choices = [target, ...pickDistractors({ pool: VIETNAMESE_ALPHABET, exclude: [target, 'c'], count: 2, random })]
  return baseQuestion(seedHash, 'T28', 'select-input', 'Hình chong chóng trên giống chữ cái nào?', target, {
    difficulty: 1, content: { type: 'visual', visual: { type: 'shape', value: '✳️', label: 'Chong chóng' } },
    data: { shape: 'pinwheel', choices: shuffle(choices, random) },
  })
}

function generateT29(seedHash: string, random: Random) {
  const target = 'C'
  const choices = [target, ...pickDistractors({ pool: ['G', 'N', 'O', 'U'] as const, exclude: [], count: 2, random })]
  return baseQuestion(seedHash, 'T29', 'select-input', 'Hình trăng lưỡi liềm giống chữ cái nào?', target, {
    difficulty: 1, content: { type: 'visual', visual: emojiVisual('🌙', 'Trăng lưỡi liềm') },
    data: { shape: 'crescent', choices: shuffle(choices, random) },
  })
}

function generateT30(seedHash: string, random: Random) {
  const letters = ['t', 'a', 'o']
  const targetBySlot: Record<string, string> = { greenApple: 't', yellowApple: 'a', redApple: 'o' }
  const slots = shuffle(APPLE_COLORS, random)
  const correctAnswer = Object.fromEntries(slots.map(slot => [slot.id, `tile-${targetBySlot[slot.id]}`]))
  const tileLetters = shuffle([...letters, ...pickDistractors({ pool: VIETNAMESE_ALPHABET, exclude: letters, count: 1, random })], random)
  const items = tileLetters.map(letter => ({ id: `tile-${letter}`, text: letter, visual: letterVisual(letter) }))
  const slotData = slots.map(slot => ({
    ...slot,
    prompt: `Quả táo màu ${slot.label.replace('táo ', '')} có chữ`,
  }))
  return baseQuestion(seedHash, 'T30', 'drag-to-slot', 'Kéo chữ vào ô táo có màu phù hợp.', correctAnswer, {
    difficulty: 3, data: { slots: slotData, items },
  })
}

export type TemplateGenerator = (seedHash: string, random: Random) => GeneratedExamQuestion

export const TEMPLATE_GENERATORS: readonly TemplateGenerator[] = [
  generateT01, generateT02, generateT03, generateT04, generateT05,
  generateT06, generateT07, generateT08, generateT09, generateT10,
  generateT11, generateT12, generateT13, generateT14, generateT15,
  generateT16, generateT17, generateT18, generateT19, generateT20,
  generateT21, generateT22, generateT23, generateT24, generateT25,
  generateT26, generateT27, generateT28, generateT29, generateT30,
]


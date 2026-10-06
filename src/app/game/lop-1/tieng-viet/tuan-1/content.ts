import type { LearningQuestion } from '@/components/games/general/learning-question'
import type { LearningSkill } from '@/components/games/general/learning-question'
import type { VoiceSegment } from '@/components/games/general/composed-voice'
import type { VietnameseWeek1Goal } from './lesson'
import { COMMON_VOICE_ROOT, getVietnameseInstructionVoice, resolveVietnameseTargetVoice, VIETNAMESE_VOICE_MANIFEST } from '@/components/games/vietnamese/voice-manifest'
import { containsVietnameseLetter, normalizeVietnameseQuestion, VIETNAMESE_QUESTION_TEMPLATES } from '@/components/games/vietnamese/question-model'
import { getWeek1SpriteById, type Week1ImageId } from '@/components/games/vietnamese/week1-sprites'

export const VOICE_ROOT = '/games/lessons/lop-1/tieng-viet/tuan-1/voices'
export { COMMON_VOICE_ROOT }
export const QUESTION_COUNT = 25

// The playable content stays scoped to lesson 1 (A/a). Later lessons will join
// the week pack through their own sourceLesson and learningKey values.
export const A_WORDS = ['Nam', 'Lan', 'Hà', 'ba', 'ca'] as const
export const WORD_DISTRACTORS = ['bé', 'em', 'mẹ', 'bò', 'cô', 'bố'] as const
const WEEK_1_SEARCH_CHOICES = [...A_WORDS, ...WORD_DISTRACTORS.filter(value => value !== 'bé'), 'bà', 'bè', 'bế', 'cà', 'cá', 'ba ba']
export type VietnameseGame = 'bubble-shooter' | 'gold-mining' | 'racing' | 'drag-drop'
export type VietnameseQuestion = LearningQuestion & {
  goalKey: VietnameseWeek1Goal
  sourceLesson: 1 | 2 | 3 | 4 | 5
  questionType: 'recognize' | 'matchSame' | 'matchCase' | 'listen' | 'findInText' | 'findCharInWord' | 'fillMissingChar' | 'IMAGE_CHOOSE_ONSET' | 'IMAGE_CHOOSE_VOWEL'
  options: string[]
  displayText: string
  spokenInstruction: string
  spokenTarget?: string
  voiceSequence?: VoiceSegment[]
  imageId?: Week1ImageId
  word?: string
  textMatch?: { before: string; after: string }
}

const RECOGNITION_KEYS: VietnameseWeek1Goal[] = ['RECOGNIZE_A','RECOGNIZE_A_CASE','RECOGNIZE_B','RECOGNIZE_B_CASE','RECOGNIZE_C','RECOGNIZE_C_CASE','RECOGNIZE_E','RECOGNIZE_E_CASE','RECOGNIZE_E_CIRCUMFLEX','RECOGNIZE_HUYEN','RECOGNIZE_SAC','RECOGNIZE_SAC','RECOGNIZE_TONES_CA','RECOGNIZE_E_WORDS','REVIEW_LETTERS_WEEK_1','REVIEW_CASE_WEEK_1']
const LISTEN_KEYS: VietnameseWeek1Goal[] = ['LISTEN_A','LISTEN_B','LISTEN_C','LISTEN_E_ECIRC','LISTEN_A','LISTEN_B','LISTEN_C','LISTEN_E_ECIRC']
const DRAG_KEYS: VietnameseWeek1Goal[] = ['MATCH_A','MATCH_B','BUILD_BA','MATCH_C','BUILD_CA','MATCH_E','BUILD_B_E','REVIEW_BUILD_SYLLABLES_WEEK_1','REVIEW_TONES_WEEK_1','REVIEW_READ_WORDS_WEEK_1']
const REVIEW_KEYS: VietnameseWeek1Goal[] = ['READ_B_WORDS','READ_C_WORDS','READ_E_WORDS','REVIEW_READ_WORDS_WEEK_1','REVIEW_SENTENCE_WEEK_1','FIND_A_IN_TEXT','FIND_B_IN_TEXT','FIND_C_IN_TEXT','FIND_E_IN_TEXT','RECOGNIZE_TONES_CA']
const countsFor = (keys: VietnameseWeek1Goal[], total: number) => {
  const counts: Partial<Record<VietnameseWeek1Goal, number>> = {}
  keys.forEach((key, index) => {
    const amount = Math.floor(total / keys.length) + (index < total % keys.length ? 1 : 0)
    if (amount) counts[key] = (counts[key] ?? 0) + amount
  })
  return counts
}
const combineCounts = (...groups: Array<Partial<Record<VietnameseWeek1Goal, number>>>) => groups.reduce<Partial<Record<VietnameseWeek1Goal, number>>>((all, group) => {
  Object.entries(group).forEach(([key, count]) => { all[key as VietnameseWeek1Goal] = (all[key as VietnameseWeek1Goal] ?? 0) + (count ?? 0) })
  return all
}, {})
export const DEFAULT_GOAL_COUNTS: Record<VietnameseGame, Partial<Record<VietnameseWeek1Goal, number>>> = {
  'bubble-shooter': (() => {
    const counts = combineCounts(countsFor(RECOGNITION_KEYS, 10), countsFor(LISTEN_KEYS, 6), countsFor(REVIEW_KEYS, 9))
    delete counts.REVIEW_SENTENCE_WEEK_1
    counts.REVIEW_READ_WORDS_WEEK_1 = (counts.REVIEW_READ_WORDS_WEEK_1 ?? 0) + 1
    return counts as Record<VietnameseWeek1Goal, number>
  })(),
  'gold-mining': combineCounts(countsFor(RECOGNITION_KEYS, 10), countsFor(LISTEN_KEYS, 5), countsFor(REVIEW_KEYS, 10)) as Record<VietnameseWeek1Goal, number>,
  racing: combineCounts(countsFor(RECOGNITION_KEYS, 10), countsFor(LISTEN_KEYS, 8), countsFor(REVIEW_KEYS, 7)) as Record<VietnameseWeek1Goal, number>,
  'drag-drop': combineCounts(countsFor(RECOGNITION_KEYS, 5), countsFor(DRAG_KEYS, 15), countsFor(REVIEW_KEYS, 5)) as Record<VietnameseWeek1Goal, number>,
}

type Template = Omit<VietnameseQuestion, 'id' | 'options'> & { variant: string; distractors: readonly string[] }
export const LETTER_OPTIONS = ['a', 'o', 'e', 'c', 'd', 'b', 'q', 'g'] as const
const lowerDistractors = LETTER_OPTIONS.filter(letter => letter !== 'a')
const upperDistractors = lowerDistractors.map(letter => letter.toUpperCase())

export type Week1ImageKnowledge = {
  imageId: Week1ImageId
  targetText: string
  sourceLesson: 1 | 2 | 3 | 4
  learningKey: VietnameseWeek1Goal
  dragDropLearningKey?: VietnameseWeek1Goal
  feature: { type: 'onset'; value: 'b' | 'c' } | { type: 'vowel'; value: 'a' | 'e' | 'ê' }
}

/** Image variants reinforce existing Week 1 goals without adding or renaming learning keys. */
export const WEEK_1_IMAGE_KNOWLEDGE: readonly Week1ImageKnowledge[] = [
  { imageId: 'ca', targetText: 'cá', sourceLesson: 3, learningKey: 'RECOGNIZE_C', feature: { type: 'onset', value: 'c' } },
  { imageId: 'ca_tim', targetText: 'cà', sourceLesson: 1, learningKey: 'RECOGNIZE_A', dragDropLearningKey: 'MATCH_A', feature: { type: 'vowel', value: 'a' } },
  { imageId: 'ba', targetText: 'ba', sourceLesson: 2, learningKey: 'RECOGNIZE_B', feature: { type: 'onset', value: 'b' } },
  { imageId: 'bo', targetText: 'bò', sourceLesson: 2, learningKey: 'RECOGNIZE_B', feature: { type: 'onset', value: 'b' } },
  { imageId: 'co', targetText: 'cò', sourceLesson: 3, learningKey: 'RECOGNIZE_C', feature: { type: 'onset', value: 'c' } },
  { imageId: 'ghe', targetText: 'ghế', sourceLesson: 4, learningKey: 'RECOGNIZE_E_CIRCUMFLEX', dragDropLearningKey: 'MATCH_E', feature: { type: 'vowel', value: 'ê' } },
  { imageId: 'me', targetText: 'me', sourceLesson: 4, learningKey: 'RECOGNIZE_E', dragDropLearningKey: 'MATCH_E', feature: { type: 'vowel', value: 'e' } },
  { imageId: 'khe', targetText: 'khế', sourceLesson: 4, learningKey: 'RECOGNIZE_E_CIRCUMFLEX', dragDropLearningKey: 'MATCH_E', feature: { type: 'vowel', value: 'ê' } },
]

export type VietnameseVoiceRecipe = { instruction: string; targetType: 'letter' | 'tone' | 'syllable' | 'word' | 'sentence'; target: string }
export function resolveVietnameseVoice(recipe: VietnameseVoiceRecipe) {
  const canonicalTarget = recipe.target.normalize('NFC')
  const targetType = ({ letter: 'letters', tone: 'tones', syllable: 'syllables', word: 'words', sentence: 'sentences' } as const)[recipe.targetType]
  const target = resolveVietnameseTargetVoice(targetType, canonicalTarget)
  return { instructionVoice: getVietnameseInstructionVoice(recipe.instruction), voice: target, voiceFallback: { instruction: 'Bé hãy chọn đáp án đúng.', target: recipe.target } }
}

function templatesFor(game: VietnameseGame): Template[] {
  const base = { skill: 'reading', inputMode: 'text', answerMode: 'select-text' } as const
  const templates: Template[] = []
  const add = (goalKey: VietnameseWeek1Goal, sourceLesson: VietnameseQuestion['sourceLesson'], variant: string, prompt: string, answer: string, distractors: readonly string[], target = answer, targetType: VietnameseVoiceRecipe['targetType'] = 'letter', questionType: VietnameseQuestion['questionType'] = 'recognize', instruction = 'FIND_LETTER', skill: LearningSkill = 'reading', voiceSequence?: VoiceSegment[], fallbackOptionSet?: readonly string[] | false, data?: Record<string, unknown>, imageId?: Week1ImageId) => {
    const isFill = questionType === 'fillMissingChar'
    const recipe = resolveVietnameseVoice({ instruction: isFill ? 'FILL_MISSING_LETTER' : instruction, targetType, target })
    const fallbackLetters = ['a', 'b', 'c', 'd', 'e', 'ê', 'o', 'm', 'n', 'i']
    const fallbackOptions = fallbackOptionSet === false ? [] : fallbackOptionSet ?? (targetType === 'letter'
      ? (answer !== answer.toLowerCase() ? fallbackLetters.map(letter => letter.toUpperCase()) : fallbackLetters)
      : targetType === 'tone' ? ['dấu huyền', 'dấu sắc', 'ba', 'ca'] : ['ba', 'bà', 'ca', 'cà', 'cá', 'bè', 'bé', 'bế'])
    const variedDistractors = Array.from(new Set([...distractors, ...fallbackOptions])).filter(option => option !== answer)
    const visiblePrompt = isFill ? 'Điền chữ còn thiếu.' : prompt
    const displayText = instruction === 'LISTEN_AND_CHOOSE' ? '🔊' : questionType === 'matchCase' ? `${target} → ?` : questionType === 'matchSame' ? '?' : isFill ? `${answer[0]}_` : target
    templates.push({ ...base, variant, goalKey, sourceLesson, questionType, prompt: visiblePrompt, displayText, answer, distractors: variedDistractors, data, imageId,
      skill, inputMode: instruction === 'LISTEN_AND_CHOOSE' ? 'audio' : questionType.startsWith('IMAGE_') ? 'image' : 'text',
      instructionVoice: voiceSequence ? undefined : recipe.instructionVoice, voice: isFill || voiceSequence ? undefined : recipe.voice, voiceSequence,
      spokenInstruction: `Bé hãy ${visiblePrompt.toLowerCase()}.`, spokenTarget: isFill || voiceSequence ? undefined : target })
  }
  const letters = [
    { char: 'a', upper: 'A', lesson: 1 as const, key: 'RECOGNIZE_A' as const, caseKey: 'RECOGNIZE_A_CASE' as const },
    { char: 'b', upper: 'B', lesson: 2 as const, key: 'RECOGNIZE_B' as const, caseKey: 'RECOGNIZE_B_CASE' as const },
    { char: 'c', upper: 'C', lesson: 3 as const, key: 'RECOGNIZE_C' as const, caseKey: 'RECOGNIZE_C_CASE' as const },
    { char: 'e', upper: 'E', lesson: 4 as const, key: 'RECOGNIZE_E' as const, caseKey: 'RECOGNIZE_E_CASE' as const },
    { char: 'ê', upper: 'Ê', lesson: 4 as const, key: 'RECOGNIZE_E_CIRCUMFLEX' as const, caseKey: 'RECOGNIZE_E_CASE' as const },
  ]
  const alphabet = letters.map(item => item.char)
  for (const item of letters) {
    const distractors = alphabet.filter(char => char !== item.char)
    add(item.key, item.lesson, `recognize-${item.char}`, VIETNAMESE_QUESTION_TEMPLATES.recognizeLetter(item.char), item.char, distractors, item.char, 'letter', game === 'drag-drop' ? 'matchSame' : 'recognize')
    const matchGoal = (({ a: 'MATCH_A', b: 'MATCH_B', c: 'MATCH_C', e: 'MATCH_E', 'ê': 'MATCH_E' } as const)[item.char] ?? 'MATCH_E')
    add(matchGoal, item.lesson, `match-${item.char}`, VIETNAMESE_QUESTION_TEMPLATES.recognizeLetter(item.char), item.char, distractors, item.char, 'letter', 'matchSame', 'CHOOSE_LETTER')
    const upperVoice = resolveVietnameseTargetVoice('letters', item.upper)
    const caseVoice = [
      { src: VIETNAMESE_VOICE_MANIFEST.common.chooseLetter, text: 'Bé hãy chọn chữ' },
      { src: VIETNAMESE_VOICE_MANIFEST.common.lowerCaseOf, text: 'thường của' },
      ...(upperVoice ? [{ src: upperVoice, text: item.upper }] : []),
    ]
    add(item.caseKey, item.lesson, `case-${item.char}`, VIETNAMESE_QUESTION_TEMPLATES.matchLowercase(item.upper), item.char,
      alphabet.filter(value => value !== item.char), item.upper, 'letter', 'matchCase', 'CHOOSE_LETTER', 'reading', caseVoice)
    const listenKey = (({ a: 'LISTEN_A', b: 'LISTEN_B', c: 'LISTEN_C', e: 'LISTEN_E_ECIRC', ê: 'LISTEN_E_ECIRC' } as const)[item.char] ?? 'LISTEN_E_ECIRC')
    add(listenKey, item.lesson, `listen-${item.char}`, 'Nghe và chọn', item.char, distractors, item.char, 'letter', 'listen', 'LISTEN_AND_CHOOSE', 'listening')
  }
  add('RECOGNIZE_E_CIRCUMFLEX', 4, 'e-vs-ee', 'Chọn chữ ê', 'ê', ['a', 'b', 'c', 'e'], 'ê', 'letter')
  for (const [goal, lesson, char] of [
    ['FIND_A_IN_TEXT', 1, 'a'], ['FIND_B_IN_TEXT', 2, 'b'], ['FIND_C_IN_TEXT', 3, 'c'], ['FIND_E_IN_TEXT', 4, 'e'], ['FIND_E_IN_TEXT', 4, 'ê'],
  ] as const) {
    const answers = WEEK_1_SEARCH_CHOICES.filter(value => containsVietnameseLetter(value, char))
    const distractors = WEEK_1_SEARCH_CHOICES.filter(value => !containsVietnameseLetter(value, char))
    for (const answer of answers) {
      const voiceSequence: VoiceSegment[] = [
        { src: VIETNAMESE_VOICE_MANIFEST.common.chooseWordWith, text: 'Bé hãy chọn từ có chữ' },
        { src: resolveVietnameseTargetVoice('letters', char)!, text: char },
      ]
      add(goal, lesson, `find-${char}-${answer}`, VIETNAMESE_QUESTION_TEMPLATES.findWordWith(char), answer, distractors,
        char, 'letter', 'findCharInWord', 'CHOOSE_WORD_WITH', 'reading', voiceSequence, false,
        { questionSemantics: 'contains-letter', targetLetter: char, targetText: answer, week: 1 })
    }
  }
  const syllables: Array<[VietnameseWeek1Goal, VietnameseQuestion['sourceLesson'], string, string, string[]]> = [
    ['BUILD_BA',2,'ba','ba',['b','a']], ['BUILD_BA',2,'bà','bà',['b','a']], ['RECOGNIZE_HUYEN',2,'dấu huyền','dấu huyền',['dấu sắc']],
    ['BUILD_CA',3,'ca','ca',['c','a']], ['BUILD_CA',3,'cà','cà',['c','a']], ['RECOGNIZE_SAC',3,'dấu sắc','dấu sắc',['dấu huyền']],
    ['RECOGNIZE_TONES_CA',3,'ca','ca',['cà','cá']], ['RECOGNIZE_TONES_CA',3,'cà','cà',['ca','cá']], ['RECOGNIZE_TONES_CA',3,'cá','cá',['ca','cà']],
    ['BUILD_B_E',4,'bè','bè',['b','e']], ['BUILD_B_E',4,'bé','bé',['b','e']], ['BUILD_B_E',4,'bế','bế',['b','ê']],
    ['RECOGNIZE_E_WORDS',4,'bè','bè',['bé','bế']], ['RECOGNIZE_E_WORDS',4,'bé','bé',['bè','bế']], ['RECOGNIZE_E_WORDS',4,'bế','bế',['bè','bé']],
    ['READ_B_WORDS',2,'ba ba','ba ba',['ba','bà']], ['READ_C_WORDS',3,'cá','cá',['ca','cà']], ['READ_E_WORDS',4,'bé','bé',['bè','bế']],
  ]
  for (const [goal, lesson, prompt, answer, distractors] of syllables) {
    add(goal, lesson, `syllable-${goal}-${answer}`, `Chọn tiếng ${answer}`, answer, distractors, answer, answer.startsWith('dấu') ? 'tone' : 'syllable', answer.startsWith('dấu') ? 'recognize' : 'findInText', answer.startsWith('dấu') ? 'CHOOSE_SYLLABLE' : 'FIND_SYLLABLE')
  }
  const buildTargets: Array<[VietnameseWeek1Goal, VietnameseQuestion['sourceLesson'], string, string[]]> = [
    ['BUILD_BA',2,'ba',['bà','ca','cà']], ['BUILD_CA',3,'ca',['cà','cá','ba']], ['BUILD_B_E',4,'bé',['bè','bế','ba']],
  ]
  for (const [goal, lesson, answer, distractors] of buildTargets) add(goal, lesson, `build-${goal}-${answer}`, 'Điền chữ còn thiếu.', answer, distractors, answer, 'syllable', 'fillMissingChar', 'FILL_MISSING_LETTER')
  const review = [
    ['REVIEW_LETTERS_WEEK_1', 5, 'Ôn các chữ trong tuần', 'ê', alphabet], ['REVIEW_CASE_WEEK_1', 5, 'Chọn chữ hoa tương ứng với a', 'A', ['B','C','E','Ê']],
    ['REVIEW_BUILD_SYLLABLES_WEEK_1', 5, 'Ghép thành tiếng bà', 'bà', ['ba','cà']], ['REVIEW_TONES_WEEK_1', 5, 'Chọn tiếng có dấu sắc', 'cá', ['ca','cà']],
    ['REVIEW_READ_WORDS_WEEK_1', 5, 'Đọc tiếng bé', 'bé', ['bè','bế']], ['REVIEW_SENTENCE_WEEK_1', 5, 'Đọc câu ngắn', 'Ba và bé', ['ba','bà']],
  ] as const
  for (const [goal, lesson, prompt, answer, distractors] of review) add(goal, lesson, `review-${goal}`, prompt, answer, distractors, answer, goal === 'REVIEW_SENTENCE_WEEK_1' ? 'sentence' : 'syllable', 'recognize', goal === 'REVIEW_SENTENCE_WEEK_1' ? 'CHOOSE_ANSWER' : 'CHOOSE_SYLLABLE')
  for (const goal of Object.keys(DEFAULT_GOAL_COUNTS[game]) as VietnameseWeek1Goal[]) {
    if (templates.some(template => template.goalKey === goal)) continue
    const sourceLesson = (goal.endsWith('_A') ? 1 : goal.endsWith('_B') ? 2 : goal.endsWith('_C') ? 3 : goal.endsWith('_E') || goal.includes('_E_') ? 4 : 5) as VietnameseQuestion['sourceLesson']
    const fallback = goal.includes('B') ? ['b', 'ba', 'bà'] : goal.includes('C') ? ['c', 'ca', 'cá'] : goal.includes('E') ? ['e', 'ê', 'bé'] : ['a', 'b', 'c']
    const answer = fallback[0]
    add(goal, sourceLesson, `coverage-${goal}`, `Chọn ${answer}`, answer, fallback.slice(1), answer, 'syllable', 'recognize', 'CHOOSE_SYLLABLE')
  }
  for (const [goal, needed] of Object.entries(DEFAULT_GOAL_COUNTS[game]) as Array<[VietnameseWeek1Goal, number]>) {
    const matching = templates.filter(template => template.goalKey === goal)
    // Reserve enough distinct variants for the configured adaptive budget.
    for (let index = matching.length; index < Math.min(QUESTION_COUNT, needed + 10); index++) {
      const source = matching[index % matching.length]
      templates.push({ ...source, variant: `${source.variant}-practice-${index}` })
    }
  }
  // Append image-only variants after expanding the text/audio templates so the old pool stays intact.
  for (const item of WEEK_1_IMAGE_KNOWLEDGE) {
    const sprite = getWeek1SpriteById(item.imageId)
    if (!sprite) throw new Error(`Week 1 image question has no sprite: ${item.imageId}`)
    const targetVoice = resolveVietnameseTargetVoice('syllables', item.targetText)
    if (!targetVoice) throw new Error(`Week 1 image question has no exact target recording: ${item.targetText}`)
    const isVowel = item.feature.type === 'vowel'
    const answer = item.feature.value
    const imageLetterDistractors = [...alphabet, ...LETTER_OPTIONS, 'ê'].filter((letter, index, all) => letter !== answer && all.indexOf(letter) === index)
    const learningKey = DEFAULT_GOAL_COUNTS[game][item.learningKey]
      ? item.learningKey
      : game === 'drag-drop' ? item.dragDropLearningKey : undefined
    if (!learningKey || !DEFAULT_GOAL_COUNTS[game][learningKey]) continue
    add(learningKey, item.sourceLesson, `image-${item.feature.type}-${item.imageId}`,
      isVowel ? 'Chọn nguyên âm có trong tên hình.' : 'Chọn phụ âm đầu của tên hình.',
      answer, alphabet.filter(letter => letter !== answer),
      item.targetText, 'syllable', isVowel ? 'IMAGE_CHOOSE_VOWEL' : 'IMAGE_CHOOSE_ONSET', 'CHOOSE_LETTER', 'reading',
      [
        { src: VIETNAMESE_VOICE_MANIFEST.common.chooseLetter, text: 'Bé hãy chọn chữ' },
        { src: targetVoice, text: item.targetText },
      ], imageLetterDistractors,
      { knowledgeType: 'imageWord', targetText: item.targetText, targetLetter: answer,
        ...(isVowel ? { vowel: answer } : { onset: answer }), imageId: item.imageId, week: 1 },
      sprite.id,
    )
  }
  return templates.filter(template => (DEFAULT_GOAL_COUNTS[game][template.goalKey] ?? 0) > 0)
}

function combinations(values: readonly string[], size: number): string[][] {
  if (!size) return [[]]
  return values.flatMap((value, index) => combinations(values.slice(index + 1), size - 1).map(rest => [value, ...rest]))
}

/** Distinct content includes the target/word AND the distractor combination, not option order. */
export function createQuestionPool(game: VietnameseGame): VietnameseQuestion[] {
  return templatesFor(game).flatMap(({ variant, distractors, ...template }) =>
    (game === 'drag-drop' ? [Math.min(5, distractors.length)] : game === 'gold-mining' ? [Math.min(3, distractors.length)] : game === 'racing' ? [Math.min(2, distractors.length)] : [Math.min(2, distractors.length), Math.min(3, distractors.length)].filter((value, index, values) => values.indexOf(value) === index)).flatMap(size => combinations(distractors, size).map(wrong => ({
      ...template, id: `${game}:${template.goalKey}:${variant}:${wrong.join('-')}`,
      options: [template.answer, ...wrong],
    }))))
    .map(question => normalizeVietnameseQuestion(question))
}

const questionPoolCache = new Map<VietnameseGame, VietnameseQuestion[]>()
function getQuestionPool(game: VietnameseGame): VietnameseQuestion[] {
  let pool = questionPoolCache.get(game)
  if (!pool) {
    pool = createQuestionPool(game)
    questionPoolCache.set(game, pool)
  }
  return pool
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

type GenerateOptions = { random?: () => number; previousIds?: readonly string[]; weakTargets?: readonly string[]; adaptiveCount?: number }

/** Structured sampling without replacement; every game round is generated from its full content pool. */
export function generateQuestionSet(game: VietnameseGame, options: GenerateOptions = {}): VietnameseQuestion[] {
  const random = options.random ?? Math.random
  const counts = { ...DEFAULT_GOAL_COUNTS[game] }
  const goals = Object.keys(counts) as VietnameseWeek1Goal[]
  const weak = shuffle(goals.filter(goal => options.weakTargets?.includes(goal)), random)
  const budget = Math.min(QUESTION_COUNT, Math.max(0, Math.floor(options.adaptiveCount ?? 0)))
  for (let i = 0; weak.length && i < budget; i++) {
    const donor = shuffle(goals.filter(goal => !weak.includes(goal) && counts[goal]! > 0), random)
      .sort((a, b) => counts[b]! - counts[a]!)[0]
    if (!donor) break
    counts[donor]! -= 1
    counts[weak[i % weak.length]]! += 1
  }
  const schedule = shuffle(goals.flatMap(goal => Array<VietnameseWeek1Goal>(counts[goal]!).fill(goal)), random)
  const pool = getQuestionPool(game)
  const previous = new Set(options.previousIds)
  const used = new Set<string>()
  return schedule.map((goal, round) => {
    const available = pool.filter(q => q.goalKey === goal && !used.has(q.id))
    const fresh = available.filter(q => !previous.has(q.id))
    let candidates = fresh.length ? fresh : available
    const easy = candidates.filter(q => !q.options.includes('c') && q.options.length === 3)
    if (round < 2 && easy.length) candidates = easy
    const question = candidates[Math.floor(random() * candidates.length)]
    if (!question) throw new Error(`Question pool exhausted for ${game}/${goal}`)
    used.add(question.id)
    return { ...question, options: shuffle(question.options, random) }
  })
}

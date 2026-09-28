import type { LearningQuestion } from '@/components/games/general/learning-question'
import type { LearningSkill } from '@/components/games/general/learning-question'
import type { VietnameseAGoal } from './lesson'

export const VOICE_ROOT = '/games/lessons/lop-1/tieng-viet/bai-1/voices'
export const COMMON_VOICE_ROOT = '/games/general/voices/tieng-viet'
export const QUESTION_COUNT = 25

// The playable content stays scoped to lesson 1 (A/a). Later lessons will join
// the week pack through their own sourceLesson and learningKey values.
export const A_WORDS = ['Nam', 'Lan', 'Hà', 'ba', 'ca'] as const
export const WORD_DISTRACTORS = ['bé', 'em', 'mẹ', 'bò', 'cô', 'bố'] as const
export type VietnameseGame = 'bubble-shooter' | 'gold-mining' | 'racing' | 'drag-drop'
export type VietnameseQuestion = LearningQuestion & {
  goalKey: VietnameseAGoal
  sourceLesson: 1 | 2 | 3 | 4 | 5
  questionType: 'recognize' | 'matchSame' | 'matchCase' | 'listen' | 'findInText' | 'findCharInWord' | 'fillMissingChar'
  options: string[]
  displayText: string
  spokenInstruction: string
  spokenTarget?: string
  word?: string
  textMatch?: { before: string; after: string }
}

const RECOGNITION_KEYS: VietnameseAGoal[] = ['RECOGNIZE_A','RECOGNIZE_A_CASE','RECOGNIZE_B','RECOGNIZE_B_CASE','RECOGNIZE_C','RECOGNIZE_C_CASE','RECOGNIZE_E','RECOGNIZE_E_CASE','RECOGNIZE_E_CIRCUMFLEX','RECOGNIZE_HUYEN','RECOGNIZE_SAC','RECOGNIZE_SAC','RECOGNIZE_TONES_CA','RECOGNIZE_E_WORDS','REVIEW_LETTERS_WEEK_1','REVIEW_CASE_WEEK_1']
const LISTEN_KEYS: VietnameseAGoal[] = ['LISTEN_A','LISTEN_B','LISTEN_C','LISTEN_E_ECIRC','LISTEN_A','LISTEN_B','LISTEN_C','LISTEN_E_ECIRC']
const DRAG_KEYS: VietnameseAGoal[] = ['MATCH_A','MATCH_B','BUILD_BA','MATCH_C','BUILD_CA','MATCH_E','BUILD_B_E','REVIEW_BUILD_SYLLABLES_WEEK_1','REVIEW_TONES_WEEK_1','REVIEW_READ_WORDS_WEEK_1']
const REVIEW_KEYS: VietnameseAGoal[] = ['READ_B_WORDS','READ_C_WORDS','READ_E_WORDS','REVIEW_READ_WORDS_WEEK_1','REVIEW_SENTENCE_WEEK_1','FIND_A_IN_TEXT','FIND_B_IN_TEXT','FIND_C_IN_TEXT','FIND_E_IN_TEXT','RECOGNIZE_TONES_CA']
const countsFor = (keys: VietnameseAGoal[], total: number) => {
  const counts: Partial<Record<VietnameseAGoal, number>> = {}
  keys.forEach((key, index) => {
    const amount = Math.floor(total / keys.length) + (index < total % keys.length ? 1 : 0)
    if (amount) counts[key] = (counts[key] ?? 0) + amount
  })
  return counts
}
const combineCounts = (...groups: Array<Partial<Record<VietnameseAGoal, number>>>) => groups.reduce<Partial<Record<VietnameseAGoal, number>>>((all, group) => {
  Object.entries(group).forEach(([key, count]) => { all[key as VietnameseAGoal] = (all[key as VietnameseAGoal] ?? 0) + (count ?? 0) })
  return all
}, {})
export const DEFAULT_GOAL_COUNTS: Record<VietnameseGame, Partial<Record<VietnameseAGoal, number>>> = {
  'bubble-shooter': (() => {
    const counts = combineCounts(countsFor(RECOGNITION_KEYS, 10), countsFor(LISTEN_KEYS, 6), countsFor(REVIEW_KEYS, 9))
    delete counts.REVIEW_SENTENCE_WEEK_1
    counts.REVIEW_READ_WORDS_WEEK_1 = (counts.REVIEW_READ_WORDS_WEEK_1 ?? 0) + 1
    return counts as Record<VietnameseAGoal, number>
  })(),
  'gold-mining': combineCounts(countsFor(RECOGNITION_KEYS, 10), countsFor(LISTEN_KEYS, 5), countsFor(REVIEW_KEYS, 10)) as Record<VietnameseAGoal, number>,
  racing: combineCounts(countsFor(RECOGNITION_KEYS, 10), countsFor(LISTEN_KEYS, 8), countsFor(REVIEW_KEYS, 7)) as Record<VietnameseAGoal, number>,
  'drag-drop': combineCounts(countsFor(RECOGNITION_KEYS, 5), countsFor(DRAG_KEYS, 15), countsFor(REVIEW_KEYS, 5)) as Record<VietnameseAGoal, number>,
}

type Template = Omit<VietnameseQuestion, 'id' | 'options'> & { variant: string; distractors: readonly string[] }
export const LETTER_OPTIONS = ['a', 'o', 'e', 'c', 'd', 'b', 'q', 'g'] as const
const lowerDistractors = LETTER_OPTIONS.filter(letter => letter !== 'a')
const upperDistractors = lowerDistractors.map(letter => letter.toUpperCase())

const commonVoice = (name: string) => `${COMMON_VOICE_ROOT}/common/${name}.mp3`
const letterVoiceRoot = `${COMMON_VOICE_ROOT}/letters`
const toneVoiceRoot = `${COMMON_VOICE_ROOT}/tones`
const syllableVoiceRoot = `${COMMON_VOICE_ROOT}/syllables`
const wordVoiceRoot = `${COMMON_VOICE_ROOT}/words`
const targetVoices: Record<string, string | undefined> = {
  a: `${letterVoiceRoot}/a.mp3`, A: `${letterVoiceRoot}/a.mp3`, b: `${letterVoiceRoot}/b.mp3`, B: `${letterVoiceRoot}/b.mp3`,
  c: `${letterVoiceRoot}/c.mp3`, C: `${letterVoiceRoot}/c.mp3`, e: `${letterVoiceRoot}/e.mp3`, E: `${letterVoiceRoot}/e.mp3`,
  'ê': `${letterVoiceRoot}/ee.mp3`, 'Ê': `${letterVoiceRoot}/ee.mp3`, ba: `${syllableVoiceRoot}/ba.mp3`, bà: `${syllableVoiceRoot}/ba-huyen.mp3`,
  'ba ba': `${syllableVoiceRoot}/ba-ba.mp3`, ca: `${syllableVoiceRoot}/ca.mp3`, cà: `${syllableVoiceRoot}/ca-huyen.mp3`, cá: `${syllableVoiceRoot}/ca-sac.mp3`,
  bè: `${syllableVoiceRoot}/be-huyen.mp3`, bé: `${syllableVoiceRoot}/be-sac.mp3`, bế: `${syllableVoiceRoot}/be-circumflex-sac.mp3`,
  ha: `${wordVoiceRoot}/ha.mp3`, hà: `${wordVoiceRoot}/ha.mp3`, lan: `${wordVoiceRoot}/lan.mp3`, nam: `${wordVoiceRoot}/nam.mp3`,
  'Ba và bé': `${COMMON_VOICE_ROOT}/sentences/ba-va-be.mp3`,
  'dấu huyền': `${toneVoiceRoot}/dau-huyen.mp3`, 'dấu sắc': `${toneVoiceRoot}/dau-sac.mp3`,
}

export type VietnameseVoiceRecipe = { instruction: string; targetType: 'letter' | 'tone' | 'syllable' | 'word' | 'sentence'; target: string }
export function resolveVietnameseVoice(recipe: VietnameseVoiceRecipe) {
  const instructionFiles: Record<string, string> = {
    FIND_LETTER: commonVoice('be-hay-tim-chu'), CHOOSE_LETTER: commonVoice('be-hay-chon-chu'), LISTEN_AND_CHOOSE: commonVoice('be-hay-nghe-va-chon'),
    FIND_SYLLABLE: commonVoice('be-hay-tim-tieng'), CHOOSE_SYLLABLE: commonVoice('be-hay-chon-tieng'), FIND_WORD: commonVoice('be-hay-tim-tu'),
    FIND_LETTER_IN_WORD: commonVoice('be-hay-tim-chu-trong-tu'), FILL_LETTER: commonVoice('be-hay-keo-chu-vao-cho-trong'),
    BUILD_SYLLABLE: commonVoice('be-hay-ghep-thanh-tieng'), CHOOSE_ANSWER: commonVoice('be-hay-chon-dap-an-dung'),
  }
  const canonicalTarget = recipe.target.normalize('NFC')
  const target = targetVoices[canonicalTarget] ?? targetVoices[canonicalTarget.toLowerCase()]
  return { instructionVoice: instructionFiles[recipe.instruction], voice: target, voiceFallback: { instruction: 'Bé hãy chọn đáp án đúng.', target: recipe.target } }
}

function templatesFor(game: VietnameseGame): Template[] {
  const base = { skill: 'reading', inputMode: 'text', answerMode: 'select-text' } as const
  const templates: Template[] = []
  const add = (goalKey: VietnameseAGoal, sourceLesson: VietnameseQuestion['sourceLesson'], variant: string, prompt: string, answer: string, distractors: readonly string[], target = answer, targetType: VietnameseVoiceRecipe['targetType'] = 'letter', questionType: VietnameseQuestion['questionType'] = 'recognize', instruction = 'FIND_LETTER', skill: LearningSkill = 'reading') => {
    const recipe = resolveVietnameseVoice({ instruction, targetType, target })
    const fallbackLetters = ['a', 'b', 'c', 'd', 'e', 'ê', 'o', 'm', 'n', 'i']
    const fallbackOptions = targetType === 'letter'
      ? (answer !== answer.toLowerCase() ? fallbackLetters.map(letter => letter.toUpperCase()) : fallbackLetters)
      : targetType === 'tone' ? ['dấu huyền', 'dấu sắc', 'ba', 'ca'] : ['ba', 'bà', 'ca', 'cà', 'cá', 'bè', 'bé', 'bế']
    const variedDistractors = Array.from(new Set([...distractors, ...fallbackOptions])).filter(option => option !== answer)
    templates.push({ ...base, variant, goalKey, sourceLesson, questionType, prompt, displayText: instruction === 'LISTEN_AND_CHOOSE' ? '🔊' : target, answer, distractors: variedDistractors,
      skill, inputMode: instruction === 'LISTEN_AND_CHOOSE' ? 'audio' : 'text',
      instructionVoice: recipe.instructionVoice, voice: recipe.voice, spokenInstruction: `Bé hãy ${prompt.toLowerCase()}.`, spokenTarget: target })
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
    add(item.key, item.lesson, `recognize-${item.char}`, `Tìm chữ ${item.char}`, item.char, distractors, item.char, 'letter', game === 'drag-drop' ? 'matchSame' : 'recognize')
    const matchGoal = (({ a: 'MATCH_A', b: 'MATCH_B', c: 'MATCH_C', e: 'MATCH_E', 'ê': 'MATCH_E' } as const)[item.char] ?? 'MATCH_E')
    add(matchGoal, item.lesson, `match-${item.char}`, `Ghép chữ ${item.char}`, item.char, distractors, item.char, 'letter', 'matchSame', 'CHOOSE_LETTER')
    add(item.caseKey, item.lesson, `case-${item.char}`, `Tìm chữ thường của ${item.upper}`, item.char, alphabet.filter(value => value !== item.char), item.char, 'letter', 'matchCase', 'CHOOSE_LETTER')
    const listenKey = (({ a: 'LISTEN_A', b: 'LISTEN_B', c: 'LISTEN_C', e: 'LISTEN_E_ECIRC', ê: 'LISTEN_E_ECIRC' } as const)[item.char] ?? 'LISTEN_E_ECIRC')
    add(listenKey, item.lesson, `listen-${item.char}`, 'Nghe và chọn', item.char, distractors, item.char, 'letter', 'listen', 'LISTEN_AND_CHOOSE', 'listening')
  }
  add('RECOGNIZE_E_CIRCUMFLEX', 4, 'e-vs-ee', 'Chọn chữ ê', 'ê', ['a', 'b', 'c', 'e'], 'ê', 'letter')
  for (const [goal, lesson, char, word] of [
    ['FIND_A_IN_TEXT', 1, 'a', 'Lan'], ['FIND_A_IN_TEXT', 1, 'a', 'Nam'], ['FIND_A_IN_TEXT', 1, 'a', 'ha'],
    ['FIND_B_IN_TEXT', 2, 'b', 'ba'], ['FIND_B_IN_TEXT', 2, 'b', 'bà'], ['FIND_C_IN_TEXT', 3, 'c', 'ca'], ['FIND_C_IN_TEXT', 3, 'c', 'cá'],
    ['FIND_E_IN_TEXT', 4, 'e', 'bè'], ['FIND_E_IN_TEXT', 4, 'e', 'bé'], ['FIND_E_IN_TEXT', 4, 'ê', 'bế'],
  ] as const) {
    const opts = Array.from(new Set([char, ...alphabet.filter(value => value !== char).slice(0, 4)]))
    add(goal, lesson, `find-${word}`, `Tìm chữ ${char} trong ${word}`, char, opts.filter(value => value !== char), char, 'letter', 'findInText', 'FIND_LETTER_IN_WORD')
  }
  const syllables: Array<[VietnameseAGoal, VietnameseQuestion['sourceLesson'], string, string, string[]]> = [
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
  const buildTargets: Array<[VietnameseAGoal, VietnameseQuestion['sourceLesson'], string, string[]]> = [
    ['BUILD_BA',2,'ba',['bà','ca','cà']], ['BUILD_CA',3,'ca',['cà','cá','ba']], ['BUILD_B_E',4,'bé',['bè','bế','ba']],
  ]
  for (const [goal, lesson, answer, distractors] of buildTargets) add(goal, lesson, `build-${goal}-${answer}`, `Ghép thành tiếng ${answer}`, answer, distractors, answer, 'syllable', 'fillMissingChar', 'BUILD_SYLLABLE')
  const review = [
    ['REVIEW_LETTERS_WEEK_1', 5, 'Ôn các chữ trong tuần', 'ê', alphabet], ['REVIEW_CASE_WEEK_1', 5, 'Chọn chữ hoa tương ứng với a', 'A', ['B','C','E','Ê']],
    ['REVIEW_BUILD_SYLLABLES_WEEK_1', 5, 'Ghép thành tiếng bà', 'bà', ['ba','cà']], ['REVIEW_TONES_WEEK_1', 5, 'Chọn tiếng có dấu sắc', 'cá', ['ca','cà']],
    ['REVIEW_READ_WORDS_WEEK_1', 5, 'Đọc tiếng bé', 'bé', ['bè','bế']], ['REVIEW_SENTENCE_WEEK_1', 5, 'Đọc câu ngắn', 'Ba và bé', ['ba','bà']],
  ] as const
  for (const [goal, lesson, prompt, answer, distractors] of review) add(goal, lesson, `review-${goal}`, prompt, answer, distractors, answer, goal === 'REVIEW_SENTENCE_WEEK_1' ? 'sentence' : 'syllable', 'recognize', goal === 'REVIEW_SENTENCE_WEEK_1' ? 'CHOOSE_ANSWER' : 'CHOOSE_SYLLABLE')
  for (const goal of Object.keys(DEFAULT_GOAL_COUNTS[game]) as VietnameseAGoal[]) {
    if (templates.some(template => template.goalKey === goal)) continue
    const sourceLesson = (goal.endsWith('_A') ? 1 : goal.endsWith('_B') ? 2 : goal.endsWith('_C') ? 3 : goal.endsWith('_E') || goal.includes('_E_') ? 4 : 5) as VietnameseQuestion['sourceLesson']
    const fallback = goal.includes('B') ? ['b', 'ba', 'bà'] : goal.includes('C') ? ['c', 'ca', 'cá'] : goal.includes('E') ? ['e', 'ê', 'bé'] : ['a', 'b', 'c']
    const answer = fallback[0]
    add(goal, sourceLesson, `coverage-${goal}`, `Chọn ${answer}`, answer, fallback.slice(1), answer, 'syllable', 'recognize', 'CHOOSE_SYLLABLE')
  }
  for (const [goal, needed] of Object.entries(DEFAULT_GOAL_COUNTS[game]) as Array<[VietnameseAGoal, number]>) {
    const matching = templates.filter(template => template.goalKey === goal)
    // Reserve enough distinct variants for the configured adaptive budget.
    for (let index = matching.length; index < Math.min(QUESTION_COUNT, needed + 10); index++) {
      const source = matching[index % matching.length]
      templates.push({ ...source, variant: `${source.variant}-practice-${index}` })
    }
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
    (game === 'drag-drop' ? [Math.min(5, distractors.length)] : game === 'racing' ? [Math.min(2, distractors.length)] : [Math.min(2, distractors.length), Math.min(3, distractors.length)].filter((value, index, values) => values.indexOf(value) === index)).flatMap(size => combinations(distractors, size).map(wrong => ({
      ...template, id: `${game}:${template.goalKey}:${variant}:${wrong.join('-')}`,
      options: [template.answer, ...wrong],
    }))))
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
  const goals = Object.keys(counts) as VietnameseAGoal[]
  const weak = shuffle(goals.filter(goal => options.weakTargets?.includes(goal)), random)
  const budget = Math.min(QUESTION_COUNT, Math.max(0, Math.floor(options.adaptiveCount ?? 0)))
  for (let i = 0; weak.length && i < budget; i++) {
    const donor = shuffle(goals.filter(goal => !weak.includes(goal) && counts[goal]! > 0), random)
      .sort((a, b) => counts[b]! - counts[a]!)[0]
    if (!donor) break
    counts[donor]! -= 1
    counts[weak[i % weak.length]]! += 1
  }
  const schedule = shuffle(goals.flatMap(goal => Array<VietnameseAGoal>(counts[goal]!).fill(goal)), random)
  const pool = createQuestionPool(game)
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

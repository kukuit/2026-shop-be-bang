import type { LearningQuestion } from '@/components/games/general/learning-question'
import type { VietnameseAGoal } from './lesson'

export const VOICE_ROOT = '/games/lessons/lop-1/tieng-viet/bai-1/voices'
// Words are visual carriers for a, never additional vocabulary/letter goals.
export const A_WORDS = ['Nam', 'Lan', 'Hà', 'ba', 'ca'] as const
export const WORD_DISTRACTORS = ['bé', 'em', 'mẹ', 'bò', 'cô', 'bố'] as const
export type VietnameseGame = 'bubble-shooter' | 'gold-mining' | 'racing' | 'drag-drop'
export type VietnameseQuestion = LearningQuestion & {
  goalKey: VietnameseAGoal
  questionType: 'recognize' | 'matchSame' | 'matchCase' | 'listen' | 'findInText' | 'findCharInWord' | 'fillMissingChar'
  options: string[]
  displayText: string
  spokenInstruction: string
  spokenTarget?: string
  word?: string
  textMatch?: { before: string; after: string }
}

export const DEFAULT_GOAL_COUNTS: Record<VietnameseGame, Partial<Record<VietnameseAGoal, number>>> = {
  'bubble-shooter': { RECOGNIZE_A: 3, RECOGNIZE_A_CASE: 2, LISTEN_A: 3, FIND_A_IN_TEXT: 2 },
  'gold-mining': { RECOGNIZE_A: 3, RECOGNIZE_A_CASE: 2, FIND_A_IN_TEXT: 5 },
  racing: { RECOGNIZE_A: 2, LISTEN_A: 5, RECOGNIZE_A_CASE: 2, FIND_A_IN_TEXT: 1 },
  'drag-drop': { RECOGNIZE_A: 2, RECOGNIZE_A_CASE: 3, MATCH_A: 3, FIND_A_IN_TEXT: 2 },
}

type Template = Omit<VietnameseQuestion, 'id' | 'options'> & { variant: string; distractors: readonly string[] }
export const LETTER_OPTIONS = ['a', 'o', 'e', 'c', 'd', 'b', 'q', 'g'] as const
const lowerDistractors = LETTER_OPTIONS.filter(letter => letter !== 'a')
const upperDistractors = lowerDistractors.map(letter => letter.toUpperCase())

function templatesFor(game: VietnameseGame): Template[] {
  const base = { skill: 'reading', inputMode: 'text', answerMode: 'select-text' } as const
  const templates: Template[] = [{
    ...base, variant: 'lower', goalKey: 'RECOGNIZE_A', questionType: game === 'drag-drop' ? 'matchSame' : 'recognize',
    prompt: 'Tìm chữ a', displayText: 'a', answer: 'a', distractors: lowerDistractors,
    instructionVoice: `${VOICE_ROOT}/find-a.mp3`, spokenInstruction: 'Bé hãy tìm chữ a.',
  }]
  for (const answer of ['a', 'A']) {
    const lower = answer === 'a'
    templates.push({
      ...base, variant: lower ? 'lower-of-A' : 'upper-of-a', goalKey: 'RECOGNIZE_A_CASE', questionType: 'matchCase',
      prompt: lower ? 'Chữ thường của A' : 'Chữ hoa của a', displayText: lower ? 'A → ?' : 'a → ?',
      answer, distractors: lower ? lowerDistractors : upperDistractors,
      instructionVoice: `${VOICE_ROOT}/${lower ? 'find-lowercase-a' : 'find-uppercase-a'}.mp3`,
      spokenInstruction: lower ? 'Bé hãy tìm chữ a thường.' : 'Bé hãy tìm chữ A hoa.',
    })
    templates.push({
      ...base, variant: lower ? 'listen-lower' : 'listen-upper', goalKey: 'LISTEN_A', questionType: 'listen',
      skill: 'listening', inputMode: 'audio', prompt: 'Nghe và chọn', displayText: '🔊',
      answer, distractors: lower ? lowerDistractors : upperDistractors,
      instructionVoice: '/games/general/voices/be_hay_nghe_va_chon_nhe.mp3', voice: `${VOICE_ROOT}/sound-a.mp3`,
      spokenInstruction: 'Bé hãy nghe và chọn nhé.', spokenTarget: 'a',
    })
  }
  for (const word of A_WORDS) {
    const index = word.indexOf('a')
    templates.push({
      ...base, variant: `find-${word}`, goalKey: 'FIND_A_IN_TEXT', questionType: game === 'drag-drop' ? 'findCharInWord' : 'findInText',
      prompt: game === 'gold-mining' ? 'Tìm từ có a' : `Tìm a trong ${word}`, displayText: game === 'gold-mining' ? 'Từ có a' : word,
      word, answer: game === 'gold-mining' ? word : 'a', distractors: game === 'gold-mining' ? WORD_DISTRACTORS : lowerDistractors,
      instructionVoice: `${VOICE_ROOT}/${game === 'gold-mining' ? 'find-word-with-a' : `find-a-in-${word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()}`}.mp3`,
      spokenInstruction: game === 'gold-mining' ? 'Bé hãy tìm từ có chữ a.' : `Bé hãy tìm chữ a trong từ ${word}.`,
    })
    // Accented a is recognized in words, but inserting plain a would lose its tone mark.
    if (index < 0) continue
    templates.push({
      ...base, variant: `fill-${word}`, goalKey: 'MATCH_A', questionType: 'fillMissingChar',
      prompt: `Điền a vào ${word.slice(0, index)}_${word.slice(index + 1)}`, displayText: `${word.slice(0, index)}_${word.slice(index + 1)}`,
      word, textMatch: { before: word.slice(0, index), after: word.slice(index + 1) }, answer: 'a', distractors: lowerDistractors,
      instructionVoice: `${VOICE_ROOT}/fill-a-in-${word.toLowerCase()}.mp3`, spokenInstruction: `Bé hãy kéo chữ a vào chỗ trống để có từ ${word}.`,
    })
  }
  return templates.filter(template => DEFAULT_GOAL_COUNTS[game][template.goalKey])
}

function combinations(values: readonly string[], size: number): string[][] {
  if (!size) return [[]]
  return values.flatMap((value, index) => combinations(values.slice(index + 1), size - 1).map(rest => [value, ...rest]))
}

/** Distinct content includes the target/word AND the distractor combination, not option order. */
export function createQuestionPool(game: VietnameseGame): VietnameseQuestion[] {
  return templatesFor(game).flatMap(({ variant, distractors, ...template }) =>
    (game === 'drag-drop' ? [5] : game === 'racing' ? [2] : [2, 3]).flatMap(size => combinations(distractors, size).map(wrong => ({
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

type GenerateOptions = {
  random?: () => number
  previousIds?: readonly string[]
  weakTargets?: readonly string[]
  adaptiveCount?: number
}

/** Structured sampling without replacement; always ten rounds with every game goal retained. */
export function generateQuestionSet(game: VietnameseGame, options: GenerateOptions = {}): VietnameseQuestion[] {
  const random = options.random ?? Math.random
  const counts = { ...DEFAULT_GOAL_COUNTS[game] }
  const goals = Object.keys(counts) as VietnameseAGoal[]
  const weak = shuffle(goals.filter(goal => options.weakTargets?.includes(goal)), random)
  const budget = Math.min(10, Math.max(0, Math.floor(options.adaptiveCount ?? 0)))
  for (let i = 0; weak.length && i < budget; i++) {
    const donor = shuffle(goals.filter(goal => !weak.includes(goal) && counts[goal]! > 1), random)
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
    // Start with easier visual distractors, while question types still vary in order.
    const easy = candidates.filter(q => !q.options.includes('c') && q.options.length === 3)
    if (round < 2 && easy.length) candidates = easy
    const question = candidates[Math.floor(random() * candidates.length)]
    if (!question) throw new Error(`Question pool exhausted for ${game}/${goal}`)
    used.add(question.id)
    return { ...question, options: shuffle(question.options, random) }
  })
}

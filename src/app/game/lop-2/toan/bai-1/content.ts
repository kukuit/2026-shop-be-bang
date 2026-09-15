import type { LearningQuestion } from '@/components/games/general/learning-question'
import { TOAN_2_BAI_1, type MathGoal } from './lesson'

export type MathGame = 'bubble-shooter' | 'gold-mining' | 'racing' | 'drag-drop'
export const GAME_GOALS: Record<MathGame, MathGoal[]> = {
  'bubble-shooter': ['READ_WRITE_NUMBERS_100', 'TENS_ONES', 'COMPOSE_NUMBER', 'DECOMPOSE_NUMBER', 'COMPARE_NUMBERS_100', 'ORDER_NUMBERS_100'],
  'gold-mining': ['READ_WRITE_NUMBERS_100', 'COMPOSE_NUMBER', 'COMPARE_NUMBERS_100'],
  racing: ['TENS_ONES', 'COMPOSE_NUMBER', 'DECOMPOSE_NUMBER', 'COMPARE_NUMBERS_100', 'ORDER_NUMBERS_100'],
  'drag-drop': ['READ_WRITE_NUMBERS_100', 'TENS_ONES', 'COMPOSE_NUMBER', 'DECOMPOSE_NUMBER', 'ORDER_NUMBERS_100', 'FORM_TWO_DIGIT_NUMBERS'],
}
const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']
export function readNumber(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 100) throw new RangeError('Expected a number from 0 to 100')
  if (n === 100) return 'một trăm'
  if (n < 10) return digits[n]
  const tens = Math.floor(n / 10), ones = n % 10
  const prefix = tens === 1 ? 'mười' : `${digits[tens]} mươi`
  return prefix + (ones === 0 ? '' : ` ${ones === 5 ? 'lăm' : tens > 1 && ones === 1 ? 'mốt' : tens > 1 && ones === 4 ? 'tư' : digits[ones]}`)
}
export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
export type MathReviewQuestion = LearningQuestion & {
  lessonId: typeof TOAN_2_BAI_1.lessonId
  goalKey: MathGoal
  questionType: string
  prompt: string
  voiceText: string
  options: string[]
  number: number
  variant: string
  /** Numeric predicate also validates conditional distractors before formatting. */
  accepts: (value: number) => boolean
  numericOptions: number[]
}
const domain = Array.from({ length: 101 }, (_, n) => n)

/** Parameterized bank: identities describe the task, never the option order. */
export function createQuestionPool(game: MathGame, random = Math.random): MathReviewQuestion[] {
  const pool: MathReviewQuestion[] = []
  const size = game === 'racing' ? 3 : game === 'drag-drop' ? 6 : 4
  function add(goalKey: MathGoal, type: string, n: number, variant: string, prompt: string, voiceText: string,
    answer: number, accepts = (v: number) => v === answer, format: (v: number) => string = String, preferred: number[] = []) {
    if (!GAME_GOALS[game].includes(goalKey)) return
    const wrong = Array.from(new Set([...preferred, ...shuffle(domain, random)]))
      .filter(v => v >= 0 && v <= 100 && !accepts(v)).slice(0, size - 1)
    const numericOptions = shuffle([answer, ...wrong], random)
    if (numericOptions.length !== size || numericOptions.filter(accepts).length !== 1) throw new Error('Ambiguous question')
    pool.push({ id: `${type}_${n}_${variant}`, lessonId: TOAN_2_BAI_1.lessonId, goalKey,
      questionType: type, prompt, voiceText, number: n, variant, answer: format(answer),
      options: numericOptions.map(format), numericOptions, accepts, inputMode: 'text', answerMode: 'select-text' })
  }
  for (const n of domain.filter(value => value >= 10 && value < 100)) {
    const t = Math.floor(n / 10), u = n % 10, spoken = readNumber(n)
    const near = shuffle([n - 1, n + 1, n - 10, n + 10, u * 10 + t, t * 10], random)
    add('READ_WRITE_NUMBERS_100', 'READ_WRITE', n, 'WRITE', `“${spoken}” là số nào?`, `Hãy chọn số ${spoken}.`, n, undefined, undefined, near)
    if (game === 'drag-drop') add('READ_WRITE_NUMBERS_100', 'READ_WRITE', n, 'READ', `${n} đọc là gì?`, 'Hãy kéo cách đọc đúng của số trên bảng vào ô.', n, undefined, readNumber, near)
    if (n >= 10 && n < 100) {
      add('COMPOSE_NUMBER', 'COMPOSE', n, `${t}_${u}`, `${t} chục và ${u} đơn vị`, `${readNumber(t)} chục và ${readNumber(u)} đơn vị là số nào?`, n, undefined, undefined, near)
      for (const tens of [true, false]) {
        const part = tens ? t : u, label = tens ? 'chục' : 'đơn vị'
        if (game === 'gold-mining') {
          add('TENS_ONES', 'TENS_ONES', n, tens ? 'TENS' : 'ONES', `Tìm số có ${part} ${label}`, `Hãy tìm số có ${readNumber(part)} ${label}.`, n,
            v => v < 100 && (tens ? Math.floor(v / 10) : v % 10) === part, undefined, near)
        } else if (game !== 'drag-drop') add('TENS_ONES', 'TENS_ONES', n, tens ? 'TENS' : 'ONES', `${n} có ? ${label}`, `Số ${spoken} có mấy ${label}?`, part, undefined, undefined, [t, u, part - 1, part + 1, n])
      }
      if (game === 'drag-drop') {
        add('TENS_ONES', 'TENS_ONES', n, 'BOTH', `${n} gồm mấy chục, mấy đơn vị?`, `Số ${spoken} gồm mấy chục và mấy đơn vị?`, n, undefined,
          v => `${Math.floor(v / 10)} chục ${v % 10} đơn vị`, near)
        add('DECOMPOSE_NUMBER', 'DECOMPOSE', n, 'SUM', `Phân tích số ${n}`, `Hãy kéo cách phân tích đúng của số ${spoken}.`, n, undefined, v => `${Math.floor(v / 10) * 10} + ${v % 10}`, near)
        if (t !== u) add('FORM_TWO_DIGIT_NUMBERS', 'FORM', n, 'DIGITS', `Tạo số ${n}`, `Hãy kéo các thẻ để tạo số ${spoken}.`, n)
      } else {
        add('DECOMPOSE_NUMBER', 'DECOMPOSE', n, 'TENS', `${n} = ? + ${u}`, `${spoken} bằng mấy cộng ${readNumber(u)}?`, t * 10, undefined, undefined, shuffle([t, (t - 1) * 10, (t + 1) * 10, u], random))
        add('DECOMPOSE_NUMBER', 'DECOMPOSE', n, 'ONES', `${n} = ${t * 10} + ?`, `${spoken} bằng ${readNumber(t * 10)} cộng mấy?`, u, undefined, undefined, shuffle([u - 1, u + 1, t, u + 2], random))
      }
    }
    if (n % 10 === 0 && n <= 80) {
      const offset = 1 + Math.floor(random() * 9)
      add('COMPARE_NUMBERS_100', 'COMPARE', n, 'GT', `Tìm số lớn hơn ${n}`, `Hãy tìm số lớn hơn ${spoken}.`, n + offset, v => v > n)
      add('COMPARE_NUMBERS_100', 'COMPARE', n, 'LT', `Tìm số bé hơn ${n}`, `Hãy tìm số bé hơn ${spoken}.`, n - offset, v => v < n)
      add('COMPARE_NUMBERS_100', 'COMPARE', n, 'BETWEEN', `Lớn hơn ${n} và bé hơn ${n + 10}`, `Hãy tìm số lớn hơn ${spoken} và bé hơn ${readNumber(n + 10)}.`, n + offset, v => v > n && v < n + 10)
    }
    if (n >= 15 && n <= 94) {
      for (const max of [true, false]) add('ORDER_NUMBERS_100', 'ORDER', n, max ? 'MAX' : 'MIN', max ? 'Tìm số lớn nhất' : 'Tìm số bé nhất', max ? 'Hãy chọn số lớn nhất trong các đáp án.' : 'Hãy chọn số bé nhất trong các đáp án.', n,
        max ? v => v >= n : v => v <= n, undefined, shuffle(max ? [n - 1, n - 2, n - 3, n - 5] : [n + 1, n + 2, n + 3, n + 5], random))
    }
  }
  return pool
}

export function generateQuestionSet(game: MathGame, options: { random?: () => number; weakTargets?: readonly string[]; adaptiveCount?: number } = {}): MathReviewQuestion[] {
  const random = options.random ?? Math.random
  const pool = createQuestionPool(game, random)
  const goals = GAME_GOALS[game]
  const weak = goals.filter(goal => options.weakTargets?.includes(goal))
  const budget = Math.min(10, Math.max(0, Math.floor(options.adaptiveCount ?? 0)))
  const used = new Set<string>()
  const balanced = shuffle(goals, random)
  const result = Array.from({ length: 10 }, (_, i) => {
    const adaptiveRound = weak.length > 0 && i < budget
    const normalIndex = i - (weak.length ? budget : 0)
    const goal = adaptiveRound ? weak[i % weak.length] : balanced[normalIndex % balanced.length]
    const available = pool.filter(q => q.goalKey === goal && !used.has(q.id))
    const q = available[Math.floor(random() * available.length)]
    if (!q) throw new Error(`Question pool exhausted: ${game}/${goal}`)
    used.add(q.id)
    return q
  })
  return shuffle(result, random)
}

// Reserved content for future mechanics; deliberately excluded from current sessions.
export function createNumberChartBlock(random = Math.random) {
  const start = 1 + Math.floor(random() * 9) + Math.floor(random() * 9) * 10
  return { id: `NUMBER_CHART_${start}`, type: 'NUMBER_CHART_BLOCK', lessonId: TOAN_2_BAI_1.lessonId,
    learningGoalId: 'NUMBER_CHART_100', missingCells: [start, start + 1, start + 10, start + 11],
    draggableBlock: [[start, start + 1], [start + 10, start + 11]] } as const
}
export function createEstimateAndCount(random = Math.random) {
  const count = 10 + Math.floor(random() * 81)
  return { id: `ESTIMATE_${count}`, type: 'ESTIMATE_AND_COUNT', lessonId: TOAN_2_BAI_1.lessonId,
    learningGoalId: 'ESTIMATE_AND_COUNT', count, estimatedTens: Math.round(count / 10),
    groups: Array.from({ length: Math.floor(count / 10) }, () => 10).concat(count % 10 ? [count % 10] : []),
    voiceText: 'Hãy ước lượng xem có khoảng mấy chục, rồi đếm số lượng chính xác.' } as const
}

import { ADAPTIVE_ENABLED, ADAPTIVE_RATIO, getWeakTargets, normalizeLessonLearningProfile } from '@/components/games/general/adaptive'
import { GAME_IDS, getLearningProgress } from '@/components/games/general/tracking'
import type { BubbleShooterGameConfig, MathQuestion } from '@/components/games/bubble-shooter/types/game'
import type { GoldMinerGameConfig, GoldMinerQuestion } from '@/components/games/gold-miner/types'
import type { RacingGameConfig, RacingQuestion } from '@/components/games/racing/types'
import type { DragDropGameConfig, DragDropLevel } from '@/components/games/drag-drop/types'
import { GAME_GOALS, generateQuestionSet, readNumber, shuffle, type MathGame, type MathReviewQuestion } from './content'
import { TOAN_2_BAI_1 } from './lesson'
import { createMathQuestionVoice } from '@/components/games/general/math-voice'

const lessonId = TOAN_2_BAI_1.lessonId
export async function loadMathQuestions(game: MathGame) {
  let weakTargets: string[] = []
  if (ADAPTIVE_ENABLED) {
    try { weakTargets = getWeakTargets(normalizeLessonLearningProfile(await getLearningProgress(lessonId))) }
    catch { /* Guest/offline play still generates a fresh random session. */ }
  }
  return generateQuestionSet(game, { weakTargets, adaptiveCount: ADAPTIVE_ENABLED ? Math.round(10 * ADAPTIVE_RATIO) : 0 })
}
const voice = (q: MathReviewQuestion) => createMathQuestionVoice(q.voiceText)
const bubblePrompt = (q: MathReviewQuestion): string => {
  const n = q.number
  switch (q.questionType) {
    case 'READ_WRITE': return readNumber(n)
    case 'COMPOSE': return `${Math.floor(n / 10)} chục ${n % 10} đơn vị`
    case 'TENS_ONES': return `${n}: mấy ${q.variant === 'TENS' ? 'chục' : 'đơn vị'}?`
    case 'COMPARE': return q.variant === 'BETWEEN' ? `${n} < ? < ${n + 10}`
      : q.variant === 'GT' ? `Số lớn hơn ${n}` : `Số bé hơn ${n}`
    case 'ORDER': return q.variant === 'MAX' ? 'Số lớn nhất' : 'Số bé nhất'
    default: return q.prompt
  }
}
export const toBubble = (q: MathReviewQuestion): MathQuestion => ({
  id: q.id, text: bubblePrompt(q), answer: q.answer, options: q.options, learningKey: q.goalKey,
  inputMode: 'text', answerMode: 'select-text', ...voice(q), presentation: { type: 'generic', prompt: bubblePrompt(q) },
})
export const toGold = (q: MathReviewQuestion): GoldMinerQuestion => ({
  id: q.id, objectType: 'star', count: 0,
  prompt: q.questionType === 'COMPOSE' ? `${Math.floor(q.number / 10)} chục\n${q.number % 10} đơn vị`
    : q.questionType === 'READ_WRITE' ? readNumber(q.number)
    : q.prompt.replace('Tìm số có ', 'Có '), correctAnswer: q.answer,
  choices: q.options, learningKey: q.goalKey, inputMode: 'text', answerMode: 'select-text', ...voice(q),
})
export const toRacing = (q: MathReviewQuestion): RacingQuestion => ({
  id: q.id, type: 'generic', prompt: q.prompt, answer: q.answer, options: q.options,
  learningKey: q.goalKey, skill: 'language_choice', showVoiceButton: true, voiceButtonStyle: 'panel-gem',
  inputMode: 'text', answerMode: 'select-text', ...voice(q),
})
export function toDrag(q: MathReviewQuestion, index: number): DragDropLevel {
  const base = { id: index + 1, questionId: q.id, type: 'count' as const,
    title: q.prompt, instruction: 'Kéo đáp án vào ô trống', ...voice(q) }
  if (q.questionType === 'FORM') {
    const tens = String(Math.floor(q.number / 10)), ones = String(q.number % 10)
    const extra = shuffle(Array.from({ length: 10 }, (_, n) => String(n)).filter(v => v !== tens && v !== ones)).slice(0, 4)
    return { ...base,
      groups: [{ id: 'tens', icon: 'Chục', count: 1, label: 'Chục' }, { id: 'ones', icon: 'Đơn vị', count: 1, label: 'Đơn vị' }],
      answers: { tens, ones }, answerDomain: shuffle([tens, ones, ...extra]),
      learningKeys: { tens: q.goalKey, ones: q.goalKey },
      inputModes: { tens: 'text', ones: 'text' }, answerModes: { tens: 'drag-text', ones: 'drag-text' },
    }
  }
  return { ...base,
    groups: [{ id: 'answer', icon: q.questionType === 'READ_WRITE' && q.variant === 'READ' ? String(q.number) : '?', count: 1, label: q.prompt }],
    answers: { answer: q.answer }, answerDomain: q.options, learningKeys: { answer: q.goalKey },
    inputModes: { answer: 'text' }, answerModes: { answer: 'drag-text' },
  }
}
const common = { lessonId, totalRounds: 10, answerDomain: [] }
export const BUBBLE_CONFIG: BubbleShooterGameConfig = {
  questionLayout: { panelWidth: 672, fontFamily: 'Arial, Helvetica, sans-serif' },
  id: `${lessonId}-bubble`, title: TOAN_2_BAI_1.title, totalRounds: 10,
  tracking: { lessonId, gameId: GAME_IDS.BUBBLE_SHOOTER },
  loadQuestions: async () => (await loadMathQuestions('bubble-shooter')).map(toBubble),
}
export const GOLD_CONFIG: GoldMinerGameConfig = {
  ...common, gameId: GAME_IDS.GOLD_MINING, supportedTargets: GAME_GOALS['gold-mining'],
  loadQuestions: async () => (await loadMathQuestions('gold-mining')).map(toGold),
}
export const RACING_CONFIG: RacingGameConfig = {
  ...common, gameId: GAME_IDS.RACING, supportedTargets: GAME_GOALS.racing,
  loadQuestions: async () => (await loadMathQuestions('racing')).map(toRacing),
}
export const DRAG_CONFIG: DragDropGameConfig = {
  showQuestionVoiceButton: true,
  ...common, gameId: GAME_IDS.DRAG_DROP, supportedTargets: GAME_GOALS['drag-drop'],
  answerTrayColumns: 'auto', answerNoun: 'đáp án', awaitLevelReload: true,
  // Placeholder only; the engine waits for loadLevels before allowing play.
  initialLevels: generateQuestionSet('drag-drop', { random: () => .5 }).map(toDrag),
  loadLevels: async () => (await loadMathQuestions('drag-drop')).map(toDrag),
}

import { COMMON_VOICE_ROOT, DEFAULT_GOAL_COUNTS, generateQuestionSet, LETTER_OPTIONS, QUESTION_COUNT, VOICE_ROOT, type VietnameseGame, type VietnameseQuestion } from '@/app/game/lop-1/tieng-viet/bai-1/content'
import { TIENG_VIET_1_BAI_1, type VietnameseAGoal } from '@/app/game/lop-1/tieng-viet/bai-1/lesson'
import { ADAPTIVE_ENABLED, ADAPTIVE_RATIO, getWeakTargets, normalizeLessonLearningProfile } from '../general/adaptive'
import { GAME_IDS, getLearningProgress } from '../general/tracking'
import type { MathQuestion, BubbleShooterGameConfig } from '../bubble-shooter/types/game'
import type { GoldMinerQuestion, GoldMinerGameConfig } from '../gold-miner/types'
import type { RacingQuestion, RacingGameConfig } from '../racing/types'
import type { DragDropLevel, DragDropGameConfig } from '../drag-drop/types'

const lessonId = TIENG_VIET_1_BAI_1.lessonId
const previousSets = new Map<VietnameseGame, string[]>()
const targets = (game: VietnameseGame) => Object.keys(DEFAULT_GOAL_COUNTS[game]) as VietnameseAGoal[]

/** Reuse the existing lesson-scoped progress API and weak-goal criteria, not other lessons' history. */
export async function loadVietnameseQuestions(game: VietnameseGame): Promise<VietnameseQuestion[]> {
  let weakTargets: string[] = []
  if (ADAPTIVE_ENABLED) {
    try { weakTargets = getWeakTargets(normalizeLessonLearningProfile(await getLearningProgress(lessonId))) }
    catch { /* Offline/guest sessions retain the default structured distribution. */ }
  }
  const key = `${lessonId}:${game}:previous-questions`
  let previousIds = previousSets.get(game)
  try {
    if (!previousIds && typeof sessionStorage !== 'undefined') {
      const stored: unknown = JSON.parse(sessionStorage.getItem(key) || '[]')
      if (Array.isArray(stored) && stored.every(id => typeof id === 'string')) previousIds = stored
    }
  } catch { /* Storage is optional; the in-memory set still covers replay. */ }
  const questions = generateQuestionSet(game, {
    previousIds, weakTargets, adaptiveCount: ADAPTIVE_ENABLED ? Math.round(QUESTION_COUNT * ADAPTIVE_RATIO) : 0,
  })
  const ids = questions.map(q => q.id)
  previousSets.set(game, ids)
  try { if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, JSON.stringify(ids)) } catch { /* Optional. */ }
  return questions
}

// Use recorded Vietnamese only; system speech synthesis may fall back to English on this device.
const voiceFor = (q: VietnameseQuestion) => ({ instructionVoice: q.instructionVoice, voice: q.voice })
const bubbleVoiceFor = (q: VietnameseQuestion) => ({
  ...voiceFor(q),
  instructionVoice: q.instructionVoice?.startsWith(`${COMMON_VOICE_ROOT}/`) ? q.instructionVoice : undefined,
  voice: q.voice,
})
const goldVoiceFor = bubbleVoiceFor
export const toVietnameseBubble = (q: VietnameseQuestion): MathQuestion => ({
  id: q.id, text: q.prompt!, answer: q.answer, options: q.options,
  learningKey: q.goalKey, sourceLesson: q.sourceLesson, skill: q.skill, inputMode: q.inputMode, answerMode: q.answerMode,
  ...bubbleVoiceFor(q), presentation: { type: 'voice', prompt: q.word },
})
export const toVietnameseGold = (q: VietnameseQuestion): GoldMinerQuestion => ({
  id: q.id, objectType: 'star', count: 0, prompt: q.displayText,
  correctAnswer: q.answer, choices: q.options, learningKey: q.goalKey, sourceLesson: q.sourceLesson,
  skill: q.skill, inputMode: q.inputMode, answerMode: q.answerMode, ...goldVoiceFor(q),
})
export const toVietnameseRacing = (q: VietnameseQuestion): RacingQuestion => ({
  id: q.id, type: 'generic', showVoiceButton: true,
  prompt: q.prompt!,
  answer: q.answer, options: q.options, learningKey: q.goalKey, sourceLesson: q.sourceLesson, skill: 'language_choice',
  learningSkill: q.skill, inputMode: q.inputMode, answerMode: q.answerMode, ...bubbleVoiceFor(q),
})
export const toVietnameseDrag = (q: VietnameseQuestion, index: number): DragDropLevel => {
  const target = `a-${index}`
  return {
    id: index + 1, questionId: q.id, type: 'count', title: q.prompt!, instruction: 'Kéo chữ vào ô trống',
    ...(q.questionType === 'fillMissingChar' ? {
      instructionVoice: `${COMMON_VOICE_ROOT}/be-hay-keo-chu-vao-cho-trong.mp3`,
      voice: q.voice,
    } : bubbleVoiceFor(q)),
    groups: [{ id: target, icon: q.questionType === 'matchCase' ? (q.answer === 'a' ? 'A' : 'a') : q.displayText,
      count: 1, label: q.prompt!, textMatch: q.textMatch }],
    answers: { [target]: q.answer }, answerDomain: q.options, learningKeys: { [target]: q.goalKey }, sourceLessons: { [target]: q.sourceLesson },
    skills: { [target]: q.skill! }, inputModes: { [target]: q.inputMode! }, answerModes: { [target]: 'drag-text' },
  }
}

const common = { lessonId, totalRounds: QUESTION_COUNT, introVoice: `${VOICE_ROOT}/intro.mp3` }
export const TIENG_VIET_1_BAI_1_BUBBLE_CONFIG: BubbleShooterGameConfig = {
  wolfWrongAnswersOnly: true,
  id: `${lessonId}-bubble`, title: TIENG_VIET_1_BAI_1.title, totalRounds: QUESTION_COUNT, introVoice: common.introVoice,
  tracking: { lessonId, gameId: GAME_IDS.BUBBLE_SHOOTER },
  loadQuestions: async () => (await loadVietnameseQuestions('bubble-shooter')).map(toVietnameseBubble),
}
export const TIENG_VIET_1_BAI_1_GOLD_CONFIG: GoldMinerGameConfig = {
  ...common, gameId: GAME_IDS.GOLD_MINING, answerDomain: [], supportedTargets: targets('gold-mining'),
  loadQuestions: async () => (await loadVietnameseQuestions('gold-mining')).map(toVietnameseGold),
}
export const TIENG_VIET_1_BAI_1_RACING_CONFIG: RacingGameConfig = {
  wolfEnabled: false,
  ...common, gameId: GAME_IDS.RACING, answerDomain: [], supportedTargets: targets('racing'),
  loadQuestions: async () => (await loadVietnameseQuestions('racing')).map(toVietnameseRacing),
}
export const TIENG_VIET_1_BAI_1_DRAG_CONFIG: DragDropGameConfig = {
  hideQuestionText: true,
  answerTrayColumns: 'auto', answerNoun: 'chữ', awaitLevelReload: true,
  ...common, gameId: GAME_IDS.DRAG_DROP, answerDomain: [...LETTER_OPTIONS, ...LETTER_OPTIONS.map(letter => letter.toUpperCase())],
  supportedTargets: targets('drag-drop'),
  initialLevels: generateQuestionSet('drag-drop', { random: () => .5 }).map(toVietnameseDrag),
  loadLevels: async () => (await loadVietnameseQuestions('drag-drop')).map(toVietnameseDrag),
}

import { COMMON_VOICE_ROOT, DEFAULT_GOAL_COUNTS, generateQuestionSet, LETTER_OPTIONS, QUESTION_COUNT, VOICE_ROOT, type VietnameseGame, type VietnameseQuestion } from '@/app/game/lop-1/tieng-viet/tuan-1/content'
import { TIENG_VIET_1_WEEK_1, type VietnameseWeek1Goal } from '@/app/game/lop-1/tieng-viet/tuan-1/lesson'
import { ADAPTIVE_ENABLED, ADAPTIVE_RATIO, getWeakTargets, normalizeLessonLearningProfile } from '../general/adaptive'
import { GAME_IDS, getLearningProgress } from '../general/tracking'
import { normalizeVietnameseQuestion } from './question-model'
import { getWeek1ImageLookupKey, getWeek1SpriteById, WEEK_1_IMAGE_QUESTION_IMAGES, WEEK_1_SPRITE_MANIFEST, WEEK_1_SPRITE_SHEET } from './week1-sprites'
import type { MathQuestion, BubbleShooterGameConfig } from '../bubble-shooter/types/game'
import type { GoldMinerQuestion, GoldMinerGameConfig } from '../gold-miner/types'
import type { RacingQuestion, RacingGameConfig } from '../racing/types'
import type { DragDropLevel, DragDropGameConfig } from '../drag-drop/types'

const lessonId = TIENG_VIET_1_WEEK_1.lessonId
const previousSets = new Map<VietnameseGame, string[]>()
const targets = (game: VietnameseGame) => Object.keys(DEFAULT_GOAL_COUNTS[game]) as VietnameseWeek1Goal[]

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
const questionModel = (q: VietnameseQuestion) => normalizeVietnameseQuestion(q).questionModel
const voiceFor = (q: VietnameseQuestion) => {
  const prompt = questionModel(q).prompt
  return { instructionVoice: prompt.instructionVoice, voice: prompt.voice, voiceSequence: prompt.voiceSequence, voiceFallback: prompt.voiceFallback }
}
const bubbleVoiceFor = (q: VietnameseQuestion) => ({
  ...voiceFor(q),
  instructionVoice: q.instructionVoice?.startsWith(`${COMMON_VOICE_ROOT}/`) ? q.instructionVoice : undefined,
  voice: q.voice,
})
const goldVoiceFor = bubbleVoiceFor
export const toVietnameseBubble = (q: VietnameseQuestion): MathQuestion => {
  const model = questionModel(q)
  return { id: q.id, text: q.imageId ? getWeek1ImageLookupKey(q.imageId) : model.prompt.text, answer: String(model.correctAnswer), options: [...model.choices],
    learningKey: model.learningKey as VietnameseWeek1Goal, sourceLesson: q.sourceLesson, skill: q.skill, inputMode: q.inputMode, answerMode: q.answerMode,
    ...bubbleVoiceFor(q), presentation: q.imageId ? undefined : { type: 'voice', prompt: q.word } }
}
export const toVietnameseGold = (q: VietnameseQuestion): GoldMinerQuestion => {
  const model = questionModel(q)
  return { id: q.id, objectType: 'star', count: 0, prompt: q.imageId ? getWeek1ImageLookupKey(q.imageId) : model.prompt.text,
    correctAnswer: String(model.correctAnswer), choices: [...model.choices], learningKey: model.learningKey as VietnameseWeek1Goal, sourceLesson: q.sourceLesson,
    skill: q.skill, inputMode: q.inputMode, answerMode: q.answerMode, ...goldVoiceFor(q) }
}
export const toVietnameseRacing = (q: VietnameseQuestion): RacingQuestion => {
  const model = questionModel(q)
  return { id: q.id, type: 'generic', showVoiceButton: true, prompt: q.imageId ? getWeek1ImageLookupKey(q.imageId) : model.prompt.text,
    answer: String(model.correctAnswer), options: [...model.choices], learningKey: model.learningKey as VietnameseWeek1Goal,
    sourceLesson: q.sourceLesson, skill: 'language_choice', learningSkill: q.skill, inputMode: q.inputMode, answerMode: q.answerMode, ...bubbleVoiceFor(q) }
}
export const toVietnameseDrag = (q: VietnameseQuestion, index: number): DragDropLevel => {
  const model = questionModel(q)
  const target = `a-${index}`
  const sprite = q.imageId ? getWeek1SpriteById(q.imageId) : undefined
  return {
    id: index + 1, questionId: q.id, type: 'count', title: model.prompt.text, instruction: 'Kéo chữ vào ô trống',
    ...(q.questionType === 'fillMissingChar' ? {
      instructionVoice: `${COMMON_VOICE_ROOT}/be-hay-chon-chu-con-thieu.mp3`,
    } : bubbleVoiceFor(q)),
    groups: [{ id: target, icon: sprite ? '' : model.content.displayText ?? '?', count: 1, label: model.prompt.text, textMatch: q.textMatch,
      imageId: sprite?.id, imageSrc: sprite ? WEEK_1_SPRITE_SHEET : undefined,
      imageAlt: sprite ? WEEK_1_IMAGE_QUESTION_IMAGES[getWeek1ImageLookupKey(sprite.id)]?.alt : undefined,
      imageCrop: sprite ? { row: sprite.row, column: sprite.col, rows: WEEK_1_SPRITE_MANIFEST.grid.rows, columns: WEEK_1_SPRITE_MANIFEST.grid.columns } : undefined }],
    answers: { [target]: String(model.correctAnswer) }, answerDomain: [...model.choices], learningKeys: { [target]: model.learningKey as VietnameseWeek1Goal }, sourceLessons: { [target]: q.sourceLesson },
    skills: { [target]: q.skill! }, inputModes: { [target]: q.inputMode! }, answerModes: { [target]: 'drag-text' },
  }
}

const common = { lessonId, totalRounds: QUESTION_COUNT, introVoice: `${VOICE_ROOT}/intro.mp3` }
export const TIENG_VIET_1_WEEK_1_BUBBLE_CONFIG: BubbleShooterGameConfig = {
  wolfWrongAnswersOnly: true,
  id: `${lessonId}-bubble`, title: TIENG_VIET_1_WEEK_1.title, totalRounds: QUESTION_COUNT, introVoice: common.introVoice,
  images: WEEK_1_IMAGE_QUESTION_IMAGES, tracking: { lessonId, gameId: GAME_IDS.BUBBLE_SHOOTER },
  loadQuestions: async () => (await loadVietnameseQuestions('bubble-shooter')).map(toVietnameseBubble),
}
export const TIENG_VIET_1_WEEK_1_GOLD_CONFIG: GoldMinerGameConfig = {
  ...common, gameId: GAME_IDS.GOLD_MINING, answerDomain: [], supportedTargets: targets('gold-mining'), images: WEEK_1_IMAGE_QUESTION_IMAGES,
  loadQuestions: async () => (await loadVietnameseQuestions('gold-mining')).map(toVietnameseGold),
}
export const TIENG_VIET_1_WEEK_1_RACING_CONFIG: RacingGameConfig = {
  wolfEnabled: false,
  ...common, gameId: GAME_IDS.RACING, answerDomain: [], supportedTargets: targets('racing'), images: WEEK_1_IMAGE_QUESTION_IMAGES,
  loadQuestions: async () => (await loadVietnameseQuestions('racing')).map(toVietnameseRacing),
}
export const TIENG_VIET_1_WEEK_1_DRAG_CONFIG: DragDropGameConfig = {
  hideQuestionText: true,
  answerTrayColumns: 'auto', answerNoun: 'chữ', awaitLevelReload: true,
  ...common, gameId: GAME_IDS.DRAG_DROP, answerDomain: [...LETTER_OPTIONS, ...LETTER_OPTIONS.map(letter => letter.toUpperCase())],
  supportedTargets: targets('drag-drop'), images: WEEK_1_IMAGE_QUESTION_IMAGES,
  initialLevels: generateQuestionSet('drag-drop', { random: () => .5 }).map(toVietnameseDrag),
  loadLevels: async () => (await loadVietnameseQuestions('drag-drop')).map(toVietnameseDrag),
}

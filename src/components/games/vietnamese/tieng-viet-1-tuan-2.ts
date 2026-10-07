import { DEFAULT_GOAL_COUNTS, generateQuestionSet, LETTER_OPTIONS, QUESTION_COUNT, type VietnameseWeek2Game, type VietnameseWeek2Question } from '@/app/game/lop-1/tieng-viet/tuan-2/content'
import { TIENG_VIET_1_WEEK_2 } from '@/app/game/lop-1/tieng-viet/tuan-2/lesson'
import { GAME_IDS, getLearningProgress } from '../general/tracking'
import { ADAPTIVE_ENABLED, getWeakTargets, normalizeLessonLearningProfile } from '../general/adaptive'
import { normalizeVietnameseQuestion } from './question-model'
import { getWeek2ImageLookupKey, getWeek2SpriteById, WEEK_2_IMAGE_QUESTION_IMAGES, WEEK_2_SPRITE_MANIFEST, WEEK_2_SPRITE_SHEET } from './week2-sprites'
import type { MathQuestion, BubbleShooterGameConfig } from '../bubble-shooter/types/game'
import type { GoldMinerQuestion, GoldMinerGameConfig } from '../gold-miner/types'
import type { RacingQuestion, RacingGameConfig } from '../racing/types'
import type { DragDropLevel, DragDropGameConfig } from '../drag-drop/types'

const lessonId = TIENG_VIET_1_WEEK_2.lessonId
const previousSets = new Map<VietnameseWeek2Game, string[]>()
const targets = (game: VietnameseWeek2Game) => Object.keys(DEFAULT_GOAL_COUNTS[game]) as VietnameseWeek2Question['goalKey'][]

export async function loadVietnameseWeek2Questions(game: VietnameseWeek2Game): Promise<VietnameseWeek2Question[]> {
  let weakTargets: string[] = []
  if (ADAPTIVE_ENABLED) {
    try { weakTargets = getWeakTargets(normalizeLessonLearningProfile(await getLearningProgress(lessonId))) }
    catch { /* Guest/offline sessions keep the balanced 25-goal rotation. */ }
  }
  const key = `${lessonId}:${game}:previous-questions`
  let previousIds = previousSets.get(game)
  try {
    if (!previousIds && typeof sessionStorage !== 'undefined') {
      const stored: unknown = JSON.parse(sessionStorage.getItem(key) || '[]')
      if (Array.isArray(stored) && stored.every(id => typeof id === 'string')) previousIds = stored
    }
  } catch { /* Storage is optional; the in-memory set still covers replay. */ }
  const questions = generateQuestionSet(game, { previousIds })
  if (weakTargets.length) {
    // All 25 goals remain represented; rotate their order so weak targets appear earlier.
    questions.sort((a, b) => Number(weakTargets.includes(b.goalKey)) - Number(weakTargets.includes(a.goalKey)))
  }
  const ids = questions.map(question => question.id)
  previousSets.set(game, ids)
  try { if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, JSON.stringify(ids)) } catch { /* Optional. */ }
  return questions
}

const questionModel = (question: VietnameseWeek2Question) => normalizeVietnameseQuestion(question).questionModel
const voiceFor = (question: VietnameseWeek2Question) => {
  const prompt = questionModel(question).prompt
  return { instructionVoice: prompt.instructionVoice, voice: prompt.voice, voiceSequence: prompt.voiceSequence, voiceFallback: prompt.voiceFallback }
}
const bubbleVoiceFor = voiceFor

export const toVietnameseWeek2Bubble = (question: VietnameseWeek2Question): MathQuestion => {
  const model = questionModel(question)
  return { id: question.id, text: question.imageId ? getWeek2ImageLookupKey(question.imageId) : model.prompt.text, answer: String(model.correctAnswer), options: [...model.choices],
    learningKey: model.learningKey as VietnameseWeek2Question['goalKey'], sourceLesson: question.sourceLesson, skill: question.skill,
    inputMode: question.inputMode, answerMode: question.answerMode, ...bubbleVoiceFor(question) }
}

export const toVietnameseWeek2Gold = (question: VietnameseWeek2Question): GoldMinerQuestion => {
  const model = questionModel(question)
  return { id: question.id, objectType: 'star', count: 0, prompt: question.imageId ? getWeek2ImageLookupKey(question.imageId) : model.prompt.text,
    correctAnswer: String(model.correctAnswer), choices: [...model.choices], learningKey: model.learningKey as VietnameseWeek2Question['goalKey'],
    sourceLesson: question.sourceLesson, skill: question.skill, inputMode: question.inputMode,
    answerMode: question.answerMode, ...voiceFor(question) }
}

export const toVietnameseWeek2Racing = (question: VietnameseWeek2Question): RacingQuestion => {
  const model = questionModel(question)
  return { id: question.id, type: 'generic', showVoiceButton: true,
    prompt: question.imageId ? getWeek2ImageLookupKey(question.imageId) : model.prompt.text, answer: String(model.correctAnswer), options: [...model.choices],
    learningKey: model.learningKey as VietnameseWeek2Question['goalKey'], sourceLesson: question.sourceLesson, skill: 'language_choice',
    learningSkill: question.skill, inputMode: question.inputMode, answerMode: question.answerMode,
    ...voiceFor(question) }
}

export const toVietnameseWeek2Drag = (question: VietnameseWeek2Question, index: number): DragDropLevel => {
  const model = questionModel(question)
  const target = `a-${index}`
  const sprite = question.imageId ? getWeek2SpriteById(question.imageId) : undefined
  return {
    id: index + 1, questionId: question.id, type: 'count', title: model.prompt.text, instruction: 'Kéo đáp án vào ô trống',
    ...voiceFor(question),
    groups: [{ id: target, icon: sprite ? '' : model.content.displayText ?? '?', count: 1, label: model.prompt.text,
      imageId: sprite?.id, imageSrc: sprite ? WEEK_2_SPRITE_SHEET : undefined,
      imageAlt: sprite ? WEEK_2_IMAGE_QUESTION_IMAGES[getWeek2ImageLookupKey(sprite.id)]?.alt : undefined,
      imageCrop: sprite ? { row: sprite.row, column: sprite.col, rows: WEEK_2_SPRITE_MANIFEST.grid.rows, columns: WEEK_2_SPRITE_MANIFEST.grid.columns } : undefined }],
    answers: { [target]: String(model.correctAnswer) }, answerDomain: [...model.choices],
    learningKeys: { [target]: model.learningKey as VietnameseWeek2Question['goalKey'] }, sourceLessons: { [target]: question.sourceLesson },
    skills: { [target]: question.skill! }, inputModes: { [target]: question.inputMode! }, answerModes: { [target]: 'drag-text' },
  }
}

const common = { lessonId, totalRounds: QUESTION_COUNT }

export const TIENG_VIET_1_WEEK_2_BUBBLE_CONFIG: BubbleShooterGameConfig = {
  wolfWrongAnswersOnly: true,
  id: `${lessonId}-bubble`, title: TIENG_VIET_1_WEEK_2.title, ...common, images: WEEK_2_IMAGE_QUESTION_IMAGES,
  tracking: { lessonId, gameId: GAME_IDS.BUBBLE_SHOOTER },
  loadQuestions: async () => (await loadVietnameseWeek2Questions('bubble-shooter')).map(toVietnameseWeek2Bubble),
}

export const TIENG_VIET_1_WEEK_2_GOLD_CONFIG: GoldMinerGameConfig = {
  ...common, gameId: GAME_IDS.GOLD_MINING, answerDomain: [], supportedTargets: targets('gold-mining'), images: WEEK_2_IMAGE_QUESTION_IMAGES,
  loadQuestions: async () => (await loadVietnameseWeek2Questions('gold-mining')).map(toVietnameseWeek2Gold),
}

export const TIENG_VIET_1_WEEK_2_RACING_CONFIG: RacingGameConfig = {
  wolfEnabled: true,
  ...common, gameId: GAME_IDS.RACING, answerDomain: [], supportedTargets: targets('racing'), images: WEEK_2_IMAGE_QUESTION_IMAGES,
  loadQuestions: async () => (await loadVietnameseWeek2Questions('racing')).map(toVietnameseWeek2Racing),
}

const dragAnswerDomain = [...LETTER_OPTIONS, ...LETTER_OPTIONS.map(letter => letter.toLocaleUpperCase('vi-VN'))]
export const TIENG_VIET_1_WEEK_2_DRAG_CONFIG: DragDropGameConfig = {
  answerTrayColumns: 'auto', answerNoun: 'đáp án', awaitLevelReload: true,
  ...common, gameId: GAME_IDS.DRAG_DROP, answerDomain: dragAnswerDomain, images: WEEK_2_IMAGE_QUESTION_IMAGES,
  supportedTargets: targets('drag-drop'),
  initialLevels: generateQuestionSet('drag-drop', { random: () => 0.5 }).map(toVietnameseWeek2Drag),
  loadLevels: async () => (await loadVietnameseWeek2Questions('drag-drop')).map(toVietnameseWeek2Drag),
}

import {
  generateQuestionSet, getAvailableLearningKeys, QUESTION_COUNT, WEEK_3_LEARNED_LETTERS,
  type VietnameseWeek3Game, type VietnameseWeek3Question,
} from '@/app/game/lop-1/tieng-viet/tuan-3/content'
import { TIENG_VIET_1_WEEK_3, type VietnameseWeek3Goal } from '@/app/game/lop-1/tieng-viet/tuan-3/lesson'
import { GAME_IDS, getLearningProgress } from '../general/tracking'
import { ADAPTIVE_ENABLED, getWeakTargets, normalizeLessonLearningProfile } from '../general/adaptive'
import { normalizeVietnameseQuestion } from './question-model'
import { getWeek3SpriteById, WEEK_3_IMAGE_QUESTION_IMAGES, WEEK_3_SPRITE_MANIFEST, WEEK_3_SPRITE_SHEET } from './week3-sprites'
import type { MathQuestion, BubbleShooterGameConfig } from '../bubble-shooter/types/game'
import type { GoldMinerQuestion, GoldMinerGameConfig } from '../gold-miner/types'
import type { RacingQuestion, RacingGameConfig } from '../racing/types'
import type { DragDropLevel, DragDropGameConfig } from '../drag-drop/types'

const lessonId = TIENG_VIET_1_WEEK_3.lessonId
const previousSets = new Map<VietnameseWeek3Game, string[]>()
const targets = (game: VietnameseWeek3Game) => getAvailableLearningKeys(game)

export async function loadVietnameseWeek3Questions(game: VietnameseWeek3Game): Promise<VietnameseWeek3Question[]> {
  let preferredLearningKeys: string[] = []
  if (ADAPTIVE_ENABLED) {
    try { preferredLearningKeys = getWeakTargets(normalizeLessonLearningProfile(await getLearningProgress(lessonId))) }
    catch { /* Guest/offline sessions keep the balanced staged rotation. */ }
  }
  const key = `${lessonId}:${game}:previous-questions`
  let previousIds = previousSets.get(game)
  try {
    if (!previousIds && typeof sessionStorage !== 'undefined') {
      const stored: unknown = JSON.parse(sessionStorage.getItem(key) || '[]')
      if (Array.isArray(stored) && stored.every(id => typeof id === 'string')) previousIds = stored
    }
  } catch { /* Storage is optional; the in-memory set still covers replay. */ }
  const questions = generateQuestionSet(game, { previousIds, preferredLearningKeys })
  const ids = questions.map(question => question.id)
  previousSets.set(game, ids)
  try { if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, JSON.stringify(ids)) } catch { /* Optional. */ }
  return questions
}

const questionModel = (question: VietnameseWeek3Question) => normalizeVietnameseQuestion(question).questionModel
const voiceFor = (question: VietnameseWeek3Question) => {
  const prompt = questionModel(question).prompt
  return { instructionVoice: prompt.instructionVoice, voice: prompt.voice, voiceSequence: prompt.voiceSequence, voiceFallback: prompt.voiceFallback }
}

export const toVietnameseWeek3Bubble = (question: VietnameseWeek3Question): MathQuestion => {
  const model = questionModel(question)
  return { id: question.id, text: question.imageId ?? model.prompt.text, answer: String(model.correctAnswer), options: [...model.choices],
    learningKey: model.learningKey as VietnameseWeek3Goal, sourceLesson: question.sourceLesson, skill: question.skill,
    inputMode: question.inputMode, answerMode: question.answerMode, ...voiceFor(question) }
}

export const toVietnameseWeek3Gold = (question: VietnameseWeek3Question): GoldMinerQuestion => {
  const model = questionModel(question)
  return { id: question.id, objectType: 'star', count: 0, prompt: question.imageId ?? model.prompt.text,
    correctAnswer: String(model.correctAnswer), choices: [...model.choices], learningKey: model.learningKey as VietnameseWeek3Goal,
    sourceLesson: question.sourceLesson, skill: question.skill, inputMode: question.inputMode,
    answerMode: question.answerMode, ...voiceFor(question) }
}

export const toVietnameseWeek3Racing = (question: VietnameseWeek3Question): RacingQuestion => {
  const model = questionModel(question)
  return { id: question.id, type: 'generic', showVoiceButton: true,
    prompt: question.imageId ?? model.prompt.text, answer: String(model.correctAnswer), options: [...model.choices],
    learningKey: model.learningKey as VietnameseWeek3Goal, sourceLesson: question.sourceLesson, skill: 'language_choice',
    learningSkill: question.skill, inputMode: question.inputMode, answerMode: question.answerMode,
    ...voiceFor(question) }
}

export const toVietnameseWeek3Drag = (question: VietnameseWeek3Question, index: number): DragDropLevel => {
  const model = questionModel(question)
  const target = `week-3-${index}`
  const sprite = question.imageId ? getWeek3SpriteById(question.imageId) : undefined
  return {
    id: index + 1, questionId: question.id, type: 'count', title: model.prompt.text, instruction: 'Kéo đáp án vào ô trống',
    answerTrayColumns: model.type === 'CHOOSE_PAIR' ? 2 : undefined,
    ...voiceFor(question),
    groups: [{ id: target, icon: sprite ? '' : question.displayText, count: 1, label: model.prompt.text,
      imageId: sprite?.id, imageSrc: sprite ? WEEK_3_SPRITE_SHEET : undefined,
      imageAlt: sprite ? WEEK_3_IMAGE_QUESTION_IMAGES[sprite.id]?.alt : undefined,
      imageCrop: sprite ? { row: sprite.row, column: sprite.col, rows: WEEK_3_SPRITE_MANIFEST.grid.rows, columns: WEEK_3_SPRITE_MANIFEST.grid.columns } : undefined }],
    answers: { [target]: String(model.correctAnswer) }, answerDomain: [...model.choices],
    learningKeys: { [target]: model.learningKey as VietnameseWeek3Goal }, sourceLessons: { [target]: question.sourceLesson },
    skills: { [target]: question.skill! }, inputModes: { [target]: question.inputMode! }, answerModes: { [target]: 'drag-text' },
  }
}

const common = { lessonId, totalRounds: QUESTION_COUNT }

export const TIENG_VIET_1_WEEK_3_BUBBLE_CONFIG: BubbleShooterGameConfig = {
  wolfWrongAnswersOnly: true,
  id: `${lessonId}-bubble`, title: TIENG_VIET_1_WEEK_3.title, ...common, images: WEEK_3_IMAGE_QUESTION_IMAGES,
  tracking: { lessonId, gameId: GAME_IDS.BUBBLE_SHOOTER },
  loadQuestions: async () => (await loadVietnameseWeek3Questions('bubble-shooter')).map(toVietnameseWeek3Bubble),
}

export const TIENG_VIET_1_WEEK_3_GOLD_CONFIG: GoldMinerGameConfig = {
  ...common, gameId: GAME_IDS.GOLD_MINING, answerDomain: [], supportedTargets: targets('gold-mining'), images: WEEK_3_IMAGE_QUESTION_IMAGES,
  loadQuestions: async () => (await loadVietnameseWeek3Questions('gold-mining')).map(toVietnameseWeek3Gold),
}

export const TIENG_VIET_1_WEEK_3_RACING_CONFIG: RacingGameConfig = {
  wolfEnabled: true,
  ...common, gameId: GAME_IDS.RACING, answerDomain: [], supportedTargets: targets('racing'), images: WEEK_3_IMAGE_QUESTION_IMAGES,
  loadQuestions: async () => (await loadVietnameseWeek3Questions('racing')).map(toVietnameseWeek3Racing),
}

const dragAnswerDomain = [...WEEK_3_LEARNED_LETTERS, ...WEEK_3_LEARNED_LETTERS.map(letter => letter.toLocaleUpperCase('vi-VN'))]
export const TIENG_VIET_1_WEEK_3_DRAG_CONFIG: DragDropGameConfig = {
  answerTrayColumns: 'auto', answerNoun: 'đáp án', awaitLevelReload: true,
  ...common, gameId: GAME_IDS.DRAG_DROP, answerDomain: dragAnswerDomain, images: WEEK_3_IMAGE_QUESTION_IMAGES,
  supportedTargets: targets('drag-drop'),
  initialLevels: generateQuestionSet('drag-drop', { random: () => 0.5 }).map(toVietnameseWeek3Drag),
  loadLevels: async () => (await loadVietnameseWeek3Questions('drag-drop')).map(toVietnameseWeek3Drag),
}

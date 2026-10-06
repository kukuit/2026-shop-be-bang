import {
  generateQuestionSet, getAvailableLearningKeys, QUESTION_COUNT, WEEK_4_LEARNED_LETTERS,
  type VietnameseWeek4Game, type VietnameseWeek4Question,
} from '@/app/game/lop-1/tieng-viet/tuan-4/content'
import { TIENG_VIET_1_WEEK_4, type VietnameseWeek4Goal } from '@/app/game/lop-1/tieng-viet/tuan-4/lesson'
import { GAME_IDS, getLearningProgress } from '../general/tracking'
import { ADAPTIVE_ENABLED, getWeakTargets, normalizeLessonLearningProfile } from '../general/adaptive'
import { normalizeVietnameseQuestion, VIETNAMESE_QUESTION_TEMPLATES } from './question-model'
import { WEEK_4_IMAGE_QUESTION_IMAGES, WEEK_4_SPRITE_SHEET, getSpriteById } from './week4-sprites'
import type { MathQuestion, BubbleShooterGameConfig } from '../bubble-shooter/types/game'
import type { GoldMinerQuestion, GoldMinerGameConfig } from '../gold-miner/types'
import type { RacingQuestion, RacingGameConfig } from '../racing/types'
import type { DragDropLevel, DragDropGameConfig } from '../drag-drop/types'

const lessonId = TIENG_VIET_1_WEEK_4.lessonId
const previousSets = new Map<VietnameseWeek4Game, string[]>()
const targets = (game: VietnameseWeek4Game) => getAvailableLearningKeys(game)

export async function loadVietnameseWeek4Questions(game: VietnameseWeek4Game): Promise<VietnameseWeek4Question[]> {
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

const questionModel = (question: VietnameseWeek4Question) => normalizeVietnameseQuestion(question).questionModel
const voiceFor = (question: VietnameseWeek4Question) => {
  const prompt = questionModel(question).prompt
  return { instructionVoice: prompt.instructionVoice, voice: prompt.voice, voiceSequence: prompt.voiceSequence, voiceFallback: prompt.voiceFallback }
}

export const toVietnameseWeek4Bubble = (question: VietnameseWeek4Question): MathQuestion => {
  const model = questionModel(question)
  return {
    id: question.id, text: question.imageId ?? model.prompt.text, answer: String(model.correctAnswer), options: [...model.choices],
    learningKey: model.learningKey as VietnameseWeek4Goal, sourceLesson: question.sourceLesson, skill: question.skill,
    inputMode: question.inputMode, answerMode: question.answerMode, ...voiceFor(question),
  }
}

export const toVietnameseWeek4Gold = (question: VietnameseWeek4Question): GoldMinerQuestion => {
  const model = questionModel(question)
  return {
    id: question.id, objectType: 'star', count: 0, prompt: question.imageId ?? model.prompt.text,
    correctAnswer: String(model.correctAnswer), choices: [...model.choices], learningKey: model.learningKey as VietnameseWeek4Goal,
    sourceLesson: question.sourceLesson, skill: question.skill, inputMode: question.inputMode,
    answerMode: question.answerMode, ...voiceFor(question),
  }
}

export const toVietnameseWeek4Racing = (question: VietnameseWeek4Question): RacingQuestion => {
  const model = questionModel(question)
  return {
    id: question.id, type: 'generic', showVoiceButton: true,
    prompt: question.imageId ?? model.prompt.text, answer: String(model.correctAnswer), options: [...model.choices],
    learningKey: model.learningKey as VietnameseWeek4Goal, sourceLesson: question.sourceLesson, skill: 'language_choice',
    learningSkill: question.skill, inputMode: question.inputMode, answerMode: question.answerMode,
    ...voiceFor(question),
  }
}

export const toVietnameseWeek4Drag = (question: VietnameseWeek4Question, index: number): DragDropLevel => {
  const model = questionModel(question)
  if (question.connectPairs?.length) {
    const onsetConnection = model.type === 'IMAGE_ONSET_MATCH'
    const imageConnection = ['CONNECT_IMAGE_WORD', 'IMAGE_ONSET_MATCH', 'IMAGE_WORD_MATCH'].includes(model.type)
    const groups = question.connectPairs.map(pair => {
      const target = `week-4-${index}-${pair.id}`
      return { target, pair }
    })
    return {
      id: index + 1, questionId: question.id, type: 'matching', title: model.prompt.text,
      answerTrayColumns: 3,
      instruction: onsetConnection ? 'Nối mỗi hình với phụ âm đầu.'
        : imageConnection ? VIETNAMESE_QUESTION_TEMPLATES.connectImageWord : VIETNAMESE_QUESTION_TEMPLATES.connectOnsetSyllableInstruction,
      spokenInstruction: model.prompt.voiceFallback || model.prompt.voiceSequence?.length || model.prompt.instructionVoice ? undefined
        : model.prompt.spokenInstruction ?? (onsetConnection ? 'Nối mỗi hình với phụ âm đầu.'
          : imageConnection ? VIETNAMESE_QUESTION_TEMPLATES.connectImageWordInstruction : undefined),
      ...voiceFor(question),
      groups: groups.map(({ target, pair }) => ({
        id: target, icon: pair.left.kind === 'text' ? pair.left.value : pair.left.label,
        imageId: pair.left.kind === 'image' ? pair.left.imageId : undefined,
        imageSrc: pair.left.kind === 'image' ? pair.left.src ?? WEEK_4_SPRITE_SHEET : undefined,
        imageAlt: pair.left.kind === 'image' ? pair.left.label : undefined,
        imageCrop: pair.left.kind === 'image' ? pair.left.crop : undefined,
        count: 1, label: pair.left.kind === 'text' ? pair.left.value : pair.left.label,
      })),
      answers: Object.fromEntries(groups.map(({ target, pair }) => [target, pair.right])),
      answerDomain: [...model.choices],
      learningKeys: Object.fromEntries(groups.map(({ target, pair }) => [target, pair.learningKey as VietnameseWeek4Goal])),
      sourceLessons: Object.fromEntries(groups.map(({ target, pair }) => [target, pair.sourceLesson])),
      skills: Object.fromEntries(groups.map(({ target }) => [target, question.skill ?? 'reading'])),
      inputModes: Object.fromEntries(groups.map(({ target }) => [target, 'text'])),
      answerModes: Object.fromEntries(groups.map(({ target }) => [target, 'drag-text'])),
    }
  }
  const target = `week-4-${index}`
  const sprite = question.imageId ? getSpriteById(question.imageId) : undefined
  return {
    id: index + 1, questionId: question.id, type: 'count', title: model.prompt.text, instruction: 'Kéo đáp án vào ô trống',
    answerTrayColumns: model.type === 'CHOOSE_PAIR' && question.options.length === 2 ? 2 : undefined,
    ...voiceFor(question),
    groups: [{ id: target, icon: sprite ? '' : question.displayText || '?', count: 1, label: model.prompt.text,
      imageId: sprite?.id, imageSrc: sprite ? WEEK_4_SPRITE_SHEET : undefined,
      imageAlt: sprite ? `Hình ${question.data.targetText ?? question.imageId}` : undefined,
      imageCrop: sprite ? { row: sprite.row, column: sprite.col, rows: 4, columns: 4 } : undefined,
      promptText: question.questionType === 'IMAGE_MISSING_ONSET' ? question.displayText : undefined }],
    answers: { [target]: String(model.correctAnswer) }, answerDomain: [...model.choices],
    learningKeys: { [target]: question.goalKey }, sourceLessons: { [target]: question.sourceLesson },
    skills: { [target]: question.skill! }, inputModes: { [target]: question.inputMode! }, answerModes: { [target]: 'drag-text' },
  }
}

const common = { lessonId, totalRounds: QUESTION_COUNT }

export const TIENG_VIET_1_WEEK_4_BUBBLE_CONFIG: BubbleShooterGameConfig = {
  wolfWrongAnswersOnly: true,
  id: `${lessonId}-bubble`, title: TIENG_VIET_1_WEEK_4.title, ...common, images: WEEK_4_IMAGE_QUESTION_IMAGES,
  tracking: { lessonId, gameId: GAME_IDS.BUBBLE_SHOOTER },
  loadQuestions: async () => (await loadVietnameseWeek4Questions('bubble-shooter')).map(toVietnameseWeek4Bubble),
}

export const TIENG_VIET_1_WEEK_4_GOLD_CONFIG: GoldMinerGameConfig = {
  ...common, gameId: GAME_IDS.GOLD_MINING, answerDomain: [], supportedTargets: targets('gold-mining'), images: WEEK_4_IMAGE_QUESTION_IMAGES,
  loadQuestions: async () => (await loadVietnameseWeek4Questions('gold-mining')).map(toVietnameseWeek4Gold),
}

export const TIENG_VIET_1_WEEK_4_RACING_CONFIG: RacingGameConfig = {
  wolfEnabled: true,
  ...common, gameId: GAME_IDS.RACING, answerDomain: [], supportedTargets: targets('racing'), images: WEEK_4_IMAGE_QUESTION_IMAGES,
  loadQuestions: async () => (await loadVietnameseWeek4Questions('racing')).map(toVietnameseWeek4Racing),
}

const dragAnswerDomain = [...WEEK_4_LEARNED_LETTERS, ...WEEK_4_LEARNED_LETTERS.map(letter => letter.toLocaleUpperCase('vi-VN'))]
export const TIENG_VIET_1_WEEK_4_DRAG_CONFIG: DragDropGameConfig = {
  answerTrayColumns: 'auto', answerNoun: 'đáp án', awaitLevelReload: true,
  ...common, gameId: GAME_IDS.DRAG_DROP, answerDomain: dragAnswerDomain, images: WEEK_4_IMAGE_QUESTION_IMAGES,
  supportedTargets: targets('drag-drop'),
  initialLevels: generateQuestionSet('drag-drop', { random: () => 0.5 }).map(toVietnameseWeek4Drag),
  loadLevels: async () => (await loadVietnameseWeek4Questions('drag-drop')).map(toVietnameseWeek4Drag),
}

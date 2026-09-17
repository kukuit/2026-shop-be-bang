import type { LearningQuestion } from '../general/learning-question'
import { GAME_IDS } from '../general/tracking'
import type { MathQuestion, BubbleShooterGameConfig } from '../bubble-shooter/types/game'
import type { DragDropGameConfig, DragDropLevel } from '../drag-drop/types'
import type { GoldMinerGameConfig, GoldMinerQuestion } from '../gold-miner/types'
import type { RacingGameConfig, RacingQuestion } from '../racing/types'

import type { GameImages } from '../general/game-image'
import type { LessonId } from '../general/tracking'
import { shuffle } from './question-generator'

export function createEnglishGameConfigs({ lessonId, title, images, createQuestions, initialQuestions }: {
 lessonId: LessonId; title: string; images: GameImages;
 createQuestions: () => LearningQuestion[]; initialQuestions: LearningQuestion[]
}) {
const choicesFor = (answer: string, options: string[], size: number) => {
  const values = [answer, ...shuffle(Array.from(new Set(options)).filter(value => value !== answer))].slice(0, size)
  return shuffle(values)
}
const toBubble = (): MathQuestion[] => createQuestions().map((q) => ({
  images: images,
  id: q.id, text: q.prompt ?? '🔊 Nghe và chọn', answer: q.answer, options: choicesFor(q.answer, q.options ?? [], 4),
  learningKey: q.goalKey, skill: q.skill, inputMode: q.inputMode, answerMode: q.answerMode,
  instructionVoice: q.instructionVoice, voice: q.voice, presentation: { type: 'generic', prompt: q.prompt ?? '🔊 Nghe và chọn' },
}))

const BUBBLE_CONFIG: BubbleShooterGameConfig = {
  images: images,
  id: `${lessonId}-bubble`, title, totalRounds: 10,
  loadQuestions: toBubble, tracking: { lessonId, gameId: GAME_IDS.BUBBLE_SHOOTER },
}

const mapDragLevels = (questions: LearningQuestion[]): DragDropLevel[] => questions.map((q, index) => {
  const target = `english-${index}`
  return {
    id: index + 1, questionId: q.id, type: 'count', title: q.prompt ?? 'Nghe và ghép',
    instruction: q.inputMode === 'audio' ? '🔊 Nghe và kéo đáp án đúng' : 'Kéo đáp án đúng vào ô',
    instructionVoice: '/games/general/voices/be_hay_ghep_dung_nhe.mp3', voice: q.voice,
    groups: [{ id: target, icon: q.prompt ?? '🔊', count: 1, label: 'mục tiêu' }],
    answers: { [target]: q.answer }, learningKeys: { [target]: q.goalKey },
    answerDomain: choicesFor(q.answer, q.options ?? [], 4),
    skills: { [target]: q.skill! }, inputModes: { [target]: q.inputMode! },
    answerModes: { [target]: q.answerMode === 'select-image' ? 'drag-image' : 'drag-text' },
  }
})
const toDragLevels = () => mapDragLevels(createQuestions())
const initialDrag = mapDragLevels(initialQuestions)
const DRAG_CONFIG: DragDropGameConfig = {
  images: images,
  lessonId, gameId: GAME_IDS.DRAG_DROP, totalRounds: 10,
  answerDomain: [],
  supportedTargets: [], initialLevels: initialDrag, loadLevels: toDragLevels,
}

const toGold = (): GoldMinerQuestion[] => createQuestions().map((q) => ({
  id: q.id, objectType: 'star', count: 0, prompt: q.prompt ?? '🔊 Nghe và chọn',
  correctAnswer: q.answer, choices: choicesFor(q.answer, q.options ?? [], 4), learningKey: q.goalKey,
  skill: q.skill, inputMode: q.inputMode, answerMode: q.answerMode, instructionVoice: q.instructionVoice, voice: q.voice,
}))
const GOLD_CONFIG: GoldMinerGameConfig = {
  images: images,
  lessonId, gameId: GAME_IDS.GOLD_MINING, totalRounds: 10, answerDomain: [], supportedTargets: [], loadQuestions: toGold,
}

const toRacing = (): RacingQuestion[] => createQuestions().map((q) => ({
  id: q.id, type: 'generic', prompt: q.prompt ?? '🔊 Nghe và chọn', answer: q.answer,
  options: choicesFor(q.answer, q.options ?? [], 3), learningKey: q.goalKey, skill: 'language_choice',
  learningSkill: q.skill, inputMode: q.inputMode, answerMode: q.answerMode, instructionVoice: q.instructionVoice, voice: q.voice,
}))
const RACING_CONFIG: RacingGameConfig = {
  images: images,
  lessonId, gameId: GAME_IDS.RACING, totalRounds: 10, answerDomain: [], supportedTargets: [], loadQuestions: toRacing,
}

return { bubble: BUBBLE_CONFIG, drag: DRAG_CONFIG, gold: GOLD_CONFIG, racing: RACING_CONFIG }
}

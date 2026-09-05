import { TIENG_ANH_1_BAI_1_IMAGES } from '@/app/game/lop-1/tieng-anh/bai-1/images'
import type { LearningQuestion } from '../general/learning-question'
import { createEnglishQuestions, TIENG_ANH_1_BAI_1_QUESTION_POOL } from '@/app/game/lop-1/tieng-anh/bai-1/content'
import { GAME_IDS } from '../general/tracking'
import type { MathQuestion, BubbleShooterGameConfig } from '../bubble-shooter/types/game'
import type { DragDropGameConfig, DragDropLevel } from '../drag-drop/types'
import type { GoldMinerGameConfig, GoldMinerQuestion } from '../gold-miner/types'
import type { RacingGameConfig, RacingQuestion } from '../racing/types'

const lessonId = 'tieng-anh-1-bai-1' as const
const choicesFor = (answer: string, options: string[], size: number) => {
  const values = [answer, ...options.filter((value) => value !== answer)].slice(0, size)
  return values.sort(() => Math.random() - .5)
}
const toBubble = (): MathQuestion[] => createEnglishQuestions().map((q) => ({
  images: TIENG_ANH_1_BAI_1_IMAGES,
  id: q.id, text: q.prompt ?? '🔊 Nghe và chọn', answer: q.answer, options: choicesFor(q.answer, q.options ?? [], 4),
  learningKey: q.goalKey, skill: q.skill, inputMode: q.inputMode, answerMode: q.answerMode,
  instructionVoice: q.instructionVoice, voice: q.voice, presentation: { type: 'generic', prompt: q.prompt ?? '🔊 Nghe và chọn' },
}))

export const TIENG_ANH_1_BAI_1_BUBBLE_CONFIG: BubbleShooterGameConfig = {
  images: TIENG_ANH_1_BAI_1_IMAGES,
  id: 'tieng-anh-1-bai-1-bubble', title: 'In the school playground', totalRounds: 10,
  loadQuestions: toBubble, tracking: { lessonId, gameId: GAME_IDS.BUBBLE_SHOOTER },
}

const mapDragLevels = (questions: LearningQuestion[]): DragDropLevel[] => questions.map((q, index) => {
  const target = `english-${index}`
  return {
    id: index + 1, type: 'count', title: q.prompt ?? 'Nghe và ghép',
    instruction: q.inputMode === 'audio' ? '🔊 Nghe và kéo đáp án đúng' : 'Kéo đáp án đúng vào hình',
    instructionVoice: '/games/general/voices/be_hay_ghep_dung_nhe.mp3', voice: q.voice,
    groups: [{ id: target, icon: q.prompt ?? '🔊', count: 1, label: 'mục tiêu' }],
    answers: { [target]: q.answer }, learningKeys: { [target]: q.goalKey },
    answerDomain: Array.from(new Set([q.answer, ...(q.options ?? [])])),
    skills: { [target]: q.skill! }, inputModes: { [target]: q.inputMode! },
    answerModes: { [target]: q.answerMode === 'select-image' ? 'drag-image' : 'drag-text' },
  }
})
const toDragLevels = () => mapDragLevels(createEnglishQuestions())
const initialDrag = mapDragLevels(TIENG_ANH_1_BAI_1_QUESTION_POOL.slice(0, 10))
export const TIENG_ANH_1_BAI_1_DRAG_CONFIG: DragDropGameConfig = {
  images: TIENG_ANH_1_BAI_1_IMAGES,
  lessonId, gameId: GAME_IDS.DRAG_DROP, totalRounds: 10,
  answerDomain: ['ball', 'Bill', 'book', 'bike', '⚽', '👦', '📘', '🚲', '👋🙂', '🙂👋'],
  supportedTargets: [], initialLevels: initialDrag, loadLevels: toDragLevels,
}

const toGold = (): GoldMinerQuestion[] => createEnglishQuestions().map((q) => ({
  id: q.id, objectType: 'star', count: 0, prompt: q.prompt ?? '🔊 Nghe và chọn',
  correctAnswer: q.answer, choices: choicesFor(q.answer, q.options ?? [], 4), learningKey: q.goalKey,
  skill: q.skill, inputMode: q.inputMode, answerMode: q.answerMode, instructionVoice: q.instructionVoice, voice: q.voice,
}))
export const TIENG_ANH_1_BAI_1_GOLD_CONFIG: GoldMinerGameConfig = {
  images: TIENG_ANH_1_BAI_1_IMAGES,
  lessonId, gameId: GAME_IDS.GOLD_MINING, totalRounds: 10, answerDomain: [], supportedTargets: [], loadQuestions: toGold,
}

const toRacing = (): RacingQuestion[] => createEnglishQuestions().map((q) => ({
  id: q.id, type: 'generic', prompt: q.prompt ?? '🔊 Nghe và chọn', answer: q.answer,
  options: choicesFor(q.answer, q.options ?? [], 3), learningKey: q.goalKey, skill: 'language_choice',
  learningSkill: q.skill, inputMode: q.inputMode, answerMode: q.answerMode, instructionVoice: q.instructionVoice, voice: q.voice,
}))
export const TIENG_ANH_1_BAI_1_RACING_CONFIG: RacingGameConfig = {
  images: TIENG_ANH_1_BAI_1_IMAGES,
  lessonId, gameId: GAME_IDS.RACING, totalRounds: 10, answerDomain: [], supportedTargets: [], loadQuestions: toRacing,
}

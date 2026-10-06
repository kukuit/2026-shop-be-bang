import type { LessonQuestion, LessonQuestionSource } from './learning-question'
import { GAME_IDS, type GameId } from './tracking'
import type { MathQuestion, BubbleShooterGameConfig } from '../bubble-shooter/types/game'
import type { DragDropGameConfig, DragDropLevel } from '../drag-drop/types'
import type { GoldMinerGameConfig, GoldMinerQuestion } from '../gold-miner/types'
import type { RacingGameConfig, RacingQuestion } from '../racing/types'
import { shuffle } from './lesson-question-utils'

type AdapterOptions = { totalRounds?: number; wolfEnabled?: boolean; introVoice?: string }

function withChoices(question: LessonQuestion, count: number): string[] {
  const unique = Array.from(new Set([question.answer, ...(question.options ?? [])].map(String)))
  if (!unique.includes(question.answer)) unique.unshift(question.answer)
  return shuffle(unique).slice(0, count)
}

function gameQuestion(source: LessonQuestion, options: string[]) {
  return { id: source.id, learningKey: source.goalKey, sourceLesson: source.data?.sourceLesson as number | undefined,
    skill: source.skill, inputMode: source.inputMode, answerMode: source.answerMode,
    instructionVoice: source.instructionVoice, voice: source.voice, voiceFallback: source.data?.voiceFallback as { instruction?: string; target?: string } | undefined,
    voiceSequence: source.data?.voiceSequence as import('./composed-voice').VoiceSegment[] | undefined,
    options }
}

/** Adapt a lesson question bank to Bubble Shooter without lesson-specific engine code. */
export async function toBubbleQuestions(source: LessonQuestionSource, count = 4): Promise<MathQuestion[]> {
  return (await source.questions()).map(q => ({ ...gameQuestion(q, withChoices(q, count)), images: source.images, text: q.prompt ?? '', answer: q.answer,
    presentation: q.data?.presentation as MathQuestion['presentation'] ?? { type: 'generic', prompt: q.prompt ?? '' } }))
}

/** Adapt a lesson question bank to Gold Mining. */
export async function toGoldQuestions(source: LessonQuestionSource, count = 4): Promise<GoldMinerQuestion[]> {
  return (await source.questions()).map(q => ({ ...gameQuestion(q, withChoices(q, count)), id: q.id, choices: withChoices(q, count),
    objectType: (q.data?.objectType as GoldMinerQuestion['objectType']) ?? 'star', count: Number(q.data?.count ?? 0),
    prompt: q.prompt ?? '', correctAnswer: q.answer, learningKey: q.goalKey }))
}

/** Adapt a lesson question bank to Racing. The engine requires three choices. */
export async function toRacingQuestions(source: LessonQuestionSource): Promise<RacingQuestion[]> {
  return (await source.questions()).map(q => ({ ...gameQuestion(q, withChoices(q, 3)), images: source.images, id: q.id,
    type: 'generic', prompt: q.prompt ?? '', answer: q.answer, options: withChoices(q, 3), skill: 'language_choice',
    learningSkill: q.skill, showVoiceButton: true, voiceButtonStyle: 'panel-gem' }))
}

/** Adapt single-answer lesson questions to one-target Drag Drop levels. */
export async function toDragDropLevels(source: LessonQuestionSource, count = 6): Promise<DragDropLevel[]> {
  return (await source.questions()).map((q, index) => {
    const target = `answer-${index}`
    const choices = withChoices(q, count)
    return { id: index + 1, questionId: q.id, type: 'count', title: q.prompt ?? '', instruction: 'Kéo đáp án đúng vào ô',
      instructionVoice: q.instructionVoice, voice: q.voice,
      groups: [{ id: target, icon: q.media?.image ?? q.prompt ?? '?', count: 1, label: q.prompt ?? '' }],
      answers: { [target]: q.answer }, answerDomain: choices, learningKeys: { [target]: q.goalKey },
      ...(q.data?.sourceLesson ? { sourceLessons: { [target]: q.data.sourceLesson as number } } : {}),
      ...(q.skill ? { skills: { [target]: q.skill } } : {}),
      ...(q.inputMode ? { inputModes: { [target]: q.inputMode } } : {}),
      ...(q.answerMode ? { answerModes: { [target]: q.answerMode === 'select-image' ? 'drag-image' : 'drag-text' } } : {}),
    }
  })
}

/** Construct standard configs so a route only selects a lesson source and an engine. */
export function createLessonGameConfigs(source: LessonQuestionSource, options: AdapterOptions = {}) {
  const totalRounds = options.totalRounds ?? 10
  const base = { lessonId: source.lessonId, totalRounds, introVoice: options.introVoice ?? source.introVoice, images: source.images }
  const bubble: BubbleShooterGameConfig = { id: `${source.lessonId}-bubble`, title: source.title, ...base,
    tracking: { lessonId: source.lessonId, gameId: GAME_IDS.BUBBLE_SHOOTER }, loadQuestions: () => toBubbleQuestions(source) }
  const gold: GoldMinerGameConfig = { ...base, gameId: GAME_IDS.GOLD_MINING, answerDomain: [], supportedTargets: [], loadQuestions: () => toGoldQuestions(source) }
  const racing: RacingGameConfig = { ...base, gameId: GAME_IDS.RACING, answerDomain: [], supportedTargets: [], wolfEnabled: options.wolfEnabled,
    loadQuestions: () => toRacingQuestions(source) }
  const drag: DragDropGameConfig = { ...base, gameId: GAME_IDS.DRAG_DROP, answerDomain: [], supportedTargets: [], initialLevels: [],
    loadLevels: () => toDragDropLevels(source) }
  return { bubble, gold, racing, drag } as const
}

export type StandardLessonGameId = GameId

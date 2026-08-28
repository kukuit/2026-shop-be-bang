import type { LearningKey, LearningKeyProgress, LessonId } from './tracking'
import { getLearningProgress } from './tracking'

export const ADAPTIVE_ENABLED = process.env.NEXT_PUBLIC_GAME_ADAPTIVE_ENABLED === 'true'

const configuredRatio = Number(process.env.NEXT_PUBLIC_GAME_ADAPTIVE_RATIO ?? '0.4')
export const ADAPTIVE_RATIO = Number.isFinite(configuredRatio)
  ? Math.min(1, Math.max(0, configuredRatio))
  : 0.4

export type LessonLearningProfileItem = LearningKeyProgress & {
  targetId: LearningKey
  accuracy: number
}

export function normalizeLessonLearningProfile(
  progress: Partial<Record<LearningKey, LearningKeyProgress>>,
): LessonLearningProfileItem[] {
  return Object.entries(progress).flatMap(([targetId, value]) => {
    if (!value) return []
    const attempts = Number(value.attempts)
    const correct = Number(value.correct)
    const wrong = Number(value.wrong)
    const responseTime = Number(value.responseTime)
    if (![attempts, correct, wrong, responseTime].every(Number.isFinite) || attempts < 0) return []
    return [{
      targetId: targetId as LearningKey,
      attempts,
      correct,
      wrong,
      responseTime,
      accuracy: attempts ? correct / attempts : 0,
    }]
  })
}

export function getWeakTargets(profile: LessonLearningProfileItem[]) {
  return profile.filter((item) => item.attempts >= 2 && item.accuracy < 0.6).map((item) => item.targetId)
}

const shuffle = <T,>(items: T[]) => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

type AdaptiveQuestionOptions<T> = {
  lessonId: LessonId
  gameId: string
  supportedTargets: readonly LearningKey[]
  totalRounds: number
  generateRandomQuestion: (index: number) => T
  generateQuestionForTarget: (targetId: LearningKey, index: number) => T
}

/** Builds a lesson-scoped question set. The progress endpoint reads one user+lesson document. */
export async function buildAdaptiveQuestions<T>(options: AdaptiveQuestionOptions<T>): Promise<T[]> {
  const randomOnly = () => Array.from(
    { length: options.totalRounds },
    (_, index) => options.generateRandomQuestion(index),
  )
  if (!ADAPTIVE_ENABLED || options.totalRounds <= 0) return randomOnly()

  try {
    const progress = await getLearningProgress(options.lessonId)
    const supported = new Set(options.supportedTargets)
    const lessonWeakTargets = getWeakTargets(normalizeLessonLearningProfile(progress))
    const eligibleWeakTargets = lessonWeakTargets.filter((target) => supported.has(target))
    if (!eligibleWeakTargets.length) return randomOnly()

    const adaptiveCount = Math.min(options.totalRounds, Math.round(options.totalRounds * ADAPTIVE_RATIO))
    const adaptive = Array.from({ length: adaptiveCount }, (_, index) =>
      options.generateQuestionForTarget(eligibleWeakTargets[index % eligibleWeakTargets.length], index))
    const random = Array.from(
      { length: options.totalRounds - adaptiveCount },
      (_, index) => options.generateRandomQuestion(adaptiveCount + index),
    )
    if (process.env.NODE_ENV === 'development') console.info('[AdaptiveLearning]', {
      adaptiveEnabled: true,
      lessonId: options.lessonId,
      gameId: options.gameId,
      lessonWeakTargets,
      gameSupportedTargets: options.supportedTargets,
      eligibleWeakTargets,
      adaptiveCount,
      randomCount: random.length,
    })
    return shuffle([...adaptive, ...random])
  } catch (error) {
    if (process.env.NODE_ENV === 'development')
      console.warn('[AdaptiveLearning] Falling back to the current generator.', error)
    return randomOnly()
  }
}

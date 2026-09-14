import { isLessonCompleted, type ProgressLesson } from '@/components/games/lesson-map/progress'
import { getSubjectLessons, type SubjectId } from './config'

export const accuracyOf = (correct: number, attempts: number): number | null =>
  attempts > 0 ? Math.round(correct / attempts * 100) : null

export function goalStatus(correct: number, attempts: number) {
  const accuracy = accuracyOf(correct, attempts)
  if (!attempts) return { label: 'Chưa học', tone: 'empty' } as const
  if (attempts < 5) return { label: 'Chưa đủ dữ liệu', tone: 'insufficient' } as const
  if (accuracy! < 70) return { label: 'Cần luyện thêm', tone: 'needs-practice' } as const
  if (accuracy! < 85) return { label: 'Đang luyện', tone: 'practicing' } as const
  if (accuracy! < 100) return { label: 'Đã nắm', tone: 'mastered' } as const
  return { label: 'Xuất sắc', tone: 'excellent' } as const
}

export type Counts = { correct: number; wrong: number; attempts: number; accuracy: number | null }
export type LessonSummary = Counts & {
  completionKnown?: boolean
  completed: boolean
  completedGames: number
  totalGames: number
  lastPlayedAt: string | null
  completedAt: string | null
}
export type SubjectProgress = Counts & {
  schemaVersion: 1
  userId: string
  grade: number
  subjectId: SubjectId
  totalLessons: number
  completedLessons: number
  currentLessonId: string | null
  lessons: Record<string, LessonSummary>
  updatedAt: string | null
}
export type GoalProgress = Counts & {
  id: string; title: string
  recent: Counts
  previous: Counts
  improvement: number | null
}
export type LessonGoalProgress = Counts & { userId: string; lessonId: string; goals: GoalProgress[] }
export type LegacyGoalCounts = Partial<Pick<Counts, 'correct' | 'wrong' | 'attempts'>>
export type SubjectOverview = SubjectProgress & {
  weakestGoal: { title: string; accuracy: number; lessonId: string; source: 'recent' | 'lifetime' } | null
  weakGoals: { id: string; title: string; accuracy: number; lessonId: string; source: 'recent' | 'lifetime' }[]
  hasGoalData: boolean
}

export function currentGoalAccuracy(lifetime: LegacyGoalCounts, recent: Counts) {
  return recent.attempts >= 5
    ? { accuracy: recent.accuracy, source: 'recent' as const }
    : { accuracy: accuracyOf(lifetime.correct ?? 0, (lifetime.correct ?? 0) + (lifetime.wrong ?? 0)), source: 'lifetime' as const }
}

// Input is newest first. Keep lifetime counters separate from current assessment.
export function recentGoalProgress(answers: boolean[]) {
  const count = (items: boolean[]): Counts => {
    const correct = items.filter(Boolean).length
    return { correct, wrong: items.length - correct, attempts: items.length, accuracy: accuracyOf(correct, items.length) }
  }
  const recent = count(answers.slice(0, 20))
  const previous = count(answers.slice(20, 40))
  return { recent, previous, improvement: recent.attempts >= 5 && previous.attempts >= 5
    ? recent.accuracy! - previous.accuracy! : null }
}

export function sumCounts(values: LegacyGoalCounts[]): Counts {
  const totals = values.reduce<Pick<Counts, 'correct' | 'wrong' | 'attempts'>>((sum, value) => ({
    correct: sum.correct + (value.correct ?? 0),
    wrong: sum.wrong + (value.wrong ?? 0),
    attempts: sum.attempts + (value.attempts ?? 0),
  }), { correct: 0, wrong: 0, attempts: 0 })
  return { ...totals, accuracy: accuracyOf(totals.correct, totals.attempts) }
}

export function summarizeLesson(
  definition: ProgressLesson,
  keys: Record<string, LegacyGoalCounts>,
  games: Record<string, { completedAt?: unknown }>,
  lastPlayedAt: string | null,
  previous?: LessonSummary,
): LessonSummary {
  const gameIds = Array.from(new Set(definition.games))
  const completedGames = gameIds.filter(id => games[id]?.completedAt).length
  const completed = isLessonCompleted({ completedGames, totalGames: gameIds.length, requiredGames: definition.requiredGames })
  return {
    ...sumCounts(Object.values(keys)), completed, completedGames, totalGames: gameIds.length,
    lastPlayedAt,
    completedAt: completed ? previous?.completedAt ?? lastPlayedAt : null,
  }
}

// Operates on small stored lesson summaries only; never reads sessions or goals.
export function buildSubjectProgress(
  userId: string, grade: number, subjectId: SubjectId,
  lessonSummaries: Record<string, LessonSummary> = {}, updatedAt: string | null = null,
): SubjectProgress {
  const definitions = getSubjectLessons(grade, subjectId)
  const lessons = Object.fromEntries(definitions.flatMap(definition => {
    const summary = lessonSummaries[definition.lessonId]
    if (!summary) return []
    const totalGames = new Set(definition.games).size
    return [[definition.lessonId, { ...summary, totalGames,
      completed: isLessonCompleted({ completedGames: summary.completedGames, totalGames, requiredGames: definition.requiredGames }),
      accuracy: accuracyOf(summary.correct, summary.attempts),
    }]]
  }))
  return {
    schemaVersion: 1, userId, grade, subjectId, ...sumCounts(Object.values(lessons)),
    totalLessons: definitions.length,
    completedLessons: Object.values(lessons).filter(lesson => lesson.completed).length,
    currentLessonId: definitions.find(lesson => !lessons[lesson.lessonId]?.completed)?.lessonId ?? null,
    lessons, updatedAt,
  }
}

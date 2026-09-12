import type { LessonDefinition, LessonMapItem } from './data'

export type StarCount = 0 | 1 | 2 | 3 | 4 | 5
export type ProgressLesson = LessonDefinition & {
  available: boolean
  games: readonly string[]
  requiredGames: number
  starMilestones?: { twoStars?: number; fourStars?: number }
}
export type CompletedGame = { lessonId: string; gameId: string; completedAt?: unknown }

export function isLessonCompleted({ completedGames, totalGames, requiredGames }: {
  completedGames: number; totalGames: number; requiredGames: number
}) {
  return totalGames > 0 && completedGames >= Math.max(1, Math.min(totalGames, requiredGames))
}

export function getLessonStarCount({ completedGameCount, totalGames, requiredGames, starMilestones }: {
  completedGameCount: number
  totalGames: number
  requiredGames: number
  starMilestones?: ProgressLesson['starMilestones']
}): StarCount {
  if (totalGames <= 0 || completedGameCount <= 0) return 0
  const required = Math.max(1, Math.min(totalGames, requiredGames))
  if (completedGameCount >= totalGames) return 5
  const four = Math.min(totalGames, Math.max(required + 1, starMilestones?.fourStars ?? Math.ceil(totalGames * .75)))
  if (completedGameCount >= four) return 4
  if (completedGameCount >= required) return 3
  const two = required <= 2 ? required : Math.min(required - 1, Math.max(2, starMilestones?.twoStars ?? Math.ceil(required * .7)))
  return completedGameCount >= two ? 2 : 1
}

export function buildProgressMap(records: readonly CompletedGame[]) {
  const result = new Map<string, Set<string>>()
  for (const record of records) {
    if (!record.completedAt) continue
    const games = result.get(record.lessonId) ?? new Set<string>()
    games.add(record.gameId)
    result.set(record.lessonId, games)
  }
  return result
}

export function buildLessonMapItems(definitions: readonly ProgressLesson[], records: readonly CompletedGame[]): LessonMapItem[] {
  const progress = buildProgressMap(records)
  const lessons = definitions.map(lesson => {
    const games = Array.from(new Set(lesson.games))
    const totalGames = games.length
    const completedGames = games.filter(id => progress.get(lesson.lessonId)?.has(id)).length
    const requiredGames = totalGames ? Math.max(1, Math.min(totalGames, lesson.requiredGames)) : 0
    return {
      ...lesson, totalGames, completedGames, requiredGames,
      completed: isLessonCompleted({ completedGames, totalGames, requiredGames }),
      stars: getLessonStarCount({ completedGameCount: completedGames, totalGames, requiredGames, starMilestones: lesson.starMilestones }),
    }
  })
  const current = lessons.filter(lesson => lesson.available && !lesson.completed).sort((a, b) => a.id - b.id)[0]
  return lessons.map(lesson => ({
    ...lesson,
    status: lesson.completed ? 'completed' : lesson.lessonId === current?.lessonId ? 'current' : lesson.available ? 'available' : 'locked',
  }))
}

export type LessonStatus = 'completed' | 'current' | 'available' | 'locked'
export type LessonDefinition = { id: number; lessonId: string; title: string; href: string }
export type LessonProgress = {
  lessonId: string
  completed: boolean
  unlocked?: boolean
  stars?: number
  bestScore?: number
  gamesCompleted?: number
  gamesTotal?: number
  lastPlayedAt?: string
}
export type LessonMapItem = LessonDefinition & { status: LessonStatus; stars?: number }

export const lessonDefinitions: LessonDefinition[] = Array.from({ length: 41 }, (_, index) => {
  const id = index + 1
  return { id, lessonId: `toan-1-bai-${id}`, title: id === 1 ? 'Các số từ 0 đến 5' : id === 2 ? 'Các số 6, 7, 8, 9, 10' : `Bài ${id}`, href: `/game/lop-1/toan/bai-${id}` }
})

// Demo only. Pass API progress to LessonMap when it becomes available.
export const demoProgress: LessonProgress[] = [
  { lessonId: lessonDefinitions[0].lessonId, completed: true, stars: 3 },
  { lessonId: lessonDefinitions[1].lessonId, completed: true, stars: 3 },
  { lessonId: lessonDefinitions[2].lessonId, completed: false, unlocked: true, stars: 2 },
]

export function buildLessonMapData(definitions: readonly LessonDefinition[], progress: readonly LessonProgress[]): LessonMapItem[] {
  const byId = new Map(progress.map(item => [item.lessonId, item]))
  let hasCurrent = false
  return definitions.map((lesson, index) => {
    const entry = byId.get(lesson.lessonId)
    const unlocked = entry?.unlocked ?? (index === 0 || byId.get(definitions[index - 1].lessonId)?.completed === true)
    let status: LessonStatus = entry?.completed ? 'completed' : unlocked ? 'available' : 'locked'
    if (status === 'available' && !hasCurrent) { status = 'current'; hasCurrent = true }
    return { ...lesson, status, stars: entry?.stars === undefined ? undefined : Math.max(0, Math.min(3, Math.round(entry.stars))) }
  })
}

export function getMapRegion(id: number) {
  return id <= 8 ? 'tropical' : id <= 16 ? 'coral' : id <= 24 ? 'deepSea' : id <= 32 ? 'treasure' : 'finalIsland'
}

export function getMapPosition(index: number, columns: number) {
  const row = Math.floor(index / columns)
  return { row: row + 1, column: row % 2 === 0 ? index % columns + 1 : columns - index % columns }
}

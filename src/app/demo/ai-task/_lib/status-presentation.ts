import type { Status, Task } from './model'

// Presentation only: retain legacy persisted keys and backend validation.
export const uiStatuses = ['todo', 'in_progress', 'waiting', 'done', 'cancelled'] as const
export const uiStatus = (status: Status): typeof uiStatuses[number] => status === 'blocked' ? 'waiting' : status

export function waitingTree(data: { tasks: Task[]; total: number; matchingIds: string[] }) {
  const matches = new Set(data.matchingIds)
  const matchingIds = data.tasks.filter(t => matches.has(t.id) && uiStatus(t.status) === 'waiting').map(t => t.id)
  const keep = new Set(matchingIds)
  const byId = new Map(data.tasks.map(t => [t.id, t]))
  for (const id of matchingIds) {
    let parent = byId.get(id)?.parentId
    const seen = new Set<string>()
    while (parent && !seen.has(parent)) {
      seen.add(parent); keep.add(parent); parent = byId.get(parent)?.parentId
    }
  }
  return { tasks: data.tasks.filter(t => keep.has(t.id)), total: matchingIds.length, matchingIds }
}

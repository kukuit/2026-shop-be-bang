import type { Task } from '@/app/demo/ai-task/_lib/model'
import { normalizedText } from './normalizePattern'
import type { AssistantBrowserContext, PersonalEntityPattern } from './types'
export function isContextReference(reference: string) {
  return /^(?:viec|cong viec|task|cai)?\s*(?:do|nay|vua roi|vua tao|tren|thu \d+)$|^no$|^cai vua tao$/.test(
    normalizedText(reference)
  )
}
export function resolveTarget(
  reference: string | undefined,
  context: AssistantBrowserContext,
  tasks: Task[],
  entities: PersonalEntityPattern[] = []
) {
  const available = tasks.filter((task) => !task.deletedAt)
  const ref = normalizedText(reference || '')
  const ordinal = /^(?:cai|viec|task|cong viec) thu (\d+)$/.exec(ref)
  if (!ref || isContextReference(ref)) {
    const id = ordinal ? context.lastTaskIds?.[Number(ordinal[1]) - 1] : context.activeTaskId || context.lastTaskId
    return { task: available.find((task) => task.id === id), contextual: true }
  }
  const ranked = available
    .map((task) => {
      const title = normalizedText(task.title)
      let score = title === ref ? 100 : title.includes(ref) ? 70 : 0
      if (task.id === context.activeTaskId || task.id === context.lastTaskId) score += 24
      if (context.recentMentionedTaskIds?.includes(task.id)) score += 16
      if (context.lastTaskIds?.includes(task.id)) score += 10
      if (context.activeParentId && task.parentId === context.activeParentId) score += 6
      if (context.activeGroupId && task.groupId === context.activeGroupId) score += 4
      return { task, score }
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
  // Do not guess between close targets; a context bonus may break an otherwise
  // exact tie only when it is materially stronger.
  if (ranked.length && (ranked.length === 1 || ranked[0].score - ranked[1].score >= 12))
    return { task: ranked[0].task, contextual: false }
  const aliases = entities.filter(
    (entity) =>
      entity.entityType === 'task' &&
      normalizedText(entity.phrase) === ref &&
      entity.confidence >= 0.7
  )
  const ids = new Set(aliases.map((entity) => entity.entityId))
  return {
    task: ids.size === 1 ? available.find((task) => ids.has(task.id)) : undefined,
    contextual: false,
  }
}

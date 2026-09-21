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
    const id = ordinal ? context.lastTaskIds?.[Number(ordinal[1]) - 1] : context.lastTaskId
    return { task: available.find((task) => task.id === id), contextual: true }
  }
  const exact = available.filter((task) => normalizedText(task.title) === ref)
  const matching = exact.length
    ? exact
    : available.filter((task) => normalizedText(task.title).includes(ref))
  if (matching.length)
    return { task: matching.length === 1 ? matching[0] : undefined, contextual: false }
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

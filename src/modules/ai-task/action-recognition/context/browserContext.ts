import { z } from 'zod'
import { actionDefinitions, type AssistantBrowserContext, type RecognitionIntent, type TaskAction } from '../types'
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,150}$/)
export const browserContextSchema = z
  .object({
    lastTaskId: id.optional(),
    lastTaskIds: z.array(id).max(30).optional(),
    lastMessageId: id.optional(),
    lastGroupId: id.optional(),
    lastParentId: id.nullable().optional(),
    lastAction: z
      .custom<TaskAction>(
        (value) => typeof value === 'string' && Object.hasOwn(actionDefinitions, value)
      )
      .optional(),
    lastQuery: z
      .record(z.string().max(80), z.union([z.string().max(250), z.boolean(), z.number(), z.null()]))
      .optional(),
    activeTopic: z.string().max(250).optional(),
    activeTaskId: id.optional(),
    activeParentId: id.nullable().optional(),
    activeGroupId: id.optional(),
    activePerson: z.string().max(120).optional(),
    activeProject: z.string().max(120).optional(),
    previousIntent: z.string().max(40).optional() as z.ZodType<RecognitionIntent | undefined>,
    pendingIntent: z.string().max(40).optional() as z.ZodType<RecognitionIntent | undefined>,
    pendingEntities: z.record(z.string().max(40), z.union([z.string().max(250), z.number(), z.null()])).optional(),
    recentMentionedTaskIds: z.array(id).max(30).optional(),
    recentTurns: z.array(z.object({ text: z.string().max(500), intent: z.string().max(40).optional() as z.ZodType<RecognitionIntent | undefined>, at: z.number().finite() }).strict()).max(8).optional(),
    updatedAt: z.number().finite(),
  })
  .strict()
export const BROWSER_CONTEXT_TTL = 2 * 60 * 60 * 1000
export function readBrowserContext(value: unknown, now = Date.now()): AssistantBrowserContext {
  const parsed = browserContextSchema.safeParse(value)
  return parsed.success &&
    parsed.data.updatedAt <= now &&
    now - parsed.data.updatedAt < BROWSER_CONTEXT_TTL
    ? parsed.data
    : { updatedAt: now }
}
const key = (uid: string) => `ai-task-action-context:${uid}`
export function loadBrowserContext(uid: string): AssistantBrowserContext {
  try {
    return readBrowserContext(JSON.parse(sessionStorage.getItem(key(uid)) || 'null'))
  } catch {
    return { updatedAt: Date.now() }
  }
}
export function saveBrowserContext(uid: string, value: AssistantBrowserContext) {
  try {
    sessionStorage.setItem(key(uid), JSON.stringify(readBrowserContext(value)))
  } catch {
    /* Storage restrictions do not block the conversation. */
  }
}

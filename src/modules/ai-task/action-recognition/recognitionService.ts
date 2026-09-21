import 'server-only'
import type { Group, Intent } from '@/app/demo/ai-task/_lib/model'
import { conversationSchema, type Conversation } from '@/app/demo/ai-task/_lib/work-memory'
import { messageCollection, scanTasks } from '@/app/demo/ai-task/_services/repository'
import { parseTaskIntent } from '@/app/demo/ai-task/_services/ai-task-parser'
import { readBrowserContext } from './context/browserContext'
import { recognizeAction } from './recognizeAction'
import { buildActionPlan } from './buildActionPlan'
import { loadIntentPattern } from './memory/memoryRepository'
import { correctionAction } from './explicitAction'
import { normalizedText } from './normalizePattern'
import { isContextReference } from './resolveTarget'
import type { AssistantBrowserContext, RecognitionRecord } from './types'

export async function recognizeRequest(
  uid: string,
  text: string,
  groups: Group[],
  rawContext: AssistantBrowserContext | undefined,
  draft: Record<string, unknown>,
  pendingId?: string
): Promise<{
  intent: Intent | Conversation
  recognition?: RecognitionRecord
  targetId?: string
}> {
  const context = readBrowserContext(rawContext)
  const corrected = correctionAction(text)
  let originalText = text
  let interpretationText = text
  let correctionOf: string | undefined
  if (corrected) {
    const previousId = context.lastMessageId || pendingId
    if (previousId) {
      const previous = await messageCollection(uid).doc(previousId).get()
      const record = previous.get('recognition') as RecognitionRecord | undefined
      if (record && previous.get('role') === 'assistant') {
        originalText = record.originalText
        correctionOf = previousId
      }
    }
    if (!correctionOf)
      return {
        intent: {
          action: 'CHAT',
          reply: 'Bạn muốn sửa yêu cầu nào? Nói lại tên công việc và điều bạn muốn làm nhé.',
        },
      }
    const instruction = text.replace(
      /^(?:không phải|không|ý (?:tôi|mình) là|hiểu nhầm)[,!. ]+/i,
      ''
    )
    // Short corrections change the action on the original request; detailed corrections
    // carry new target/payload information and must not be discarded.
    interpretationText =
      /^(?:them|tao|tim|tim kiem|liet ke|xoa|huy|hoan thanh)(?: (?:cong viec|viec|task))?[.!]?$/.test(
        normalizedText(instruction)
      )
        ? originalText
        : instruction
  }
  const [tasks, pattern] = await Promise.all([
    scanTasks(uid),
    loadIntentPattern(uid, originalText).catch(() => undefined),
  ])
  const recognized = await recognizeAction({
    text: interpretationText,
    groups,
    tasks,
    context,
    draft,
    pattern,
    correctedAction: corrected,
    parse: parseTaskIntent,
  })
  if (!recognized.result || recognized.intent.action === 'CHAT')
    return { intent: recognized.intent }
  const recognition: RecognitionRecord = {
    result: recognized.result,
    originalText,
    ...(correctionOf ? { correctionOf } : {}),
  }
  // An unsaved draft is edited by the existing draft flow, never guessed as a saved task.
  if (
    pendingId &&
    !context.lastTaskId &&
    draft.title &&
    recognized.result.target &&
    !recognized.result.target.taskId
  ) {
    const reference = recognized.result.target.reference || ''
    if (isContextReference(reference) && recognized.intent.action === 'UPDATE_TASK') {
      const { description, withinDay, ...changes } = recognized.intent.changes || {}
      return {
        intent: conversationSchema.parse({
          action: 'CHAT',
          reply: 'Mình cập nhật bản nháp nhé.',
          memory: {
            scope: 'context',
            ...changes,
            ...(description !== undefined
              ? {
                  notes:
                    recognized.result.action === 'task.note'
                      ? [draft.description, description].filter(Boolean).join('\n')
                      : description || '',
                }
              : {}),
            ...(recognized.result.action === 'task.progress' &&
            changes.completionPercent != null &&
            changes.completionPercent < 100
              ? { status: 'in_progress' }
              : {}),
          },
        }),
        recognition,
      }
    }
  }
  const plan = buildActionPlan(recognized.result, recognized.intent, context, tasks)
  if (plan.clarification)
    return { intent: { action: 'CHAT', reply: plan.clarification }, recognition }
  return { intent: plan.intent!, targetId: plan.targetId, recognition }
}

import { intentSchema, type Intent, type Task } from '@/app/demo/ai-task/_lib/model'
import type { ActionRecognitionResult, AssistantBrowserContext } from './types'
import { isContextReference, resolveTarget } from './resolveTarget'

export function buildActionPlan(
  result: ActionRecognitionResult,
  intent: Intent,
  context: AssistantBrowserContext,
  tasks: Task[]
) {
  if (!intent.target) return { intent }
  const resolved = resolveTarget(intent.target.query, context, tasks)
  // Restoring deleted tasks still uses the existing server resolver.
  if (intent.action === 'RESTORE_TASK') return { intent }
  if (!resolved.task && isContextReference(intent.target.query))
    return {
      clarification:
        'Bạn muốn cập nhật công việc nào? Cho mình tên công việc hoặc chọn lại việc trong danh sách nhé.',
    }
  if (!resolved.task) return { intent }
  let changes = intent.changes
  if (
    result.action === 'task.progress' &&
    changes?.completionPercent !== undefined &&
    changes.completionPercent !== null &&
    changes.completionPercent < 100
  ) {
    changes = { ...changes, status: 'in_progress' }
  }
  return {
    intent: intentSchema.parse({
      ...intent,
      target: { query: resolved.task.title },
      ...(changes ? { changes } : {}),
    }),
    targetId: resolved.task.id,
  }
}

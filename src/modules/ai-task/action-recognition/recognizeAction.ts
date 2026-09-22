import { intentSchema, type Group, type Intent, type Task } from '@/app/demo/ai-task/_lib/model'
import type { Conversation } from '@/app/demo/ai-task/_lib/work-memory'
import { explicitAction } from './explicitAction'
import { normalizePattern, normalizedText } from './normalizePattern'
import {
  actionDefinitions,
  type ActionRecognitionResult,
  type AssistantBrowserContext,
  type PersonalIntentPattern,
  type TaskAction,
} from './types'
import { actionRecognitionPrompt } from './prompts/actionRecognitionPrompt'
import { resolveTarget } from './resolveTarget'
import { conversationalIntent, detectSpeechAct, extractEntities } from './signals'

export const confidencePolicy = { execute: 0.9, confirm: 0.65, clarify: 0.4 } as const

export function actionFromIntent(intent: Intent): TaskAction {
  if (intent.action === 'GET_TASKS') return intent.filters?.query ? 'task.search' : 'task.list'
  if (intent.action === 'UPDATE_TASK') {
    const changes = intent.changes || {}
    if ('completionPercent' in changes) return 'task.progress'
    if ('startTime' in changes || 'deadline' in changes || 'duration' in changes)
      return 'task.reschedule'
    if ('priority' in changes) return 'task.priority'
    return 'task.update'
  }
  return (
    {
      CREATE_TASK: 'task.create',
      CREATE_SUBTASK: 'task.create',
      GET_TASK_DETAIL: 'task.detail',
      COMPLETE_TASK: 'task.complete',
      CANCEL_TASK: 'task.cancel',
      DELETE_TASK: 'task.delete',
      RESTORE_TASK: 'task.restore',
    } as const
  )[intent.action]
}
export const legacyActions = {
  'task.create': 'CREATE_TASK',
  'task.list': 'GET_TASKS',
  'task.search': 'GET_TASKS',
  'task.detail': 'GET_TASK_DETAIL',
  'task.update': 'UPDATE_TASK',
  'task.reschedule': 'UPDATE_TASK',
  'task.progress': 'UPDATE_TASK',
  'task.complete': 'COMPLETE_TASK',
  'task.cancel': 'CANCEL_TASK',
  'task.delete': 'DELETE_TASK',
  'task.note': 'UPDATE_TASK',
  'task.priority': 'UPDATE_TASK',
  'task.restore': 'RESTORE_TASK',
} as const

/** Pure recognition: dependencies are injected; this function never writes tasks or memory. */
export async function recognizeAction(input: {
  text: string
  groups: Group[]
  tasks: Task[]
  context: AssistantBrowserContext
  pattern?: PersonalIntentPattern
  correctedAction?: TaskAction
  draft?: Record<string, unknown>
  parse(
    text: string,
    groups: Group[],
    now: Date,
    context: {
      memory: string
      history: { role: string; content: string; status: string }[]
      recognitionHint?: string
    }
  ): Promise<Intent | Conversation>
  now?: Date
}): Promise<{ result?: ActionRecognitionResult; intent: Intent | Conversation }> {
  const entities = extractEntities(input.text)
  const speechAct = detectSpeechAct(input.text)
  const explicit = input.correctedAction || explicitAction(input.text)
  const conversational = !explicit && conversationalIntent(input.text, speechAct, entities)
  // A fact/topic is useful context, but never an implicit task mutation.
  if (conversational) {
    return {
      intent: { action: 'CHAT', reply: conversational === 'SET_CONTEXT' ? 'Mình đã ghi nhận chủ đề này. Bạn muốn mình làm gì tiếp theo?' : conversational === 'INFORM' ? 'Mình đã ghi nhận thông tin này.' : 'Mình chưa đủ thông tin để thực hiện thao tác. Bạn muốn tạo, sửa hay tìm công việc nào?' },
      result: { intent: conversational, speechAct, confidence: conversational === 'INFORM' ? 0.78 : 0.52, source: 'default', requiresConfirmation: false, entities, decision: conversational === 'INFORM' ? 'converse' : 'clarify', payload: {} },
    }
  }
  const prior =
    !explicit &&
    !/[?]|\b(?:khong|dung|tim|doi|xoa|huy)\b/.test(normalizedText(input.text)) &&
    input.pattern?.pattern === normalizePattern(input.text) &&
    input.pattern.confidence >= 0.55
      ? input.pattern
      : undefined
  const preferred = explicit || prior?.preferredAction
  const contextualTask = resolveTarget(undefined, input.context, input.tasks).task
  let intent = await input.parse(input.text, input.groups, input.now || new Date(), {
    memory: JSON.stringify({
      draft: input.draft || {},
      lastAction: input.context.lastAction,
      lastQuery: input.context.lastQuery,
      lastGroup: input.groups.find((group) => group.id === input.context.lastGroupId)?.name,
      lastParent: input.tasks.find((task) => task.id === input.context.lastParentId)?.title,
      lastTask: contextualTask
        ? {
            title: contextualTask.title,
            startTime: contextualTask.startTime,
            deadline: contextualTask.deadline,
            duration: contextualTask.duration,
          }
        : null,
      lastTasks: (input.context.lastTaskIds || [])
        .map((id) => input.tasks.find((task) => task.id === id))
        .filter(Boolean)
        .map((task) => ({ title: task!.title })),
      personalPattern: prior
        ? { pattern: prior.pattern, action: prior.preferredAction, confidence: prior.confidence }
        : null,
    }),
    history: [],
    recognitionHint: actionRecognitionPrompt(preferred),
  })
  if (intent.action === 'CHAT') return { intent }
  // Questions may contain verbs such as "dời" but are not a request to mutate.
  if (speechAct === 'QUESTION' && !explicit)
    return { intent: { action: 'CHAT', reply: 'Mình hiểu đây là câu hỏi, nên chưa thay đổi công việc nào. Bạn có muốn mình đề xuất phương án không?' }, result: { intent: 'UNKNOWN', speechAct, confidence: 0.7, source: 'default', requiresConfirmation: false, entities, decision: 'converse', payload: {} } }
  // Explicit commands beat both model defaults and learned priors. Subtask creation remains intact.
  if (
    preferred &&
    !(preferred === 'task.create' && intent.action === 'CREATE_SUBTASK') &&
    intent.action !== legacyActions[preferred]
  ) {
    const candidate = {
      action: legacyActions[preferred],
      ...(preferred === 'task.create'
        ? { data: intent.data || { title: input.text } }
        : preferred === 'task.list' || preferred === 'task.search'
          ? { filters: intent.filters || { query: intent.target?.query || input.text } }
          : {
              target: intent.target || { query: 'việc đó' },
              ...(legacyActions[preferred] === 'UPDATE_TASK'
                ? { changes: intent.changes || intent.data || {} }
                : {}),
            }),
    }
    const parsed = intentSchema.safeParse(candidate)
    if (!parsed.success)
      return { intent: { action: 'CHAT', reply: 'Bạn nói rõ phần muốn thay đổi giúp mình nhé.' } }
    intent = parsed.data
  }
  const semanticAction = actionFromIntent(intent)
  // Explicit > learned memory > semantic parser.  The parser is one candidate,
  // never the only signal used for a mutation.
  const action = preferred || semanticAction
  const target = intent.target
    ? resolveTarget(intent.target.query, input.context, input.tasks)
    : undefined
  const source = explicit
    ? 'explicit'
    : target?.task && target.contextual
      ? 'context'
      : prior
        ? 'personal_memory'
        : 'default'
  const confidence = Math.min(
    0.98,
    // A semantic parse is only a proposal (the existing confirmation UI still
    // guards mutations); explicit commands and resolved context add certainty.
    (explicit ? 0.9 : source === 'context' ? 0.8 : 0.7) +
      (target?.task ? 0.04 : 0) +
      (prior ? 0.18 * prior.confidence : 0)
  )
  const decision = confidence >= confidencePolicy.execute ? 'execute' : confidence >= confidencePolicy.confirm ? 'confirm_interpretation' : confidence >= confidencePolicy.clarify ? 'clarify' : 'converse'
  if (decision === 'clarify' && actionDefinitions[action].mutation && !target?.task && action !== 'task.create')
    return { intent: { action: 'CHAT', reply: 'Bạn muốn thao tác với công việc nào? Nói giúp mình tên công việc nhé.' }, result: { intent: action, speechAct, confidence, source, requiresConfirmation: false, entities, decision, payload: { ...(intent.changes || intent.data || intent.filters || {}) } } }
  return {
    intent,
    result: {
      action,
      intent: action,
      speechAct,
      confidence,
      source,
      requiresConfirmation: actionDefinitions[action].mutation,
      ...(intent.target
        ? {
            target: {
              reference: intent.target.query,
              ...(target?.task ? { taskId: target.task.id } : {}),
            },
          }
        : {}),
      payload: { ...(intent.changes || intent.data || intent.filters || {}) },
      entities,
      decision,
    },
  }
}

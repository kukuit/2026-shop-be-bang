/** Registry keys are the public action vocabulary. Add new actions here and an adapter. */
export const actionDefinitions = {
  'task.create': { mutation: true },
  'task.list': { mutation: false },
  'task.search': { mutation: false },
  'task.detail': { mutation: false },
  'task.update': { mutation: true },
  'task.reschedule': { mutation: true },
  'task.progress': { mutation: true },
  'task.complete': { mutation: true },
  'task.cancel': { mutation: true },
  'task.delete': { mutation: true },
  'task.note': { mutation: true },
  'task.priority': { mutation: true },
  'task.restore': { mutation: true },
} as const
export type TaskAction = keyof typeof actionDefinitions
export interface ActionRecognitionResult {
  action: TaskAction
  confidence: number
  target?: { taskId?: string; reference?: string }
  payload?: Record<string, unknown>
  source: 'explicit' | 'context' | 'personal_memory' | 'default'
  requiresConfirmation: boolean
  assistantMessage?: string
}
export interface AssistantBrowserContext {
  lastTaskId?: string
  lastTaskIds?: string[]
  lastAction?: TaskAction
  lastGroupId?: string
  lastParentId?: string | null
  lastQuery?: Record<string, unknown>
  lastMessageId?: string
  updatedAt: number
}
export interface PersonalIntentPattern {
  id: string
  pattern: string
  preferredAction: TaskAction
  scores: Partial<Record<TaskAction, number>>
  examples: string[]
  confidence: number
  source: 'user_correction' | 'confirmed_action' | 'manual'
  usageCount: number
  createdAt: string
  updatedAt: string
  lastUsedAt?: string
}
export interface PersonalEntityPattern {
  phrase: string
  entityType: 'task' | 'parent_task' | 'group'
  entityId: string
  usageCount: number
  confidence: number
  createdAt: string
  updatedAt: string
}
export interface CorrectionEvent {
  id: string
  originalText: string
  normalizedPattern: string
  predictedAction: TaskAction
  correctedAction: TaskAction
  predictedConfidence: number
  createdAt: string
}
export interface RecognitionRecord {
  result: ActionRecognitionResult
  originalText: string
  /** Points to an existing server-owned turn, never an AI supplied prediction. */
  correctionOf?: string
}

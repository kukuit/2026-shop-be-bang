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
/** These are conversational intents, not task mutations.  Keep them outside the
 * legacy task Action schema so existing task persistence stays unchanged. */
export type ConversationalIntent = 'SET_CONTEXT' | 'INFORM' | 'REFERENCE' | 'UNKNOWN'
export type RecognitionIntent = TaskAction | ConversationalIntent
export type SpeechAct = 'COMMAND' | 'INFORM' | 'QUESTION' | 'CORRECTION' | 'CONFIRMATION' | 'REJECTION' | 'CONTEXT_SETTING'
export type ExtractedEntities = {
  taskName?: string; person?: string; project?: string; group?: string; parent?: string
  date?: string; time?: string; duration?: number; priority?: 'urgent' | 'normal' | 'low'
  progress?: number; note?: string; reference?: string
}
export interface ActionRecognitionResult {
  /** Present only when a task action has passed the decision policy. */
  action?: TaskAction
  intent: RecognitionIntent
  speechAct: SpeechAct
  confidence: number
  target?: { taskId?: string; reference?: string }
  payload?: Record<string, unknown>
  source: 'explicit' | 'context' | 'personal_memory' | 'default'
  requiresConfirmation: boolean
  entities?: ExtractedEntities
  decision: 'execute' | 'confirm_interpretation' | 'clarify' | 'converse'
  assistantMessage?: string
}
export interface AssistantBrowserContext {
  lastTaskId?: string
  lastTaskIds?: string[]
  lastAction?: TaskAction
  lastGroupId?: string
  lastParentId?: string | null
  lastQuery?: Record<string, unknown>
  activeTopic?: string
  activeTaskId?: string
  activeParentId?: string | null
  activeGroupId?: string
  activePerson?: string
  activeProject?: string
  previousIntent?: RecognitionIntent
  pendingIntent?: RecognitionIntent
  pendingEntities?: ExtractedEntities
  recentMentionedTaskIds?: string[]
  recentTurns?: { text: string; intent?: RecognitionIntent; at: number }[]
  lastMessageId?: string
  updatedAt: number
}
export interface PersonalIntentPattern {
  id: string
  pattern: string
  preferredAction?: TaskAction
  intent?: RecognitionIntent
  speechAct?: SpeechAct
  entityMapping?: Partial<ExtractedEntities>
  confirmedCount?: number
  correctedCount?: number
  scores: Partial<Record<RecognitionIntent, number>>
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

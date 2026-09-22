import type { ExtractedEntities, PersonalIntentPattern, RecognitionIntent, SpeechAct, TaskAction } from '../types'
export function updateIntentPattern(
  previous: PersonalIntentPattern | undefined,
  pattern: string,
  text: string,
  intent: RecognitionIntent,
  predicted?: RecognitionIntent,
  speechAct?: SpeechAct,
  entityMapping?: Partial<ExtractedEntities>
) {
  const scores = { ...previous?.scores }
  if (predicted && predicted !== intent)
    scores[predicted] = Math.max(0, (scores[predicted] || 0) - 2)
  scores[intent] = Math.min(1000, (scores[intent] || 0) + (predicted ? 3 : 1))
  const ranked = Object.entries(scores).sort((a, b) => b[1]! - a[1]!)
  const total = Object.values(scores).reduce((sum, score) => sum + (score || 0), 0)
  const best = ranked[0]
  return {
    pattern,
    scores,
    preferredAction: best[0] && best[0] in { 'task.create': 1, 'task.list': 1, 'task.search': 1, 'task.detail': 1, 'task.update': 1, 'task.reschedule': 1, 'task.progress': 1, 'task.complete': 1, 'task.cancel': 1, 'task.delete': 1, 'task.note': 1, 'task.priority': 1, 'task.restore': 1 } ? best[0] as TaskAction : undefined,
    intent: best[0] as RecognitionIntent,
    speechAct,
    entityMapping,
    confidence: Math.min(0.95, best[1]! / (total + 2)),
    examples: Array.from(new Set([...(previous?.examples || []), text])).slice(-5),
    usageCount: (previous?.usageCount || 0) + 1,
    confirmedCount: (previous?.confirmedCount || 0) + (predicted ? 0 : 1),
    correctedCount: (previous?.correctedCount || 0) + (predicted ? 1 : 0),
    source: predicted ? ('user_correction' as const) : ('confirmed_action' as const),
  }
}

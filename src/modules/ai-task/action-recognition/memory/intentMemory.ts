import type { PersonalIntentPattern, TaskAction } from '../types'
export function updateIntentPattern(
  previous: PersonalIntentPattern | undefined,
  pattern: string,
  text: string,
  action: TaskAction,
  predicted?: TaskAction
) {
  const scores = { ...previous?.scores }
  if (predicted && predicted !== action)
    scores[predicted] = Math.max(0, (scores[predicted] || 0) - 2)
  scores[action] = Math.min(1000, (scores[action] || 0) + (predicted ? 3 : 1))
  const ranked = Object.entries(scores).sort((a, b) => b[1]! - a[1]!)
  const total = Object.values(scores).reduce((sum, score) => sum + (score || 0), 0)
  const best = ranked[0]
  return {
    pattern,
    scores,
    preferredAction: best[0] as TaskAction,
    confidence: Math.min(0.95, best[1]! / (total + 2)),
    examples: Array.from(new Set([...(previous?.examples || []), text])).slice(-5),
    usageCount: (previous?.usageCount || 0) + 1,
    source: predicted ? ('user_correction' as const) : ('confirmed_action' as const),
  }
}

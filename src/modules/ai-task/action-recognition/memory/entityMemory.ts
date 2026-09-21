import type { PersonalEntityPattern } from '../types'
import { normalizedText } from '../normalizePattern'
/** Extension point: aliases are suggestions; caller must verify owner and live entity. */
export function matchEntity(
  phrase: string,
  patterns: PersonalEntityPattern[],
  validIds: ReadonlySet<string>
) {
  const matches = patterns.filter(
    (p) =>
      normalizedText(p.phrase) === normalizedText(phrase) &&
      p.confidence >= 0.7 &&
      validIds.has(p.entityId)
  )
  return new Set(matches.map((p) => p.entityId)).size === 1 ? matches[0] : undefined
}

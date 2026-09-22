import { normalizedText } from './normalizePattern'
import type { ExtractedEntities, RecognitionIntent, SpeechAct } from './types'

export function extractEntities(text: string): ExtractedEntities {
  const raw = text.trim()
  const t = normalizedText(raw)
  const entities: ExtractedEntities = {}
  const reference = /\b(no|viec do|viec nay|cai do|cai vua tao|bai \d+)\b/.exec(t)?.[1]
  if (reference) entities.reference = reference
  const person = /\b(?:dạy|gặp|gọi|nhắc)\s+([A-ZÀ-Ỹ][A-Za-zÀ-ỹ]+(?:\s+[A-ZÀ-Ỹ][A-Za-zÀ-ỹ]+){0,2})/i.exec(raw)?.[1]
  if (person) entities.person = person
  const lesson = /\b(bai\s+\d+[a-z]?)\b/i.exec(raw)?.[1]
  if (lesson) entities.taskName = lesson
  const time = /\b(\d{1,2}(?::\d{2}|h(?:\d{2})?))\b/.exec(t)?.[1]
  if (time) entities.time = time
  if (/\bmai\b/.test(t)) entities.date = 'tomorrow'
  const duration = /\b(\d+)\s*(phut|gio)\b/.exec(t)
  if (duration) entities.duration = Number(duration[1]) * (duration[2] === 'gio' ? 60 : 1)
  const progress = /\b(\d{1,3})\s*%/.exec(t)
  if (progress) entities.progress = Number(progress[1])
  if (/\b(gap|khan)\b/.test(t)) entities.priority = 'urgent'
  if (/\b(ghi chu|note)\b/.test(t)) entities.note = raw
  return entities
}

export function detectSpeechAct(text: string): SpeechAct {
  const t = normalizedText(text)
  if (/^(khong phai|khong[,!. ]|y toi la|hieu nham)/.test(t)) return 'CORRECTION'
  if (/^(dong y|xac nhan|ok|duoc|yes|khong dong y|khong nha|huy bo)/.test(t)) return /^(khong|huy)/.test(t) ? 'REJECTION' : 'CONFIRMATION'
  if (/\?|\b(co nen|khi nao|may gio|tai sao)\b/.test(t)) return 'QUESTION'
  if (/^(hay |giup toi |cho toi |nhac toi |them |tao |xoa |huy |doi |chuyen |hoan thanh |tim |liet ke |ghi chu )/.test(t)) return 'COMMAND'
  if (/^(van de|chuyen|noi ve)\b|\b(nhe|nha)\s*[.!]?$/i.test(t)) return 'CONTEXT_SETTING'
  return 'INFORM'
}

export function conversationalIntent(text: string, speechAct: SpeechAct, entities: ExtractedEntities): RecognitionIntent | undefined {
  if (speechAct === 'QUESTION' || speechAct === 'CORRECTION' || speechAct === 'CONFIRMATION' || speechAct === 'REJECTION') return
  if (speechAct === 'CONTEXT_SETTING') return 'SET_CONTEXT'
  if (speechAct === 'INFORM' && (entities.person || entities.taskName || entities.date || entities.time)) return 'INFORM'
  if (entities.reference && text.trim().split(/\s+/).length <= 4) return 'REFERENCE'
  // Plain text without extractable context remains available to the semantic
  // parser; otherwise ordinary task names such as "Contract 5" would stop
  // working in the existing flow.
  return undefined
}

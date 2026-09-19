import type { Intent } from './model'

/** Only an unambiguous numbered-work title. Qualifiers, questions and parent
 * instructions continue through AI so their meaning is never discarded. */
export function quickCreateIntent(message: string): Intent | null {
  const match = message.normalize('NFC').trim().match(/^(?:thêm|them|tạo|tao)(?:\s+(?:giúp|giup)\s+(?:tôi|toi|mình|minh))?\s+(?:(?:công việc|cong viec|task)\s+)?((?:bài|bai|bài tập|bai tap|chương|chuong|buổi|buoi)\s+\d+[a-z]?)(?:\s+(?:nhé|nhe|nha))?[.!]?$/i)
  return match ? { action: 'CREATE_TASK', data: { title: match[1] } } : null
}

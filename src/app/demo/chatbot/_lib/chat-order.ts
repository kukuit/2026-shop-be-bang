import type { Row } from './model'

export function sortChatMessages(messages: Row[]) {
  return [...messages].sort((a, b) => {
    if (typeof a.sequence === 'number' && typeof b.sequence === 'number')
      return a.sequence - b.sequence
    // Older messages have no sequence; keep their chronological order.
    const date = String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
    if (date) return date
    if (a.role !== b.role) return a.role === 'user' ? -1 : 1
    return a.id.localeCompare(b.id)
  })
}

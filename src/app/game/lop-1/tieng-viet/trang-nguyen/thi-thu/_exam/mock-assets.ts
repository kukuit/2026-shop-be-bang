import type { ExamVisual } from './types'

export function emojiVisual(value: string, label?: string): ExamVisual {
  return { type: 'emoji', value, ...(label ? { label } : {}) }
}

export function letterVisual(value: string, rotation = 0): ExamVisual {
  return { type: 'letter-card', value, ...(rotation ? { rotation } : {}) }
}

export const APPLE_COLORS = [
  { id: 'greenApple', label: 'táo xanh', emoji: '🍏' },
  { id: 'yellowApple', label: 'táo vàng', emoji: '🍎' },
  { id: 'redApple', label: 'táo đỏ', emoji: '🍎' },
] as const

export type TeachingToastKind = 'success' | 'error'

export function studentInitials(name: string) {
  const words = name.normalize('NFC').trim().split(/[\s\-_.:,/\\'’()]+/).filter(Boolean)
  const first = Array.from(words[0] || '')[0] || ''
  const last = words.length > 1 ? Array.from(words[words.length - 1] || '')[0] || '' : ''
  return `${first}${last}`.toLocaleUpperCase('vi-VN')
}

const studentAvatarPalette = [
  { backgroundColor: '#ccfbf1', color: '#115e59' },
  { backgroundColor: '#fce7f3', color: '#9d174d' },
  { backgroundColor: '#fef3c7', color: '#92400e' },
  { backgroundColor: '#ede9fe', color: '#5b21b6' },
  { backgroundColor: '#dbeafe', color: '#1e40af' },
  { backgroundColor: '#dcfce7', color: '#166534' },
  { backgroundColor: '#ffedd5', color: '#9a3412' },
  { backgroundColor: '#e0e7ff', color: '#3730a3' },
  { backgroundColor: '#fae8ff', color: '#86198f' },
  { backgroundColor: '#ecfccb', color: '#3f6212' },
] as const

export function studentAvatarStyle(studentId: string, studentIds: readonly string[] = []) {
  const orderedIds = Array.from(new Set(studentIds)).sort()
  const order = orderedIds.indexOf(studentId)
  if (order >= 0) return studentAvatarPalette[order % studentAvatarPalette.length]

  let hash = 2166136261
  for (const character of studentId) {
    hash ^= character.codePointAt(0) || 0
    hash = Math.imul(hash, 16777619)
  }
  return studentAvatarPalette[(hash >>> 0) % studentAvatarPalette.length]
}

export function showTeachingToast(message: string, kind: TeachingToastKind = 'success') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('teaching:toast', { detail: { message, kind } }))
}

export function notifyTeachingDataChanged(message?: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('teaching:data-changed'))
  if (message) showTeachingToast(message)
}

export type GameProfile = { primaryGrade: number | null; activeGrade: number | null; grades: number[] }
export const GAME_GRADES = [1, 2, 3, 4, 5] as const
export function isValidGrade(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5
}
export function normalizeGameProfile(value: unknown): GameProfile {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const primaryGrade = isValidGrade(data.primaryGrade) ? data.primaryGrade : null
  const activeGrade = isValidGrade(data.activeGrade) ? data.activeGrade : null
  const history = Array.isArray(data.grades) ? data.grades.map(value => typeof value === 'string' && /^[1-5]$/.test(value) ? Number(value) : value).filter(isValidGrade) : []
  return { primaryGrade, activeGrade, grades: Array.from(new Set([...history, primaryGrade, activeGrade].filter(isValidGrade))).sort((a, b) => a - b) }
}
export function changeGameGrade(profile: unknown, grade: number, primary = false): GameProfile {
  if (!isValidGrade(grade)) throw new Error('Lớp không hợp lệ.')
  return normalizeGameProfile({ ...normalizeGameProfile(profile), activeGrade: grade, ...(primary ? { primaryGrade: grade } : {}) })
}
export function getGuestGameProfile(): GameProfile {
  try { return normalizeGameProfile(JSON.parse(window.localStorage.getItem('gameProfile') ?? 'null')) }
  catch { return normalizeGameProfile(null) }
}

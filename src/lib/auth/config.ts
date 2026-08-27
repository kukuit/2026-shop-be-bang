export const ACCESS_COOKIE = 'be_bang_access'
export const REFRESH_COOKIE = 'be_bang_refresh'
export const GUEST_COOKIE = 'be_bang_guest'
export const ACCESS_TTL_SECONDS = 15 * 60
export const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60

export function accessSecret() {
  const value = process.env.AUTH_ACCESS_SECRET
  if (!value || value.length < 32) throw new Error('AUTH_ACCESS_SECRET must contain at least 32 characters')
  return value
}

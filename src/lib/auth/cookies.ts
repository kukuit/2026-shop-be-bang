import { NextResponse } from 'next/server'
import { ACCESS_COOKIE, ACCESS_TTL_SECONDS, GUEST_COOKIE, REFRESH_COOKIE, REFRESH_TTL_SECONDS } from './config'

const secure = process.env.NODE_ENV === 'production'
const base = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' }

export function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  response.cookies.set(ACCESS_COOKIE, accessToken, { ...base, maxAge: ACCESS_TTL_SECONDS })
  response.cookies.set(REFRESH_COOKIE, refreshToken, { ...base, maxAge: REFRESH_TTL_SECONDS })
}
export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, '', { ...base, maxAge: 0 })
  response.cookies.set(REFRESH_COOKIE, '', { ...base, maxAge: 0 })
}
export function setGuestCookie(response: NextResponse, guestId: string) {
  response.cookies.set(GUEST_COOKIE, guestId, { ...base, maxAge: 365 * 24 * 60 * 60 })
}

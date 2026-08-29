import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { clearAuthCookies, setAuthCookies } from '@/lib/auth/cookies'
import { ACCESS_TTL_SECONDS, REFRESH_COOKIE } from '@/lib/auth/config'
import { rotateRefreshToken } from '@/lib/auth/session'
import { createAccessToken } from '@/lib/auth/tokens'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'

export const runtime = 'nodejs'
export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const raw = cookies().get(REFRESH_COOKIE)?.value
  const rotated = raw ? await rotateRefreshToken(raw) : null
  if (rotated?.status === 'stale') {
    const response = NextResponse.json({ message: 'Refresh token was already rotated.' }, { status: 409 })
    response.headers.set('Cache-Control', 'no-store')
    return response
  }
  if (!rotated || rotated.status !== 'ok') {
    const response = NextResponse.json({ message: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 })
    clearAuthCookies(response)
    return response
  }
  const response = NextResponse.json({
    user: rotated.user,
    accessTokenExpiresAt: Date.now() + ACCESS_TTL_SECONDS * 1000,
  })
  setAuthCookies(
    response,
    createAccessToken(rotated.user.id, rotated.sessionId),
    rotated.refreshToken
  )
  response.headers.set('Cache-Control', 'no-store')
  return response
}

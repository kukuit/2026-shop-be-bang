import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { clearAuthCookies, setAuthCookies } from '@/lib/auth/cookies'
import { REFRESH_COOKIE } from '@/lib/auth/config'
import { rotateRefreshToken } from '@/lib/auth/session'
import { createAccessToken } from '@/lib/auth/tokens'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'

export const runtime = 'nodejs'
export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const raw = cookies().get(REFRESH_COOKIE)?.value
  const rotated = raw ? await rotateRefreshToken(raw) : null
  if (!rotated) {
    const response = NextResponse.json({ message: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 })
    clearAuthCookies(response)
    return response
  }
  const response = NextResponse.json({ user: rotated.user })
  setAuthCookies(
    response,
    createAccessToken(rotated.user.id, rotated.sessionId),
    rotated.refreshToken
  )
  return response
}

import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { setAuthCookies } from '@/lib/auth/cookies'
import { createAuthSession } from '@/lib/auth/session'
import { createAccessToken } from '@/lib/auth/tokens'
import { authUserRef, findUserByUsername } from '@/lib/auth/users'
import { verifyPassword } from '@/lib/auth/password'
import { ACCESS_TTL_SECONDS, accessSecret } from '@/lib/auth/config'
import {
  clearLoginFailures,
  loginRateLimitStatus,
  recordLoginFailure,
} from '@/lib/auth/login-rate-limit'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'

export const runtime = 'nodejs'
const schema = z
  .object({ username: z.string().trim().min(1).max(100), password: z.string().min(1).max(200) })
  .strict()

export async function POST(request: Request) {
  try {
    const rejected = rejectCrossSiteMutation(request)
    if (rejected) return rejected
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success)
      return NextResponse.json({ message: 'Thông tin đăng nhập không hợp lệ.' }, { status: 400 })
    const limit = await loginRateLimitStatus(request, parsed.data.username)
    if (!limit.allowed)
      return NextResponse.json(
        { message: 'Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      )
    const record = await findUserByUsername(parsed.data.username)
    if (
      !record?.passwordHash ||
      record.user.status !== 'active' ||
      !(await verifyPassword(parsed.data.password, record.passwordHash))
    ) {
      await recordLoginFailure(request, parsed.data.username)
      console.warn('[Auth] Login failed')
      return NextResponse.json(
        { message: 'Tên đăng nhập hoặc mật khẩu không đúng.' },
        { status: 401 }
      )
    }
    accessSecret()
    const session = await createAuthSession(record.user.id)
    const response = NextResponse.json({
      user: record.user,
      accessTokenExpiresAt: Date.now() + ACCESS_TTL_SECONDS * 1000,
    })
    setAuthCookies(
      response,
      createAccessToken(record.user.id, session.sessionId),
      session.refreshToken
    )
    response.headers.set('Cache-Control', 'no-store')
    await authUserRef(record.user.id).update({
      lastLoginAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    await clearLoginFailures(request, parsed.data.username)
    console.info('[Auth] Login success', { userId: record.user.id })
    return response
  } catch (error) {
    console.error('[Auth] Login error', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ message: 'Không thể đăng nhập lúc này.' }, { status: 500 })
  }
}

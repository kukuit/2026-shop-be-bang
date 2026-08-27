import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/auth/cookies'
import { REFRESH_COOKIE } from '@/lib/auth/config'
import { revokeRefreshToken } from '@/lib/auth/session'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'

export const runtime = 'nodejs'
export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const raw = cookies().get(REFRESH_COOKIE)?.value
  if (raw) await revokeRefreshToken(raw)
  const response = NextResponse.json({ success: true })
  clearAuthCookies(response)
  return response
}

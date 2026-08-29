import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCurrentAuth } from '@/lib/auth/current-user'
import { REFRESH_COOKIE } from '@/lib/auth/config'

export const runtime = 'nodejs'
export async function GET() {
  const auth = await getCurrentAuth()
  const response = NextResponse.json({
    authenticated: Boolean(auth),
    refreshAvailable: Boolean(cookies().get(REFRESH_COOKIE)?.value),
    user: auth?.user ?? null,
    accessTokenExpiresAt: auth?.expiresAt ?? null,
  })
  response.headers.set('Cache-Control', 'no-store')
  return response
}

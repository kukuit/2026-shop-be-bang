import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth/current-user'
import { REFRESH_COOKIE } from '@/lib/auth/config'

export const runtime = 'nodejs'
export async function GET() {
  const user = await getCurrentUser()
  return NextResponse.json({
    authenticated: Boolean(user),
    refreshAvailable: Boolean(cookies().get(REFRESH_COOKIE)?.value),
    user,
  })
}

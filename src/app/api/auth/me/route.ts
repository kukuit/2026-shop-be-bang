import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCurrentAuth } from '@/lib/auth/current-user'
import { REFRESH_COOKIE } from '@/lib/auth/config'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { authUserRef } from '@/lib/auth/users'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { FieldValue } from 'firebase-admin/firestore'
import { changeGameGrade, isValidGrade } from '@/lib/game-profile'

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

export async function PATCH(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await getCurrentAuth()
  if (!auth) return NextResponse.json({ message: 'Vui lòng đăng nhập.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 ||
      !['primaryGrade', 'activeGrade'].includes(Object.keys(body)[0]) ||
      !isValidGrade(body.primaryGrade ?? body.activeGrade))
    return NextResponse.json({ message: 'Lớp không hợp lệ.' }, { status: 400 })
  try {
    const reference = authUserRef(auth.user.id)
    const profile = await getAdminDb().runTransaction(async transaction => {
      const snapshot = await transaction.get(reference)
      if (!snapshot.exists) throw new Error('USER_NOT_FOUND')
      const next = changeGameGrade(snapshot.data(), body.primaryGrade ?? body.activeGrade, 'primaryGrade' in body)
      transaction.update(reference, { ...next, updatedAt: FieldValue.serverTimestamp() })
      return next
    })
    return NextResponse.json({ profile }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ message: 'Chưa lưu được lớp. Bé thử lại nhé.' }, { status: 500 })
  }
}

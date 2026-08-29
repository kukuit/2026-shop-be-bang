import 'server-only'
import { cookies } from 'next/headers'
import { ACCESS_COOKIE } from './config'
import { verifyAccessToken } from './tokens'
import { findSafeUserById } from './users'
import { isSessionActive } from './session'

export async function getCurrentUser() {
  const token = cookies().get(ACCESS_COOKIE)?.value
  if (!token) return null
  const payload = verifyAccessToken(token)
  if (!payload || !(await isSessionActive(payload.sessionId, payload.sub))) return null
  const user = await findSafeUserById(payload.sub)
  return user?.status === 'active' ? user : null
}

export async function getCurrentAuth() {
  const token = cookies().get(ACCESS_COOKIE)?.value
  if (!token) return null
  const payload = verifyAccessToken(token)
  if (!payload || !(await isSessionActive(payload.sessionId, payload.sub))) return null
  const user = await findSafeUserById(payload.sub)
  return user?.status === 'active' ? { user, expiresAt: payload.exp * 1000 } : null
}

export async function requireAuth() {
  const user = await getCurrentUser()
  return user ? { ok: true as const, user } : { ok: false as const, status: 401 as const }
}
export async function requireAdmin() {
  const auth = await requireAuth()
  if (!auth.ok) return auth
  return auth.user.role === 'admin' ? auth : { ok: false as const, status: 403 as const }
}

export async function requireGameUser() {
  const auth = await requireAuth()
  if (!auth.ok) return auth
  return auth.user.activeGame ? auth : { ok: false as const, status: 403 as const }
}

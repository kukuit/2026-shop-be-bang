import 'server-only'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { REFRESH_TTL_SECONDS } from './config'
import { createRefreshToken, hashRefreshToken, parseRefreshToken, refreshHashesMatch } from './tokens'
import { findSafeUserById } from './users'

const sessions = () => getAdminDb().collection('shopbebangcom').doc('auth_sessions').collection('sessions')
const ROTATION_GRACE_MS = 15_000

export async function createAuthSession(userId: string) {
  const ref = sessions().doc()
  const token = createRefreshToken(ref.id)
  const now = Timestamp.now()
  await ref.create({ userId, refreshTokenHash: token.hash, createdAt: now, lastUsedAt: now, expiresAt: Timestamp.fromMillis(Date.now() + REFRESH_TTL_SECONDS * 1000), revokedAt: null })
  return { sessionId: ref.id, refreshToken: token.raw }
}

export async function rotateRefreshToken(raw: string) {
  const parsed = parseRefreshToken(raw)
  if (!parsed) return { status: 'invalid' as const }
  const db = getAdminDb(); const ref = sessions().doc(parsed.sessionId)
  const rotated = createRefreshToken(parsed.sessionId)
  const result = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists) return { status: 'invalid' as const }
    const data = snapshot.data() ?? {}
    const expired = !(data.expiresAt instanceof Timestamp) || data.expiresAt.toMillis() <= Date.now()
    if (data.revokedAt || expired || typeof data.refreshTokenHash !== 'string') return { status: 'invalid' as const }
    const incomingHash = hashRefreshToken(raw)
    // Một request khác/tab khác có thể vừa rotate token này. Không revoke hoặc clear
    // cookie ở đây vì response thắng cuộc đang cập nhật cookie mới cho cả origin.
    if (!refreshHashesMatch(data.refreshTokenHash, incomingHash)) {
      const withinGrace = data.previousRefreshTokenValidUntil instanceof Timestamp
        && data.previousRefreshTokenValidUntil.toMillis() > Date.now()
      const previousMatches = typeof data.previousRefreshTokenHash === 'string'
        && refreshHashesMatch(data.previousRefreshTokenHash, incomingHash)
      return { status: withinGrace && previousMatches ? 'stale' as const : 'invalid' as const }
    }
    transaction.update(ref, {
      previousRefreshTokenHash: data.refreshTokenHash,
      previousRefreshTokenValidUntil: Timestamp.fromMillis(Date.now() + ROTATION_GRACE_MS),
      refreshTokenHash: rotated.hash,
      lastUsedAt: FieldValue.serverTimestamp(),
    })
    return typeof data.userId === 'string'
      ? { status: 'ok' as const, userId: data.userId }
      : { status: 'invalid' as const }
  })
  if (result.status !== 'ok') return result
  const user = await findSafeUserById(result.userId)
  if (!user || user.status !== 'active') { await revokeSession(parsed.sessionId); return null }
  return { status: 'ok' as const, user, sessionId: parsed.sessionId, refreshToken: rotated.raw }
}

export async function revokeRefreshToken(raw: string) {
  const parsed = parseRefreshToken(raw)
  if (!parsed) return
  const ref = sessions().doc(parsed.sessionId)
  await getAdminDb().runTransaction(async transaction => {
    const snapshot = await transaction.get(ref)
    const storedHash = snapshot.data()?.refreshTokenHash
    if (typeof storedHash === 'string' && refreshHashesMatch(storedHash, hashRefreshToken(raw))) {
      transaction.update(ref, { revokedAt: FieldValue.serverTimestamp() })
    }
  })
}
export async function revokeSession(sessionId: string) {
  await sessions().doc(sessionId).set({ revokedAt: FieldValue.serverTimestamp() }, { merge: true })
}

export async function isSessionActive(sessionId: string, userId: string) {
  const snapshot = await sessions().doc(sessionId).get(); if (!snapshot.exists) return false
  const data = snapshot.data() ?? {}
  return data.userId === userId && !data.revokedAt && data.expiresAt instanceof Timestamp && data.expiresAt.toMillis() > Date.now()
}

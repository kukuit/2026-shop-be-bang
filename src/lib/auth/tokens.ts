import 'server-only'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { ACCESS_TTL_SECONDS, accessSecret } from './config'
import type { AccessTokenPayload, RefreshTokenPayload } from './types'

export function createAccessToken(userId: string, sessionId: string) {
  return jwt.sign({ sessionId, type: 'access' }, accessSecret(), { subject: userId, expiresIn: ACCESS_TTL_SECONDS, algorithm: 'HS256' })
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const payload = jwt.verify(token, accessSecret(), { algorithms: ['HS256'] })
    if (typeof payload === 'string' || payload.type !== 'access' || typeof payload.sub !== 'string' || typeof payload.sessionId !== 'string' || typeof payload.exp !== 'number') return null
    return { sub: payload.sub, sessionId: payload.sessionId, type: 'access', exp: payload.exp }
  } catch { return null }
}

export function createRefreshToken(sessionId: string): RefreshTokenPayload & { raw: string; hash: string } {
  const secret = randomBytes(48).toString('base64url')
  const raw = `${sessionId}.${secret}`
  return { sessionId, secret, raw, hash: hashRefreshToken(raw) }
}

export function parseRefreshToken(raw: string): RefreshTokenPayload | null {
  const separator = raw.indexOf('.')
  if (separator < 1) return null
  const sessionId = raw.slice(0, separator)
  const secret = raw.slice(separator + 1)
  return sessionId && secret.length >= 32 ? { sessionId, secret } : null
}

export const hashRefreshToken = (raw: string) => createHash('sha256').update(raw).digest('hex')
export function refreshHashesMatch(left: string, right: string) {
  const a = Buffer.from(left, 'hex'); const b = Buffer.from(right, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

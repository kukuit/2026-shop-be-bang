import 'server-only'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { accessSecret } from '@/lib/auth/config'

const PRODUCT_ID_PATTERN = /^[a-zA-Z0-9_-]{1,180}$/
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

function signDraft(userId: string, productId: string, expiresAt: number) {
  return createHmac('sha256', accessSecret())
    .update(`${userId}:${productId}:${expiresAt}`)
    .digest('base64url')
}

export function createProductDraft(userId: string) {
  const id = randomUUID()
  const expiresAt = Date.now() + TOKEN_TTL_MS
  return { id, token: `${expiresAt}.${signDraft(userId, id, expiresAt)}`, expiresAt }
}

export function isValidProductDraftToken(productId: string, userId: string, token: unknown) {
  if (!PRODUCT_ID_PATTERN.test(productId) || typeof token !== 'string') return false
  const separator = token.indexOf('.')
  if (separator < 1) return false
  const expiresAt = Number(token.slice(0, separator))
  const signature = token.slice(separator + 1)
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() || signature.length < 40) return false
  try {
    const expected = Buffer.from(signDraft(userId, productId, expiresAt))
    const received = Buffer.from(signature)
    return expected.length === received.length && timingSafeEqual(expected, received)
  } catch {
    return false
  }
}

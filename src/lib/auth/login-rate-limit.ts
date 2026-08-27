import 'server-only'
import { createHash } from 'node:crypto'
import { Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { normalizeUsername } from './users'

const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 5
const limits = () =>
  getAdminDb().collection('shopbebangcom').doc('auth_rate_limits').collection('login')

function keyFor(request: Request, username: string) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  return createHash('sha256')
    .update(`${ip}\0${normalizeUsername(username)}`)
    .digest('hex')
}

export async function loginRateLimitStatus(request: Request, username: string) {
  const snapshot = await limits().doc(keyFor(request, username)).get()
  const data = snapshot.data()
  const started = data?.windowStartedAt
  const active = started instanceof Timestamp && started.toMillis() + WINDOW_MS > Date.now()
  return {
    allowed: !active || Number(data?.failures ?? 0) < MAX_FAILURES,
    retryAfter: active ? Math.ceil((started.toMillis() + WINDOW_MS - Date.now()) / 1000) : 0,
  }
}

export async function recordLoginFailure(request: Request, username: string) {
  const ref = limits().doc(keyFor(request, username))
  await getAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    const data = snapshot.data()
    const started = data?.windowStartedAt
    const expired = !(started instanceof Timestamp) || started.toMillis() + WINDOW_MS <= Date.now()
    transaction.set(ref, {
      failures: expired ? 1 : Number(data?.failures ?? 0) + 1,
      windowStartedAt: expired ? Timestamp.now() : started,
      expiresAt: Timestamp.fromMillis(Date.now() + WINDOW_MS),
    })
  })
}

export async function clearLoginFailures(request: Request, username: string) {
  await limits().doc(keyFor(request, username)).delete()
}

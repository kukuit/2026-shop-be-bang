'use client'

const REFRESH_LOCK = 'be-bang-auth-refresh'
const REFRESH_STATE_KEY = 'be_bang_refresh_state'
const RECENT_REFRESH_MS = 10_000

export type RefreshResult = { ok: boolean; accessTokenExpiresAt: number | null }

let refreshRequest: Promise<RefreshResult> | null = null

function readSharedState(): { refreshedAt: number; expiresAt: number } | null {
  try {
    const value = JSON.parse(localStorage.getItem(REFRESH_STATE_KEY) ?? 'null') as unknown
    if (!value || typeof value !== 'object') return null
    const state = value as { refreshedAt?: unknown; expiresAt?: unknown }
    return typeof state.refreshedAt === 'number' && typeof state.expiresAt === 'number'
      ? { refreshedAt: state.refreshedAt, expiresAt: state.expiresAt }
      : null
  } catch {
    return null
  }
}

function rememberExpiry(expiresAt: number) {
  try { localStorage.setItem(REFRESH_STATE_KEY, JSON.stringify({ refreshedAt: Date.now(), expiresAt })) } catch {}
}

async function performRefresh(): Promise<RefreshResult> {
  const shared = readSharedState()
  if (shared && Date.now() - shared.refreshedAt < RECENT_REFRESH_MS && shared.expiresAt > Date.now())
    return { ok: true, accessTokenExpiresAt: shared.expiresAt }

  const response = await fetch('/api/auth/refresh', { method: 'POST', cache: 'no-store' })
  if (response.status === 409) {
    // Một tab khác vừa rotate. Cookie mới được chia sẻ theo origin; /me xác nhận sau race.
    const me = await fetch('/api/auth/me', { cache: 'no-store' })
    const body = await me.json() as { authenticated?: boolean; accessTokenExpiresAt?: number | null }
    if (body.authenticated && body.accessTokenExpiresAt) rememberExpiry(body.accessTokenExpiresAt)
    return { ok: Boolean(body.authenticated), accessTokenExpiresAt: body.accessTokenExpiresAt ?? null }
  }
  if (!response.ok) return { ok: false, accessTokenExpiresAt: null }

  const body = await response.json() as { accessTokenExpiresAt?: number }
  const expiresAt = body.accessTokenExpiresAt ?? null
  if (expiresAt) rememberExpiry(expiresAt)
  return { ok: true, accessTokenExpiresAt: expiresAt }
}

export function refreshAccessToken() {
  if (refreshRequest) return refreshRequest
  refreshRequest = (async () => {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(REFRESH_LOCK, performRefresh)
    }
    return performRefresh()
  })()
    .catch(() => ({ ok: false, accessTokenExpiresAt: null }))
    .finally(() => { refreshRequest = null })
  return refreshRequest
}

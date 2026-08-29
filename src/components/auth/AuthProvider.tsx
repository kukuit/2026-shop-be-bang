'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { SafeAuthUser } from '@/lib/auth/types'
import { refreshAccessToken } from '@/lib/auth/client-refresh'

type AuthContextValue = { user: SafeAuthUser | null; authenticated: boolean; loading: boolean; login(username: string, password: string): Promise<void>; logout(): Promise<void>; refreshUser(): Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null)
type AuthState = { user: SafeAuthUser | null; accessTokenExpiresAt: number | null }
let authRequest: Promise<AuthState> | null = null

async function readJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.toLowerCase().includes('application/json')) {
    const responseText = await response.text()

    if (responseText.includes('Deployment has failed')) {
      throw new Error('Bản triển khai Vercel đã bị lỗi. Vui lòng kiểm tra Build Logs và redeploy.')
    }

    if (response.redirected && new URL(response.url).hostname.endsWith('vercel.com')) {
      throw new Error(
        'Ứng dụng đang bị Vercel Deployment Protection chặn. Vui lòng dùng domain production công khai hoặc tắt Deployment Protection.'
      )
    }

    throw new Error(`Máy chủ trả về dữ liệu không hợp lệ (HTTP ${response.status}).`)
  }

  return response.json() as Promise<T>
}

function loadAuthenticatedUser() {
  if (authRequest) return authRequest
  authRequest = (async () => {
    let response = await fetch('/api/auth/me', { cache: 'no-store' })
    let body = await readJson<{
      authenticated?: boolean
      refreshAvailable?: boolean
      user?: SafeAuthUser | null
      accessTokenExpiresAt?: number | null
    }>(response)
    if (!body.authenticated && body.refreshAvailable) {
      const refreshed = await refreshAccessToken()
      if (refreshed.ok) {
        response = await fetch('/api/auth/me', { cache: 'no-store' })
        body = await readJson(response)
      }
    }
    return body.authenticated
      ? { user: body.user ?? null, accessTokenExpiresAt: body.accessTokenExpiresAt ?? null }
      : { user: null, accessTokenExpiresAt: null }
  })().finally(() => { authRequest = null })
  return authRequest
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeAuthUser | null>(null)
  const [accessTokenExpiresAt, setAccessTokenExpiresAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshUser = useCallback(async () => {
    try {
      const state = await loadAuthenticatedUser()
      setUser(state.user)
      setAccessTokenExpiresAt(state.accessTokenExpiresAt)
    } catch { setUser(null); setAccessTokenExpiresAt(null) } finally { setLoading(false) }
  }, [])
  useEffect(() => { void refreshUser() }, [refreshUser])
  useEffect(() => {
    if (!user || !accessTokenExpiresAt) return

    let stopped = false
    let timer: number | undefined
    const refreshSilently = async () => {
      if (timer !== undefined) window.clearTimeout(timer)
      timer = undefined
      const result = await refreshAccessToken()
      if (result.ok && result.accessTokenExpiresAt)
        setAccessTokenExpiresAt(result.accessTokenExpiresAt)
      else if (!stopped)
        timer = window.setTimeout(() => { void refreshSilently() }, 30_000)
    }
    const delay = Math.max(1_000, accessTokenExpiresAt - Date.now() - 90_000)
    timer = window.setTimeout(() => { void refreshSilently() }, delay)
    const resume = () => {
      if (document.visibilityState === 'visible' && accessTokenExpiresAt - Date.now() <= 120_000)
        void refreshSilently()
    }
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('online', resume)
    return () => {
      stopped = true
      if (timer !== undefined) window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', resume)
      window.removeEventListener('online', resume)
    }
  }, [user, accessTokenExpiresAt])
  const login = useCallback(async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
    const body = await readJson<{ user?: SafeAuthUser; accessTokenExpiresAt?: number; message?: string }>(response)
    if (!response.ok || !body.user) throw new Error(body.message ?? 'Đăng nhập thất bại.')
    setUser(body.user)
    setAccessTokenExpiresAt(body.accessTokenExpiresAt ?? null)
  }, [])
  const logout = useCallback(async () => { try { await fetch('/api/auth/logout', { method: 'POST' }) } finally { setUser(null); setAccessTokenExpiresAt(null) } }, [])
  const value = useMemo(() => ({ user, authenticated: Boolean(user), loading, login, logout, refreshUser }), [user, loading, login, logout, refreshUser])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value }

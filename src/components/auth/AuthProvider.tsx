'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { SafeAuthUser } from '@/lib/auth/types'

type AuthContextValue = { user: SafeAuthUser | null; authenticated: boolean; loading: boolean; login(username: string, password: string): Promise<void>; logout(): Promise<void>; refreshUser(): Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null)
let authRequest: Promise<SafeAuthUser | null> | null = null

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
    }>(response)
    if (!body.authenticated && body.refreshAvailable) {
      const refreshed = await fetch('/api/auth/refresh', { method: 'POST' })
      if (refreshed.ok) {
        response = await fetch('/api/auth/me', { cache: 'no-store' })
        body = await readJson(response)
      }
    }
    return body.authenticated ? body.user ?? null : null
  })().finally(() => { authRequest = null })
  return authRequest
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeAuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshUser = useCallback(async () => {
    try {
      setUser(await loadAuthenticatedUser())
    } catch { setUser(null) } finally { setLoading(false) }
  }, [])
  useEffect(() => { void refreshUser() }, [refreshUser])
  const login = useCallback(async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
    const body = await readJson<{ user?: SafeAuthUser; message?: string }>(response)
    if (!response.ok || !body.user) throw new Error(body.message ?? 'Đăng nhập thất bại.')
    setUser(body.user)
  }, [])
  const logout = useCallback(async () => { try { await fetch('/api/auth/logout', { method: 'POST' }) } finally { setUser(null) } }, [])
  const value = useMemo(() => ({ user, authenticated: Boolean(user), loading, login, logout, refreshUser }), [user, loading, login, logout, refreshUser])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value }

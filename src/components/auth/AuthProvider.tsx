'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { SafeAuthUser } from '@/lib/auth/types'

type AuthContextValue = { user: SafeAuthUser | null; authenticated: boolean; loading: boolean; login(username: string, password: string): Promise<void>; logout(): Promise<void>; refreshUser(): Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeAuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshUser = useCallback(async () => {
    try {
      let response = await fetch('/api/auth/me', { cache: 'no-store' })
      let body = await response.json() as { authenticated?: boolean; user?: SafeAuthUser | null }
      if (!body.authenticated) {
        const refreshed = await fetch('/api/auth/refresh', { method: 'POST' })
        if (refreshed.ok) { response = await fetch('/api/auth/me', { cache: 'no-store' }); body = await response.json() }
      }
      setUser(body.authenticated ? body.user ?? null : null)
    } catch { setUser(null) } finally { setLoading(false) }
  }, [])
  useEffect(() => { void refreshUser() }, [refreshUser])
  const login = useCallback(async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
    const body = await response.json() as { user?: SafeAuthUser; message?: string }
    if (!response.ok || !body.user) throw new Error(body.message ?? 'Đăng nhập thất bại.')
    setUser(body.user)
  }, [])
  const logout = useCallback(async () => { try { await fetch('/api/auth/logout', { method: 'POST' }) } finally { setUser(null) } }, [])
  const value = useMemo(() => ({ user, authenticated: Boolean(user), loading, login, logout, refreshUser }), [user, loading, login, logout, refreshUser])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value }

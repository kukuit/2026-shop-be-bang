'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { fetchWithAuthRetry } from '@/lib/auth/client-fetch'
import { changeGameGrade, getGuestGameProfile, normalizeGameProfile, type GameProfile } from '@/lib/game-profile'

type Value = GameProfile & { isLoading: boolean; saving: boolean; error: string | null; retry: () => void; setActiveGrade: (grade: number) => Promise<void>; setPrimaryGrade: (grade: number) => Promise<void> }
const Context = createContext<Value | null>(null)
export function GameProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const owner = user?.id ?? 'guest'
  const identity = useRef(owner)
  identity.current = owner
  const [state, setState] = useState<{ owner: string; profile: GameProfile } | null>(null)
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const retry = useCallback(() => setRevision(value => value + 1), [])
  useEffect(() => {
    if (loading) return
    let cancelled = false
    setState(null)
    setError(null)
    if (!user) {
      setState({ owner, profile: getGuestGameProfile() })
      return
    }
    // Read the database again on mount: AuthProvider may hold a profile from before a previous edit.
    void (async () => {
      try {
        const response = await fetchWithAuthRetry('/api/auth/me', { cache: 'no-store' })
        if (!response.ok) throw new Error('PROFILE_LOAD_FAILED')
        const body = await response.json()
        if (!body.authenticated || body.user?.id !== owner) throw new Error('IDENTITY_CHANGED')
        if (!cancelled) setState({ owner, profile: normalizeGameProfile(body.user) })
      } catch {
        if (!cancelled) setError('Chưa tải được hồ sơ. Bé thử lại nhé.')
      }
    })()
    return () => { cancelled = true }
  }, [loading, owner, user, revision])
  useEffect(() => {
    if (user || loading) return
    const sync = (event: StorageEvent) => {
      if (event.key === 'gameProfile' || event.key === null) setState({ owner: 'guest', profile: getGuestGameProfile() })
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [user, loading])
  const isLoading = loading || !state || state.owner !== owner
  const profile = !isLoading && state ? state.profile : normalizeGameProfile(null)
  const save = useCallback(async (grade: number, primary: boolean) => {
    if (loading || !state || state.owner !== owner || busy.current) throw new Error('PROFILE_BUSY')
    busy.current = true
    setSaving(true)
    setError(null)
    try {
      let next = changeGameGrade(state.profile, grade, primary)
      if (user) {
        const response = await fetchWithAuthRetry('/api/auth/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(primary ? { primaryGrade: grade } : { activeGrade: grade }) })
        if (!response.ok) throw new Error('SAVE_FAILED')
        next = normalizeGameProfile((await response.json()).profile)
      } else {
        next = { ...next, primaryGrade: null }
        window.localStorage.setItem('gameProfile', JSON.stringify({ activeGrade: next.activeGrade, grades: next.grades }))
      }
      if (identity.current !== owner) throw new Error('IDENTITY_CHANGED')
      setState({ owner, profile: next })
    } catch (cause) {
      if (identity.current === owner) setError('Chưa lưu được lớp. Bé thử lại nhé.')
      throw cause
    } finally { busy.current = false; setSaving(false) }
  }, [loading, state, owner, user])
  const setActiveGrade = useCallback((grade: number) => save(grade, false), [save])
  const setPrimaryGrade = useCallback((grade: number) => save(grade, true), [save])
  return <Context.Provider value={{ ...profile, isLoading, saving, error, retry, setActiveGrade, setPrimaryGrade }}>{children}</Context.Provider>
}
export function useGameProfile() {
  const value = useContext(Context)
  if (!value) throw new Error('GameProfileProvider is required')
  return value
}

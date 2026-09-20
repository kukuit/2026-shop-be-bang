'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { fetchWithAuthRetry } from '@/lib/auth/client-fetch'
import { useAuth } from '@/components/auth/AuthProvider'
import type { Group } from '../_lib/model'
import { useTaskMemory } from './useTaskMemory'
import TaskWorkflow from './TaskWorkflow'

export async function api<T = unknown>(body?: unknown, params?: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const response = await fetchWithAuthRetry(`/demo/ai-task/api${params ? `?${new URLSearchParams(params)}` : ''}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal } : { cache: 'no-store', signal })
  const data = await response.json()
  if (!response.ok) throw new Error(response.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : data.error || 'Không thể xử lý yêu cầu.')
  return data
}
type Context = ReturnType<typeof useTaskMemory> & { groups: Group[]; revision: number; busy: boolean; ready: boolean; notify(message: string): void; run<T>(fn: () => Promise<T>): Promise<T>; refresh(): Promise<void> }
const TaskContext = createContext<Context | null>(null)
export function useTasks() { const value = useContext(TaskContext); if (!value) throw new Error('Missing AI Task provider'); return value }
export default function Provider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const memory = useTaskMemory(user?.id)
  const [groups, setGroups] = useState<Group[]>([])
  const [revision, setRevision] = useState(0)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const lock = useRef(false)
  const refresh = useCallback(async () => {
    const data = await api<{ groups: Group[] }>(undefined, { resource: 'groups' })
    setGroups(data.groups); setRevision(v => v + 1)
  }, [])
  const initialize = useCallback(async () => {
    setError('')
    try { const data = await api<{ result: { groups: Group[] } }>({ operation: 'initialize' }); setGroups(data.result.groups); setReady(true) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được dữ liệu.') }
  }, [])
  useEffect(() => { void initialize() }, [initialize, user?.id])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 7000); return () => clearTimeout(timer) }, [toast])
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    if (lock.current) throw new Error('Vui lòng chờ thao tác hiện tại.')
    lock.current = true; setBusy(true)
    try { return await fn() } finally { lock.current = false; setBusy(false) }
  }, [])
  return <TaskContext.Provider value={{ ...memory, groups, revision, ready, busy, run, refresh, notify: setToast }}>
    {error ? <div className="demo-alert" role="alert">{error} <button onClick={initialize}>Thử lại</button></div> : !ready ? <p role="status">Đang mở không gian công việc…</p> : <TaskWorkflow>{children}</TaskWorkflow>}
    {toast && <div className="demo-toast" role="status">{toast}</div>}
  </TaskContext.Provider>
}

'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { deleteLocalWorkspace, listLocalWorkspaces, markLocalWorkspaceOpened, renameLocalWorkspace, createLocalWorkspace, type LocalWorkspace } from '../_services/offline/workspaces'
import { getActiveTeachingWorkspace, persistActiveTeachingWorkspace, setActiveTeachingWorkspace, type ActiveTeachingWorkspace, readPersistedWorkspaceSelection } from '../_services/offline/workspace-runtime'

type WorkspaceContextValue = {
  ready: boolean
  switching: boolean
  error: string
  workspaces: LocalWorkspace[]
  active: ActiveTeachingWorkspace | null
  createWorkspace(name: string): Promise<LocalWorkspace>
  renameWorkspace(id: string, name: string): Promise<void>
  deleteWorkspace(id: string): Promise<void>
  activateLocal(id: string): Promise<void>
  activateCloud(): void
  refreshWorkspaces(): Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function useTeachingWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('Thiếu WorkspaceProvider cho quản lý dạy thêm.')
  return context
}

export default function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useAuth()
  const [ready, setReady] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState('')
  const [workspaces, setWorkspaces] = useState<LocalWorkspace[]>([])
  const [active, setActive] = useState<ActiveTeachingWorkspace | null>(null)

  const refreshWorkspaces = useCallback(async () => {
    try { setWorkspaces(await listLocalWorkspaces()); setError('') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không đọc được dữ liệu offline.') }
  }, [])

  useEffect(() => {
    let cancelled = false
    const initialize = async () => {
      try {
        const [items] = await Promise.all([listLocalWorkspaces()])
        if (cancelled) return
        setWorkspaces(items)
        const selection = readPersistedWorkspaceSelection()
        if (selection.mode === 'LOCAL' && selection.id) {
          const workspace = items.find(item => item.id === selection.id && item.mode === 'LOCAL')
          if (workspace) {
            const opened = { id: workspace.id, name: workspace.name, mode: 'LOCAL' as const }
            setActive(opened); setActiveTeachingWorkspace(opened)
            void markLocalWorkspaceOpened(workspace.id)
          } else {
            persistActiveTeachingWorkspace(null); setActiveTeachingWorkspace(null)
          }
        } else if (selection.mode === 'CLOUD' && user) {
          const cloud = { id: user.id, name: user.displayName || 'Cloud workspace', mode: 'CLOUD' as const }
          setActive(cloud); setActiveTeachingWorkspace(cloud)
        } else {
          setActive(null); setActiveTeachingWorkspace(null)
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Không khởi tạo được dữ liệu offline.')
      } finally { if (!cancelled) setReady(true) }
    }
    void initialize()
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    const selection = readPersistedWorkspaceSelection()
    if (!ready || selection.mode !== 'CLOUD' || !user) return
    const cloud = { id: user.id, name: user.displayName || 'Cloud workspace', mode: 'CLOUD' as const }
    setActive(cloud); setActiveTeachingWorkspace(cloud)
  }, [ready, user])

  const createWorkspace = useCallback(async (name: string) => {
    const created = await createLocalWorkspace(name)
    setWorkspaces(current => [created, ...current])
    setError('')
    return created
  }, [])

  const renameWorkspace = useCallback(async (id: string, name: string) => {
    const updated = await renameLocalWorkspace(id, name)
    setWorkspaces(current => current.map(item => item.id === id ? updated : item))
    setActive(current => current?.mode === 'LOCAL' && current.id === id ? { ...current, name: updated.name } : current)
    if (getActiveTeachingWorkspace()?.id === id) setActiveTeachingWorkspace({ id, name: updated.name, mode: 'LOCAL' })
  }, [])

  const deleteWorkspace = useCallback(async (id: string) => {
    const deletingActive = active?.mode === 'LOCAL' && active.id === id
    if (deletingActive) {
      setSwitching(true); setActive(null); setActiveTeachingWorkspace(null); persistActiveTeachingWorkspace(null)
    }
    try {
      await deleteLocalWorkspace(id)
      setWorkspaces(current => current.filter(item => item.id !== id))
    } finally { if (deletingActive) setSwitching(false) }
  }, [active])

  const activateLocal = useCallback(async (id: string) => {
    const workspace = await (async () => {
      const current = workspaces.find(item => item.id === id) || null
      if (current) return current
      await refreshWorkspaces()
      return (await listLocalWorkspaces()).find(item => item.id === id) || null
    })()
    if (!workspace || workspace.mode !== 'LOCAL') throw new Error('Không tìm thấy workspace offline này.')
    setSwitching(true); setActive(null); setActiveTeachingWorkspace(null)
    const selected = { id: workspace.id, name: workspace.name, mode: 'LOCAL' as const }
    persistActiveTeachingWorkspace(selected)
    try { await markLocalWorkspaceOpened(id) } catch { /* Opening the workspace does not depend on the optional last-opened timestamp. */ }
    setActive(selected); setActiveTeachingWorkspace(selected); setSwitching(false); setError('')
  }, [workspaces, refreshWorkspaces])

  const activateCloud = useCallback(() => {
    persistActiveTeachingWorkspace({ id: user?.id || 'cloud-pending', name: user?.displayName || 'Cloud workspace', mode: 'CLOUD' })
    setActive(null); setActiveTeachingWorkspace(null)
    if (user) {
      const cloud = { id: user.id, name: user.displayName || 'Cloud workspace', mode: 'CLOUD' as const }
      setActive(cloud); setActiveTeachingWorkspace(cloud)
    } else {
      void refreshUser()
    }
  }, [user, refreshUser])

  const value = useMemo(() => ({ ready, switching, error, workspaces, active, createWorkspace, renameWorkspace, deleteWorkspace, activateLocal, activateCloud, refreshWorkspaces }), [ready, switching, error, workspaces, active, createWorkspace, renameWorkspace, deleteWorkspace, activateLocal, activateCloud, refreshWorkspaces])
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}


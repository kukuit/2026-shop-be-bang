export type ActiveTeachingWorkspace = {
  id: string
  name: string
  mode: 'LOCAL' | 'CLOUD'
}

const ACTIVE_ID_KEY = 'ai-task.active-workspace-id'
const ACTIVE_MODE_KEY = 'ai-task.active-workspace-mode'
let activeWorkspace: ActiveTeachingWorkspace | null = null

export function getActiveTeachingWorkspace() { return activeWorkspace }

export function setActiveTeachingWorkspace(workspace: ActiveTeachingWorkspace | null) {
  activeWorkspace = workspace
}

export function persistActiveTeachingWorkspace(workspace: ActiveTeachingWorkspace | null) {
  if (typeof window === 'undefined') return
  if (!workspace) {
    window.localStorage.removeItem(ACTIVE_ID_KEY)
    window.localStorage.removeItem(ACTIVE_MODE_KEY)
    return
  }
  window.localStorage.setItem(ACTIVE_MODE_KEY, workspace.mode)
  if (workspace.mode === 'LOCAL') window.localStorage.setItem(ACTIVE_ID_KEY, workspace.id)
  else window.localStorage.removeItem(ACTIVE_ID_KEY)
}

export function readPersistedWorkspaceSelection() {
  if (typeof window === 'undefined') return { id: null, mode: null }
  const mode = window.localStorage.getItem(ACTIVE_MODE_KEY)
  return {
    id: mode === 'LOCAL' ? window.localStorage.getItem(ACTIVE_ID_KEY) : null,
    mode: mode === 'LOCAL' || mode === 'CLOUD' ? mode : null,
  } as { id: string | null; mode: 'LOCAL' | 'CLOUD' | null }
}


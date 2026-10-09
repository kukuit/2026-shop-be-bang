import { LOCAL_STORES, openTeachingDatabase, requestResult, transactionDone, workspaceKeyRange } from './database'
import { DEFAULT_BILLING_CYCLE_CUTOFF_DAY, DEFAULT_HOURLY_RATE, DEFAULT_SESSION_RATE, DEFAULT_PRICING_MODE } from '../../_lib/teaching-model'

export type LocalWorkspace = {
  id: string
  name: string
  mode: 'LOCAL'
  ownerId: null
  cloudWorkspaceId: null
  createdAt: number
  updatedAt: number
  lastOpenedAt: number | null
  lastSyncedAt: null
}

export type WorkspaceCounts = { students: number; lessons: number }

function createId() {
  const randomId = globalThis.crypto?.randomUUID?.()
  return `local_${randomId || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`
}

export async function listLocalWorkspaces(): Promise<LocalWorkspace[]> {
  const db = await openTeachingDatabase()
  const transaction = db.transaction('workspaces', 'readonly')
  const done = transactionDone(transaction)
  const items = await requestResult(transaction.objectStore('workspaces').getAll()) as LocalWorkspace[]
  await done
  return items.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getLocalWorkspace(id: string): Promise<LocalWorkspace | null> {
  const db = await openTeachingDatabase()
  const transaction = db.transaction('workspaces', 'readonly')
  const done = transactionDone(transaction)
  const item = await requestResult(transaction.objectStore('workspaces').get(id)) as LocalWorkspace | undefined
  await done
  return item || null
}

export async function createLocalWorkspace(name: string): Promise<LocalWorkspace> {
  const normalizedName = name.trim()
  if (!normalizedName) throw new Error('Hãy nhập tên cho dữ liệu offline.')
  if (normalizedName.length > 100) throw new Error('Tên dữ liệu offline tối đa 100 ký tự.')
  const now = Date.now()
  const workspace: LocalWorkspace = {
    id: createId(), name: normalizedName, mode: 'LOCAL', ownerId: null, cloudWorkspaceId: null,
    createdAt: now, updatedAt: now, lastOpenedAt: null, lastSyncedAt: null,
  }
  const db = await openTeachingDatabase()
  const transaction = db.transaction(['workspaces', 'settings', 'syncOperations'], 'readwrite')
  const done = transactionDone(transaction)
  transaction.objectStore('workspaces').add(workspace)
  transaction.objectStore('settings').add({ workspaceId: workspace.id, id: 'default', userId: workspace.id, defaultPricingMode: DEFAULT_PRICING_MODE, defaultSessionRate: DEFAULT_SESSION_RATE, defaultHourlyRate: DEFAULT_HOURLY_RATE, billingCycleCutoffDay: DEFAULT_BILLING_CYCLE_CUTOFF_DAY, createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() })
  transaction.objectStore('syncOperations').add({ id: createId(), workspaceId: workspace.id, entityType: 'settings', entityId: 'default', operation: 'CREATE', createdAt: now, status: 'PENDING', attemptCount: 0 })
  await done
  return workspace
}

export async function renameLocalWorkspace(id: string, name: string): Promise<LocalWorkspace> {
  const normalizedName = name.trim()
  if (!normalizedName) throw new Error('Hãy nhập tên dữ liệu offline.')
  if (normalizedName.length > 100) throw new Error('Tên dữ liệu offline tối đa 100 ký tự.')
  const db = await openTeachingDatabase()
  const transaction = db.transaction('workspaces', 'readwrite')
  const done = transactionDone(transaction)
  const store = transaction.objectStore('workspaces')
  const current = await requestResult(store.get(id)) as LocalWorkspace | undefined
  if (!current || current.mode !== 'LOCAL') { transaction.abort(); throw new Error('Không tìm thấy dữ liệu offline này.') }
  const updated = { ...current, name: normalizedName, updatedAt: Date.now() }
  store.put(updated)
  await done
  return updated
}

export async function deleteLocalWorkspace(id: string): Promise<void> {
  const db = await openTeachingDatabase()
  const transaction = db.transaction([...LOCAL_STORES], 'readwrite')
  const done = transactionDone(transaction)
  const workspaces = transaction.objectStore('workspaces')
  const workspace = await requestResult(workspaces.get(id)) as LocalWorkspace | undefined
  if (!workspace || workspace.mode !== 'LOCAL') { transaction.abort(); throw new Error('Chỉ có thể xóa bản offline trên thiết bị này.') }
  for (const name of LOCAL_STORES.filter(store => store !== 'workspaces')) {
    const store = transaction.objectStore(name)
    const index = store.index('by-workspace')
    await new Promise<void>((resolve, reject) => {
      const request = index.openKeyCursor(workspaceKeyRange(id))
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) { resolve(); return }
        store.delete(cursor.primaryKey)
        cursor.continue()
      }
      request.onerror = () => reject(request.error || new Error('Không thể xóa dữ liệu workspace offline.'))
    })
  }
  workspaces.delete(id)
  await done
}

export async function markLocalWorkspaceOpened(id: string): Promise<void> {
  const db = await openTeachingDatabase()
  const transaction = db.transaction('workspaces', 'readwrite')
  const done = transactionDone(transaction)
  const store = transaction.objectStore('workspaces')
  const current = await requestResult(store.get(id)) as LocalWorkspace | undefined
  if (current?.mode === 'LOCAL') store.put({ ...current, lastOpenedAt: Date.now(), updatedAt: Date.now() })
  await done
}

export async function countLocalWorkspaceData(workspaceId: string): Promise<WorkspaceCounts> {
  const db = await openTeachingDatabase()
  const transaction = db.transaction(['students', 'lessons'], 'readonly')
  const done = transactionDone(transaction)
  const [students, lessons] = await Promise.all([
    requestResult(transaction.objectStore('students').index('by-workspace').count(workspaceKeyRange(workspaceId))),
    requestResult(transaction.objectStore('lessons').index('by-workspace').count(workspaceKeyRange(workspaceId))),
  ])
  await done
  return { students, lessons }
}


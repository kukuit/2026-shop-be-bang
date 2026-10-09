const DATABASE_NAME = 'ai-task-teaching-local'
export const DATABASE_VERSION = 1

export const LOCAL_STORES = [
  'workspaces',
  'students',
  'weeklySchedules',
  'lessons',
  'settings',
  'syncOperations',
  'syncMetadata',
] as const

export type LocalStoreName = typeof LOCAL_STORES[number]

let databasePromise: Promise<IDBDatabase> | null = null

function createIndex(store: IDBObjectStore, name: string, keyPath: string | string[], options: IDBIndexParameters = {}) {
  if (!store.indexNames.contains(name)) store.createIndex(name, keyPath, options)
}

export function openTeachingDatabase(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.reject(new Error('Trình duyệt này không hỗ trợ IndexedDB.'))
  if (databasePromise) return databasePromise

  databasePromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      const transaction = request.transaction
      if (!transaction) return

      const workspaces = db.objectStoreNames.contains('workspaces')
        ? transaction.objectStore('workspaces')
        : db.createObjectStore('workspaces', { keyPath: 'id' })
      createIndex(workspaces, 'by-updated-at', 'updatedAt')

      const students = db.objectStoreNames.contains('students')
        ? transaction.objectStore('students')
        : db.createObjectStore('students', { keyPath: ['workspaceId', 'id'] })
      createIndex(students, 'by-workspace', 'workspaceId')
      createIndex(students, 'by-workspace-status', ['workspaceId', 'status'])
      createIndex(students, 'by-workspace-name', ['workspaceId', 'name'])

      const schedules = db.objectStoreNames.contains('weeklySchedules')
        ? transaction.objectStore('weeklySchedules')
        : db.createObjectStore('weeklySchedules', { keyPath: ['workspaceId', 'id'] })
      createIndex(schedules, 'by-workspace', 'workspaceId')
      createIndex(schedules, 'by-student', ['workspaceId', 'studentId'])
      createIndex(schedules, 'by-student-effective-date', ['workspaceId', 'studentId', 'effectiveFrom'])
      createIndex(schedules, 'by-series', ['workspaceId', 'seriesId'])

      const lessons = db.objectStoreNames.contains('lessons')
        ? transaction.objectStore('lessons')
        : db.createObjectStore('lessons', { keyPath: ['workspaceId', 'id'] })
      createIndex(lessons, 'by-workspace', 'workspaceId')
      createIndex(lessons, 'by-student', ['workspaceId', 'studentId'])
      createIndex(lessons, 'by-start', ['workspaceId', 'startAt'])
      createIndex(lessons, 'by-status-start', ['workspaceId', 'status', 'startAt'])
      createIndex(lessons, 'by-series-occurrence', ['workspaceId', 'seriesId', 'occurrenceDate'])

      const settings = db.objectStoreNames.contains('settings')
        ? transaction.objectStore('settings')
        : db.createObjectStore('settings', { keyPath: ['workspaceId', 'id'] })
      createIndex(settings, 'by-workspace', 'workspaceId', { unique: true })

      const syncOperations = db.objectStoreNames.contains('syncOperations')
        ? transaction.objectStore('syncOperations')
        : db.createObjectStore('syncOperations', { keyPath: 'id' })
      createIndex(syncOperations, 'by-workspace', 'workspaceId')
      createIndex(syncOperations, 'by-workspace-status', ['workspaceId', 'status'])
      createIndex(syncOperations, 'by-workspace-created', ['workspaceId', 'createdAt'])

      const syncMetadata = db.objectStoreNames.contains('syncMetadata')
        ? transaction.objectStore('syncMetadata')
        : db.createObjectStore('syncMetadata', { keyPath: ['workspaceId', 'key'] })
      createIndex(syncMetadata, 'by-workspace', 'workspaceId')
    }
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => { db.close(); databasePromise = null }
      resolve(db)
    }
    request.onerror = () => { databasePromise = null; reject(request.error || new Error('Không mở được dữ liệu offline.')) }
    request.onblocked = () => reject(new Error('Hãy đóng tab quản lý dạy thêm khác để cập nhật cơ sở dữ liệu offline.'))
  })
  return databasePromise
}

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Không đọc được cơ sở dữ liệu offline.'))
  })
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error || new Error('Thao tác offline đã bị hủy.'))
    transaction.onerror = () => reject(transaction.error || new Error('Không ghi được dữ liệu offline.'))
  })
}

export async function readStore<T>(storeName: LocalStoreName, mode: IDBTransactionMode = 'readonly'): Promise<{ db: IDBDatabase; transaction: IDBTransaction; store: IDBObjectStore; done: Promise<void> }> {
  const db = await openTeachingDatabase()
  const transaction = db.transaction(storeName, mode)
  const done = transactionDone(transaction)
  return { db, transaction, store: transaction.objectStore(storeName), done }
}

export function workspaceKeyRange(workspaceId: string) {
  return IDBKeyRange.only(workspaceId)
}


import 'server-only'
import { getAdminDb } from '@/lib/firebaseAdmin'
import type { SafeAuthUser, AuthRole, AuthStatus } from './types'

export const normalizeUsername = (value: string) => value.trim().toLocaleLowerCase('vi-VN').normalize('NFKC')
const collection = () => getAdminDb().collection('shopbebangcom').doc('users').collection('users')

export function safeUser(id: string, data: FirebaseFirestore.DocumentData): SafeAuthUser {
  const legacyRole = String(data.role ?? 'user')
  return {
    id,
    username: String(data.username ?? ''),
    displayName: String(data.displayName ?? data.name ?? data.username ?? ''),
    role: (legacyRole === 'admin' ? 'admin' : 'user') as AuthRole,
    status: (data.status === 'active' ? 'active' : 'inactive') as AuthStatus,
    activeGame: data.activeGame !== false,
  }
}

export async function findUserByUsername(username: string) {
  const snapshot = await collection().where('username', '==', normalizeUsername(username)).limit(1).get()
  const document = snapshot.docs[0]
  return document ? { user: safeUser(document.id, document.data()), passwordHash: typeof document.data().passwordHash === 'string' ? document.data().passwordHash as string : null } : null
}

export async function findSafeUserById(userId: string) {
  const document = await collection().doc(userId).get()
  return document.exists ? safeUser(document.id, document.data() ?? {}) : null
}

export const authUserRef = (userId: string) => collection().doc(userId)

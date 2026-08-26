import 'server-only'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'
import type { CreateUserInput, UpdateUserInput, User, UserRole, UserStatus } from './user.types'
import { createUserSchema, updateUserSchema } from './user.validation'

const usersCollection = () => getAdminDb().collection('shopbebangcom').doc('users').collection('users')
const dateValue = (value: unknown): string | null => value instanceof Timestamp ? value.toDate().toISOString() : null

function mapUser(id: string, data: FirebaseFirestore.DocumentData): User {
  return { userId: id, name: String(data.name ?? ''), email: data.email ? String(data.email) : null, phone: data.phone ? String(data.phone) : null, avatar: data.avatar ? String(data.avatar) : null, role: (data.role ?? 'customer') as UserRole, status: (data.status ?? 'active') as UserStatus, activeGame: data.activeGame !== false, grade: typeof data.grade === 'number' ? data.grade : null, createdAt: dateValue(data.createdAt), updatedAt: dateValue(data.updatedAt), lastLoginAt: dateValue(data.lastLoginAt) }
}

export async function getUsers(): Promise<User[]> {
  const snapshot = await usersCollection().orderBy('createdAt', 'desc').get()
  return snapshot.docs.map(document => mapUser(document.id, document.data()))
}

export async function getUserById(userId: string): Promise<User | null> {
  const snapshot = await usersCollection().doc(userId).get()
  return snapshot.exists ? mapUser(snapshot.id, snapshot.data() ?? {}) : null
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const data = createUserSchema.parse(input)
  const userId = `usr_${crypto.randomUUID()}`
  await usersCollection().doc(userId).create({ userId, ...data, role: 'customer', status: 'active', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), lastLoginAt: null })
  const user = await getUserById(userId)
  if (!user) throw new Error('Không thể đọc user vừa tạo')
  return user
}

export async function updateUser(userId: string, input: UpdateUserInput): Promise<User | null> {
  const data = updateUserSchema.parse(input)
  const reference = usersCollection().doc(userId)
  if (!(await reference.get()).exists) return null
  await reference.update({ ...data, updatedAt: FieldValue.serverTimestamp() })
  return getUserById(userId)
}

export const setUserStatus = (userId: string, status: UserStatus) => updateUser(userId, { status })
export const setUserGameAccess = (userId: string, activeGame: boolean) => updateUser(userId, { activeGame })

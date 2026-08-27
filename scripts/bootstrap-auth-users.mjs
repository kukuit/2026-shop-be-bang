import { randomUUID } from 'node:crypto'
import nextEnv from '@next/env'
import bcrypt from 'bcryptjs'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

nextEnv.loadEnvConfig(process.cwd())
const password = process.env.INITIAL_USER_PASSWORD
if (!password || password.length < 10) throw new Error('INITIAL_USER_PASSWORD must contain at least 10 characters')
const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
if (!projectId || !clientEmail || !privateKey) throw new Error('Missing FIREBASE_* environment variables')
if (!getApps().length) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })

const db = getFirestore()
const users = db.collection('shopbebangcom').doc('users').collection('users')
const snapshot = await users.get()
const adminMatches = snapshot.docs.filter(document => String(document.data().username ?? '').trim().toLowerCase() === 'admin')
if (adminMatches.length > 1) throw new Error('Multiple users already use username admin')

const passwordHash = await bcrypt.hash(password, 12)
const batch = db.batch()
let updated = 0
for (const document of snapshot.docs) {
  const data = document.data()
  const fallbackUsername = `user_${document.id.replace(/^usr_/, '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toLowerCase()}`
  batch.set(document.ref, {
    userId: document.id,
    username: String(data.username ?? fallbackUsername).trim().toLowerCase().normalize('NFKC'),
    displayName: String(data.displayName ?? data.name ?? fallbackUsername),
    passwordHash: typeof data.passwordHash === 'string' ? data.passwordHash : passwordHash,
    role: data.role === 'admin' ? 'admin' : 'user',
    status: data.status === 'active' ? 'active' : 'inactive',
    activeGame: data.activeGame !== false,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
  updated += 1
}

let adminId
if (adminMatches[0]) {
  adminId = adminMatches[0].id
  batch.set(adminMatches[0].ref, { username: 'admin', displayName: 'Quản trị viên', passwordHash, role: 'admin', status: 'active', activeGame: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
} else {
  adminId = `usr_${randomUUID()}`
  batch.create(users.doc(adminId), { userId: adminId, username: 'admin', displayName: 'Quản trị viên', name: 'Quản trị viên', passwordHash, role: 'admin', status: 'active', activeGame: true, avatar: null, email: null, phone: null, grade: null, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), lastLoginAt: null })
}

await batch.commit()
console.log(`AUTH_USERS_SYNCED existing=${updated} adminUserId=${adminId} adminCreated=${!adminMatches[0]}`)

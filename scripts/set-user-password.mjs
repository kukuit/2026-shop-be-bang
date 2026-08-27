import nextEnv from '@next/env'
import bcrypt from 'bcryptjs'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

nextEnv.loadEnvConfig(process.cwd())
const values = new Map()
for (let index = 2; index < process.argv.length; index += 2) values.set(process.argv[index], process.argv[index + 1])
const userId = values.get('--user-id')
const username = values.get('--username')?.trim().toLocaleLowerCase('vi-VN').normalize('NFKC')
const displayName = values.get('--display-name')
const role = values.get('--role') ?? 'user'
const password = process.env.INITIAL_USER_PASSWORD
if (!userId || !username || !password || password.length < 10 || !['user', 'admin'].includes(role)) throw new Error('Set INITIAL_USER_PASSWORD (>=10 chars), then pass --user-id ID --username NAME [--display-name NAME] [--role user|admin]')
const projectId = process.env.FIREBASE_PROJECT_ID; const clientEmail = process.env.FIREBASE_CLIENT_EMAIL; const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
if (!projectId || !clientEmail || !privateKey) throw new Error('Missing FIREBASE_* environment variables')
if (!getApps().length) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
const db = getFirestore(); const users = db.collection('shopbebangcom').doc('users').collection('users')
const duplicate = await users.where('username', '==', username).limit(1).get()
if (duplicate.docs.some(document => document.id !== userId)) throw new Error('Username already belongs to another user')
const ref = users.doc(userId); const existing = await ref.get()
if (!existing.exists) throw new Error(`User ${userId} does not exist`)
const passwordHash = await bcrypt.hash(password, 12)
await ref.update({ username, displayName: displayName ?? existing.data()?.displayName ?? existing.data()?.name ?? username, passwordHash, role, status: 'active', updatedAt: FieldValue.serverTimestamp() })
console.log(`Updated authentication fields for user ${userId}; no game data was changed.`)

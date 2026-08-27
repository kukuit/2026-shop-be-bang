import nextEnv from '@next/env'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

nextEnv.loadEnvConfig(process.cwd())
const apply = process.argv.includes('--apply')
const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
if (!projectId || !clientEmail || !privateKey)
  throw new Error('Missing FIREBASE_* environment variables')
if (!getApps().length) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })

const db = getFirestore()
const snapshot = await db
  .collection('shopbebangcom')
  .doc('auth_sessions')
  .collection('sessions')
  .get()
const removable = snapshot.docs.filter((document) => {
  const data = document.data()
  return (
    data.revokedAt ||
    !(data.expiresAt instanceof Timestamp) ||
    data.expiresAt.toMillis() <= Date.now()
  )
})
console.log(
  `Auth sessions: total=${snapshot.size}, removable=${removable.length}, mode=${apply ? 'APPLY' : 'DRY RUN'}`
)
if (apply) {
  for (let offset = 0; offset < removable.length; offset += 400) {
    const batch = db.batch()
    for (const document of removable.slice(offset, offset + 400)) batch.delete(document.ref)
    await batch.commit()
  }
  console.log(`Deleted ${removable.length} expired/revoked auth sessions.`)
}

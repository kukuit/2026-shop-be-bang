import nextEnv from '@next/env'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

nextEnv.loadEnvConfig(process.cwd())
const apply = process.argv.includes('--apply')
const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
if (!projectId || !clientEmail || !privateKey)
  throw new Error('Missing FIREBASE_* environment variables')
if (!getApps().length) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })

const db = getFirestore()
const game = db.collection('shopbebangcom').doc('game')
const snapshot = await game.collection('session').get()
const initializers = snapshot.docs.filter(
  (document) => document.id === '_init' && document.data().type === 'collection-initializer'
)
const migrations = snapshot.docs.flatMap((document) => {
  const data = document.data()
  const userId = typeof data.userId === 'string' && data.userId ? data.userId : null
  const guestId = typeof data.guestId === 'string' && data.guestId ? data.guestId : null
  if (!userId && !guestId) return []
  const ownerCollection = userId ? 'user_sessions' : 'guest_sessions'
  const ownerId = userId ?? guestId
  const destination = game
    .collection(ownerCollection)
    .doc(ownerId)
    .collection('sessions')
    .doc(document.id)
  return [{ source: document.ref, destination, data }]
})

console.log(
  `Legacy game sessions: total=${snapshot.size}, movable=${migrations.length}, initializers=${initializers.length}, skipped=${snapshot.size - migrations.length - initializers.length}, mode=${apply ? 'APPLY' : 'DRY RUN'}`
)
if (apply) {
  for (let offset = 0; offset < migrations.length; offset += 200) {
    const batch = db.batch()
    for (const migration of migrations.slice(offset, offset + 200)) {
      batch.set(migration.destination, migration.data, { merge: false })
      batch.delete(migration.source)
    }
    await batch.commit()
  }
  if (initializers.length) {
    const batch = db.batch()
    for (const document of initializers) batch.delete(document.ref)
    await batch.commit()
  }
  console.log(`Moved ${migrations.length} sessions and removed their legacy source documents.`)
}

import nextEnv from '@next/env'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

nextEnv.loadEnvConfig(process.cwd())
const targetIndex = process.argv.indexOf('--target-user-id')
const targetUserId = targetIndex >= 0 ? process.argv[targetIndex + 1] : null
const apply = process.argv.includes('--apply')
if (!targetUserId)
  throw new Error('Pass --target-user-id ID. Add --apply only after reviewing the dry-run counts.')
const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
if (!projectId || !clientEmail || !privateKey)
  throw new Error('Missing FIREBASE_* environment variables')
if (!getApps().length) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
const db = getFirestore()
const root = db.collection('shopbebangcom').doc('game')
const [sessions, progress] = await Promise.all([
  root.collection('session').where('userId', '==', 'be-bang-test').get(),
  root.collection('learning_progress').where('userId', '==', 'be-bang-test').get(),
])
console.log(
  `Legacy records: sessions=${sessions.size}, learning_progress=${progress.size}; target=${targetUserId}; mode=${apply ? 'APPLY' : 'DRY RUN'}`
)
if (!apply) process.exit(0)
const target = await db
  .collection('shopbebangcom')
  .doc('users')
  .collection('users')
  .doc(targetUserId)
  .get()
if (!target.exists) throw new Error('Target user does not exist')
const writes = [...sessions.docs, ...progress.docs]
for (let offset = 0; offset < writes.length; offset += 200) {
  const batch = db.batch()
  for (const document of writes.slice(offset, offset + 200)) {
    const migrated = {
      ...document.data(),
      userId: targetUserId,
      guestId: null,
      isGuest: false,
      migratedFromUserId: 'be-bang-test',
      migratedAt: FieldValue.serverTimestamp(),
    }
    if (document.ref.parent.id === 'session') {
      const destination = root
        .collection('user_sessions')
        .doc(targetUserId)
        .collection('sessions')
        .doc(document.id)
      batch.set(destination, migrated)
      batch.delete(document.ref)
    } else {
      batch.update(document.ref, migrated)
    }
  }
  await batch.commit()
}
console.log(`Mapped ${writes.length} records; legacy sessions were moved to the user path.`)

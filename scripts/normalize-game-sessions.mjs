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
const gameRoot = db.collection('shopbebangcom').doc('game')
const [legacySnapshot, groupedSnapshot] = await Promise.all([
  gameRoot.collection('session').get(),
  db.collectionGroup('sessions').get(),
])
const documents = [
  ...legacySnapshot.docs,
  ...groupedSnapshot.docs.filter((document) => document.ref.path.startsWith(`${gameRoot.path}/`)),
]
const updates = documents.flatMap((document) => {
  const data = document.data()
  if (!Array.isArray(data.results)) return []
  const totalQuestions = data.results.length
  const correctCount = data.results.filter((result) => result?.correct === true).length
  const wrongCount = totalQuestions - correctCount
  const isGuest = typeof data.userId !== 'string' || !data.userId
  const normalized = {
    totalQuestions,
    correctCount,
    wrongCount,
    isGuest,
    guestId: isGuest ? (typeof data.guestId === 'string' ? data.guestId : null) : null,
  }
  const changed = Object.entries(normalized).some(([key, value]) => data[key] !== value)
  return changed ? [{ document, normalized }] : []
})
console.log(
  `Game sessions: total=${documents.length}, normalize=${updates.length}, mode=${apply ? 'APPLY' : 'DRY RUN'}`
)
if (apply) {
  for (let offset = 0; offset < updates.length; offset += 400) {
    const batch = db.batch()
    for (const { document, normalized } of updates.slice(offset, offset + 400))
      batch.update(document.ref, normalized)
    await batch.commit()
  }
  console.log(`Normalized ${updates.length} game sessions.`)
}

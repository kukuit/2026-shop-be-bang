import nextEnv from '@next/env'
import { cert, initializeApp, deleteApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

nextEnv.loadEnvConfig(process.cwd())
const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
if (!projectId || !clientEmail || !privateKey)
  throw new Error('Missing FIREBASE_* environment variables')

const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
const db = getFirestore(app)
// Deliberately fixed: never delete the parent collection or the new demo/chatbot.
const legacyRoot = db.doc('chatbot/demo')
try {
  const [root, collections] = await Promise.all([legacyRoot.get(), legacyRoot.listCollections()])
  console.log(JSON.stringify({ projectId, path: legacyRoot.path, exists: root.exists, collections: collections.map(c => c.id) }))
  if (process.argv.includes('--apply')) {
    await db.recursiveDelete(legacyRoot)
    const [remainingRoot, remainingCollections] = await Promise.all([legacyRoot.get(), legacyRoot.listCollections()])
    if (remainingRoot.exists || remainingCollections.length)
      throw new Error('Legacy demo still contains data; cleanup verification failed')
    console.log('Deleted and verified: chatbot/demo and all descendants.')
  } else {
    console.log('Dry run. Use --apply to delete only chatbot/demo and its descendants.')
  }
} finally {
  await db.terminate()
  await deleteApp(app)
}

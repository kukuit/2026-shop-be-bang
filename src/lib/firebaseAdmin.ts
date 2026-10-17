import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

function getAdminApp() {
  const existing = getApps().find(app => app.name === '[DEFAULT]')
  if (!existing) {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing FIREBASE_* env vars')
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  }
  return getApp()
}

export function getAdminDb() {
  return getFirestore(getAdminApp())
}

export function getAdminStorageBucket() {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET
  if (!bucketName) throw new Error('Missing FIREBASE_STORAGE_BUCKET')
  return getStorage(getAdminApp()).bucket(bucketName)
}

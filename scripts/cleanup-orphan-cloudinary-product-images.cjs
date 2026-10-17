const nextEnv = require('@next/env')

async function run() {
  const apply = process.argv.includes('--apply')
  const unknown = process.argv.slice(2).filter(argument => argument !== '--apply' && argument !== '--help')
  if (unknown.length) throw new Error(`Unknown arguments: ${unknown.join(', ')}`)
  if (process.argv.includes('--help')) {
    console.log('Usage: node scripts/cleanup-orphan-cloudinary-product-images.cjs [--apply]\nDefaults to a read-only dry run. --apply deletes only unreferenced product images older than 24 hours.')
    return
  }

  nextEnv.loadEnvConfig(process.cwd())
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env
  const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail } = process.env
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!cloudName || !apiKey || !apiSecret) throw new Error('Missing CLOUDINARY_* environment variables')
  if (!projectId || !clientEmail || !privateKey) throw new Error('Missing FIREBASE_* environment variables')

  const { v2: cloudinary } = require('cloudinary')
  const { cert, getApps, initializeApp } = require('firebase-admin/app')
  const { getFirestore } = require('firebase-admin/firestore')
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true })
  const app = getApps()[0] || initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  const db = getFirestore(app)
  const products = await db.collection('shopbebangcom').doc('store').collection('products').select('images').get()
  const referenced = new Set()
  for (const document of products.docs) {
    for (const image of Array.isArray(document.data().images) ? document.data().images : []) {
      if (typeof image.publicId === 'string') referenced.add(image.publicId)
    }
  }

  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  const candidates = []
  let cursor
  do {
    const page = await cloudinary.api.resources({
      resource_type: 'image',
      type: 'upload',
      prefix: 'shopbebang/products/',
      max_results: 500,
      ...(cursor ? { next_cursor: cursor } : {}),
    })
    for (const asset of page.resources ?? []) {
      if (referenced.has(asset.public_id)) continue
      const createdAt = Date.parse(asset.created_at ?? '')
      if (!Number.isFinite(createdAt) || createdAt > cutoff) continue
      candidates.push(asset)
    }
    cursor = page.next_cursor
  } while (cursor)

  console.log(`${apply ? 'Apply mode' : 'Dry run'}: ${candidates.length} unreferenced Cloudinary product image(s) older than 24 hours.`)
  for (const asset of candidates) {
    if (!apply) {
      console.log(`Would delete ${asset.public_id}`)
      continue
    }
    const result = await cloudinary.uploader.destroy(asset.public_id, { resource_type: 'image', type: 'upload', invalidate: true })
    console.log(`${result.result === 'ok' || result.result === 'not found' ? 'Deleted' : 'Failed'} ${asset.public_id}: ${result.result}`)
    if (result.result !== 'ok' && result.result !== 'not found') process.exitCode = 1
  }
}

run().catch(error => {
  console.error(error instanceof Error ? error.message : 'Cloudinary orphan cleanup failed.')
  process.exitCode = 1
})

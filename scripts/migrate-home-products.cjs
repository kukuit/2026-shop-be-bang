const nextEnv = require('@next/env')
const createLoader = require('./lib/load-project-ts.cjs')
const { randomUUID } = require('node:crypto')

const CATEGORY_DEFAULTS = [
  { id: 'do-tole', name: 'Đồ tole', slug: 'do-tole' },
  { id: 'dam-be-gai', name: 'Đầm bé gái', slug: 'dam-be-gai' },
  { id: 'ao-khoac', name: 'Áo khoác', slug: 'ao-khoac' },
  { id: 'do-bo', name: 'Đồ bộ', slug: 'do-bo' },
]

function categorySlugFor(product) {
  return /weekend club|mặc nhà/i.test(product.name) ? 'do-bo' : 'dam-be-gai'
}

function planLegacyProducts(newItems, saleItems, categoryIds, existingProductIds = new Set(), existingSlugs = new Set()) {
  const planned = []
  const usedSlugs = new Set(existingSlugs)
  const slugHelpers = createLoader()('src/lib/products/slug.ts')
  const groups = [
    { items: newItems, group: 'new' },
    { items: saleItems, group: 'sale' },
  ]
  for (const { items, group } of groups) {
    for (let sortOrder = 0; sortOrder < items.length; sortOrder++) {
      const item = items[sortOrder]
      const id = `legacy_${item.id}`
      if (existingProductIds.has(id)) {
        planned.push({ id, action: 'skip', group, name: item.name })
        continue
      }
      const baseSlug = slugHelpers.slugify(item.name) || item.id
      let slug = baseSlug
      if (usedSlugs.has(slug)) slug = `${baseSlug}-${item.id}`
      usedSlugs.add(slug)
      const categorySlug = categorySlugFor(item)
      const categoryId = categoryIds[categorySlug]
      if (!categoryId) throw new Error(`Missing category mapping for ${categorySlug}`)
      planned.push({
        id, action: 'create', group, name: item.name, slug, categoryId, categorySlug,
        nameSearch: slugHelpers.normalizeSearch(item.name),
        description: '', shortDescription: '', thumbnail: item.image,
        images: [{ id: `legacy-image-${item.id}`, url: item.image, alt: item.name, sortOrder: 0 }],
        price: group === 'sale' ? item.oldPrice : item.price,
        salePrice: group === 'sale' ? item.price : null,
        saleStartAt: null, saleEndAt: null,
        isNewArrival: group === 'new', arrivalAt: null,
        stock: 0, isActive: true, sortOrder,
      })
    }
  }
  return planned
}

async function run() {
  const apply = process.argv.includes('--apply')
  const help = process.argv.includes('--help')
  if (help) {
    console.log('Usage: node scripts/migrate-home-products.cjs [--apply]\nDefaults to a read-only dry run. --apply creates missing categories and imports only missing legacy product IDs; it does not overwrite existing products.')
    return
  }
  if (process.argv.some(argument => argument !== '--apply' && argument !== '--help' && argument !== process.argv[0] && argument !== process.argv[1]))
    throw new Error('Unknown argument. Use --help.')

  nextEnv.loadEnvConfig(process.cwd())
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!projectId || !clientEmail || !privateKey) throw new Error('Missing FIREBASE_* environment variables')

  const { cert, getApps, initializeApp, deleteApp } = require('firebase-admin/app')
  const { FieldValue, getFirestore } = require('firebase-admin/firestore')
  const existingApp = getApps()[0]
  const app = existingApp || initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  try {
    const db = getFirestore(app)
    const store = db.collection('shopbebangcom').doc('store')
    const categoryCollection = store.collection('productCategories')
    const productCollection = store.collection('products')
    const loader = createLoader()
    const legacy = loader('src/data/home-products.ts')
    const [categorySnapshot, productSnapshot] = await Promise.all([categoryCollection.get(), productCollection.select('slug').get()])
    const categoryBySlug = new Map(categorySnapshot.docs.map(document => [document.data().slug, document.id]))
    const categoryById = new Map(categorySnapshot.docs.map(document => [document.id, document.data().slug]))
    const categoryIds = Object.fromEntries(CATEGORY_DEFAULTS.map(category => [
      category.slug,
      categoryBySlug.get(category.slug) ?? (categoryById.has(category.id) ? `legacy-${category.slug}` : category.id),
    ]))
    const existingIds = new Set(productSnapshot.docs.map(document => document.id))
    const existingSlugs = new Set(productSnapshot.docs.map(document => document.data().slug).filter(Boolean))
    const planned = planLegacyProducts(legacy.newArrivalProducts, legacy.saleProducts, categoryIds, existingIds, existingSlugs)
    const missingCategories = CATEGORY_DEFAULTS.filter(category => !categoryBySlug.has(category.slug)).map(category => ({ ...category, id: categoryIds[category.slug] }))
    console.log(JSON.stringify({
      mode: apply ? 'APPLY' : 'DRY_RUN',
      categoriesToCreate: missingCategories.map(({ id, name, slug }) => ({ id, name, slug })),
      productsToCreate: planned.filter(item => item.action === 'create').map(({ id, name, slug, categorySlug, group, price, salePrice }) => ({ id, name, slug, categorySlug, group, price, salePrice })),
      productsSkipped: planned.filter(item => item.action === 'skip').map(({ id, name }) => ({ id, name })),
    }, null, 2))
    if (!apply) return

    for (const category of missingCategories) {
      const reference = categoryCollection.doc(category.id)
      await db.runTransaction(async transaction => {
        const [existingId, existingSlug] = await Promise.all([
          transaction.get(reference),
          transaction.get(categoryCollection.where('slug', '==', category.slug).limit(1)),
        ])
        if (existingSlug.size || existingId.exists) return
        transaction.create(reference, {
          ...category,
          nameSearch: loader('src/lib/products/slug.ts').normalizeSearch(category.name),
          description: '', imageUrl: '', imageStoragePath: null, parentId: null,
          sortOrder: CATEGORY_DEFAULTS.findIndex(item => item.slug === category.slug), isActive: true, productCount: 0,
          createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
        })
      })
    }

    let created = 0
    let skipped = 0
    for (const item of planned) {
      if (item.action !== 'create') { skipped++; continue }
      const productRef = productCollection.doc(item.id)
      const categoryRef = categoryCollection.doc(item.categoryId)
      const result = await db.runTransaction(async transaction => {
        const [existingProduct, category] = await Promise.all([transaction.get(productRef), transaction.get(categoryRef)])
        if (existingProduct.exists) return 'skip'
        if (!category.exists) throw new Error(`Missing category ${item.categoryId}; rerun migration.`)
        const slugMatches = await transaction.get(productCollection.where('slug', '==', item.slug).limit(1))
        let slug = item.slug
        if (!slugMatches.empty) {
          slug = `${item.slug}-${item.id}`
          const fallbackMatches = await transaction.get(productCollection.where('slug', '==', slug).limit(1))
          if (!fallbackMatches.empty) slug = `${slug}-${randomUUID().slice(0, 8)}`
        }
        const { action: _action, group: _group, categorySlug: _categorySlug, ...productData } = item
        transaction.create(productRef, {
          ...productData,
          slug,
          createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), deletedAt: null,
        })
        transaction.update(categoryRef, { productCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() })
        return 'created'
      })
      if (result === 'created') created++
      else skipped++
    }
    console.log(`Applied migration: created ${created} products; skipped ${skipped} existing products.`)
  } finally {
    if (!existingApp) await deleteApp(app)
  }
}

module.exports = { CATEGORY_DEFAULTS, categorySlugFor, planLegacyProducts }

if (require.main === module) run().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})

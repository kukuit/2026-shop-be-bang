import 'server-only'
import { unstable_cache } from 'next/cache'
import { FieldPath, FieldValue, Timestamp, type Transaction } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'
import type { ProductCategory, ProductCategoryInput } from './types'
import { createProductCategorySchema, updateProductCategorySchema } from './validation'
import { normalizeSearch } from '@/lib/products/slug'
import { invalidateProductCatalog } from '@/lib/products/cache'

const storeRoot = () => getAdminDb().collection('shopbebangcom').doc('store')
export const productCategoryCollection = () => storeRoot().collection('productCategories')
const productCollection = () => storeRoot().collection('products')
const iso = (value: unknown): string | null => value instanceof Timestamp ? value.toDate().toISOString() : value instanceof Date ? value.toISOString() : null

function mapCategory(id: string, data: FirebaseFirestore.DocumentData): ProductCategory {
  return {
    id,
    name: String(data.name ?? ''),
    slug: String(data.slug ?? ''),
    description: String(data.description ?? ''),
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : '',
    ...(typeof data.imageStoragePath === 'string' ? { imageStoragePath: data.imageStoragePath } : {}),
    parentId: typeof data.parentId === 'string' ? data.parentId : null,
    sortOrder: Number.isSafeInteger(data.sortOrder) ? data.sortOrder : 0,
    isActive: data.isActive === true,
    productCount: Number.isSafeInteger(data.productCount) ? data.productCount : 0,
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  }
}

function categoryData(input: ProductCategoryInput) {
  return {
    name: input.name.trim(),
    nameSearch: normalizeSearch(input.name),
    slug: input.slug.trim(),
    description: input.description?.trim() ?? '',
    imageUrl: input.imageUrl?.trim() ?? '',
    imageStoragePath: input.imageStoragePath ?? null,
    parentId: input.parentId || null,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  }
}

async function assertUniqueSlug(transaction: Transaction, slug: string, excludeId?: string) {
  const matches = await transaction.get(productCategoryCollection().where('slug', '==', slug).limit(2))
  if (matches.docs.some(document => document.id !== excludeId)) throw new Error('CATEGORY_SLUG_DUPLICATE')
}

export async function validateCategoryParentChain(
  categoryId: string,
  parentId: string | null,
  getParentId: (id: string) => Promise<string | null | undefined>,
) {
  const seen = new Set([categoryId])
  let nextId = parentId
  let depth = 0
  while (nextId) {
    if (seen.has(nextId)) return 'CATEGORY_CYCLE' as const
    seen.add(nextId)
    if (++depth > 100) return 'CATEGORY_DEPTH' as const
    const parent = await getParentId(nextId)
    if (parent === undefined) return 'CATEGORY_PARENT_NOT_FOUND' as const
    nextId = parent
  }
  return null
}

async function assertAcyclicParent(transaction: Transaction, categoryId: string, parentId: string | null) {
  const error = await validateCategoryParentChain(categoryId, parentId, async id => {
    const parent = await transaction.get(productCategoryCollection().doc(id))
    if (!parent.exists) return undefined
    return typeof parent.data()?.parentId === 'string' ? parent.data()!.parentId : null
  })
  if (error) throw new Error(error)
}

export async function listAdminCategories(options: { search?: string; cursor?: string; limit?: number } = {}) {
  const limit = Math.min(100, Math.max(1, options.limit ?? 50))
  const search = normalizeSearch(options.search ?? '')
  let query: FirebaseFirestore.Query = productCategoryCollection().orderBy('sortOrder', 'asc').orderBy(FieldPath.documentId(), 'asc')
  if (search) query = productCategoryCollection().where('nameSearch', '>=', search).where('nameSearch', '<=', `${search}\uf8ff`).orderBy('nameSearch').orderBy(FieldPath.documentId())
  if (options.cursor) {
    const cursor = await productCategoryCollection().doc(options.cursor).get()
    if (cursor.exists) query = query.startAfter(cursor)
  }
  const snapshot = await query.limit(limit + 1).get()
  const hasMore = snapshot.docs.length > limit
  const docs = snapshot.docs.slice(0, limit)
  return {
    categories: docs.map(document => mapCategory(document.id, document.data())),
    nextCursor: hasMore ? docs.at(-1)?.id ?? null : null,
  }
}

export async function getAdminCategory(id: string) {
  const snapshot = await productCategoryCollection().doc(id).get()
  return snapshot.exists ? mapCategory(snapshot.id, snapshot.data() ?? {}) : null
}

export async function listAllCategories() {
  const snapshot = await productCategoryCollection().orderBy('sortOrder').orderBy(FieldPath.documentId()).get()
  return snapshot.docs.map(document => mapCategory(document.id, document.data()))
}

async function loadPublicCategories() {
  const categories = await listAllCategories()
  const byId = new Map(categories.map(category => [category.id, category]))
  const visible = (category: ProductCategory) => {
    if (!category.isActive) return false
    const seen = new Set([category.id])
    let parentId = category.parentId
    while (parentId) {
      if (seen.has(parentId)) return false
      seen.add(parentId)
      const parent = byId.get(parentId)
      if (!parent?.isActive) return false
      parentId = parent.parentId
    }
    return true
  }
  return categories.filter(visible)
}

const cachedPublicCategories = unstable_cache(loadPublicCategories, ['public-product-categories-v1'], { revalidate: 300, tags: ['categories-public'] })
export async function listPublicCategories() { return cachedPublicCategories() }

export async function getPublicCategoryBySlug(slug: string) {
  return (await listPublicCategories()).find(category => category.slug === slug) ?? null
}

export async function findReferencedCategoryStoragePaths(storagePaths: string[]) {
  if (!storagePaths.length) return []
  const expected = new Set(storagePaths)
  const snapshot = await productCategoryCollection().select('imageStoragePath').get()
  return snapshot.docs.map(document => document.data().imageStoragePath).filter((path): path is string => typeof path === 'string' && expected.has(path))
}

export async function createCategory(input: unknown) {
  const parsed = createProductCategorySchema.parse(input)
  const id = parsed.id ?? crypto.randomUUID()
  const reference = productCategoryCollection().doc(id)
  await getAdminDb().runTransaction(async transaction => {
    const existing = await transaction.get(reference)
    if (existing.exists) throw new Error('CATEGORY_ID_EXISTS')
    await assertUniqueSlug(transaction, parsed.slug)
    await assertAcyclicParent(transaction, id, parsed.parentId)
    transaction.create(reference, {
      ...categoryData(parsed as ProductCategoryInput),
      productCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })
  invalidateProductCatalog()
  return getAdminCategory(id)
}

export async function updateCategory(id: string, input: unknown) {
  const patch = updateProductCategorySchema.parse(input)
  const reference = productCategoryCollection().doc(id)
  await getAdminDb().runTransaction(async transaction => {
    const snapshot = await transaction.get(reference)
    if (!snapshot.exists) throw new Error('CATEGORY_NOT_FOUND')
    const previous = mapCategory(id, snapshot.data() ?? {})
    const next = {
      ...previous,
      ...patch,
      imageUrl: patch.imageUrl === undefined ? previous.imageUrl : patch.imageUrl ?? '',
      imageStoragePath: patch.imageStoragePath === undefined ? previous.imageStoragePath ?? null : patch.imageStoragePath,
      description: patch.description ?? previous.description,
    }
    await assertUniqueSlug(transaction, next.slug, id)
    await assertAcyclicParent(transaction, id, next.parentId)
    transaction.update(reference, {
      ...categoryData(next),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })
  invalidateProductCatalog()
  return getAdminCategory(id)
}

export async function deleteCategory(id: string) {
  const reference = productCategoryCollection().doc(id)
  await getAdminDb().runTransaction(async transaction => {
    const snapshot = await transaction.get(reference)
    if (!snapshot.exists) throw new Error('CATEGORY_NOT_FOUND')
    const childrenQuery = productCategoryCollection().where('parentId', '==', id).limit(1)
    const productQuery = productCollection().where('categoryId', '==', id).where('deletedAt', '==', null).limit(1)
    const [children, products] = await Promise.all([transaction.get(childrenQuery), transaction.get(productQuery)])
    if (children.size || products.size || Number(snapshot.data()?.productCount ?? 0) > 0) throw new Error('CATEGORY_IN_USE')
    transaction.delete(reference)
  })
  invalidateProductCatalog()
}

export async function seedDefaultCategories() {
  const defaults = [
    { id: 'do-tole', name: 'Đồ tole', slug: 'do-tole' },
    { id: 'dam-be-gai', name: 'Đầm bé gái', slug: 'dam-be-gai' },
    { id: 'ao-khoac', name: 'Áo khoác', slug: 'ao-khoac' },
    { id: 'do-bo', name: 'Đồ bộ', slug: 'do-bo' },
  ]
  for (let sortOrder = 0; sortOrder < defaults.length; sortOrder++) {
    const category = defaults[sortOrder]
    const reference = productCategoryCollection().doc(category.id)
    await getAdminDb().runTransaction(async transaction => {
      const [existingId, existingSlug] = await Promise.all([
        transaction.get(reference),
        transaction.get(productCategoryCollection().where('slug', '==', category.slug).limit(1)),
      ])
      if (existingId.exists || existingSlug.size) return
      transaction.create(reference, {
        ...category,
        nameSearch: normalizeSearch(category.name),
        description: '', imageUrl: '', imageStoragePath: null, parentId: null, sortOrder, isActive: true, productCount: 0,
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      })
    })
  }
  return listAllCategories()
}

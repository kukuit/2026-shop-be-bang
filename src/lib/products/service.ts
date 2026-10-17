import 'server-only'
import { unstable_cache } from 'next/cache'
import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { getCloudinary, isCloudinaryImageUrl, isProductImagePublicIdFor } from '@/lib/cloudinary'
import { productCategoryCollection, listAllCategories, listPublicCategories } from '@/lib/product-categories/service'
import type { Product, ProductImage, ProductInput, PublicProduct } from './types'
import { createProductSchema, updateProductSchema } from './validation'
import { normalizeSearch } from './slug'
import { isProductOnSale } from './pricing'
import { invalidateProductCatalog } from './cache'

const storeRoot = () => getAdminDb().collection('shopbebangcom').doc('store')
export const productCollection = () => storeRoot().collection('products')
const iso = (value: unknown): string | null => value instanceof Timestamp ? value.toDate().toISOString() : value instanceof Date ? value.toISOString() : null
const timestamp = (value: string | null | undefined) => value ? Timestamp.fromDate(new Date(value)) : null
const encodeCursor = (id: string) => Buffer.from(id).toString('base64url')
const decodeCursor = (value?: string) => {
  if (!value) return null
  try {
    const id = Buffer.from(value, 'base64url').toString()
    return id && id.length <= 180 ? id : null
  } catch { return null }
}

function mapProduct(id: string, data: FirebaseFirestore.DocumentData): Product {
  const images: ProductImage[] = Array.isArray(data.images) ? data.images.map((image: Record<string, unknown>, index: number) => ({
    id: String(image.id ?? `${id}-${index}`),
    url: String(image.url ?? ''),
    ...(typeof image.storagePath === 'string' ? { storagePath: image.storagePath } : {}),
    ...(typeof image.publicId === 'string' ? { publicId: image.publicId } : {}),
    ...(Number.isSafeInteger(image.width) ? { width: Number(image.width) } : {}),
    ...(Number.isSafeInteger(image.height) ? { height: Number(image.height) } : {}),
    ...(typeof image.format === 'string' ? { format: image.format } : {}),
    ...(typeof image.alt === 'string' ? { alt: image.alt } : {}),
    sortOrder: Number.isSafeInteger(image.sortOrder) ? Number(image.sortOrder) : index,
  })).filter(image => image.url).sort((a, b) => a.sortOrder - b.sortOrder) : []
  return {
    id,
    name: String(data.name ?? ''),
    slug: String(data.slug ?? ''),
    description: String(data.description ?? ''),
    shortDescription: String(data.shortDescription ?? ''),
    categoryId: String(data.categoryId ?? ''),
    thumbnail: String(data.thumbnail ?? ''),
    images,
    price: Number(data.price ?? 0),
    salePrice: Number.isSafeInteger(data.salePrice) ? data.salePrice : null,
    saleStartAt: iso(data.saleStartAt),
    saleEndAt: iso(data.saleEndAt),
    isNewArrival: data.isNewArrival === true,
    arrivalAt: iso(data.arrivalAt),
    stock: Number.isSafeInteger(data.stock) ? data.stock : 0,
    isActive: data.isActive === true,
    sortOrder: Number.isSafeInteger(data.sortOrder) ? data.sortOrder : 0,
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
    deletedAt: iso(data.deletedAt),
  }
}

function toPublicProduct(product: Product): PublicProduct {
  const { stock, sortOrder: _sortOrder, deletedAt: _deletedAt, isActive: _isActive, createdAt: _createdAt, updatedAt: _updatedAt, ...publicProduct } = product
  return { ...publicProduct, images: product.images.map(({ storagePath: _storagePath, ...image }) => image), inStock: stock > 0 }
}

export function isProductPubliclyVisible(product: Pick<Product, 'isActive' | 'deletedAt' | 'categoryId'>, activeCategoryIds: ReadonlySet<string>) {
  return product.isActive && product.deletedAt === null && activeCategoryIds.has(product.categoryId)
}

export function selectHomeNewArrivals<T>(products: T[]) {
  return products.slice(0, 4)
}

export function selectHomeSaleProducts<T extends Pick<Product, 'price' | 'salePrice' | 'saleStartAt' | 'saleEndAt'>>(products: T[], now: Date) {
  return products.filter(product => isProductOnSale(product, now)).slice(0, 4)
}

function writeData(input: Omit<ProductInput, 'id'>) {
  const name = input.name.trim()
  return {
    name,
    nameSearch: normalizeSearch(name),
    slug: input.slug.trim(),
    description: input.description ?? '',
    shortDescription: input.shortDescription ?? '',
    categoryId: input.categoryId,
    thumbnail: input.thumbnail ?? '',
    images: input.images.map((image, index) => ({ ...image, sortOrder: index })),
    price: input.price,
    salePrice: input.salePrice ?? null,
    saleStartAt: timestamp(input.saleStartAt),
    saleEndAt: timestamp(input.saleEndAt),
    isNewArrival: input.isNewArrival,
    arrivalAt: timestamp(input.arrivalAt),
    stock: input.stock,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  }
}

async function verifyCloudinaryImages(productId: string, images: ProductImage[]) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  let cloudinary: ReturnType<typeof getCloudinary> | undefined
  const result: ProductImage[] = []
  for (const image of images) {
    if (!image.publicId) {
      if (isCloudinaryImageUrl(image.url)) throw new Error('PRODUCT_IMAGE_NOT_OWNED')
      result.push(image)
      continue
    }
    if (image.storagePath || !isProductImagePublicIdFor(image.publicId, productId) || image.id !== image.publicId.split('/').at(-1)
      || !cloudName || !image.url.startsWith('https://res.cloudinary.com/')) throw new Error('PRODUCT_IMAGE_NOT_OWNED')
    const url = new URL(image.url)
    const path = url.pathname.split('/').filter(Boolean)
    if (url.hostname !== 'res.cloudinary.com' || path[0] !== cloudName || path[1] !== 'image' || path[2] !== 'upload')
      throw new Error('PRODUCT_IMAGE_NOT_OWNED')
    cloudinary ??= getCloudinary()
    let asset: { public_id?: string; secure_url?: string; width?: number; height?: number; format?: string }
    try {
      asset = await cloudinary.api.resource(image.publicId, { resource_type: 'image', type: 'upload' })
    } catch {
      throw new Error('PRODUCT_IMAGE_NOT_OWNED')
    }
    if (asset.public_id !== image.publicId || asset.secure_url !== image.url || !asset.width || !asset.height
      || !asset.format || !['jpg', 'jpeg', 'png', 'webp'].includes(asset.format)) throw new Error('PRODUCT_IMAGE_NOT_OWNED')
    result.push({
      ...image,
      url: asset.secure_url,
      width: asset.width,
      height: asset.height,
      format: asset.format,
    })
  }
  return result
}

function assertCloudinaryThumbnail(thumbnail: string, images: ProductImage[]) {
  if (images.length && (!thumbnail || !images.some(image => image.url === thumbnail)))
    throw new Error('PRODUCT_THUMBNAIL_NOT_IN_IMAGES')
  if (isCloudinaryImageUrl(thumbnail) && !images.some(image => image.publicId && image.url === thumbnail))
    throw new Error('PRODUCT_IMAGE_NOT_OWNED')
}

async function assertUniqueSlug(slug: string, excludedId?: string, transaction?: FirebaseFirestore.Transaction) {
  const query = productCollection().where('slug', '==', slug)
  const matches = transaction ? await transaction.get(query) : await query.get()
  if (matches.docs.some(document => document.id !== excludedId && document.data().deletedAt == null))
    throw new Error('PRODUCT_SLUG_DUPLICATE')
}

async function requireCategory(categoryId: string, transaction: FirebaseFirestore.Transaction, allowInactive = false) {
  const reference = productCategoryCollection().doc(categoryId)
  const snapshot = await transaction.get(reference)
  if (!snapshot.exists) throw new Error('CATEGORY_NOT_FOUND')
  if (!allowInactive && snapshot.data()?.isActive !== true) throw new Error('CATEGORY_INACTIVE')
  return { reference, snapshot }
}

export async function listAdminProducts(options: {
  search?: string
  categoryId?: string
  status?: 'active' | 'hidden' | 'all'
  group?: 'new' | 'sale' | 'all'
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'sort-order'
  cursor?: string
  limit?: number
} = {}) {
  const limit = Math.min(50, Math.max(1, options.limit ?? 20))
  const search = normalizeSearch(options.search ?? '')
  const status = options.status ?? 'all'
  const group = options.group ?? 'all'
  const sort = options.sort ?? 'newest'
  const now = new Date()
  const collection = productCollection()
  const cursorId = decodeCursor(options.cursor)
  let cursor = cursorId ? await collection.doc(cursorId).get() : null
  let scanned = 0
  let rawExhausted = false
  let lastScanned: FirebaseFirestore.QueryDocumentSnapshot | null = null
  const matched: FirebaseFirestore.QueryDocumentSnapshot[] = []
  const maxScan = Math.min(500, Math.max(100, limit * 10))

  while (scanned < maxScan && matched.length <= limit && !rawExhausted) {
    let query: FirebaseFirestore.Query = collection.where('deletedAt', '==', null)
    if (search) query = query.where('nameSearch', '>=', search).where('nameSearch', '<=', `${search}\uf8ff`).orderBy('nameSearch')
    else if (sort === 'price-asc') query = query.orderBy('price', 'asc')
    else if (sort === 'price-desc') query = query.orderBy('price', 'desc')
    else if (sort === 'sort-order') query = query.orderBy('sortOrder', 'asc').orderBy('createdAt', 'desc')
    else query = query.orderBy('createdAt', 'desc')
    query = query.orderBy(FieldPath.documentId(), 'asc')
    if (cursor?.exists) query = query.startAfter(cursor)
    const pageLimit = Math.min(50, maxScan - scanned)
    const page = await query.limit(pageLimit).get()
    if (page.empty) { rawExhausted = true; break }
    for (const document of page.docs) {
      scanned++
      lastScanned = document
      const product = mapProduct(document.id, document.data())
      const matches = (!options.categoryId || product.categoryId === options.categoryId)
        && (status === 'all' || product.isActive === (status === 'active'))
        && (group === 'all' || (group === 'new' ? product.isNewArrival : isProductOnSale(product, now)))
        && (!search || normalizeSearch(product.name).startsWith(search))
      if (matches) matched.push(document)
      if (matched.length > limit) break
    }
    cursor = lastScanned
    rawExhausted = page.size < pageLimit
  }

  const docs = matched.slice(0, limit)
  const products = docs.map(document => mapProduct(document.id, document.data()))
  const ids = Array.from(new Set(products.map(product => product.categoryId)))
  const categorySnapshots = ids.length ? await getAdminDb().getAll(...ids.map(id => productCategoryCollection().doc(id))) : []
  const categoryNames = Object.fromEntries(categorySnapshots.filter(snapshot => snapshot.exists).map(snapshot => [snapshot.id, String(snapshot.data()?.name ?? '')]))
  let nextCursor: string | null = null
  if (matched.length > limit && docs.length) nextCursor = encodeCursor(docs[docs.length - 1].id)
  else if (!rawExhausted && lastScanned) nextCursor = encodeCursor(lastScanned.id)
  return {
    products: products.map(product => ({ ...product, categoryName: categoryNames[product.categoryId] ?? 'Danh mục đã ẩn' })),
    nextCursor,
  }
}

export async function getAdminProduct(id: string) {
  const snapshot = await productCollection().doc(id).get()
  return snapshot.exists && snapshot.data()?.deletedAt == null ? mapProduct(snapshot.id, snapshot.data() ?? {}) : null
}

export async function getAdminProductBySlug(slug: string) {
  const snapshot = await productCollection().where('slug', '==', slug).limit(1).get()
  const document = snapshot.docs.find(item => item.data().deletedAt == null)
  return document ? mapProduct(document.id, document.data()) : null
}

export async function createProduct(input: unknown) {
  const parsed = createProductSchema.parse(input)
  const id = parsed.id ?? crypto.randomUUID()
  const images = await verifyCloudinaryImages(id, parsed.images)
  assertCloudinaryThumbnail(parsed.thumbnail, images)
  const reference = productCollection().doc(id)
  const data = writeData({ ...parsed, images } as ProductInput)
  await getAdminDb().runTransaction(async transaction => {
    const [existing] = await Promise.all([transaction.get(reference)])
    if (existing.exists) throw new Error('PRODUCT_ID_EXISTS')
    await assertUniqueSlug(data.slug, undefined, transaction)
    const category = await requireCategory(data.categoryId, transaction)
    transaction.create(reference, {
      ...data,
      deletedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    transaction.update(category.reference, { productCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() })
  })
  invalidateProductCatalog()
  return getAdminProduct(id)
}

export async function updateProduct(id: string, input: unknown) {
  const patch = updateProductSchema.parse(input)
  const current = await getAdminProduct(id)
  if (!current) throw new Error('PRODUCT_NOT_FOUND')
  const requestedImages = patch.images ? await verifyCloudinaryImages(id, patch.images) : undefined
  assertCloudinaryThumbnail(patch.thumbnail ?? current.thumbnail, requestedImages ?? current.images)
  const reference = productCollection().doc(id)
  await getAdminDb().runTransaction(async transaction => {
    const previousSnapshot = await transaction.get(reference)
    if (!previousSnapshot.exists || previousSnapshot.data()?.deletedAt != null) throw new Error('PRODUCT_NOT_FOUND')
    const previous = mapProduct(id, previousSnapshot.data() ?? {})
    const merged = { ...previous, ...patch, images: requestedImages ?? previous.images }
    const complete = createProductSchema.parse({
      id,
      name: merged.name,
      slug: merged.slug,
      description: merged.description,
      shortDescription: merged.shortDescription,
      categoryId: merged.categoryId,
      thumbnail: merged.thumbnail,
      images: merged.images,
      price: merged.price,
      salePrice: merged.salePrice,
      saleStartAt: merged.saleStartAt,
      saleEndAt: merged.saleEndAt,
      isNewArrival: merged.isNewArrival,
      arrivalAt: merged.arrivalAt,
      stock: merged.stock,
      isActive: merged.isActive,
      sortOrder: merged.sortOrder,
    })
    const next = writeData(complete)
    await assertUniqueSlug(next.slug, id, transaction)
    const oldCategoryId = previous.categoryId
    const newCategory = await requireCategory(next.categoryId, transaction, next.categoryId === oldCategoryId)
    if (oldCategoryId !== next.categoryId) {
      const oldCategory = productCategoryCollection().doc(oldCategoryId)
      transaction.update(oldCategory, { productCount: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() })
      transaction.update(newCategory.reference, { productCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() })
    }
    transaction.update(reference, { ...next, updatedAt: FieldValue.serverTimestamp() })
  })
  invalidateProductCatalog()
  return getAdminProduct(id)
}

export async function softDeleteProduct(id: string) {
  const reference = productCollection().doc(id)
  await getAdminDb().runTransaction(async transaction => {
    const snapshot = await transaction.get(reference)
    if (!snapshot.exists || snapshot.data()?.deletedAt != null) throw new Error('PRODUCT_NOT_FOUND')
    const categoryId = String(snapshot.data()?.categoryId ?? '')
    const categoryRef = productCategoryCollection().doc(categoryId)
    const category = await transaction.get(categoryRef)
    if (category.exists) transaction.update(categoryRef, { productCount: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() })
    transaction.update(reference, { isActive: false, deletedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
  })
  invalidateProductCatalog()
}

async function queryPublicProducts(options: { categoryId?: string; filter?: 'new' | 'sale'; sort?: 'newest' | 'price-asc' | 'price-desc' | 'sort-order'; cursor?: string; limit?: number }) {
  const limit = Math.min(50, Math.max(1, options.limit ?? 20))
  let query: FirebaseFirestore.Query = productCollection().where('isActive', '==', true).where('deletedAt', '==', null)
  if (options.categoryId) query = query.where('categoryId', '==', options.categoryId)
  if (options.filter === 'new') query = query.where('isNewArrival', '==', true)
  if (options.filter === 'sale') query = query.where('salePrice', '>', 0).orderBy('salePrice', 'asc')
  if (options.filter !== 'sale') {
    if (options.filter === 'new') query = query.orderBy('arrivalAt', 'desc').orderBy('createdAt', 'desc')
    else if (options.sort === 'price-asc') query = query.orderBy('price', 'asc')
    else if (options.sort === 'price-desc') query = query.orderBy('price', 'desc')
    else if (options.sort === 'sort-order') query = query.orderBy('sortOrder', 'asc').orderBy('createdAt', 'desc')
    else query = query.orderBy('createdAt', 'desc')
  } else query = query.orderBy('createdAt', 'desc')
  query = query.orderBy(FieldPath.documentId(), 'asc')
  const cursorId = decodeCursor(options.cursor)
  if (cursorId) {
    const cursor = await productCollection().doc(cursorId).get()
    if (cursor.exists) query = query.startAfter(cursor)
  }
  const snapshot = await query.limit(limit + 1).get()
  const hasMore = snapshot.docs.length > limit
  const docs = snapshot.docs.slice(0, limit)
  const products = docs.map(document => mapProduct(document.id, document.data()))
  const allowedCategories = new Set((await listPublicCategories()).map(category => category.id))
  const now = new Date()
  const filtered = products.filter(product => isProductPubliclyVisible(product, allowedCategories)
    && (options.filter !== 'new' || product.isNewArrival)
    && (options.filter !== 'sale' || isProductOnSale(product, now)))
  if (options.filter === 'sale' || options.filter === 'new') {
    filtered.sort((a, b) => {
      const arrival = (b.arrivalAt ? new Date(b.arrivalAt).getTime() : 0) - (a.arrivalAt ? new Date(a.arrivalAt).getTime() : 0)
      return options.filter === 'new' ? arrival || (b.createdAt ?? '').localeCompare(a.createdAt ?? '') : a.sortOrder - b.sortOrder || (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    })
  }
  const last = docs.at(-1)
  return {
    products: filtered.map(toPublicProduct),
    nextCursor: hasMore && last ? encodeCursor(last.id) : null,
  }
}

export async function listPublicProducts(options: { categoryId?: string; filter?: 'new' | 'sale'; sort?: 'newest' | 'price-asc' | 'price-desc' | 'sort-order'; cursor?: string; limit?: number } = {}) {
  return queryPublicProducts(options)
}

const cachedHomeNewArrivals = unstable_cache(async () => {
  const snapshot = await productCollection().where('isActive', '==', true).where('deletedAt', '==', null).where('isNewArrival', '==', true)
    .orderBy('arrivalAt', 'desc').orderBy('createdAt', 'desc').orderBy(FieldPath.documentId(), 'asc').limit(200).get()
  const products = snapshot.docs.map(document => mapProduct(document.id, document.data()))
  const visibleCategories = new Set((await listPublicCategories()).map(category => category.id))
  return products.filter(product => isProductPubliclyVisible(product, visibleCategories)).map(toPublicProduct)
}, ['home-products-new-arrivals-v1'], { revalidate: 300, tags: ['products-public', 'categories-public'] })

const cachedHomeSaleCandidates = unstable_cache(async () => {
  const snapshot = await productCollection().where('isActive', '==', true).where('deletedAt', '==', null)
    .where('salePrice', '>', 0).orderBy('salePrice', 'asc').orderBy('createdAt', 'desc').limit(500).get()
  const candidates = snapshot.docs.map(document => mapProduct(document.id, document.data()))
  const visibleCategories = new Set((await listPublicCategories()).map(category => category.id))
  return candidates.filter(product => visibleCategories.has(product.categoryId)).map(toPublicProduct)
}, ['home-products-sale-v1'], { revalidate: 300, tags: ['products-public', 'categories-public'] })

export async function getHomeNewArrivals() {
  return selectHomeNewArrivals(await cachedHomeNewArrivals())
}

export async function getHomeSaleProducts() {
  return selectHomeSaleProducts(await cachedHomeSaleCandidates(), new Date())
}

export async function getPublicProductBySlug(slug: string) {
  const result = await productCollection().where('slug', '==', slug).where('isActive', '==', true).where('deletedAt', '==', null).limit(1).get()
  if (result.empty) return null
  const product = mapProduct(result.docs[0].id, result.docs[0].data())
  const categories = await listPublicCategories()
  if (!isProductPubliclyVisible(product, new Set(categories.map(category => category.id)))) return null
  return toPublicProduct(product)
}

export async function listPublicCategoryProducts(categoryId: string, options: { sort?: 'newest' | 'price-asc' | 'price-desc' | 'sort-order'; cursor?: string; limit?: number } = {}) {
  const categories = await listPublicCategories()
  if (!categories.some(category => category.id === categoryId)) return { products: [] as PublicProduct[], nextCursor: null }
  return queryPublicProducts({ ...options, categoryId })
}

export async function findReferencedStoragePaths(storagePaths: string[]) {
  if (!storagePaths.length) return []
  const [products, categories] = await Promise.all([
    productCollection().select('images').get(),
    productCategoryCollection().select('imageStoragePath').get(),
  ])
  return storagePaths.filter(storagePath => {
    const productUsesIt = products.docs.some(document => Array.isArray(document.data().images)
      && document.data().images.some((image: { storagePath?: string }) => image.storagePath === storagePath))
    const categoryUsesIt = categories.docs.some(document => document.data().imageStoragePath === storagePath)
    return productUsesIt || categoryUsesIt
  })
}

export async function findReferencedCloudinaryPublicIds(publicIds: string[]) {
  if (!publicIds.length) return []
  const wanted = new Set(publicIds)
  const products = await productCollection().select('images').get()
  const referenced = new Set<string>()
  for (const document of products.docs) {
    if (!Array.isArray(document.data().images)) continue
    for (const image of document.data().images as Array<{ publicId?: string }>) {
      if (image.publicId && wanted.has(image.publicId)) referenced.add(image.publicId)
    }
  }
  return Array.from(referenced)
}

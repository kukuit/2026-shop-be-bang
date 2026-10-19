import 'server-only'
import { unstable_cache } from 'next/cache'
import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { getCloudinary, isCloudinaryImageUrl, isProductImagePublicIdFor } from '@/lib/cloudinary'
import { productCategoryCollection, listAllCategories, listPublicCategories } from '@/lib/product-categories/service'
import type { Product, ProductAttributes, ProductComboComponent, ProductDiscount, ProductImage, ProductInput, PublicProduct, ResolvedProductComboComponent } from './types'
import { createProductSchema, updateProductSchema } from './validation'
import { normalizeSearch } from './slug'
import { getProductEffectivePrice, isProductOnSale } from './pricing'
import { calculateComboPricing, getAvailableComboCount, validateComboComponents } from './combos'
import { resolveVariantPrice } from './variants'
import { invalidateProductCatalog } from './cache'
import {
  calculateTotalStock,
  normalizeProductAttributes,
  normalizeProductData,
  normalizeProductSizeGuide,
  normalizeProductVariantConfig,
  normalizeProductVariants,
} from './variants'

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

export function mapProduct(id: string, data: FirebaseFirestore.DocumentData): Product {
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
  const normalizedProduct = normalizeProductData(data)
  const type = data.type === 'COMBO' ? 'COMBO' : 'SIMPLE'
  const components: ProductComboComponent[] = Array.isArray(data.components) ? data.components.flatMap((value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []
    const component = value as Record<string, unknown>
    if (typeof component.productId !== 'string' || !Number.isSafeInteger(component.quantity) || Number(component.quantity) < 1) return []
    return [{ productId: component.productId, variantId: typeof component.variantId === 'string' ? component.variantId : null, quantity: Number(component.quantity) }]
  }) : []
  const discountData = data.discount && typeof data.discount === 'object' ? data.discount as Record<string, unknown> : null
  const discount: ProductDiscount | null = discountData && (discountData.type === 'PERCENT' || discountData.type === 'FIXED_AMOUNT') && Number.isSafeInteger(discountData.value)
    ? { type: discountData.type, value: Number(discountData.value) }
    : null
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
    showOnHomeBanner: data.showOnHomeBanner === true,
    arrivalAt: iso(data.arrivalAt),
    isActive: data.isActive === true,
    sortOrder: Number.isSafeInteger(data.sortOrder) ? data.sortOrder : 0,
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
    deletedAt: iso(data.deletedAt),
    ...normalizedProduct,
    type,
    ...(type === 'COMBO' ? { stock: 0, hasVariants: false, components, discount } : {}),
    ...(typeof data.seoTitle === 'string' ? { seoTitle: data.seoTitle } : {}),
    ...(typeof data.seoDescription === 'string' ? { seoDescription: data.seoDescription } : {}),
  }
}

function toPublicProduct(product: Product): PublicProduct {
  const { stock, sortOrder: _sortOrder, deletedAt: _deletedAt, isActive: _isActive, createdAt: _createdAt, updatedAt: _updatedAt, ...publicProduct } = product
  const ownImages = product.images.map(({ storagePath: _storagePath, ...image }) => image)
  const seenComboImageUrls = new Set<string>()
  const comboImages = product.type === 'COMBO' && !product.thumbnail && !ownImages.length
    ? (product.resolvedComponents ?? []).flatMap((component, index) => {
      if (!component.imageUrl || seenComboImageUrls.has(component.imageUrl)) return []
      seenComboImageUrls.add(component.imageUrl)
      return [{
        id: `combo-${product.id}-${index}`,
        url: component.imageUrl,
        alt: component.productName,
        sortOrder: index,
      }]
    })
    : []
  return {
    ...publicProduct,
    thumbnail: product.thumbnail || ownImages[0]?.url || comboImages[0]?.url || '',
    images: ownImages.length ? ownImages : comboImages,
    inStock: stock > 0,
    ...(product.type === 'COMBO' ? { availableCombos: product.stock } : {}),
    ...(comboImages.length ? { comboImageFallback: true } : {}),
  }
}

function mergeComboAttributes(products: Iterable<Product>): ProductAttributes {
  const values: Partial<Record<keyof ProductAttributes, string[]>> = {}
  for (const product of Array.from(products)) {
    for (const [key, rawValue] of Object.entries(product.attributes ?? {})) {
      if (typeof rawValue !== 'string' || !rawValue.trim()) continue
      const attribute = key as keyof ProductAttributes
      const value = rawValue.trim()
      const current = values[attribute] ?? []
      if (!current.includes(value)) values[attribute] = [...current, value]
    }
  }
  return Object.fromEntries(Object.entries(values).map(([key, parts]) => [key, (parts ?? []).join(key === 'careInstructions' ? '\n' : ' · ')])) as ProductAttributes
}

async function hydrateComboProducts(products: Product[], visibleCategoryIds?: ReadonlySet<string>) {
  const comboProducts = products.filter(product => product.type === 'COMBO')
  const ids = Array.from(new Set(comboProducts.flatMap(product => (product.components ?? []).map(component => component.productId))))
  const snapshots = ids.length ? await getAdminDb().getAll(...ids.map(id => productCollection().doc(id))) : []
  const componentsById = new Map(snapshots.map(snapshot => [snapshot.id, snapshot.exists ? mapProduct(snapshot.id, snapshot.data() ?? {}) : null]))
  const now = new Date()
  return products.map(product => {
    if (product.type !== 'COMBO') return product
    const components = product.components ?? []
    const resolvedComponents: ResolvedProductComboComponent[] = []
    const stockByComponent = new Map<string, number>()
    const attributeProducts = new Map<string, Product>()
    let subtotal = 0
    let valid = components.reduce((total, component) => total + component.quantity, 0) >= 2 && Boolean(product.discount)
    let visible = true
    for (let componentIndex = 0; componentIndex < components.length; componentIndex += 1) {
      const component = components[componentIndex]
      const source = componentsById.get(component.productId)
      if (!source || source.type === 'COMBO' || source.deletedAt) { valid = false; visible = false; continue }
      attributeProducts.set(source.id, source)
      const componentVisible = source.isActive && (!visibleCategoryIds || visibleCategoryIds.has(source.categoryId))
      if (!componentVisible) visible = false
      const variant = source.hasVariants ? source.variants?.find(item => item.id === component.variantId) : null
      if (source.hasVariants && (component.variantId ? !variant : !source.variants?.length) || !source.hasVariants && component.variantId) { valid = false; continue }
      const unitPrice = resolveVariantPrice(source, variant, now)
      const lineTotal = unitPrice * component.quantity
      if (!Number.isSafeInteger(unitPrice) || unitPrice < 1 || !Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(subtotal + lineTotal)) { valid = false; continue }
      subtotal += lineTotal
      const stockAvailable = variant?.stock ?? (source.hasVariants
        ? Math.max(0, ...(source.variants ?? []).map(item => item.stock))
        : source.stock)
      stockByComponent.set(JSON.stringify([component.productId, component.variantId ?? null]), stockAvailable)
      const colorOption = variant?.colorId ? source.variantConfig?.colors.find(option => option.id === variant.colorId) : undefined
      resolvedComponents.push({
        ...component,
        componentIndex,
        variantId: variant?.id ?? null,
        productName: source.name,
        productSlug: source.slug,
        imageUrl: variant?.imageUrl || colorOption?.imageUrl || source.thumbnail || source.images[0]?.url || '',
        hasVariants: source.hasVariants === true,
        ...(source.hasVariants && !component.variantId ? { variants: source.variants ?? [] } : {}),
        color: variant?.color ?? null,
        size: variant?.size ?? null,
        unitPrice,
        stockAvailable,
      })
    }
    if (!valid || !product.discount) return { ...product, stock: 0, availableCombos: 0, resolvedComponents: [] }
    try {
      const pricing = calculateComboPricing(subtotal, product.discount)
      const availableCombos = visible ? getAvailableComboCount(components, stockByComponent) : 0
      return {
        ...product,
        attributes: mergeComboAttributes(attributeProducts.values()),
        price: pricing.subtotal,
        salePrice: pricing.finalPrice,
        saleStartAt: null,
        saleEndAt: null,
        stock: availableCombos,
        availableCombos,
        comboSubtotal: pricing.subtotal,
        discountAmount: pricing.discountAmount,
        resolvedComponents: visible ? resolvedComponents : [],
      }
    } catch {
      return { ...product, stock: 0, availableCombos: 0, resolvedComponents: [] }
    }
  })
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
  const type = input.type === 'COMBO' ? 'COMBO' : 'SIMPLE'
  return {
    name,
    nameSearch: normalizeSearch(name),
    slug: input.slug.trim(),
    description: input.description ?? '',
    shortDescription: input.shortDescription ?? '',
    seoTitle: input.seoTitle?.trim() ?? '',
    seoDescription: input.seoDescription?.trim() ?? '',
    categoryId: input.categoryId,
    thumbnail: input.thumbnail ?? '',
    images: input.images.map((image, index) => ({
      id: image.id,
      url: image.url,
      ...(image.storagePath ? { storagePath: image.storagePath } : {}),
      ...(image.publicId ? { publicId: image.publicId } : {}),
      ...(image.width !== undefined ? { width: image.width } : {}),
      ...(image.height !== undefined ? { height: image.height } : {}),
      ...(image.format ? { format: image.format } : {}),
      ...(image.alt !== undefined ? { alt: image.alt } : {}),
      sortOrder: index,
    })),
    price: input.price,
    salePrice: input.salePrice ?? null,
    saleStartAt: timestamp(input.saleStartAt),
    saleEndAt: timestamp(input.saleEndAt),
    isNewArrival: input.isNewArrival,
    showOnHomeBanner: input.showOnHomeBanner,
    arrivalAt: timestamp(input.arrivalAt),
    stock: type === 'COMBO' ? 0 : input.hasVariants ? calculateTotalStock(input.variants ?? []) : input.stock,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
    attributes: normalizeProductAttributes(input.attributes) ?? {},
    sizeGuide: normalizeProductSizeGuide(input.sizeGuide) ?? [],
    hasVariants: input.hasVariants === true,
    variantConfig: input.hasVariants ? normalizeProductVariantConfig(input.variantConfig) ?? { colors: [], sizes: [] } : { colors: [], sizes: [] },
    variants: input.hasVariants ? normalizeProductVariants(input.variants) ?? [] : [],
    type,
    components: type === 'COMBO' ? input.components ?? [] : [],
    discount: type === 'COMBO' ? input.discount ?? null : null,
  }
}

function assertProductDocumentSize(data: Record<string, unknown>) {
  if (Buffer.byteLength(JSON.stringify(data), 'utf8') > 900 * 1024) throw new Error('PRODUCT_DOCUMENT_TOO_LARGE')
}

function assertVariantImagesBelongToProduct(product: Pick<Product, 'hasVariants' | 'variantConfig' | 'variants' | 'images'>) {
  if (!product.hasVariants) return
  const imageUrls = new Set(product.images.map(image => image.url))
  const colorHasMissingImage = (product.variantConfig?.colors ?? []).some(color => color.imageUrl && !imageUrls.has(color.imageUrl))
  const variantHasMissingImage = (product.variants ?? []).some(variant => variant.imageUrl && !imageUrls.has(variant.imageUrl))
  if (colorHasMissingImage || variantHasMissingImage) throw new Error('PRODUCT_VARIANT_IMAGE_NOT_FOUND')
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

async function calculateComboForTransaction(
  transaction: FirebaseFirestore.Transaction,
  components: ProductComboComponent[] | undefined,
  discount: ProductDiscount | null | undefined,
  now: Date,
  requireAvailable = true,
) {
  if (!components || !discount) throw new Error('COMBO_INVALID_COMPONENTS')
  validateComboComponents(components)
  const ids = Array.from(new Set(components.map(component => component.productId)))
  const snapshots = await Promise.all(ids.map(id => transaction.get(productCollection().doc(id))))
  const products = new Map(snapshots.map(snapshot => [snapshot.id, snapshot.exists ? mapProduct(snapshot.id, snapshot.data() ?? {}) : null]))
  const categoryIds = Array.from(new Set(Array.from(products.values()).flatMap(product => product?.categoryId ? [product.categoryId] : [])))
  const categoryData = new Map<string, FirebaseFirestore.DocumentData | null>()
  const categoryQueue = [...categoryIds]
  while (categoryQueue.length) {
    const id = categoryQueue.shift()!
    if (!id || categoryData.has(id)) continue
    const snapshot = await transaction.get(productCategoryCollection().doc(id))
    const data = snapshot.exists ? snapshot.data() ?? {} : null
    categoryData.set(id, data)
    if (typeof data?.parentId === 'string' && data.parentId) categoryQueue.push(data.parentId)
  }
  const activeCategoryIds = new Set<string>()
  for (const id of categoryIds) {
    const visited = new Set<string>()
    let current: string | null = id
    let visible = true
    while (current) {
      if (visited.has(current)) { visible = false; break }
      visited.add(current)
      const category = categoryData.get(current)
      if (!category || category.isActive !== true) { visible = false; break }
      current = typeof category.parentId === 'string' && category.parentId ? category.parentId : null
    }
    if (visible) activeCategoryIds.add(id)
  }
  const resolvedComponents: ResolvedProductComboComponent[] = []
  let subtotal = 0
  for (const component of components) {
    const product = products.get(component.productId)
    if (!product || product.type === 'COMBO' || requireAvailable && (!product.isActive || product.deletedAt || !activeCategoryIds.has(product.categoryId)))
      throw new Error('COMBO_COMPONENT_UNAVAILABLE')
    const variant = product.hasVariants && component.variantId ? product.variants?.find(item => item.id === component.variantId) ?? null : null
    if (requireAvailable && (product.hasVariants && (component.variantId ? !variant : !product.variants?.length) || !product.hasVariants && component.variantId))
      throw new Error('COMBO_COMPONENT_VARIANT_INVALID')
    const unitPrice = resolveVariantPrice(product, variant, now)
    if (!Number.isSafeInteger(unitPrice) || unitPrice < 1) throw new Error('COMBO_INVALID_PRICE')
    const lineTotal = unitPrice * component.quantity
    if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(subtotal + lineTotal)) throw new Error('COMBO_INVALID_PRICE')
    subtotal += lineTotal
    const colorOption = variant?.colorId ? product.variantConfig?.colors.find(option => option.id === variant.colorId) : undefined
    resolvedComponents.push({
      ...component,
      variantId: variant?.id ?? component.variantId ?? null,
      componentIndex: resolvedComponents.length,
      productName: product.name,
      productSlug: product.slug,
      imageUrl: variant?.imageUrl || colorOption?.imageUrl || product.thumbnail || product.images[0]?.url || '',
      hasVariants: product.hasVariants === true,
      ...(product.hasVariants && !component.variantId ? { variants: product.variants ?? [] } : {}),
      color: variant?.color ?? null,
      size: variant?.size ?? null,
      unitPrice,
      stockAvailable: variant?.stock ?? (product.hasVariants
        ? Math.max(0, ...(product.variants ?? []).map(item => item.stock))
        : product.stock),
    })
  }
  return { ...calculateComboPricing(subtotal, discount), components: resolvedComponents }
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
  const products = await hydrateComboProducts(docs.map(document => mapProduct(document.id, document.data())))
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
  if (!snapshot.exists || snapshot.data()?.deletedAt != null) return null
  return (await hydrateComboProducts([mapProduct(snapshot.id, snapshot.data() ?? {})]))[0]
}

export async function getAdminProductBySlug(slug: string) {
  const snapshot = await productCollection().where('slug', '==', slug).limit(1).get()
  const document = snapshot.docs.find(item => item.data().deletedAt == null)
  return document ? (await hydrateComboProducts([mapProduct(document.id, document.data())]))[0] : null
}

export async function createProduct(input: unknown) {
  const parsed = createProductSchema.parse(input)
  const id = parsed.id ?? crypto.randomUUID()
  const images = await verifyCloudinaryImages(id, parsed.images)
  assertCloudinaryThumbnail(parsed.thumbnail, images)
  const reference = productCollection().doc(id)
  const data = writeData({ ...parsed, images } as ProductInput)
  assertVariantImagesBelongToProduct({ ...parsed, images })
  assertProductDocumentSize(data)
  await getAdminDb().runTransaction(async transaction => {
    const [existing] = await Promise.all([transaction.get(reference)])
    if (existing.exists) throw new Error('PRODUCT_ID_EXISTS')
    await assertUniqueSlug(data.slug, undefined, transaction)
    const category = await requireCategory(data.categoryId, transaction)
    const combo = parsed.type === 'COMBO'
      ? await calculateComboForTransaction(transaction, parsed.components, parsed.discount, new Date(), parsed.isActive)
      : null
    transaction.create(reference, {
      ...data,
      ...(combo ? { price: combo.subtotal, salePrice: combo.finalPrice, saleStartAt: null, saleEndAt: null, stock: 0 } : {}),
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
      showOnHomeBanner: merged.showOnHomeBanner,
      arrivalAt: merged.arrivalAt,
      stock: merged.hasVariants ? calculateTotalStock(merged.variants ?? []) : merged.stock,
      isActive: merged.isActive,
      sortOrder: merged.sortOrder,
      attributes: merged.attributes ?? {},
      sizeGuide: merged.sizeGuide ?? [],
      hasVariants: merged.hasVariants ?? false,
      variantConfig: merged.variantConfig ?? { colors: [], sizes: [] },
      variants: merged.variants ?? [],
      type: merged.type ?? previous.type ?? 'SIMPLE',
      components: merged.components ?? [],
      discount: merged.discount ?? null,
      seoTitle: merged.seoTitle ?? '',
      seoDescription: merged.seoDescription ?? '',
    })
    if ((previous.type ?? 'SIMPLE') !== complete.type) throw new Error('PRODUCT_TYPE_IMMUTABLE')
    const combo = complete.type === 'COMBO'
      ? await calculateComboForTransaction(transaction, complete.components, complete.discount, new Date(), complete.isActive)
      : null
    const next = writeData({
      ...complete,
      ...(combo ? { price: combo.subtotal, salePrice: combo.finalPrice, saleStartAt: null, saleEndAt: null } : {}),
    })
    assertVariantImagesBelongToProduct({ ...complete, images: merged.images })
    assertProductDocumentSize(next)
    await assertUniqueSlug(next.slug, id, transaction)
    if (previous.hasVariants) {
      const nextVariantIds = new Set((complete.variants ?? []).map(variant => variant.id))
      const removedVariantIds = (previous.variants ?? []).filter(variant => !nextVariantIds.has(variant.id)).map(variant => variant.id)
      const reservationRefs = removedVariantIds.map(variantId => reference.collection('orderReservations').doc(`variant_${encodeURIComponent(variantId)}`))
      if (!complete.hasVariants) reservationRefs.push(reference.collection('orderReservations').doc('base'))
      if (reservationRefs.length) {
        const reservations = await Promise.all(reservationRefs.map(item => transaction.get(item)))
        if (reservations.some(item => Number(item.data()?.orderCount ?? 0) > 0)) throw new Error('PRODUCT_VARIANT_HAS_ACTIVE_ORDERS')
      }
    } else if (complete.hasVariants) {
      const activeBaseOrders = await transaction.get(reference.collection('orderReservations').doc('base'))
      if (Number(activeBaseOrders.data()?.orderCount ?? 0) > 0) throw new Error('PRODUCT_VARIANT_HAS_ACTIVE_ORDERS')
    }
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
  const allowedCategories = new Set((await listPublicCategories()).map(category => category.id))
  const products = await hydrateComboProducts(docs.map(document => mapProduct(document.id, document.data())), allowedCategories)
  const now = new Date()
  const filtered = products.filter(product => isProductPubliclyVisible(product, allowedCategories)
    && (options.filter !== 'new' || product.isNewArrival)
    && (options.filter !== 'sale' || isProductOnSale(product, now)))
  if (options.sort === 'price-asc' || options.sort === 'price-desc') {
    filtered.sort((a, b) => {
      const direction = options.sort === 'price-asc' ? 1 : -1
      return direction * (a.price - b.price) || a.sortOrder - b.sortOrder || (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    })
  } else if (options.filter === 'sale' || options.filter === 'new') {
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
  return products.filter(product => isProductPubliclyVisible(product, visibleCategories))
}, ['home-products-new-arrivals-v1'], { revalidate: 300, tags: ['products-public', 'categories-public'] })

const cachedHomeSaleCandidates = unstable_cache(async () => {
  const snapshot = await productCollection().where('isActive', '==', true).where('deletedAt', '==', null)
    .where('salePrice', '>', 0).orderBy('salePrice', 'asc').orderBy('createdAt', 'desc').limit(500).get()
  const candidates = snapshot.docs.map(document => mapProduct(document.id, document.data()))
  const visibleCategories = new Set((await listPublicCategories()).map(category => category.id))
  return candidates.filter(product => visibleCategories.has(product.categoryId))
}, ['home-products-sale-v1'], { revalidate: 300, tags: ['products-public', 'categories-public'] })

export async function getHomeNewArrivals() {
  const categories = new Set((await listPublicCategories()).map(category => category.id))
  const products = await hydrateComboProducts(await cachedHomeNewArrivals(), categories)
  return selectHomeNewArrivals(products.map(toPublicProduct))
}

export async function getHomeSaleProducts() {
  const categories = new Set((await listPublicCategories()).map(category => category.id))
  const products = await hydrateComboProducts(await cachedHomeSaleCandidates(), categories)
  return selectHomeSaleProducts(products.map(toPublicProduct), new Date())
}

export async function getHomeBannerProduct() {
  const snapshot = await productCollection().where('showOnHomeBanner', '==', true).get()
  const candidates = snapshot.docs.map(document => mapProduct(document.id, document.data()))
  const visibleCategories = new Set((await listPublicCategories()).map(category => category.id))
  const selected = candidates
    .filter(product => isProductPubliclyVisible(product, visibleCategories))
    .sort((a, b) => a.sortOrder - b.sortOrder || (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || a.id.localeCompare(b.id))
  const product = selected[0]
  return product ? toPublicProduct((await hydrateComboProducts([product], visibleCategories))[0]) : null
}

export async function getPublicProductBySlug(slug: string) {
  const result = await productCollection().where('slug', '==', slug).where('isActive', '==', true).where('deletedAt', '==', null).limit(1).get()
  if (result.empty) return null
  const product = mapProduct(result.docs[0].id, result.docs[0].data())
  const categories = await listPublicCategories()
  const visibleCategories = new Set(categories.map(category => category.id))
  if (!isProductPubliclyVisible(product, visibleCategories)) return null
  return toPublicProduct((await hydrateComboProducts([product], visibleCategories))[0])
}

export async function getPublicProductById(id: string) {
  const snapshot = await productCollection().doc(id).get()
  if (!snapshot.exists) return null
  const product = mapProduct(snapshot.id, snapshot.data() ?? {})
  const categories = await listPublicCategories()
  const visibleCategories = new Set(categories.map(category => category.id))
  if (!isProductPubliclyVisible(product, visibleCategories)) return null
  return toPublicProduct((await hydrateComboProducts([product], visibleCategories))[0])
}

export async function getPublicProductWithStockById(id: string) {
  const snapshot = await productCollection().doc(id).get()
  if (!snapshot.exists) return null
  const product = mapProduct(snapshot.id, snapshot.data() ?? {})
  const categories = await listPublicCategories()
  const visibleCategories = new Set(categories.map(category => category.id))
  if (!isProductPubliclyVisible(product, visibleCategories)) return null
  const hydrated = (await hydrateComboProducts([product], visibleCategories))[0]
  return { product: toPublicProduct(hydrated), stock: hydrated.stock }
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

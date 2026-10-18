import 'server-only'
import { createHash, createHmac } from 'node:crypto'
import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { accessSecret } from '@/lib/auth/config'
import { isProductPubliclyVisible, mapProduct, productCollection } from '@/lib/products/service'
import { invalidateProductCatalog } from '@/lib/products/cache'
import { calculateComboPricing, validateComboComponents } from '@/lib/products/combos'
import { getProductEffectivePrice } from '@/lib/products/pricing'
import { productCategoryCollection } from '@/lib/product-categories/service'
import type { Product, ProductComboComponent, ProductDiscount, ProductVariant } from '@/lib/products/types'
import { canConfirmOrder, canTransitionOrder, fingerprintOrderPayload, nextOrderStatus, normalizeOrderSearchQuery, normalizeVietnamPhone, sanitizePublicOrder, searchPrefixes, shouldRestoreInventory, type OrderLineInput, type OrderStatus } from './model'

const root = () => getAdminDb().collection('shopbebangcom').doc('store')
const orders = () => root().collection('orders')
const requests = () => root().collection('orderRequests')
const codes = () => root().collection('orderCodes')
const tokens = () => root().collection('orderAccessTokens')
const rateLimits = () => root().collection('orderRateLimits')
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const secretHash = (value: string) => createHmac('sha256', accessSecret()).update(value).digest('hex')
const cleanString = (value: unknown, max: number) => typeof value === 'string' ? value.trim().normalize('NFC').slice(0, max) : ''

export interface CreateOrderInput {
  idempotencyKey: string
  shippingConsent: boolean
  customer: { name: string; phone: string; address: string; note: string }
  items: OrderLineInput[]
}

function canonicalInput(input: CreateOrderInput, phone: string) {
  const customer = { name: cleanString(input.customer.name, 100), phone, address: cleanString(input.customer.address, 300), note: cleanString(input.customer.note, 500) }
  const grouped = new Map<string, OrderLineInput>()
  for (const line of input.items) {
    const key = JSON.stringify([line.productId, line.variantId])
    const previous = grouped.get(key)
    const quantity = (previous?.quantity ?? 0) + line.quantity
    if (quantity > 99) throw new Error('ORDER_QUANTITY_LIMIT')
    grouped.set(key, { ...line, quantity })
  }
  return { customer, items: Array.from(grouped.values()), shippingConsent: input.shippingConsent === true }
}

function resolveLine(product: Product, variantId: string | null, quantity: number, now: Date) {
  if (!product.isActive || product.deletedAt) throw new Error('ORDER_PRODUCT_UNAVAILABLE')
  let variant: ProductVariant | undefined
  let stock: number
  let reservationKey: string
  if (product.hasVariants) {
    if (!variantId) throw new Error('ORDER_VARIANT_REQUIRED')
    variant = product.variants?.find(item => item.id === variantId)
    if (!variant) throw new Error('ORDER_VARIANT_UNAVAILABLE')
    stock = variant.stock
    reservationKey = `variant_${encodeURIComponent(variant.id)}`
  } else {
    if (variantId) throw new Error('ORDER_VARIANT_UNAVAILABLE')
    stock = product.stock
    reservationKey = 'base'
  }
  const unitPrice = variant?.price ?? getProductEffectivePrice(product, now)
  if (!Number.isSafeInteger(unitPrice) || unitPrice < 1) throw new Error('ORDER_PRICE_UNAVAILABLE')
  const color = variant?.color ?? null
  const size = variant?.size ?? null
  const optionColor = variant?.colorId ? product.variantConfig?.colors.find(item => item.id === variant?.colorId) : undefined
  const imageUrl = variant?.imageUrl || optionColor?.imageUrl || product.thumbnail || product.images[0]?.url || null
  return {
    productId: product.id, variantId: variant?.id ?? null, reservationKey, quantity, unitPrice, lineTotal: unitPrice * quantity,
    productName: product.name, productSlug: product.slug, color, size, sku: variant?.sku ?? null, imageUrl,
  }
}

type InventoryDemand = { productId: string; variantId: string | null; quantity: number }
const MAX_ORDER_INVENTORY_DEMANDS = 200

function resolveOrderLine(
  product: Product,
  variantId: string | null,
  quantity: number,
  now: Date,
  products: ReadonlyMap<string, Product | null>,
  visibleCategories: ReadonlySet<string>,
) {
  if (product.type !== 'COMBO') {
    const line = resolveLine(product, variantId, quantity, now)
    const { reservationKey: _reservationKey, ...item } = line
    return {
      item,
      demands: [{ productId: product.id, variantId: line.variantId, quantity }],
    }
  }

  if (variantId) throw new Error('ORDER_VARIANT_UNAVAILABLE')
  const components = product.components ?? []
  const discount = product.discount as ProductDiscount | null | undefined
  try { validateComboComponents(components) } catch { throw new Error('ORDER_PRODUCT_UNAVAILABLE') }
  if (!discount) throw new Error('ORDER_PRODUCT_UNAVAILABLE')
  let comboSubtotal = 0
  const resolvedComponents: Array<Record<string, unknown>> = []
  const demands = new Map<string, InventoryDemand>()

  for (const component of components as ProductComboComponent[]) {
    const source = products.get(component.productId)
    if (!source || source.type === 'COMBO' || !isProductPubliclyVisible(source, visibleCategories)) throw new Error('ORDER_PRODUCT_UNAVAILABLE')
    let variant: ProductVariant | null = null
    if (source.hasVariants) {
      variant = source.variants?.find(item => item.id === component.variantId) ?? null
      if (!variant) throw new Error('ORDER_VARIANT_UNAVAILABLE')
    } else if (component.variantId) throw new Error('ORDER_VARIANT_UNAVAILABLE')
    const unitPrice = variant?.price ?? getProductEffectivePrice(source, now)
    const componentLineTotal = unitPrice * component.quantity
    if (!Number.isSafeInteger(unitPrice) || unitPrice < 1 || !Number.isSafeInteger(componentLineTotal) || !Number.isSafeInteger(comboSubtotal + componentLineTotal))
      throw new Error('ORDER_PRICE_UNAVAILABLE')
    comboSubtotal += componentLineTotal
    const requiredQuantity = component.quantity * quantity
    if (!Number.isSafeInteger(requiredQuantity)) throw new Error('ORDER_QUANTITY_LIMIT')
    const demandVariantId = variant?.id ?? null
    const demandKey = JSON.stringify([source.id, demandVariantId])
    const existingDemand = demands.get(demandKey)
    demands.set(demandKey, { productId: source.id, variantId: demandVariantId, quantity: (existingDemand?.quantity ?? 0) + requiredQuantity })
    const colorOption = variant?.colorId ? source.variantConfig?.colors.find(option => option.id === variant?.colorId) : undefined
    resolvedComponents.push({
      productId: source.id,
      variantId: variant?.id ?? null,
      productName: source.name,
      productSlug: source.slug,
      color: variant?.color ?? null,
      size: variant?.size ?? null,
      sku: variant?.sku ?? null,
      imageUrl: variant?.imageUrl || colorOption?.imageUrl || source.thumbnail || source.images[0]?.url || null,
      quantity: component.quantity,
      unitPrice,
      lineTotal: componentLineTotal,
    })
  }

  let pricing: ReturnType<typeof calculateComboPricing>
  try { pricing = calculateComboPricing(comboSubtotal, discount) } catch { throw new Error('ORDER_PRICE_UNAVAILABLE') }
  const lineTotal = pricing.finalPrice * quantity
  if (!Number.isSafeInteger(lineTotal)) throw new Error('ORDER_PRICE_UNAVAILABLE')
  return {
    item: {
      productId: product.id,
      variantId: null,
      quantity,
      unitPrice: pricing.finalPrice,
      lineTotal,
      productName: product.name,
      productSlug: product.slug,
      color: null,
      size: null,
      sku: null,
      imageUrl: product.thumbnail || product.images[0]?.url || null,
      isCombo: true,
      comboSubtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      discount: { ...discount },
      comboComponents: resolvedComponents,
    },
    demands: Array.from(demands.values()),
  }
}

async function activeCategoryIds(transaction: FirebaseFirestore.Transaction, initialIds: string[]) {
  const categoryData = new Map<string, FirebaseFirestore.DocumentData | null>()
  const queue = Array.from(new Set(initialIds))
  while (queue.length) {
    const id = queue.shift()!
    if (!id || categoryData.has(id)) continue
    const snapshot = await transaction.get(productCategoryCollection().doc(id))
    const data = snapshot.exists ? snapshot.data() ?? {} : null
    categoryData.set(id, data)
    const parentId = data?.parentId
    if (typeof parentId === 'string' && parentId) queue.push(parentId)
  }
  const valid = new Set<string>()
  for (const id of initialIds) {
    const visited = new Set<string>()
    let current: string | null = id
    let isVisible = true
    while (current) {
      if (visited.has(current)) { isVisible = false; break }
      visited.add(current)
      const data = categoryData.get(current)
      if (!data || data.isActive !== true) { isVisible = false; break }
      current = typeof data.parentId === 'string' && data.parentId ? data.parentId : null
    }
    if (isVisible) valid.add(id)
  }
  return valid
}

function serializeAdminValue(value: any): any {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString()
  if (Array.isArray(value)) return value.map(serializeAdminValue)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, serializeAdminValue(child)]))
  return value
}

export async function createOrder(input: CreateOrderInput, ip: string) {
  const phone = normalizeVietnamPhone(input.customer.phone)
  if (!phone) throw new Error('ORDER_INVALID_PHONE')
  const canonical = canonicalInput(input, phone)
  const payloadHash = hash(fingerprintOrderPayload(canonical))
  const requestId = hash(input.idempotencyKey)
  const requestRef = requests().doc(requestId)
  const accessToken = secretHash(`guest-order:${input.idempotencyKey}`)
  const accessTokenHash = hash(accessToken)
  const orderRef = orders().doc()
  const orderCode = `BB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${orderRef.id.slice(-10).toUpperCase()}`
  const codeRef = codes().doc(hash(orderCode))
  const tokenRef = tokens().doc(accessTokenHash)
  const ipHash = secretHash(`order-ip:${ip || 'unknown'}`)
  const rateRef = rateLimits().doc(ipHash)
  const productRefs = Array.from(new Set(canonical.items.map(line => line.productId))).map(id => productCollection().doc(id))
  const reservationRefFor = ({ productId, key }: { productId: string; key: string }) => productCollection().doc(productId).collection('orderReservations').doc(key)
  const db = getAdminDb()
  const result = await db.runTransaction(async transaction => {
    const existingRequest = await transaction.get(requestRef)
    if (existingRequest.exists) {
      const data = existingRequest.data() ?? {}
      if (data.payloadHash !== payloadHash) throw new Error('ORDER_IDEMPOTENCY_CONFLICT')
      return { orderId: String(data.orderId), orderCode: String(data.orderCode), created: false }
    }
    const [rateSnapshot, productSnapshots, codeSnapshot, tokenSnapshot] = await Promise.all([
      transaction.get(rateRef),
      Promise.all(productRefs.map(reference => transaction.get(reference))),
      transaction.get(codeRef),
      transaction.get(tokenRef),
    ])
    if (codeSnapshot.exists || tokenSnapshot.exists) throw new Error('ORDER_RETRY_REQUIRED')
    const nowMs = Date.now()
    const rateData = rateSnapshot.data() ?? {}
    const windowStart = Number(rateData.windowStart ?? 0)
    const count = windowStart > nowMs - 15 * 60_000 ? Number(rateData.count ?? 0) : 0
    if (count >= 10) throw new Error('ORDER_RATE_LIMITED')
    const productById = new Map(productSnapshots.map(snapshot => [snapshot.id, snapshot.exists ? mapProduct(snapshot.id, snapshot.data() ?? {}) : null]))
    const potentialInventoryKeys = new Set<string>()
    for (const line of canonical.items) {
      const product = productById.get(line.productId)
      if (product?.type === 'COMBO') {
        for (const component of product.components ?? []) potentialInventoryKeys.add(JSON.stringify([component.productId, component.variantId ?? null]))
      } else potentialInventoryKeys.add(JSON.stringify([line.productId, line.variantId]))
      if (potentialInventoryKeys.size > MAX_ORDER_INVENTORY_DEMANDS) throw new Error('ORDER_COMPLEXITY_LIMIT')
    }
    const componentIds = Array.from(new Set(Array.from(productById.values()).flatMap(product => product?.type === 'COMBO' ? (product.components ?? []).map(component => component.productId) : [])))
      .filter(id => !productById.has(id))
    const componentSnapshots = await Promise.all(componentIds.map(id => transaction.get(productCollection().doc(id))))
    componentSnapshots.forEach(snapshot => productById.set(snapshot.id, snapshot.exists ? mapProduct(snapshot.id, snapshot.data() ?? {}) : null))
    const categoryIds = Array.from(productById.values()).flatMap(product => product?.categoryId ? [product.categoryId] : [])
    const visibleCategories = await activeCategoryIds(transaction, categoryIds)
    const resolvedLines = canonical.items.map(line => {
      const product = productById.get(line.productId)
      if (!product || !isProductPubliclyVisible(product, visibleCategories)) throw new Error('ORDER_PRODUCT_UNAVAILABLE')
      return resolveOrderLine(product, line.variantId, line.quantity, new Date(nowMs), productById, visibleCategories)
    })
    const items = resolvedLines.map(line => line.item)
    const inventoryMap = new Map<string, InventoryDemand>()
    for (const line of resolvedLines) for (const demand of line.demands) {
      const key = JSON.stringify([demand.productId, demand.variantId])
      const current = inventoryMap.get(key)
      inventoryMap.set(key, { ...demand, quantity: (current?.quantity ?? 0) + demand.quantity })
    }
    const inventoryItems = Array.from(inventoryMap.values())
    if (inventoryItems.length > MAX_ORDER_INVENTORY_DEMANDS) throw new Error('ORDER_COMPLEXITY_LIMIT')
    for (const demand of inventoryItems) {
      const product = productById.get(demand.productId)
      if (!product) throw new Error('ORDER_PRODUCT_UNAVAILABLE')
      const variant = demand.variantId ? product.variants?.find(item => item.id === demand.variantId) : null
      const available = demand.variantId ? variant?.stock ?? 0 : product.stock
      if (demand.variantId && !variant) throw new Error('ORDER_VARIANT_UNAVAILABLE')
      if (available < demand.quantity) throw new Error('ORDER_INSUFFICIENT_STOCK')
    }
    const reservationSpecs = inventoryItems.map(item => ({ productId: item.productId, key: item.variantId ? `variant_${encodeURIComponent(item.variantId)}` : 'base' }))
    const reservationRefs = Array.from(new Map(reservationSpecs.map(spec => [`${spec.productId}:${spec.key}`, reservationRefFor(spec)])).values())
    const reservationSnapshots = await Promise.all(reservationRefs.map(reference => transaction.get(reference)))
    const updatedById = new Map<string, Product>()
    for (const demand of inventoryItems) {
      const product = updatedById.get(demand.productId) ?? productById.get(demand.productId)!
      if (demand.variantId) {
        let found = false
        const variants = (product.variants ?? []).map(variant => {
          if (variant.id !== demand.variantId) return variant
          found = true
          return { ...variant, stock: variant.stock - demand.quantity }
        })
        if (!found) throw new Error('ORDER_VARIANT_UNAVAILABLE')
        updatedById.set(product.id, { ...product, variants, stock: variants.reduce((sum, variant) => sum + variant.stock, 0) })
      } else updatedById.set(product.id, { ...product, stock: product.stock - demand.quantity })
    }
    const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal), 0)
    if (!Number.isSafeInteger(subtotal)) throw new Error('ORDER_PRICE_UNAVAILABLE')
    const createdAt = Timestamp.fromMillis(nowMs)
    updatedById.forEach((product, id) => {
      const patch: Record<string, unknown> = { stock: product.stock, updatedAt: createdAt }
      if (product.hasVariants) patch.variants = product.variants
      transaction.update(productCollection().doc(id), patch)
    })
    reservationRefs.forEach((reference, index) => {
      const snapshot = reservationSnapshots[index]
      transaction.set(reference, { orderCount: Number(snapshot.data()?.orderCount ?? 0) + 1, updatedAt: createdAt }, { merge: true })
    })
    transaction.create(orderRef, {
      orderCode, customer: canonical.customer, shippingConsent: canonical.shippingConsent, shippingConsentAt: canonical.shippingConsent ? createdAt : null,
      items, subtotal, shippingFee: null, total: null, shippingStatus: 'PENDING_QUOTE',
      status: 'PENDING', paymentMethod: 'COD', paymentStatus: 'UNPAID', stockReserved: true, stockRestored: false,
      inventoryReservations: reservationRefs.map(reference => ({ productId: reference.parent.parent?.id, key: reference.id })),
      inventoryItems,
      statusHistory: [{ status: 'PENDING', at: createdAt, actor: 'customer', note: 'Đơn hàng được tạo' }],
      searchPrefixes: Array.from(new Set([...searchPrefixes(canonical.customer.name), ...searchPrefixes(canonical.customer.phone), orderCode.toLocaleLowerCase('en-US').slice(0, 20)])),
      createdAt, updatedAt: createdAt,
    })
    transaction.create(requestRef, { orderId: orderRef.id, orderCode, payloadHash, createdAt })
    transaction.create(codeRef, { orderId: orderRef.id, createdAt })
    transaction.create(tokenRef, { orderId: orderRef.id, createdAt })
    transaction.set(rateRef, { windowStart: count ? windowStart : nowMs, count: count + 1, updatedAt: createdAt }, { merge: true })
    return { orderId: orderRef.id, orderCode, created: true }
  })
  if (result.created) invalidateProductCatalog()
  return { ...result, accessToken }
}

export async function lookupGuestOrder(accessToken: string) {
  if (typeof accessToken !== 'string' || accessToken.length < 32 || accessToken.length > 256) return null
  const tokenHash = hash(accessToken)
  const tokenSnapshot = await tokens().doc(tokenHash).get()
  if (!tokenSnapshot.exists) return null
  const orderSnapshot = await orders().doc(String(tokenSnapshot.data()?.orderId ?? '')).get()
  return orderSnapshot.exists ? sanitizePublicOrder(orderSnapshot.data() ?? {}) : null
}

export async function acceptGuestOrderTotal(accessToken: string) {
  if (typeof accessToken !== 'string' || accessToken.length < 32 || accessToken.length > 256) throw new Error('ORDER_ACCESS_TOKEN_INVALID')
  const tokenRef = tokens().doc(hash(accessToken))
  return getAdminDb().runTransaction(async transaction => {
    const tokenSnapshot = await transaction.get(tokenRef)
    if (!tokenSnapshot.exists) throw new Error('ORDER_ACCESS_TOKEN_INVALID')
    const orderRef = orders().doc(String(tokenSnapshot.data()?.orderId ?? ''))
    const orderSnapshot = await transaction.get(orderRef)
    if (!orderSnapshot.exists) throw new Error('ORDER_NOT_FOUND')
    const order = orderSnapshot.data() ?? {}
    if (order.customerAcceptedTotalAt) return sanitizePublicOrder(order)
    if (order.status !== 'PENDING') throw new Error('ORDER_NOT_PENDING')
    if (!Number.isSafeInteger(order.shippingFee) || !Number.isSafeInteger(order.total) || order.total !== Number(order.subtotal) + Number(order.shippingFee)) throw new Error('ORDER_SHIPPING_FEE_REQUIRED')
    const now = Timestamp.now()
    const acceptanceEvent = { status: 'PENDING', at: now, actor: 'customer', action: 'accept_total', note: 'Khách đồng ý phí vận chuyển và tổng thanh toán' }
    transaction.update(orderRef, {
      customerAcceptedTotalAt: now,
      customerAcceptedTotalBy: 'customer-token',
      customerAcceptanceSource: 'guest-token',
      updatedAt: now,
      statusHistory: [...(Array.isArray(order.statusHistory) ? order.statusHistory : []), acceptanceEvent],
    })
    return sanitizePublicOrder({ ...order, customerAcceptedTotalAt: now, statusHistory: [...(Array.isArray(order.statusHistory) ? order.statusHistory : []), acceptanceEvent] })
  })
}

export async function getAdminOrder(id: string) {
  const snapshot = await orders().doc(id).get()
  if (!snapshot.exists) return null
  return serializeAdminValue({ id: snapshot.id, ...snapshot.data() })
}

export async function listAdminOrders(options: { status?: string; search?: string; cursor?: string; from?: number; to?: number; limit?: number }) {
  const limit = Math.min(50, Math.max(1, options.limit ?? 25))
  let query: FirebaseFirestore.Query = orders()
  if (options.status && options.status !== 'ALL') query = query.where('status', '==', options.status)
  if (options.search) query = query.where('searchPrefixes', 'array-contains', normalizeOrderSearchQuery(options.search))
  if (options.from) query = query.where('createdAt', '>=', Timestamp.fromMillis(options.from))
  if (options.to) query = query.where('createdAt', '<=', Timestamp.fromMillis(options.to))
  query = query.orderBy('createdAt', 'desc').orderBy(FieldPath.documentId(), 'desc')
  if (options.cursor) {
    const cursor = await orders().doc(options.cursor).get()
    if (cursor.exists) query = query.startAfter(cursor)
  }
  const [snapshot, pending, shipping] = await Promise.all([
    query.limit(limit + 1).get(),
    orders().where('status', '==', 'PENDING').count().get(),
    orders().where('status', '==', 'SHIPPING').count().get(),
  ])
  const docs = snapshot.docs.slice(0, limit)
  return {
    orders: docs.map(document => serializeAdminValue({ id: document.id, ...document.data() })),
    nextCursor: snapshot.docs.length > limit ? docs.at(-1)?.id ?? null : null,
    counts: { pending: pending.data().count, shipping: shipping.data().count },
  }
}

function requireTransition(status: OrderStatus, action: string) {
  if (!canTransitionOrder(status, action)) throw new Error('ORDER_INVALID_TRANSITION')
}

export async function updateAdminOrder(id: string, action: string, input: Record<string, unknown>, actorId: string) {
  const orderRef = orders().doc(id)
  await getAdminDb().runTransaction(async transaction => {
    const orderSnapshot = await transaction.get(orderRef)
    if (!orderSnapshot.exists) throw new Error('ORDER_NOT_FOUND')
    const order = orderSnapshot.data() ?? {}
    const status = String(order.status) as OrderStatus
    requireTransition(status, action)
    const now = Timestamp.now()
    const items = Array.isArray(order.items) ? order.items as Array<Record<string, any>> : []
    const inventoryItems = Array.isArray(order.inventoryItems)
      ? order.inventoryItems as Array<{ productId: string; variantId: string | null; quantity: number }>
      : items.map(item => ({ productId: String(item.productId), variantId: typeof item.variantId === 'string' ? item.variantId : null, quantity: Number(item.quantity) }))
    const reservations = Array.isArray(order.inventoryReservations) ? order.inventoryReservations as Array<{ productId: string; key: string }> : []
    if (action === 'restore_failed_return' && order.stockRestored === true) throw new Error('ORDER_INVALID_TRANSITION')
    if (action === 'mark_cod_paid' && order.paymentStatus === 'PAID') throw new Error('ORDER_INVALID_TRANSITION')
    const release = action === 'cancel' || action === 'deliver' || action === 'restore_failed_return'
    const restoreStock = shouldRestoreInventory(order.stockRestored === true, action)
    if (action === 'set_shipping_fee') {
      const fee = input.shippingFee
      if (!Number.isSafeInteger(fee) || Number(fee) < 0 || Number(fee) > 100_000_000) throw new Error('ORDER_INVALID_SHIPPING_FEE')
      if (!Number.isSafeInteger(Number(order.subtotal) + Number(fee))) throw new Error('ORDER_INVALID_SHIPPING_FEE')
    }
    if (action === 'fail' && !cleanString(input.reason, 300)) throw new Error('ORDER_FAILURE_REASON_REQUIRED')
    if (action === 'accept_customer_total' && order.customerAcceptedTotalAt) throw new Error('ORDER_ALREADY_ACCEPTED')
    if (action === 'accept_customer_total' && (!Number.isSafeInteger(order.total) || order.shippingFee === null)) throw new Error('ORDER_SHIPPING_FEE_REQUIRED')
    if (action === 'confirm' && !canConfirmOrder(order as { subtotal: number; shippingFee: number | null; total: number | null; customerAcceptedTotalAt?: unknown })) throw new Error('ORDER_CUSTOMER_ACCEPTANCE_REQUIRED')
    if (action === 'mark_cod_paid' && order.paymentMethod !== 'COD') throw new Error('ORDER_NOT_COD')
    const productIds = restoreStock ? Array.from(new Set(inventoryItems.map(item => String(item.productId)))) : []
    const productRefs = productIds.map(productId => productCollection().doc(productId))
    const reservationRefs = release ? reservations.map(item => productCollection().doc(item.productId).collection('orderReservations').doc(item.key)) : []
    const [productSnapshots, reservationSnapshots] = await Promise.all([
      Promise.all(productRefs.map(reference => transaction.get(reference))),
      Promise.all(reservationRefs.map(reference => transaction.get(reference))),
    ])
    const productById = new Map(productSnapshots.map(snapshot => [snapshot.id, snapshot.exists ? mapProduct(snapshot.id, snapshot.data() ?? {}) : null]))
    if (restoreStock && !order.stockRestored) {
      for (const item of inventoryItems) {
        const product = productById.get(String(item.productId))
        if (!product) throw new Error('ORDER_INVENTORY_RESTORE_FAILED')
        if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new Error('ORDER_INVENTORY_RESTORE_FAILED')
        if (item.variantId) {
          const variants = (product.variants ?? []).map(variant => variant.id === item.variantId ? { ...variant, stock: variant.stock + Number(item.quantity) } : variant)
          if (!variants.some(variant => variant.id === item.variantId)) throw new Error('ORDER_INVENTORY_RESTORE_FAILED')
          productById.set(product.id, { ...product, variants, stock: variants.reduce((sum, variant) => sum + variant.stock, 0) })
        } else productById.set(product.id, { ...product, stock: product.stock + Number(item.quantity) })
      }
      productById.forEach((product, productId) => {
        if (!product) return
        const patch: Record<string, unknown> = { stock: product.stock, updatedAt: now }
        if (product.hasVariants) patch.variants = product.variants
        transaction.update(productCollection().doc(productId), patch)
      })
    }
    if (release && order.stockReserved === true) {
      reservationRefs.forEach((reference, index) => {
        const snapshot = reservationSnapshots[index]
        if (!snapshot.exists || Number(snapshot.data()?.orderCount ?? 0) < 1) throw new Error('ORDER_RESERVATION_INCONSISTENT')
        transaction.update(reference, { orderCount: FieldValue.increment(-1), updatedAt: now })
      })
    }
    const patch: Record<string, unknown> = { updatedAt: now }
    const nextStatus = nextOrderStatus(status, action)
    if (nextStatus !== status) patch.status = nextStatus
    if (action === 'set_shipping_fee') {
      patch.shippingFee = Number(input.shippingFee)
      patch.total = Number(order.subtotal) + Number(input.shippingFee)
      patch.shippingStatus = 'CONFIRMED'
      patch.customerAcceptedTotalAt = null
      patch.customerAcceptedTotalBy = null
      patch.customerAcceptanceSource = null
    }
    if (action === 'accept_customer_total') {
      patch.customerAcceptedTotalAt = now
      patch.customerAcceptedTotalBy = actorId
      patch.customerAcceptanceSource = 'admin-phone'
    }
    if (action === 'fail') patch.failureReason = cleanString(input.reason, 300)
    if (action === 'mark_cod_paid') { patch.paymentStatus = 'PAID'; patch.paidAt = now; patch.paidBy = actorId }
    if (restoreStock && !order.stockRestored) patch.stockRestored = true
    if (release && order.stockReserved === true) patch.stockReserved = false
    const historyStatus = nextStatus === status ? status : nextStatus
    patch.statusHistory = [...(Array.isArray(order.statusHistory) ? order.statusHistory : []), {
      status: historyStatus, at: now, actor: actorId, action, note: action === 'fail' ? cleanString(input.reason, 300) : null,
    }]
    transaction.update(orderRef, patch)
  })
  invalidateProductCatalog()
  return getAdminOrder(id)
}

import 'server-only'
import { randomInt } from 'node:crypto'
import { FieldValue, Timestamp, type DocumentSnapshot } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { getAdminCategory, getPublicCategoryBySlug } from '@/lib/product-categories/service'
import { getPublicProductById } from '@/lib/products/service'
import { generateShortCode, isValidShortCode } from './codes'
import {
  getShortCodeFromPath,
  getShortLinkSiteOrigin,
  isValidShortCodeFormat,
  normalizeShortLinkSearch,
  normalizeShortLinkTargetUrl,
  ShortLinkUrlError,
} from './rules'
import type { CreateShortLinkInput, ListShortLinksOptions, ShortLink, ShortLinkRedirectType, ShortLinkTargetType, ShortLinkStatus } from './types'

const collection = () => getAdminDb().collection('shortLinks')
const CLICK_SHARDS = 10
const MAX_SCANNED_LINKS_PER_PAGE = 500
const SCAN_CHUNK_SIZE = 100

interface ShortLinkRecord {
  code: string
  targetType: ShortLinkTargetType
  targetId: string | null
  targetUrl: string
  title: string
  titleSearch: string
  status: ShortLinkStatus
  redirectType: ShortLinkRedirectType
  createdAt: unknown
  updatedAt: unknown
  createdBy?: string
}

function isTargetType(value: unknown): value is ShortLinkTargetType {
  return value === 'product' || value === 'article' || value === 'category' || value === 'game' || value === 'custom'
}

function recordFromSnapshot(snapshot: DocumentSnapshot): ShortLinkRecord | null {
  if (!snapshot.exists) return null
  const data = snapshot.data() ?? {}
  if (!isTargetType(data.targetType) || typeof data.targetUrl !== 'string'
    || (data.status !== 'ACTIVE' && data.status !== 'DISABLED')) return null
  return {
    code: snapshot.id,
    targetType: data.targetType,
    targetId: typeof data.targetId === 'string' ? data.targetId : null,
    targetUrl: data.targetUrl,
    title: typeof data.title === 'string' ? data.title : '',
    titleSearch: typeof data.titleSearch === 'string' ? data.titleSearch : normalizeShortLinkSearch(typeof data.title === 'string' ? data.title : ''),
    status: data.status,
    redirectType: data.redirectType === 301 ? 301 : 302,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    ...(typeof data.createdBy === 'string' ? { createdBy: data.createdBy } : {}),
  }
}

function toIso(value: unknown) {
  return value instanceof Timestamp ? value.toDate().toISOString() : value instanceof Date ? value.toISOString() : null
}

function encodeCursor(code: string) {
  return Buffer.from(code).toString('base64url')
}

function decodeCursor(cursor: string) {
  try {
    const value = Buffer.from(cursor, 'base64url').toString('utf8')
    return isValidShortCodeFormat(value) ? value : null
  } catch { return null }
}

function isAlreadyExists(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  const code = error.code
  return code === 6 || code === 'already-exists'
}

async function resolveTargetUrl(targetType: ShortLinkTargetType, targetId: string | null, targetUrl: string | undefined) {
  const origin = getShortLinkSiteOrigin()
  if (targetType === 'product') {
    if (!targetId) throw new Error('SHORT_LINK_TARGET_REQUIRED')
    const product = await getPublicProductById(targetId)
    if (!product) throw new Error('SHORT_LINK_TARGET_NOT_FOUND')
    return normalizeShortLinkTargetUrl(`/products/${encodeURIComponent(product.slug)}`, targetType, origin)
  }
  if (targetType === 'category') {
    if (!targetId) throw new Error('SHORT_LINK_TARGET_REQUIRED')
    const category = await getAdminCategory(targetId)
    const publicCategory = category ? await getPublicCategoryBySlug(category.slug) : null
    if (!category || !publicCategory) throw new Error('SHORT_LINK_TARGET_NOT_FOUND')
    return normalizeShortLinkTargetUrl(`/categories/${encodeURIComponent(publicCategory.slug)}`, targetType, origin)
  }
  if (!targetUrl) throw new Error('SHORT_LINK_TARGET_URL_REQUIRED')
  return normalizeShortLinkTargetUrl(targetUrl, targetType, origin)
}

async function assertNotShortLinkDestination(targetUrl: string, code: string) {
  const origin = getShortLinkSiteOrigin()
  let destination: URL
  try { destination = new URL(targetUrl, origin) } catch { throw new ShortLinkUrlError('SHORT_LINK_INVALID_URL') }
  const destinationCode = getShortCodeFromPath(destination.pathname)
  if (!destinationCode) return
  if (destinationCode === code) throw new Error('SHORT_LINK_REDIRECT_LOOP')
  const existing = await collection().doc(destinationCode).get()
  if (existing.exists) throw new Error('SHORT_LINK_TARGET_IS_SHORT_LINK')
}

async function countClicks(code: string) {
  const snapshot = await collection().doc(code).collection('clicks').select('count').get()
  return snapshot.docs.reduce((total, shard) => {
    const count = shard.data().count
    return total + (typeof count === 'number' && Number.isSafeInteger(count) && count > 0 ? count : 0)
  }, 0)
}

async function resolveCurrentTargetUrl(record: ShortLinkRecord) {
  if (record.targetType === 'product' && record.targetId) {
    const product = await getPublicProductById(record.targetId)
    return product ? `/products/${encodeURIComponent(product.slug)}` : null
  }
  if (record.targetType === 'category' && record.targetId) {
    const category = await getAdminCategory(record.targetId)
    const publicCategory = category ? await getPublicCategoryBySlug(category.slug) : null
    return publicCategory ? `/categories/${encodeURIComponent(publicCategory.slug)}` : null
  }
  return record.targetUrl
}

async function toShortLink(record: ShortLinkRecord): Promise<ShortLink> {
  const [clickCount, resolvedTargetUrl] = await Promise.all([
    countClicks(record.code),
    resolveCurrentTargetUrl(record),
  ])
  return {
    code: record.code,
    targetType: record.targetType,
    targetId: record.targetId,
    targetUrl: record.targetUrl,
    title: record.title,
    status: record.status,
    redirectType: record.redirectType,
    clickCount,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
    resolvedTargetUrl,
    ...(record.createdBy ? { createdBy: record.createdBy } : {}),
  }
}

export async function createShortLink(input: CreateShortLinkInput, createdBy: string) {
  if (input.mode !== 'auto' && input.mode !== 'manual') throw new Error('SHORT_LINK_INVALID_MODE')
  if (!isTargetType(input.targetType)) throw new Error('SHORT_LINK_INVALID_TARGET_TYPE')
  const targetId = typeof input.targetId === 'string' && input.targetId.trim() ? input.targetId.trim() : null
  if (targetId && targetId.length > 180) throw new Error('SHORT_LINK_INVALID_TARGET_ID')
  const title = input.title?.trim() ?? ''
  if (title.length > 160) throw new Error('SHORT_LINK_TITLE_TOO_LONG')
  const targetUrl = await resolveTargetUrl(input.targetType, targetId, input.targetUrl)

  if (input.mode === 'manual') {
    const code = input.customCode?.trim() ?? ''
    if (!isValidShortCode(code)) throw new Error('SHORT_LINK_INVALID_CODE')
    await assertNotShortLinkDestination(targetUrl, code)
    const reference = collection().doc(code)
    try {
      await reference.create({
        code,
        targetType: input.targetType,
        targetId,
        targetUrl,
        title,
        titleSearch: normalizeShortLinkSearch(title),
        status: 'ACTIVE',
        redirectType: 302,
        clickCount: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy,
      })
    } catch (error) {
      if (isAlreadyExists(error)) throw new Error('SHORT_LINK_CODE_TAKEN')
      throw error
    }
    return code
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateShortCode(6)
    await assertNotShortLinkDestination(targetUrl, code)
    const reference = collection().doc(code)
    try {
      await reference.create({
        code,
        targetType: input.targetType,
        targetId,
        targetUrl,
        title,
        titleSearch: normalizeShortLinkSearch(title),
        status: 'ACTIVE',
        redirectType: 302,
        clickCount: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy,
      })
      return code
    } catch (error) {
      if (isAlreadyExists(error)) continue
      throw error
    }
  }
  throw new Error('SHORT_LINK_CODE_RETRIES_EXHAUSTED')
}

export async function getShortLinkRecord(code: string) {
  if (!isValidShortCode(code)) return null
  return recordFromSnapshot(await collection().doc(code).get())
}

export async function getShortLink(code: string) {
  const record = await getShortLinkRecord(code)
  return record ? toShortLink(record) : null
}

export async function resolveShortLinkDestination(record: ShortLinkRecord) {
  if (record.status !== 'ACTIVE') return null
  const targetUrl = record.targetType === 'product' || record.targetType === 'category'
    ? await resolveTargetUrl(record.targetType, record.targetId, record.targetUrl)
    : normalizeShortLinkTargetUrl(record.targetUrl, record.targetType, getShortLinkSiteOrigin())
  try {
    await assertNotShortLinkDestination(targetUrl, record.code)
  } catch {
    return null
  }
  return targetUrl
}

export async function recordShortLinkClick(code: string) {
  const shardId = String(randomInt(CLICK_SHARDS)).padStart(2, '0')
  await collection().doc(code).collection('clicks').doc(shardId).set({
    count: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
}

export async function listShortLinks(options: ListShortLinksOptions) {
  const limit = Math.min(50, Math.max(1, options.limit))
  const normalizedSearch = normalizeShortLinkSearch(options.search ?? '')
  let cursorSnapshot: DocumentSnapshot | null = null
  if (options.cursor) {
    const cursorCode = decodeCursor(options.cursor)
    if (!cursorCode) throw new Error('SHORT_LINK_INVALID_CURSOR')
    cursorSnapshot = await collection().doc(cursorCode).get()
    if (!cursorSnapshot.exists) throw new Error('SHORT_LINK_INVALID_CURSOR')
  }

  const matched: ShortLinkRecord[] = []
  let lastScanned: DocumentSnapshot | null = cursorSnapshot
  let scanned = 0
  let exhausted = false

  while (matched.length <= limit && scanned < MAX_SCANNED_LINKS_PER_PAGE) {
    const batchSize = Math.min(SCAN_CHUNK_SIZE, MAX_SCANNED_LINKS_PER_PAGE - scanned)
    let query: FirebaseFirestore.Query = collection().orderBy('createdAt', 'desc')
    if (lastScanned) query = query.startAfter(lastScanned)
    const snapshot = await query.limit(batchSize).get()
    if (!snapshot.docs.length) { exhausted = true; break }

    for (const document of snapshot.docs) {
      lastScanned = document
      scanned += 1
      const record = recordFromSnapshot(document)
      if (!record) continue
      if (options.targetType && record.targetType !== options.targetType) continue
      if (options.status && record.status !== options.status) continue
      if (options.targetId && record.targetId !== options.targetId) continue
      if (normalizedSearch && !record.code.includes(normalizedSearch) && !record.titleSearch.includes(normalizedSearch)) continue
      matched.push(record)
      if (matched.length > limit) break
    }

    if (matched.length > limit) break
    if (snapshot.docs.length < batchSize) { exhausted = true; break }
  }

  const hasLookahead = matched.length > limit
  const page = matched.slice(0, limit)
  const nextCursor = hasLookahead
    ? encodeCursor(page[page.length - 1].code)
    : !exhausted && lastScanned ? encodeCursor(lastScanned.id) : null

  return {
    links: await Promise.all(page.map(toShortLink)),
    nextCursor,
  }
}

export async function updateShortLink(code: string, changes: {
  title?: string
  targetUrl?: string
  status?: ShortLinkStatus
  redirectType?: ShortLinkRedirectType
}) {
  if (!isValidShortCode(code)) throw new Error('SHORT_LINK_INVALID_CODE')
  const reference = collection().doc(code)
  const record = recordFromSnapshot(await reference.get())
  if (!record) return null
  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }

  if (changes.title !== undefined) {
    if (typeof changes.title !== 'string' || changes.title.trim().length > 160) throw new Error('SHORT_LINK_TITLE_TOO_LONG')
    const title = changes.title.trim()
    update.title = title
    update.titleSearch = normalizeShortLinkSearch(title)
  }
  if (changes.status !== undefined) {
    if (changes.status !== 'ACTIVE' && changes.status !== 'DISABLED') throw new Error('SHORT_LINK_INVALID_STATUS')
    update.status = changes.status
  }
  if (changes.redirectType !== undefined) {
    if (changes.redirectType !== 301 && changes.redirectType !== 302) throw new Error('SHORT_LINK_INVALID_REDIRECT_TYPE')
    update.redirectType = changes.redirectType
  }
  if (changes.targetUrl !== undefined) {
    if (record.targetType !== 'custom') throw new Error('SHORT_LINK_TARGET_URL_NOT_EDITABLE')
    const targetUrl = normalizeShortLinkTargetUrl(changes.targetUrl, record.targetType, getShortLinkSiteOrigin())
    await assertNotShortLinkDestination(targetUrl, code)
    update.targetUrl = targetUrl
  }

  await reference.update(update)
  return getShortLink(code)
}

export function isShortLinkTargetType(value: unknown): value is ShortLinkTargetType {
  return isTargetType(value)
}

export function isShortLinkStatus(value: unknown): value is ShortLinkStatus {
  return value === 'ACTIVE' || value === 'DISABLED'
}

export function isShortLinkRedirectType(value: unknown): value is ShortLinkRedirectType {
  return value === 301 || value === 302
}

import { isIP } from 'node:net'
import type { ShortLinkTargetType } from './types'
import { isReservedShortCode } from './code-format'

export { RESERVED_SHORT_LINK_CODES, isReservedShortCode, isValidShortCodeFormat } from './code-format'

export class ShortLinkUrlError extends Error {
  constructor(readonly code: 'SHORT_LINK_INVALID_URL' | 'SHORT_LINK_UNSAFE_URL' | 'SHORT_LINK_SENSITIVE_ROUTE') {
    super(code)
    this.name = 'ShortLinkUrlError'
  }
}

export function getShortCodeFromPath(pathname: string) {
  let decoded: string
  try { decoded = decodeURIComponent(pathname) } catch { return null }
  const match = /^\/([a-z0-9]{4,32})\/?$/.exec(decoded)
  const code = match?.[1]
  return code && !isReservedShortCode(code) ? code : null
}

export function normalizeShortLinkSearch(value: string) {
  return value.trim().toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
}

function isPrivateIp(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true
  const ipVersion = isIP(host)
  if (ipVersion === 4) {
    const [a, b] = host.split('.').map(Number)
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19))
      || a >= 224
  }
  if (ipVersion === 6) {
    // Reject local, link-local, multicast, and mapped IPv4 addresses conservatively.
    return host === '::' || host === '::1' || host.startsWith('::ffff:')
      || /^f[cd]/.test(host) || /^fe[89ab]/.test(host) || /^ff/.test(host)
  }
  return false
}

function isSensitivePath(pathname: string) {
  let decoded: string
  try { decoded = decodeURIComponent(pathname).toLowerCase() } catch { return true }
  return /^\/(?:admin|api)(?:\/|$)/.test(decoded)
}

function normalizeSiteOrigin(siteOrigin: string) {
  try {
    const url = new URL(siteOrigin)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error()
    return url.origin
  } catch {
    return 'https://shopbebang.com'
  }
}

export function normalizeShortLinkTargetUrl(value: unknown, targetType: ShortLinkTargetType, siteOrigin: string) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) throw new ShortLinkUrlError('SHORT_LINK_INVALID_URL')
  const raw = value.trim()
  if (/^[\u0000-\u0020]/.test(raw) || raw.startsWith('//') || raw.startsWith('/\\') || raw.includes('\\'))
    throw new ShortLinkUrlError('SHORT_LINK_UNSAFE_URL')

  const origin = normalizeSiteOrigin(siteOrigin)
  let url: URL
  try {
    if (raw.startsWith('/')) url = new URL(raw, origin)
    else url = new URL(raw)
  } catch {
    throw new ShortLinkUrlError('SHORT_LINK_INVALID_URL')
  }

  if (url.username || url.password) throw new ShortLinkUrlError('SHORT_LINK_UNSAFE_URL')
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new ShortLinkUrlError('SHORT_LINK_UNSAFE_URL')

  const configuredHost = new URL(origin).hostname.toLowerCase()
  const knownShopHost = ['shopbebang.com', 'www.shopbebang.com'].includes(url.hostname.toLowerCase())
  const isInternal = url.origin === origin || knownShopHost || url.hostname.toLowerCase() === configuredHost
  if (isInternal) {
    if (isSensitivePath(url.pathname)) throw new ShortLinkUrlError('SHORT_LINK_SENSITIVE_ROUTE')
    return `${url.pathname}${url.search}${url.hash}`
  }

  if (targetType !== 'custom') throw new ShortLinkUrlError('SHORT_LINK_UNSAFE_URL')
  if (isPrivateIp(url.hostname)) throw new ShortLinkUrlError('SHORT_LINK_UNSAFE_URL')
  return url.toString()
}

export function getShortLinkSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
    ?? process.env.VERCEL_PROJECT_PRODUCTION_URL
    ?? process.env.VERCEL_URL
    ?? (process.env.NODE_ENV === 'production' ? 'https://shopbebang.com' : 'http://localhost:3000')
  const value = configured.startsWith('http') ? configured : `https://${configured}`
  return normalizeSiteOrigin(value)
}

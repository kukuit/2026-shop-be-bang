export const RESERVED_SHORT_LINK_CODES = new Set([
  'admin', 'api', 'auth', 'cart', 'categories', 'category', 'checkout', 'demo', 'game', 'order', 'orders',
  'products', 'product', 'blog', 'articles', 'article', 'login', 'register', 'profile', 'account', 'search',
  'sale', 'favicon.ico', 'robots.txt', 'sitemap.xml', '_next', 'favicon', 'icon', 'apple-icon',
])

export function isValidShortCodeFormat(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9]{4,32}$/.test(value)
}

export function isReservedShortCode(value: string) {
  return RESERVED_SHORT_LINK_CODES.has(value.toLowerCase())
}

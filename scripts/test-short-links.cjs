const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const createLoader = require('./lib/load-project-ts.cjs')

const root = path.resolve(__dirname, '..')
const load = createLoader()
const { generateShortCode, isValidShortCode } = load('src/lib/short-links/codes.ts')
const { getShortCodeFromPath, normalizeShortLinkTargetUrl } = load('src/lib/short-links/rules.ts')

test('automatic and custom codes use lowercase letters and digits, with reserved routes blocked', () => {
  for (let index = 0; index < 100; index += 1) {
    const code = generateShortCode()
    assert.match(code, /^[a-z0-9]{6}$/)
    assert.equal(isValidShortCode(code), true)
  }
  assert.equal(isValidShortCode('bang26'), true)
  assert.equal(isValidShortCode('Sale26'), false)
  assert.equal(isValidShortCode('ab/cd'), false)
  assert.equal(isValidShortCode('admin'), false)
  assert.equal(isValidShortCode('checkout'), false)
})

test('root path resolver accepts a code path and rejects reserved or nested routes', () => {
  assert.equal(getShortCodeFromPath('/abc123'), 'abc123')
  assert.equal(getShortCodeFromPath('/abc123/'), 'abc123')
  assert.equal(getShortCodeFromPath('/admin'), null)
  assert.equal(getShortCodeFromPath('/abc123/extra'), null)
})

test('target URL validation allows internal paths and safe custom URLs only', () => {
  assert.equal(normalizeShortLinkTargetUrl('/products/dam-be?from=fb#buy', 'product', 'https://shopbebang.com'), '/products/dam-be?from=fb#buy')
  assert.equal(normalizeShortLinkTargetUrl('https://example.com/sale', 'custom', 'https://shopbebang.com'), 'https://example.com/sale')
  assert.throws(() => normalizeShortLinkTargetUrl('https://example.com/sale', 'game', 'https://shopbebang.com'), /SHORT_LINK_UNSAFE_URL/)
  assert.throws(() => normalizeShortLinkTargetUrl('/admin/users', 'custom', 'https://shopbebang.com'), /SHORT_LINK_SENSITIVE_ROUTE/)
  assert.throws(() => normalizeShortLinkTargetUrl('javascript:alert(1)', 'custom', 'https://shopbebang.com'), /SHORT_LINK_UNSAFE_URL/)
  assert.throws(() => normalizeShortLinkTargetUrl('https://user:pass@example.com/', 'custom', 'https://shopbebang.com'), /SHORT_LINK_UNSAFE_URL/)
  assert.throws(() => normalizeShortLinkTargetUrl('http://127.0.0.1/', 'custom', 'https://shopbebang.com'), /SHORT_LINK_UNSAFE_URL/)
})

test('short links stay server-side, dynamic product slugs resolve by id, and counters are best effort', () => {
  const route = fs.readFileSync(path.join(root, 'src/app/[shortCode]/route.ts'), 'utf8')
  const service = fs.readFileSync(path.join(root, 'src/lib/short-links/service.ts'), 'utf8')
  const api = fs.readFileSync(path.join(root, 'src/app/api/admin/short-links/route.ts'), 'utf8')
  assert.match(route, /runtime = 'nodejs'/)
  assert.match(route, /recordShortLinkClick\(code\)\.catch/)
  assert.match(service, /getPublicProductById\(record\.targetId\)/)
  assert.match(service, /reference\.create\(/)
  assert.match(service, /attempt < 10/)
  assert.match(api, /requireAdminForApi\(\)/)
})

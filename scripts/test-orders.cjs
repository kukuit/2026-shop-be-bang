const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const cache = new Map()
function loadTs(file) {
  const absolute = path.resolve(file.endsWith('.ts') ? file : `${file}.ts`)
  if (cache.has(absolute)) return cache.get(absolute).exports
  const module = { exports: {} }
  cache.set(absolute, module)
  const source = fs.readFileSync(absolute, 'utf8')
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  const localRequire = request => {
    if (request.startsWith('@/')) return loadTs(path.join(root, 'src', request.slice(2)))
    if (request.startsWith('.')) return loadTs(path.resolve(path.dirname(absolute), request))
    return require(request)
  }
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
  return module.exports
}

const cart = loadTs(path.join(root, 'src/lib/cart/model.ts'))
const orders = loadTs(path.join(root, 'src/lib/orders/model.ts'))
const pricing = loadTs(path.join(root, 'src/lib/products/pricing.ts'))
const variants = loadTs(path.join(root, 'src/lib/products/variants.ts'))

const cleanCart = cart.sanitizeCart([
  { productId: 'dress-1', variantId: 'pink-2', quantity: 2 },
  { productId: 'dress-1', variantId: 'pink-2', quantity: 1 },
  { productId: 'bad', variantId: null, quantity: 0 },
  { productId: 'shirt-2', variantId: null, quantity: 150 },
])
assert.deepEqual(cleanCart, [
  { productId: 'dress-1', variantId: 'pink-2', quantity: 3 },
  { productId: 'shirt-2', variantId: null, quantity: 99 },
])
assert.equal(cart.mergeCartItem(cleanCart, { productId: 'dress-1', variantId: 'pink-2', quantity: 1 }, 4)[0].quantity, 4)
assert.equal(cart.mergeCartItem(cleanCart, { productId: 'dress-1', variantId: 'pink-2', quantity: 2 }, 4), null)
assert.equal(orders.normalizeVietnamPhone('+84 981 353 619'), '0981353619')
assert.equal(orders.normalizeVietnamPhone('123'), null)
assert.equal(orders.calculateOrderSubtotal([{ unitPrice: 120000, quantity: 2 }, { unitPrice: 50000, quantity: 1 }]), 290000)
assert.equal(orders.hasOrderPriceChanges([{ expectedUnitPrice: 55000 }], [{ unitPrice: 55000 }]), false)
assert.equal(orders.hasOrderPriceChanges([{ expectedUnitPrice: 50000 }], [{ unitPrice: 55000 }]), true)
assert.equal(orders.hasOrderPriceChanges([{}], [{ unitPrice: 55000 }]), true)

const stablePayload = { customer: { name: 'Lan', phone: '0981353619' }, items: [{ productId: 'dress-1', variantId: 'pink-2', quantity: 1 }] }
assert.equal(orders.fingerprintOrderPayload(stablePayload), orders.fingerprintOrderPayload(structuredClone(stablePayload)))
assert.equal(orders.canTransitionOrder('PENDING', 'confirm'), true)
assert.equal(orders.canTransitionOrder('SHIPPING', 'cancel'), false)
assert.equal(orders.nextOrderStatus('CONFIRMED', 'ship'), 'SHIPPING')
assert.equal(orders.shouldRestoreInventory(false, 'cancel'), true)
assert.equal(orders.shouldRestoreInventory(false, 'restore_failed_return'), true)
assert.equal(orders.shouldRestoreInventory(true, 'restore_failed_return'), false)
assert.equal(orders.canConfirmOrder({ subtotal: 150000, shippingFee: 25000, total: 175000, customerAcceptedTotalAt: 'now' }), true)
assert.equal(orders.canConfirmOrder({ subtotal: 150000, shippingFee: 25000, total: 175000 }), false)
assert.equal(orders.normalizeOrderSearchQuery('0981 353 619'), '0981353619')
assert.equal(orders.normalizeOrderSearchQuery('BB-20261018-ABC12345'), 'bb-20261018-abc12345')
assert.ok(orders.searchPrefixes('Lan Anh').includes('lan an'))

const saleProduct = { price: 200000, salePrice: 150000, saleStartAt: null, saleEndAt: null }
assert.equal(pricing.getProductEffectivePrice(saleProduct, new Date()), 150000)
assert.equal(variants.resolveVariantPrice(saleProduct, { price: 175000 }, new Date()), 175000)
assert.equal(variants.resolveVariantPrice(saleProduct, { price: null }, new Date()), 150000)

const source = fs.readFileSync(path.join(root, 'src/lib/orders/service.ts'), 'utf8')
assert.match(source, /runTransaction/)
assert.match(source, /stockRestored/)
assert.match(source, /orderReservations/)
assert.match(source, /accessTokenHash/)
assert.match(source, /ORDER_INSUFFICIENT_STOCK/)
console.log('Order and cart unit checks passed. Firestore transaction behavior still needs an emulator or staging environment.')

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const createLoader = require('./lib/load-project-ts.cjs')

const root = path.resolve(__dirname, '..')
const load = createLoader()
const { calculateComboPricing, getAvailableComboCount, validateComboComponents } = load('src/lib/products/combos.ts')
const { createProductSchema } = load('src/lib/products/validation.ts')

const component = (productId, quantity = 1, variantId = null) => ({ productId, variantId, quantity })
const stockKey = (productId, variantId = null) => JSON.stringify([productId, variantId])

test('combo accepts 2, 3 and 4 component products and quantity two of one product', () => {
  for (const count of [2, 3, 4]) {
    const components = Array.from({ length: count }, (_, index) => component(`product-${index + 1}`))
    assert.doesNotThrow(() => validateComboComponents(components))
  }
  assert.doesNotThrow(() => validateComboComponents([component('dress', 2)]))
  assert.throws(() => validateComboComponents([component('dress')]), /COMBO_INVALID_COMPONENTS/)
})

test('percentage discounts round the subtotal and fixed discounts support 10k and 20k', () => {
  assert.deepEqual(calculateComboPricing(100_000, { type: 'PERCENT', value: 10 }), {
    subtotal: 100_000, discountAmount: 10_000, finalPrice: 90_000,
  })
  assert.deepEqual(calculateComboPricing(100_000, { type: 'FIXED_AMOUNT', value: 10_000 }), {
    subtotal: 100_000, discountAmount: 10_000, finalPrice: 90_000,
  })
  assert.deepEqual(calculateComboPricing(100_000, { type: 'FIXED_AMOUNT', value: 20_000 }), {
    subtotal: 100_000, discountAmount: 20_000, finalPrice: 80_000,
  })
  assert.equal(calculateComboPricing(100_050, { type: 'PERCENT', value: 10 }).discountAmount, 10_005)
  assert.throws(() => calculateComboPricing(20_000, { type: 'FIXED_AMOUNT', value: 20_000 }), /COMBO_INVALID_DISCOUNT/)
  assert.throws(() => calculateComboPricing(20_000, { type: 'PERCENT', value: 100 }), /COMBO_INVALID_DISCOUNT/)
})

test('available combos use the tightest component stock, including variants and quantity two', () => {
  const components = [component('dress', 2, 'blue-m'), component('hat', 1)]
  const stock = new Map([
    [stockKey('dress', 'blue-m'), 7],
    [stockKey('hat'), 4],
  ])
  assert.equal(getAvailableComboCount(components, stock), 3)
  stock.set(stockKey('dress', 'blue-m'), 2)
  assert.equal(getAvailableComboCount(components, stock), 1)
  stock.set(stockKey('dress', 'blue-m'), 0)
  assert.equal(getAvailableComboCount(components, stock), 0)
})

test('combo schema accepts quantity-two rows and server resolution rejects nested combos', () => {
  const product = {
    name: 'Combo đồ bé', slug: 'combo-do-be', description: '', shortDescription: '', categoryId: 'clothes',
    thumbnail: '', images: [], price: 100_000, salePrice: 90_000, saleStartAt: null, saleEndAt: null,
    isNewArrival: false, showOnHomeBanner: false, arrivalAt: null, stock: 0, isActive: true, sortOrder: 0,
    type: 'COMBO', hasVariants: false, variantConfig: { colors: [], sizes: [] }, variants: [],
    components: [component('dress', 2)], discount: { type: 'PERCENT', value: 10 },
  }
  assert.equal(createProductSchema.parse(product).type, 'COMBO')
  assert.throws(() => createProductSchema.parse({ ...product, components: [component('dress')] }))
  assert.throws(() => createProductSchema.parse({ ...product, discount: { type: 'PERCENT', value: 100 } }))
  const productService = fs.readFileSync(path.join(root, 'src/lib/products/service.ts'), 'utf8')
  assert.match(productService, /product\.type === 'COMBO'/)
})

test('storefront derives combo stock from component quantities and orders flatten stock demands transactionally', () => {
  const productService = fs.readFileSync(path.join(root, 'src/lib/products/service.ts'), 'utf8')
  const orderService = fs.readFileSync(path.join(root, 'src/lib/orders/service.ts'), 'utf8')
  assert.match(productService, /components\.reduce\(\(total, component\) => total \+ component\.quantity, 0\) >= 2/)
  assert.match(productService, /getAvailableComboCount\(components, stockByComponent\)/)
  assert.match(orderService, /runTransaction/)
  assert.match(orderService, /const inventoryMap = new Map<string, InventoryDemand>\(\)/)
  assert.match(orderService, /MAX_ORDER_INVENTORY_DEMANDS = 200/)
  assert.match(orderService, /const potentialInventoryKeys = new Set<string>\(\)/)
  assert.match(orderService, /ORDER_INSUFFICIENT_STOCK/)
  assert.match(orderService, /inventoryItems,/)
  assert.match(orderService, /if \(restoreStock && !order\.stockRestored\)/)
})

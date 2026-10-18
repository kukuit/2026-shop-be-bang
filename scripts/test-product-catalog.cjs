const { test } = require('node:test')
const assert = require('node:assert/strict')
const createLoader = require('./lib/load-project-ts.cjs')

function loadDomain(mocks = {}) {
  return createLoader({
    'next/cache': { unstable_cache: callback => callback, revalidateTag: () => {}, revalidatePath: () => {} },
    'server-only': {},
    ...mocks,
  })
}

test('Vietnamese slug and sale pricing cover valid sale windows and exact boundaries', () => {
  const load = loadDomain()
  const { slugify } = load('src/lib/products/slug.ts')
  const pricing = load('src/lib/products/pricing.ts')
  assert.equal(slugify('  Đầm Bé Gái — Màu Hồng  '), 'dam-be-gai-mau-hong')
  const product = { price: 299000, salePrice: 179000, saleStartAt: '2026-10-16T00:00:00.000Z', saleEndAt: '2026-10-17T00:00:00.000Z' }
  assert.equal(pricing.isProductOnSale(product, new Date('2026-10-15T23:59:59.999Z')), false)
  assert.equal(pricing.isProductOnSale(product, new Date('2026-10-16T00:00:00.000Z')), true)
  assert.equal(pricing.isProductOnSale(product, new Date('2026-10-17T00:00:00.000Z')), true)
  assert.equal(pricing.isProductOnSale(product, new Date('2026-10-17T00:00:00.001Z')), false)
  assert.equal(pricing.getProductEffectivePrice(product, new Date('2026-10-16T12:00:00.000Z')), 179000)
  assert.equal(pricing.getProductDiscountPercent(product, new Date('2026-10-16T12:00:00.000Z')), 40)
  assert.equal(pricing.getProductDiscountPercent({ ...product, salePrice: 299000 }, new Date()), 0)
})

test('product and category schemas reject invalid sale data and internal write fields', () => {
  const load = loadDomain()
  const { createProductSchema, updateProductSchema } = load('src/lib/products/validation.ts')
  const { createProductCategorySchema } = load('src/lib/product-categories/validation.ts')
  const product = {
    name: 'Đầm hoa', slug: 'dam-hoa', description: '', shortDescription: '', categoryId: 'dam-be-gai',
    thumbnail: '', images: [], price: 299000, salePrice: 179000,
    saleStartAt: null, saleEndAt: null, isNewArrival: false, arrivalAt: null,
    stock: 3, isActive: true, sortOrder: 0,
  }
  assert.equal(createProductSchema.parse(product).price, 299000)
  assert.throws(() => createProductSchema.parse({ ...product, salePrice: 299000 }), /Giá sale phải thấp hơn giá gốc/)
  assert.throws(() => createProductSchema.parse({ ...product, saleStartAt: 'yesterday' }))
  assert.throws(() => updateProductSchema.parse({ createdAt: '2026-01-01T00:00:00Z' }))
  assert.equal(createProductCategorySchema.parse({ name: 'Đồ bộ', slug: 'do-bo', parentId: null, sortOrder: 0, isActive: true }).name, 'Đồ bộ')
})

test('product schema accepts Cloudinary metadata while enforcing eight images and the product namespace shape', () => {
  const load = loadDomain()
  const { createProductSchema, productImageSchema } = load('src/lib/products/validation.ts')
  const { isProductImagePublicIdFor } = load('src/lib/cloudinary.ts')
  const productId = 'product-1'
  const imageId = '11111111-1111-4111-8111-111111111111'
  const publicId = `shopbebang/products/${productId}/${imageId}`
  const url = `https://res.cloudinary.com/shop-cloud/image/upload/v123/${publicId}.webp`
  const image = { id: imageId, url, publicId, width: 1600, height: 1200, format: 'webp', alt: 'Đầm hoa', sortOrder: 0 }
  const product = {
    name: 'Đầm hoa', slug: 'dam-hoa', description: '', shortDescription: '', categoryId: 'dam-be-gai',
    thumbnail: url, images: [image], price: 299000, salePrice: null, saleStartAt: null, saleEndAt: null,
    isNewArrival: false, arrivalAt: null, stock: 3, isActive: true, sortOrder: 0,
  }
  assert.equal(createProductSchema.parse(product).images[0].publicId, publicId)
  assert.equal(isProductImagePublicIdFor(publicId, productId), true)
  assert.equal(isProductImagePublicIdFor(publicId, 'another-product'), false)
  assert.throws(() => productImageSchema.parse({ ...image, publicId: 'shopbebang/products/product-1/not-an-image-id' }))
  assert.throws(() => createProductSchema.parse({ ...product, images: Array.from({ length: 9 }, (_, sortOrder) => ({ ...image, sortOrder })) }))
})

test('variant helpers generate stable color-size combinations and keep stock, SKU, price and image data when options change', () => {
  const { generateVariantCombinations, calculateTotalStock, findSelectedVariant, resolveVariantPrice, resolveVariantImage } = loadDomain()('src/lib/products/variants.ts')
  const colors = [{ id: 'color_pink', name: 'Hồng' }, { id: 'color_blue', name: 'Xanh' }]
  const sizes = [{ id: 'size_s', name: 'S' }, { id: 'size_m', name: 'M' }]
  const first = generateVariantCombinations({ colors: [colors[0]], sizes: [sizes[0]] }, [], 'dam-hoa')
  assert.equal(first.length, 1)
  const edited = [{ ...first[0], sku: 'SKU-EDITED', stock: 4, price: 179000, imageUrl: '/images/pink.webp' }]
  const expanded = generateVariantCombinations({ colors, sizes: [sizes[0], sizes[1]] }, edited, 'dam-hoa')
  assert.equal(expanded.length, 4)
  assert.equal(expanded.find(item => item.id === first[0].id).sku, 'SKU-EDITED')
  assert.equal(expanded.find(item => item.id === first[0].id).stock, 4)
  assert.equal(expanded.find(item => item.id === first[0].id).price, 179000)
  assert.equal(expanded.find(item => item.id === first[0].id).imageUrl, '/images/pink.webp')
  assert.equal(calculateTotalStock(expanded), 4)
  const selected = findSelectedVariant({ colors, sizes }, expanded, 'color_pink', 'size_s')
  assert.equal(selected.id, first[0].id)
  assert.equal(findSelectedVariant({ colors, sizes }, expanded, 'color_pink'), null)
  assert.equal(resolveVariantPrice({ price: 299000, salePrice: 199000, saleStartAt: null, saleEndAt: null }, { price: null }, new Date()), 199000)
  assert.equal(resolveVariantPrice({ price: 299000, salePrice: 199000, saleStartAt: null, saleEndAt: null }, { price: 179000 }, new Date()), 179000)
  assert.equal(resolveVariantImage({ imageUrl: null }, { imageUrl: '/images/color.webp' }, '/images/main.webp'), '/images/color.webp')
  assert.equal(generateVariantCombinations({ colors: [], sizes: [] }, [], 'product').length, 0)
  assert.equal(generateVariantCombinations({ colors: Array.from({ length: 11 }, (_, index) => ({ id: `c${index}`, name: `C${index}` })), sizes: Array.from({ length: 10 }, (_, index) => ({ id: `s${index}`, name: `S${index}` })) }, [], 'product'), null)
})

test('variant sizes follow the size guide while retaining data for renamed guide rows', () => {
  const { syncVariantSizesWithSizeGuide } = loadDomain()('src/lib/products/variants.ts')
  const config = { colors: [{ id: 'color_blue', name: 'Xanh' }], sizes: [{ id: 'legacy_s', name: 'S' }] }
  const variants = [{ id: 'variant_s', sku: 'CUSTOM-SKU', colorId: 'color_blue', color: 'Xanh', sizeId: 'legacy_s', size: 'S', stock: 7, price: 129000, imageUrl: '/custom.webp' }]
  const firstGuide = [{ id: 'guide_s', size: 'S', minWeight: 10, maxWeight: 12 }]
  const first = syncVariantSizesWithSizeGuide(firstGuide, config, variants, 'dam-be')
  assert.deepEqual(first.config.sizes, [{ id: 'guide_s', name: 'S' }])
  assert.equal(first.variants.length, 1)
  assert.deepEqual(first.variants[0], { ...variants[0], sizeId: 'guide_s' })
  const legacyWithoutConfiguredSizes = syncVariantSizesWithSizeGuide(firstGuide, { ...config, sizes: [] }, variants, 'dam-be')
  assert.equal(legacyWithoutConfiguredSizes.variants[0].stock, 7)
  assert.equal(legacyWithoutConfiguredSizes.variants[0].sku, 'CUSTOM-SKU')

  const expanded = syncVariantSizesWithSizeGuide([...firstGuide, { id: 'guide_m', size: 'M' }], first.config, first.variants, 'dam-be')
  assert.deepEqual(expanded.config.sizes.map(size => size.name), ['S', 'M'])
  assert.equal(expanded.variants.length, 2)
  assert.equal(expanded.variants.find(variant => variant.sizeId === 'guide_m').stock, 0)
  assert.equal(expanded.variants.find(variant => variant.sizeId === 'guide_s').sku, 'CUSTOM-SKU')

  const renamed = syncVariantSizesWithSizeGuide([{ ...firstGuide[0], size: 'Size S' }, { id: 'guide_m', size: 'M' }], expanded.config, expanded.variants, 'dam-be')
  const retained = renamed.variants.find(variant => variant.sizeId === 'guide_s')
  assert.equal(retained.size, 'Size S')
  assert.equal(retained.id, 'variant_s')
  assert.equal(retained.sku, 'CUSTOM-SKU')
  assert.equal(retained.stock, 7)
  assert.equal(retained.price, 129000)
  assert.equal(retained.imageUrl, '/custom.webp')

  const removed = syncVariantSizesWithSizeGuide([{ ...firstGuide[0], size: 'Size S' }], renamed.config, renamed.variants, 'dam-be')
  assert.deepEqual(removed.config.sizes.map(size => size.name), ['Size S'])
  assert.equal(removed.variants.length, 1)
})

test('product schema validates size guides and complete variant combinations while accepting old product records', () => {
  const load = loadDomain()
  const { createProductSchema } = load('src/lib/products/validation.ts')
  const { normalizeProductAttributes, normalizeProductData, normalizeProductSizeGuide, normalizeProductVariantConfig, normalizeProductVariants } = load('src/lib/products/variants.ts')
  const product = {
    name: 'Đầm hoa', slug: 'dam-hoa', description: '', shortDescription: '', categoryId: 'dam-be-gai',
    thumbnail: '', images: [], price: 299000, salePrice: null, saleStartAt: null, saleEndAt: null,
    isNewArrival: false, arrivalAt: null, stock: 3, isActive: true, sortOrder: 0,
  }
  assert.equal(createProductSchema.parse(product).hasVariants, undefined)
  assert.equal(normalizeProductAttributes(undefined), undefined)
  assert.equal(normalizeProductSizeGuide(undefined), undefined)
  assert.equal(normalizeProductVariantConfig(undefined), undefined)
  assert.equal(normalizeProductVariants(undefined), undefined)
  assert.deepEqual(normalizeProductData({ stock: 20 }), { stock: 20, hasVariants: false })

  const config = { colors: [{ id: 'color_pink', name: 'Hồng' }, { id: 'color_blue', name: 'Xanh' }], sizes: [{ id: 'size_s', name: 'S' }] }
  const variants = [
    { id: 'variant_color_pink_size_s', sku: 'DAM-HONG-S', colorId: 'color_pink', color: 'Hồng', sizeId: 'size_s', size: 'S', stock: 2 },
    { id: 'variant_color_blue_size_s', sku: 'DAM-XANH-S', colorId: 'color_blue', color: 'Xanh', sizeId: 'size_s', size: 'S', stock: 1, price: 199000 },
  ]
  const full = { ...product, hasVariants: true, variantConfig: config, variants, sizeGuide: [{ id: 'guide_1', size: 'S', minWeight: 10, maxWeight: 12, minHeight: 80, maxHeight: 90 }] }
  assert.equal(createProductSchema.parse(full).variants.length, 2)
  assert.equal(normalizeProductData({ ...full, stock: 999 }).stock, 3)
  assert.throws(() => createProductSchema.parse({ ...full, sizeGuide: [{ id: 'guide_1', size: 'S', minWeight: 13, maxWeight: 12 }] }), /Giá trị “từ” không được lớn hơn giá trị “đến”/)
  assert.throws(() => createProductSchema.parse({ ...full, variants: variants.map(variant => ({ ...variant, sku: 'SAME' })) }), /SKU không được trùng/)
  assert.throws(() => createProductSchema.parse({ ...full, variants: [variants[0]] }), /đủ mọi tổ hợp màu và size/)
  assert.throws(() => createProductSchema.parse({ ...full, hasVariants: true, variantConfig: { colors: [], sizes: [] }, variants: [] }), /ít nhất một màu hoặc một size/)
  assert.throws(() => createProductSchema.parse({ ...full, variants: variants.map(variant => ({ ...variant, stock: -1 })) }))
})

test('product image validation recognizes only JPEG, PNG, and WebP signatures and matches MIME', () => {
  const { detectProductImageFormat, matchesProductImageMime, MAX_PRODUCT_IMAGE_BYTES } = loadDomain()('src/lib/products/image-validation.ts')
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0x00])
  const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])
  const webp = Uint8Array.from([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])
  assert.equal(detectProductImageFormat(jpeg), 'jpg')
  assert.equal(detectProductImageFormat(png), 'png')
  assert.equal(detectProductImageFormat(webp), 'webp')
  assert.equal(detectProductImageFormat(Uint8Array.from([60, 115, 118, 103])), null)
  assert.equal(matchesProductImageMime('image/jpeg', 'jpg'), true)
  assert.equal(matchesProductImageMime('image/png', 'jpg'), false)
  assert.equal(MAX_PRODUCT_IMAGE_BYTES, 5 * 1024 * 1024)
})

test('public products exclude inactive, deleted and hidden-category products', () => {
  const load = loadDomain()
  const { isProductPubliclyVisible } = load('src/lib/products/service.ts')
  const categories = new Set(['active-category'])
  const product = { categoryId: 'active-category', isActive: true, deletedAt: null }
  assert.equal(isProductPubliclyVisible(product, categories), true)
  assert.equal(isProductPubliclyVisible({ ...product, isActive: false }, categories), false)
  assert.equal(isProductPubliclyVisible({ ...product, deletedAt: '2026-10-16T00:00:00Z' }, categories), false)
  assert.equal(isProductPubliclyVisible({ ...product, categoryId: 'hidden-category' }, categories), false)
})

test('homepage selectors return four new products and only currently valid sale products', () => {
  const load = loadDomain()
  const { selectHomeNewArrivals, selectHomeSaleProducts } = load('src/lib/products/service.ts')
  const now = new Date('2026-10-16T12:00:00.000Z')
  const newProducts = Array.from({ length: 6 }, (_, id) => ({ id }))
  assert.deepEqual(selectHomeNewArrivals(newProducts).map(product => product.id), [0, 1, 2, 3])
  const saleProducts = [
    ...Array.from({ length: 6 }, (_, id) => ({ id, price: 300000, salePrice: 200000, saleStartAt: null, saleEndAt: null })),
    { id: 7, price: 300000, salePrice: 200000, saleStartAt: null, saleEndAt: '2026-10-15T00:00:00.000Z' },
  ]
  assert.deepEqual(selectHomeSaleProducts(saleProducts, now).map(product => product.id), [0, 1, 2, 3])
})

test('category parent validation detects self and indirect cycles and missing parents', async () => {
  const load = loadDomain()
  const { validateCategoryParentChain } = load('src/lib/product-categories/service.ts')
  const parents = new Map([['parent', null], ['child', 'parent'], ['grandchild', 'child']])
  const getParent = async id => parents.has(id) ? parents.get(id) : undefined
  assert.equal(await validateCategoryParentChain('parent', null, getParent), null)
  assert.equal(await validateCategoryParentChain('parent', 'parent', getParent), 'CATEGORY_CYCLE')
  assert.equal(await validateCategoryParentChain('parent', 'grandchild', getParent), 'CATEGORY_CYCLE')
  assert.equal(await validateCategoryParentChain('child', 'missing', getParent), 'CATEGORY_PARENT_NOT_FOUND')
})

test('legacy migration plan is deterministic, maps sales correctly and skips already imported IDs', () => {
  const { planLegacyProducts } = require('./migrate-home-products.cjs')
  const legacy = createLoader()('src/data/home-products.ts')
  const categoryIds = { 'dam-be-gai': 'category-dress', 'do-bo': 'category-set' }
  const first = planLegacyProducts(legacy.newArrivalProducts, legacy.saleProducts, categoryIds)
  assert.equal(first.length, 8)
  assert.equal(first.filter(product => product.action === 'create').length, 8)
  const sale = first.find(product => product.id === 'legacy_sale-1')
  assert.equal(sale.price, 390000)
  assert.equal(sale.salePrice, 199000)
  assert.equal('salePercent' in sale, false)
  assert.equal(first.find(product => product.id === 'legacy_new-2').categoryId, 'category-set')
  const second = planLegacyProducts(legacy.newArrivalProducts, legacy.saleProducts, categoryIds, new Set(first.map(product => product.id)))
  assert.equal(second.filter(product => product.action === 'create').length, 0)
  assert.equal(second.filter(product => product.action === 'skip').length, 8)
})

test('Admin product mutation route rejects non-admin before calling the write service', async () => {
  let writes = 0
  const load = createLoader({
    '@/lib/auth/current-user': { requireAdmin: async () => ({ ok: false, status: 403 }) },
    '@/lib/auth/request-security': { rejectCrossSiteMutation: () => null },
    '@/lib/products/service': { createProduct: async () => { writes++; return { id: 'unexpected' } }, listAdminProducts: async () => ({ products: [] }) },
  })
  const route = load('src/app/api/admin/products/route.ts')
  const response = await route.POST(new Request('http://localhost/api/admin/products', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'x' }),
  }))
  assert.equal(response.status, 403)
  assert.equal(writes, 0)
})

const emulatorAvailable = Boolean(process.env.FIRESTORE_EMULATOR_HOST)
test('Firestore emulator CRUD covers products/categories, unique slugs, soft delete and category in-use checks', { skip: !emulatorAvailable }, async () => {
  const { initializeApp, deleteApp } = require('firebase-admin/app')
  const { getFirestore } = require('firebase-admin/firestore')
  const app = initializeApp({ projectId: `demo-product-catalog-${Date.now()}` })
  const db = getFirestore(app)
  const load = loadDomain({ '@/lib/firebaseAdmin': { getAdminDb: () => db } })
  const categories = load('src/lib/product-categories/service.ts')
  const products = load('src/lib/products/service.ts')
  const suffix = require('node:crypto').randomUUID()
  const categoryId = `category-${suffix}`
  const childCategoryId = `child-${suffix}`
  const productId = `product-${suffix}`
  try {
    const category = await categories.createCategory({ id: categoryId, name: 'Đầm test', slug: `dam-test-${suffix}`, parentId: null, sortOrder: 0, isActive: true })
    const renamedCategory = await categories.updateCategory(categoryId, { description: 'Danh mục kiểm thử.' })
    assert.equal(renamedCategory.description, 'Danh mục kiểm thử.')
    const child = await categories.createCategory({ id: childCategoryId, name: 'Đầm con test', slug: `dam-con-test-${suffix}`, parentId: categoryId, sortOrder: 1, isActive: true })
    await assert.rejects(categories.updateCategory(categoryId, { parentId: childCategoryId }), /CATEGORY_CYCLE/)
    await assert.rejects(categories.createCategory({ name: 'Trùng slug', slug: child.slug, parentId: null, sortOrder: 2, isActive: true }), /CATEGORY_SLUG_DUPLICATE/)

    const input = {
      id: productId, name: 'Đầm test', slug: `dam-product-${suffix}`, description: '', shortDescription: '',
      categoryId, thumbnail: '', images: [], price: 299000, salePrice: 179000, saleStartAt: null, saleEndAt: null,
      isNewArrival: true, arrivalAt: null, stock: 2, isActive: true, sortOrder: 0,
    }
    const product = await products.createProduct(input)
    assert.equal(product.name, input.name)
    assert.equal((await categories.getAdminCategory(categoryId)).productCount, 1)
    const variantProductId = `variant-${suffix}`
    const variantConfig = { colors: [{ id: 'color_red', name: 'Đỏ' }], sizes: [{ id: 'size_s', name: 'S' }, { id: 'size_m', name: 'M' }] }
    const variantRows = [
      { id: 'variant_color_red_size_s', sku: `DAM-${suffix.slice(0, 6)}-DO-S`, colorId: 'color_red', color: 'Đỏ', sizeId: 'size_s', size: 'S', stock: 2 },
      { id: 'variant_color_red_size_m', sku: `DAM-${suffix.slice(0, 6)}-DO-M`, colorId: 'color_red', color: 'Đỏ', sizeId: 'size_m', size: 'M', stock: 5 },
    ]
    const variantProduct = await products.createProduct({ ...input, id: variantProductId, slug: `variant-${suffix}`, hasVariants: true, variantConfig, variants: variantRows, stock: 999 })
    assert.equal(variantProduct.stock, 7)
    const resizedConfig = { ...variantConfig, sizes: [...variantConfig.sizes, { id: 'size_l', name: 'L' }] }
    const { generateVariantCombinations } = load('src/lib/products/variants.ts')
    const resizedRows = generateVariantCombinations(resizedConfig, variantRows, `variant-${suffix}`)
    const resizedProduct = await products.updateProduct(variantProductId, { variantConfig: resizedConfig, variants: resizedRows })
    assert.equal(resizedProduct.variants.find(variant => variant.id === variantRows[0].id).stock, 2)
    assert.equal(resizedProduct.variants.find(variant => variant.id === variantRows[0].id).sku, variantRows[0].sku)
    assert.equal(resizedProduct.stock, 7)
    await assert.rejects(products.createProduct({ ...input, id: `duplicate-${suffix}` }), /PRODUCT_SLUG_DUPLICATE/)
    const updated = await products.updateProduct(productId, { price: 320000, isActive: false })
    assert.equal(updated.price, 320000)
    assert.equal(updated.isActive, false)
    let publicPage = await products.listPublicCategoryProducts(categoryId)
    assert.equal(publicPage.products.length, 0)
    await products.updateProduct(productId, { isActive: true })
    publicPage = await products.listPublicCategoryProducts(categoryId)
    assert.equal(publicPage.products.length, 1)
    await assert.rejects(categories.deleteCategory(categoryId), /CATEGORY_IN_USE/)
    await products.softDeleteProduct(productId)
    await products.softDeleteProduct(variantProductId)
    assert.equal(await products.getAdminProduct(productId), null)
    assert.equal((await products.listPublicCategoryProducts(categoryId)).products.length, 0)
    const deletedSnapshot = await products.productCollection().doc(productId).get()
    assert.equal(deletedSnapshot.data().deletedAt instanceof Date || typeof deletedSnapshot.data().deletedAt?.toDate === 'function', true)
    assert.equal((await categories.getAdminCategory(categoryId)).productCount, 0)
    await categories.deleteCategory(childCategoryId)
    await categories.deleteCategory(categoryId)
  } finally {
    await deleteApp(app)
  }
})

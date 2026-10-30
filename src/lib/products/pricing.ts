import type { Product, ProductPriceSummary, ProductVariant } from './types'

type ProductPricingSource = Pick<Product, 'price' | 'salePrice' | 'saleStartAt' | 'saleEndAt'>
  & Partial<Pick<Product, 'stock' | 'hasVariants' | 'type' | 'variants'>>
  & { inStock?: boolean; availableCombos?: number }

export function isProductOnSale(product: Pick<Product, 'price' | 'salePrice' | 'saleStartAt' | 'saleEndAt'>, now: Date) {
  if (product.salePrice === null || product.salePrice <= 0 || product.salePrice >= product.price) return false
  if (product.saleStartAt && now.getTime() < new Date(product.saleStartAt).getTime()) return false
  if (product.saleEndAt && now.getTime() > new Date(product.saleEndAt).getTime()) return false
  return true
}

export function getProductEffectivePrice(product: Pick<Product, 'price' | 'salePrice' | 'saleStartAt' | 'saleEndAt'>, now: Date) {
  return isProductOnSale(product, now) ? product.salePrice! : product.price
}

export function getVariantEffectivePrice(
  product: Pick<Product, 'price' | 'salePrice' | 'saleStartAt' | 'saleEndAt'>,
  variant: Pick<ProductVariant, 'price'> | null | undefined,
  now: Date,
) {
  return variant?.price !== null && variant?.price !== undefined ? variant.price : getProductEffectivePrice(product, now)
}

export function getProductDiscountPercent(product: Pick<Product, 'price' | 'salePrice' | 'saleStartAt' | 'saleEndAt'>, now: Date) {
  if (!isProductOnSale(product, now)) return 0
  return Math.round(((product.price - product.salePrice!) / product.price) * 100)
}

function nextProductSaleChangeAt(product: Pick<Product, 'price' | 'salePrice' | 'saleStartAt' | 'saleEndAt'>, now: Date) {
  if (product.salePrice === null || product.salePrice <= 0 || product.salePrice >= product.price) return null
  const start = product.saleStartAt ? new Date(product.saleStartAt).getTime() : null
  const end = product.saleEndAt ? new Date(product.saleEndAt).getTime() : null
  const current = now.getTime()
  if (start !== null && !Number.isFinite(start) || end !== null && !Number.isFinite(end)) return null
  if (start !== null && start > current && (end === null || end >= start)) return start
  if ((start === null || start <= current) && (end === null || current <= end)) return end === null ? null : end + 1
  return null
}

export function resolveProductPricing(
  product: ProductPricingSource,
  variants: readonly Pick<ProductVariant, 'id' | 'price' | 'stock'>[] = product.variants ?? [],
  options: { now?: Date } = {},
): ProductPriceSummary {
  const now = options.now ?? new Date()
  const calculatedAt = now.toISOString()
  const variantManaged = product.type !== 'COMBO' && product.hasVariants === true
  const candidates = variantManaged
    ? variants.filter(variant => Number.isSafeInteger(variant.stock) && variant.stock > 0).map(variant => {
      const hasOwnPrice = variant.price !== null && variant.price !== undefined
      const onSale = !hasOwnPrice && isProductOnSale(product, now)
      const price = getVariantEffectivePrice(product, variant, now)
      return { variantId: variant.id, price, compareAtPrice: onSale ? product.price : null, onSale, stock: variant.stock }
    })
    : (() => {
      const available = product.inStock ?? (product.stock ?? 0) > 0
      if (!available) return []
      const onSale = isProductOnSale(product, now)
      return [{ variantId: null, price: getProductEffectivePrice(product, now), compareAtPrice: onSale ? product.price : null, onSale, stock: product.stock ?? 0 }]
    })()
  const orderable = candidates.filter(candidate => Number.isSafeInteger(candidate.price) && candidate.price > 0)
  if (!orderable.length) {
    return {
      minPrice: null, maxPrice: null, displayPrice: null, priceType: 'UNAVAILABLE', available: false,
      defaultVariantId: null, hasActiveSale: false, compareAtPrice: null, currency: 'VND',
      calculatedAt, nextPriceChangeAt: null,
    }
  }

  const prices = orderable.map(candidate => candidate.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const uniqueCompareAtPrices = new Set(orderable.map(candidate => candidate.compareAtPrice).filter((price): price is number => price !== null))
  const compareAtPrice = orderable.every(candidate => candidate.onSale && candidate.compareAtPrice !== null)
    && uniqueCompareAtPrices.size === 1
    ? orderable[0].compareAtPrice
    : null
  const inheritedInStockVariant = variantManaged && orderable.some(candidate => {
    const variant = variants.find(item => item.id === candidate.variantId)
    return variant?.price === null || variant?.price === undefined
  })
  const hasBaseAvailability = variantManaged ? inheritedInStockVariant : true
  const nextChange = hasBaseAvailability ? nextProductSaleChangeAt(product, now) : null
  const defaultVariant = variantManaged
    ? [...orderable].sort((a, b) => a.price - b.price || (a.variantId ?? '').localeCompare(b.variantId ?? ''))[0]
    : null

  return {
    minPrice,
    maxPrice,
    displayPrice: minPrice,
    priceType: minPrice === maxPrice ? 'SINGLE' : 'RANGE',
    available: true,
    defaultVariantId: defaultVariant?.variantId ?? null,
    hasActiveSale: orderable.some(candidate => candidate.onSale),
    compareAtPrice,
    currency: 'VND',
    calculatedAt,
    nextPriceChangeAt: nextChange === null ? null : new Date(nextChange).toISOString(),
  }
}

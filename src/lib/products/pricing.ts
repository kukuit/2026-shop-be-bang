import type { Product } from './types'

export function isProductOnSale(product: Pick<Product, 'price' | 'salePrice' | 'saleStartAt' | 'saleEndAt'>, now: Date) {
  if (product.salePrice === null || product.salePrice <= 0 || product.salePrice >= product.price) return false
  if (product.saleStartAt && now.getTime() < new Date(product.saleStartAt).getTime()) return false
  if (product.saleEndAt && now.getTime() > new Date(product.saleEndAt).getTime()) return false
  return true
}

export function getProductEffectivePrice(product: Pick<Product, 'price' | 'salePrice' | 'saleStartAt' | 'saleEndAt'>, now: Date) {
  return isProductOnSale(product, now) ? product.salePrice! : product.price
}

export function getProductDiscountPercent(product: Pick<Product, 'price' | 'salePrice' | 'saleStartAt' | 'saleEndAt'>, now: Date) {
  if (!isProductOnSale(product, now)) return 0
  return Math.round(((product.price - product.salePrice!) / product.price) * 100)
}

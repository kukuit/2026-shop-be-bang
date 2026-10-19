import type { ProductComboSelection } from '@/lib/products/types'

export const CART_STORAGE_KEY = 'shopbebang_cart_v1'
export const BUY_NOW_STORAGE_KEY = 'shopbebang_buy_now_v1'
export const MAX_CART_QUANTITY = 99
export const MAX_CART_LINES = 25

export interface CartItem {
  productId: string
  variantId: string | null
  quantity: number
  comboSelections?: ProductComboSelection[]
}

export interface CartResolvedLine extends CartItem {
  key: string
  productName: string
  productSlug?: string
  imageUrl?: string
  color?: string
  size?: string
  sku?: string
  unitPrice: number | null
  lineTotal: number | null
  stockAvailable: number
  available: boolean
  unavailableReason?: string
  isCombo?: boolean
  comboComponents?: Array<{ productId: string; productName: string; color?: string | null; size?: string | null; quantity: number; unitPrice: number }>
}

export function cartItemKey(item: Pick<CartItem, 'productId' | 'variantId' | 'comboSelections'>) {
  const selections = [...(item.comboSelections ?? [])].sort((a, b) => a.componentIndex - b.componentIndex).map(selection => [selection.componentIndex, selection.variantId])
  return JSON.stringify([item.productId, item.variantId, selections])
}

export function sanitizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return []
  const items = new Map<string, CartItem>()
  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue
    const item = candidate as Record<string, unknown>
    const productId = typeof item.productId === 'string' ? item.productId.trim() : ''
    const variantId = item.variantId === null || item.variantId === undefined
      ? null
      : typeof item.variantId === 'string' ? item.variantId.trim() : undefined
    const quantity = item.quantity
    if (!productId || productId.length > 180 || productId.includes('/') || variantId === undefined || (variantId && (variantId.length > 180 || variantId.includes('/')))) continue
    if (!Number.isSafeInteger(quantity) || Number(quantity) < 1) continue
    const rawComboSelections = item.comboSelections
    if (rawComboSelections !== undefined && !Array.isArray(rawComboSelections)) continue
    if (Array.isArray(rawComboSelections) && rawComboSelections.length > 20) continue
    const comboSelections: ProductComboSelection[] = []
    const selectionIndexes = new Set<number>()
    let selectionsValid = true
    for (const rawSelection of Array.isArray(rawComboSelections) ? rawComboSelections : []) {
      if (!rawSelection || typeof rawSelection !== 'object' || Array.isArray(rawSelection)) { selectionsValid = false; break }
      const selection = rawSelection as Record<string, unknown>
      const componentIndex = selection.componentIndex
      const selectedVariantId = typeof selection.variantId === 'string' ? selection.variantId.trim() : ''
      if (!Number.isSafeInteger(componentIndex) || Number(componentIndex) < 0 || Number(componentIndex) >= 20
        || selectionIndexes.has(Number(componentIndex)) || !selectedVariantId || selectedVariantId.length > 180 || selectedVariantId.includes('/')) {
        selectionsValid = false
        break
      }
      selectionIndexes.add(Number(componentIndex))
      comboSelections.push({ componentIndex: Number(componentIndex), variantId: selectedVariantId })
    }
    if (!selectionsValid) continue
    comboSelections.sort((a, b) => a.componentIndex - b.componentIndex)
    const normalized: CartItem = {
      productId,
      variantId,
      quantity: Math.min(MAX_CART_QUANTITY, Number(quantity)),
      ...(comboSelections.length ? { comboSelections } : {}),
    }
    const key = cartItemKey(normalized)
    const previous = items.get(key)
    if (previous) previous.quantity = Math.min(MAX_CART_QUANTITY, previous.quantity + normalized.quantity)
    else if (items.size < MAX_CART_LINES) items.set(key, normalized)
  }
  return Array.from(items.values())
}

export function mergeCartItem(items: readonly CartItem[], next: CartItem, stockLimit = MAX_CART_QUANTITY): CartItem[] | null {
  if (!Number.isSafeInteger(next.quantity) || next.quantity < 1 || next.quantity > MAX_CART_QUANTITY) return null
  const key = cartItemKey(next)
  const existing = items.find(item => cartItemKey(item) === key)
  if (!existing && items.length >= MAX_CART_LINES) return null
  const quantity = (existing?.quantity ?? 0) + next.quantity
  if (quantity > MAX_CART_QUANTITY || quantity > stockLimit) return null
  if (existing) return items.map(item => cartItemKey(item) === key ? { ...item, quantity } : item)
  return [...items, { ...next }]
}

export function setCartItemQuantity(items: readonly CartItem[], key: string, quantity: number): CartItem[] {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return items.filter(item => cartItemKey(item) !== key)
  return items.map(item => cartItemKey(item) === key ? { ...item, quantity: Math.min(MAX_CART_QUANTITY, quantity) } : item)
}

export function removeCartItem(items: readonly CartItem[], key: string): CartItem[] {
  return items.filter(item => cartItemKey(item) !== key)
}

export function subtractPurchasedItems(items: readonly CartItem[], purchased: readonly CartItem[]): CartItem[] {
  const quantities = new Map(purchased.map(item => [cartItemKey(item), item.quantity]))
  return items.flatMap(item => {
    const remaining = item.quantity - (quantities.get(cartItemKey(item)) ?? 0)
    return remaining > 0 ? [{ ...item, quantity: remaining }] : []
  })
}

export function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return []
  try { return sanitizeCart(JSON.parse(raw)) } catch { return [] }
}

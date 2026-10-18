import type { ProductComboComponent, ProductDiscount } from './types'

export const MAX_COMBO_COMPONENTS = 20

export function calculateComboPricing(subtotal: number, discount: ProductDiscount) {
  if (!Number.isSafeInteger(subtotal) || subtotal < 1 || !Number.isSafeInteger(discount.value) || discount.value < 1)
    throw new Error('COMBO_INVALID_PRICE')
  const discountAmount = discount.type === 'PERCENT'
    ? Math.round(subtotal * discount.value / 100)
    : discount.value
  const finalPrice = subtotal - discountAmount
  if (!Number.isSafeInteger(discountAmount) || discountAmount < 1 || discountAmount >= subtotal || !Number.isSafeInteger(finalPrice) || finalPrice < 1)
    throw new Error('COMBO_INVALID_DISCOUNT')
  return { subtotal, discountAmount, finalPrice }
}

export function getAvailableComboCount(components: readonly ProductComboComponent[], stockByComponent: ReadonlyMap<string, number>) {
  if (!components.length) return 0
  return components.reduce((available, component) => {
    const key = JSON.stringify([component.productId, component.variantId ?? null])
    const stock = stockByComponent.get(key) ?? 0
    return Math.min(available, Math.floor(stock / component.quantity))
  }, Number.MAX_SAFE_INTEGER)
}

export function validateComboComponents(components: readonly ProductComboComponent[]) {
  if (components.length < 1 || components.length > MAX_COMBO_COMPONENTS || components.reduce((total, component) => total + component.quantity, 0) < 2) throw new Error('COMBO_INVALID_COMPONENTS')
  const componentKeys = new Set<string>()
  for (const component of components) {
    if (!component.productId || component.productId.length > 180 || component.productId.includes('/')
      || !Number.isSafeInteger(component.quantity) || component.quantity < 1 || component.quantity > 99
      || component.variantId && (component.variantId.length > 180 || component.variantId.includes('/')))
      throw new Error('COMBO_INVALID_COMPONENTS')
    const key = JSON.stringify([component.productId, component.variantId ?? null])
    if (componentKeys.has(key)) throw new Error('COMBO_DUPLICATE_COMPONENT')
    componentKeys.add(key)
  }
}

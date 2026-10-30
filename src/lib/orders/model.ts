import type { ProductComboSelection } from '@/lib/products/types'

export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'FAILED', 'CANCELLED'] as const
export type OrderStatus = typeof ORDER_STATUSES[number]
export type PaymentStatus = 'UNPAID' | 'PAID'

export interface OrderLineInput { productId: string; variantId: string | null; quantity: number; expectedUnitPrice?: number; comboSelections?: ProductComboSelection[] }

export function calculateOrderSubtotal(lines: Array<{ unitPrice: number; quantity: number }>) {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
}

export function hasOrderPriceChanges(
  expected: readonly Pick<OrderLineInput, 'expectedUnitPrice'>[],
  resolved: ReadonlyArray<{ unitPrice: number }>,
) {
  return expected.length !== resolved.length
    || expected.some((line, index) => line.expectedUnitPrice !== resolved[index]?.unitPrice)
}

export function fingerprintOrderPayload(value: unknown) {
  return JSON.stringify(value)
}

export function shouldRestoreInventory(stockRestored: boolean, action: string) {
  return !stockRestored && (action === 'cancel' || action === 'restore_failed_return')
}

export function canConfirmOrder(order: { subtotal: number; shippingFee: number | null; total: number | null; customerAcceptedTotalAt?: unknown }) {
  return Number.isSafeInteger(order.shippingFee)
    && Number.isSafeInteger(order.total)
    && order.total === order.subtotal + Number(order.shippingFee)
    && Boolean(order.customerAcceptedTotalAt)
}

export function normalizeVietnamPhone(value: string) {
  const digits = value.replace(/[^\d+]/g, '')
  const normalized = digits.startsWith('+84') ? `0${digits.slice(3)}` : digits.startsWith('84') ? `0${digits.slice(2)}` : digits
  return /^0\d{9,10}$/.test(normalized) ? normalized : null
}

export function searchPrefixes(value: string) {
  const normalized = value.normalize('NFC').trim().toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ')
  const prefixes = new Set<string>()
  const addPrefixes = (part: string) => {
    for (let length = 2; length <= Math.min(part.length, 20); length++) prefixes.add(part.slice(0, length))
  }
  addPrefixes(normalized)
  normalized.split(/[\s-]+/).filter(Boolean).forEach(addPrefixes)
  return Array.from(prefixes)
}

export function normalizeOrderSearchQuery(value: string) {
  const normalized = value.normalize('NFC').trim().toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ')
  if (/^bb-/.test(normalized)) return normalized.slice(0, 20)
  if (/^[+\d\s().-]+$/.test(normalized)) return normalized.replace(/\D/g, '').slice(0, 20)
  return normalized.slice(0, 20)
}

export function canTransitionOrder(status: OrderStatus, action: string) {
  const allowed: Record<OrderStatus, string[]> = {
    PENDING: ['set_shipping_fee', 'accept_customer_total', 'confirm', 'cancel'],
    CONFIRMED: ['cancel', 'ship'],
    SHIPPING: ['deliver', 'fail'],
    DELIVERED: ['mark_cod_paid'],
    FAILED: ['restore_failed_return'],
    CANCELLED: [],
  }
  return allowed[status]?.includes(action) ?? false
}

export function nextOrderStatus(status: OrderStatus, action: string): OrderStatus {
  if (action === 'confirm' && status === 'PENDING') return 'CONFIRMED'
  if (action === 'cancel' && (status === 'PENDING' || status === 'CONFIRMED')) return 'CANCELLED'
  if (action === 'ship' && status === 'CONFIRMED') return 'SHIPPING'
  if (action === 'deliver' && status === 'SHIPPING') return 'DELIVERED'
  if (action === 'fail' && status === 'SHIPPING') return 'FAILED'
  return status
}

export function sanitizePublicOrder(data: Record<string, any>) {
  return {
    orderCode: String(data.orderCode ?? ''),
    status: String(data.status ?? 'PENDING') as OrderStatus,
    paymentStatus: String(data.paymentStatus ?? 'UNPAID') as PaymentStatus,
    subtotal: Number(data.subtotal ?? 0),
    shippingFee: Number.isSafeInteger(data.shippingFee) ? data.shippingFee : null,
    total: Number.isSafeInteger(data.total) ? data.total : null,
    customerAcceptedTotal: Boolean(data.customerAcceptedTotalAt),
    customerAcceptedTotalAt: data.customerAcceptedTotalAt?.toDate?.()?.toISOString?.() ?? null,
    shippingStatus: String(data.shippingStatus ?? 'PENDING_QUOTE'),
    items: Array.isArray(data.items) ? data.items.map((item: Record<string, any>) => ({
      productName: String(item.productName ?? ''),
      color: typeof item.color === 'string' ? item.color : null,
      size: typeof item.size === 'string' ? item.size : null,
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unitPrice ?? 0),
      lineTotal: Number(item.lineTotal ?? 0),
      imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : null,
      isCombo: item.isCombo === true,
      comboComponents: Array.isArray(item.comboComponents) ? item.comboComponents.map((component: Record<string, any>) => ({
        productName: String(component.productName ?? ''),
        color: typeof component.color === 'string' ? component.color : null,
        size: typeof component.size === 'string' ? component.size : null,
        quantity: Number(component.quantity ?? 0),
        unitPrice: Number(component.unitPrice ?? 0),
        lineTotal: Number(component.lineTotal ?? 0),
        imageUrl: typeof component.imageUrl === 'string' ? component.imageUrl : null,
      })) : [],
    })) : [],
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
    statusHistory: Array.isArray(data.statusHistory) ? data.statusHistory.map((entry: Record<string, any>) => ({
      status: String(entry.status ?? ''),
      at: entry.at?.toDate?.()?.toISOString?.() ?? null,
      note: typeof entry.note === 'string' ? entry.note : null,
    })) : [],
  }
}

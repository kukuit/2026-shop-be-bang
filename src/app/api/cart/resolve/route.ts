import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { getPublicProductWithStockById } from '@/lib/products/service'
import { getProductEffectivePrice } from '@/lib/products/pricing'
import { resolveVariantPrice } from '@/lib/products/variants'
import { calculateComboPricing } from '@/lib/products/combos'
import { cartItemKey, sanitizeCart } from '@/lib/cart/model'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
const schema = z.object({ items: z.array(z.unknown()).max(25) })

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return json({ message: 'Giỏ hàng không hợp lệ.' }, 400)
    const items = sanitizeCart(parsed.data.items)
    const lines = await Promise.all(items.map(async item => {
      const resolved = await getPublicProductWithStockById(item.productId)
      if (!resolved) return { ...item, key: cartItemKey(item), productName: 'Sản phẩm không còn khả dụng', unitPrice: null, lineTotal: null, stockAvailable: 0, available: false, unavailableReason: 'Sản phẩm đã ngừng bán hoặc không còn tồn tại.' }
      const { product, stock: baseStock } = resolved
      if (product.type === 'COMBO') {
        const components = product.resolvedComponents ?? []
        const selectionByIndex = new Map<number, string>()
        let selectionsValid = !item.variantId
        for (const selection of item.comboSelections ?? []) {
          const component = components[selection.componentIndex]
          if (!component?.hasVariants || component.variantId || selectionByIndex.has(selection.componentIndex)) {
            selectionsValid = false
            continue
          }
          selectionByIndex.set(selection.componentIndex, selection.variantId)
        }
        let subtotal = 0
        let stockAvailable = Number.MAX_SAFE_INTEGER
        const comboComponents = components.map((component, componentIndex) => {
          const selectedVariantId = component.variantId ?? selectionByIndex.get(componentIndex)
          const selectedVariant = component.hasVariants && !component.variantId && selectedVariantId
            ? component.variants?.find(candidate => candidate.id === selectedVariantId)
            : null
          if (component.hasVariants && !component.variantId && (!selectedVariantId || !selectedVariant) || !component.hasVariants && selectionByIndex.has(componentIndex)) selectionsValid = false
          const componentStock = component.hasVariants
            ? component.variantId ? component.stockAvailable : selectedVariant?.stock ?? 0
            : component.stockAvailable
          const componentUnitPrice = component.variantId ? component.unitPrice : selectedVariant?.price ?? component.unitPrice
          if (!Number.isSafeInteger(componentUnitPrice) || componentUnitPrice < 1) selectionsValid = false
          subtotal += componentUnitPrice * component.quantity
          stockAvailable = Math.min(stockAvailable, Math.floor(componentStock / component.quantity))
          return {
            productId: component.productId,
            productName: component.productName,
            color: selectedVariant?.color ?? component.color,
            size: selectedVariant?.size ?? component.size,
            quantity: component.quantity,
            unitPrice: componentUnitPrice,
          }
        })
        const requiredSelections = components.reduce((count, component) => count + (component.hasVariants && !component.variantId ? 1 : 0), 0)
        if (selectionByIndex.size !== requiredSelections) selectionsValid = false
        let unitPrice: number | null = null
        try {
          if (selectionsValid && product.discount) unitPrice = calculateComboPricing(subtotal, product.discount).finalPrice
        } catch { /* The server will reject invalid pricing at order creation too. */ }
        const available = selectionsValid && stockAvailable >= item.quantity && unitPrice !== null && Number.isSafeInteger(unitPrice) && unitPrice > 0
        return {
          ...item,
          key: cartItemKey(item),
          productName: product.name,
          productSlug: product.slug,
          imageUrl: product.thumbnail || product.images[0]?.url,
          unitPrice,
          lineTotal: unitPrice === null ? null : unitPrice * item.quantity,
          stockAvailable,
          available,
          isCombo: true,
          comboComponents,
          ...(!available ? { unavailableReason: !selectionsValid ? 'Vui lòng chọn lại biến thể cho từng sản phẩm trong combo.' : stockAvailable < item.quantity ? `Chỉ còn ${stockAvailable} combo với các biến thể đã chọn.` : 'Combo hiện không khả dụng.' } : {}),
        }
      }
      const variant = product.hasVariants ? product.variants?.find(candidate => candidate.id === item.variantId) : null
      const invalidVariant = Boolean(item.comboSelections?.length) || (product.hasVariants ? !item.variantId || !variant : Boolean(item.variantId))
      const stockAvailable = product.hasVariants ? variant?.stock ?? 0 : baseStock
      const unitPrice = invalidVariant ? null : product.hasVariants
        ? resolveVariantPrice(product, variant, new Date())
        : getProductEffectivePrice(product, new Date())
      const available = !invalidVariant && stockAvailable >= item.quantity && unitPrice !== null
      const color = variant?.color
      const size = variant?.size
      return {
        ...item,
        key: cartItemKey(item),
        productName: product.name,
        productSlug: product.slug,
        imageUrl: variant?.imageUrl || product.thumbnail || product.images[0]?.url,
        ...(color ? { color } : {}), ...(size ? { size } : {}), ...(variant?.sku ? { sku: variant.sku } : {}),
        unitPrice, lineTotal: unitPrice === null ? null : unitPrice * item.quantity,
        stockAvailable, available,
        ...(!available ? { unavailableReason: invalidVariant ? 'Biến thể đã thay đổi. Vui lòng chọn lại sản phẩm.' : stockAvailable < item.quantity ? `Chỉ còn ${stockAvailable} sản phẩm.` : 'Sản phẩm hiện không khả dụng.' } : {}),
      }
    }))
    return json({ lines })
  } catch {
    return json({ message: 'Không thể cập nhật giỏ hàng lúc này.' }, 500)
  }
}

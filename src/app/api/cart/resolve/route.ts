import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { getPublicProductWithStockById } from '@/lib/products/service'
import { getProductEffectivePrice } from '@/lib/products/pricing'
import { resolveVariantPrice } from '@/lib/products/variants'
import { sanitizeCart } from '@/lib/cart/model'

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
      if (!resolved) return { ...item, key: JSON.stringify([item.productId, item.variantId]), productName: 'Sản phẩm không còn khả dụng', unitPrice: null, lineTotal: null, stockAvailable: 0, available: false, unavailableReason: 'Sản phẩm đã ngừng bán hoặc không còn tồn tại.' }
      const { product, stock: baseStock } = resolved
      if (product.type === 'COMBO') {
        const variantInvalid = Boolean(item.variantId)
        const unitPrice = getProductEffectivePrice(product, new Date())
        const available = !variantInvalid && baseStock >= item.quantity && Number.isSafeInteger(unitPrice) && unitPrice > 0
        return {
          ...item,
          key: JSON.stringify([item.productId, item.variantId]),
          productName: product.name,
          productSlug: product.slug,
          imageUrl: product.thumbnail || product.images[0]?.url,
          unitPrice: variantInvalid ? null : unitPrice,
          lineTotal: variantInvalid ? null : unitPrice * item.quantity,
          stockAvailable: baseStock,
          available,
          isCombo: true,
          comboComponents: (product.resolvedComponents ?? []).map(component => ({
            productId: component.productId,
            productName: component.productName,
            color: component.color,
            size: component.size,
            quantity: component.quantity,
            unitPrice: component.unitPrice,
          })),
          ...(!available ? { unavailableReason: variantInvalid ? 'Combo không có biến thể để chọn.' : baseStock < item.quantity ? `Chỉ còn ${baseStock} combo.` : 'Combo hiện không khả dụng.' } : {}),
        }
      }
      const variant = product.hasVariants ? product.variants?.find(candidate => candidate.id === item.variantId) : null
      const invalidVariant = product.hasVariants ? !item.variantId || !variant : Boolean(item.variantId)
      const stockAvailable = product.hasVariants ? variant?.stock ?? 0 : baseStock
      const unitPrice = invalidVariant ? null : product.hasVariants
        ? resolveVariantPrice(product, variant, new Date())
        : getProductEffectivePrice(product, new Date())
      const available = !invalidVariant && stockAvailable >= item.quantity && unitPrice !== null
      const color = variant?.color
      const size = variant?.size
      return {
        ...item,
        key: JSON.stringify([item.productId, item.variantId]),
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

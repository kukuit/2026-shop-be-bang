'use client'

import Link from 'next/link'
import { Plus, ShoppingCart } from 'lucide-react'
import type { PublicProduct } from '@/lib/products/types'
import { useLiveProductPricing } from '@/components/products/useLiveProductPricing'
import ProductImageView from '@/components/products/ProductImageView'
import ComboImageCollage from '@/components/products/ComboImageCollage'
import { useCart } from '@/components/cart/CartProvider'

function formatPrice(price: number) {
  return `${new Intl.NumberFormat('vi-VN').format(price)}đ`
}

function summarizeOptions(values: string[]) {
  const uniqueValues = Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))
  if (uniqueValues.length <= 3) return uniqueValues.join(', ')
  return `${uniqueValues.slice(0, 3).join(', ')} +${uniqueValues.length - 3}`
}

export default function ProductCard({ product }: { product: PublicProduct }) {
  const { summary } = useLiveProductPricing(product)
  const { addItem } = useCart()
  const displayPrice = summary.displayPrice
  const compareAtPrice = summary.priceType === 'SINGLE' ? summary.compareAtPrice : null
  const discountPercent = compareAtPrice !== null && displayPrice !== null && compareAtPrice > displayPrice
    ? Math.round(((compareAtPrice - displayPrice) / compareAtPrice) * 100)
    : 0
  const thumbnailImage = product.images.find(image => image.url === product.thumbnail)
  const comboImages = product.images.map(image => ({ id: image.id, url: image.url, name: image.alt || product.name }))
  const availableVariants = product.variants?.filter(variant => variant.stock > 0) ?? []
  const colorsSummary = summarizeOptions(availableVariants.map(variant => variant.color ?? ''))
  const sizesSummary = summarizeOptions(availableVariants.map(variant => variant.size ?? ''))
  const optionSummary = product.hasVariants
    ? [colorsSummary && `Màu: ${colorsSummary}`, sizesSummary && `Size: ${sizesSummary}`].filter(Boolean).join(' · ')
    : ''
  const selectedVariant = product.hasVariants
    ? product.variants?.find(variant => variant.id === summary.defaultVariantId && variant.stock > 0) ?? null
    : null
  const comboNeedsSelection = product.type === 'COMBO'
    && (!(product.resolvedComponents?.length)
      || product.resolvedComponents.some(component => component.hasVariants && !component.variantId))
  const canQuickAdd = summary.available
    && (!product.hasVariants || selectedVariant !== null)
    && !comboNeedsSelection

  function handleQuickAdd() {
    if (!canQuickAdd) return
    addItem(
      { productId: product.id, variantId: selectedVariant?.id ?? null, quantity: 1 },
      selectedVariant?.stock ?? product.availableCombos ?? 99,
    )
  }
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white transition-shadow hover:shadow-md">
      <div className="relative shrink-0">
        <Link href={`/products/${product.slug}`} className="block">
          <div className="relative aspect-square overflow-hidden bg-[#fff8f5]">
            {product.comboImageFallback && comboImages.length
              ? <ComboImageCollage images={comboImages} className="absolute inset-0 transition-transform duration-300 hover:scale-[1.03]" />
              : <ProductImageView src={product.thumbnail} publicId={thumbnailImage?.publicId} variant="card" alt={product.name} sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 360px" className="object-cover transition-transform duration-300 hover:scale-[1.03]" />}
            {product.isNewArrival && <span className={`absolute left-3 rounded-full bg-pink-500 px-3 py-1 text-xs font-semibold text-white ${product.type === 'COMBO' ? 'top-12' : 'top-3'}`}>Mới về</span>}
            {product.type === 'COMBO' && <span className="absolute left-3 top-3 rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white">COMBO</span>}
            {summary.hasActiveSale && <span className="absolute right-3 top-3 rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white">{discountPercent ? `-${discountPercent}%` : 'Giá ưu đãi'}</span>}
            {!product.inStock && <span className="absolute bottom-3 left-3 rounded-full bg-zinc-900/80 px-3 py-1 text-xs font-bold text-white">Hết hàng</span>}
          </div>
        </Link>
      </div>
      <div className="flex h-[132px] flex-col p-4">
        <Link href={`/products/${product.slug}`} className="block min-w-0">
          <h3 className="truncate text-base font-medium leading-6 text-zinc-800">{product.name}</h3>
          {optionSummary && <p className="mt-1 truncate text-xs leading-4 text-zinc-500">{optionSummary}</p>}
        </Link>
        <div className="mt-auto flex min-h-11 items-center justify-between gap-2 pt-3">
          <Link href={`/products/${product.slug}`} className="min-w-0 flex-1">
            {summary.priceType === 'UNAVAILABLE' ? <p className="truncate text-base font-semibold text-zinc-500">Hết hàng</p>
              : summary.priceType === 'RANGE' ? <p className="truncate text-base font-semibold text-zinc-900">{formatPrice(summary.minPrice!)} – {formatPrice(summary.maxPrice!)}</p>
                : <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                  {compareAtPrice !== null && displayPrice !== null && <span className="text-xs text-zinc-400 line-through">{formatPrice(compareAtPrice)}</span>}
                  <span className={`text-base font-semibold ${summary.hasActiveSale ? 'text-rose-500' : 'text-zinc-900'}`}>{formatPrice(displayPrice!)}</span>
                </div>}
            {product.type === 'COMBO' && product.discountAmount ? <p className="truncate text-xs font-bold text-emerald-700">Tiết kiệm {formatPrice(product.discountAmount)}</p> : null}
          </Link>
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={!canQuickAdd}
            aria-label={comboNeedsSelection ? `${product.name}: chọn thành phần combo trong trang chi tiết` : `Thêm ${product.name} vào giỏ hàng`}
            title={comboNeedsSelection ? 'Vào chi tiết để chọn thành phần combo' : canQuickAdd ? 'Thêm vào giỏ hàng' : 'Sản phẩm hiện không có sẵn'}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-600 text-white shadow-sm transition hover:scale-105 hover:bg-pink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none"
          >
            <span className="relative inline-flex" aria-hidden="true">
              <ShoppingCart size={19} strokeWidth={2.25} />
              <Plus className="absolute -right-1 -top-1 rounded-full bg-pink-600" size={11} strokeWidth={3} />
            </span>
          </button>
        </div>
      </div>
    </article>
  )
}

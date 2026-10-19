'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import ProductGallery from '@/components/products/ProductGallery'
import ProductImageView from '@/components/products/ProductImageView'
import type { ProductSizeGuide, ProductVariant, ProductVariantOption, PublicProduct } from '@/lib/products/types'
import { getProductDiscountPercent, getProductEffectivePrice, isProductOnSale } from '@/lib/products/pricing'
import { calculateComboPricing } from '@/lib/products/combos'
import { findSelectedVariant, resolveVariantImage, resolveVariantPrice } from '@/lib/products/variants'
import { useCart } from '@/components/cart/CartProvider'
import { BUY_NOW_STORAGE_KEY, type CartItem } from '@/lib/cart/model'
import { useRouter } from 'next/navigation'

const priceText = (price: number) => `${new Intl.NumberFormat('vi-VN').format(price)}đ`
const genderLabels: Record<string, string> = { boy: 'Bé trai', girl: 'Bé gái', unisex: 'Unisex', man: 'Nam', woman: 'Nữ', other: 'Khác' }

export default function ProductDetailExperience({ product }: { product: PublicProduct }) {
  const router = useRouter()
  const { addItem, announce } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [selectedColorId, setSelectedColorId] = useState<string>()
  const [selectedSizeId, setSelectedSizeId] = useState<string>()
  const [comboSelections, setComboSelections] = useState<Record<number, string>>({})
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)
  useEffect(() => setComboSelections({}), [product.id])
  const colors = product.variantConfig?.colors ?? []
  const sizes = product.variantConfig?.sizes ?? []
  const now = new Date()
  const onSale = isProductOnSale(product, now)
  const selectedVariant = product.hasVariants
    ? findSelectedVariant(product.variantConfig, product.variants, selectedColorId, selectedSizeId)
    : null
  const selectedColor = colors.find(color => color.id === selectedColorId)
  const selectedImageUrl = resolveVariantImage(selectedVariant, selectedColor, product.thumbnail)
  const selectedPrice = resolveVariantPrice(product, selectedVariant, now)
  const hasOwnVariantPrice = selectedVariant?.price != null
  const selectionComplete = !product.hasVariants || Boolean(selectedVariant)
  const stock = product.hasVariants ? selectedVariant?.stock : product.inStock ? 1 : 0
  const comboComponents = useMemo(() => product.type === 'COMBO' ? product.resolvedComponents ?? [] : [], [product.type, product.resolvedComponents])
  const comboVariantComponents = comboComponents.filter(component => component.hasVariants && !component.variantId)
  const comboChoicesComplete = comboVariantComponents.every(component => Boolean(component.variants?.some(variant => variant.id === comboSelections[component.componentIndex])))
  const comboSubtotal = useMemo(() => comboComponents.reduce((sum, component) => {
    const selectedId = component.variantId ?? comboSelections[component.componentIndex]
    const selectedVariant = component.hasVariants && !component.variantId
      ? component.variants?.find(variant => variant.id === selectedId)
      : null
    return sum + (selectedVariant?.price ?? component.unitPrice) * component.quantity
  }, 0), [comboComponents, comboSelections])
  const comboPricing = useMemo(() => {
    if (product.type !== 'COMBO' || !product.discount) return null
    try { return calculateComboPricing(comboSubtotal, product.discount) } catch { return null }
  }, [product.type, product.discount, comboSubtotal])
  const comboAvailable = comboComponents.length ? comboComponents.reduce((available, component) => {
    const selectedId = component.variantId ?? comboSelections[component.componentIndex]
    const selectedVariant = component.hasVariants && !component.variantId
      ? component.variants?.find(variant => variant.id === selectedId)
      : null
    const availableStock = component.hasVariants
      ? component.variantId ? component.stockAvailable : selectedVariant?.stock ?? component.stockAvailable
      : component.stockAvailable
    return Math.min(available, Math.floor(availableStock / component.quantity))
  }, Number.MAX_SAFE_INTEGER) : product.availableCombos ?? 0
  useEffect(() => {
    if (product.type === 'COMBO' && comboChoicesComplete && comboAvailable > 0 && quantity > comboAvailable) setQuantity(comboAvailable)
  }, [product.type, comboChoicesComplete, comboAvailable, quantity])
  const maxQuantity = product.type === 'COMBO' ? comboChoicesComplete ? comboAvailable : product.availableCombos ?? 0 : 99
  const attributes = useMemo(() => Object.entries({
    material: product.attributes?.material,
    gender: product.attributes?.gender ? genderLabels[product.attributes.gender] ?? product.attributes.gender : undefined,
    ageRange: product.attributes?.ageRange,
    style: product.attributes?.style,
    brand: product.attributes?.brand,
    origin: product.attributes?.origin,
    careInstructions: product.attributes?.careInstructions,
  }).filter(([, value]) => typeof value === 'string' && value.trim()), [product.attributes])
  const displaySubtotal = product.type === 'COMBO' ? comboPricing?.subtotal ?? product.price : product.price
  const displayPrice = product.type === 'COMBO' ? comboPricing?.finalPrice ?? getProductEffectivePrice(product, now) : selectedPrice
  const discount = product.type === 'COMBO'
    ? comboPricing && comboPricing.subtotal > comboPricing.finalPrice ? Math.round((comboPricing.discountAmount / comboPricing.subtotal) * 100) : 0
    : !hasOwnVariantPrice && onSale ? getProductDiscountPercent(product, now) : 0
  const comboSelectionsForCart = comboVariantComponents.flatMap(component => {
    const variantId = comboSelections[component.componentIndex]
    return variantId ? [{ componentIndex: component.componentIndex, variantId }] : []
  })
  const canPurchase = selectionComplete && (product.type !== 'COMBO' || comboChoicesComplete && comboAvailable > 0)
  const makeCartItem = (): CartItem => ({
    productId: product.id,
    variantId: selectedVariant?.id ?? null,
    quantity,
    ...(comboSelectionsForCart.length ? { comboSelections: comboSelectionsForCart } : {}),
  })

  return <article className="grid gap-8 lg:grid-cols-2 lg:gap-12">
    <ProductGallery name={product.name} thumbnail={product.thumbnail} images={product.images} preferredImageUrl={selectedImageUrl} />
    <div className="py-1 sm:py-4">
      <div className="flex flex-wrap gap-2">{product.type === 'COMBO' && <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">Combo sản phẩm</span>}{product.isNewArrival && <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-pink-700">Mới về</span>}{discount > 0 && <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">Giảm {discount}%</span>}</div>
      <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{product.name}</h1>
      {product.shortDescription && <p className="mt-4 text-lg leading-7 text-zinc-600">{product.shortDescription}</p>}

      <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {discount > 0 && <span className="text-lg text-zinc-400 line-through">{priceText(displaySubtotal)}</span>}
        <span className={`text-2xl font-black ${discount > 0 ? 'text-rose-600' : 'text-zinc-900'}`}>{priceText(displayPrice)}</span>
      </div>
      {product.type === 'COMBO' && discount > 0 && <><p className="mt-1 text-sm font-bold text-emerald-700">Tiết kiệm {priceText(comboPricing?.discountAmount ?? product.discountAmount ?? 0)}</p>{displaySubtotal !== displayPrice && <p className="mt-1 text-sm text-zinc-400 line-through">{priceText(displaySubtotal)}</p>}</>}
      {product.type === 'COMBO' && comboComponents.length > 0 && <section className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/60 p-4" aria-label="Sản phẩm trong combo"><h2 className="font-black text-violet-950">Combo gồm</h2><ul className="mt-3 space-y-4">{comboComponents.map(component => {
        const selectedId = component.variantId ?? comboSelections[component.componentIndex]
        const selectedVariant = component.hasVariants && !component.variantId
          ? component.variants?.find(variant => variant.id === selectedId)
          : null
        const imageUrl = selectedVariant?.imageUrl || component.imageUrl
        const selectedUnitPrice = selectedVariant?.price ?? component.unitPrice
        const variantLabel = component.variantId ? [component.color, component.size].filter(Boolean).join(' · ') : ''
        return <li key={`${component.productId}-${component.variantId ?? 'customer-choice'}-${component.componentIndex}`} className="flex items-start gap-3">
          <div className="mt-1 h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">{imageUrl && <ProductImageView src={imageUrl} alt="" sizes="48px" variant="thumbnail" className="object-cover" />}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-zinc-800">{component.productName}</p><p className="text-xs text-zinc-500">{variantLabel || (component.variantId ? 'Biến thể cố định' : component.hasVariants ? selectedVariant ? [selectedVariant.color, selectedVariant.size].filter(Boolean).join(' · ') : 'Khách chọn biến thể' : 'Sản phẩm')} · SL {component.quantity}</p>
            {component.hasVariants && !component.variantId && <label className="mt-2 block text-xs font-bold text-zinc-700">Chọn màu / size<select value={comboSelections[component.componentIndex] ?? ''} onChange={event => setComboSelections(current => ({ ...current, [component.componentIndex]: event.target.value }))} className="input mt-1.5 bg-white"><option value="">Chọn màu / size</option>{(component.variants ?? []).map(variant => <option key={variant.id} value={variant.id} disabled={variant.stock < component.quantity}>{[variant.color ? `Màu: ${variant.color}` : null, variant.size ? `Size: ${variant.size}` : null, variant.sku ? `SKU: ${variant.sku}` : null].filter(Boolean).join(' · ')} · {variant.stock > 0 ? `Kho ${variant.stock}` : 'Hết hàng'} · {priceText(variant.price ?? component.unitPrice)}</option>)}</select></label>}
          </div><span className="whitespace-nowrap pt-1 text-xs font-semibold text-zinc-600">{priceText(selectedUnitPrice)}</span>
        </li>
      })}</ul>{comboVariantComponents.length > 0 && <p className="mt-3 text-xs leading-5 text-violet-900">Chọn biến thể để cập nhật giá combo theo lựa chọn của bạn.</p>}</section>}
      {product.sizeGuide?.length ? <button type="button" onClick={() => setSizeGuideOpen(true)} className="mt-3 text-sm font-bold text-pink-700 underline decoration-pink-300 underline-offset-4 hover:text-pink-800">Hướng dẫn chọn size</button> : null}

      {product.hasVariants && <section className="mt-7 space-y-5" aria-label="Chọn phân loại sản phẩm">
        {colors.length > 0 && <OptionButtons label="Màu sắc" options={colors} selectedId={selectedColorId} onSelect={setSelectedColorId} />}
        {sizes.length > 0 && <div>
          <div className="mb-2"><h2 className="text-sm font-bold text-zinc-800">Size</h2></div>
          <div className="flex flex-wrap gap-2">{sizes.map(size => <button key={size.id} type="button" aria-pressed={selectedSizeId === size.id} onClick={() => setSelectedSizeId(size.id)} className={`min-h-11 min-w-12 rounded-xl border px-4 py-2 text-sm font-bold transition ${selectedSizeId === size.id ? 'border-pink-500 bg-pink-50 text-pink-800 ring-2 ring-pink-100' : 'border-zinc-200 bg-white text-zinc-700 hover:border-pink-300'}`}>{size.name}</button>)}</div>
        </div>}
        {!colors.length && !sizes.length && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Thông tin phân loại hiện chưa khả dụng.</p>}
      </section>}

      <StockMessage hasVariants={product.hasVariants === true} selectedVariant={selectedVariant} selectionComplete={selectionComplete} stock={stock} />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="flex h-11 items-center gap-3 rounded-xl border border-zinc-200 px-3 text-sm font-bold text-zinc-700">
          <span>Số lượng</span>
          <input type="number" min={1} max={maxQuantity} value={quantity} onChange={event => setQuantity(Math.max(1, Math.min(Math.max(1, maxQuantity), Number(event.target.value) || 1)))} className="w-12 border-0 p-0 text-center font-bold outline-none focus:ring-0" aria-label="Số lượng sản phẩm" />
        </label>
        <button type="button" disabled={!canPurchase || (product.hasVariants ? !selectedVariant || selectedVariant.stock < 1 : !product.inStock)} onClick={() => {
          addItem(makeCartItem(), product.hasVariants ? selectedVariant?.stock ?? 0 : product.type === 'COMBO' ? comboAvailable : 99)
        }} className="min-h-11 flex-1 rounded-xl border border-pink-600 px-5 py-3 text-sm font-black text-pink-700 transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-400">Thêm vào giỏ</button>
        <button type="button" disabled={!canPurchase || (product.hasVariants ? !selectedVariant || selectedVariant.stock < 1 : !product.inStock)} onClick={() => {
          if (product.hasVariants && !selectedVariant) { announce('Vui lòng chọn màu sắc và size.'); return }
          window.sessionStorage.setItem(BUY_NOW_STORAGE_KEY, JSON.stringify([makeCartItem()]))
          router.push('/checkout')
        }} className="min-h-11 flex-1 rounded-xl bg-pink-600 px-5 py-3 text-sm font-black text-white transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:bg-zinc-300">Mua ngay</button>
      </div>

      {attributes.length > 0 && <section className="mt-8 border-t border-zinc-200 pt-6"><h2 className="text-lg font-black">Thông tin sản phẩm</h2><dl className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2">{attributes.map(([key, value]) => <div key={key} className={key === 'careInstructions' ? 'sm:col-span-2' : ''}><dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">{attributeLabel(key)}</dt><dd className="mt-1 whitespace-pre-line text-sm leading-6 text-zinc-800">{value}</dd></div>)}</dl></section>}
      {product.description && <section className={`${attributes.length ? 'mt-6' : 'mt-8'} border-t border-zinc-200 pt-6`}><h2 className="text-lg font-black">Mô tả sản phẩm</h2><p className="mt-3 whitespace-pre-line leading-7 text-zinc-700">{product.description}</p></section>}
      {!product.hasVariants && <p className={`mt-5 text-sm font-semibold ${(product.type === 'COMBO' ? comboAvailable > 0 : product.inStock) ? 'text-emerald-700' : 'text-slate-500'}`}>{product.type === 'COMBO' ? comboAvailable > 0 ? `Còn ${comboAvailable} combo` : 'Hết hàng' : product.inStock ? 'Còn hàng' : 'Tạm hết hàng'}</p>}
    </div>
    {product.sizeGuide?.length ? <SizeGuideDialog rows={product.sizeGuide} open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} /> : null}
  </article>
}

function OptionButtons({ label, options, selectedId, onSelect }: { label: string; options: ProductVariantOption[]; selectedId?: string; onSelect: (id: string) => void }) {
  return <div><h2 className="mb-2 text-sm font-bold text-zinc-800">{label}</h2><div className="flex flex-wrap gap-2">{options.map(option => <button key={option.id} type="button" aria-pressed={selectedId === option.id} onClick={() => onSelect(option.id)} className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-bold transition ${selectedId === option.id ? 'border-pink-500 bg-pink-50 text-pink-800 ring-2 ring-pink-100' : 'border-zinc-200 bg-white text-zinc-700 hover:border-pink-300'}`}>{option.name}</button>)}</div></div>
}

function StockMessage({ hasVariants, selectedVariant, selectionComplete, stock }: { hasVariants: boolean; selectedVariant: ProductVariant | null; selectionComplete: boolean; stock: number | undefined }) {
  if (!hasVariants) return null
  if (!selectionComplete) return <p role="status" className="mt-5 text-sm font-semibold text-zinc-500">Chọn đầy đủ màu sắc và size để xem tình trạng tồn kho.</p>
  if (!selectedVariant) return <p role="status" className="mt-5 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Phân loại này hiện không khả dụng.</p>
  return <p role="status" className={`mt-5 text-sm font-semibold ${stock && stock > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>{stock && stock > 0 ? `Còn hàng · ${stock} sản phẩm` : 'Hết hàng'}</p>
}

function SizeGuideDialog({ rows, open, onClose }: { rows: ProductSizeGuide[]; open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return <dialog ref={dialogRef} aria-labelledby="size-guide-title" onClose={onClose} className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[88dvh] w-full max-w-none overflow-hidden rounded-t-3xl bg-white p-0 shadow-2xl backdrop:bg-zinc-950/50 md:inset-0 md:m-auto md:max-h-[85dvh] md:max-w-2xl md:rounded-3xl">
    <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 sm:px-6"><div><p className="text-xs font-black uppercase tracking-[.14em] text-pink-600">Kích cỡ sản phẩm</p><h2 id="size-guide-title" className="mt-1 text-xl font-black text-zinc-900">Hướng dẫn chọn size</h2></div><button type="button" onClick={onClose} className="rounded-full border border-zinc-200 px-3 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-50" aria-label="Đóng hướng dẫn chọn size">Đóng</button></div>
    <div className="max-h-[calc(88dvh-76px)] overflow-auto p-4 sm:p-6 md:max-h-[calc(85dvh-76px)]"><div className="overflow-x-auto rounded-xl border border-zinc-200"><table className="w-full min-w-[540px] text-left text-sm"><thead className="bg-pink-50 text-xs font-bold uppercase tracking-wide text-pink-900"><tr><th className="px-4 py-3">Size</th><th className="px-4 py-3">Cân nặng (kg)</th><th className="px-4 py-3">Chiều cao (cm)</th></tr></thead><tbody className="divide-y divide-zinc-100">{rows.map(row => <tr key={row.id}><th scope="row" className="px-4 py-3 font-bold text-zinc-900">{row.size}</th><td className="px-4 py-3 text-zinc-700">{rangeText(row.minWeight, row.maxWeight)}</td><td className="px-4 py-3 text-zinc-700">{rangeText(row.minHeight, row.maxHeight)}</td></tr>)}</tbody></table></div><p className="mt-4 text-xs leading-5 text-zinc-500">Thông số tham khảo theo hướng dẫn của sản phẩm.</p></div>
  </dialog>
}

function rangeText(min?: number, max?: number) {
  const format = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value)
  if (min !== undefined && max !== undefined) return `${format(min)}–${format(max)}`
  if (min !== undefined) return `Từ ${format(min)}`
  if (max !== undefined) return `Đến ${format(max)}`
  return '—'
}

function attributeLabel(key: string) {
  return ({ material: 'Chất liệu', gender: 'Đối tượng sử dụng', ageRange: 'Độ tuổi phù hợp', style: 'Kiểu dáng', brand: 'Thương hiệu', origin: 'Xuất xứ', careInstructions: 'Hướng dẫn bảo quản' } as Record<string, string>)[key] ?? key
}

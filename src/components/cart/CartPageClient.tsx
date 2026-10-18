'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import { cartItemKey } from '@/lib/cart/model'
import { getProductEffectivePrice, isProductOnSale } from '@/lib/products/pricing'
import type { PublicProduct } from '@/lib/products/types'
import ProductImageView from '@/components/products/ProductImageView'
import { useCart } from './CartProvider'

const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}₫`

export default function CartPageClient({ recommendedProducts = [] }: { recommendedProducts?: PublicProduct[] }) {
  const { items, lines, resolvedFingerprint, hydrated, setQuantity, removeItem } = useCart()
  const total = lines.reduce((sum, line) => sum + (line.lineTotal ?? 0), 0)
  const ready = hydrated && (items.length === 0 || resolvedFingerprint === JSON.stringify(items))
  const canCheckout = ready && items.length > 0 && lines.every(line => line.available)
  const suggestions = recommendedProducts.filter(product => product.inStock && !items.some(item => item.productId === product.id)).slice(0, 3)
  const now = new Date()
  return <main className="mx-auto min-h-[65vh] max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="mb-6"><p className="text-sm font-bold text-pink-600">Shop Bé Băng</p><h1 className="mt-1 text-3xl font-black">Giỏ hàng</h1></div>
    {!hydrated || items.length > 0 && !ready ? <div className="rounded-2xl border bg-white p-8 text-center text-zinc-500">Đang kiểm tra giá và tồn kho…</div> : !items.length ? <section className="rounded-3xl border border-dashed border-pink-200 bg-white px-6 py-14 text-center"><p className="text-lg font-bold">Giỏ hàng đang trống</p><p className="mt-2 text-sm text-zinc-500">Chọn món đồ yêu thích cho bé để tiếp tục.</p><Link href="/" className="mt-5 inline-flex rounded-xl bg-pink-600 px-5 py-3 text-sm font-black text-white">Tiếp tục mua sắm</Link></section> : <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
      <section className="space-y-3" aria-label="Sản phẩm trong giỏ">{items.map(item => {
        const key = cartItemKey(item)
        const line = lines.find(candidate => candidate.key === key)
        return <article key={key} className="relative flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 pr-12">
          <button type="button" onClick={() => removeItem(key)} aria-label={`Xóa ${line?.productName ?? 'sản phẩm'} khỏi giỏ hàng`} className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-500"><X size={17} /></button>
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:h-28 sm:w-28">{line?.imageUrl && <ProductImageView src={line.imageUrl} alt="" sizes="(min-width: 640px) 112px, 96px" variant="thumbnail" className="object-cover" />}</div>
          <div className="min-w-0 flex-1"><h2 className="line-clamp-2 font-bold text-zinc-900">{line?.productSlug ? <Link href={`/products/${line.productSlug}`} className="hover:text-pink-700">{line.productName}</Link> : line?.productName ?? 'Đang cập nhật sản phẩm…'}</h2>{line?.isCombo && <span className="mt-1 inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-black text-violet-700">COMBO</span>}<p className="mt-1 text-sm text-zinc-500">{[line?.color, line?.size, line?.sku ? `Mã ${line.sku}` : null].filter(Boolean).join(' · ')}</p>
            {line?.isCombo && Boolean(line.comboComponents?.length) && <ul className="mt-2 space-y-0.5 text-xs text-zinc-500">{line.comboComponents?.map((component, index) => <li key={`${component.productId}-${index}`}>{component.productName}{[component.color, component.size].filter(Boolean).length ? ` · ${[component.color, component.size].filter(Boolean).join(' / ')}` : ''} × {component.quantity}</li>)}</ul>}
            {line?.unitPrice !== null && line?.unitPrice !== undefined && <p className="mt-2 text-sm font-black text-pink-700">{money(line.unitPrice)} <span className="font-normal text-zinc-500">/ sản phẩm</span></p>}
            <div className="mt-3 flex flex-wrap items-center gap-3"><div className="flex h-9 items-center rounded-lg border"><button type="button" aria-label="Giảm số lượng" onClick={() => setQuantity(key, item.quantity - 1)} className="px-3">−</button><span className="min-w-8 text-center text-sm">{item.quantity}</span><button type="button" aria-label="Tăng số lượng" disabled={!line?.available || item.quantity >= (line?.stockAvailable ?? 0)} onClick={() => setQuantity(key, item.quantity + 1)} className="px-3 disabled:text-zinc-300">+</button></div></div>
            {line && !line.available && <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{line.unavailableReason}</p>}
          </div>
          <div className="hidden pt-5 pr-1 text-right font-black sm:block">{line?.lineTotal !== null && line?.lineTotal !== undefined ? money(line.lineTotal) : '—'}</div>
        </article>
      })}</section>
      <div className="space-y-5">
        <aside className="rounded-2xl border border-zinc-200 bg-white p-5 lg:sticky lg:top-24"><h2 className="text-lg font-black">Tạm tính</h2><div className="mt-4 flex justify-between gap-4 text-sm"><span className="text-zinc-600">Tiền hàng</span><strong>{money(total)}</strong></div><div className="mt-3 flex justify-between gap-4 text-sm"><span className="text-zinc-600">Phí vận chuyển</span><span className="text-right text-zinc-600">Shop sẽ xác nhận</span></div><p className="mt-4 rounded-xl bg-pink-50 p-3 text-xs leading-5 text-pink-900">Tổng thanh toán được xác nhận sau khi shop báo phí vận chuyển.</p><Link href="/checkout" aria-disabled={!canCheckout} className={`mt-4 block rounded-xl py-3 text-center text-sm font-black text-white ${canCheckout ? 'bg-pink-600 hover:bg-pink-700' : 'pointer-events-none bg-zinc-300'}`}>Tiến hành đặt hàng</Link>{!canCheckout && items.length > 0 && <p className="mt-2 text-center text-xs text-red-600">Hãy cập nhật sản phẩm hoặc số lượng trước khi đặt.</p>}</aside>
        {suggestions.length > 0 && <section className="rounded-2xl border border-zinc-200 bg-white p-5" aria-labelledby="cart-recommendations-title">
          <h2 id="cart-recommendations-title" className="text-lg font-black">Sản phẩm gợi ý</h2>
          <div className="mt-4 space-y-3">{suggestions.map(product => <Link key={product.id} href={`/products/${product.slug}`} className="flex gap-3 rounded-xl p-2 transition-colors hover:bg-pink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-500">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#fff8f5]">{product.thumbnail && <ProductImageView src={product.thumbnail} alt="" sizes="64px" variant="thumbnail" className="object-cover" />}</div>
            <div className="min-w-0 self-center"><p className="line-clamp-2 text-sm font-semibold text-zinc-800">{product.name}</p>{isProductOnSale(product, now) ? <div className="mt-1 flex flex-wrap items-baseline gap-x-2"><span className="text-xs text-zinc-400 line-through">{money(product.price)}</span><span className="text-sm font-black text-pink-700">{money(getProductEffectivePrice(product, now))}</span></div> : <p className="mt-1 text-sm font-black text-pink-700">{money(product.price)}</p>}</div>
          </Link>)}</div>
        </section>}
      </div>
    </div>}
  </main>
}

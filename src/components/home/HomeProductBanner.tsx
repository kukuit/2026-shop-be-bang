'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import ProductImageView from '@/components/products/ProductImageView'
import { getProductDiscountPercent, getProductEffectivePrice, isProductOnSale } from '@/lib/products/pricing'
import type { HomeBannerProduct } from '@/lib/products/types'

function formatPrice(price: number) {
  return `${new Intl.NumberFormat('vi-VN').format(price)}₫`
}

const loadingGarments = [
  { kind: 'dress', className: 'left-[19%] top-[29%] z-10 w-[34%] rotate-[-13deg]', delay: '0ms' },
  { kind: 'pants', className: 'left-[49%] top-[29%] z-20 w-[34%] rotate-[12deg]', delay: '180ms' },
  { kind: 'shirt', className: 'left-1/2 top-[17%] z-30 w-[34%] -translate-x-1/2 rotate-[1deg]', delay: '360ms' },
] as const

function GarmentShape({ kind }: { kind: (typeof loadingGarments)[number]['kind'] }) {
  if (kind === 'pants') return <svg viewBox="0 0 48 48" fill="#f1f5f9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true" className="h-full w-full">
    <path d="M13 7h22l-1 12-3 22H20l-2-16-2 16H7l-3-22L3 7h10Z" />
    <path d="M13 7v8m22-8v8M18 25h12" fill="none" />
  </svg>

  if (kind === 'dress') return <svg viewBox="0 0 48 48" fill="#f1f5f9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true" className="h-full w-full">
    <path d="M18 6h12l2 9 7 4-5 22H14L9 19l7-4 2-9Z" />
    <path d="M18 6a6 6 0 0 0 12 0M12 31h24" fill="none" />
  </svg>

  return <svg viewBox="0 0 48 48" fill="#f1f5f9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true" className="h-full w-full">
    <path d="m17 6-10 5-5 12 8 4 4-7v21h20V20l4 7 8-4-5-12-10-5a8 8 0 0 1-14 0Z" />
    <path d="M17 6a8 8 0 0 0 14 0" fill="none" />
  </svg>
}

export default function HomeProductBanner() {
  const [product, setProduct] = useState<HomeBannerProduct | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let stopped = false
    const timer = window.setTimeout(() => {
      void fetch('/api/products/home-banner', { cache: 'no-store' })
        .then(async response => {
          if (!response.ok) throw new Error('Home banner request failed')
          return response.json() as Promise<{ product?: HomeBannerProduct | null }>
        })
        .then(result => {
          if (!stopped) setProduct(result.product ?? null)
        })
        .catch(() => {})
        .finally(() => {
          if (!stopped) setLoading(false)
        })
    }, 450)

    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [])

  if (!product?.images.length) return <div role="status" aria-label={loading ? 'Đang tải sản phẩm nổi bật' : 'Chưa có sản phẩm nổi bật'} className="relative aspect-[16/10] overflow-hidden rounded-[2rem] bg-slate-50 shadow-sm ring-1 ring-slate-100">
    {loadingGarments.map(garment => <div key={garment.kind} className={`absolute aspect-square text-slate-300 ${garment.className} ${loading ? 'animate-pulse motion-reduce:animate-none' : ''}`} style={{ animationDelay: garment.delay }}>
      <GarmentShape kind={garment.kind} />
    </div>)}
  </div>

  const images = product.images.slice(0, 3)
  const positions = images.length === 1
    ? [{ className: 'left-1/2 top-1/2 z-30 w-[48%] -translate-x-1/2 -translate-y-1/2 rotate-[2deg]', info: true }]
    : images.length === 2
      ? [
          { className: 'left-2 top-[5%] z-10 w-[43%] rotate-[-7deg]', info: false },
          { className: 'right-2 top-[5%] z-20 w-[43%] rotate-[7deg]', info: true },
        ]
      : [
          { className: 'left-1 top-[10%] z-10 w-[38%] rotate-[-8deg]', info: false },
          { className: 'left-1/2 top-[40px] z-30 w-[38%] -translate-x-1/2 rotate-[1deg]', info: true },
          { className: 'right-1 top-[10px] z-20 w-[38%] rotate-[8deg]', info: false },
        ]
  const now = new Date()
  const onSale = isProductOnSale(product, now)
  const price = getProductEffectivePrice(product, now)

  return <div role="group" aria-label={`Sản phẩm nổi bật: ${product.name}`} className="relative aspect-[16/10] w-full">
    {images.map((image, index) => <Link
      key={`${image.url}-${index}`}
      href={`/products/${product.slug}`}
      aria-label={`${product.name}, ${formatPrice(price)}`}
      className={`absolute ${positions[index].className}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-white shadow-xl ring-4 ring-white transition-transform duration-200 hover:scale-[1.03] sm:rounded-[1.75rem]">
        <ProductImageView src={image.url} publicId={image.publicId} variant="card" alt={image.alt || product.name} sizes="(max-width: 768px) 42vw, 220px" className="object-cover" />
        {onSale && positions[index].info && <span className="absolute right-2 top-2 rounded-full bg-rose-500 px-2 py-1 text-[10px] font-black text-white">-{getProductDiscountPercent(product, now)}%</span>}
        {positions[index].info && <span className="absolute inset-x-1.5 bottom-1.5 rounded-xl bg-white/95 px-2.5 py-2 text-left shadow-md sm:inset-x-2 sm:bottom-2 sm:px-3">
          <span className="block truncate text-[10px] font-bold text-zinc-700 sm:text-xs">{product.name}</span>
          <span className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-xs font-black text-pink-700 sm:text-sm">{formatPrice(price)}</span>
            {onSale && <span className="text-[9px] text-zinc-400 line-through sm:text-[10px]">{formatPrice(product.price)}</span>}
          </span>
        </span>}
      </div>
    </Link>)}
  </div>
}

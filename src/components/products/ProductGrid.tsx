'use client'

import { useState } from 'react'
import ProductCard from '@/components/home/ProductCard'
import type { PublicProduct } from '@/lib/products/types'

type Sort = 'newest' | 'price-asc' | 'price-desc'

export default function ProductGrid({ initialProducts, initialCursor, categorySlug, endpoint }: {
  initialProducts: PublicProduct[]
  initialCursor: string | null
  categorySlug?: string
  endpoint: string
}) {
  const [products, setProducts] = useState(initialProducts)
  const [cursor, setCursor] = useState(initialCursor)
  const [sort, setSort] = useState<Sort>('newest')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadMore = async () => {
    if (!cursor || loading) return
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ limit: '20', sort, cursor })
      const response = await fetch(`${endpoint}?${params}`, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.message ?? 'Chưa tải thêm được sản phẩm.')
      setProducts(current => [...current, ...(body.products ?? [])])
      setCursor(body.nextCursor ?? null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa tải thêm được sản phẩm.') }
    finally { setLoading(false) }
  }

  const changeSort = async (value: Sort) => {
    setSort(value); setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ limit: '20', sort: value })
      const response = await fetch(`${endpoint}?${params}`, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.message ?? 'Chưa tải được sản phẩm.')
      setProducts(body.products ?? []); setCursor(body.nextCursor ?? null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa tải được sản phẩm.') }
    finally { setLoading(false) }
  }

  return <>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-zinc-500">{products.length}{cursor ? '+' : ''} sản phẩm</p>
      <label className="flex items-center gap-2 text-sm font-semibold text-zinc-600">Sắp xếp
        <select value={sort} onChange={event => void changeSort(event.target.value as Sort)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
          <option value="newest">Mới nhất</option><option value="price-asc">Giá tăng dần</option><option value="price-desc">Giá giảm dần</option>
        </select>
      </label>
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {products.length ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">{products.map(product => <ProductCard key={product.id} product={product} />)}</div>
      : <p className="rounded-2xl border border-dashed border-zinc-200 bg-white p-10 text-center text-zinc-500">{categorySlug ? 'Danh mục hiện chưa có sản phẩm.' : 'Hiện chưa có sản phẩm.'}</p>}
    {cursor && <div className="mt-8 text-center"><button disabled={loading} onClick={() => void loadMore()} className="rounded-xl border border-pink-200 bg-white px-6 py-3 font-bold text-pink-600 hover:bg-pink-50 disabled:opacity-50">{loading ? 'Đang tải…' : 'Xem thêm sản phẩm'}</button></div>}
    {categorySlug && <span className="sr-only">{categorySlug}</span>}
  </>
}

import type { Metadata } from 'next'
import Link from 'next/link'
import ProductGrid from '@/components/products/ProductGrid'
import { listPublicProducts } from '@/lib/products/service'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tất cả sản phẩm',
  description: 'Khám phá các sản phẩm đang bán tại Shop Bé Băng.',
  alternates: { canonical: '/products' },
}

export default async function ProductsPage() {
  const initial = await listPublicProducts({ limit: 20 }).catch(error => {
    console.error('[ProductsPage] Could not load products', error)
    return { products: [], nextCursor: null }
  })

  return <main className="min-h-[70vh] bg-[#fffcfa] py-8 text-zinc-900 sm:py-12">
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <nav aria-label="Điều hướng" className="mb-5 text-sm text-zinc-500"><Link href="/" className="hover:text-pink-600">Trang chủ</Link><span className="mx-2">/</span><span>Tất cả sản phẩm</span></nav>
      <header className="mb-8"><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Tất cả sản phẩm</h1></header>
      <ProductGrid initialProducts={initial.products} initialCursor={initial.nextCursor} endpoint="/api/products" />
    </div>
  </main>
}

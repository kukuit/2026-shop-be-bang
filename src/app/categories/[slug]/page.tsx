import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProductGrid from '@/components/products/ProductGrid'
import { getPublicCategoryBySlug } from '@/lib/product-categories/service'
import { listPublicCategoryProducts } from '@/lib/products/service'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const category = await getPublicCategoryBySlug(params.slug).catch(() => null)
  if (!category) return { title: 'Không tìm thấy danh mục' }
  return {
    title: category.name,
    description: category.description || `Khám phá ${category.name} tại Shop Bé Băng.`,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: { title: `${category.name} | Shop Bé Băng`, description: category.description || `Khám phá ${category.name}.`, type: 'website' },
  }
}

export default async function ProductCategoryPage({ params }: { params: { slug: string } }) {
  const category = await getPublicCategoryBySlug(params.slug).catch(error => {
    console.error('[ProductCategoryPage] Could not load category', error)
    return null
  })
  if (!category) notFound()
  const initial = await listPublicCategoryProducts(category.id, { limit: 20 }).catch(error => {
    console.error('[ProductCategoryPage] Could not load products', error)
    return { products: [], nextCursor: null }
  })
  return <main className="min-h-[70vh] bg-[#fffcfa] py-8 text-zinc-900 sm:py-12"><div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
    <nav aria-label="Điều hướng" className="mb-5 text-sm text-zinc-500"><Link href="/" className="hover:text-pink-600">Trang chủ</Link><span className="mx-2">/</span><span>{category.name}</span></nav>
    <header className="mb-8"><h1 className="text-3xl font-black tracking-tight sm:text-4xl">{category.name}</h1>{category.description && <p className="mt-3 max-w-3xl text-zinc-600">{category.description}</p>}</header>
    <ProductGrid initialProducts={initial.products} initialCursor={initial.nextCursor} categorySlug={category.slug} endpoint={`/api/product-categories/${category.slug}/products`} />
  </div></main>
}

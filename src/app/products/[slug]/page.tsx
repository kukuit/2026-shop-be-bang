import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProductDetailExperience from '@/components/products/ProductDetailExperience'
import { listPublicCategories } from '@/lib/product-categories/service'
import { getPublicProductBySlug } from '@/lib/products/service'

export const dynamic = 'force-dynamic'

async function loadProduct(slug: string) {
  return getPublicProductBySlug(slug).catch(error => {
    console.error('[ProductPage] Could not load product', error)
    return null
  })
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await loadProduct(params.slug)
  if (!product) return { title: 'Không tìm thấy sản phẩm' }
  const title = product.seoTitle || product.name
  const description = product.seoDescription || product.shortDescription || product.description.slice(0, 160) || `Xem ${product.name} tại Shop Bé Băng.`
  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: `${title} | Shop Bé Băng`, description, type: 'website', images: product.thumbnail ? [product.thumbnail] : undefined },
  }
}

export default async function ProductDetailPage({ params, searchParams }: {
  params: { slug: string }
  searchParams?: { variant?: string | string[]; variantId?: string | string[] }
}) {
  const product = await loadProduct(params.slug)
  if (!product) notFound()
  const category = (await listPublicCategories().catch(() => [])).find(item => item.id === product.categoryId) ?? null
  return <main className="min-h-[70vh] bg-[#fffcfa] py-8 text-zinc-900 sm:py-12"><div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
    <nav aria-label="Điều hướng" className="mb-5 text-sm text-zinc-500"><Link href="/" className="hover:text-pink-600">Trang chủ</Link><span className="mx-2">/</span>{category && <><Link href={`/categories/${category.slug}`} className="hover:text-pink-600">{category.name}</Link><span className="mx-2">/</span></>}<span>{product.name}</span></nav>
    <ProductDetailExperience product={product} requestedVariantId={typeof searchParams?.variantId === 'string' ? searchParams.variantId : typeof searchParams?.variant === 'string' ? searchParams.variant : undefined} />
  </div></main>
}

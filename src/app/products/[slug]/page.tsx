import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProductGallery from '@/components/products/ProductGallery'
import { listPublicCategories } from '@/lib/product-categories/service'
import { getProductDiscountPercent, getProductEffectivePrice, isProductOnSale } from '@/lib/products/pricing'
import { getPublicProductBySlug } from '@/lib/products/service'

export const dynamic = 'force-dynamic'
const priceText = (price: number) => `${new Intl.NumberFormat('vi-VN').format(price)}đ`

async function loadProduct(slug: string) {
  return getPublicProductBySlug(slug).catch(error => {
    console.error('[ProductPage] Could not load product', error)
    return null
  })
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await loadProduct(params.slug)
  if (!product) return { title: 'Không tìm thấy sản phẩm' }
  const description = product.shortDescription || product.description.slice(0, 160) || `Xem ${product.name} tại Shop Bé Băng.`
  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: `${product.name} | Shop Bé Băng`, description, type: 'website', images: product.thumbnail ? [product.thumbnail] : undefined },
  }
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await loadProduct(params.slug)
  if (!product) notFound()
  const category = (await listPublicCategories().catch(() => [])).find(item => item.id === product.categoryId) ?? null
  const now = new Date()
  const onSale = isProductOnSale(product, now)
  return <main className="min-h-[70vh] bg-[#fffcfa] py-8 text-zinc-900 sm:py-12"><div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
    <nav aria-label="Điều hướng" className="mb-5 text-sm text-zinc-500"><Link href="/" className="hover:text-pink-600">Trang chủ</Link><span className="mx-2">/</span>{category && <><Link href={`/categories/${category.slug}`} className="hover:text-pink-600">{category.name}</Link><span className="mx-2">/</span></>}<span>{product.name}</span></nav>
    <article className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      <ProductGallery name={product.name} thumbnail={product.thumbnail} images={product.images} />
      <div className="py-1 sm:py-4"><div className="flex flex-wrap gap-2">{product.isNewArrival && <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-pink-700">Mới về</span>}{onSale && <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">Giảm {getProductDiscountPercent(product, now)}%</span>}</div>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{product.name}</h1>{product.shortDescription && <p className="mt-4 text-lg leading-7 text-zinc-600">{product.shortDescription}</p>}
        <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">{onSale && <span className="text-lg text-zinc-400 line-through">{priceText(product.price)}</span>}<span className={`text-2xl font-black ${onSale ? 'text-rose-600' : 'text-zinc-900'}`}>{priceText(getProductEffectivePrice(product, now))}</span></div>
        <p className={`mt-4 text-sm font-semibold ${product.inStock ? 'text-emerald-700' : 'text-slate-500'}`}>{product.inStock ? 'Còn hàng' : 'Tạm hết hàng'}</p>
        {product.description && <section className="mt-8 border-t border-zinc-200 pt-6"><h2 className="text-lg font-black">Thông tin sản phẩm</h2><p className="mt-3 whitespace-pre-line leading-7 text-zinc-700">{product.description}</p></section>}
      </div>
    </article>
  </div></main>
}

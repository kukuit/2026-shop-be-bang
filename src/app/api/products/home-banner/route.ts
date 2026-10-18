import { NextResponse } from 'next/server'
import { getHomeBannerProduct } from '@/lib/products/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const product = await getHomeBannerProduct()
    return NextResponse.json({ product: product ? {
      id: product.id,
      name: product.name,
      slug: product.slug,
      images: (product.images.length ? product.images : product.thumbnail ? [{ url: product.thumbnail, publicId: undefined, alt: undefined }] : []).slice(0, 3)
        .map(image => ({
          url: image.url,
          ...(image.publicId ? { publicId: image.publicId } : {}),
          ...(image.alt ? { alt: image.alt } : {}),
        })),
      price: product.price,
      salePrice: product.salePrice,
      saleStartAt: product.saleStartAt,
      saleEndAt: product.saleEndAt,
    } : null }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[HomeProductBanner] Could not load products', error)
    return NextResponse.json({ message: 'Chưa tải được sản phẩm banner.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}

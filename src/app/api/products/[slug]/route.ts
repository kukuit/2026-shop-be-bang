import { NextResponse } from 'next/server'
import { getPublicProductBySlug } from '@/lib/products/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
const noStoreHeaders = { 'Cache-Control': 'no-store' }

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  try {
    const product = await getPublicProductBySlug(params.slug)
    return product
      ? NextResponse.json({ product }, { headers })
      : NextResponse.json({ message: 'Không tìm thấy sản phẩm.' }, { status: 404, headers: noStoreHeaders })
  } catch (error) {
    console.error('[PublicProducts] Detail failed', error)
    return NextResponse.json({ message: 'Chưa tải được sản phẩm.' }, { status: 503, headers: noStoreHeaders })
  }
}

import { NextResponse } from 'next/server'
import { getPublicCategoryBySlug } from '@/lib/product-categories/service'
import { listPublicCategoryProducts } from '@/lib/products/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const search = new URL(request.url).searchParams
  const limit = Number(search.get('limit') ?? 20)
  const sort = search.get('sort') ?? 'newest'
  if (!Number.isInteger(limit) || limit < 1 || limit > 50 || !['newest', 'price-asc', 'price-desc', 'sort-order'].includes(sort))
    return NextResponse.json({ message: 'Tham số danh sách chưa hợp lệ.' }, { status: 400, headers })
  try {
    const category = await getPublicCategoryBySlug(params.slug)
    if (!category) return NextResponse.json({ message: 'Không tìm thấy danh mục.' }, { status: 404, headers })
    const result = await listPublicCategoryProducts(category.id, {
      sort: sort as 'newest' | 'price-asc' | 'price-desc' | 'sort-order',
      cursor: search.get('cursor') ?? undefined,
      limit,
    })
    return NextResponse.json({ category: { id: category.id, name: category.name, slug: category.slug, description: category.description }, ...result }, { headers })
  } catch (error) {
    console.error('[PublicCategories] Products failed', error)
    return NextResponse.json({ message: 'Chưa tải được sản phẩm.' }, { status: 503, headers })
  }
}

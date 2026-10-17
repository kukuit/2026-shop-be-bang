import { NextResponse } from 'next/server'
import { getPublicCategoryBySlug, listPublicCategories } from '@/lib/product-categories/service'
import { listPublicProducts } from '@/lib/products/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const rawLimit = Number(params.get('limit') ?? 20)
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 50)
    return NextResponse.json({ message: 'limit phải từ 1 đến 50.' }, { status: 400, headers })
  const filterValue = params.get('filter')
  if (filterValue && filterValue !== 'new' && filterValue !== 'sale')
    return NextResponse.json({ message: 'filter không hợp lệ.' }, { status: 400, headers })
  const sortValue = params.get('sort') ?? 'newest'
  if (!['newest', 'price-asc', 'price-desc', 'sort-order'].includes(sortValue))
    return NextResponse.json({ message: 'sort không hợp lệ.' }, { status: 400, headers })
  try {
    const categorySlug = params.get('categorySlug')
    const category = categorySlug ? await getPublicCategoryBySlug(categorySlug) : null
    if (categorySlug && !category) return NextResponse.json({ products: [], nextCursor: null }, { headers })
    const result = await listPublicProducts({
      categoryId: category?.id,
      filter: filterValue as 'new' | 'sale' | undefined,
      sort: sortValue as 'newest' | 'price-asc' | 'price-desc' | 'sort-order',
      cursor: params.get('cursor') ?? undefined,
      limit: rawLimit,
    })
    return NextResponse.json(result, { headers })
  } catch (error) {
    console.error('[PublicProducts] List failed', error)
    return NextResponse.json({ message: 'Chưa tải được sản phẩm.' }, { status: 503, headers })
  }
}

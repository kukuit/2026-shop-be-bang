import { NextResponse } from 'next/server'
import { listPublicCategories } from '@/lib/product-categories/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const categories = await listPublicCategories()
    return NextResponse.json({ categories: categories.map(({ id, name, slug, description, imageUrl, parentId, sortOrder, isActive }) => ({ id, name, slug, description, imageUrl, parentId, sortOrder, isActive })) }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch (error) {
    console.error('[PublicCategories] List failed', error)
    return NextResponse.json({ message: 'Chưa tải được danh mục.' }, { status: 503 })
  }
}

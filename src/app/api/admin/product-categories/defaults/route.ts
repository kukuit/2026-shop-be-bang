import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/current-user'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { seedDefaultCategories } from '@/lib/product-categories/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ message: auth.status === 401 ? 'Chưa đăng nhập.' : 'Không đủ quyền.' }, { status: auth.status, headers: { 'Cache-Control': 'private, no-store' } })
  try {
    const categories = await seedDefaultCategories()
    return NextResponse.json({ categories }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[AdminCategories] Default seed failed', error)
    return NextResponse.json({ message: 'Không tạo được danh mục mặc định.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } })
  }
}

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAdminForApi } from '@/lib/auth/admin-api'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { createCategory, listAdminCategories } from '@/lib/product-categories/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
const denied = (status: 401 | 403 | 500) => json({ message: status === 401 ? 'Chưa đăng nhập.' : status === 403 ? 'Không đủ quyền.' : 'Không thể xác thực quyền Admin. Hãy thử lại.' }, status)

export async function GET(request: Request) {
  const auth = await requireAdminForApi()
  if (!auth.ok) return denied(auth.status)
  const params = new URL(request.url).searchParams
  const limit = Number(params.get('limit') ?? 50)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return json({ message: 'Số danh mục mỗi trang chưa hợp lệ.' }, 400)
  try { return json(await listAdminCategories({ search: params.get('search') ?? undefined, cursor: params.get('cursor') ?? undefined, limit })) }
  catch (error) { console.error('[AdminCategories] List failed', error); return json({ message: 'Không thể tải danh mục.' }, 500) }
}

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await requireAdminForApi()
  if (!auth.ok) return denied(auth.status)
  try { return json({ category: await createCategory(await request.json()) }, 201) }
  catch (error) {
    if (error instanceof ZodError) return json({ message: error.issues[0]?.message ?? 'Thông tin danh mục chưa hợp lệ.' }, 400)
    if (error instanceof Error && error.message === 'CATEGORY_SLUG_DUPLICATE') return json({ message: 'Slug danh mục đã tồn tại.' }, 409)
    if (error instanceof Error && error.message === 'CATEGORY_PARENT_NOT_FOUND') return json({ message: 'Không tìm thấy danh mục cha.' }, 400)
    if (error instanceof Error && error.message === 'CATEGORY_CYCLE') return json({ message: 'Không thể tạo vòng lặp danh mục cha/con.' }, 400)
    console.error('[AdminCategories] Create failed', error)
    return json({ message: 'Không thể lưu danh mục.' }, 500)
  }
}

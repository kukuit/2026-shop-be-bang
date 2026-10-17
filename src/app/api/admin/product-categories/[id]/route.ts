import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAdmin } from '@/lib/auth/current-user'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { deleteCategory, getAdminCategory, updateCategory } from '@/lib/product-categories/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
const denied = (status: 401 | 403) => json({ message: status === 401 ? 'Chưa đăng nhập.' : 'Không đủ quyền.' }, status)

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) return denied(auth.status)
  try {
    const category = await getAdminCategory(params.id)
    return category ? json({ category }) : json({ message: 'Không tìm thấy danh mục.' }, 404)
  } catch (error) { console.error('[AdminCategories] Read failed', error); return json({ message: 'Không thể tải danh mục.' }, 500) }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await requireAdmin()
  if (!auth.ok) return denied(auth.status)
  try { return json({ category: await updateCategory(params.id, await request.json()) }) }
  catch (error) {
    if (error instanceof ZodError) return json({ message: error.issues[0]?.message ?? 'Thông tin danh mục chưa hợp lệ.' }, 400)
    if (error instanceof Error && error.message === 'CATEGORY_SLUG_DUPLICATE') return json({ message: 'Slug danh mục đã tồn tại.' }, 409)
    if (error instanceof Error && error.message === 'CATEGORY_NOT_FOUND') return json({ message: 'Không tìm thấy danh mục.' }, 404)
    if (error instanceof Error && error.message === 'CATEGORY_PARENT_NOT_FOUND') return json({ message: 'Không tìm thấy danh mục cha.' }, 400)
    if (error instanceof Error && error.message === 'CATEGORY_CYCLE') return json({ message: 'Không thể tạo vòng lặp danh mục cha/con.' }, 400)
    console.error('[AdminCategories] Update failed', error)
    return json({ message: 'Không thể lưu danh mục.' }, 500)
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await requireAdmin()
  if (!auth.ok) return denied(auth.status)
  try { await deleteCategory(params.id); return json({ deleted: true }) }
  catch (error) {
    if (error instanceof Error && error.message === 'CATEGORY_IN_USE') return json({ message: 'Danh mục còn sản phẩm hoặc danh mục con, không thể xóa.' }, 409)
    if (error instanceof Error && error.message === 'CATEGORY_NOT_FOUND') return json({ message: 'Không tìm thấy danh mục.' }, 404)
    console.error('[AdminCategories] Delete failed', error)
    return json({ message: 'Không thể xóa danh mục.' }, 500)
  }
}

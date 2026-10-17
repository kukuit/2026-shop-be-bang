import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAdminForApi } from '@/lib/auth/admin-api'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { isValidProductDraftToken } from '@/lib/products/draft-token'
import { createProduct, listAdminProducts } from '@/lib/products/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
const denied = (status: 401 | 403 | 500) => json({ message: status === 401 ? 'Chưa đăng nhập.' : status === 403 ? 'Không đủ quyền.' : 'Không thể xác thực quyền Admin. Hãy thử lại.' }, status)

export async function GET(request: Request) {
  const auth = await requireAdminForApi()
  if (!auth.ok) return denied(auth.status)
  const params = new URL(request.url).searchParams
  const limit = Number(params.get('limit') ?? 20)
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return json({ message: 'Số sản phẩm mỗi trang chưa hợp lệ.' }, 400)
  try {
    return json(await listAdminProducts({
      search: params.get('search') ?? undefined,
      categoryId: params.get('categoryId') ?? undefined,
      status: (params.get('status') as 'active' | 'hidden' | 'all' | null) ?? 'all',
      group: (params.get('group') as 'new' | 'sale' | 'all' | null) ?? 'all',
      sort: (params.get('sort') as 'newest' | 'price-asc' | 'price-desc' | 'sort-order' | null) ?? 'newest',
      cursor: params.get('cursor') ?? undefined,
      limit,
    }))
  } catch (error) {
    console.error('[AdminProducts] List failed', error)
    return json({ message: 'Không thể tải danh sách sản phẩm.' }, 500)
  }
}

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await requireAdminForApi()
  if (!auth.ok) return denied(auth.status)
  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ message: 'Thông tin sản phẩm chưa hợp lệ.' }, 400)
    const { draftToken, ...productInput } = body as Record<string, unknown>
    if (typeof productInput.id === 'string' && !isValidProductDraftToken(productInput.id, auth.user.id, draftToken))
      return json({ message: 'Mã sản phẩm tạm thời không hợp lệ hoặc đã hết hạn. Hãy tải lại biểu mẫu.' }, 403)
    return json({ product: await createProduct(productInput) }, 201)
  } catch (error) {
    if (error instanceof ZodError) return json({ message: error.issues[0]?.message ?? 'Thông tin sản phẩm chưa hợp lệ.' }, 400)
    if (error instanceof Error && error.message === 'PRODUCT_SLUG_DUPLICATE') return json({ message: 'Slug sản phẩm đã tồn tại.' }, 409)
    if (error instanceof Error && error.message === 'CATEGORY_NOT_FOUND') return json({ message: 'Không tìm thấy danh mục.' }, 400)
    if (error instanceof Error && error.message === 'CATEGORY_INACTIVE') return json({ message: 'Hãy chọn danh mục đang hiển thị.' }, 400)
    if (error instanceof Error && error.message === 'PRODUCT_IMAGE_NOT_OWNED') return json({ message: 'Ảnh Cloudinary chưa được tải lên cho sản phẩm này.' }, 400)
    if (error instanceof Error && error.message === 'PRODUCT_THUMBNAIL_NOT_IN_IMAGES') return json({ message: 'Ảnh chính phải được chọn từ danh sách ảnh sản phẩm.' }, 400)
    if (error instanceof Error && error.message === 'CLOUDINARY_NOT_CONFIGURED') return json({ message: 'Cloudinary chưa được cấu hình.' }, 503)
    console.error('[AdminProducts] Create failed', error)
    return json({ message: 'Không thể lưu sản phẩm.' }, 500)
  }
}

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAdminForApi } from '@/lib/auth/admin-api'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { getAdminProduct, softDeleteProduct, updateProduct } from '@/lib/products/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
const denied = (status: 401 | 403 | 500) => json({ message: status === 401 ? 'Chưa đăng nhập.' : status === 403 ? 'Không đủ quyền.' : 'Không thể xác thực quyền Admin. Hãy thử lại.' }, status)

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminForApi()
  if (!auth.ok) return denied(auth.status)
  try {
    const product = await getAdminProduct(params.id)
    return product ? json({ product }) : json({ message: 'Không tìm thấy sản phẩm.' }, 404)
  } catch (error) {
    console.error('[AdminProducts] Read failed', error)
    return json({ message: 'Không thể tải sản phẩm.' }, 500)
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await requireAdminForApi()
  if (!auth.ok) return denied(auth.status)
  try {
    const product = await updateProduct(params.id, await request.json())
    return product ? json({ product }) : json({ message: 'Không tìm thấy sản phẩm.' }, 404)
  } catch (error) {
    if (error instanceof ZodError) return json({ message: error.issues[0]?.message ?? 'Thông tin sản phẩm chưa hợp lệ.' }, 400)
    if (error instanceof Error && error.message === 'PRODUCT_SLUG_DUPLICATE') return json({ message: 'Slug sản phẩm đã tồn tại.' }, 409)
    if (error instanceof Error && error.message === 'PRODUCT_NOT_FOUND') return json({ message: 'Không tìm thấy sản phẩm.' }, 404)
    if (error instanceof Error && error.message === 'CATEGORY_NOT_FOUND') return json({ message: 'Không tìm thấy danh mục.' }, 400)
    if (error instanceof Error && error.message === 'CATEGORY_INACTIVE') return json({ message: 'Hãy chọn danh mục đang hiển thị.' }, 400)
    if (error instanceof Error && error.message === 'PRODUCT_IMAGE_NOT_OWNED') return json({ message: 'Ảnh Cloudinary chưa được tải lên cho sản phẩm này.' }, 400)
    if (error instanceof Error && error.message === 'PRODUCT_THUMBNAIL_NOT_IN_IMAGES') return json({ message: 'Ảnh chính phải được chọn từ danh sách ảnh sản phẩm.' }, 400)
    if (error instanceof Error && error.message === 'PRODUCT_VARIANT_IMAGE_NOT_FOUND') return json({ message: 'Ảnh biến thể phải chọn từ danh sách ảnh sản phẩm hiện có.' }, 400)
    if (error instanceof Error && error.message === 'PRODUCT_VARIANT_HAS_ACTIVE_ORDERS') return json({ message: 'Không thể xóa phân loại đang được đơn hàng chưa hoàn tất sử dụng.' }, 409)
    if (error instanceof Error && error.message === 'PRODUCT_DOCUMENT_TOO_LARGE') return json({ message: 'Dữ liệu sản phẩm vượt giới hạn lưu trữ. Hãy giảm số lượng hoặc độ dài dữ liệu biến thể.' }, 413)
    if (error instanceof Error && error.message === 'CLOUDINARY_NOT_CONFIGURED') return json({ message: 'Cloudinary chưa được cấu hình.' }, 503)
    if (error instanceof Error && ['COMBO_COMPONENT_UNAVAILABLE', 'COMBO_COMPONENT_VARIANT_INVALID', 'COMBO_INVALID_COMPONENTS', 'COMBO_INVALID_PRICE', 'COMBO_INVALID_DISCOUNT'].includes(error.message)) return json({ message: 'Combo chưa hợp lệ. Kiểm tra sản phẩm thành phần, biến thể và mức giảm.' }, 400)
    if (error instanceof Error && error.message === 'PRODUCT_TYPE_IMMUTABLE') return json({ message: 'Không thể đổi loại sản phẩm sau khi đã tạo. Hãy tạo sản phẩm combo mới.' }, 409)
    console.error('[AdminProducts] Update failed', error)
    return json({ message: 'Không thể lưu sản phẩm.' }, 500)
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await requireAdminForApi()
  if (!auth.ok) return denied(auth.status)
  try {
    await softDeleteProduct(params.id)
    return json({ deleted: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'PRODUCT_NOT_FOUND') return json({ message: 'Không tìm thấy sản phẩm.' }, 404)
    console.error('[AdminProducts] Delete failed', error)
    return json({ message: 'Không thể xóa sản phẩm.' }, 500)
  }
}

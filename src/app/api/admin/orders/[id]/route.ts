import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminForApi } from '@/lib/auth/admin-api'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { getAdminOrder, updateAdminOrder } from '@/lib/orders/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
const denied = (status: 401 | 403 | 500) => json({ message: status === 401 ? 'Vui lòng đăng nhập.' : status === 403 ? 'Bạn không có quyền truy cập.' : 'Không thể xác thực quyền Admin.' }, status)
const schema = z.object({
  action: z.enum(['set_shipping_fee', 'accept_customer_total', 'confirm', 'cancel', 'ship', 'deliver', 'fail', 'restore_failed_return', 'mark_cod_paid']),
  shippingFee: z.number().int().min(0).max(100_000_000).optional(),
  reason: z.string().trim().max(300).optional(),
}).strict()

export async function GET(_request: Request, context: { params: { id: string } }) {
  const auth = await requireAdminForApi()
  if (!auth.ok) return denied(auth.status)
  try {
    const order = await getAdminOrder(context.params.id)
    return order ? json({ order }) : json({ message: 'Không tìm thấy đơn hàng.' }, 404)
  } catch (error) {
    console.error('[AdminOrders] Detail failed', error)
    return json({ message: 'Không thể tải đơn hàng.' }, 500)
  }
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await requireAdminForApi()
  if (!auth.ok) return denied(auth.status)
  try {
    const parsed = schema.parse(await request.json())
    const order = await updateAdminOrder(context.params.id, parsed.action, parsed, auth.user.id)
    return json({ order })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    const mapped: Record<string, [string, number]> = {
      ORDER_NOT_FOUND: ['Không tìm thấy đơn hàng.', 404],
      ORDER_INVALID_TRANSITION: ['Trạng thái đơn hàng không cho phép thao tác này.', 409],
      ORDER_INVALID_SHIPPING_FEE: ['Phí vận chuyển không hợp lệ.', 400],
      ORDER_SHIPPING_FEE_REQUIRED: ['Cần nhập phí vận chuyển trước.', 409],
      ORDER_CUSTOMER_ACCEPTANCE_REQUIRED: ['Cần ghi nhận khách đã đồng ý tổng tiền trước khi xác nhận đơn.', 409],
      ORDER_FAILURE_REASON_REQUIRED: ['Vui lòng nhập lý do giao hàng thất bại.', 400],
      ORDER_ALREADY_ACCEPTED: ['Khách đã đồng ý tổng tiền. Hãy làm mới đơn hàng.', 409],
      ORDER_NOT_COD: ['Đơn hàng này không dùng COD.', 409],
      ORDER_INVENTORY_RESTORE_FAILED: ['Không thể hoàn kho vì dữ liệu phân loại đã thay đổi.', 409],
      ORDER_RESERVATION_INCONSISTENT: ['Không thể giải phóng tồn kho do dữ liệu giữ hàng không khớp.', 409],
    }
    if (error instanceof z.ZodError) return json({ message: error.issues[0]?.message ?? 'Thông tin thao tác chưa hợp lệ.' }, 400)
    const [message, status] = mapped[code] ?? ['Không thể cập nhật đơn hàng.', 500]
    if (status === 500) console.error('[AdminOrders] Update failed', error)
    return json({ message }, status)
  }
}

import { NextResponse } from 'next/server'
import { requireAdminForApi } from '@/lib/auth/admin-api'
import { listAdminOrders } from '@/lib/orders/service'
import { normalizeOrderSearchQuery } from '@/lib/orders/model'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
const denied = (status: 401 | 403 | 500) => json({ message: status === 401 ? 'Vui lòng đăng nhập.' : status === 403 ? 'Bạn không có quyền truy cập.' : 'Không thể xác thực quyền Admin.' }, status)

export async function GET(request: Request) {
  const auth = await requireAdminForApi()
  if (!auth.ok) return denied(auth.status)
  const params = new URL(request.url).searchParams
  const limit = Number(params.get('limit') ?? 25)
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return json({ message: 'Số đơn mỗi trang không hợp lệ.' }, 400)
  const status = params.get('status') ?? 'ALL'
  if (!['ALL', 'PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'FAILED', 'CANCELLED'].includes(status)) return json({ message: 'Trạng thái lọc không hợp lệ.' }, 400)
  const from = params.has('from') ? Number(params.get('from')) : undefined
  const to = params.has('to') ? Number(params.get('to')) : undefined
  if ((from !== undefined && (!Number.isSafeInteger(from) || from < 0)) || (to !== undefined && (!Number.isSafeInteger(to) || to < 0)) || (from !== undefined && to !== undefined && from > to)) return json({ message: 'Khoảng ngày không hợp lệ.' }, 400)
  try {
    const search = params.get('search')?.trim() ?? ''
    const searchTerm = search ? normalizeOrderSearchQuery(search) : undefined
    return json(await listAdminOrders({
      status, search: searchTerm,
      cursor: params.get('cursor') ?? undefined,
      from, to,
      limit,
    }))
  } catch (error) {
    console.error('[AdminOrders] List failed', error)
    return json({ message: 'Không thể tải danh sách đơn hàng.' }, 500)
  }
}

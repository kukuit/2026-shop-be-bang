import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { acceptGuestOrderTotal } from '@/lib/orders/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  try {
    const body = z.object({ accessToken: z.string().min(32).max(256) }).strict().parse(await request.json())
    return json({ order: await acceptGuestOrderTotal(body.accessToken) })
  } catch (error) {
    if (error instanceof z.ZodError) return json({ message: 'Mã tra cứu chưa hợp lệ.' }, 400)
    const code = error instanceof Error ? error.message : ''
    const mapped: Record<string, [string, number]> = {
      ORDER_ACCESS_TOKEN_INVALID: ['Mã tra cứu không hợp lệ.', 404],
      ORDER_NOT_FOUND: ['Không tìm thấy đơn hàng.', 404],
      ORDER_NOT_PENDING: ['Đơn hàng không còn chờ shop xác nhận.', 409],
      ORDER_SHIPPING_FEE_REQUIRED: ['Shop chưa cập nhật phí vận chuyển và tổng tiền.', 409],
    }
    const [message, status] = mapped[code] ?? ['Không thể ghi nhận xác nhận của bạn lúc này.', 500]
    if (status === 500) console.error('[GuestOrder] Customer acceptance failed', error)
    return json({ message }, status)
  }
}

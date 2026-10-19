import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { createOrder } from '@/lib/orders/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
const schema = z.object({
  idempotencyKey: z.string().min(16).max(128).regex(/^[\w-]+$/),
  shippingConsent: z.literal(true),
  customer: z.object({ name: z.string().trim().min(2).max(100), phone: z.string().trim().min(7).max(30), address: z.string().trim().min(8).max(300), note: z.string().max(500).optional().default('') }).strict(),
  items: z.array(z.object({
    productId: z.string().trim().min(1).max(180).refine(value => !value.includes('/')),
    variantId: z.string().trim().max(180).refine(value => !value.includes('/')).nullable(),
    quantity: z.number().int().min(1).max(99),
    comboSelections: z.array(z.object({ componentIndex: z.number().int().min(0).max(19), variantId: z.string().trim().min(1).max(180).refine(value => !value.includes('/')) }).strict()).max(20).optional(),
  }).strict()).min(1).max(25),
}).strict()

function errorResponse(error: unknown) {
  if (error instanceof ZodError) return json({ message: error.issues[0]?.message ?? 'Thông tin đặt hàng chưa hợp lệ.' }, 400)
  const code = error instanceof Error ? error.message : ''
  const mapped: Record<string, [string, number]> = {
    ORDER_INVALID_PHONE: ['Số điện thoại chưa đúng định dạng.', 400],
    ORDER_PRODUCT_UNAVAILABLE: ['Một sản phẩm trong giỏ không còn bán. Hãy cập nhật giỏ hàng.', 409],
    ORDER_VARIANT_REQUIRED: ['Vui lòng chọn đầy đủ phân loại sản phẩm.', 409],
    ORDER_VARIANT_UNAVAILABLE: ['Một phân loại đã thay đổi. Hãy cập nhật giỏ hàng.', 409],
    ORDER_INSUFFICIENT_STOCK: ['Tồn kho vừa thay đổi. Hãy kiểm tra lại số lượng.', 409],
    ORDER_PRICE_UNAVAILABLE: ['Không thể xác nhận giá sản phẩm lúc này.', 409],
    ORDER_IDEMPOTENCY_CONFLICT: ['Yêu cầu đặt hàng này đã được dùng cho thông tin khác. Hãy thử lại.', 409],
    ORDER_RETRY_REQUIRED: ['Không thể tạo mã đơn lúc này. Vui lòng gửi lại yêu cầu.', 503],
    ORDER_RATE_LIMITED: ['Bạn đã gửi nhiều yêu cầu. Vui lòng thử lại sau 15 phút.', 429],
    ORDER_QUANTITY_LIMIT: ['Tổng số lượng của một phân loại không được vượt quá 99.', 400],
    ORDER_COMPLEXITY_LIMIT: ['Đơn hàng có quá nhiều loại sản phẩm thành phần. Vui lòng tách thành các đơn nhỏ hơn.', 400],
  }
  const [message, status] = mapped[code] ?? ['Không thể tạo đơn hàng lúc này. Vui lòng thử lại.', 500]
  if (status === 500) console.error('[Orders] Create failed', error)
  return json({ message }, status)
}

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  try {
    const parsed = schema.parse(await request.json())
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const ip = forwarded || request.headers.get('x-real-ip') || 'unknown'
    const result = await createOrder(parsed, ip)
    return json({ orderCode: result.orderCode, accessToken: result.accessToken, created: result.created }, result.created ? 201 : 200)
  } catch (error) { return errorResponse(error) }
}

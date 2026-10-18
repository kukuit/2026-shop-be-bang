import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { lookupGuestOrder } from '@/lib/orders/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  try {
    const body = z.object({ accessToken: z.string().min(32).max(256) }).strict().parse(await request.json())
    const order = await lookupGuestOrder(body.accessToken)
    return order ? json({ order }) : json({ message: 'Không tìm thấy đơn hàng. Hãy kiểm tra mã tra cứu.' }, 404)
  } catch {
    return json({ message: 'Thông tin tra cứu chưa hợp lệ.' }, 400)
  }
}

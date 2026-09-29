import { NextResponse } from 'next/server'
import { requireGameUser } from '@/lib/auth/current-user'
import { cancelRedemption } from '@/lib/rewards/service'
export const runtime = 'nodejs'
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireGameUser()
  if (!auth.ok) return NextResponse.json({ message: 'Vui lòng đăng nhập.' }, { status: auth.status })
  if (!/^[a-zA-Z0-9_-]{1,180}$/.test(params.id)) return NextResponse.json({ message: 'Lịch sử không hợp lệ.' }, { status: 400 })
  try { await cancelRedemption(auth.user.id, params.id); return NextResponse.json({ ok: true }) }
  catch (error) {
    const status = error instanceof Error && error.message === 'NOT_FOUND' ? 404 : error instanceof Error && error.message === 'INVALID_STATUS' ? 409 : 500
    return NextResponse.json({ message: status === 409 ? 'Chỉ có thể hủy quà đang chờ nhận.' : 'Không thể hủy lượt đổi quà.' }, { status })
  }
}

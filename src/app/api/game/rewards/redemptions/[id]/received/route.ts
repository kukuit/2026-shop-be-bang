import { NextResponse } from 'next/server'
import { requireGameUser } from '@/lib/auth/current-user'
import { markReceived } from '@/lib/rewards/service'
export const runtime = 'nodejs'
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireGameUser()
  if (!auth.ok) return NextResponse.json({ message: 'Vui lòng đăng nhập.' }, { status: auth.status })
  if (!/^[a-zA-Z0-9_-]{1,180}$/.test(params.id)) return NextResponse.json({ message: 'Lịch sử không hợp lệ.' }, { status: 400 })
  try { await markReceived(auth.user.id, params.id); return NextResponse.json({ ok: true }) }
  catch { return NextResponse.json({ message: 'Không thể cập nhật lịch sử.' }, { status: 404 }) }
}

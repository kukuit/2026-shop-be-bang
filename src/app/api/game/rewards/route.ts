import { NextResponse } from 'next/server'
import { requireGameUser } from '@/lib/auth/current-user'
import { listRedemptions, listRewards, saveReward } from '@/lib/rewards/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
export async function GET(request: Request) {
  const auth = await requireGameUser()
  if (!auth.ok) return json({ message: 'Vui lòng đăng nhập tài khoản có quyền chơi game.' }, auth.status)
  try {
    if (new URL(request.url).searchParams.get('resource') === 'redemptions') return json({ redemptions: await listRedemptions(auth.user.id) })
    return json(await listRewards(auth.user.id))
  } catch (error) { console.error('[Rewards] list failed', error); return json({ message: 'Không thể tải dữ liệu quà.' }, 500) }
}
export async function POST(request: Request) {
  const auth = await requireGameUser()
  if (!auth.ok) return json({ message: 'Vui lòng đăng nhập tài khoản có quyền chơi game.' }, auth.status)
  try {
    const body = await request.json()
    if (typeof body.name !== 'string' || typeof body.coinCost !== 'number' || typeof body.isActive !== 'boolean' || (body.id !== undefined && typeof body.id !== 'string')) return json({ message: 'Thông tin quà chưa hợp lệ.' }, 400)
    return json({ reward: await saveReward(auth.user.id, body) })
  } catch (error) {
    if (error instanceof Error && ['INVALID_REWARD', 'INVALID_IMAGE'].includes(error.message)) return json({ message: 'Tên, số xu hoặc ảnh quà chưa hợp lệ.' }, 400)
    if (error instanceof Error && error.message === 'NOT_FOUND') return json({ message: 'Không tìm thấy quà.' }, 404)
    console.error('[Rewards] save failed', error); return json({ message: 'Không thể lưu quà.' }, 500)
  }
}

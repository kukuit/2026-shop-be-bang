import { NextResponse } from 'next/server'
import { requireGameUser } from '@/lib/auth/current-user'
import { redeemReward } from '@/lib/rewards/service'
export const runtime = 'nodejs'
export async function POST(request: Request) {
  const auth = await requireGameUser()
  if (!auth.ok) return NextResponse.json({ message: 'Vui lòng đăng nhập tài khoản có quyền chơi game.' }, { status: auth.status })
  try {
    const body = await request.json()
    if (typeof body.rewardId !== 'string' || !/^[a-zA-Z0-9_-]{1,180}$/.test(body.rewardId)) return NextResponse.json({ message: 'Món quà chưa hợp lệ.' }, { status: 400 })
    return NextResponse.json(await redeemReward(auth.user.id, body.rewardId), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.startsWith('INSUFFICIENT_BALANCE:')) return NextResponse.json({ message: 'INSUFFICIENT_BALANCE', coinBalance: Number(message.split(':')[1]) || 0 }, { status: 409 })
    if (message === 'REWARD_UNAVAILABLE') return NextResponse.json({ message: 'REWARD_UNAVAILABLE' }, { status: 409 })
    console.error('[Rewards] redeem failed', error); return NextResponse.json({ message: 'Không thể đổi quà lúc này.' }, { status: 500 })
  }
}

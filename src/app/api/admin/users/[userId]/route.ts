import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getUserById, updateUser } from '@/lib/users/user.service'
import { requireAdmin } from '@/lib/auth/current-user'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'

export const runtime = 'nodejs'
const denied = (status: 401 | 403) =>
  NextResponse.json({ message: status === 401 ? 'Chưa đăng nhập.' : 'Không đủ quyền.' }, { status })

export async function GET(_: Request, { params }: { params: { userId: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) return denied(auth.status)
  const user = await getUserById(params.userId)
  return user
    ? NextResponse.json({ user })
    : NextResponse.json({ message: 'Không tìm thấy user.' }, { status: 404 })
}
export async function PATCH(request: Request, { params }: { params: { userId: string } }) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await requireAdmin()
  if (!auth.ok) return denied(auth.status)
  try {
    const user = await updateUser(params.userId, await request.json())
    return user
      ? NextResponse.json({ user })
      : NextResponse.json({ message: 'Không tìm thấy user.' }, { status: 404 })
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof ZodError ? error.issues[0]?.message : 'Không thể cập nhật user.',
      },
      { status: 400 }
    )
  }
}

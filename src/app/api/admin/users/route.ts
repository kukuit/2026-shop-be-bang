import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createUser, getUsers } from '@/lib/users/user.service'
import { requireAdmin } from '@/lib/auth/current-user'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'

export const runtime = 'nodejs'
const denied = (status: 401 | 403) =>
  NextResponse.json({ message: status === 401 ? 'Chưa đăng nhập.' : 'Không đủ quyền.' }, { status })

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return denied(auth.status)
  return NextResponse.json({ users: await getUsers() })
}
export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await requireAdmin()
  if (!auth.ok) return denied(auth.status)
  try {
    return NextResponse.json({ user: await createUser(await request.json()) }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'USERNAME_DUPLICATE')
      return NextResponse.json({ message: 'Username đã tồn tại.' }, { status: 409 })
    return NextResponse.json(
      { message: error instanceof ZodError ? error.issues[0]?.message : 'Không thể tạo user.' },
      { status: 400 }
    )
  }
}

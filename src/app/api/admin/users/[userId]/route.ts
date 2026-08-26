import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getUserById, updateUser } from '@/lib/users/user.service'

export const runtime = 'nodejs'
// TODO(auth): protect this route before production. The project currently has no admin authentication.

export async function GET(_: Request, { params }: { params: { userId: string } }) {
  const user = await getUserById(params.userId)
  return user ? NextResponse.json({ user }) : NextResponse.json({ message: 'Không tìm thấy user.' }, { status: 404 })
}
export async function PATCH(request: Request, { params }: { params: { userId: string } }) {
  try { const user = await updateUser(params.userId, await request.json()); return user ? NextResponse.json({ user }) : NextResponse.json({ message: 'Không tìm thấy user.' }, { status: 404 }) }
  catch (error) { return NextResponse.json({ message: error instanceof ZodError ? error.issues[0]?.message : 'Không thể cập nhật user.' }, { status: 400 }) }
}

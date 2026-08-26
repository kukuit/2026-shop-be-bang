import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createUser, getUsers } from '@/lib/users/user.service'

export const runtime = 'nodejs'
// TODO(auth): protect this route before production. The project currently has no admin authentication.

export async function GET() { return NextResponse.json({ users: await getUsers() }) }
export async function POST(request: Request) {
  try { return NextResponse.json({ user: await createUser(await request.json()) }, { status: 201 }) }
  catch (error) { return NextResponse.json({ message: error instanceof ZodError ? error.issues[0]?.message : 'Không thể tạo user.' }, { status: 400 }) }
}

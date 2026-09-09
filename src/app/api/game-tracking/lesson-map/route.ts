import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { getLessonMapProgress } from '@/lib/lessonMapProgress'
import { isMapSubject } from '@/components/games/lesson-map/progress-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Authentication required.' }, { status: 401, headers })
  const params = new URL(request.url).searchParams
  const subject = params.get('subject') ?? ''
  if (params.get('grade') !== 'lop-1' || !isMapSubject(subject))
    return NextResponse.json({ message: 'Invalid map.' }, { status: 400, headers })
  try {
    return NextResponse.json({ userId: user.id, items: await getLessonMapProgress(user.id, subject) }, { headers })
  } catch (error) {
    console.error('[LessonMap] Could not load progress', error)
    return NextResponse.json({ message: 'Could not load progress.' }, { status: 500, headers })
  }
}

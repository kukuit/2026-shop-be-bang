import { NextResponse } from 'next/server'
import { requireGameUser } from '@/lib/auth/current-user'
import { getSubjectLessons, isSubjectId } from '@/lib/game-progress/config'
import { isValidGrade } from '@/lib/game-profile'
import { getLessonGoalProgress, getSessionDetail, getSessionPage, getSubjectProgress, InvalidCursorError } from '@/lib/game-progress/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers })

export async function GET(request: Request) {
  const auth = await requireGameUser()
  if (!auth.ok) return json({ message: auth.status === 401 ? 'Vui lòng đăng nhập.' : 'Tài khoản chưa có quyền chơi game.' }, auth.status)
  const params = new URL(request.url).searchParams
  const userId = auth.user.id
  try {
    const resource = params.get('resource')
    if (resource === 'sessions') return json({ userId, ...await getSessionPage(userId, params.get('cursor')) })
    if (resource === 'session') {
      const id = params.get('sessionId') ?? ''
      if (!/^[a-zA-Z0-9_-]{1,200}$/.test(id)) return json({ message: 'Phiên không hợp lệ.' }, 400)
      const session = await getSessionDetail(userId, id)
      return session ? json(session) : json({ message: 'Không tìm thấy phiên chơi.' }, 404)
    }
    const grade = Number(params.get('grade'))
    const subject = params.get('subject') ?? ''
    if (!isValidGrade(grade) || !isSubjectId(subject)) return json({ message: 'Lớp hoặc môn không hợp lệ.' }, 400)
    if (resource === 'subject') return json(await getSubjectProgress(userId, grade, subject))
    if (resource === 'goals') {
      const lessonId = params.get('lessonId') ?? ''
      if (!getSubjectLessons(grade, subject).some(lesson => lesson.lessonId === lessonId))
        return json({ message: 'Bài học không thuộc lớp và môn đã chọn.' }, 400)
      return json(await getLessonGoalProgress(userId, lessonId))
    }
    return json({ message: 'Yêu cầu không hợp lệ.' }, 400)
  } catch (error) {
    if (error instanceof InvalidCursorError) return json({ message: 'Trang tiếp theo không hợp lệ.' }, 400)
    console.error('[GameMe] Could not load progress', error)
    return json({ message: 'Không thể tải dữ liệu. Vui lòng thử lại.' }, 500)
  }
}

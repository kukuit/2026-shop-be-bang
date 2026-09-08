import { NextResponse } from 'next/server'
import { requireGameUser } from '@/lib/auth/current-user'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { LESSON_CATALOG } from '@/components/games/general/tracking/lesson-catalog'
import type { ProgressLesson, ProgressReport } from '@/lib/chat/learning-progress'
import { PROGRESS_SUBJECTS, type ProgressSubject } from '@/lib/chat/learning-progress'
import { isValidGrade } from '@/lib/game-profile'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    const auth = await requireGameUser()
    if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? 'Vui lòng đăng nhập lại để xem tiến trình.' : 'Tài khoản chưa được bật quyền học game.' }, { status: auth.status, headers })
    const params = new URL(request.url).searchParams
    // requireGameUser reads the current profile from the database on every request.
    const grade = auth.user.activeGrade ?? auth.user.primaryGrade
    if (!isValidGrade(grade))
      return NextResponse.json({ error: 'Hồ sơ của bé chưa có thông tin lớp học nên chưa thể tải tiến trình theo lớp.' }, { status: 422, headers })
    const subject = params.get('subject')
    if (subject !== null && !Object.hasOwn(PROGRESS_SUBJECTS, subject))
      return NextResponse.json({ error: 'Môn học không hợp lệ.' }, { status: 400, headers })
    const detail = params.get('detail') === '1'
    const collection = getAdminDb().collection('shopbebangcom').doc('game').collection('learning_progress')
    const selectedLessons = Object.values(LESSON_CATALOG).filter(lesson =>
      String(lesson.gradeId) === `lop-${grade}` && (!subject || lesson.subjectId === subject))
    const lessons: ProgressLesson[] = await Promise.all(selectedLessons.map(async lesson => {
      const snapshot = await collection.doc(`${auth.user.id}_${lesson.lessonId}`).get()
      const data = snapshot.data()
      const goals = lesson.learningGoals.map(goal => {
        const progress = data?.keys?.[goal.key]
        return { title: goal.title, attempts: Number(progress?.attempts ?? 0), correct: Number(progress?.correct ?? 0), wrong: Number(progress?.wrong ?? 0) }
      })
      const practiced = goals.filter(goal => goal.attempts > 0).length
      return {
        id: lesson.lessonId,
        subjectId: lesson.subjectId,
        title: `${lesson.subjectLabel} ${lesson.gradeLabel.toLowerCase()}, bài ${lesson.lessonNumber} — ${lesson.title}`,
        practiced, total: goals.length, percent: Math.round(practiced / goals.length * 100),
        sessions: Number(data?.totalSessions ?? 0),
        ...(detail ? { goals } : {}),
      }
    }))
    const practiced = lessons.reduce((sum, lesson) => sum + lesson.practiced, 0)
    const total = lessons.reduce((sum, lesson) => sum + lesson.total, 0)
    const report: ProgressReport = { grade, ...(subject ? { subject: subject as ProgressSubject } : {}), practiced, total, percent: total ? Math.round(practiced / total * 100) : 0, lessons }
    return NextResponse.json(report, { headers })
  } catch (error) {
    console.error('Chat learning progress error:', error)
    return NextResponse.json({ error: 'Chưa tải được tiến trình học. Bạn thử lại nhé.' }, { status: 500, headers })
  }
}

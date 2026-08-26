import Link from 'next/link'
import { getAdminLearningProgress } from '@/lib/gameTrackingAdmin'
import { getLessonDefinition, LESSON_CATALOG, type LessonId } from '@/components/games/general/tracking/lesson-catalog'

const accuracy = (correct: number, attempts: number) => attempts ? Math.round(correct / attempts * 100) : 0

export default async function EvaluationPage({ searchParams }: { searchParams?: { userId?: string; lessonId?: string } }) {
  const allProgress = await getAdminLearningProgress()
  const requestedLesson = searchParams?.lessonId ? getLessonDefinition(searchParams.lessonId) : undefined
  const lesson = requestedLesson ?? LESSON_CATALOG[Object.keys(LESSON_CATALOG)[0] as LessonId]
  const lessonProgress = allProgress.filter((item) => item.lessonId === lesson.lessonId)
  const selectedUserId = searchParams?.userId || lessonProgress[0]?.userId
  const selected = lessonProgress.find((item) => item.userId === selectedUserId)

  return <div className="space-y-6">
    <div><p className="text-sm font-bold text-blue-600">{lesson.gradeLabel} / {lesson.subjectLabel}</p><h2 className="text-2xl font-black">Bài {lesson.lessonNumber} · {lesson.title}</h2><p className="mt-1 text-sm text-slate-500">100% nghĩa là chưa có lần trả lời sai; “còn yếu” hiện được hiển thị khi độ chính xác dưới 70%.</p></div>
    <div className="flex flex-wrap gap-2">{Object.values(LESSON_CATALOG).map((item) => <Link key={item.lessonId} href={`/game/admin/danh-gia?lessonId=${item.lessonId}`} className={`rounded-xl px-4 py-2 text-sm font-bold ${item.lessonId === lesson.lessonId ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>Bài {item.lessonNumber}</Link>)}</div>
    <div className="flex flex-wrap gap-2">{lessonProgress.map((item) => <Link key={item.id} href={`/game/admin/danh-gia?lessonId=${lesson.lessonId}&userId=${encodeURIComponent(item.userId)}`} className={`rounded-xl px-4 py-2 text-sm font-bold ${item.userId === selectedUserId ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>{item.userId}</Link>)}</div>
    {!selected ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Chưa có dữ liệu tiến độ cho Bài {lesson.lessonNumber} · {lesson.title}.</div> : <>
      <section className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Người học</p><p className="mt-1 text-xl font-black">{selected.userId}</p></div><div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Tổng phiên</p><p className="mt-1 text-xl font-black">{selected.totalSessions}</p></div><div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Cập nhật</p><p className="mt-1 text-sm font-bold">{selected.updatedAt ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(selected.updatedAt)) : '—'}</p></div></section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{lesson.learningGoals.map((goal) => {
        const progress = selected.keys[goal.key] ?? { correct: 0, wrong: 0, attempts: 0, responseTime: 0, sessions: 0 }
        const value = accuracy(progress.correct, progress.attempts)
        const status = !progress.attempts ? 'Chưa có dữ liệu' : value === 100 ? 'Đạt 100%' : value < 70 ? 'Còn yếu' : 'Đang tiến bộ'
        const color = !progress.attempts ? 'bg-slate-400' : value === 100 ? 'bg-emerald-500' : value < 70 ? 'bg-red-500' : 'bg-amber-500'
        return <article key={goal.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{goal.title}</h3><p className="mt-1 text-xs text-slate-400">{goal.key}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${color}`}>{status}</span></div><p className="mt-5 text-4xl font-black text-slate-900">{value}%</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${color}`} style={{ width: `${value}%` }} /></div><dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div><dt className="text-slate-400">Đúng</dt><dd className="font-black text-emerald-600">{progress.correct}</dd></div><div><dt className="text-slate-400">Sai</dt><dd className="font-black text-red-600">{progress.wrong}</dd></div><div><dt className="text-slate-400">Số lần</dt><dd className="font-black">{progress.attempts}</dd></div></dl></article>
      })}</section>
    </>}
  </div>
}

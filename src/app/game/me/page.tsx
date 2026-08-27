import Link from 'next/link'
import { BookOpenCheck, Clock3, Gamepad2, Target } from 'lucide-react'
import { requireGameUser } from '@/lib/auth/current-user'
import { getUserGameData } from '@/lib/gameTrackingUser'
import { getLessonDefinition } from '@/components/games/general/tracking/lesson-catalog'

const accuracy = (correct: number, attempts: number) =>
  attempts ? Math.round((correct / attempts) * 100) : 0
const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Asia/Bangkok',
      }).format(new Date(value))
    : '—'

export default async function GameMePage() {
  const auth = await requireGameUser()
  if (!auth.ok) return null
  const { sessions, progress } = await getUserGameData(auth.user.id)
  const answers = sessions.flatMap((session) => session.results)
  const overallAccuracy = accuracy(
    answers.filter((answer) => answer.correct).length,
    answers.length
  )
  return (
    <div className="space-y-7 text-slate-900">
      <section className="rounded-3xl bg-gradient-to-r from-blue-600 to-sky-500 p-6 text-white shadow-lg">
        <p className="text-sm font-bold text-blue-100">Tiến trình học của</p>
        <h1 className="mt-1 text-3xl font-black">{auth.user.displayName}</h1>
        <p className="mt-2 text-sm text-blue-50">
          Dữ liệu dưới đây chỉ thuộc tài khoản đang đăng nhập.
        </p>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          [Gamepad2, 'Phiên đã chơi', sessions.length],
          [Target, 'Độ chính xác', `${overallAccuracy}%`],
          [BookOpenCheck, 'Bài có tiến trình', progress.length],
        ].map(([Icon, label, value]) => {
          const Component = Icon as typeof Gamepad2
          return (
            <article key={String(label)} className="rounded-2xl bg-white p-5 shadow-sm">
              <Component className="text-blue-600" />
              <p className="mt-3 text-sm text-slate-500">{String(label)}</p>
              <p className="mt-1 text-3xl font-black">{String(value)}</p>
            </article>
          )
        })}
      </section>
      <section>
        <h2 className="text-xl font-black">Tiến trình theo bài học</h2>
        <div className="mt-4 space-y-5">
          {!progress.length && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              Chưa có dữ liệu tiến trình. Hãy hoàn thành một trò chơi để bắt đầu.
            </div>
          )}
          {progress.map((item) => {
            const lesson = getLessonDefinition(item.lessonId)
            return (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-blue-600">
                      {lesson ? `${lesson.gradeLabel} / ${lesson.subjectLabel}` : item.lessonId}
                    </p>
                    <h3 className="mt-1 text-lg font-black">{lesson?.title ?? item.lessonId}</h3>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {item.totalSessions} phiên
                  </span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(item.keys).map(([key, value]) => {
                    const goal = lesson?.learningGoals.find((candidate) => candidate.key === key)
                    const percent = accuracy(value.correct, value.attempts)
                    return (
                      <div key={key} className="rounded-xl bg-slate-50 p-4">
                        <p className="truncate text-sm font-bold">{goal?.title ?? key}</p>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full bg-emerald-500" style={{ width: `${percent}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          {percent}% · {value.correct} đúng / {value.attempts} lần
                        </p>
                      </div>
                    )
                  })}
                </div>
              </article>
            )
          })}
        </div>
      </section>
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Phiên gần đây</h2>
          <Link href="/game" className="text-sm font-bold text-blue-600">
            Chơi game →
          </Link>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {!sessions.length ? (
            <p className="p-8 text-center text-slate-500">Chưa có phiên chơi.</p>
          ) : (
            sessions.slice(0, 10).map((session) => (
              <article
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-4 last:border-0"
              >
                <div>
                  <p className="font-black">{session.gameId}</p>
                  <p className="text-xs text-slate-500">
                    {getLessonDefinition(session.lessonId)?.title ?? session.lessonId}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-700">
                    {session.score} điểm · {accuracy(session.correctCount, session.totalQuestions)}%
                  </p>
                  <p className="flex items-center justify-end gap-1 text-xs text-slate-400">
                    <Clock3 size={12} />
                    {formatDate(session.completedAt)}
                  </p>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

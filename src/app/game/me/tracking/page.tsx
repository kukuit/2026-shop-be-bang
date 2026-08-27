import Link from 'next/link'
import { requireGameUser } from '@/lib/auth/current-user'
import { getUserGameData } from '@/lib/gameTrackingUser'

const percent = (correct: number, attempts: number) =>
  attempts ? Math.round((correct / attempts) * 100) : 0

export default async function TrackingPage() {
  const auth = await requireGameUser()
  if (!auth.ok) return null
  const { sessions, progress } = await getUserGameData(auth.user.id)
  const answers = sessions.flatMap((session) => session.results)
  const correct = answers.filter((answer) => answer.correct).length

  const cards = [
    ['Phiên đã lưu', sessions.length],
    ['Người học', auth.user.displayName],
    ['Lượt trả lời', answers.length],
    ['Độ chính xác', `${percent(correct, answers.length)}%`],
  ]

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-2xl font-black">Tổng quan tracking</h2>
        <p className="mt-1 text-sm text-slate-500">
          Dữ liệu tổng hợp từ tối đa 100 phiên gần nhất.
        </p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black text-blue-700">{value}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Link
          href="/game/me/session"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-blue-300"
        >
          <h3 className="font-black">Phiên chơi gần đây</h3>
          <p className="mt-2 text-sm text-slate-500">
            Xem điểm, thời gian và từng lần trả lời đúng/sai.
          </p>
          <p className="mt-5 text-sm font-bold text-blue-700">Mở danh sách →</p>
        </Link>
        <Link
          href="/game/me/evaluation"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-blue-300"
        >
          <h3 className="font-black">Đánh giá theo bài</h3>
          <p className="mt-2 text-sm text-slate-500">
            Có {progress.length} hồ sơ tiến độ đang được tổng hợp.
          </p>
          <p className="mt-5 text-sm font-bold text-blue-700">Xem mục tiêu mạnh/yếu →</p>
        </Link>
      </section>
    </div>
  )
}

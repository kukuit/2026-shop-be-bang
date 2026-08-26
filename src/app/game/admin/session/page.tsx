import { getAdminGameSessions } from '@/lib/gameTrackingAdmin'

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(value)) : '—'
const formatDuration = (milliseconds: number) => `${Math.round(milliseconds / 1000)} giây`

export default async function SessionPage() {
  const sessions = await getAdminGameSessions()
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-black">Phiên chơi</h2><p className="mt-1 text-sm text-slate-500">Tối đa 100 phiên mới nhất, sắp xếp theo thời gian hoàn thành.</p></div>
    {!sessions.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Chưa có session thật. Hãy chạy development và hoàn thành một game.</div> :
      <div className="space-y-4">{sessions.map((session) => {
        const attempts = session.results.length
        const accuracy = attempts ? Math.round(session.correctCount / attempts * 100) : 0
        return <article key={session.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2"><p className="text-xs font-bold uppercase text-slate-400">Game</p><p className="font-black text-blue-700">{session.gameId}</p><p className="mt-1 break-all text-xs text-slate-400">{session.id}</p></div>
            <div><p className="text-xs font-bold uppercase text-slate-400">User</p><p className="font-bold">{session.userId}</p></div>
            <div><p className="text-xs font-bold uppercase text-slate-400">Bài học</p><p className="font-bold">{session.lessonId}</p></div>
            <div><p className="text-xs font-bold uppercase text-slate-400">Kết quả</p><p className="font-bold">{session.score} điểm · {accuracy}%</p></div>
            <div><p className="text-xs font-bold uppercase text-slate-400">Hoàn thành</p><p className="text-sm font-semibold">{formatDate(session.completedAt)}</p><p className="text-xs text-slate-400">{formatDuration(session.duration)}</p></div>
          </div>
          <details className="border-t border-slate-100"><summary className="cursor-pointer px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Xem {attempts} lượt trả lời</summary>
            <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Mục tiêu</th><th>Đáp án</th><th>Đã chọn</th><th>Lần</th><th>Thời gian</th><th>Kết quả</th></tr></thead><tbody>{session.results.map((result, index) => <tr key={`${session.id}-${index}`} className="border-t border-slate-100"><td className="px-5 py-3 font-semibold">{result.learningKey}</td><td>{result.expectedAnswer ?? '—'}</td><td>{result.selectedAnswer ?? '—'}</td><td>{result.attempt}</td><td>{result.responseTime ? `${(result.responseTime / 1000).toFixed(1)}s` : '—'}</td><td className={result.correct ? 'font-bold text-emerald-600' : 'font-bold text-red-600'}>{result.correct ? 'Đúng' : 'Sai'}</td></tr>)}</tbody></table></div>
          </details>
        </article>
      })}</div>}
  </div>
}


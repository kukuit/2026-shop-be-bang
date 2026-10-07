'use client'

import { Award, CheckCircle2, Clock3 } from 'lucide-react'
import { formatClock } from './ExamTimer'
import type { SubmittedTrangNguyenAttempt } from '../_lib/local-attempt'

export default function ExamResult({ attempt, onReview, onNewExam, starting = false, error }: { attempt: SubmittedTrangNguyenAttempt; onReview(): void; onNewExam(): void; starting?: boolean; error?: string | null }) {
  const elapsed = attempt.elapsedSeconds
  return (
    <main className="mx-auto grid min-h-[calc(100dvh-58px)] w-full max-w-3xl place-items-center px-4 py-8 sm:px-6">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Award size={31} /></span>
        <p className="mt-5 text-sm font-extrabold uppercase tracking-[0.16em] text-emerald-700">{attempt.status === 'EXPIRED' ? 'Đã hết giờ' : 'Hoàn thành bài thi'}</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">Kết quả thi thử</h1>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-blue-50 p-4"><p className="text-sm font-bold text-slate-600">Điểm</p><p className="mt-1 text-3xl font-black text-blue-800">{attempt.score}<span className="text-base font-bold text-slate-500"> / 300</span></p></div>
          <div className="rounded-xl bg-emerald-50 p-4"><p className="flex items-center justify-center gap-1 text-sm font-bold text-slate-600"><CheckCircle2 size={16} />Đúng</p><p className="mt-1 text-3xl font-black text-emerald-800">{attempt.correctCount}<span className="text-base font-bold text-slate-500"> / {attempt.questions.length}</span></p></div>
          <div className="rounded-xl bg-slate-50 p-4"><p className="flex items-center justify-center gap-1 text-sm font-bold text-slate-600"><Clock3 size={16} />Thời gian</p><p className="mt-2 text-lg font-black tabular-nums text-slate-800">{formatClock(elapsed)}</p></div>
        </div>
        {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={onReview} className="min-h-12 rounded-xl border border-slate-300 px-5 font-bold text-slate-700 hover:bg-slate-50">Xem lại bài</button>
          <button type="button" disabled={starting} onClick={onNewExam} className="min-h-12 rounded-xl bg-blue-700 px-6 font-extrabold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">{starting ? 'ĐANG TẠO ĐỀ…' : 'Làm đề khác'}</button>
        </div>
      </section>
    </main>
  )
}


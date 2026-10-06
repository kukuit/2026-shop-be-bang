'use client'

import { Award, CheckCircle2, Clock3 } from 'lucide-react'
import { formatClock } from './ExamTimer'
import type { ExamAttempt } from '../_lib/exam-types'

export default function ExamResult({ attempt, onNewExam }: { attempt: ExamAttempt; onNewExam(): void }) {
  const elapsed = attempt.elapsedSeconds ?? Math.max(0, Math.floor(((attempt.submittedAt ?? Date.now()) - attempt.startedAt) / 1000))
  return (
    <main className="mx-auto grid min-h-[calc(100dvh-58px)] w-full max-w-3xl place-items-center px-4 py-8 sm:px-6">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Award size={31} /></span>
        <p className="mt-5 text-sm font-extrabold uppercase tracking-[0.16em] text-emerald-700">{attempt.status === 'expired' ? 'Đã hết giờ' : 'Hoàn thành bài thi'}</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">Kết quả thi thử</h1>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-blue-50 p-4"><p className="text-sm font-bold text-slate-600">Điểm</p><p className="mt-1 text-3xl font-black text-blue-800">{attempt.score ?? 0}<span className="text-base font-bold text-slate-500"> / 300</span></p></div>
          <div className="rounded-xl bg-emerald-50 p-4"><p className="flex items-center justify-center gap-1 text-sm font-bold text-slate-600"><CheckCircle2 size={16} />Đúng</p><p className="mt-1 text-3xl font-black text-emerald-800">{attempt.correctCount ?? 0}<span className="text-base font-bold text-slate-500"> / 30</span></p></div>
          <div className="rounded-xl bg-slate-50 p-4"><p className="flex items-center justify-center gap-1 text-sm font-bold text-slate-600"><Clock3 size={16} />Thời gian</p><p className="mt-2 text-lg font-black tabular-nums text-slate-800">{formatClock(elapsed)}</p></div>
        </div>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" disabled className="min-h-12 rounded-xl border border-slate-300 px-5 font-bold text-slate-400" title="Chức năng xem lại sẽ được bổ sung cùng bộ câu hỏi chính thức">XEM LẠI BÀI</button>
          <button type="button" onClick={onNewExam} className="min-h-12 rounded-xl bg-blue-700 px-6 font-extrabold text-white hover:bg-blue-800">LÀM ĐỀ KHÁC</button>
        </div>
      </section>
    </main>
  )
}


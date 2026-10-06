'use client'

export default function SubmitExamDialog({
  answeredCount,
  submitting,
  error,
  onCancel,
  onSubmit,
}: {
  answeredCount: number
  submitting: boolean
  error?: string | null
  onCancel(): void
  onSubmit(): void
}) {
  const missing = 30 - answeredCount
  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="submit-exam-title" aria-describedby="submit-exam-description">
      <section className="w-full max-w-md rounded-2xl border border-[#eadfdd] bg-white p-5 sm:p-7">
        <h2 id="submit-exam-title" className="text-xl font-bold text-[#333]">Bé có chắc muốn nộp bài không?</h2>
        <p id="submit-exam-description" className="mt-3 leading-relaxed text-[#555]">
          {missing ? `Bé còn ${missing} câu chưa trả lời. Bé vẫn muốn nộp bài?` : `Bé đã trả lời đủ 30 câu (${answeredCount}/30). Bé vẫn muốn nộp bài?`}
        </p>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={submitting} onClick={onCancel} className="min-h-11 rounded-full border-2 border-[#d8cecc] px-5 py-2 font-semibold text-[#6f6664] hover:bg-[#faf8f7] disabled:opacity-60">Làm tiếp</button>
          <button type="button" disabled={submitting} onClick={onSubmit} className="min-h-11 rounded-full bg-[#c72029] px-5 py-2 font-bold text-white hover:bg-[#ad1922] disabled:opacity-60">{submitting ? 'ĐANG NỘP…' : 'Nộp bài'}</button>
        </div>
      </section>
    </div>
  )
}


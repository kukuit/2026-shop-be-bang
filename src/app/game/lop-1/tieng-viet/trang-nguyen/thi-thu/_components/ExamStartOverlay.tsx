'use client'

export default function ExamStartOverlay({ onStart, onCancel, starting, error }: { onStart(): void; onCancel(): void; starting: boolean; error?: string | null }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/35 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="exam-start-title" aria-describedby="exam-start-description">
      <section className="w-full max-w-[420px] rounded-2xl border border-[#eadfdd] bg-white px-6 py-7 text-center sm:px-8">
        <h2 id="exam-start-title" className="text-xl font-bold text-[#333]">Bé đã sẵn sàng làm bài chưa?</h2>
        <p id="exam-start-description" className="mt-3 text-[15px] leading-6 text-[#666]">Bài thi gồm 30 câu hỏi. Thời gian làm bài là 30 phút.</p>
        {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
        <div className="mt-6 flex flex-col-reverse justify-center gap-2 sm:flex-row">
          <button type="button" disabled={starting} onClick={onCancel} className="min-h-11 rounded-full border-2 border-[#d8cecc] px-6 font-semibold text-[#6f6664] hover:bg-[#faf8f7] disabled:opacity-60">Quay lại</button>
          <button type="button" disabled={starting} onClick={onStart} className="min-h-11 rounded-full bg-[#c72029] px-7 font-bold text-white hover:bg-[#ad1922] disabled:cursor-wait disabled:opacity-60">
            {starting ? 'ĐANG TẠO ĐỀ…' : 'Bắt đầu thi'}
          </button>
        </div>
      </section>
    </div>
  )
}


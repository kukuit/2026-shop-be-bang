'use client'

export default function EndExamDialog({ onCancel, onConfirm }: { onCancel(): void; onConfirm(): void }) {
  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="end-exam-title" aria-describedby="end-exam-description">
      <section className="w-full max-w-md rounded-2xl border border-[#eadfdd] bg-white p-5 sm:p-7">
        <h2 id="end-exam-title" className="text-xl font-bold text-[#333]">Bé muốn kết thúc bài thi?</h2>
        <p id="end-exam-description" className="mt-3 leading-relaxed text-[#555]">Bài làm hiện tại sẽ bị xóa và không được nộp. Bé sẽ quay về trang thi thử.</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="min-h-11 rounded-full border-2 border-[#d8cecc] px-5 py-2 font-semibold text-[#6f6664] hover:bg-[#faf8f7]">Ở lại làm bài</button>
          <button type="button" onClick={onConfirm} className="min-h-11 rounded-full bg-[#c72029] px-5 py-2 font-bold text-white hover:bg-[#ad1922]">Kết thúc, không nộp</button>
        </div>
      </section>
    </div>
  )
}

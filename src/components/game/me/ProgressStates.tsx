export function ProgressLoading({ label = 'Đang tải tiến trình…' }: { label?: string }) {
  return <div role="status" className="space-y-3 rounded-2xl bg-white p-5">
    <p className="text-sm text-slate-500">{label}</p>
    {[0, 1, 2].map(index => <div key={index} aria-hidden="true" className="h-10 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />)}
  </div>
}

export function ProgressError({ retry, message = 'Không thể tải tiến trình.' }: { retry: () => void; message?: string }) {
  return <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
    <p>{message}</p>
    <button type="button" onClick={retry} className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-2 font-bold">Thử lại</button>
  </div>
}

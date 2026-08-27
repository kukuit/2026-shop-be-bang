'use client'

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
      <h2 className="text-xl font-black text-red-700">Không thể tải dữ liệu Firestore</h2>
      <p className="mt-2 text-sm text-red-600">
        Kiểm tra biến môi trường Firebase Admin và kết nối mạng của server.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white"
      >
        Thử lại
      </button>
    </div>
  )
}

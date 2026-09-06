import Link from 'next/link'
import { notFound } from 'next/navigation'
import GameAuthHeader from '@/components/auth/GameAuthHeader'

// Existing static class and lesson routes continue to serve their own content.
export default function UpcomingGradePage({ params }: { params: { grade: string } }) {
  if (!/^lop-[3-5]$/.test(params.grade)) notFound()
  const grade = Number(params.grade.slice(4))
  return <><GameAuthHeader /><main className="grid min-h-[75vh] place-items-center bg-sky-50 p-6">
    <section className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-black text-slate-800">Lớp {grade}</h1>
      <p className="mt-4 text-slate-600">Cappy đang chuẩn bị nội dung cho lớp này. Bé có thể chọn lớp khác trên thanh phía trên để tiếp tục chơi game nhé!</p>
      <Link href="/game/lop-1" className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Chơi game lớp 1</Link>
    </section>
  </main></>
}

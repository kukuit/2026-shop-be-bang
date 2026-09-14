import Link from 'next/link'
import { History } from 'lucide-react'
import { SUBJECTS } from '@/lib/game-progress/config'
import SubjectOverviewCard from '@/components/game/me/SubjectOverviewCard'

export default function GameMePage() {
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-black text-slate-900">Tiến trình học của bé</h1><p className="mt-2 text-sm text-slate-500">Theo dõi tiến trình, kết quả và những nội dung bé cần luyện thêm.</p></header>
    <div className="grid items-stretch gap-4 md:grid-cols-3">
      {SUBJECTS.map(subject => <SubjectOverviewCard key={subject.id} subject={subject} />)}
    </div>
    <Link href="/game/me/session" prefetch={false} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 hover:border-blue-300">
      <History className="text-slate-500" /><div className="min-w-0 flex-1"><h2 className="font-black text-slate-900">Phiên chơi</h2><p className="mt-1 text-sm text-slate-500">Xem lịch sử các game bé đã chơi</p></div><span className="text-sm font-bold text-blue-700">Xem lịch sử →</span>
    </Link>
  </div>
}

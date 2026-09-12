import Link from 'next/link'
import { ArrowRight, BookOpen, History } from 'lucide-react'
import { SUBJECTS } from '@/lib/game-progress/config'

export default function GameMePage() {
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-black text-slate-900">Ti?n tr?nh h?c c?a b?</h1><p className="mt-2 text-sm text-slate-500">Ch?n m?n ?? xem c?c b?i ?? h?c v? m?c ti?u c?n luy?n th?m.</p></header>
    <div className="grid gap-4 md:grid-cols-3">
      {SUBJECTS.map(subject => <Link key={subject.id} href={subject.route} prefetch={false} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-300 focus-visible:outline focus-visible:outline-1 focus-visible:outline-blue-600">
        <BookOpen className="text-blue-600" /><h2 className="mt-4 text-xl font-black text-slate-900">{subject.label}</h2>
        <p className="mt-2 text-sm text-slate-500">Theo d?i ti?n tr?nh h?c {subject.label}</p>
        <span className="mt-5 flex items-center gap-2 text-sm font-bold text-blue-700">Xem ti?n tr?nh <ArrowRight size={16} /></span>
      </Link>)}
    </div>
    <Link href="/game/me/session" prefetch={false} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 hover:border-blue-300">
      <History className="text-slate-500" /><div className="flex-1"><h2 className="font-black text-slate-900">Phi?n ch?i</h2><p className="mt-1 text-sm text-slate-500">Xem l?ch s? c?c game b? ?? ch?i</p></div><span className="text-sm font-bold text-blue-700">Xem l?ch s? ?</span>
    </Link>
  </div>
}

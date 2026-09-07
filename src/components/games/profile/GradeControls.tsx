'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { GAME_GRADES, isValidGrade } from '@/lib/game-profile'
import { useGameProfile } from './GameProfileProvider'
import { useAuth } from '@/components/auth/AuthProvider'

export function RouteGradeSync() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { isLoading, activeGrade, saving, setActiveGrade } = useGameProfile()
  const attempted = useRef('')
  useEffect(() => {
    const match = /^\/game\/lop-([1-5])(?:\/|$)/.exec(pathname)
    const grade = match ? Number(match[1]) : null
    if (isLoading || saving) return
    const visit = `${user?.id ?? 'guest'}:${pathname}`
    if (attempted.current === visit) return
    attempted.current = visit
    if (!isValidGrade(grade) || grade === activeGrade) return
    void setActiveGrade(grade).catch(() => {})
  }, [pathname, user?.id, isLoading, activeGrade, saving, setActiveGrade])
  return null
}
export function GradeSwitcher() {
  const { user } = useAuth()
  const { activeGrade, isLoading, saving, error, retry, setActiveGrade } = useGameProfile()
  const router = useRouter()
  return <div className="border-b border-slate-100 p-3 text-sm text-slate-700">
      <label htmlFor="game-menu-grade" className="mb-2 block font-bold">Chọn lớp chơi game</label>
      <div>
        <select id="game-menu-grade" value={activeGrade ?? ''} disabled={isLoading || saving} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50" onChange={async event => {
          const grade = Number(event.target.value)
          try { await setActiveGrade(grade); router.push(`/game/lop-${grade}`) } catch {}
        }}>
          <option value="" disabled>{isLoading ? 'Đang tải…' : 'Chọn lớp'}</option>
          {GAME_GRADES.map(grade => <option key={grade} value={grade}>Lớp {grade}</option>)}
        </select>
        {saving && <p role="status" className="mt-2 text-xs">Đang lưu…</p>}
        {user && <div className="mt-3 border-t border-slate-100 pt-3">
          <Link href="/profile" className="block rounded-lg px-1 py-2 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">Hồ sơ của bé</Link>
        </div>}
        {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
        {isLoading && error && <button onClick={retry} className="mt-2 text-blue-700">Thử lại</button>}
      </div>
  </div>
}
export function PrimaryGradeEditor() {
  const { user, loading } = useAuth()
  const { primaryGrade, grades, isLoading, saving, error, retry, setPrimaryGrade } = useGameProfile()
  if (loading) return <p role="status">Đang tải…</p>
  if (!user) return <section className="rounded-3xl bg-white p-6 shadow-sm"><GradeSwitcher /></section>
  return <section className="rounded-3xl bg-white p-6 shadow-sm">
    <label htmlFor="primary-grade" className="block text-lg font-bold text-slate-800">Lớp bé đang học</label>
    <p className="mt-2 text-sm text-slate-500">Đây là lớp bé học ở trường. Bé vẫn có thể chọn các lớp khác trong menu để chơi game.</p>
    <select id="primary-grade" value={primaryGrade ?? ''} disabled={isLoading || saving} onChange={event => void setPrimaryGrade(Number(event.target.value)).catch(() => {})} className="mt-3 w-full rounded-xl border border-slate-300 p-3">
      <option value="" disabled>{isLoading ? 'Đang tải…' : 'Chọn lớp'}</option>
      {GAME_GRADES.map(grade => <option key={grade} value={grade}>Lớp {grade}</option>)}
    </select>
    <p className="mt-3 text-sm text-slate-500">Các lớp đã chọn chơi game: {grades.length ? grades.map(grade => `Lớp ${grade}`).join(', ') : 'Chưa có'}</p>
    {saving && <p role="status">Đang lưu...</p>}
    {error && <p role="alert" className="mt-2 text-red-600">{error}</p>}
    {isLoading && error && <button onClick={retry} className="mt-2 text-blue-700">Thử lại</button>}
  </section>
}

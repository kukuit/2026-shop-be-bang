'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import CappyJourneyLoading from '../general/CappyJourneyLoading'
import { GAME_GRADES } from '@/lib/game-profile'
import { useGameProfile } from './GameProfileProvider'
import { useAuth } from '@/components/auth/AuthProvider'

export default function GameEntry() {
  const { user } = useAuth()
  const { primaryGrade, activeGrade, isLoading, saving, error, retry, setPrimaryGrade, setActiveGrade } = useGameProfile()
  const router = useRouter()
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)
  const attempted = useRef(false)
  useEffect(() => {
    if (isLoading) { attempted.current = false; return }
    if (saving) return
    if (activeGrade) router.replace(`/game/lop-${activeGrade}`)
    else if (primaryGrade && !attempted.current) {
      attempted.current = true
      void setActiveGrade(primaryGrade).catch(() => {})
    }
  }, [activeGrade, primaryGrade, isLoading, saving, router, setActiveGrade])
  if (isLoading || activeGrade || primaryGrade) return <CappyJourneyLoading>
    {error ? <button className="max-w-md rounded-2xl border-2 border-amber-200 bg-white px-6 py-4 text-center font-bold text-amber-800 shadow-sm disabled:opacity-50" disabled={saving} onClick={() => isLoading ? retry() : primaryGrade && void setActiveGrade(primaryGrade).catch(() => {})}>{error} Nhấn để thử lại.</button> : undefined}
  </CappyJourneyLoading>
  return <main className="grid min-h-[80vh] place-items-center bg-gradient-to-br from-sky-100 via-blue-50 to-violet-100 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="grade-title" aria-describedby="grade-description" className="w-full max-w-lg rounded-3xl border border-white bg-white p-6 text-center shadow-xl sm:p-10">
      <div aria-hidden="true" className="text-5xl">🎒</div>
      <h1 id="grade-title" className="mt-5 text-2xl font-black text-slate-800">{user ? 'Bé đang học lớp mấy?' : 'Bé muốn chơi game lớp mấy?'}</h1>
      <p id="grade-description" className="mt-3 text-slate-600">Chọn lớp để Cappy dẫn bé đến đúng hành trình nhé!</p>
      <fieldset disabled={saving} className="my-7 grid grid-cols-2 gap-3">
        <legend className="sr-only">Chọn một lớp</legend>
        {GAME_GRADES.map(grade => <label key={grade} className={`cursor-pointer rounded-2xl border-2 p-4 text-lg font-bold ${grade === 5 ? 'col-span-2 mx-auto w-1/2' : ''} ${selectedGrade === grade ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700'}`}>
          <input className="mr-2 accent-blue-600" type="radio" name="grade" value={grade} checked={selectedGrade === grade} onChange={() => setSelectedGrade(grade)} />Lớp {grade}{selectedGrade === grade && <span aria-hidden="true"> ✓</span>}
        </label>)}
      </fieldset>
      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
      <button disabled={selectedGrade === null || saving} onClick={() => selectedGrade !== null && void (user ? setPrimaryGrade(selectedGrade) : setActiveGrade(selectedGrade)).catch(() => {})} className="w-full rounded-2xl bg-blue-600 px-5 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Đang lưu...' : 'Bắt đầu chơi game'}</button>
    </section>
  </main>
}

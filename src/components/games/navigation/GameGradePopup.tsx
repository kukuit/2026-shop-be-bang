'use client'

import { School, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GAME_GRADES } from '@/lib/game-profile'
import { useGameProfile } from '@/components/games/profile/GameProfileProvider'

export default function GameGradePopup() {
  const [open, setOpen] = useState(false)
  const [selectedGrade, setSelectedGrade] = useState<number | ''>('')
  const popupRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { activeGrade, isLoading, saving, error, setActiveGrade } = useGameProfile()

  useEffect(() => {
    if (open) setSelectedGrade(activeGrade ?? '')
  }, [open, activeGrade])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!popupRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const confirmGrade = async () => {
    if (typeof selectedGrade !== 'number' || isLoading || saving) return
    try {
      await setActiveGrade(selectedGrade)
      setOpen(false)
      router.push(`/game/lop-${selectedGrade}`)
    } catch {
      // The profile provider exposes the save error in the popup.
    }
  }

  return <div ref={popupRef} className="relative">
    <button type="button" aria-label="Chọn lớp" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(value => !value)} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 border-white/90 bg-emerald-400 text-emerald-950 shadow-[0_3px_0_#166534] transition active:translate-y-0.5 active:shadow-none">
      <School size={22} strokeWidth={2.8} />
    </button>
    {open && <div role="dialog" aria-label="Chọn lớp chơi game" className="fixed left-3 right-3 top-[58px] z-[60] w-auto rounded-[26px] border-[3px] border-white bg-[#fffaf0] text-sky-950 shadow-[0_7px_0_#164e6380,0_18px_36px_#082f4960] sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-3 sm:w-[min(20rem,calc(100vw-1.5rem))]">
      <div className="mx-auto w-full max-w-6xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black">Chọn lớp</h2>
        <button type="button" aria-label="Đóng" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border-2 border-sky-100 bg-white text-sky-800"><X size={18} /></button>
      </div>
      <select id="game-grade-popup-select" aria-label="Chọn lớp" value={selectedGrade} disabled={isLoading || saving} onChange={event => setSelectedGrade(Number(event.target.value))} className="w-full rounded-xl border-2 border-sky-200 bg-sky-50 px-3 py-2.5 text-sm font-black text-sky-900 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50">
        <option value="" disabled>{isLoading ? 'Đang tải…' : 'Chọn lớp'}</option>
        {GAME_GRADES.map(grade => <option key={grade} value={grade}>Lớp {grade}</option>)}
      </select>
      {saving && <p role="status" className="mt-2 text-xs font-bold">Đang lưu…</p>}
      {error && <p role="alert" className="mt-2 text-xs font-bold text-red-600">{error}</p>}
      <button type="button" disabled={typeof selectedGrade !== 'number' || isLoading || saving} onClick={() => void confirmGrade()} className="mt-4 min-h-11 w-full rounded-full border-2 border-white bg-amber-400 px-5 py-2 font-black text-amber-950 shadow-[0_3px_0_#a16207] transition active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50">OK</button>
      </div>
    </div>}
  </div>
}

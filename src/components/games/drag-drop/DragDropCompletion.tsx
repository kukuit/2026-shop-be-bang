'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { survivalBaseCoinEarned, survivalRewardMultiplier } from '../general/survival-rewards'

export default function DragDropCompletion({ score, level, victory, bestLevel, playCount, trackingTask, onRestart }: {
  score: number; level: number; victory: boolean; bestLevel: number; playCount: number
  trackingTask?: Promise<unknown>; onRestart: () => void
}) {
  const pathname = usePathname()
  const lessonPath = pathname.replace(/\/+$/, '').replace(/\/(?:luyen-tap\/)?[^/]+$/, '') || '/game'
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let active = true
    void (trackingTask ?? Promise.resolve()).finally(() => { if (active) setReady(true) })
    return () => { active = false }
  }, [trackingTask])
  const levelsCompleted = victory ? 25 : Math.max(0, level - 1)
  const coin = Math.round(survivalBaseCoinEarned(levelsCompleted) * survivalRewardMultiplier(playCount + 1))
  return <div className="absolute inset-0 z-50 grid place-items-center bg-slate-950/75 p-6" role="dialog" aria-modal="true" aria-label="Kết quả kéo thả">
    <div className="w-full max-w-sm rounded-[2rem] border-4 border-amber-300 bg-white p-7 text-center shadow-2xl">
      <h2 className="text-3xl font-black text-blue-600">{victory ? '🏆 CHINH PHỤC KÉO THẢ!' : 'GAME OVER'}</h2>
      <div className="mt-5 grid gap-2 text-lg font-bold text-slate-700">
        <p>Màn đạt được: {levelsCompleted}</p><p>Kỷ lục: {Math.max(bestLevel, levelsCompleted)}</p>
        <p>⭐ {score}</p>
        <p className="flex items-center justify-center gap-1.5"><span>+{coin}</span><Image src="/games/general/images/optimize/xu_icon.png" alt="xu" width={24} height={24} className="h-6 w-6 object-contain" /></p>
      </div>
      <fieldset disabled={!ready} className="mt-6 grid gap-3 disabled:opacity-60">
        <button type="button" onClick={onRestart} className="rounded-2xl bg-amber-500 px-8 py-3 font-black text-white">Chơi lại</button>
        <button type="button" onClick={() => window.location.assign(lessonPath)} className="rounded-2xl bg-blue-600 px-8 py-3 font-black text-white">Về trang game</button>
      </fieldset>
    </div>
  </div>
}

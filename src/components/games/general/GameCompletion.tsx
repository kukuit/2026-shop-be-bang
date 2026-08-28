'use client'

import { useEffect, useState } from 'react'
import { Gamepad2, RotateCcw, Store, Trophy } from 'lucide-react'
import styles from './GameCompletion.module.css'

type GameCompletionProps = {
  score: number
  onRestart: () => void
  trackingTask?: Promise<unknown>
}

const SCORE_ANIMATION_MS = 1400

const BURSTS = [
  { left: '20%', top: '30%', delay: '0s' },
  { left: '80%', top: '25%', delay: '.55s' },
  { left: '50%', top: '48%', delay: '1.1s' },
]

export default function GameCompletion({ score, onRestart, trackingTask }: GameCompletionProps) {
  const [displayScore, setDisplayScore] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const startedAt = performance.now()
    let frame = 0
    const animation = new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / SCORE_ANIMATION_MS)
        if (!cancelled) setDisplayScore(Math.round(score * (1 - Math.pow(1 - progress, 3))))
        if (progress < 1) frame = requestAnimationFrame(tick)
        else resolve()
      }
      frame = requestAnimationFrame(tick)
    })
    void Promise.allSettled([animation, trackingTask ?? Promise.resolve()]).then(() => {
      if (!cancelled) setReady(true)
    })
    return () => { cancelled = true; cancelAnimationFrame(frame) }
  }, [score, trackingTask])

  return <div className="absolute inset-0 z-50 grid place-items-center overflow-hidden bg-slate-950/70 p-6" role="dialog" aria-modal="true" aria-label="Kết quả trò chơi">
    {BURSTS.map((burst, burstIndex) => <div key={burstIndex} className={styles.fireworks} style={{ left: burst.left, top: burst.top, animationDelay: burst.delay }} aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => <span key={index} className={styles.particle} />)}
    </div>)}
    <div className="relative z-10 w-full max-w-sm rounded-[2rem] border-4 border-amber-300 bg-white p-7 text-center shadow-2xl">
      <Trophy className="mx-auto animate-bounce text-amber-400" size={82} aria-hidden="true" />
      <p className="mt-3 text-5xl font-black text-emerald-600" aria-live="polite">{displayScore} / 100</p>
      <fieldset disabled={!ready} className="mt-7 grid gap-3 disabled:cursor-wait disabled:opacity-60">
        <button type="button" onClick={onRestart} className="relative rounded-2xl bg-amber-500 px-12 py-3 font-black text-white shadow-md"><RotateCcw className="absolute left-5 top-1/2 -translate-y-1/2" size={20} /> Chơi lại</button>
        <button type="button" onClick={() => window.location.assign('/game')} className="relative rounded-2xl bg-blue-600 px-12 py-3 font-black text-white shadow-md"><Gamepad2 className="absolute left-5 top-1/2 -translate-y-1/2" size={20} /> Về trang game</button>
        <button type="button" onClick={() => window.location.assign('/')} className="relative rounded-2xl bg-[#f7357f] px-12 py-3 font-black text-white shadow-md"><Store className="absolute left-5 top-1/2 -translate-y-1/2" size={20} /> Về Shop Bé Băng</button>
      </fieldset>
    </div>
  </div>
}

'use client'

import { Gamepad2, RotateCcw, Store, Trophy } from 'lucide-react'
import styles from './GameCompletion.module.css'

type GameCompletionProps = {
  score: number
  onRestart: () => void
}

const BURSTS = [
  { left: '20%', top: '30%', delay: '0s' },
  { left: '80%', top: '25%', delay: '.55s' },
  { left: '50%', top: '48%', delay: '1.1s' },
]

export default function GameCompletion({ score, onRestart }: GameCompletionProps) {
  return <div className="absolute inset-0 z-50 grid place-items-center overflow-hidden bg-slate-950/70 p-6" role="dialog" aria-modal="true" aria-label="Kết quả trò chơi">
    {BURSTS.map((burst, burstIndex) => <div key={burstIndex} className={styles.fireworks} style={{ left: burst.left, top: burst.top, animationDelay: burst.delay }} aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => <span key={index} className={styles.particle} />)}
    </div>)}
    <div className="relative z-10 w-full max-w-sm rounded-[2rem] border-4 border-amber-300 bg-white p-7 text-center shadow-2xl">
      <Trophy className="mx-auto animate-bounce text-amber-400" size={82} aria-hidden="true" />
      <p className="mt-3 text-5xl font-black text-emerald-600">{score} / 100</p>
      <div className="mt-7 grid gap-3">
        <button type="button" onClick={onRestart} className="relative rounded-2xl bg-amber-500 px-12 py-3 font-black text-white shadow-md"><RotateCcw className="absolute left-5 top-1/2 -translate-y-1/2" size={20} /> Chơi lại</button>
        <button type="button" onClick={() => window.location.assign('/game')} className="relative rounded-2xl bg-blue-600 px-12 py-3 font-black text-white shadow-md"><Gamepad2 className="absolute left-5 top-1/2 -translate-y-1/2" size={20} /> Về trang game</button>
        <button type="button" onClick={() => window.location.assign('/')} className="relative rounded-2xl bg-[#f7357f] px-12 py-3 font-black text-white shadow-md"><Store className="absolute left-5 top-1/2 -translate-y-1/2" size={20} /> Về Shop Bé Băng</button>
      </div>
    </div>
  </div>
}

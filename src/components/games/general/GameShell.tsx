'use client'

import Image from 'next/image'
import { ArrowLeft, Gamepad2, Play, RotateCcw, Store, Volume2, VolumeX, X } from 'lucide-react'
import { ReactNode, useState } from 'react'
import StarIcon from './StarIcon'
import GameProgress from './GameProgress'

type GameShellProps = {
  children: ReactNode
  score: number
  currentRound: number
  totalRounds?: number
  playerName?: string
  muted: boolean
  onMutedChange: (muted: boolean) => void
  onPauseChange?: (paused: boolean) => void
  onRestart: () => void
  className?: string
}

export default function GameShell({
  children,
  score,
  currentRound,
  totalRounds = 10,
  playerName = 'Bé Băng',
  muted,
  onMutedChange,
  onPauseChange,
  onRestart,
  className = '',
}: GameShellProps) {
  const [showExit, setShowExit] = useState(false)

  const setExitOpen = (open: boolean) => {
    setShowExit(open)
    onPauseChange?.(open)
  }

  const restart = () => {
    setExitOpen(false)
    onRestart()
  }

  return (
    <section className={`relative aspect-[9/16] max-h-dvh w-full max-w-[calc(100dvh*0.5625)] overflow-hidden bg-sky-200 [container-type:inline-size] ${className}`}>
      {children}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between p-[1.7%]">
        <div className="flex h-10 items-center gap-1.5 rounded-2xl border-2 border-white/80 bg-blue-600/90 py-0.5 pl-0.5 pr-3 text-white shadow-lg">
          <Image
            src="/games/general/images/player-avatar.png"
            alt="Ảnh đại diện người chơi"
            width={52}
            height={52}
            className="h-[34px] w-[34px] rounded-[0.8rem] object-cover"
            priority
          />
          <span className="max-w-20 truncate text-xs font-black drop-shadow">{playerName}</span>
        </div>

        <div className="pointer-events-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => onMutedChange(!muted)}
            className="grid h-10 w-10 place-items-center rounded-2xl border-2 border-white bg-sky-500 text-white shadow-lg transition active:scale-90 [&_svg]:h-5 [&_svg]:w-5"
            aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </button>
          <button
            type="button"
            onClick={() => setExitOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-2xl border-2 border-white bg-blue-600 text-white shadow-lg transition active:scale-90 [&_svg]:h-5 [&_svg]:w-5"
            aria-label="Quay lại"
          >
            <ArrowLeft />
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-[0.7%] z-40 flex justify-center">
        <div className="flex h-[clamp(34px,9.2cqw,39px)] min-w-[27%] items-center justify-center gap-1 rounded-2xl border-[0.556cqw] border-[#80d9ff] bg-[#123b62]/95 px-[6cqw] text-center text-[clamp(17px,5cqw,20px)] font-black leading-none text-amber-300 shadow-xl">
          <StarIcon size="medium" />{score}
        </div>
      </div>

      <GameProgress currentRound={currentRound} totalRounds={totalRounds} />

      {showExit && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-slate-950/70 p-6" role="dialog" aria-modal="true" aria-labelledby="game-menu-title">
          <div className="relative w-full max-w-sm rounded-[2rem] border-4 border-amber-300 bg-white p-7 text-center shadow-2xl">
            <button type="button" onClick={() => setExitOpen(false)} className="absolute right-4 top-4 rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Đóng">
              <X />
            </button>
            <h2 id="game-menu-title" className="text-3xl font-black text-blue-600">Tạm dừng</h2>
            <div className="mt-7 grid gap-3">
              <button type="button" onClick={() => setExitOpen(false)} className="relative rounded-2xl bg-emerald-500 px-12 py-3 font-black text-white shadow-md"><Play className="absolute left-5 top-1/2 -translate-y-1/2" size={20} /> Tiếp tục chơi</button>
              <button type="button" onClick={restart} className="relative rounded-2xl bg-amber-500 px-12 py-3 font-black text-white shadow-md"><RotateCcw className="absolute left-5 top-1/2 -translate-y-1/2" size={20} /> Chơi lại</button>
              <button type="button" onClick={() => window.location.assign('/game')} className="relative rounded-2xl bg-blue-600 px-12 py-3 font-black text-white shadow-md"><Gamepad2 className="absolute left-5 top-1/2 -translate-y-1/2" size={20} /> Về trang game</button>
              <button type="button" onClick={() => window.location.assign('/')} className="relative rounded-2xl bg-[#f7357f] px-12 py-3 font-black text-white shadow-md"><Store className="absolute left-5 top-1/2 -translate-y-1/2" size={20} /> Về Shop Bé Băng</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Play, Pointer, Sparkles } from 'lucide-react'
import { KeyboardEvent, PointerEvent, useRef, useState } from 'react'

type GameLoadingScreenProps = {
  progress?: number
  ready?: boolean
  onStart?: () => void | Promise<void>
  unlockAudio?: () => void | Promise<void>
}

export default function GameLoadingScreen({
  progress,
  ready = false,
  onStart,
  unlockAudio,
}: GameLoadingScreenProps) {
  const startingRef = useRef(false)
  const [exiting, setExiting] = useState(false)
  const [finished, setFinished] = useState(false)
  const percentage = progress === undefined ? undefined : Math.round(progress)

  if (finished) return null

  const start = async () => {
    if (!ready || startingRef.current || !onStart) return
    startingRef.current = true
    try {
      await unlockAudio?.()
    } catch (error) {
      console.warn('Không thể resume audio trước khi bắt đầu game:', error)
    }
    await onStart()
    setExiting(true)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!ready) return
    event.preventDefault()
    event.stopPropagation()
    void start()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!ready || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    event.stopPropagation()
    void start()
  }

  return (
    <motion.div
      animate={{ opacity: exiting ? 0 : 1, scale: exiting ? 1.025 : 1 }}
      transition={{ duration: exiting ? 0.16 : 0.2, ease: 'easeOut' }}
      onAnimationComplete={() => { if (exiting) setFinished(true) }}
      className={`absolute inset-0 z-[70] flex touch-none select-none flex-col items-center justify-center bg-gradient-to-b from-sky-300 via-sky-200 to-cyan-100 px-8 text-center ${ready ? 'cursor-pointer' : ''}`}
      role={ready ? 'button' : 'status'}
      tabIndex={ready ? 0 : undefined}
      aria-live={ready ? undefined : 'polite'}
      aria-label={ready ? 'Chạm để bắt đầu trò chơi' : percentage === undefined ? 'Đang tải trò chơi' : `Đang tải trò chơi ${percentage}%`}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <motion.div animate={{ x: [-8, 10, -8] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} className="absolute left-[7%] top-[10%] h-9 w-24 rounded-full bg-white/35 shadow-[28px_5px_0_-5px_rgba(255,255,255,0.35),-18px_8px_0_-8px_rgba(255,255,255,0.3)]" />
        <motion.div animate={{ x: [8, -12, 8] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} className="absolute right-[8%] top-[20%] h-7 w-20 rounded-full bg-white/30 shadow-[22px_4px_0_-5px_rgba(255,255,255,0.3),-15px_7px_0_-7px_rgba(255,255,255,0.25)]" />
        <Sparkles className="absolute bottom-[15%] left-[12%] h-8 w-8 animate-pulse text-white/40" />
        <Sparkles className="absolute right-[13%] top-[48%] h-6 w-6 animate-pulse text-amber-200/55 [animation-delay:700ms]" />
        <div className="absolute bottom-[9%] right-[20%] h-4 w-4 animate-pulse rounded-full bg-white/25 [animation-delay:350ms]" />
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute left-1/2 top-[15%] h-[38%] w-[88%] max-w-sm -translate-x-1/2">
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} className="relative h-full w-full">
              <div className="absolute bottom-0 left-1/2 z-0 w-[58%] -translate-x-1/2">
                <motion.div animate={{ y: [0, -5, 0], rotate: [-0.8, 0.8, -0.8] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}>
                  <Image src="/games/general/images/ready-avatar.png" alt="" width={1103} height={1426} priority unoptimized className="h-auto w-full drop-shadow-[0_14px_18px_rgba(15,80,120,0.2)]" />
                </motion.div>
              </div>
              <div className="absolute bottom-0 left-[2%] z-10 w-[34.4%]">
                <motion.div animate={{ y: [0, 5, 0], rotate: [-2, 1.5, -2] }} transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}>
                  <Image src="/games/general/images/ready-cappy.png" alt="" width={1149} height={1369} priority unoptimized className="h-auto w-full drop-shadow-[0_12px_16px_rgba(15,80,120,0.2)]" />
                </motion.div>
              </div>
              <div className="absolute bottom-0 right-[2%] z-10 w-[33.6%]">
                <motion.div animate={{ y: [4, -4, 4], rotate: [2, -1.5, 2] }} transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}>
                  <Image src="/games/general/images/ready-wolf.png" alt="" width={1177} height={1337} priority unoptimized className="h-auto w-full drop-shadow-[0_12px_16px_rgba(15,80,120,0.2)]" />
                </motion.div>
              </div>
            </motion.div>
          </div>

          {ready && (
          <div className="absolute left-1/2 top-1/2 z-20 grid -translate-x-1/2 -translate-y-1/2 place-items-center">
            <motion.div animate={{ scale: [1, 1.55, 1.55], opacity: [0, 0.32, 0] }} transition={{ duration: 2, times: [0, 0.5, 0.72], repeat: Infinity, ease: 'easeOut' }} className="absolute h-[clamp(7.75rem,31vw,9rem)] w-[clamp(7.75rem,31vw,9rem)] rounded-full border-4 border-white" />
            <motion.div animate={{ scale: [1, 1.075, 1] }} transition={{ duration: 1.35, repeat: Infinity, ease: 'easeInOut' }} className="grid h-[clamp(7.75rem,31vw,9rem)] w-[clamp(7.75rem,31vw,9rem)] place-items-center rounded-full border-[6px] border-white bg-gradient-to-br from-emerald-400 to-sky-500 text-white shadow-2xl">
              <Play className="ml-2 h-[52%] w-[52%] fill-current opacity-80" strokeWidth={2.5} />
            </motion.div>
            <motion.div animate={{ y: [30, 9, 9, 30], scale: [1, 1, 0.88, 1], opacity: [0.75, 1, 1, 0.75] }} transition={{ duration: 2, times: [0, 0.42, 0.55, 1], repeat: Infinity, ease: 'easeInOut' }} className="absolute top-[82%] text-white drop-shadow-lg">
              <Pointer className="h-12 w-12 fill-white/20" strokeWidth={2.6} />
            </motion.div>
          </div>
          )}
        </motion.div>

      {!ready && <div className="absolute left-1/2 top-[60%] z-20 flex w-full max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <div className="flex w-full items-start justify-center">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="flex w-full flex-col items-center">
                <h1 className="text-[clamp(1.1rem,5vw,1.5rem)] font-black text-sky-950">Đang chuẩn bị trò chơi...</h1>
                <div className="mt-5 h-3 w-full max-w-xs overflow-hidden rounded-full bg-white/70 shadow-inner">
                  {percentage === undefined ? (
                    <motion.div animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} className="h-full w-1/2 rounded-full bg-gradient-to-r from-pink-400 to-amber-400" />
                  ) : (
                    <div className="h-full rounded-full bg-gradient-to-r from-pink-500 via-amber-400 to-emerald-400 transition-[width] duration-200 ease-out" style={{ width: `${percentage}%` }} />
                  )}
                </div>
                {percentage !== undefined && <p className="mt-3 font-bold tabular-nums text-sky-900">{percentage}%</p>}
              </motion.div>
        </div>
      </div>}
    </motion.div>
  )
}

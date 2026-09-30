'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ArrowLeft, Gamepad2, Play, RotateCcw, Store, UserRound, Volume2, VolumeX, X } from 'lucide-react'
import { ReactNode, useEffect, useState } from 'react'
import StarIcon from './StarIcon'
import GameProgress from './GameProgress'
import { useAuth } from '@/components/auth/AuthProvider'
import RewardShopModal from './RewardShopModal'

type GameShellProps = {
  children: ReactNode
  score: number
  currentRound: number
  totalRounds?: number
  lives?: number
  levelOnly?: boolean
  coinBalance?: number
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
  lives,
  levelOnly = false,
  coinBalance,
  playerName,
  muted,
  onMutedChange,
  onPauseChange,
  onRestart,
  className = '',
}: GameShellProps) {
  const pathname = usePathname()
  const lessonPath = pathname.replace(/\/+$/, '').replace(/\/(?:luyen-tap\/)?[^/]+$/, '') || '/game'
  const [showExit, setShowExit] = useState(false)
  const [showRewards, setShowRewards] = useState(false)
  const [fetchedCoinBalance, setFetchedCoinBalance] = useState(0)
  const [redeemedBalance, setRedeemedBalance] = useState<number | null>(null)
  const [redeemedGift, setRedeemedGift] = useState<{ name: string; imageUrl: string | null } | null>(null)
  useEffect(() => {
    if (!levelOnly || coinBalance !== undefined) return
    let active = true
    // The existing survival read returns the shared wallet balance for the current player.
    fetch('/api/game-tracking/bubble-survival?lessonId=toan-1-bai-1')
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (active && data) setFetchedCoinBalance(data.coinBalance ?? 0) })
      .catch(() => {})
    return () => { active = false }
  }, [levelOnly, coinBalance])
  const displayedCoinBalance = redeemedBalance ?? coinBalance ?? fetchedCoinBalance
  const { user, loading: authLoading } = useAuth()
  const [avatarFailed, setAvatarFailed] = useState(false)
  const avatarUrl = user?.avatar?.trim() || null
  useEffect(() => { setAvatarFailed(false) }, [avatarUrl])
  const displayName = playerName ?? user?.displayName ?? (authLoading ? '...' : 'Khách')
  const avatarInitial = Array.from(user?.displayName.trim().normalize('NFC') ?? '')[0]?.toLocaleUpperCase('vi-VN') || '?'
  const displayNameCharacters = Array.from(displayName)
  const shortDisplayName = displayNameCharacters.length > 8
    ? `${displayNameCharacters.slice(0, 8).join('')}...`
    : displayName

  const setExitOpen = (open: boolean) => {
    setShowExit(open)
    onPauseChange?.(open)
  }

  const setRewardsOpen = (open: boolean) => {
    setShowRewards(open)
    if (levelOnly) onPauseChange?.(open)
  }

  const restart = () => {
    setExitOpen(false)
    onRestart()
  }

  return (
    <section className={`relative aspect-[9/16] max-h-dvh w-full max-w-[calc(100dvh*0.5625)] overflow-hidden bg-sky-200 [container-type:inline-size] ${className}`}>
      {children}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between p-[1.7%]">
        <div className="flex h-10 min-w-0 max-w-[42%] items-center gap-1.5 rounded-2xl border-2 border-white/80 bg-blue-600/90 py-0.5 pl-0.5 pr-3 text-white shadow-lg">
          <span className="grid h-[30px] w-[30px] shrink-0 place-items-center overflow-hidden rounded-full bg-slate-200 text-slate-600" aria-label={user ? `Ảnh đại diện ${user.displayName}` : 'Ảnh đại diện khách'}>
            {!user ? <UserRound size={21} strokeWidth={2.5} aria-hidden="true" /> : avatarUrl && !avatarFailed ?
              // Avatar URLs may be hosted outside Next.js configured image domains.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" onError={() => setAvatarFailed(true)} /> :
              <span className="text-base font-black leading-none" aria-hidden="true">{avatarInitial}</span>}
          </span>
          {lives === undefined ? <span className="min-w-0 flex-1 truncate text-xs font-black drop-shadow" title={displayName}>{shortDisplayName}</span> :
            <span className="flex gap-0.5 text-lg" aria-label={`${lives} trên 3 tim`}>
              {Array.from({ length: 3 }, (_, index) => <span key={index} aria-hidden="true">{index < lives ? '❤️' : '🖤'}</span>)}
            </span>}
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

      <button
        type="button"
        onClick={() => setRewardsOpen(true)}
        className="absolute bottom-[0.94%] left-[1.667cqw] z-40 flex h-[9.167cqw] w-[30.556cqw] items-center justify-center gap-[2cqw] rounded-[3.056cqw] border-[0.556cqw] border-[#80d9ff]/85 bg-[#123b62]/95 px-[2cqw] text-white shadow-xl transition active:scale-95"
        aria-label="Mở quà của bé"
        aria-haspopup="dialog"
      >
        <span className="text-[clamp(20px,5.8cqw,25px)] leading-none" aria-hidden="true">🎁</span>
        {levelOnly ? <span className="flex min-w-0 items-center gap-[1cqw] text-[clamp(14px,4.2cqw,19px)] font-black leading-none text-amber-300">
          <span>{displayedCoinBalance}</span>
          <Image src="/games/general/images/optimize/xu_icon.png" alt="xu" width={22} height={22} className="h-[5cqw] w-[5cqw] shrink-0 object-contain" />
        </span> : <span className="flex items-center gap-[1.2cqw] text-[clamp(12px,3.4cqw,15px)] leading-none" aria-hidden="true">
          <span className="text-amber-300">●</span><span className="text-white">○</span><span className="text-white">○</span>
        </span>}
      </button>

      <GameProgress currentRound={currentRound} totalRounds={totalRounds} levelOnly={levelOnly} />

      <RewardShopModal open={showRewards} onClose={() => setRewardsOpen(false)} coinBalance={displayedCoinBalance} onBalanceChange={balance => { setFetchedCoinBalance(balance); setRedeemedBalance(balance) }} onSuccess={setRedeemedGift} />

      {redeemedGift && <div className="pointer-events-none absolute inset-0 z-[70] grid place-items-center bg-slate-950/20" onAnimationEnd={() => setRedeemedGift(null)}>
        <div className="reward-gift-pop flex w-[82%] flex-col items-center rounded-[2rem] border-4 border-amber-300 bg-white/95 p-5 text-center shadow-2xl">
          <span className="text-4xl" aria-hidden="true">🎉</span>
          {redeemedGift.imageUrl && <Image src={redeemedGift.imageUrl} alt="" width={150} height={150} className="mt-2 h-32 w-32 object-contain" />}
          <p className="mt-2 text-xl font-black text-blue-700">{redeemedGift.name}</p><p className="font-bold text-emerald-600">Đã đổi quà!</p>
        </div>
        <style jsx>{`@keyframes reward-gift-pop { 0% { opacity: 0; transform: scale(.5) } 16% { opacity: 1; transform: scale(1.12) } 28% { transform: scale(1) } 76% { opacity: 1; transform: scale(1.04) } 100% { opacity: 0; transform: scale(.92) } } .reward-gift-pop { animation: reward-gift-pop 1.8s ease-in-out both }`}</style>
      </div>}

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
              <button type="button" onClick={() => window.location.assign(lessonPath)} className="relative rounded-2xl bg-blue-600 px-12 py-3 font-black text-white shadow-md"><Gamepad2 className="absolute left-5 top-1/2 -translate-y-1/2" size={20} /> Về trang game</button>
              <button type="button" onClick={() => window.location.assign('/')} className="relative rounded-2xl bg-[#f7357f] px-12 py-3 font-black text-white shadow-md"><Store className="absolute left-5 top-1/2 -translate-y-1/2" size={20} /> Về Shop Bé Băng</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

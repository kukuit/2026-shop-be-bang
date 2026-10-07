'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check, Play, RotateCcw } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { fetchWithAuthRetry } from '@/lib/auth/client-fetch'
import type { LessonId } from './tracking/types'

type GameCard = {
  title: string
  href: string
  image: string
  color: string
  position?: string
  subtitle?: string
}

export default function LessonGameGrid({ lessonId, games, compactFooter = false }: {
  lessonId: LessonId
  games: readonly GameCard[]
  subtitle: string
  compactFooter?: boolean
}) {
  const { user, loading } = useAuth()
  const userId = user?.id
  const [progress, setProgress] = useState<{
    userId: string
    lessonId: LessonId
    games: Record<string, { completedAt?: unknown }>
  } | null>(null)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    setProgress(null)
    setError(false)
    if (loading || !userId) return
    let cancelled = false
    const refresh = async () => {
      try {
        const response = await fetchWithAuthRetry(`/api/game-tracking/progress?${new URLSearchParams({ lessonId, includeGames: '1' })}`, { cache: 'no-store' })
        if (!response.ok) throw new Error('Could not load game progress')
        const data = await response.json()
        if (!cancelled) {
          setProgress({ userId, lessonId, games: data.games ?? {} })
          setError(false)
        }
      } catch {
        if (!cancelled) setError(true)
      }
    }
    void refresh()
    const resume = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('pageshow', resume)
    window.addEventListener('focus', resume)
    window.addEventListener('game-tracking:saved', resume)
    return () => {
      cancelled = true
      window.removeEventListener('pageshow', resume)
      window.removeEventListener('focus', resume)
      window.removeEventListener('game-tracking:saved', resume)
    }
  }, [userId, loading, lessonId, retry])

  const currentGames = progress?.userId === userId && progress?.lessonId === lessonId ? progress.games : {}
  return <>
    {error && userId && <p role="status" className="mt-4 text-sm text-slate-600">Chưa tải được trạng thái hoàn thành. <button type="button" className="font-bold text-blue-700 underline" onClick={() => setRetry(value => value + 1)}>Thử lại</button></p>}
    <div className="mt-5 grid grid-cols-2 gap-3 md:mt-7 md:gap-5 lg:grid-cols-4">
      {games.map(game => {
        const gameId = game.href.split('/').filter(Boolean).pop() ?? ''
        const completed = Boolean(currentGames[gameId]?.completedAt)
        return <Link key={game.href} href={game.href} scroll={false} aria-label={`${completed ? 'Chơi lại' : 'Chơi'} ${game.title}${completed ? ' — Đã hoàn thành' : ''}`} className="group relative aspect-[1.08/1] overflow-hidden rounded-[26px] border-[3px] border-white bg-sky-900 shadow-[0_7px_0_#164e6380,0_14px_24px_#164e6330] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 sm:aspect-square md:rounded-[30px]">
          <Image src={game.image} alt={`Ảnh game ${game.title}`} fill sizes="(min-width: 1024px) 270px, 48vw" className="object-cover transition duration-500 group-hover:scale-105" style={{ objectPosition: game.position }} />
          {completed && <span aria-hidden="true" className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm md:right-3 md:top-3">
            <Check size={16} strokeWidth={3} />
          </span>}
          <div className={`absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 text-white ${compactFooter ? 'px-3 py-1 sm:px-4' : 'min-h-[84px] px-4 py-3 sm:min-h-[100px] sm:px-5'}`}>
            <span className={`absolute inset-0 bg-gradient-to-t ${game.color} opacity-95`} />
            <div className="relative min-w-0">
              {!compactFooter && <p className="text-[10px] font-black uppercase tracking-[.18em] text-white/80 sm:text-xs">Nhiệm vụ {games.indexOf(game) + 1}</p>}
              <p className={`mt-0.5 truncate font-black ${compactFooter ? 'text-sm sm:text-base' : 'text-base sm:text-xl xl:text-2xl'}`}>{game.title}</p>
            </div>
            <span aria-hidden="true" className={`relative inline-flex shrink-0 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-amber-950 shadow-[0_3px_0_#a16207] ${compactFooter ? 'h-10 w-10 sm:h-11 sm:w-11' : 'h-11 gap-1.5 px-4 text-sm font-black sm:h-12 sm:px-5'}`}>
              {completed ? <><RotateCcw size={17} />{!compactFooter && 'Chơi lại'}</> : <><Play size={17} className="fill-current" />{!compactFooter && 'Chơi'}</>}
            </span>
          </div>
        </Link>
      })}
    </div>
  </>
}

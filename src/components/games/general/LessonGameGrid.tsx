'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Play, RotateCcw } from 'lucide-react'
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

export default function LessonGameGrid({ lessonId, games }: {
  lessonId: LessonId
  games: readonly GameCard[]
  subtitle: string
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
        return <Link key={game.href} href={game.href} aria-label={`${completed ? 'Chơi lại' : 'Chơi'} ${game.title}${completed ? ' — Đã hoàn thành' : ''}`} className="group relative aspect-square overflow-hidden rounded-2xl border-[3px] border-white bg-white shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 md:rounded-[2rem]">
          <Image src={game.image} alt={`Ảnh game ${game.title}`} fill sizes="(min-width: 1024px) 270px, 48vw" className={`object-cover transition duration-500 group-hover:scale-105 ${completed ? 'opacity-60 grayscale' : ''}`} style={{ objectPosition: game.position }} />
          {completed && <span className="absolute left-2 top-2 rounded-full bg-emerald-700 px-2 py-1 text-xs font-bold text-white md:left-3 md:top-3">Đã hoàn thành</span>}
          <div className="absolute inset-x-0 bottom-0 flex h-[22%] min-h-[52px] items-center justify-between gap-2 px-[18px] text-white md:px-5">
            <span className={`absolute inset-0 bg-gradient-to-t ${completed ? 'from-slate-800 to-slate-600' : game.color} opacity-90`} />
            <p className="relative min-w-0 truncate text-sm font-black sm:text-base xl:text-xl">{game.title}</p>
            <span aria-hidden="true" className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sky-700 md:h-11 md:w-11">
              {completed ? <RotateCcw size={20} /> : <Play size={20} className="ml-0.5 fill-current" />}
            </span>
          </div>
        </Link>
      })}
    </div>
  </>
}

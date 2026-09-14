'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { fetchWithAuthRetry } from '@/lib/auth/client-fetch'
import CappyJourneyLoading from '../general/CappyJourneyLoading'
import LessonJourneyMap, { type LessonJourneyMapProps } from './LessonJourneyMap'
import type { LessonMapItem } from './data'
import { getProgressLessons, type MapSubject, type MapGrade } from './progress-config'

export default function AccountLessonMap({ subject, grade = 'lop-1', ...props }: LessonJourneyMapProps & { subject: MapSubject; grade?: MapGrade }) {
  const { user, loading } = useAuth()
  const userId = user?.id
  const [result, setResult] = useState<{ userId: string; subject: MapSubject; grade: MapGrade; items: LessonMapItem[] } | null>(null)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    setResult(null)
    setError(false)
    if (loading || !userId) return
    let cancelled = false
    let pending = false
    const refresh = async () => {
      if (pending) return
      pending = true
      try {
        const response = await fetchWithAuthRetry(`/api/game-tracking/lesson-map?${new URLSearchParams({ grade, subject })}`, { cache: 'no-store' })
        if (!response.ok) throw new Error('Could not load lesson map')
        const data = await response.json()
        if (data.userId !== userId || !Array.isArray(data.items)) throw new Error('Unexpected lesson map')
        if (!cancelled) {
          setResult({ userId, subject, grade, items: data.items })
          setError(false)
        }
      } catch {
        if (!cancelled) setError(true)
      } finally { pending = false }
    }
    void refresh()
    const resume = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('pageshow', resume)
    window.addEventListener('focus', resume)
    window.addEventListener('game-tracking:saved', resume)
    document.addEventListener('visibilitychange', resume)
    return () => {
      cancelled = true
      window.removeEventListener('pageshow', resume)
      window.removeEventListener('focus', resume)
      window.removeEventListener('game-tracking:saved', resume)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [userId, loading, subject, grade, retry])

  const items = result?.userId === userId && result?.subject === subject && result?.grade === grade ? result.items : undefined
  // Do not display demo achievements as the signed-in user's progress.
  if (loading || (userId && !items)) return <CappyJourneyLoading message={<><span className="text-violet-600">Đang tải</span>{' '}<span className="text-sky-700">bản đồ</span>{' '}<span className="text-pink-600">game</span></>}>
    {error ? <button type="button" className="max-w-md rounded-2xl border-2 border-amber-200 bg-white px-6 py-4 text-center font-bold text-amber-800 shadow-sm" onClick={() => setRetry(value => value + 1)}>Chưa tải được tiến độ. Nhấn để thử lại.</button> : undefined}
  </CappyJourneyLoading>
  return <>
    {error && userId && <div className="game-container py-2" role="status">Chưa cập nhật được tiến độ. <button type="button" className="font-bold text-blue-700 underline" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div>}
    <LessonJourneyMap {...props} guest={!userId} showOverview={userId ? props.showOverview : false} items={userId && items ? items : getProgressLessons(subject, grade).map((lesson): LessonMapItem => ({ ...lesson, status: lesson.available ? 'available' : 'locked' }))} />
  </>
}

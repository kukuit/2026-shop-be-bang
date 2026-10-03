'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { fetchWithAuthRetry } from '@/lib/auth/client-fetch'
import type { LessonMapItem } from '@/components/games/lesson-map/data'
import { getProgressLessons } from '@/components/games/lesson-map/progress-config'
import { useDemo3DGame } from '../_components/GameShell'
import EnglishSpaceEnvironment from '../_components/world/EnglishSpaceEnvironment'
import styles from '../_components/demo.module.css'

const GameScene = dynamic(() => import('../_components/GameScene'), { ssr: false })
const guestItems: LessonMapItem[] = getProgressLessons('tieng-anh').map((lesson) => ({ ...lesson, status: lesson.id === 1 ? 'current' : lesson.available ? 'available' : 'locked' }))

export default function EnglishWorldClient() {
  const game = useDemo3DGame()
  const router = useRouter()
  const { user } = useAuth()
  const [items, setItems] = useState<LessonMapItem[]>(guestItems)
  const [nearPlanetId, setNearPlanetId] = useState<number | null>(null)
  const [nearReturn, setNearReturn] = useState(false)
  const [dismissedReturn, setDismissedReturn] = useState(true)

  useEffect(() => {
    if (!user?.id) { setItems(guestItems); return }
    let cancelled = false
    fetchWithAuthRetry('/api/game-tracking/lesson-map?grade=lop-1&subject=tieng-anh', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('lesson map')))
      .then((data) => { if (!cancelled && data.userId === user.id && Array.isArray(data.items)) setItems(data.items) })
      .catch(() => { if (!cancelled) setItems(guestItems) })
    return () => { cancelled = true }
  }, [user?.id])

  const lesson = useMemo(() => items.find((item) => item.id === nearPlanetId), [items, nearPlanetId])
  const handlePlanetApproach = useCallback((id: number | null) => { setNearPlanetId(id); setDismissedReturn(id !== null) }, [])
  const handleReturnChange = useCallback((inside: boolean) => { setNearReturn(inside); if (!inside) setDismissedReturn(false) }, [])
  return <>
    <GameScene world="tieng-anh" Environment={EnglishSpaceEnvironment} onPlanetApproachChange={handlePlanetApproach} onReturnRocketChange={handleReturnChange} planetItems={items} />
    {lesson && game.englishLaunchStage === 'rocket-flight' && <section className={`${styles.portalCard} ${styles.englishWorldCard}`} data-camera-ignore aria-live="polite">
      <div className={styles.portalEyebrow}>Unit {lesson.id}</div>
      <h1>{lesson.title}</h1>
      {lesson.status === 'locked' ? <p>🔒 Hoàn thành bài trước để mở khóa.</p> : <p>Khám phá bài học Tiếng Anh này nhé!</p>}
      {lesson.status !== 'locked' && <button type="button" onClick={() => router.push(lesson.href)}>VÀO HÀNH TINH <span>→</span></button>}
    </section>}
    {nearReturn && !dismissedReturn && !lesson && game.englishLaunchStage === 'rocket-flight' && <section className={`${styles.portalCard} ${styles.englishWorldCard}`} data-camera-ignore aria-live="polite">
      <div className={styles.portalEyebrow}>🚀 TRẠM VŨ TRỤ</div>
      <h1>Trở về nhà?</h1>
      <button type="button" onClick={game.returnFromEnglishWorld}>VỀ NHÀ <span>→</span></button>
      <button type="button" className={styles.mathDockLater} onClick={() => setDismissedReturn(true)}>Ở lại</button>
    </section>}
  </>
}

'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { fetchWithAuthRetry } from '@/lib/auth/client-fetch'
import type { LessonMapItem } from '@/components/games/lesson-map/data'
import { getProgressLessons } from '@/components/games/lesson-map/progress-config'
import VietnameseEnvironment from '../_components/world/VietnameseEnvironment'
import { buildVietnameseLessonNodes } from '../_components/world/vietnamese-world.config'
import styles from '../_components/demo.module.css'

const GameScene = dynamic(() => import('../_components/GameScene'), { ssr: false })
const guestItems: LessonMapItem[] = getProgressLessons('tieng-viet').map((lesson) => ({
  ...lesson,
  status: lesson.id === 1 ? 'current' : lesson.available ? 'available' : 'locked',
}))

export default function VietnameseWorldClient() {
  const router = useRouter()
  const { user } = useAuth()
  const [items, setItems] = useState<LessonMapItem[]>(guestItems)
  const [nearLessonId, setNearLessonId] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!user?.id) { setItems(guestItems); return }
    let cancelled = false
    fetchWithAuthRetry('/api/game-tracking/lesson-map?grade=lop-1&subject=tieng-viet', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('lesson map')))
      .then((data) => { if (!cancelled && data.userId === user.id && Array.isArray(data.items)) setItems(data.items) })
      .catch(() => { if (!cancelled) setItems(guestItems) })
    return () => { cancelled = true }
  }, [user?.id])

  const lessons = useMemo(() => buildVietnameseLessonNodes(items), [items])
  const lesson = useMemo(() => lessons.find((item) => item.id === nearLessonId), [lessons, nearLessonId])
  const handleLessonApproach = useCallback((id: number | null) => {
    setNearLessonId(id)
    if (id !== null) setDismissed(false)
  }, [])

  return <>
    <GameScene world="tieng-viet" Environment={VietnameseEnvironment} onVietnameseLessonApproachChange={handleLessonApproach} planetItems={items} />
    {lesson && !dismissed && <section className={`${styles.portalCard} ${styles.vietnameseWorldCard}`} data-camera-ignore aria-live="polite">
      <button type="button" className={styles.housePromptClose} aria-label="Để sau" onClick={() => setDismissed(true)}>×</button>
      <div className={styles.portalEyebrow}>{lesson.mapTitle ?? `Bài ${lesson.id}`} · ĐIỂM HỌC</div>
      <h1>{lesson.title}</h1>
      {lesson.status === 'locked'
        ? <p>Bài này sẽ mở sau khi bé hoàn thành bài trước nhé.</p>
        : lesson.status === 'completed'
          ? <p>Bé đã hoàn thành rồi. Mình vào ôn lại nhé?</p>
          : <p>Đã đến điểm học. Bé sẵn sàng vào bài chưa?</p>}
      {lesson.status !== 'locked' && <button type="button" onClick={() => router.push(lesson.href)}>VÀO BÀI HỌC <span>→</span></button>}
      {lesson.status === 'locked' && <small>Hãy khám phá các điểm học đang mở trước.</small>}
    </section>}
  </>
}

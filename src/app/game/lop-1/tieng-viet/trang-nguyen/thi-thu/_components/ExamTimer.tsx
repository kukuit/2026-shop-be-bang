'use client'

import { Clock } from 'lucide-react'
import styles from './exam.module.css'

export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600).toString().padStart(2, '0')
  const minutes = Math.floor((safe % 3600) / 60).toString().padStart(2, '0')
  const seconds = (safe % 60).toString().padStart(2, '0')
  return `${hours} : ${minutes} : ${seconds}`
}

export default function ExamTimer({ remainingSeconds, compact = false }: { remainingSeconds: number; compact?: boolean }) {
  const urgent = remainingSeconds <= 5 * 60
  return <div className={compact ? styles.timerCompact : styles.timer}>
    {!compact && <Clock className={styles.timerIcon} size={29} strokeWidth={2.2} />}
    {!compact && <span className={styles.timerLabel}>Còn lại</span>}
    <span aria-live="off" className={`${styles.timerTime} ${compact ? styles.timerTimeCompact : ''} ${urgent ? styles.timerUrgent : ''}`}>{formatClock(remainingSeconds)}</span>
  </div>
}


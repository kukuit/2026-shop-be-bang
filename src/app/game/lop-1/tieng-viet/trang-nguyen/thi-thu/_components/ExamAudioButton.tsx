'use client'

import { Volume2 } from 'lucide-react'
import styles from './exam.module.css'

export default function ExamAudioButton({
  active,
  onClick,
  label,
  compact = false,
}: {
  active: boolean
  onClick(): void
  label: string
  compact?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={event => { event.preventDefault(); event.stopPropagation(); onClick() }}
      className={`${styles.audioButton} ${active ? styles.audioButtonActive : ''}`}
    >
      <Volume2 size={compact ? 20 : 22} strokeWidth={2.1} />
    </button>
  )
}


'use client'
import type { CSSProperties } from 'react'
import styles from './TaskWorkflow.module.css'

export default function CompletionSlider({
  value,
  onChange,
  disabled,
}: {
  value: number | null
  onChange(value: number): void
  disabled: boolean
}) {
  const position = value ?? 50
  return (
    <div className={styles.rating}>
      <div className={styles.ratingLabel}>
        <label htmlFor="completion-slider">Mức độ hoàn thành</label>
        <output aria-live="polite">{value === null ? '—%' : `${value}%`}</output>
      </div>
      <div
        className={`${styles.slider} ${value === null ? styles.ghost : ''}`}
        style={{ '--percent': `${position}%` } as CSSProperties}
      >
        <div className={styles.markers}>
          {[0, 25, 50, 75, 100].map((mark) => (
            <button
              type="button"
              key={mark}
              disabled={disabled}
              aria-label={`Đánh giá ${mark}%`}
              onClick={() => onChange(mark)}
            >
              {mark}
            </button>
          ))}
        </div>
        <input
          id="completion-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          disabled={disabled}
          value={position}
          aria-valuetext={value === null ? 'Chưa có đánh giá' : `${value}%`}
          onPointerDown={() => onChange(position)}
          onChange={(e) => onChange(Number(e.target.value))}
          onKeyDown={(e) => {
            if (
              [
                'ArrowLeft',
                'ArrowRight',
                'ArrowUp',
                'ArrowDown',
                'Home',
                'End',
                'PageUp',
                'PageDown',
                ' ',
              ].includes(e.key)
            )
              onChange(position)
          }}
        />
      </div>
      {value === null && <p className={styles.hint}>Chạm hoặc kéo để đánh giá</p>}
    </div>
  )
}

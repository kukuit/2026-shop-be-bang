'use client'

import type { CSSProperties } from 'react'
import type { ExamVisual, FindTargetObjectTheme } from '../../_exam/types'
import styles from '../exam.module.css'

const findObjectThemeClass: Record<FindTargetObjectTheme, string> = {
  star: styles.findObjectStar,
  balloon: styles.findObjectBalloon,
  gift: styles.findObjectGift,
  candy: styles.findObjectCandy,
}

export default function QuestionVisual({ visual, compact = false, large = false, maxDimension }: { visual: ExamVisual; compact?: boolean; large?: boolean; maxDimension?: number }) {
  if (visual.type === 'object-letter') return <span
    role="img"
    aria-label={visual.label ?? `${visual.objectTheme ?? 'Đồ vật'} có chữ ${visual.value}`}
    className={`${styles.findObject} ${findObjectThemeClass[visual.objectTheme ?? 'star']} ${compact ? styles.findObjectCompact : ''}`}
    style={{ '--object-color': visual.accent ?? '#f8c642' } as CSSProperties}
  >{visual.objectTheme === 'candy' && <span className={styles.findObjectCandyBody} aria-hidden="true" />}<span className={styles.findObjectLetter}>{visual.value}</span></span>
  if (visual.type === 'star-letter') return <span
    role="img"
    aria-label={visual.label ?? `Ngôi sao chữ ${visual.value}`}
    className={styles.starLetter}
    style={{ '--star-color': visual.accent ?? '#f8c642' } as CSSProperties}
  >{visual.value}</span>
  if (visual.type === 'bubble-letter') return <span
    role="img"
    aria-label={visual.label ?? `Quả bóng chữ ${visual.value}`}
    className={`${styles.bubbleLetter} ${compact ? styles.bubbleLetterCompact : ''}`}
  >{visual.value}</span>
  if (visual.type === 'image' && visual.sprite) {
    const crop = visual.sprite
    const aspectRatio = crop.width / crop.height
    const naturalDisplayHeight = compact ? 112 : large ? 220 : 160
    const displayWidth = maxDimension === undefined
      ? Math.round(aspectRatio * naturalDisplayHeight)
      : Math.min(maxDimension, aspectRatio * maxDimension)
    const displayHeight = maxDimension === undefined ? naturalDisplayHeight : displayWidth / aspectRatio
    const maxX = crop.sheetWidth - crop.width
    const maxY = crop.sheetHeight - crop.height
    return <span
      role="img"
      aria-label={visual.label ?? ''}
      className={`${large ? styles.flowerSprite : 'inline-block'} shrink-0`}
      style={{
        width: large && maxDimension === undefined ? `min(${displayWidth}px, 68vw)` : `${displayWidth}px`,
        height: large ? 'auto' : `${displayHeight}px`,
        aspectRatio: large ? `${crop.width} / ${crop.height}` : undefined,
        maxWidth: '100%',
        backgroundImage: `url(${crop.spriteSheet})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${crop.sheetWidth / crop.width * 100}% ${crop.sheetHeight / crop.height * 100}%`,
        backgroundPosition: `${maxX > 0 ? crop.x / maxX * 100 : 0}% ${maxY > 0 ? crop.y / maxY * 100 : 0}%`,
      }}
    />
  }
  if (visual.type === 'image') return <img src={visual.value} alt={visual.label ?? ''} className="max-h-28 max-w-full rounded-xl object-contain" />
  if (visual.type === 'letter-card') return <span
    className={`grid place-items-center rounded-xl border-2 border-amber-200 bg-amber-50 font-black text-slate-800 shadow-sm ${compact ? 'h-11 min-w-11 px-2 text-xl' : 'h-16 min-w-16 px-3 text-3xl sm:h-20 sm:min-w-20 sm:text-4xl'}`}
    style={{ transform: visual.rotation ? `rotate(${visual.rotation}deg)` : undefined }}
  >{visual.value}</span>
  return <span
    role={visual.label ? 'img' : undefined}
    aria-label={visual.label}
    className={`inline-grid place-items-center ${compact ? 'min-h-10 min-w-10 text-3xl' : 'min-h-16 min-w-16 text-5xl sm:text-6xl'}`}
  >{visual.value}</span>
}

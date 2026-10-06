'use client'

import type { ExamVisual } from '../../_exam/types'

export default function QuestionVisual({ visual, compact = false }: { visual: ExamVisual; compact?: boolean }) {
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

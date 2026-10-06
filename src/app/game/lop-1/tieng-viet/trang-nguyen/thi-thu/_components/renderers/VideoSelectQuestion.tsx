'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { RotateCcw } from 'lucide-react'
import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import QuestionVisual from './QuestionVisual'

type Flower = { id: string; emoji: string; word: string; letter: string }

export default function VideoSelectQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, onAnswer } = props
  const data = question.data as { mediaType?: string; animation?: string; flowers?: Flower[]; targetId?: string } | undefined
  const flowers = data?.flowers ?? []
  const targetIndex = Math.max(0, flowers.findIndex(flower => flower.id === data?.targetId))
  const targetPosition = flowers.length <= 1 ? 50 : 16 + targetIndex * (68 / (flowers.length - 1))
  const [replayKey, setReplayKey] = useState(0)
  return <QuestionFrame {...props}>
    <div key={replayKey} className="exam-bee-scene relative my-5 h-48 overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-100 to-emerald-50 sm:h-56" style={{ '--bee-target-position': `${targetPosition}%` } as CSSProperties}>
      <span aria-hidden="true" className="exam-bee absolute z-10 text-4xl sm:text-5xl">🐝</span>
      <div className="absolute inset-x-3 bottom-3 flex justify-around">
        {flowers.map(flower => <div key={flower.id} className="grid justify-items-center gap-1">
          <span className="text-4xl sm:text-5xl" role="img" aria-label={flower.word}>{flower.emoji}</span>
          <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-amber-300 bg-white text-lg font-black text-slate-800">{flower.letter}</span>
        </div>)}
      </div>
    </div>
    <button type="button" disabled={disabled} onClick={() => setReplayKey(key => key + 1)} className="mx-auto flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"><RotateCcw size={16} />Xem lại</button>
    <label className="mx-auto mt-2 block max-w-xs">
      <span className="mb-2 block text-sm font-bold text-slate-700">Chọn chữ cái nơi ong đậu</span>
      <select value={typeof answer === 'string' ? answer : ''} disabled={disabled} onChange={event => onAnswer(question.id, event.target.value)} className="min-h-14 w-full rounded-xl border-2 border-slate-300 bg-white px-4 text-center text-xl font-extrabold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100">
        <option value="">-- Chọn chữ --</option>
        {(question.options ?? []).map(option => <option key={option.id} value={option.id}>{option.text}</option>)}
      </select>
    </label>
    {question.data?.animation === 'bee-flight' && <span className="sr-only">Hoạt ảnh mô phỏng chú ong bay tới một bông hoa.</span>}
    {question.content?.type === 'visual' && question.content.visual && <QuestionVisual visual={question.content.visual} compact />}
  </QuestionFrame>
}

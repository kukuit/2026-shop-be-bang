'use client'

import { useState } from 'react'
import ExamAudioButton from '../ExamAudioButton'
import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import QuestionVisual from './QuestionVisual'

type Slot = { id: string; label: string; prompt?: string; emoji: string; voice?: string }
type Tile = { id: string; text: string; visual?: import('../../_exam/types').ExamVisual }

export default function DragToSlotQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, playingId, onAnswer, onPlayAudio } = props
  const data = question.data as { slots?: Slot[]; items?: Tile[] } | undefined
  const slots = data?.slots ?? []
  const items = data?.items ?? []
  const mapping = !Array.isArray(answer) && typeof answer === 'object' ? answer as Record<string, string> : {}
  const [selectedId, setSelectedId] = useState<string | null>(null)

  function assign(slotId: string, itemId = selectedId) {
    if (disabled || !itemId || !items.some(item => item.id === itemId)) return
    const next = Object.fromEntries(Object.entries(mapping).filter(([existingSlot, existingItem]) => existingSlot !== slotId && existingItem !== itemId))
    next[slotId] = itemId
    onAnswer(question.id, next)
    setSelectedId(null)
  }

  return <QuestionFrame {...props}>
    <div className="my-5 grid gap-3 sm:grid-cols-3">
      {slots.map(slot => {
        const placed = items.find(item => item.id === mapping[slot.id])
        const fruitColor = slot.id === 'greenApple' ? '#dcfce7' : slot.id === 'yellowApple' ? '#fef3c7' : '#fee2e2'
        const audioId = `${question.id}:${slot.id}`
        return <div key={slot.id} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); assign(slot.id, event.dataTransfer.getData('text/plain')) }} className="grid justify-items-center gap-2 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 p-3">
          <span className="text-center text-sm font-extrabold text-slate-700">{slot.prompt ?? slot.label}</span>
          <span className="grid h-20 w-20 place-items-center rounded-full text-5xl shadow-sm" style={{ backgroundColor: fruitColor }} role="img" aria-label={slot.label}>{slot.emoji}</span>
          {slot.voice && <ExamAudioButton compact active={playingId === audioId} label={`Nghe yêu cầu ${slot.label}`} onClick={() => onPlayAudio(audioId, slot.voice!)} />}
          <button type="button" disabled={disabled} onClick={() => { if (selectedId) assign(slot.id); else if (placed) { const next = { ...mapping }; delete next[slot.id]; onAnswer(question.id, next) } }} aria-label={`${placed ? 'Ô chữ ' + placed.text : 'Ô trống'} cho ${slot.label}`} className={`grid min-h-14 min-w-20 place-items-center rounded-xl border-2 px-3 text-2xl font-black ${placed ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-white'} ${disabled ? 'cursor-default' : ''}`}>
            {placed?.visual ? <QuestionVisual visual={placed.visual} compact /> : placed?.text ?? '＋'}
          </button>
        </div>
      })}
    </div>
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500">Chọn chữ, rồi chọn ô táo</p>
      <div className="flex flex-wrap justify-center gap-2">{items.map(item => {
        const isPlaced = Object.values(mapping).includes(item.id)
        return <button key={item.id} type="button" draggable={!disabled} disabled={disabled} onClick={() => setSelectedId(item.id)} onDragStart={event => event.dataTransfer.setData('text/plain', item.id)} aria-pressed={selectedId === item.id} className={`flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-xl border-2 bg-white px-3 py-2 text-xl font-black shadow-sm ${selectedId === item.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'} ${isPlaced ? 'opacity-60' : ''}`}>
          {item.visual && <QuestionVisual visual={item.visual} compact />}{!item.visual && item.text}
        </button>
      })}</div>
    </div>
    <p className="mt-2 text-center text-xs text-slate-500">Có thể chạm chữ rồi chạm ô, hoặc kéo chữ vào ô.</p>
  </QuestionFrame>
}

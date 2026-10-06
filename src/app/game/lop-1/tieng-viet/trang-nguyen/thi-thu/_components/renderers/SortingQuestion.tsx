'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import QuestionVisual from './QuestionVisual'

type SortItem = { id: string; text: string; visual?: import('../../_exam/types').ExamVisual }

export default function SortingQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, onAnswer } = props
  const initialItems = (question.data?.items as SortItem[] | undefined) ?? []
  const savedOrder = Array.isArray(answer) ? answer : null
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const order = savedOrder ?? initialItems.map(item => item.id)
  const items = order.map(id => initialItems.find(item => item.id === id)).filter((item): item is SortItem => Boolean(item))

  function move(id: string, targetIndex: number) {
    if (disabled) return
    const current = order.indexOf(id)
    if (current < 0) return
    const next = [...order]
    next.splice(current, 1)
    next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, id)
    onAnswer(question.id, next)
  }

  return <QuestionFrame {...props}>
    <ol aria-label={`Thứ tự các thẻ câu ${question.number}`} className="my-5 grid gap-2 sm:grid-cols-2">
      {items.map((item, index) => <li
        key={item.id}
        draggable={!disabled}
        onDragStart={event => { setDraggingId(item.id); event.dataTransfer.setData('text/plain', item.id) }}
        onDragOver={event => event.preventDefault()}
        onDrop={event => { event.preventDefault(); move(event.dataTransfer.getData('text/plain') || draggingId || '', index); setDraggingId(null) }}
        onDragEnd={() => setDraggingId(null)}
        className={`flex min-h-16 items-center gap-2 rounded-xl border bg-white p-2 shadow-sm ${draggingId === item.id ? 'opacity-50' : ''} ${disabled ? 'border-slate-200' : 'border-slate-300'}`}
      >
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-sm font-black text-slate-600">{index + 1}</span>
        {item.visual && <QuestionVisual visual={item.visual} compact />}
        <span className="min-w-0 flex-1 text-center text-lg font-bold">{item.text}</span>
        {!disabled && <span className="flex flex-col gap-1"><button type="button" disabled={index === 0} onClick={() => move(item.id, index - 1)} aria-label={`Di chuyển ${item.text} lên`} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-700 disabled:opacity-30"><ArrowUp size={16} /></button><button type="button" disabled={index === items.length - 1} onClick={() => move(item.id, index + 1)} aria-label={`Di chuyển ${item.text} xuống`} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-700 disabled:opacity-30"><ArrowDown size={16} /></button></span>}
      </li>)}
    </ol>
    {!disabled && <p className="text-center text-xs text-slate-500">Kéo thẻ để đổi chỗ hoặc dùng nút mũi tên.</p>}
  </QuestionFrame>
}

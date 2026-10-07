'use client'

import { useState } from 'react'
import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import QuestionVisual from './QuestionVisual'

type Tile = { id: string; text?: string; visual?: import('../../_exam/types').ExamVisual }
type Group = { id: string; label: string }

export default function CategorizeQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, onAnswer } = props
  const data = question.data as { items?: Tile[]; groups?: Group[] } | undefined
  const items = data?.items ?? []
  const groups = data?.groups ?? []
  const mapping = !Array.isArray(answer) && typeof answer === 'object' ? answer as Record<string, string> : {}
  const [selectedItem, setSelectedItem] = useState<string | null>(null)

  function assign(groupId: string, itemId = selectedItem) {
    if (disabled || !itemId) return
    onAnswer(question.id, { ...mapping, [itemId]: groupId })
    setSelectedItem(null)
  }

  return <QuestionFrame {...props}>
    <div className="my-5 grid gap-4 sm:grid-cols-2">
      {groups.map(group => <div
        key={group.id}
        onDragOver={event => event.preventDefault()}
        onDrop={event => { event.preventDefault(); assign(group.id, event.dataTransfer.getData('text/plain')) }}
        className="min-h-36 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-3"
      >
        <button type="button" disabled={disabled} onClick={() => assign(group.id)} className="mb-3 min-h-11 w-full rounded-xl bg-blue-100 px-3 py-2 text-center font-extrabold text-blue-900 disabled:cursor-default">{group.label}</button>
        <div className="flex min-h-16 flex-wrap justify-center gap-2">
          {items.filter(item => mapping[item.id] === group.id).map(item => <TileButton key={item.id} item={item} selected={selectedItem === item.id} disabled={disabled} onSelect={() => { setSelectedItem(item.id); if (selectedItem === item.id) assign(group.id, item.id) }} onDragStart={event => event.dataTransfer.setData('text/plain', item.id)} />)}
        </div>
      </div>)}
    </div>
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500">Các thẻ cần xếp</p>
      <div className="flex flex-wrap justify-center gap-2">{items.filter(item => !mapping[item.id]).map(item => <TileButton key={item.id} item={item} selected={selectedItem === item.id} disabled={disabled} onSelect={() => setSelectedItem(item.id)} onDragStart={event => event.dataTransfer.setData('text/plain', item.id)} />)}</div>
    </div>
    <p className="mt-2 text-center text-xs text-slate-500">Chạm một thẻ rồi chạm nhóm, hoặc kéo thẻ vào nhóm.</p>
  </QuestionFrame>
}

function TileButton({ item, selected, disabled, onSelect, onDragStart }: {
  item: Tile; selected: boolean; disabled: boolean; onSelect(): void; onDragStart(event: React.DragEvent<HTMLButtonElement>): void
}) {
  return <button type="button" draggable={!disabled} disabled={disabled} onClick={onSelect} onDragStart={onDragStart} className={`flex min-h-12 items-center gap-2 rounded-xl border bg-white px-3 py-2 font-bold shadow-sm ${selected ? 'border-amber-500 ring-2 ring-amber-200' : 'border-slate-200'} ${disabled ? 'cursor-default opacity-70' : 'cursor-grab'}`}>
    {item.visual && <QuestionVisual visual={item.visual} compact />}{item.text && <span>{item.text}</span>}
  </button>
}

'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import ExamAudioButton from '../ExamAudioButton'
import type { ExamOption } from '../../_exam/types'
import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import QuestionVisual from './QuestionVisual'

type MatchItem = ExamOption
const EMPTY_MAPPING: Record<string, string> = {}

export default function MatchingQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, playingId, onAnswer, onPlayAudio } = props
  const data = question.data as { leftItems?: MatchItem[]; rightItems?: MatchItem[] } | undefined
  const leftItems = data?.leftItems ?? []
  const rightItems = data?.rightItems ?? []
  const connections = !Array.isArray(answer) && typeof answer === 'object' ? answer as Record<string, string> : EMPTY_MAPPING
  const [pendingLeft, setPendingLeft] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const leftRefs = useRef(new Map<string, HTMLButtonElement>())
  const rightRefs = useRef(new Map<string, HTMLButtonElement>())
  const [lines, setLines] = useState<Array<{ from: string; to: string; x1: number; y1: number; x2: number; y2: number }>>([])

  const measureLines = useCallback(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const bounds = wrapper.getBoundingClientRect()
    const next = Object.entries(connections).flatMap(([from, to]) => {
      const left = leftRefs.current.get(from)?.getBoundingClientRect()
      const right = rightRefs.current.get(to)?.getBoundingClientRect()
      if (!left || !right) return []
      return [{ from, to, x1: left.right - bounds.left, y1: left.top + left.height / 2 - bounds.top, x2: right.left - bounds.left, y2: right.top + right.height / 2 - bounds.top }]
    })
    setLines(next)
  }, [connections])

  useLayoutEffect(() => { measureLines() }, [measureLines, leftItems, rightItems])
  useEffect(() => {
    window.addEventListener('resize', measureLines)
    window.addEventListener('scroll', measureLines, true)
    const observer = typeof ResizeObserver === 'undefined' || !wrapperRef.current ? null : new ResizeObserver(measureLines)
    if (wrapperRef.current) observer?.observe(wrapperRef.current)
    return () => {
      window.removeEventListener('resize', measureLines)
      window.removeEventListener('scroll', measureLines, true)
      observer?.disconnect()
    }
  }, [measureLines])

  function chooseLeft(id: string) {
    if (disabled) return
    if (connections[id]) {
      const next = { ...connections }
      delete next[id]
      onAnswer(question.id, next)
      setPendingLeft(null)
    } else setPendingLeft(current => current === id ? null : id)
  }

  function chooseRight(id: string) {
    if (disabled) return
    if (!pendingLeft) {
      const connectedLeft = Object.keys(connections).find(left => connections[left] === id)
      if (connectedLeft) {
        const next = { ...connections }
        delete next[connectedLeft]
        onAnswer(question.id, next)
      }
      return
    }
    connect(pendingLeft, id)
    setPendingLeft(null)
  }

  function connect(leftId: string, rightId: string) {
    const next = Object.fromEntries(Object.entries(connections).filter(([left, right]) => left !== leftId && right !== rightId))
    next[leftId] = rightId
    onAnswer(question.id, next)
  }

  return <QuestionFrame {...props}>
    <div ref={wrapperRef} className="relative my-5 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8 sm:gap-16">
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible" aria-hidden="true">
        {lines.map(line => <line key={`${line.from}-${line.to}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />)}
      </svg>
      <div className="relative z-20 grid gap-3">{leftItems.map((item, index) => <button
        key={item.id}
        ref={node => { if (node) leftRefs.current.set(item.id, node); else leftRefs.current.delete(item.id) }}
        type="button"
        disabled={disabled}
        draggable={!disabled}
        onDragStart={event => event.dataTransfer.setData('text/plain', item.id)}
        onClick={() => chooseLeft(item.id)}
        aria-pressed={pendingLeft === item.id}
        className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 bg-white px-3 py-2 text-center font-bold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${pendingLeft === item.id ? 'border-amber-500 bg-amber-50' : connections[item.id] ? 'border-blue-400' : 'border-slate-200'}`}
      ><InteractionItem item={item} index={index} /></button>)}</div>
      <div className="relative z-20 grid gap-3">{rightItems.map((item, index) => {
        const audioId = `${question.id}:${item.id}`
        return <div key={item.id} className="flex min-w-0 items-center gap-1">
          <button
            ref={node => { if (node) rightRefs.current.set(item.id, node); else rightRefs.current.delete(item.id) }}
            type="button"
            disabled={disabled}
            onClick={() => chooseRight(item.id)}
            onDragOver={event => event.preventDefault()}
            onDrop={event => {
              event.preventDefault()
              const leftId = event.dataTransfer.getData('text/plain')
              if (leftItems.some(left => left.id === leftId)) connect(leftId, item.id)
              setPendingLeft(null)
            }}
            aria-label={`Nối với ${item.text ?? `thẻ ${index + 1}`}`}
            className={`flex min-h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border-2 bg-white px-2 py-2 text-center font-bold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-3 ${Object.values(connections).includes(item.id) ? 'border-blue-400' : 'border-slate-200'}`}
          ><InteractionItem item={item} index={index} /></button>
          {item.voice && <ExamAudioButton compact active={playingId === audioId} label={`Nghe âm thanh ${index + 1}`} onClick={() => onPlayAudio(audioId, item.voice!)} />}
        </div>
      })}</div>
    </div>
    <p className="text-center text-xs font-medium text-slate-500">Chạm một thẻ bên trái, rồi chạm thẻ tương ứng bên phải. Chạm thẻ đã nối để gỡ.</p>
  </QuestionFrame>
}

function InteractionItem({ item, index }: {
  item: MatchItem
  index: number
}) {
  return <>
    {item.visual && <QuestionVisual visual={item.visual} compact />}
    {item.text && <span className="text-lg">{item.text}</span>}
    {item.voice && !item.visual && !item.text && <span className="text-sm font-semibold">Âm thanh {index + 1}</span>}
  </>
}

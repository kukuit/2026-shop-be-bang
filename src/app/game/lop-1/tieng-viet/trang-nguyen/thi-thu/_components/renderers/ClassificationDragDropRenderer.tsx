'use client'

import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import type { ClassificationDragDropData, ClassificationItem, ExamVisual } from '../../_exam/types'
import { CLASSIFICATION_MANIFEST_REGISTRY, getClassificationSprite } from '../../_exam/classification-assets'
import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import QuestionVisual from './QuestionVisual'
import styles from '../exam.module.css'

type ActiveDrag = { itemId: string; pointerId: number; startX: number; startY: number; moved: boolean }

function readPlacement(answer: QuestionRendererProps['answer']): Record<string, string> {
  return answer !== undefined && !Array.isArray(answer) && typeof answer === 'object' ? answer : {}
}

export default function ClassificationDragDropRenderer(props: QuestionRendererProps) {
  const { question, answer, disabled, onAnswer } = props
  const data = question.data as ClassificationDragDropData
  const items = data.items ?? []
  const groups = data.groups ?? []
  const placement = readPlacement(answer)
  const activeDragRef = useRef<ActiveDrag | null>(null)
  const suppressClickRef = useRef(false)
  const [dragPreview, setDragPreview] = useState<{ itemId: string; x: number; y: number } | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [hoverGroupId, setHoverGroupId] = useState<string | null>(null)
  const [rejectedItemId, setRejectedItemId] = useState<string | null>(null)

  function placeItem(itemId: string, groupId: string) {
    const item = items.find(candidate => candidate.id === itemId)
    if (disabled || !item || !groups.some(group => group.id === groupId)) return
    const targetCount = items.filter(candidate => placement[candidate.id] === groupId && candidate.id !== itemId).length
    if (targetCount >= data.maxItemsPerGroup) {
      setSelectedItemId(null)
      return
    }

    if (!data.acceptIncorrectPlacement && item.groupId !== groupId) {
      if (placement[item.id]) {
        const nextPlacement = { ...placement }
        delete nextPlacement[item.id]
        onAnswer(question.id, nextPlacement)
      }
      setRejectedItemId(item.id)
      window.setTimeout(() => setRejectedItemId(current => current === item.id ? null : current), 360)
      setSelectedItemId(null)
      return
    }

    onAnswer(question.id, { ...placement, [item.id]: groupId })
    setSelectedItemId(null)
    setRejectedItemId(null)
  }

  function returnItemToSource(itemId: string) {
    if (disabled || !placement[itemId]) return
    const nextPlacement = { ...placement }
    delete nextPlacement[itemId]
    onAnswer(question.id, nextPlacement)
    setSelectedItemId(null)
  }

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>, item: ClassificationItem) {
    if (disabled) return
    event.preventDefault()
    activeDragRef.current = {
      itemId: item.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    }
    setSelectedItemId(item.id)
    setDragPreview({ itemId: item.id, x: event.clientX, y: event.clientY })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = activeDragRef.current
    if (!active || active.pointerId !== event.pointerId) return
    const moved = Math.hypot(event.clientX - active.startX, event.clientY - active.startY) >= 5
    active.moved ||= moved
    setDragPreview({ itemId: active.itemId, x: event.clientX, y: event.clientY })
    const zone = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-classify-group]')
    setHoverGroupId(zone?.dataset.classifyGroup ?? null)
    if (moved) event.preventDefault()
  }

  function finishDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = activeDragRef.current
    if (!active || active.pointerId !== event.pointerId) return
    activeDragRef.current = null
    setDragPreview(null)
    setHoverGroupId(null)
    suppressClickRef.current = active.moved
    if (active.moved) window.setTimeout(() => { suppressClickRef.current = false }, 0)
    if (!active.moved) return
    const target = document.elementFromPoint(event.clientX, event.clientY)
    const groupId = target?.closest<HTMLElement>('[data-classify-group]')?.dataset.classifyGroup
    if (groupId) placeItem(active.itemId, groupId)
    else if (target?.closest('[data-classify-source]')) returnItemToSource(active.itemId)
    else setSelectedItemId(null)
  }

  function cancelDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (activeDragRef.current?.pointerId !== event.pointerId) return
    activeDragRef.current = null
    setDragPreview(null)
    setHoverGroupId(null)
  }

  function handleTokenClick(itemId: string) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (!disabled && !placement[itemId]) setSelectedItemId(itemId)
  }

  return <QuestionFrame {...props}>
    <div className={styles.classifyQuestion}>
      <p className={styles.classifyNote}>{data.note}</p>
      <div className={styles.classifySource} aria-label="Các thẻ cần xếp" data-classify-source>
        {items.filter(item => !placement[item.id]).map(item => <ClassifyToken
          key={item.id}
          item={item}
          selected={selectedItemId === item.id}
          dragging={dragPreview?.itemId === item.id}
          rejected={rejectedItemId === item.id}
          disabled={disabled}
          onPointerDown={event => startDrag(event, item)}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          onPointerCancel={cancelDrag}
          onClick={() => handleTokenClick(item.id)}
        />)}
      </div>
      <div className={styles.classifyGroups}>
        {groups.map(group => <section
          key={group.id}
          className={[styles.classifyGroup, hoverGroupId === group.id ? styles.classifyGroupHover : ''].filter(Boolean).join(' ')}
          data-classify-group={group.id}
          aria-label={group.label}
          role="group"
          tabIndex={disabled ? -1 : 0}
          onClick={event => {
            if ((event.target as HTMLElement).closest('[data-classify-token]')) return
            if (selectedItemId) placeItem(selectedItemId, group.id)
          }}
          onKeyDown={event => {
            if (selectedItemId && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault()
              placeItem(selectedItemId, group.id)
            }
          }}
        >
          <span className={styles.classifyGroupLabel}>{group.label}</span>
          <div className={styles.classifyPlacedItems}>
            {items.filter(item => placement[item.id] === group.id).map(item => <ClassifyToken
              key={item.id}
              item={item}
              selected={false}
              dragging={dragPreview?.itemId === item.id}
              rejected={rejectedItemId === item.id}
              disabled={disabled}
              onPointerDown={event => startDrag(event, item)}
              onPointerMove={moveDrag}
              onPointerUp={finishDrag}
              onPointerCancel={cancelDrag}
            />)}
          </div>
        </section>)}
      </div>
      {dragPreview && (() => {
        const item = items.find(candidate => candidate.id === dragPreview.itemId)
        return item ? <div aria-hidden="true" className={styles.classifyDragPreview} style={{ left: dragPreview.x, top: dragPreview.y }}>
          <ClassifyToken item={item} selected dragging={false} rejected={false} disabled />
        </div> : null
      })()}
    </div>
  </QuestionFrame>
}

function imageVisual(item: ClassificationItem): ExamVisual | undefined {
  if (!item.image) return undefined
  const manifest = CLASSIFICATION_MANIFEST_REGISTRY[item.image.manifestId]
  const sprite = getClassificationSprite(item.image.manifestId, item.image.imageId)
  return sprite ? { type: 'image', value: manifest.image, label: 'Hình cần phân loại', sprite } : undefined
}

function ClassifyToken({ item, selected, dragging, rejected, disabled, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick }: {
  item: ClassificationItem
  selected: boolean
  dragging: boolean
  rejected: boolean
  disabled: boolean
  onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerMove?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerUp?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerCancel?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onClick?: () => void
}) {
  const style = { '--classify-token-color': item.color ?? '#93c5fd' } as CSSProperties
  const isImage = item.kind === 'image'
  const visual = isImage ? imageVisual(item) : undefined
  return <button
    type="button"
    data-classify-token
    aria-label={isImage ? 'Hình cần phân loại' : item.value ?? 'Thẻ chữ'}
    aria-pressed={selected}
    disabled={disabled}
    style={style}
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={onPointerUp}
    onPointerCancel={onPointerCancel}
    onClick={onClick}
    className={[
      styles.classifyToken,
      isImage ? styles.classifyTokenImage : item.decoration?.type === 'flower' ? styles.classifyTokenFlower : styles.classifyTokenBall,
      selected ? styles.classifyTokenSelected : '',
      dragging ? styles.classifyTokenDragging : '',
      rejected ? styles.classifyTokenRejected : '',
      disabled ? styles.classifyTokenPlaced : '',
    ].filter(Boolean).join(' ')}
  >
    {visual ? <QuestionVisual visual={visual} maxDimension={80} /> : <span className={styles.classifyTokenValue}>{item.value}</span>}
  </button>
}

'use client'

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import styles from './exam.module.css'

type HorizontalSortableQuestionProps = {
  questionId: string
  itemIds: string[]
  initialOrder: string[]
  disabled: boolean
  containerClassName?: string
  itemClassName?: string
  getItemLabel?: (id: string) => string
  onOrderChange: (order: string[]) => void
  renderItem: (id: string) => ReactNode
}

type PointerDrag = {
  pointerId: number
  id: string
  startX: number
  startY: number
  clientX: number
  clientY: number
  offsetX: number
  offsetY: number
  width: number
  height: number
  moved: boolean
}

type RectSnapshot = Map<string, DOMRect>

function normalizeOrder(itemIds: string[], order: string[]) {
  const validIds = new Set(itemIds)
  const normalized = order.filter((id, index) => validIds.has(id) && order.indexOf(id) === index)
  for (const id of itemIds) {
    if (!normalized.includes(id)) normalized.push(id)
  }
  return normalized
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export default function HorizontalSortableQuestion({
  questionId,
  itemIds,
  initialOrder,
  disabled,
  containerClassName,
  itemClassName,
  getItemLabel,
  onOrderChange,
  renderItem,
}: HorizontalSortableQuestionProps) {
  const itemSignature = itemIds.join('\u0000')
  const initialSignature = initialOrder.join('\u0000')
  const [order, setOrder] = useState(() => normalizeOrder(itemIds, initialOrder))
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [floatingPosition, setFloatingPosition] = useState({ left: 0, top: 0, width: 0, height: 0 })
  const rootRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const orderRef = useRef(order)
  const draggingIdRef = useRef(draggingId)
  const pointerDragRef = useRef<PointerDrag | null>(null)
  const previewIndexRef = useRef<number | null>(previewIndex)
  const pendingSnapshotRef = useRef<RectSnapshot | null>(null)
  const callbacksRef = useRef({ onOrderChange, disabled })

  orderRef.current = order
  draggingIdRef.current = draggingId
  previewIndexRef.current = previewIndex
  callbacksRef.current = { onOrderChange, disabled }

  const readRects = useCallback((): RectSnapshot => {
    const snapshot: RectSnapshot = new Map()
    const root = rootRef.current
    if (!root) return snapshot

    root.querySelectorAll<HTMLElement>('[data-sortable-id]').forEach(element => {
      const id = element.dataset.sortableId
      if (id) snapshot.set(id, element.getBoundingClientRect())
    })
    const floating = root.querySelector<HTMLElement>('[data-sortable-floating-id]')
    const floatingId = floating?.dataset.sortableFloatingId
    if (floating && floatingId) snapshot.set(floatingId, floating.getBoundingClientRect())
    return snapshot
  }, [])

  const prepareLayoutAnimation = useCallback(() => {
    pendingSnapshotRef.current = readRects()
  }, [readRects])

  useIsomorphicLayoutEffect(() => {
    const previous = pendingSnapshotRef.current
    if (!previous) return
    pendingSnapshotRef.current = null

    const root = rootRef.current
    if (!root) return
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const currentElements = new Map<string, HTMLElement>()
    root.querySelectorAll<HTMLElement>('[data-sortable-id]').forEach(element => {
      const id = element.dataset.sortableId
      if (id) currentElements.set(id, element)
    })
    if (reducedMotion) return

    const activeId = draggingIdRef.current
    currentElements.forEach((element, id) => {
      if (id === activeId) return
      const from = previous.get(id)
      if (!from) return
      const to = element.getBoundingClientRect()
      const dx = from.left - to.left
      const dy = from.top - to.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      element.getAnimations().forEach(animation => animation.cancel())
      element.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: 'translate(0, 0)' },
        ],
        { duration: 180, easing: 'cubic-bezier(0.2, 0.75, 0.25, 1)' },
      )
    })
  }, [order, draggingId, previewIndex])

  useEffect(() => {
    const nextOrder = normalizeOrder(itemIds, initialOrder)
    pointerDragRef.current = null
    orderRef.current = nextOrder
    setOrder(nextOrder)
    setDraggingId(null)
    setPreviewIndex(null)
    setFloatingPosition({ left: 0, top: 0, width: 0, height: 0 })
    pendingSnapshotRef.current = null
  // Signatures let the component respond to changed answer data without depending on array identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId, itemSignature, initialSignature])

  useEffect(() => {
    if (!disabled) return
    pointerDragRef.current = null
    setDraggingId(null)
    setPreviewIndex(null)
  }, [disabled])

  useEffect(() => {
    function getInsertionIndex(clientX: number, draggedId: string) {
      const area = areaRef.current
      if (!area) return 0
      const cards = Array.from(area.querySelectorAll<HTMLElement>('[data-sortable-item]'))
        .filter(element => element.dataset.sortableId !== draggedId)
        .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)
      return cards.filter(card => clientX > card.getBoundingClientRect().left + card.getBoundingClientRect().width / 2).length
    }

    function updateInsertion(clientX: number, draggedId: string) {
      const nextIndex = getInsertionIndex(clientX, draggedId)
      const currentOrder = orderRef.current
      const remaining = currentOrder.filter(id => id !== draggedId)
      const clampedIndex = Math.max(0, Math.min(nextIndex, remaining.length))
      const nextOrder = [...remaining]
      nextOrder.splice(clampedIndex, 0, draggedId)

      if (nextOrder.some((id, index) => id !== currentOrder[index])) {
        prepareLayoutAnimation()
        orderRef.current = nextOrder
        setOrder(nextOrder)
      }
      if (previewIndexRef.current !== clampedIndex) {
        if (!pendingSnapshotRef.current) prepareLayoutAnimation()
        previewIndexRef.current = clampedIndex
        setPreviewIndex(clampedIndex)
      }
    }

    function handlePointerMove(event: PointerEvent) {
      const drag = pointerDragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      drag.clientX = event.clientX
      drag.clientY = event.clientY

      const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY)
      if (!drag.moved && distance < 4) return

      if (!drag.moved) {
        drag.moved = true
        prepareLayoutAnimation()
        setDraggingId(drag.id)
        setPreviewIndex(null)
        previewIndexRef.current = null
        setFloatingPosition({
          left: event.clientX - drag.offsetX,
          top: event.clientY - drag.offsetY,
          width: drag.width,
          height: drag.height,
        })
        requestAnimationFrame(() => {
          if (pointerDragRef.current?.pointerId === drag.pointerId && pointerDragRef.current.moved) {
            updateInsertion(pointerDragRef.current.clientX, drag.id)
          }
        })
        return
      }

      setFloatingPosition({
        left: event.clientX - drag.offsetX,
        top: event.clientY - drag.offsetY,
        width: drag.width,
        height: drag.height,
      })
      updateInsertion(event.clientX, drag.id)
    }

    function finishPointer(event: PointerEvent) {
      const drag = pointerDragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      pointerDragRef.current = null
      if (drag.moved && !callbacksRef.current.disabled) {
        const finalOrder = [...orderRef.current]
        prepareLayoutAnimation()
        callbacksRef.current.onOrderChange(finalOrder)
      }
      if (drag.moved) {
        setDraggingId(null)
        setPreviewIndex(null)
        previewIndexRef.current = null
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', finishPointer)
    window.addEventListener('pointercancel', finishPointer)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', finishPointer)
      window.removeEventListener('pointercancel', finishPointer)
    }
  }, [prepareLayoutAnimation])

  function beginPointerDrag(event: ReactPointerEvent<HTMLButtonElement>, id: string) {
    if (disabled || event.button !== 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    event.preventDefault()
    pointerDragRef.current = {
      pointerId: event.pointerId,
      id,
      startX: event.clientX,
      startY: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
    }
  }

  const visibleOrder = draggingId ? order.filter(id => id !== draggingId) : order
  const currentItemClass = itemClassName ?? styles.alphabetSortItem
  const currentContainerClass = containerClassName ?? styles.alphabetSortArea

  return (
    <div className={styles.sortableQuestionRoot} ref={rootRef}>
      <div className={currentContainerClass} ref={areaRef}>
        {visibleOrder.map((id, index) => (
          <Fragment key={id}>
            {draggingId && previewIndex === index && (
              <span
                aria-hidden="true"
                className={`${currentItemClass} ${styles.sortablePlaceholder}`}
                data-sortable-id={draggingId}
                style={{ width: floatingPosition.width, height: floatingPosition.height, flexBasis: floatingPosition.width }}
              />
            )}
            <button
              aria-label={getItemLabel?.(id) ?? `Di chuyển ${id}`}
              className={currentItemClass}
              data-sortable-id={id}
              data-sortable-item="true"
              disabled={disabled}
              onPointerDown={event => beginPointerDrag(event, id)}
              type="button"
            >
              {renderItem(id)}
            </button>
          </Fragment>
        ))}
        {draggingId && previewIndex === visibleOrder.length && (
          <span
            aria-hidden="true"
            className={`${currentItemClass} ${styles.sortablePlaceholder}`}
            data-sortable-id={draggingId}
            style={{ width: floatingPosition.width, height: floatingPosition.height, flexBasis: floatingPosition.width }}
          />
        )}
      </div>
      {draggingId && (
        <div
          aria-hidden="true"
          className={`${currentItemClass} ${styles.sortableFloatingItem}`}
          data-sortable-floating-id={draggingId}
          style={{
            left: floatingPosition.left,
            top: floatingPosition.top,
            width: floatingPosition.width,
            height: floatingPosition.height,
          }}
        >
          {renderItem(draggingId)}
        </div>
      )}
    </div>
  )
}

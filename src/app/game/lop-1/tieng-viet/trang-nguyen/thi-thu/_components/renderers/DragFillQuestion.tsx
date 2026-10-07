'use client'

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import ExamAudioButton from '../ExamAudioButton'
import type { Question30Data } from '../../_exam/types'
import { QUESTION_30_FRUIT_NONE_COLOR_MANIFEST } from '../../_exam/question30-knowledge'
import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import FruitTintedSprite from './FruitTintedSprite'
import styles from '../exam.module.css'

type ActiveDrag = {
  pointerId: number
  letter: string
  sourceSlotId?: string
  startX: number
  startY: number
}

type DragPreview = {
  letter: string
  x: number
  y: number
  sourceSlotId?: string
  targetSlotId?: string
  targetBank: boolean
  returning?: boolean
}

type DropFeedback = {
  targetSlotId?: string
  sourceSlotId?: string
}

function readPlacements(answer: QuestionRendererProps['answer']): Record<string, string> {
  return answer !== undefined && !Array.isArray(answer) && typeof answer === 'object'
    ? answer as Record<string, string>
    : {}
}

export default function DragFillQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, playingId, onAnswer, onPlayAudio } = props
  const data = question.data as unknown as Question30Data
  const items = data.items ?? []
  const letterBank = data.letterBank ?? []
  const placements = readPlacements(answer)
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
  const [dropFeedback, setDropFeedback] = useState<DropFeedback | null>(null)
  const dragCleanupRef = useRef<(() => void) | null>(null)
  const dragFrameRef = useRef<number | null>(null)
  const dragPointerRef = useRef<{ x: number; y: number } | null>(null)
  const dragReturnTimerRef = useRef<number | null>(null)
  const dropFeedbackTimerRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)

  const cancelPendingDragFrame = useCallback(() => {
    if (dragFrameRef.current !== null) window.cancelAnimationFrame(dragFrameRef.current)
    dragFrameRef.current = null
    dragPointerRef.current = null
  }, [])

  useEffect(() => () => {
    dragCleanupRef.current?.()
    cancelPendingDragFrame()
    if (dragReturnTimerRef.current !== null) window.clearTimeout(dragReturnTimerRef.current)
    if (dropFeedbackTimerRef.current !== null) window.clearTimeout(dropFeedbackTimerRef.current)
  }, [cancelPendingDragFrame])

  function showDropFeedback(feedback: DropFeedback) {
    setDropFeedback(feedback)
    if (dropFeedbackTimerRef.current !== null) window.clearTimeout(dropFeedbackTimerRef.current)
    dropFeedbackTimerRef.current = window.setTimeout(() => {
      setDropFeedback(null)
      dropFeedbackTimerRef.current = null
    }, 520)
  }

  function placeLetter(letter: string, itemId: string, sourceSlotId?: string) {
    if (disabled || !letterBank.includes(letter) || !items.some(item => item.id === itemId)) return
    const next = Object.fromEntries(Object.entries(placements).filter(([existingId, value]) => existingId !== itemId && value !== letter))
    next[itemId] = letter
    onAnswer(question.id, next)
    showDropFeedback({ targetSlotId: itemId, sourceSlotId: sourceSlotId !== itemId ? sourceSlotId : undefined })
    setSelectedLetter(null)
  }

  function returnLetter(itemId: string) {
    if (disabled || !Object.hasOwn(placements, itemId)) return
    const next = { ...placements }
    delete next[itemId]
    onAnswer(question.id, next)
    showDropFeedback({ sourceSlotId: itemId })
    setSelectedLetter(null)
  }

  function beginPointerDrag(event: ReactPointerEvent<HTMLElement>, letter: string, sourceSlotId?: string) {
    if (disabled || !letterBank.includes(letter)) return
    event.preventDefault()
    dragCleanupRef.current?.()
    cancelPendingDragFrame()
    if (dragReturnTimerRef.current !== null) {
      window.clearTimeout(dragReturnTimerRef.current)
      dragReturnTimerRef.current = null
    }
    const active: ActiveDrag = {
      pointerId: event.pointerId,
      letter,
      sourceSlotId,
      startX: event.clientX,
      startY: event.clientY,
    }
    const removeListeners = () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      if (dragCleanupRef.current === removeListeners) dragCleanupRef.current = null
    }
    const onPointerMove = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== active.pointerId) return
      pointerEvent.preventDefault()
      if (Math.hypot(pointerEvent.clientX - active.startX, pointerEvent.clientY - active.startY) < 8) return
      dragPointerRef.current = { x: pointerEvent.clientX, y: pointerEvent.clientY }
      if (dragFrameRef.current !== null) return
      dragFrameRef.current = window.requestAnimationFrame(() => {
        dragFrameRef.current = null
        const pointer = dragPointerRef.current
        dragPointerRef.current = null
        if (!pointer) return
        const pointedElement = document.elementFromPoint(pointer.x, pointer.y)
        const targetSlotId = pointedElement?.closest<HTMLElement>('[data-q30-slot-id]')?.dataset.q30SlotId
        setDragPreview({
          letter: active.letter,
          x: pointer.x,
          y: pointer.y,
          sourceSlotId: active.sourceSlotId,
          targetSlotId: targetSlotId !== active.sourceSlotId ? targetSlotId : undefined,
          targetBank: Boolean(pointedElement?.closest('[data-q30-letter-bank]')),
        })
      })
    }
    const onPointerCancel = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== active.pointerId) return
      removeListeners()
      cancelPendingDragFrame()
      setDragPreview(null)
    }
    const onPointerUp = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== active.pointerId) return
      removeListeners()
      cancelPendingDragFrame()
      const moved = Math.hypot(pointerEvent.clientX - active.startX, pointerEvent.clientY - active.startY) >= 8
      if (!moved) {
        setDragPreview(null)
        if (active.sourceSlotId) {
          if (selectedLetter && selectedLetter !== active.letter) placeLetter(selectedLetter, active.sourceSlotId)
          else returnLetter(active.sourceSlotId)
        } else setSelectedLetter(active.letter)
        return
      }

      const target = document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)
      const targetSlot = target?.closest<HTMLElement>('[data-q30-slot-id]')?.dataset.q30SlotId
      const droppedOnSlot = Boolean(targetSlot && targetSlot !== active.sourceSlotId)
      const droppedBackToBank = Boolean(active.sourceSlotId && target?.closest('[data-q30-letter-bank]'))
      if (droppedOnSlot && targetSlot) {
        setDragPreview(null)
        placeLetter(active.letter, targetSlot, active.sourceSlotId)
      } else if (droppedBackToBank && active.sourceSlotId) {
        setDragPreview(null)
        returnLetter(active.sourceSlotId)
      } else {
        setDragPreview({
          letter: active.letter,
          x: active.startX,
          y: active.startY,
          sourceSlotId: active.sourceSlotId,
          targetBank: false,
          returning: true,
        })
        dragReturnTimerRef.current = window.setTimeout(() => {
          setDragPreview(null)
          dragReturnTimerRef.current = null
        }, 190)
      }

      suppressClickRef.current = true
      window.setTimeout(() => { suppressClickRef.current = false }, 0)
    }
    dragCleanupRef.current = removeListeners
    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
  }

  function ignoreClickAfterDrag() {
    if (!suppressClickRef.current) return false
    suppressClickRef.current = false
    return true
  }

  return <QuestionFrame {...props}>
    <div className={styles.question30} data-question-type="drag-fill" data-sub-type="fruit-color-letter">
      <div className={styles.question30FruitScene} aria-label="Ba loại quả có màu và chữ cái khác nhau">
        {items.map(item => {
          return <div key={item.id} className={styles.question30FruitToken}>
            <div className={styles.question30FruitTile}>
              <FruitTintedSprite
                image={QUESTION_30_FRUIT_NONE_COLOR_MANIFEST.image}
                manifest={QUESTION_30_FRUIT_NONE_COLOR_MANIFEST}
                imageId={item.fruit.imageId}
                color={item.color.hex}
                label={item.fruit.label}
                size={104}
              />
              <span className={styles.question30FruitLetter}>{item.letter}</span>
            </div>
          </div>
        })}
      </div>

      <div className={styles.question30Rows}>
        {items.map(item => {
          const audioId = `${question.id}:${item.id}:sentence`
          const placedLetter = placements[item.id]
          return <div key={item.id} className={styles.question30Row}>
            <div className={styles.question30Sentence}>
              <span>{item.fruit.label} màu {item.color.label} có chữ</span>
              <button
                type="button"
                data-q30-slot-id={item.id}
                disabled={disabled}
                aria-label={placedLetter ? `Chữ ${placedLetter} trong ô ${item.fruit.label} màu ${item.color.label}; chạm để đổi hoặc trả chữ về kho` : `Chỗ trống cho ${item.fruit.label} màu ${item.color.label}`}
                className={`${styles.question30DropSlot} ${placedLetter ? styles.question30DropSlotFilled : ''} ${selectedLetter ? styles.question30DropSlotReady : ''} ${dragPreview?.targetSlotId === item.id ? styles.question30DropSlotDragOver : ''} ${dragPreview?.sourceSlotId === item.id ? styles.question30DropSlotDraggingSource : ''} ${dropFeedback?.targetSlotId === item.id ? styles.question30DropSlotDropped : ''} ${dropFeedback?.sourceSlotId === item.id ? styles.question30DropSlotReturned : ''}`}
                onPointerDown={event => { if (placedLetter) beginPointerDrag(event, placedLetter, item.id) }}
                onClick={() => {
                  if (ignoreClickAfterDrag() || disabled) return
                  if (selectedLetter) placeLetter(selectedLetter, item.id)
                  else if (placedLetter) returnLetter(item.id)
                }}
              >{placedLetter ?? ''}</button>
              <span>.</span>
            </div>
            <div className={styles.question30VoiceRow}>
              <ExamAudioButton
                compact
                active={playingId === audioId}
                label={`${item.voiceAvailable ? 'Nghe' : 'Chưa đủ file voice; không thể nghe'} câu hỏi về ${item.fruit.label} màu ${item.color.label}`}
                disabled={disabled || !item.voiceAvailable}
                onClick={() => { if (item.voiceAvailable) onPlayAudio(audioId, item.voiceSequence) }}
              />
            </div>
          </div>
        })}
      </div>

      <div className={`${styles.question30LetterBank} ${dragPreview?.sourceSlotId && dragPreview.targetBank ? styles.question30LetterBankDropReady : ''}`} data-q30-letter-bank aria-label="Kho chữ cái">
        {letterBank.map(letter => {
          const placed = Object.values(placements).includes(letter)
          return placed
            ? <span key={letter} className={styles.question30BankEmptySlot} aria-hidden="true" />
            : <button
              key={letter}
              type="button"
              disabled={disabled}
              aria-label={`Chữ ${letter}`}
              aria-pressed={selectedLetter === letter}
              className={`${styles.question30BankLetter} ${selectedLetter === letter ? styles.question30BankLetterSelected : ''} ${dragPreview?.letter === letter && !dragPreview.sourceSlotId ? styles.question30BankLetterDragging : ''}`}
              onPointerDown={event => beginPointerDrag(event, letter)}
              onClick={() => { if (!ignoreClickAfterDrag() && !disabled) setSelectedLetter(letter) }}
            >{letter}</button>
        })}
      </div>
      {dragPreview && typeof document !== 'undefined' && createPortal(
        <div
          className={`${styles.question30DragGhost} ${dragPreview.returning ? styles.question30DragGhostReturning : ''}`}
          style={{ left: dragPreview.x, top: dragPreview.y }}
          aria-hidden="true"
        >{dragPreview.letter}</div>,
        document.body,
      )}
    </div>
  </QuestionFrame>
}

'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { ExamAnswer, ExamVisual, ImageSoundMatchItemLeft, ImageSoundMatchItemRight, LowerUpperMatchItem, ObjectSoundMatchItemLeft, ObjectSoundMatchItemRight, SameLetterMatchItem } from '../../_exam/types'
import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import QuestionVisual from './QuestionVisual'
import ExamAudioButton from '../ExamAudioButton'
import styles from '../exam.module.css'

type Point = { x: number; y: number }
type MatchLine = { from: string; to: string; start: Point; end: Point }
type ActiveDrag = { pointerId: number; leftId: string; start: Point }
type ActiveLine = { leftId: string; start: Point; end: Point; visible: boolean }
type DragMatchItem = SameLetterMatchItem | LowerUpperMatchItem | ImageSoundMatchItemLeft | ImageSoundMatchItemRight | ObjectSoundMatchItemLeft | ObjectSoundMatchItemRight
type DragMatchLeftItem = SameLetterMatchItem | LowerUpperMatchItem | ImageSoundMatchItemLeft | ObjectSoundMatchItemLeft
type StandardDragMatchItem = SameLetterMatchItem | LowerUpperMatchItem
type AudioMatchLeftItem = ImageSoundMatchItemLeft | ObjectSoundMatchItemLeft
type AudioMatchRightItem = ImageSoundMatchItemRight | ObjectSoundMatchItemRight
type DragMatchData = {
  subType?: string
  leftItems?: DragMatchItem[]
  rightItems?: DragMatchItem[]
}
const EMPTY_CONNECTIONS: Record<string, string> = {}

function itemVisual(item: DragMatchItem): ExamVisual {
  if ('asset' in item) return item.asset.visual
  if ('visual' in item) return item.visual
  throw new Error('A right audio item cannot be dragged as an image')
}

function itemLetter(item: DragMatchItem): string {
  if ('asset' in item) return item.letter
  if ('displayLetter' in item || 'letter' in item) return 'displayLetter' in item ? item.displayLetter : item.letter
  return ''
}

function itemLabel(item: DragMatchItem): string {
  if ('asset' in item) return item.asset.label
  if ('backgroundLabel' in item) return item.backgroundLabel
  return 'Khủng long'
}

function audioPath(item: AudioMatchRightItem): string {
  return 'audioPath' in item ? item.audioPath : item.voice
}

function readConnections(answer: ExamAnswer | undefined): Record<string, string> {
  return answer !== undefined && !Array.isArray(answer) && typeof answer === 'object'
    ? answer as Record<string, string>
    : EMPTY_CONNECTIONS
}

function localPoint(wrapper: HTMLElement, x: number, y: number): Point {
  const bounds = wrapper.getBoundingClientRect()
  return { x: x - bounds.left, y: y - bounds.top }
}

function connectorCenter(node: HTMLElement, wrapper: HTMLElement): Point {
  const bounds = node.getBoundingClientRect()
  return localPoint(wrapper, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
}

function connectionPath(start: Point, end: Point): string {
  const curve = Math.max(32, Math.abs(end.x - start.x) * 0.35)
  return `M ${start.x} ${start.y} C ${start.x + curve} ${start.y}, ${end.x - curve} ${end.y}, ${end.x} ${end.y}`
}

export default function DragMatchQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, onAnswer } = props
  const data = question.data as DragMatchData | undefined
  const leftItems = data?.leftItems ?? []
  const rightItems = data?.rightItems ?? []
  const lowercaseUppercase = data?.subType === 'lowercase-uppercase'
  const imageToAudio = data?.subType === 'image-to-audio'
  const objectImageToAudio = data?.subType === 'object-image-to-audio'
  const audioMatching = imageToAudio || objectImageToAudio
  const connections = readConnections(answer)
  const connectedRightIds = new Set(Object.values(connections))
  const wrapperRef = useRef<HTMLDivElement>(null)
  const rightColumnRef = useRef<HTMLDivElement>(null)
  const leftRefs = useRef(new Map<string, HTMLElement>())
  const rightRefs = useRef(new Map<string, HTMLElement>())
  const activeDragRef = useRef<ActiveDrag | null>(null)
  const [connectedLines, setConnectedLines] = useState<MatchLine[]>([])
  const [activeLine, setActiveLine] = useState<ActiveLine | null>(null)
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 })

  const measureConnectedLines = useCallback(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const bounds = wrapper.getBoundingClientRect()
    const width = Math.round(bounds.width * 100) / 100
    const height = Math.round(bounds.height * 100) / 100
    setBoardSize(current => Math.abs(current.width - width) < 0.01 && Math.abs(current.height - height) < 0.01
      ? current
      : { width, height })
    const nextLines = Object.entries(connections).flatMap(([from, to]) => {
      const left = leftRefs.current.get(from)
      const right = rightRefs.current.get(to)
      return left && right ? [{ from, to, start: connectorCenter(left, wrapper), end: connectorCenter(right, wrapper) }] : []
    })
    setConnectedLines(current => {
      const unchanged = current.length === nextLines.length && current.every((line, index) => {
        const next = nextLines[index]
        return line.from === next.from && line.to === next.to
          && Math.abs(line.start.x - next.start.x) < 0.01 && Math.abs(line.start.y - next.start.y) < 0.01
          && Math.abs(line.end.x - next.end.x) < 0.01 && Math.abs(line.end.y - next.end.y) < 0.01
      })
      return unchanged ? current : nextLines
    })
  }, [connections])

  useLayoutEffect(() => { measureConnectedLines() }, [measureConnectedLines])
  useEffect(() => {
    window.addEventListener('resize', measureConnectedLines)
    window.addEventListener('scroll', measureConnectedLines, true)
    const observer = typeof ResizeObserver === 'undefined' || !wrapperRef.current
      ? null
      : new ResizeObserver(measureConnectedLines)
    if (wrapperRef.current) observer?.observe(wrapperRef.current)
    return () => {
      window.removeEventListener('resize', measureConnectedLines)
      window.removeEventListener('scroll', measureConnectedLines, true)
      observer?.disconnect()
    }
  }, [measureConnectedLines])

  const startDrag = (event: ReactPointerEvent<HTMLElement>, item: DragMatchLeftItem) => {
    if (disabled || connections[item.id] || !wrapperRef.current) return
    event.preventDefault()
    const connector = leftRefs.current.get(item.id)
    if (!connector) return
    const start = connectorCenter(connector, wrapperRef.current)
    activeDragRef.current = { pointerId: event.pointerId, leftId: item.id, start }
    setActiveLine({ leftId: item.id, start, end: start, visible: false })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = activeDragRef.current
    const wrapper = wrapperRef.current
    if (!active || active.pointerId !== event.pointerId || !wrapper) return
    const rightColumn = rightColumnRef.current?.getBoundingClientRect()
    const visible = Boolean(rightColumn
      && event.clientX >= rightColumn.left
      && event.clientX <= rightColumn.right
      && event.clientY >= rightColumn.top
      && event.clientY <= rightColumn.bottom)
    setActiveLine({
      leftId: active.leftId,
      start: active.start,
      end: localPoint(wrapper, event.clientX, event.clientY),
      visible,
    })
  }

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = activeDragRef.current
    const wrapper = wrapperRef.current
    if (!active || active.pointerId !== event.pointerId || !wrapper) return
    activeDragRef.current = null
    setActiveLine(null)

    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-drag-match-right]')
    const rightId = target?.dataset.dragMatchRight
    const leftItem = leftItems.find(item => item.id === active.leftId)
    const rightItem = rightItems.find(item => item.id === rightId)
    if (!rightId || !rightItem || !leftItem || disabled || connections[leftItem.id] || connectedRightIds.has(rightId)) return
    onAnswer(question.id, { ...connections, [leftItem.id]: rightItem.id })
  }

  const cancelDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activeDragRef.current?.pointerId !== event.pointerId) return
    activeDragRef.current = null
    setActiveLine(null)
  }

  const removeConnection = (leftId: string) => {
    if (disabled || !connections[leftId]) return
    const nextConnections = { ...connections }
    delete nextConnections[leftId]
    onAnswer(question.id, nextConnections)
  }

  const renderLine = (line: MatchLine, className: string) => (
    <path key={`${line.from}-${line.to}`} d={connectionPath(line.start, line.end)} className={className} />
  )

  return <QuestionFrame {...props}>
    <div className={styles.dragMatchAnswerBlock}>
      <div
        ref={wrapperRef}
        className={styles.dragMatchBoard}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={cancelDrag}
      >
        <svg
          aria-hidden="true"
          className={styles.dragMatchLines}
          viewBox={boardSize.width && boardSize.height ? `0 0 ${boardSize.width} ${boardSize.height}` : undefined}
          preserveAspectRatio="none"
        >
          {connectedLines.map(line => renderLine(line, styles.dragMatchLine))}
          {activeLine?.visible && <path d={connectionPath(activeLine.start, activeLine.end)} className={`${styles.dragMatchLine} ${styles.dragMatchPreviewLine}`} />}
        </svg>

        {activeLine && (() => {
          const item = leftItems.find(candidate => candidate.id === activeLine.leftId)
          if (!item) return null
          return <div
            aria-hidden="true"
            className={styles.dragMatchGhost}
            style={{ left: activeLine.end.x, top: activeLine.end.y }}
          >
            <div className={styles.dragMatchImageBox}>
              <QuestionVisual visual={itemVisual(item)} maxDimension={132} />
              {!audioMatching && <span className={`${styles.dragMatchLetter} ${lowercaseUppercase ? styles.dragMatchLetterCentered : ''}`}>{itemLetter(item)}</span>}
            </div>
          </div>
        })()}

        <div className={styles.dragMatchLeftColumn}>
          {leftItems.map(item => {
            const connected = Boolean(connections[item.id])
            if (audioMatching) return <ImageSoundMatchCard
              key={item.id}
              item={item as AudioMatchLeftItem}
              side="left"
              number={leftItems.indexOf(item) + 1}
              disabled={disabled || connected}
              connected={connected}
              connectorRef={node => { if (node) leftRefs.current.set(item.id, node); else leftRefs.current.delete(item.id) }}
              onPointerDown={event => startDrag(event, item as AudioMatchLeftItem)}
            />
            return <MatchCard
              key={item.id}
              item={item as StandardDragMatchItem}
              side="left"
              disabled={disabled || connected}
              connected={connected}
              centeredLetter={lowercaseUppercase}
              connectorRef={node => { if (node) leftRefs.current.set(item.id, node); else leftRefs.current.delete(item.id) }}
              onPointerDown={event => startDrag(event, item as StandardDragMatchItem)}
            />
          })}
        </div>

        <div ref={rightColumnRef} className={styles.dragMatchRightColumn}>
          {rightItems.map(item => {
            const connected = connectedRightIds.has(item.id)
            const connectedLeftId = Object.entries(connections).find(([, rightId]) => rightId === item.id)?.[0]
            if (audioMatching) return <ImageSoundMatchCard
              key={item.id}
              item={item as AudioMatchRightItem}
              side="right"
              number={rightItems.indexOf(item) + 1}
              objectAudio={objectImageToAudio}
              disabled={disabled}
              connected={connected}
              playing={props.playingId === `${question.id}:audio:${item.id}`}
              connectorRef={node => { if (node) rightRefs.current.set(item.id, node); else rightRefs.current.delete(item.id) }}
              onPlayAudio={() => props.onPlayAudio(`${question.id}:audio:${item.id}`, audioPath(item as AudioMatchRightItem))}
              onRemove={connectedLeftId ? () => removeConnection(connectedLeftId) : undefined}
            />
            return <MatchCard
              key={item.id}
              item={item as StandardDragMatchItem}
              side="right"
              disabled={disabled}
              connected={connected}
              centeredLetter={lowercaseUppercase}
              connectorRef={node => { if (node) rightRefs.current.set(item.id, node); else rightRefs.current.delete(item.id) }}
              onRemove={connectedLeftId ? () => removeConnection(connectedLeftId) : undefined}
            />
          })}
        </div>
      </div>
      <p className={styles.dragMatchInstruction}>{audioMatching
        ? objectImageToAudio
          ? 'Nghe tên đồ vật bằng nút loa, rồi kéo hình đồ vật sang tên gọi phù hợp.'
          : 'Nghe âm thanh bằng nút loa, rồi kéo hình sang âm thanh phù hợp.'
        : lowercaseUppercase
          ? 'Kéo thẻ chữ thường bên trái sang thẻ chữ hoa tương ứng bên phải.'
          : 'Kéo thẻ bên trái sang thẻ bên phải có chữ cái giống nhau.'}</p>
    </div>
  </QuestionFrame>
}

function ImageSoundMatchCard({
  item,
  side,
  number,
  objectAudio = false,
  disabled,
  connected,
  playing = false,
  connectorRef,
  onPointerDown,
  onPlayAudio,
  onRemove,
}: {
  item: AudioMatchLeftItem | AudioMatchRightItem
  side: 'left' | 'right'
  number: number
  objectAudio?: boolean
  disabled: boolean
  connected: boolean
  playing?: boolean
  connectorRef(node: HTMLElement | null): void
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPlayAudio?: () => void
  onRemove?: () => void
}) {
  const isLeft = side === 'left'
  const leftItem = isLeft ? item as AudioMatchLeftItem : undefined
  return <div
    className={[
      styles.dragMatchCard,
      styles.dragMatchAudioCard,
      isLeft && !disabled ? styles.dragMatchDraggable : '',
    ].filter(Boolean).join(' ')}
    data-drag-match-right={!isLeft ? item.id : undefined}
    onPointerDown={isLeft ? onPointerDown : undefined}
  >
    {!isLeft && <span
      ref={connectorRef}
      aria-hidden="true"
      className={`${styles.dragMatchConnector} ${styles.dragMatchConnectorRight} ${connected ? styles.dragMatchConnectorConnected : ''}`}
    />}
    <div className={`${styles.dragMatchImageBox} ${styles.dragMatchAudioImageBox}`}>
      {isLeft && leftItem
        ? <QuestionVisual visual={leftItem.visual} maxDimension={140} />
        : <ExamAudioButton
          active={playing}
          compact
          disabled={disabled}
          label={objectAudio ? `Nghe đáp án ${number}` : `Phát âm thanh ${number}`}
          onClick={() => onPlayAudio?.()}
        />}
    </div>
    {isLeft && <span
      ref={connectorRef}
      aria-hidden="true"
      className={`${styles.dragMatchConnector} ${styles.dragMatchConnectorLeft} ${connected ? styles.dragMatchConnectorConnected : ''}`}
    />}
    {!isLeft && connected && <button
      type="button"
      disabled={disabled}
      aria-label={`Bỏ nối âm thanh ${number}`}
      onClick={event => { event.stopPropagation(); onRemove?.() }}
      className={`${styles.dragMatchRemoveButton} ${styles.dragMatchConnectorRight}`}
    >×</button>}
  </div>
}

function MatchCard({
  item,
  side,
  disabled,
  connected,
  centeredLetter,
  connectorRef,
  onPointerDown,
  onRemove,
}: {
  item: DragMatchItem
  side: 'left' | 'right'
  disabled: boolean
  connected: boolean
  centeredLetter: boolean
  connectorRef(node: HTMLElement | null): void
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onRemove?: () => void
}) {
  const letter = itemLetter(item)
  const label = itemLabel(item)
  return <div
    className={`${styles.dragMatchCard} ${side === 'left' && !disabled ? styles.dragMatchDraggable : ''}`}
    data-drag-match-right={side === 'right' ? item.id : undefined}
    onPointerDown={side === 'left' ? onPointerDown : undefined}
  >
    {side === 'right' && <span
      ref={connectorRef}
      aria-hidden="true"
      className={`${styles.dragMatchConnector} ${styles.dragMatchConnectorRight}`}
    />}
    <div className={styles.dragMatchImageBox} role="img" aria-label={`${label}, chữ ${letter}`}>
      <QuestionVisual visual={itemVisual(item)} maxDimension={132} />
      <span className={`${styles.dragMatchLetter} ${centeredLetter ? styles.dragMatchLetterCentered : ''}`}>{letter}</span>
    </div>
    {side === 'left' && <button
      ref={connectorRef}
      type="button"
      disabled={disabled}
      aria-label={`Điểm nối chữ ${letter} trên ${label}`}
      aria-pressed={connected}
      className={`${styles.dragMatchConnector} ${styles.dragMatchConnectorLeft} ${connected ? styles.dragMatchConnectorConnected : ''}`}
      tabIndex={-1}
    />}
    {side === 'right' && connected && <button
      type="button"
      disabled={disabled}
      aria-label={`Bỏ nối với chữ ${letter} trên ${label}`}
      onClick={event => { event.stopPropagation(); onRemove?.() }}
      className={`${styles.dragMatchRemoveButton} ${styles.dragMatchConnectorRight}`}
    >×</button>}
  </div>
}

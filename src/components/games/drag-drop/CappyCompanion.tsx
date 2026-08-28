'use client'

import { RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Image from 'next/image'
import styles from './CappyCompanion.module.css'

export type CappyState = 'SEARCHING' | 'IDLE' | 'FOLLOW' | 'CORRECT' | 'WRONG' | 'CELEBRATE'
export type CappyReaction = { id: number; type: 'correct' | 'wrong' } | null
type Point = { x: number; y: number }

type Props = {
  active: boolean; round: number; dragPosition: Point | null; reaction: CappyReaction
  celebrating: boolean; finalRound: boolean; gameRef: RefObject<HTMLDivElement>; trayRef: RefObject<HTMLDivElement>
}

const SEARCH_STEP_MS = 260

export default function CappyCompanion({ active, round, dragPosition, reaction, celebrating, finalRound, gameRef, trayRef }: Props) {
  const [state, setState] = useState<CappyState>('SEARCHING')
  const [position, setPosition] = useState<Point>({ x: 50, y: 72 })
  const timers = useRef<number[]>([])
  const wasDragging = useRef(false)
  const lastReactionId = useRef<number | null>(null)
  const clearTimers = () => { timers.current.forEach(window.clearTimeout); timers.current = [] }
  const tilePoint = (tile: HTMLElement): Point | null => {
    const game = gameRef.current?.getBoundingClientRect(); const rect = tile.getBoundingClientRect()
    return game ? { x: ((rect.left + rect.width / 2 - game.left) / game.width) * 100, y: ((rect.top - game.top) / game.height) * 100 } : null
  }
  const setCappyIdle = () => {
    const game = gameRef.current?.getBoundingClientRect(); const tray = trayRef.current?.getBoundingClientRect()
    if (game && tray) setPosition({ x: 10, y: ((tray.top - game.top) / game.height) * 100 })
    setState('IDLE')
  }
  const startCappySearch = () => {
    clearTimers(); setState('SEARCHING')
    if (round > 0) {
      setCappyIdle()
      setState('SEARCHING')
      timers.current.push(window.setTimeout(setCappyIdle, finalRound ? 620 : 420))
      return
    }
    const tiles = Array.from(trayRef.current?.querySelectorAll<HTMLElement>('[data-answer-tile]') ?? [])
    tiles.forEach((_, index) => timers.current.push(window.setTimeout(() => {
      const tile = trayRef.current?.querySelectorAll<HTMLElement>('[data-answer-tile]')[index]
      const next = tile ? tilePoint(tile) : null
      if (next) setPosition(next)
    }, index * SEARCH_STEP_MS)))
    timers.current.push(window.setTimeout(setCappyIdle, tiles.length * SEARCH_STEP_MS + 120))
  }

  useLayoutEffect(() => {
    if (active) startCappySearch(); else clearTimers()
    return clearTimers
    // `round` intentionally resets all companion animations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, round])

  useEffect(() => {
    if (!active) return
    if (!dragPosition) {
      wasDragging.current = false
      return
    }
    if (wasDragging.current) return
    wasDragging.current = true
    clearTimers()
    setCappyIdle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, dragPosition, gameRef])

  useEffect(() => {
    if (!active || !reaction || lastReactionId.current === reaction.id) return
    lastReactionId.current = reaction.id
    clearTimers(); setState(reaction.type === 'correct' ? 'CORRECT' : 'WRONG')
    timers.current.push(window.setTimeout(setCappyIdle, reaction.type === 'correct' ? 650 : 420))
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reaction?.id])

  useEffect(() => {
    if (active && celebrating) { clearTimers(); setState('CELEBRATE'); setPosition({ x: 50, y: 62 }) }
  }, [active, celebrating])

  if (!active) return null
  return <div className={`${styles.cappy} ${styles[state.toLowerCase()]} ${state === 'SEARCHING' && round === 0 ? styles.fullSearch : ''} ${state === 'SEARCHING' && round > 0 ? styles.inPlace : ''} ${state === 'SEARCHING' && finalRound ? styles.finalHop : ''}`} style={{ left: `${position.x}%`, top: `${position.y}%` }} data-cappy-state={state} aria-hidden="true">
    <span className={styles.frame}>
      <Image src="/games/drag-drop/images/cappy-companion-sprites.png" alt="" width={1536} height={1024} draggable={false} unoptimized />
    </span>
  </div>
}

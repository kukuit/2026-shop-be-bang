'use client'

import Image from 'next/image'
import { RefObject, useEffect, useRef, useState } from 'react'
import type { NumberValue } from './types'
import { NUMBER_COLORS } from './levels'
import styles from './WolfCompanion.module.css'

type WolfState = 'HIDDEN' | 'PEEK' | 'RUN' | 'GRAB' | 'CARRY' | 'LAUGH'
type Point = { x: number; y: number }

type Props = {
  active: boolean
  round: number
  correctValues: NumberValue[]
  dragActive: boolean
  gameRef: RefObject<HTMLDivElement>
  trayRef: RefObject<HTMLDivElement>
  onSteal: (value: NumberValue) => void
  onLaugh: () => void
}

const ALL_VALUES: NumberValue[] = [0, 1, 2, 3, 4, 5]

export default function WolfCompanion({ active, round, correctValues, dragActive, gameRef, trayRef, onSteal, onLaugh }: Props) {
  const [state, setState] = useState<WolfState>('HIDDEN')
  const [position, setPosition] = useState<Point>({ x: 106, y: 73 })
  const [stolenValue, setStolenValue] = useState<NumberValue | null>(null)
  const timers = useRef<number[]>([])
  const dragActiveRef = useRef(dragActive)
  dragActiveRef.current = dragActive

  useEffect(() => {
    const clearTimers = () => { timers.current.forEach(window.clearTimeout); timers.current = [] }
    clearTimers(); setState('HIDDEN'); setStolenValue(null)
    if (!active) return clearTimers

    const wrongValues = ALL_VALUES.filter((value) => !correctValues.includes(value))
    if (!wrongValues.length) return clearTimers

    const schedule = (delay: number, action: () => void) => timers.current.push(window.setTimeout(action, delay))
    const begin = () => {
      if (dragActiveRef.current) { schedule(500, begin); return }
      const value = wrongValues[Math.floor(Math.random() * wrongValues.length)]
      const game = gameRef.current?.getBoundingClientRect()
      const tile = trayRef.current?.querySelector<HTMLElement>(`[data-answer-value="${value}"]`)?.getBoundingClientRect()
      if (!game || !tile) return
      const target = {
        x: ((tile.left + tile.width * 1.05 - game.left) / game.width) * 100,
        y: ((tile.top + tile.height / 2 - game.top) / game.height) * 100,
      }

      setPosition({ x: 96, y: target.y }); setState('PEEK')
      schedule(1300, () => { setState('RUN'); setPosition(target) })
      schedule(2050, () => { setState('GRAB'); setStolenValue(value) })
      schedule(2360, () => onSteal(value))
      schedule(2400, () => { setState('CARRY'); setPosition({ x: 88, y: target.y }) })
      schedule(3300, () => { setState('LAUGH'); onLaugh() })
      schedule(4400, () => { setPosition({ x: 108, y: target.y }); setState('HIDDEN'); setStolenValue(null) })
    }
    schedule(4000, begin)
    return clearTimers
  }, [active, correctValues, gameRef, onLaugh, onSteal, round, trayRef])

  if (state === 'HIDDEN') return null
  return <div className={`${styles.wolf} ${styles[state.toLowerCase()]}`} style={{ left: `${position.x}%`, top: `${position.y}%` }} data-wolf-state={state} aria-hidden="true">
    <span className={styles.frame}>
      <Image src="/games/drag-drop/images/wolf-steal-v2-transparent.png" alt="" width={1536} height={1024} draggable={false} unoptimized />
    </span>
    {stolenValue !== null && (state === 'CARRY' || state === 'LAUGH') && <span className={styles.stolenTile} style={{ backgroundColor: NUMBER_COLORS[stolenValue] }}>{stolenValue}</span>}
  </div>
}

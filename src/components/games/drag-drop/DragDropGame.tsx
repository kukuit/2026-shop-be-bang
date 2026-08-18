'use client'

import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw, Trophy } from 'lucide-react'
import { GameLoadingScreen, GameShell, useBackgroundMusic } from '../general'
import { createRandomizedLevels, DRAG_DROP_LEVELS, NUMBER_COLORS } from './levels'
import type { CountGroup, NumberValue, SequenceCell } from './types'
import styles from './DragDropGame.module.css'

type DragState = { value: NumberValue; x: number; y: number; pointerId: number } | null
type FloatingScore = { id: number; x: number; y: number; value: '+10' | '-2' | '0'; correct: boolean } | null

const shuffleNumbers = () => {
  const values: NumberValue[] = [0, 1, 2, 3, 4, 5]
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[values[index], values[swapIndex]] = [values[swapIndex], values[index]]
  }
  return values
}

export default function DragDropGame() {
  const [currentLevel, setCurrentLevel] = useState(0)
  const [levels, setLevels] = useState(DRAG_DROP_LEVELS)
  const [score, setScore] = useState(0)
  const [completedTargets, setCompletedTargets] = useState<Record<string, NumberValue>>({})
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [gameCompleted, setGameCompleted] = useState(false)
  const [gamePaused, setGamePaused] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [drag, setDrag] = useState<DragState>(null)
  const [wrongTarget, setWrongTarget] = useState<string | null>(null)
  const [correctTarget, setCorrectTarget] = useState<string | null>(null)
  const [floatingScore, setFloatingScore] = useState<FloatingScore>(null)
  const level = levels[currentLevel]
  const numberTray = useMemo(() => shuffleNumbers(), [level.id, levels])
  const density = level.groups && level.groups.length >= 4 ? 'dense' : level.groups && level.groups.length === 1 ? 'simple' : 'standard'
  useBackgroundMusic(soundEnabled)

  useEffect(() => {
    setLevels((current) => createRandomizedLevels(current))
    const timer = window.setTimeout(() => setIsReady(true), 700)
    return () => window.clearTimeout(timer)
  }, [])

  const restart = useCallback(() => {
    setLevels((current) => createRandomizedLevels(current))
    setCurrentLevel(0); setScore(0); setCompletedTargets({}); setIsTransitioning(false)
    setGameCompleted(false); setDrag(null)
  }, [])

  const finishDrop = useCallback((clientX: number, clientY: number, value: NumberValue) => {
    const target = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('[data-target-id]')
    const targetId = target?.dataset.targetId
    if (!targetId || completedTargets[targetId] !== undefined || isTransitioning) return setDrag(null)
    if (level.answers[targetId] === value) {
      setCompletedTargets((current) => ({ ...current, [targetId]: value }))
      setCorrectTarget(targetId)
      setFloatingScore({ id: Date.now(), x: clientX, y: clientY, value: '+10', correct: true })
      window.setTimeout(() => setCorrectTarget(null), 500)
    } else {
      setScore((current) => Math.max(0, current - 2))
      setWrongTarget(targetId)
      setFloatingScore({ id: Date.now(), x: clientX, y: clientY, value: score > 0 ? '-2' : '0', correct: false })
      window.setTimeout(() => setWrongTarget(null), 450)
    }
    window.setTimeout(() => setFloatingScore(null), 700)
    setDrag(null)
  }, [completedTargets, isTransitioning, level.answers, score])

  useEffect(() => {
    const targetCount = Object.keys(level.answers).length
    if (gamePaused || isTransitioning || Object.keys(completedTargets).length !== targetCount) return
    setIsTransitioning(true)
    setScore((current) => current + 10)
  }, [completedTargets, gamePaused, isTransitioning, level.answers])

  useEffect(() => {
    if (!isTransitioning || gamePaused) return
    const timer = window.setTimeout(() => {
      if (currentLevel === levels.length - 1) setGameCompleted(true)
      else { setCurrentLevel((current) => current + 1); setCompletedTargets({}); setIsTransitioning(false) }
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [currentLevel, gamePaused, isTransitioning, levels.length])

  const beginDrag = (event: ReactPointerEvent, value: NumberValue) => {
    if (isTransitioning || gameCompleted) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ value, x: event.clientX, y: event.clientY, pointerId: event.pointerId })
  }

  const moveDrag = (event: ReactPointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return
    event.preventDefault()
    setDrag((current) => current ? { ...current, x: event.clientX, y: event.clientY } : null)
  }

  const endDrag = (event: ReactPointerEvent, value: NumberValue) => {
    if (!drag || event.pointerId !== drag.pointerId) return
    finishDrop(event.clientX, event.clientY, value)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <GameShell score={score} currentRound={level.id} muted={!soundEnabled} onMutedChange={(muted) => setSoundEnabled(!muted)} onPauseChange={(paused) => { setGamePaused(paused); if (paused) setDrag(null) }} onRestart={restart}>
      {!isReady && <GameLoadingScreen />}
      <div className="relative h-full touch-none overflow-hidden bg-sky-300 bg-cover bg-center" style={{ backgroundImage: "url('/games/drag-drop/images/farm-background.png')" }}>
        <div className={styles.gameplayPanel} data-density={density}>
          <div className={styles.questionArea}>
            {level.groups && <CountGroups groups={level.groups} completed={completedTargets} wrongTarget={wrongTarget} correctTarget={correctTarget} />}
            {level.sequence && <SequenceRow cells={level.sequence} completed={completedTargets} wrongTarget={wrongTarget} correctTarget={correctTarget} />}
          </div>
          <div className={styles.answerTray}>
            {numberTray.map((value) => <button key={value} type="button" onPointerDown={(event) => beginDrag(event, value)} onPointerMove={moveDrag} onPointerUp={(event) => endDrag(event, value)} onPointerCancel={() => setDrag(null)} className={styles.answerButton} style={{ backgroundColor: NUMBER_COLORS[value] }} aria-label={`Kéo số ${value}`}>{value}</button>)}
          </div>
        </div>
        {drag && <div className="pointer-events-none fixed z-[100] grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border-[3px] border-white text-3xl font-black text-white shadow-2xl" style={{ left: drag.x, top: drag.y, backgroundColor: NUMBER_COLORS[drag.value], transform: 'translate(-50%, -50%) scale(1.08)' }}>{drag.value}</div>}
        {floatingScore && <div key={floatingScore.id} className={`pointer-events-none fixed z-[110] text-xl font-black ${styles.floatingScore} ${floatingScore.correct ? 'text-emerald-600' : 'text-red-500'}`} style={{ left: floatingScore.x, top: floatingScore.y, textShadow: '0 2px 0 white, 0 -2px 0 white, 2px 0 0 white, -2px 0 0 white' }}>{floatingScore.value}</div>}
        {isTransitioning && !gameCompleted && <div className="pointer-events-none absolute inset-0 z-30" aria-hidden="true"><div className={styles.fireworks}>{Array.from({ length: 12 }, (_, index) => <span key={index} className={styles.fireworkParticle} />)}</div></div>}
        {gameCompleted && <Completion score={score} onRestart={restart} />}
      </div>
    </GameShell>
  )
}

function DropTarget({ id, completed, wrong, correct, large = false }: { id: string; completed?: NumberValue; wrong: boolean; correct: boolean; large?: boolean }) {
  return <div data-target-id={id} className={`${styles.dropTarget} ${large ? styles.dropTargetLarge : ''} ${completed !== undefined ? styles.dropTargetCompleted : styles.dropTargetEmpty} ${wrong ? styles.shake : ''} ${correct ? 'scale-110' : ''}`}>
    <span className={styles.targetValue}>{completed ?? '?'}</span>
  </div>
}

function CountGroups({ groups, completed, wrongTarget, correctTarget }: { groups: CountGroup[]; completed: Record<string, NumberValue>; wrongTarget: string | null; correctTarget: string | null }) {
  return <div className={styles.countGroups} data-count={groups.length}>
    {groups.map((group, index) => <div key={group.id} data-target-id={group.id} className={`${styles.countGroup} ${wrongTarget === group.id ? styles.shake : ''} ${groups.length === 3 && index === 2 ? styles.lastOddGroup : ''}`}>
      <div className={styles.animals} data-items={group.count} aria-label={`${group.count} ${group.label}`}>
        {group.count > 0 && Array.from({ length: group.count }, (_, itemIndex) => <span key={itemIndex}>{group.icon}</span>)}
      </div><DropTarget large id={group.id} completed={completed[group.id]} wrong={false} correct={correctTarget === group.id} />
    </div>)}
  </div>
}

function SequenceRow({ cells, completed, wrongTarget, correctTarget }: { cells: SequenceCell[]; completed: Record<string, NumberValue>; wrongTarget: string | null; correctTarget: string | null }) {
  return <div className={styles.sequenceRow}>
    {cells.map((cell, index) => <div key={cell.id} data-target-id={cell.target ? cell.id : undefined} className="flex min-w-0 items-center gap-1">
      {cell.target ? <DropTarget id={cell.id} completed={completed[cell.id]} wrong={wrongTarget === cell.id} correct={correctTarget === cell.id} /> : <div className="grid h-11 w-9 place-items-center rounded-xl bg-sky-500 text-xl font-black text-white shadow">{cell.value}</div>}
      {index < cells.length - 1 && <span className="text-sm font-black text-sky-500">›</span>}
    </div>)}
  </div>
}

function Completion({ score, onRestart }: { score: number; onRestart: () => void }) {
  return <div className="absolute inset-0 z-50 grid place-items-center bg-sky-950/65 p-6"><div className="w-full rounded-[2rem] border-4 border-amber-300 bg-white p-7 text-center shadow-2xl">
    <Trophy className="mx-auto animate-bounce text-amber-400" size={64} /><p className="mt-3 text-sm font-black text-pink-500">{score === 100 ? 'HOÀN HẢO!' : 'TUYỆT LẮM!'}</p>
    <h2 className="text-3xl font-black text-sky-700">HOÀN THÀNH</h2><p className="mt-4 text-4xl font-black text-amber-500">{score} / 100</p>
    <button type="button" onClick={onRestart} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 font-black text-white shadow-lg"><RotateCcw size={20} /> Chơi lại</button>
  </div></div>
}

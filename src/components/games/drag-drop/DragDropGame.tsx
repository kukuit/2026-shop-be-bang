'use client'

import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GameCompletion, GameLoadingScreen, GameShell, preloadAssets, useBackgroundMusic } from '../general'
import { GAME_BACKGROUND_MUSIC } from '../general/audio'
import { NUMBER_COLORS } from './levels'
import type { CountGroup, DragAnswerValue, DragDropGameConfig, NumberValue, SequenceCell } from './types'
import styles from './DragDropGame.module.css'
import { createGameTracker, type GameTracker } from '../general/tracking'
import { useGameVoices } from '../general/useGameVoices'
import GameImageValue, { GameImagesProvider } from '../general/GameImageValue'
import { Volume2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { QuestionVoicePlayer } from '../general/QuestionVoicePlayer'
import CappyCompanion, { type CappyReaction } from './CappyCompanion'
import WolfCompanion from './WolfCompanion'

type DragState = { value: DragAnswerValue; x: number; y: number; pointerId: number } | null
type FloatingScore = { id: number; x: number; y: number; value: '+10' | '-2' | '0'; correct: boolean } | null

const shuffleNumbers = (domain: readonly DragAnswerValue[]) => {
  const values = [...domain]
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[values[index], values[swapIndex]] = [values[swapIndex], values[index]]
  }
  return values
}

const createWolfRounds = () => {
  // Round 9 needs all six values, so there is no wrong tile for the wolf to steal.
  const eligibleRounds = [2, 3, 4, 5, 6, 7, 9]
  for (let index = eligibleRounds.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[eligibleRounds[index], eligibleRounds[swapIndex]] = [eligibleRounds[swapIndex], eligibleRounds[index]]
  }
  return new Set(eligibleRounds.slice(0, 4))
}
const TRUE_VOICES = ['voice-true-1', 'voice-true-2', 'voice-true-3', 'voice-true-4', 'voice-true-5']
const FALSE_VOICES = ['voice-false-1', 'voice-false-2', 'voice-false-3', 'voice-false-4', 'voice-false-5']
const SHARED_DRAG_DROP_VOICES = [
  { key: 'drag-ting', src: '/games/drag-drop/voices/ting.mp3', volume: 0.8 },
  { key: 'drag-buzzer', src: '/games/drag-drop/voices/buzzer.mp3', volume: 0.25 },
  ...TRUE_VOICES.map((key, index) => ({ key, src: `/games/general/voices/true-${index + 1}.mp3` })),
  ...FALSE_VOICES.map((key, index) => ({ key, src: `/games/general/voices/false-${index + 1}.mp3` })),
  { key: 'voice-win', src: '/games/general/voices/win.mp3', volume: 0.9 },
  { key: 'voice-wolf-haha', src: '/games/general/voices/wolf-haha.mp3', volume: 0.9 },
] as const

export default function DragDropGame({ config }: { config: DragDropGameConfig }) {
  const questionVoiceRef = useRef<QuestionVoicePlayer | null>(null)
  const trackerRef = useRef<GameTracker | undefined>(undefined)
  const targetStartedAtRef = useRef<Record<string, number>>({})
  const targetAttemptsRef = useRef<Record<string, number>>({})
  const [currentLevel, setCurrentLevel] = useState(0)
  const [levels, setLevels] = useState(config.initialLevels)
  const [score, setScore] = useState(0)
  const [completedTargets, setCompletedTargets] = useState<Record<string, DragAnswerValue>>({})
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [gameCompleted, setGameCompleted] = useState(false)
  const [trackingTask, setTrackingTask] = useState<Promise<unknown>>()
  const [gamePaused, setGamePaused] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [drag, setDrag] = useState<DragState>(null)
  const [wrongTarget, setWrongTarget] = useState<string | null>(null)
  const [correctTarget, setCorrectTarget] = useState<string | null>(null)
  const [floatingScore, setFloatingScore] = useState<FloatingScore>(null)
  const [numberTray, setNumberTray] = useState<DragAnswerValue[]>(() => [...config.answerDomain])
  const [cappyReaction, setCappyReaction] = useState<CappyReaction>(null)
  const [stolenNumber, setStolenNumber] = useState<DragAnswerValue | null>(null)
  const [wolfRounds, setWolfRounds] = useState<Set<number>>(createWolfRounds)
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const answerTrayRef = useRef<HTMLDivElement>(null)
  const level = levels[currentLevel]
  const density = level.groups && level.groups.length >= 4 ? 'dense' : level.groups && level.groups.length === 1 ? 'simple' : 'standard'
  const startMusic = useBackgroundMusic(soundEnabled, isReady && gameStarted)
  const voiceAssets = useMemo(() => config.introVoice
    ? [{ key: 'drag-intro', src: config.introVoice }, ...SHARED_DRAG_DROP_VOICES]
    : SHARED_DRAG_DROP_VOICES, [config.introVoice])
  const voices = useGameVoices(voiceAssets, soundEnabled)

  useEffect(() => {
    const player = new QuestionVoicePlayer()
    questionVoiceRef.current = player
    return () => { player.stop(); questionVoiceRef.current = null }
  }, [])

  useEffect(() => {
    questionVoiceRef.current?.setBlocked(!soundEnabled || gamePaused)
  }, [soundEnabled, gamePaused])

  useEffect(() => {
    if (gameStarted && !gameCompleted && !isTransitioning) {
      questionVoiceRef.current?.play([level.instructionVoice, level.voice])
    }
    return () => questionVoiceRef.current?.stop()
  }, [gameStarted, gameCompleted, isTransitioning, level])
  const colorFor = useCallback((value: DragAnswerValue) => {
    const index = typeof value === 'number' ? Math.abs(value) : Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return NUMBER_COLORS[index % NUMBER_COLORS.length]
  }, [])
  const wolfCorrectValues = useMemo(() => Array.from(new Set(Object.values(level.answers))), [level.answers])
  const playWolfLaugh = useCallback(() => voices.playEffect('voice-wolf-haha'), [voices])
  const handleWolfSteal = useCallback((value: DragAnswerValue) => setStolenNumber(value), [])

  useEffect(() => {
    let cancelled = false
    const adaptiveLevels = config.loadLevels()
    const assets = preloadAssets({
      images: [
        ...Array.from(new Set(Object.values(config.images ?? {}).map((image) => image.src))),
        '/games/drag-drop/images/farm-background.png',
        '/games/general/images/player-avatar.png',
        '/games/drag-drop/images/cappy-companion-sprites.png',
        '/games/drag-drop/images/wolf-thief-sprites.png',
      ],
      audio: [GAME_BACKGROUND_MUSIC, ...voiceAssets.map((voice) => voice.src)],
    }, (progress) => {
      if (!cancelled) setLoadProgress(progress)
    })
    void Promise.all([adaptiveLevels, assets]).then(([nextLevels]) => {
      if (!cancelled) { setLevels(nextLevels); setIsReady(true) }
    })
    return () => { cancelled = true }
  }, [config, voiceAssets])

  useEffect(() => {
    setNumberTray(shuffleNumbers(config.answerDomain))
    setStolenNumber(null)
    const now = Date.now()
    targetStartedAtRef.current = Object.fromEntries(Object.keys(level.answers).map((targetId) => [targetId, now]))
    targetAttemptsRef.current = {}
  }, [config.answerDomain, currentLevel, level.answers])

  const startTracking = useCallback(() => {
    trackerRef.current = createGameTracker({ lessonId: config.lessonId, gameId: config.gameId })
    const now = Date.now()
    targetStartedAtRef.current = Object.fromEntries(Object.keys(level.answers).map((targetId) => [targetId, now]))
    targetAttemptsRef.current = {}
  }, [config.gameId, config.lessonId, level.answers])

  const restart = useCallback(() => {
    voices.reset()
    if (config.introVoice) window.setTimeout(() => voices.playOnce('intro', 'drag-intro', 'intro'), 500)
    void Promise.resolve(config.loadLevels(levels)).then(setLevels)
    setNumberTray(shuffleNumbers(config.answerDomain))
    setCurrentLevel(0); setScore(0); setCompletedTargets({}); setIsTransitioning(false)
    setGameCompleted(false); setGamePaused(false); setGameStarted(true); setDrag(null); setTrackingTask(undefined)
    setCappyReaction(null)
    setStolenNumber(null)
    setWolfRounds(createWolfRounds())
    startTracking()
  }, [config, levels, startTracking, voices])

  const finishDrop = useCallback((clientX: number, clientY: number, value: DragAnswerValue) => {
    const target = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('[data-target-id]')
    const targetId = target?.dataset.targetId
    if (!targetId || completedTargets[targetId] !== undefined || isTransitioning) return setDrag(null)
    questionVoiceRef.current?.stop()
    const expectedAnswer = level.answers[targetId]
    const correct = expectedAnswer === value
    const attempt = (targetAttemptsRef.current[targetId] ?? 0) + 1
    trackerRef.current?.recordAnswer({
      learningKey: level.learningKeys[targetId], expectedAnswer, selectedAnswer: value, correct,
      skill: level.skills?.[targetId], inputMode: level.inputModes?.[targetId], answerMode: level.answerModes?.[targetId],
      attempt, responseTime: Math.max(0, Date.now() - (targetStartedAtRef.current[targetId] ?? Date.now())),
    })
    targetAttemptsRef.current[targetId] = attempt
    targetStartedAtRef.current[targetId] = Date.now()
    if (correct) {
      setCappyReaction({ id: Date.now(), type: 'correct' })
      voices.playEffect('drag-ting')
      voices.play(TRUE_VOICES[Math.floor(Math.random() * TRUE_VOICES.length)], 'true')
      setCompletedTargets((current) => ({ ...current, [targetId]: value }))
      setCorrectTarget(targetId)
      setFloatingScore({ id: Date.now(), x: clientX, y: clientY, value: '+10', correct: true })
      window.setTimeout(() => setCorrectTarget(null), 500)
    } else {
      setCappyReaction({ id: Date.now(), type: 'wrong' })
      voices.playEffect('drag-buzzer')
      voices.play(FALSE_VOICES[Math.floor(Math.random() * FALSE_VOICES.length)], 'false')
      setScore((current) => Math.max(0, current - 2))
      setWrongTarget(targetId)
      setFloatingScore({ id: Date.now(), x: clientX, y: clientY, value: score > 0 ? '-2' : '0', correct: false })
      window.setTimeout(() => setWrongTarget(null), 450)
    }
    window.setTimeout(() => setFloatingScore(null), 700)
    setDrag(null)
  }, [completedTargets, isTransitioning, level.answerModes, level.answers, level.inputModes, level.learningKeys, level.skills, score, voices])

  useEffect(() => {
    if (gameCompleted) setTrackingTask(() => trackerRef.current?.finishSession(score))
  }, [gameCompleted, score])

  useEffect(() => {
    if (gameCompleted) voices.playOnce('win', 'voice-win', 'win')
  }, [gameCompleted, voices])

  useEffect(() => {
    const targetCount = Object.keys(level.answers).length
    if (!gameStarted || gamePaused || isTransitioning || Object.keys(completedTargets).length !== targetCount) return
    setIsTransitioning(true)
    setScore((current) => current + 10)
  }, [completedTargets, gamePaused, gameStarted, isTransitioning, level.answers])

  useEffect(() => {
    if (!isTransitioning || gamePaused) return
    const timer = window.setTimeout(() => {
      if (currentLevel === levels.length - 1) setGameCompleted(true)
      else { setCurrentLevel((current) => current + 1); setCompletedTargets({}); setIsTransitioning(false) }
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [currentLevel, gamePaused, isTransitioning, levels.length])

  const beginDrag = (event: ReactPointerEvent, value: DragAnswerValue) => {
    if (!gameStarted || isTransitioning || gameCompleted) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ value, x: event.clientX, y: event.clientY, pointerId: event.pointerId })
  }

  const moveDrag = (event: ReactPointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return
    event.preventDefault()
    setDrag((current) => current ? { ...current, x: event.clientX, y: event.clientY } : null)
  }

  const endDrag = (event: ReactPointerEvent, value: DragAnswerValue) => {
    if (!drag || event.pointerId !== drag.pointerId) return
    finishDrop(event.clientX, event.clientY, value)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <GameImagesProvider value={config.images}>
    <GameShell score={score} currentRound={level.id} muted={!soundEnabled} onMutedChange={(muted) => setSoundEnabled(!muted)} onPauseChange={(paused) => { setGamePaused(paused); if (paused) setDrag(null) }} onRestart={restart}>
      <GameLoadingScreen progress={loadProgress} ready={isReady} unlockAudio={startMusic} onStart={() => {
        startTracking(); setGameStarted(true)
        if (config.introVoice) window.setTimeout(() => voices.playOnce('intro', 'drag-intro', 'intro'), 500)
      }} />
      <div ref={gameAreaRef} className="relative h-full touch-none overflow-hidden bg-sky-300 bg-cover bg-center" style={{ backgroundImage: "url('/games/drag-drop/images/farm-background.png')" }}>
        <div className={styles.gameplayPanel} data-density={density}>
          <div className={styles.questionArea}>
            {level.groups && <CountGroups groups={level.groups} completed={completedTargets} wrongTarget={wrongTarget} correctTarget={correctTarget} voiceButton={level.voice ? <button type="button" disabled={!gameStarted || gamePaused || gameCompleted || isTransitioning} onClick={() => questionVoiceRef.current?.play([level.instructionVoice, level.voice])} className="grid h-24 w-24 max-w-full shrink-0 place-items-center rounded-full border-[3px] border-sky-400 bg-sky-100 text-sky-700 active:scale-95 disabled:opacity-50" aria-label="Nghe lại"><Volume2 className="h-16 w-16" aria-hidden="true" /></button> : undefined} />}
            {level.sequence && <SequenceRow cells={level.sequence} completed={completedTargets} wrongTarget={wrongTarget} correctTarget={correctTarget} />}
          </div>
          <div ref={answerTrayRef} className={styles.answerTray} style={config.images ? { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' } : undefined}>
            {numberTray.map((value) => {
              const stolen = stolenNumber === value
              return <button key={value} data-answer-tile data-answer-value={value} type="button" disabled={stolen} onPointerDown={(event) => beginDrag(event, value)} onPointerMove={moveDrag} onPointerUp={(event) => endDrag(event, value)} onPointerCancel={() => setDrag(null)} className={`${styles.answerButton} ${stolen ? styles.answerButtonStolen : ''}`} style={{ backgroundColor: stolen ? undefined : colorFor(value) }} aria-label={stolen ? 'Ô số đã bị Sói lấy' : `Kéo số ${value}`}>{stolen ? '' : <GameImageValue value={value} />}</button>
            })}
          </div>
        </div>
        <CappyCompanion active={gameStarted && !gamePaused} round={currentLevel} dragPosition={drag ? { x: drag.x, y: drag.y } : null} reaction={cappyReaction} celebrating={gameCompleted} finalRound={currentLevel === levels.length - 1} gameRef={gameAreaRef} trayRef={answerTrayRef} />
        <WolfCompanion active={gameStarted && !gamePaused && !isTransitioning && !gameCompleted && wolfRounds.has(currentLevel)} round={currentLevel} correctValues={wolfCorrectValues} dragActive={drag !== null} gameRef={gameAreaRef} trayRef={answerTrayRef} onSteal={handleWolfSteal} onLaugh={playWolfLaugh} answerDomain={config.answerDomain} colorFor={colorFor} />
        {drag && <div className="pointer-events-none fixed z-[100] grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border-[3px] border-white text-3xl font-black text-white shadow-2xl" style={{ left: drag.x, top: drag.y, backgroundColor: colorFor(drag.value), transform: 'translate(-50%, -50%) scale(1.08)' }}><GameImageValue value={drag.value} /></div>}
        {floatingScore && <div key={floatingScore.id} className={`pointer-events-none fixed z-[110] text-xl font-black ${styles.floatingScore} ${floatingScore.correct ? 'text-emerald-600' : 'text-red-500'}`} style={{ left: floatingScore.x, top: floatingScore.y, textShadow: '0 2px 0 white, 0 -2px 0 white, 2px 0 0 white, -2px 0 0 white' }}>{floatingScore.value}</div>}
        {isTransitioning && !gameCompleted && <div className="pointer-events-none absolute inset-0 z-30" aria-hidden="true"><div className={styles.fireworks}>{Array.from({ length: 12 }, (_, index) => <span key={index} className={styles.fireworkParticle} />)}</div></div>}
        {gameCompleted && trackingTask && <GameCompletion score={score} trackingTask={trackingTask} onRestart={restart} />}
      </div>
    </GameShell>
    </GameImagesProvider>
  )
}

function DropTarget({ id, completed, wrong, correct, large = false }: { id: string; completed?: DragAnswerValue; wrong: boolean; correct: boolean; large?: boolean }) {
  return <div data-target-id={id} className={`${styles.dropTarget} ${large ? styles.dropTargetLarge : ''} ${completed !== undefined ? styles.dropTargetCompleted : styles.dropTargetEmpty} ${wrong ? styles.shake : ''} ${correct ? 'scale-110' : ''}`}>
    <span className={styles.targetValue}><GameImageValue value={completed ?? '?'} size={32} /></span>
  </div>
}

function CountGroups({ groups, completed, wrongTarget, correctTarget, voiceButton }: { groups: CountGroup[]; completed: Record<string, DragAnswerValue>; wrongTarget: string | null; correctTarget: string | null; voiceButton?: ReactNode }) {
  return <div className={styles.countGroups} data-count={groups.length} style={{ display: 'flex', flexDirection: 'column' }}>
    {groups.map((group) => <div key={group.id} data-target-id={group.id} className={`${styles.countGroup} ${wrongTarget === group.id ? styles.shake : ''}`} style={{ width: '100%' }}>
      <div className={styles.animals} data-items={group.count} aria-label={`${group.count} ${group.label}`}>
        {voiceButton ?? (group.count > 0 && Array.from({ length: group.count }, (_, itemIndex) => <span key={itemIndex}><GameImageValue value={group.icon} size={90} /></span>))}
      </div><DropTarget large id={group.id} completed={completed[group.id]} wrong={false} correct={correctTarget === group.id} />
    </div>)}
  </div>
}

function SequenceRow({ cells, completed, wrongTarget, correctTarget }: { cells: SequenceCell[]; completed: Record<string, DragAnswerValue>; wrongTarget: string | null; correctTarget: string | null }) {
  return <div className={styles.sequenceRow}>
    {cells.map((cell, index) => <div key={cell.id} data-target-id={cell.target ? cell.id : undefined} className="flex min-w-0 items-center gap-1">
      {cell.target ? <DropTarget id={cell.id} completed={completed[cell.id]} wrong={wrongTarget === cell.id} correct={correctTarget === cell.id} /> : <div className="grid h-11 w-9 place-items-center rounded-xl bg-sky-500 text-xl font-black text-white shadow">{cell.value}</div>}
      {index < cells.length - 1 && <span className="text-sm font-black text-sky-500">›</span>}
    </div>)}
  </div>
}

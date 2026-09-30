'use client'

import { loadQuestionFont } from '../general/question-typography'
import { useEffect, useRef, useState } from 'react'
import { GameLoadingScreen, GameShell, unlockGameAudio } from '../general'
import BubbleCompletion from './BubbleCompletion'
import type { BubbleShooterGameConfig } from './types/game'
import { resolveIntroVoice } from '../general/intro-voice'
import GameRewardToast from '../general/GameRewardToast'

export default function PhaserGame({ config }: { config: BubbleShooterGameConfig }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<import('phaser').Game | null>(null)
  const [progress, setProgress] = useState(5)
  const [isReady, setIsReady] = useState(false)
  const [score, setScore] = useState(0)
  const [currentRound, setCurrentRound] = useState(1)
  const [muted, setMuted] = useState(false)
  const [gameCompleted, setGameCompleted] = useState(false)
  const [trackingTask, setTrackingTask] = useState<Promise<void> | undefined>()
  const [lives, setLives] = useState(3)
  const [victory, setVictory] = useState(false)
  const [bestLevel, setBestLevel] = useState(0)
  const [playCount, setPlayCount] = useState(0)
  const [reward, setReward] = useState(0)
  const [recordNotice, setRecordNotice] = useState(false)
  const [coinBalance, setCoinBalance] = useState(0)
  const recordShown = useRef(false)
  const bestLevelRef = useRef(0)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!config.tracking?.lessonId) return
    let active = true
    fetch(`/api/game-tracking/bubble-survival?lessonId=${encodeURIComponent(config.tracking.lessonId)}`)
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (active && data) { setBestLevel(data.bestLevel); bestLevelRef.current = data.bestLevel; setPlayCount(data.playCount); setCoinBalance(data.coinBalance) } })
      .catch(() => {})
    return () => { active = false }
  }, [config.tracking?.lessonId])

  useEffect(() => {
    let cancelled = false

    Promise.all([import('phaser'), import('./config'), resolveIntroVoice({
      gameId: 'bubble-shooter', lessonId: config.tracking?.lessonId, introVoice: config.introVoice,
    }), loadQuestionFont()]).then(([Phaser, { createGameConfig }, introVoice]) => {
      if (cancelled || !containerRef.current || gameRef.current) return
      setProgress(15)
      gameRef.current = new Phaser.Game(createGameConfig(containerRef.current, { ...config, introVoice }, {
        onProgress: (assetProgress) => {
          if (!cancelled) setProgress(15 + assetProgress * 84)
        },
        onReady: () => {
          if (cancelled) return
          setProgress(100)
          setIsReady(true)
        },
      }))
      gameRef.current.events.on('game-ui:score', setScore)
      gameRef.current.events.on('game-ui:round', (round: number) => {
        setCurrentRound(round)
        if (!recordShown.current && bestLevelRef.current > 0 && round - 1 > bestLevelRef.current) {
          recordShown.current = true
          setRecordNotice(true)
          window.setTimeout(() => setRecordNotice(false), 1800)
        }
      })
      gameRef.current.events.on('game-ui:lives', setLives)
      gameRef.current.events.on('game-ui:reward', (amount: number) => { setReward(amount); window.setTimeout(() => setReward(0), 1200) })
      gameRef.current.events.on('game-ui:complete', (finalScore: number, task?: Promise<void>, completed = false) => {
        setScore(finalScore)
        setTrackingTask(task)
        setVictory(completed)
        setGameCompleted(true)
        if (task && config.tracking?.lessonId) void task.then(() => fetch(`/api/game-tracking/bubble-survival?lessonId=${encodeURIComponent(config.tracking!.lessonId)}`))
          .then(response => response.ok ? response.json() : null)
          .then(data => { if (!cancelled && data) setCoinBalance(data.coinBalance) })
          .catch(() => {})
        gameRef.current?.events.emit('game-ui:pause', true)
      })
    })

    return () => {
      cancelled = true
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [config])

  const sendToGame = (event: string, value?: boolean) => gameRef.current?.events.emit(event, value)
  const restart = () => {
    if (startedRef.current && config.tracking) {
      setPlayCount(count => count + 1)
      setBestLevel(best => Math.max(best, currentRound))
    }
    startedRef.current = true
    gameRef.current?.registry.set('game-ui:started', true)
    setGameCompleted(false)
    setScore(0)
    setCurrentRound(1)
    setLives(3)
    setReward(0)
    recordShown.current = false
    setTrackingTask(undefined)
    sendToGame('game-ui:restart')
  }

  return (
    <GameShell
      score={score}
      currentRound={currentRound}
      totalRounds={25}
      lives={lives}
      levelOnly
      coinBalance={coinBalance}
      muted={muted}
      onMutedChange={(value) => { setMuted(value); sendToGame('game-ui:mute', value) }}
      onPauseChange={(value) => sendToGame('game-ui:pause', value)}
      onRestart={restart}
    >
      <GameLoadingScreen progress={progress} ready={isReady} unlockAudio={() => unlockGameAudio(gameRef.current)} onStart={() => { startedRef.current = true; sendToGame('game-ui:start') }} />
      <div
        ref={containerRef}
        className={`h-full w-full touch-none [&_canvas]:block ${isReady ? 'opacity-100' : 'opacity-0'}`}
        role="application"
        aria-label="Game bắn bong bóng toán học"
        aria-hidden={!isReady}
      />
      {reward > 0 && !gameCompleted && <GameRewardToast amount={Math.round(reward * (playCount === 0 ? 1 : Math.max(.25, 1 - playCount * .25)))} />}
      {recordNotice && !gameCompleted && <div className="pointer-events-none absolute left-1/2 top-[42%] z-50 -translate-x-1/2 rounded-2xl bg-yellow-200 px-5 py-2 text-2xl font-black text-amber-900 shadow-xl">🏆 KỶ LỤC MỚI!</div>}
      {gameCompleted && <BubbleCompletion score={score} level={currentRound} victory={victory} bestLevel={bestLevel} playCount={playCount} trackingTask={trackingTask} onRestart={restart} />}
    </GameShell>
  )
}

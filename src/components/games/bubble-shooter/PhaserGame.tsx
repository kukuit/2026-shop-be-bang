'use client'

import { useEffect, useRef, useState } from 'react'
import { GameCompletion, GameLoadingScreen, GameShell, unlockGameAudio } from '../general'
import type { BubbleShooterGameConfig } from './types/game'

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

  useEffect(() => {
    let cancelled = false

    Promise.all([import('phaser'), import('./config')]).then(([Phaser, { createGameConfig }]) => {
      if (cancelled || !containerRef.current || gameRef.current) return
      setProgress(15)
      gameRef.current = new Phaser.Game(createGameConfig(containerRef.current, config, {
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
      gameRef.current.events.on('game-ui:round', setCurrentRound)
      gameRef.current.events.on('game-ui:complete', (finalScore: number, task?: Promise<void>) => {
        setScore(finalScore)
        setTrackingTask(task)
        setGameCompleted(true)
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
    gameRef.current?.registry.set('game-ui:started', true)
    setGameCompleted(false)
    setScore(0)
    setCurrentRound(1)
    setTrackingTask(undefined)
    sendToGame('game-ui:restart')
  }

  return (
    <GameShell
      score={score}
      currentRound={currentRound}
      muted={muted}
      onMutedChange={(value) => { setMuted(value); sendToGame('game-ui:mute', value) }}
      onPauseChange={(value) => sendToGame('game-ui:pause', value)}
      onRestart={restart}
    >
      <GameLoadingScreen progress={progress} ready={isReady} unlockAudio={() => unlockGameAudio(gameRef.current)} onStart={() => { sendToGame('game-ui:start') }} />
      <div
        ref={containerRef}
        className={`h-full w-full touch-none [&_canvas]:block ${isReady ? 'opacity-100' : 'opacity-0'}`}
        role="application"
        aria-label="Game bắn bong bóng toán học"
        aria-hidden={!isReady}
      />
      {gameCompleted && <GameCompletion score={score} trackingTask={trackingTask} onRestart={restart} />}
    </GameShell>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { GameLoadingScreen, GameShell } from '../general'

export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<import('phaser').Game | null>(null)
  const [progress, setProgress] = useState(5)
  const [isReady, setIsReady] = useState(false)
  const [score, setScore] = useState(0)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.all([import('phaser'), import('./config')]).then(([Phaser, { createGameConfig }]) => {
      if (cancelled || !containerRef.current || gameRef.current) return
      setProgress(15)
      gameRef.current = new Phaser.Game(createGameConfig(containerRef.current, {
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
    })

    return () => {
      cancelled = true
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  const sendToGame = (event: string, value?: boolean) => gameRef.current?.events.emit(event, value)

  return (
    <GameShell
      score={score}
      muted={muted}
      onMutedChange={(value) => { setMuted(value); sendToGame('game-ui:mute', value) }}
      onPauseChange={(value) => sendToGame('game-ui:pause', value)}
      onRestart={() => { setScore(0); sendToGame('game-ui:restart') }}
    >
      {!isReady && <GameLoadingScreen progress={progress} />}
      <div
        ref={containerRef}
        className={`h-full w-full touch-none [&_canvas]:block ${isReady ? 'opacity-100' : 'opacity-0'}`}
        role="application"
        aria-label="Game bắn bong bóng toán học"
        aria-hidden={!isReady}
      />
    </GameShell>
  )
}

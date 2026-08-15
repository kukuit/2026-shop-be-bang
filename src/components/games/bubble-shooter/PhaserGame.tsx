'use client'

import { useEffect, useRef, useState } from 'react'
import GameLoadingScreen from './GameLoadingScreen'

export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<import('phaser').Game | null>(null)
  const [progress, setProgress] = useState(5)
  const [isReady, setIsReady] = useState(false)

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
    })

    return () => {
      cancelled = true
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return (
    <div className="relative aspect-[9/16] max-h-dvh w-full max-w-[calc(100dvh*0.5625)] overflow-hidden bg-sky-200">
      {!isReady && <GameLoadingScreen progress={progress} />}
      <div
        ref={containerRef}
        className={`h-full w-full touch-none [&_canvas]:block ${isReady ? 'opacity-100' : 'opacity-0'}`}
        role="application"
        aria-label="Game bắn bong bóng toán học"
        aria-hidden={!isReady}
      />
    </div>
  )
}

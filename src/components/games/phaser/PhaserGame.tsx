'use client'

import { useEffect, useRef } from 'react'

export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<import('phaser').Game | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([import('phaser'), import('./config')]).then(([Phaser, { createGameConfig }]) => {
      if (cancelled || !containerRef.current || gameRef.current) return
      gameRef.current = new Phaser.Game(createGameConfig(containerRef.current))
    })

    return () => {
      cancelled = true
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="aspect-[9/16] max-h-dvh w-full max-w-[calc(100dvh*0.5625)] touch-none overflow-hidden [&_canvas]:block"
      role="application"
      aria-label="Game bắn bong bóng toán học"
    />
  )
}

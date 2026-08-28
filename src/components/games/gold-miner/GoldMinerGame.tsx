'use client'

import { useEffect, useRef, useState } from 'react'
import { GameCompletion, GameLoadingScreen, GameShell, unlockGameAudio } from '../general'

export default function GoldMinerGame() {
  const host = useRef<HTMLDivElement>(null)
  const game = useRef<import('phaser').Game | null>(null)
  const [loadProgress, setLoadProgress] = useState(5)
  const [ready, setReady] = useState(false)
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [muted, setMuted] = useState(false)
  const [complete, setComplete] = useState(false)
  const [trackingTask, setTrackingTask] = useState<Promise<unknown>>()

  useEffect(() => {
    let cancelled = false
    Promise.all([import('phaser'), import('./config')]).then(([Phaser, { createGoldMinerConfig }]) => {
      if (cancelled || !host.current || game.current) return
      setLoadProgress(15)
      game.current = new Phaser.Game(createGoldMinerConfig(host.current, {
        onProgress: (progress) => {
          if (!cancelled) setLoadProgress(15 + progress * 84)
        },
        onReady: () => {
          if (cancelled) return
          setLoadProgress(100)
          requestAnimationFrame(() => requestAnimationFrame(() => {
            if (!cancelled) setReady(true)
          }))
        },
      }))
      game.current.events.on('game-ui:score', setScore)
      game.current.events.on('game-ui:round', setRound)
      game.current.events.on('game-ui:complete', (value: number, task?: Promise<unknown>) => {
        setScore(value); setTrackingTask(() => task); setComplete(true)
      })
    })
    return () => { cancelled = true; game.current?.destroy(true); game.current = null }
  }, [])

  const emit = (name: string, value?: boolean) => game.current?.events.emit(name, value)
  const restart = () => {
    game.current?.registry.set('game-ui:started', true)
    setScore(0); setRound(1); setComplete(false); setTrackingTask(undefined)
    emit('game-ui:restart')
  }

  return <GameShell score={score} currentRound={round} muted={muted}
    onMutedChange={(value) => { setMuted(value); emit('game-ui:mute', value) }}
    onPauseChange={(value) => emit('game-ui:pause', value)} onRestart={restart}>
    <GameLoadingScreen progress={loadProgress} ready={ready} unlockAudio={() => unlockGameAudio(game.current)} onStart={() => { emit('game-ui:start') }} />
    <div ref={host} className={`h-full w-full touch-none [&_canvas]:block ${ready ? 'opacity-100' : 'opacity-0'}`}
      role="application" aria-label="Trò chơi đào vàng học đếm" aria-hidden={!ready} />
    {complete && <GameCompletion score={score} trackingTask={trackingTask} onRestart={restart} />}
  </GameShell>
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { GameCompletion, GameLoadingScreen, GameShell } from '../general'

export default function GoldMinerGame() {
  const host = useRef<HTMLDivElement>(null)
  const game = useRef<import('phaser').Game | null>(null)
  const [ready, setReady] = useState(false)
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [muted, setMuted] = useState(false)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([import('phaser'), import('./config')]).then(([Phaser, { createGoldMinerConfig }]) => {
      if (cancelled || !host.current || game.current) return
      game.current = new Phaser.Game(createGoldMinerConfig(host.current, {
        onReady: () => !cancelled && setReady(true),
      }))
      game.current.events.on('game-ui:score', setScore)
      game.current.events.on('game-ui:round', setRound)
      game.current.events.on('game-ui:complete', (value: number) => { setScore(value); setComplete(true) })
    })
    return () => { cancelled = true; game.current?.destroy(true); game.current = null }
  }, [])

  const emit = (name: string, value?: boolean) => game.current?.events.emit(name, value)
  const restart = () => { setScore(0); setRound(1); setComplete(false); emit('game-ui:restart') }

  return <GameShell score={score} currentRound={round} muted={muted}
    onMutedChange={(value) => { setMuted(value); emit('game-ui:mute', value) }}
    onPauseChange={(value) => emit('game-ui:pause', value)} onRestart={restart}>
    {!ready && <GameLoadingScreen progress={ready ? 100 : 35} />}
    <div ref={host} className={`h-full w-full touch-none [&_canvas]:block ${ready ? 'opacity-100' : 'opacity-0'}`}
      role="application" aria-label="Trò chơi đào vàng học đếm" aria-hidden={!ready} />
    {complete && <GameCompletion score={score} onRestart={restart} />}
  </GameShell>
}

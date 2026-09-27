'use client'

import { loadQuestionFont } from '../general/question-typography'
import { useEffect, useRef, useState } from 'react'
import { GameLoadingScreen, GameShell, unlockGameAudio } from '../general'
import type { GoldMinerGameConfig } from './types'
import { resolveIntroVoice } from '../general/intro-voice'
import GoldMinerCompletion from './GoldMinerCompletion'
import { survivalBaseCoinEarned, survivalRewardMultiplier } from '../general/survival-rewards'
import Image from 'next/image'

export default function GoldMinerGame({ config }: { config: GoldMinerGameConfig }) {
  const host = useRef<HTMLDivElement>(null)
  const game = useRef<import('phaser').Game | null>(null)
  const [loadProgress, setLoadProgress] = useState(5)
  const [ready, setReady] = useState(false)
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [muted, setMuted] = useState(false)
  const [complete, setComplete] = useState(false)
  const [victory, setVictory] = useState(false)
  const [levelsCompleted, setLevelsCompleted] = useState(0)
  const [lives, setLives] = useState(3)
  const [bestLevel, setBestLevel] = useState(0)
  const [playCount, setPlayCount] = useState(0)
  const [coinBalance, setCoinBalance] = useState(0)
  const [rewardToast, setRewardToast] = useState(0)
  const [trackingTask, setTrackingTask] = useState<Promise<unknown>>()
  const playCountRef = useRef(0)

  useEffect(() => {
    let active = true
    fetch(`/api/game-tracking/gold-mining-survival?lessonId=${encodeURIComponent(config.lessonId)}`)
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (active && data) { setBestLevel(data.bestLevel ?? 0); playCountRef.current = data.playCount ?? 0; setPlayCount(data.playCount ?? 0); setCoinBalance(data.coinBalance ?? 0) } })
      .catch(() => {})
    return () => { active = false }
  }, [config.lessonId])

  useEffect(() => {
    let cancelled = false
    Promise.all([import('phaser'), import('./config'), resolveIntroVoice(config), loadQuestionFont()]).then(([Phaser, { createGoldMinerConfig }, introVoice]) => {
      if (cancelled || !host.current || game.current) return
      setLoadProgress(15)
      game.current = new Phaser.Game(createGoldMinerConfig(host.current, { ...config, introVoice }, {
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
      game.current.events.on('game-ui:lives', setLives)
      game.current.events.on('game-ui:reward', (completedLevel: number) => {
        const multiplier = survivalRewardMultiplier(playCountRef.current + 1)
        const amount = Math.round(survivalBaseCoinEarned(completedLevel) * multiplier)
          - Math.round(survivalBaseCoinEarned(completedLevel - 1) * multiplier)
        setRewardToast(amount)
        window.setTimeout(() => setRewardToast(0), 1800)
      })
      game.current.events.on('game-ui:session-saved', (task?: Promise<unknown>) => {
        void task?.then(() => fetch(`/api/game-tracking/gold-mining-survival?lessonId=${encodeURIComponent(config.lessonId)}`))
          .then(response => response?.ok ? response.json() : null)
          .then(data => { if (data) { setBestLevel(data.bestLevel ?? 0); playCountRef.current = data.playCount ?? 0; setPlayCount(data.playCount ?? 0); setCoinBalance(data.coinBalance ?? 0) } })
          .catch(() => {})
      })
      game.current.events.on('game-ui:complete', (value: number, task?: Promise<unknown>, won = false, completed = 0) => {
        setScore(value); setTrackingTask(() => task); setVictory(won); setLevelsCompleted(completed); setComplete(true)
        void task?.then(() => fetch(`/api/game-tracking/gold-mining-survival?lessonId=${encodeURIComponent(config.lessonId)}`))
          .then(response => response?.ok ? response.json() : null)
          .then(data => { if (data) { setBestLevel(data.bestLevel ?? 0); setCoinBalance(data.coinBalance ?? 0) } })
          .catch(() => {})
      })
    })
    return () => { cancelled = true; game.current?.destroy(true); game.current = null }
  }, [config])

  const emit = (name: string, value?: boolean) => game.current?.events.emit(name, value)
  const restart = () => {
    if (complete) { playCountRef.current += 1; setPlayCount(count => count + 1) }
    game.current?.registry.set('game-ui:started', true)
    setScore(0); setRound(1); setLives(3); setComplete(false); setVictory(false); setLevelsCompleted(0); setRewardToast(0); setTrackingTask(undefined)
    emit('game-ui:restart')
  }

  return <GameShell score={score} currentRound={round} totalRounds={25} levelOnly lives={lives} coinBalance={coinBalance} muted={muted}
    onMutedChange={(value) => { setMuted(value); emit('game-ui:mute', value) }}
    onPauseChange={(value) => emit('game-ui:pause', value)} onRestart={restart}>
    <GameLoadingScreen progress={loadProgress} ready={ready} unlockAudio={() => unlockGameAudio(game.current)} onStart={() => { emit('game-ui:start') }} />
    <div ref={host} className={`h-full w-full touch-none [&_canvas]:block ${ready ? 'opacity-100' : 'opacity-0'}`}
      role="application" aria-label="Trò chơi đào vàng học đếm" aria-hidden={!ready} />
    {rewardToast > 0 && !complete && <div className="pointer-events-none absolute left-1/2 top-1/3 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-amber-300 px-6 py-3 text-3xl font-black text-amber-950 shadow-xl"><span>+{rewardToast}</span><Image src="/games/general/images/optimize/xu_icon.png" alt="xu" width={30} height={30} className="h-[30px] w-[30px] object-contain" /></div>}
    {complete && trackingTask && <GoldMinerCompletion score={score} levelsCompleted={levelsCompleted} victory={victory} bestLevel={bestLevel} playCount={playCount} trackingTask={trackingTask} onRestart={restart} />}
  </GameShell>
}

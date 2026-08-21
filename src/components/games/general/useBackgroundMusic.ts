'use client'

import { useCallback, useEffect, useRef } from 'react'
import { GAME_BACKGROUND_MUSIC } from './audio'

export default function useBackgroundMusic(enabled: boolean, ready = true) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(GAME_BACKGROUND_MUSIC)
    audio.loop = true
    audio.volume = 0.28
    audioRef.current = audio
    return () => { audio.pause(); audio.src = ''; audioRef.current = null }
  }, [])

  const start = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || !enabled || !audio.paused) return
    await audio.play()
  }, [enabled])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!enabled || !ready) { audio.pause(); return }
    void start().catch(() => undefined)
  }, [enabled, ready, start])

  return start
}

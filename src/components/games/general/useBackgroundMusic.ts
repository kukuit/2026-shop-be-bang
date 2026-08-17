'use client'

import { useEffect, useRef } from 'react'
import { GAME_BACKGROUND_MUSIC } from './audio'

export default function useBackgroundMusic(enabled: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(GAME_BACKGROUND_MUSIC)
    audio.loop = true
    audio.volume = 0.28
    audioRef.current = audio
    return () => { audio.pause(); audio.src = ''; audioRef.current = null }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!enabled) { audio.pause(); return }

    const play = () => { void audio.play().catch(() => undefined) }
    play()
    window.addEventListener('pointerdown', play, { once: true })
    return () => window.removeEventListener('pointerdown', play)
  }, [enabled])
}

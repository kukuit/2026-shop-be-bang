'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { VoicePriority } from './GameVoiceManager'

type VoiceDefinition = { key: string; src: string; volume?: number }

const PRIORITY: Record<VoicePriority, number> = { false: 1, true: 2, intro: 3, win: 4 }

export function useGameVoices(definitions: readonly VoiceDefinition[], enabled: boolean) {
  const voicesRef = useRef(new Map<string, HTMLAudioElement>())
  const currentRef = useRef<{ audio: HTMLAudioElement; priority: number }>()
  const playedOnceRef = useRef(new Set<string>())

  useEffect(() => {
    const voices = voicesRef.current
    const playedOnce = playedOnceRef.current
    definitions.forEach(({ key, src, volume = 0.8 }) => {
      const audio = new Audio(src)
      audio.preload = 'auto'
      audio.volume = volume
      voices.set(key, audio)
    })
    return () => {
      voices.forEach((audio) => { audio.pause(); audio.src = '' })
      voices.clear()
      currentRef.current = undefined
      playedOnce.clear()
    }
  }, [definitions])

  useEffect(() => {
    if (enabled) return
    currentRef.current?.audio.pause()
    currentRef.current = undefined
  }, [enabled])

  const play = useCallback((key: string, priority: VoicePriority) => {
    if (!enabled) return false
    const audio = voicesRef.current.get(key)
    if (!audio) return false
    const current = currentRef.current
    if (current?.audio && !current.audio.paused) {
      if (PRIORITY[priority] <= current.priority) return false
      current.audio.pause()
      current.audio.currentTime = 0
    }
    audio.currentTime = 0
    currentRef.current = { audio, priority: PRIORITY[priority] }
    audio.onended = () => { if (currentRef.current?.audio === audio) currentRef.current = undefined }
    void audio.play().catch(() => { if (currentRef.current?.audio === audio) currentRef.current = undefined })
    return true
  }, [enabled])

  const playOnce = useCallback((id: string, key: string, priority: VoicePriority) => {
    if (playedOnceRef.current.has(id)) return false
    const played = play(key, priority)
    if (played) playedOnceRef.current.add(id)
    return played
  }, [play])

  const playEffect = useCallback((key: string) => {
    if (!enabled) return
    const audio = voicesRef.current.get(key)
    if (!audio) return
    audio.currentTime = 0
    void audio.play().catch(() => undefined)
  }, [enabled])

  const reset = useCallback(() => {
    currentRef.current?.audio.pause()
    currentRef.current = undefined
    playedOnceRef.current.clear()
  }, [])

  return useMemo(
    () => ({ play, playOnce, playEffect, reset }),
    [play, playOnce, playEffect, reset],
  )
}

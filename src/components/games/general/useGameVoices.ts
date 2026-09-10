'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { VoiceChannel } from './VoiceChannel'
import type { VoicePriority } from './GameVoiceManager'

type VoiceDefinition = { key: string; src: string; volume?: number }

const PRIORITY: Record<VoicePriority, number> = { false: 1, true: 2, intro: 3, win: 4 }

export function useGameVoices(definitions: readonly VoiceDefinition[], enabled: boolean) {
  const [channel] = useState(() => new VoiceChannel())
  const introTimer = useRef<ReturnType<typeof setTimeout>>()
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
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
      clearTimeout(introTimer.current)
      voices.forEach((audio) => { audio.pause(); audio.src = '' })
      voices.clear()
      currentRef.current = undefined
      playedOnce.clear()
      channel.set('intro-pending', false)
      channel.set('voice', false)
    }
  }, [definitions, channel])

  useEffect(() => {
    if (enabled) return
    currentRef.current?.audio.pause()
    currentRef.current = undefined
    channel.set('voice', false)
  }, [enabled, channel])

  const play = useCallback((key: string, priority: VoicePriority) => {
    if (!enabledRef.current) return false
    const audio = voicesRef.current.get(key)
    if (!audio) return false
    const current = currentRef.current
    if (current) {
      if (PRIORITY[priority] <= current.priority) return false
      current.audio.pause()
      current.audio.currentTime = 0
    }
    channel.set('voice', true)
    audio.currentTime = 0
    currentRef.current = { audio, priority: PRIORITY[priority] }
    const finish = () => {
      if (currentRef.current?.audio !== audio) return
      currentRef.current = undefined
      channel.set('voice', false)
    }
    audio.onended = audio.onerror = finish
    void audio.play().catch(finish)
    return true
  }, [enabled, channel])

  const playOnce = useCallback((id: string, key: string, priority: VoicePriority) => {
    if (playedOnceRef.current.has(id)) return false
    const played = play(key, priority)
    if (played) playedOnceRef.current.add(id)
    return played
  }, [play])

  const playEffect = useCallback((key: string) => {
    if (!enabledRef.current) return
    const audio = voicesRef.current.get(key)
    if (!audio) return
    audio.currentTime = 0
    void audio.play().catch(() => undefined)
  }, [enabled])

  const scheduleIntro = useCallback((key: string) => {
    clearTimeout(introTimer.current)
    channel.set('intro-pending', true)
    introTimer.current = setTimeout(() => {
      playOnce('intro', key, 'intro')
      channel.set('intro-pending', false)
    }, 500)
  }, [channel, playOnce])

  const reset = useCallback(() => {
    currentRef.current?.audio.pause()
    currentRef.current = undefined
    clearTimeout(introTimer.current)
    playedOnceRef.current.clear()
    channel.set('intro-pending', false)
    channel.set('voice', false)
  }, [channel])

  return useMemo(
    () => ({ play, playOnce, playEffect, reset, scheduleIntro, channel }),
    [play, playOnce, playEffect, reset, scheduleIntro, channel],
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ComposedAudioPlayer, NATURAL_COMPOSED_AUDIO_OPTIONS } from '@/components/games/general/composed-audio'
import type { VoiceSegment } from '@/components/games/general/composed-voice'

export function useExamAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const composedRef = useRef<ComposedAudioPlayer | null>(null)
  const composedPlayingRef = useRef(false)
  const playingIdRef = useRef<string | null>(null)
  const volumeRef = useRef(1)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [volume, setVolumeState] = useState(1)

  const setVolume = useCallback((nextVolume: number) => {
    const normalized = Math.max(0, Math.min(1, nextVolume))
    volumeRef.current = normalized
    setVolumeState(normalized)
    if (audioRef.current) audioRef.current.volume = normalized
    composedRef.current?.setVolume(normalized)
  }, [])

  const stop = useCallback(() => {
    composedRef.current?.stop()
    composedPlayingRef.current = false
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      audio.onended = null
      audio.onplay = null
      audio.onpause = null
      audio.onerror = null
    }
    audioRef.current = null
    playingIdRef.current = null
    setPlayingId(null)
  }, [])

  const play = useCallback((id: string, src: string | readonly string[]) => {
    const current = audioRef.current
    const isPlayingComposed = composedPlayingRef.current && playingIdRef.current === id
    if (playingIdRef.current === id && (isPlayingComposed || (current && !current.paused))) {
      stop()
      return
    }

    stop()
    const sources = typeof src === 'string' ? [src] : [...src]
    if (!sources.length) return
    playingIdRef.current = id
    const clear = () => {
      if (playingIdRef.current !== id) return
      audioRef.current = null
      composedPlayingRef.current = false
      playingIdRef.current = null
      setPlayingId(null)
    }
    const playSource = (index: number) => {
      const audio = new Audio(sources[index])
      audio.preload = 'none'
      audio.volume = volumeRef.current
      audioRef.current = audio
      audio.onplay = () => {
        if (audioRef.current === audio) setPlayingId(id)
      }
      audio.onpause = () => {
        if (audioRef.current === audio && !audio.ended) clear()
      }
      audio.onended = () => {
        if (audioRef.current !== audio) return
        if (index + 1 < sources.length) playSource(index + 1)
        else clear()
      }
      audio.onerror = () => {
        if (audioRef.current === audio) clear()
      }
      void audio.play().catch(() => {
        if (audioRef.current === audio) clear()
      })
    }

    if (sources.length > 1 && typeof AudioContext !== 'undefined') {
      const composed = composedRef.current ??= new ComposedAudioPlayer()
      composed.setVolume(volumeRef.current)
      composedPlayingRef.current = true
      setPlayingId(id)
      const sequence: VoiceSegment[] = sources.map(source => ({ src: source, text: '' }))
      void composed.play(sequence, NATURAL_COMPOSED_AUDIO_OPTIONS, clear).catch(() => {
        if (playingIdRef.current !== id) return
        composedPlayingRef.current = false
        playSource(0)
      })
      return
    }

    playSource(0)
  }, [stop])

  useEffect(() => () => {
    stop()
    composedRef.current?.dispose()
    composedRef.current = null
  }, [stop])
  return { playingId, play, stop, volume, setVolume }
}


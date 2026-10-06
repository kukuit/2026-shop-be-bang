'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export function useExamAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playingIdRef = useRef<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)

  const stop = useCallback(() => {
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
    if (current && playingIdRef.current === id && !current.paused) {
      stop()
      return
    }

    stop()
    const sources = typeof src === 'string' ? [src] : [...src]
    if (!sources.length) return
    playingIdRef.current = id
    const playSource = (index: number) => {
      const audio = new Audio(sources[index])
      audio.preload = 'none'
      audioRef.current = audio
      const clear = () => {
        if (audioRef.current !== audio) return
        audioRef.current = null
        playingIdRef.current = null
        setPlayingId(null)
      }
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
      audio.onerror = clear
      void audio.play().catch(clear)
    }
    playSource(0)
  }, [stop])

  useEffect(() => stop, [stop])
  return { playingId, play, stop }
}


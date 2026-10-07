'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Maximize, Pause, Play, RotateCcw, Volume2 } from 'lucide-react'
import type { AnimatedQuestion24Data, AnimatedQuestion24Target } from '../../_exam/types'
import QuestionVisual from './QuestionVisual'
import styles from './AnimatedQuestionPlayer.module.css'

const BACKGROUND_AUDIO_URL = '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common/background.mp3'

type Point = { x: number; y: number; lift: number; tilt: number }

function easeInOut(value: number) {
  return value * value * (3 - 2 * value)
}

function actorPosition(data: AnimatedQuestion24Data, progress: number): Point {
  const moveProgress = Math.max(0, Math.min(1, (progress - 0.15) / 0.7))
  const eased = easeInOut(moveProgress)
  const end = { x: data.destination.x, y: data.destination.y - 10 }
  let x = data.actor.start.x + (end.x - data.actor.start.x) * eased
  let y = data.actor.start.y + (end.y - data.actor.start.y) * eased
  const wave = Math.sin(moveProgress * Math.PI * 2 * 5)
  let lift = 0
  let tilt = 0

  if (moveProgress > 0 && moveProgress < 1) {
    if (data.motion === 'fly') {
      y -= Math.sin(moveProgress * Math.PI * 3) * 7
      tilt = Math.cos(moveProgress * Math.PI * 4) * 9
    } else if (data.motion === 'run') {
      lift = Math.abs(wave) * 5
      tilt = wave * 3
    } else if (data.motion === 'jump') {
      lift = Math.abs(Math.sin(moveProgress * Math.PI * 5)) * 24
      tilt = Math.sin(moveProgress * Math.PI * 5) * 4
    } else {
      lift = Math.abs(wave) * 1.5
      tilt = Math.sin(moveProgress * Math.PI * 5) * 1.5
    }
  }

  if (progress < 0.15) return { x: data.actor.start.x, y: data.actor.start.y, lift: 0, tilt: 0 }
  if (progress >= 0.85) return { x: end.x, y: end.y, lift: 0, tilt: 0 }
  return { x, y, lift, tilt }
}

function formatTime(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function pointStyle(point: Point) {
  return {
    left: `${point.x}%`, top: `${point.y}%`,
    transform: `translate(-50%, calc(-50% - ${point.lift}px)) rotate(${point.tilt}deg)`,
  }
}

export default function AnimatedQuestionPlayer({
  data,
  audioVolume,
  onAudioVolumeChange,
}: {
  data: AnimatedQuestion24Data
  audioVolume?: number
  onAudioVolumeChange?(volume: number): void
}) {
  const [progress, setProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const playerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null)
  const startTimeRef = useRef(0)
  const startProgressRef = useRef(0)
  const progressRef = useRef(progress)
  progressRef.current = progress
  const point = useMemo(() => actorPosition(data, progress), [data, progress])
  const actorStyle = pointStyle(point)
  const duration = data.durationMs
  const volume = Math.max(0, Math.min(1, audioVolume ?? 1))

  const getBackgroundAudio = useCallback(() => {
    let audio = backgroundAudioRef.current
    if (!audio) {
      audio = new Audio(BACKGROUND_AUDIO_URL)
      audio.loop = true
      audio.preload = 'auto'
      backgroundAudioRef.current = audio
    }
    return audio
  }, [])

  const stopAnimation = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
  }, [])

  useEffect(() => {
    if (!isPlaying) {
      stopAnimation()
      return
    }
    startTimeRef.current = performance.now()
    startProgressRef.current = progressRef.current
    const tick = (now: number) => {
      const next = Math.min(1, startProgressRef.current + (now - startTimeRef.current) / duration)
      setProgress(next)
      if (next >= 1) {
        setIsPlaying(false)
        frameRef.current = null
        return
      }
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return stopAnimation
  }, [duration, isPlaying, stopAnimation])

  useEffect(() => {
    const audio = backgroundAudioRef.current
    if (!audio) return
    audio.volume = volume
    if (isPlaying) void audio.play().catch(() => {})
    else audio.pause()
  }, [isPlaying, volume])

  useEffect(() => () => {
    backgroundAudioRef.current?.pause()
    backgroundAudioRef.current = null
  }, [])

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(document.fullscreenElement === playerRef.current)
    document.addEventListener('fullscreenchange', updateFullscreen)
    return () => document.removeEventListener('fullscreenchange', updateFullscreen)
  }, [])

  const togglePlayback = () => {
    if (isPlaying) {
      backgroundAudioRef.current?.pause()
      setIsPlaying(false)
      return
    }
    const audio = getBackgroundAudio()
    audio.volume = volume
    if (progress >= 1) {
      setProgress(0)
      audio.currentTime = 0
    }
    void audio.play().catch(() => {})
    setIsPlaying(true)
  }

  const replay = () => {
    const audio = backgroundAudioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
    setIsPlaying(false)
    setProgress(0)
  }

  const seek = (value: number) => {
    backgroundAudioRef.current?.pause()
    setIsPlaying(false)
    setProgress(value)
  }

  const toggleFullscreen = async () => {
    if (!playerRef.current) return
    try {
      if (document.fullscreenElement === playerRef.current) await document.exitFullscreen()
      else await playerRef.current.requestFullscreen()
    } catch {
      setIsFullscreen(false)
    }
  }

  return <div ref={playerRef} className={styles.player}>
    <div className={styles.scene} aria-label={`Hoạt ảnh ${data.motion} của ${data.actor.label}`}>
      <div className={styles.sun} aria-hidden="true" />
      <div className={styles.cloudOne} aria-hidden="true" />
      <div className={styles.cloudTwo} aria-hidden="true" />
      <div className={styles.hillBack} aria-hidden="true" />
      <div className={styles.ground} aria-hidden="true" />
      {data.targets.map((target: AnimatedQuestion24Target) => <div
        key={target.id}
        className={styles.target}
        style={{ left: `${target.x}%`, top: `${target.y}%` }}
      >
        <QuestionVisual visual={target.visual} maxDimension={86} />
        <span className={styles.targetLetter}>{target.letter}</span>
      </div>)}
      <div className={styles.actor} style={actorStyle}>
        <QuestionVisual visual={data.actor.visual} maxDimension={88} />
      </div>
      <span className="sr-only">Nhân vật dừng lại tại một trong ba mục tiêu.</span>
    </div>

    <div className={styles.controls}>
      <div className={styles.controlButtons}>
        <button type="button" onClick={togglePlayback} aria-label={isPlaying ? 'Tạm dừng hoạt ảnh' : 'Phát hoạt ảnh'} className={styles.iconButton}>
          {isPlaying ? <Pause size={19} /> : <Play size={19} fill="currentColor" />}
        </button>
        <button type="button" onClick={replay} aria-label="Xem lại hoạt ảnh" className={styles.iconButton}><RotateCcw size={18} /></button>
        <span className={styles.time}>{formatTime(progress * duration)} / {formatTime(duration)}</span>
      </div>
      <input
        type="range" min="0" max="1" step="0.001" value={progress}
        aria-label="Tua hoạt ảnh" className={styles.progress}
        onChange={event => seek(Number(event.target.value))}
      />
      <div className={styles.controlButtons}>
        <Volume2 size={18} aria-hidden="true" />
        <input
          type="range" min="0" max="1" step="0.05" value={volume}
          aria-label="Âm lượng âm thanh" className={styles.volume}
          onChange={event => onAudioVolumeChange?.(Number(event.target.value))}
        />
        <button type="button" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'} className={styles.iconButton}>
          <Maximize size={18} />
        </button>
      </div>
    </div>
  </div>
}

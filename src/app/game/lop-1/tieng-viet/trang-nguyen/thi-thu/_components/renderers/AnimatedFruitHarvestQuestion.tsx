'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Maximize, Pause, Play, RotateCcw, Volume2 } from 'lucide-react'
import type { AnimatedQuestion33Data, AnimatedQuestion33Target, ExamSpriteCrop, ExamVisual } from '../../_exam/types'
import { sanitizeSingleVietnameseLetter } from '../../_exam/answer-utils'
import type { QuestionRendererProps } from './QuestionFrame'
import ExamAudioButton from '../ExamAudioButton'
import QuestionFrame from './QuestionFrame'
import QuestionVisual from './QuestionVisual'
import examStyles from '../exam.module.css'
import styles from './AnimatedFruitHarvestQuestion.module.css'

const BACKGROUND_AUDIO_URL = '/games/lessons/lop-1/tieng-viet/trang-nguyen/voices/common/background.mp3'
const cleanFruitCropCache = new Map<string, Promise<ImageData>>()

function isSpriteSheetBackground(r: number, g: number, b: number): boolean {
  const lightest = Math.max(r, g, b)
  const darkest = Math.min(r, g, b)
  return darkest >= 216 && lightest - darkest <= 48
}

function loadCleanFruitCrop(crop: ExamSpriteCrop): Promise<ImageData> {
  const cacheKey = `${crop.spriteSheet}:${crop.x}:${crop.y}:${crop.width}:${crop.height}`
  const cached = cleanFruitCropCache.get(cacheKey)
  if (cached) return cached

  const pending = new Promise<ImageData>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = crop.width
        canvas.height = crop.height
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('Unable to prepare the fruit sprite canvas')
        context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)
        const imageData = context.getImageData(0, 0, crop.width, crop.height)
        const { data } = imageData
        const pixelCount = crop.width * crop.height
        const visited = new Uint8Array(pixelCount)
        const queue = new Int32Array(pixelCount)
        let queued = 0
        let cursor = 0

        const queueBackgroundPixel = (pixelIndex: number) => {
          if (visited[pixelIndex]) return
          visited[pixelIndex] = 1
          const offset = pixelIndex * 4
          if (!isSpriteSheetBackground(data[offset], data[offset + 1], data[offset + 2])) return
          queue[queued] = pixelIndex
          queued += 1
        }

        for (let x = 0; x < crop.width; x += 1) {
          queueBackgroundPixel(x)
          queueBackgroundPixel((crop.height - 1) * crop.width + x)
        }
        for (let y = 0; y < crop.height; y += 1) {
          queueBackgroundPixel(y * crop.width)
          queueBackgroundPixel(y * crop.width + crop.width - 1)
        }

        while (cursor < queued) {
          const pixelIndex = queue[cursor]
          cursor += 1
          data[pixelIndex * 4 + 3] = 0
          const x = pixelIndex % crop.width
          if (x > 0) queueBackgroundPixel(pixelIndex - 1)
          if (x + 1 < crop.width) queueBackgroundPixel(pixelIndex + 1)
          if (pixelIndex >= crop.width) queueBackgroundPixel(pixelIndex - crop.width)
          if (pixelIndex + crop.width < pixelCount) queueBackgroundPixel(pixelIndex + crop.width)
        }

        context.putImageData(imageData, 0, 0)
        resolve(imageData)
      } catch (error) {
        reject(error)
      }
    }
    image.onerror = () => reject(new Error(`Unable to load fruit sprite sheet: ${crop.spriteSheet}`))
    image.src = crop.spriteSheet
  })

  cleanFruitCropCache.set(cacheKey, pending)
  void pending.catch(() => cleanFruitCropCache.delete(cacheKey))
  return pending
}

function FruitCropImage({ visual, maxDimension }: { visual: ExamVisual; maxDimension: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const crop = visual.sprite
  const aspectRatio = crop ? crop.width / crop.height : 1
  const displayWidth = crop ? aspectRatio * maxDimension : maxDimension

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!crop || !canvas || !context) return
    let cancelled = false
    void loadCleanFruitCrop(crop).then(imageData => {
      if (cancelled) return
      canvas.width = crop.width
      canvas.height = crop.height
      canvas.getContext('2d')?.putImageData(imageData, 0, 0)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [crop])

  if (!crop) return <QuestionVisual visual={visual} maxDimension={maxDimension} />
  return <canvas
    ref={canvasRef}
    width={crop.width}
    height={crop.height}
    className={styles.fruitImage}
    role="img"
    aria-label={visual.label ?? 'Quả cây'}
    style={{ width: displayWidth, height: maxDimension }}
  />
}

function easeInOut(value: number) {
  const bounded = Math.max(0, Math.min(1, value))
  return bounded * bounded * (3 - 2 * bounded)
}

function formatTime(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function OrchardBackground() {
  return <svg className={styles.background} viewBox="0 0 960 540" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="t33-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#63c7f5" />
        <stop offset="0.68" stopColor="#bceafa" />
        <stop offset="1" stopColor="#ecf9d7" />
      </linearGradient>
      <linearGradient id="t33-trunk" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#603418" />
        <stop offset="0.42" stopColor="#9b582d" />
        <stop offset="1" stopColor="#542d19" />
      </linearGradient>
      <linearGradient id="t33-grass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#91cc55" />
        <stop offset="1" stopColor="#4b9a3d" />
      </linearGradient>
      <symbol id="t33-leaf" viewBox="0 0 50 30">
        <path d="M2 16C13 0 35 0 48 11 39 28 16 33 2 16Z" fill="#3c9b3d" />
        <path d="M7 17 42 10" stroke="#85c957" strokeWidth="2" fill="none" />
      </symbol>
    </defs>
    <rect width="960" height="540" fill="url(#t33-sky)" />
    <circle cx="843" cy="87" r="42" fill="#fff3a5" opacity=".92" />
    <g fill="#fff" opacity=".76">
      <path d="M190 123c4-19 27-25 40-11 11-18 39-12 41 10 20-1 25 25 7 31h-81c-19-2-24-24-7-30Z" />
      <path d="M650 157c3-16 22-21 33-9 9-15 32-10 34 8 16-1 21 20 6 25h-67c-16-2-20-20-6-24Z" />
    </g>
    <path d="M0 347c130-72 231-55 349-10 126-72 234-47 354-1 89-43 167-43 257-2v112H0Z" fill="#a8d778" />
    <path d="M0 392c144-55 266-37 391 7 152-55 297-38 569 1v140H0Z" fill="#80bd59" />
    <rect y="432" width="960" height="108" fill="url(#t33-grass)" />
    <g fill="#c5e786" opacity=".85">
      <path d="M0 452c96-37 199-37 300 0-115-18-202-14-300 0Z" />
      <path d="M588 458c106-34 247-29 372 6-132-18-237-18-372-6Z" />
    </g>
    <g stroke="#69401f" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M111 510c10-82 7-143 22-218 12-61 31-124 67-186" stroke="url(#t33-trunk)" strokeWidth="68" />
      <path d="M170 245C126 203 93 167 46 143M173 203c58-28 108-56 160-104M181 160c-3-48-5-86 1-126M185 263c90-2 148-12 234-58M145 319c-36-4-77-9-120-4" stroke="#70401f" strokeWidth="26" />
      <path d="M111 510c10-82 7-143 22-218 12-61 31-124 67-186" stroke="#bc7b43" strokeWidth="8" opacity=".62" />
      <path d="M172 231c-43-42-75-67-115-86M181 194c53-26 97-49 145-88M188 255c83 0 144-12 216-47" stroke="#a56836" strokeWidth="5" opacity=".8" />
    </g>
    <g fill="#29843a">
      <ellipse cx="62" cy="103" rx="101" ry="58" />
      <ellipse cx="144" cy="76" rx="111" ry="65" />
      <ellipse cx="236" cy="72" rx="105" ry="63" />
      <ellipse cx="319" cy="113" rx="113" ry="64" />
      <ellipse cx="413" cy="142" rx="111" ry="66" />
      <ellipse cx="514" cy="157" rx="113" ry="63" />
      <ellipse cx="611" cy="154" rx="111" ry="61" />
      <ellipse cx="718" cy="171" rx="112" ry="59" />
    </g>
    <g fill="#48a943" opacity=".98">
      <ellipse cx="51" cy="60" rx="72" ry="42" />
      <ellipse cx="127" cy="42" rx="71" ry="43" />
      <ellipse cx="214" cy="36" rx="75" ry="43" />
      <ellipse cx="298" cy="77" rx="81" ry="45" />
      <ellipse cx="389" cy="101" rx="76" ry="43" />
      <ellipse cx="487" cy="113" rx="80" ry="45" />
      <ellipse cx="591" cy="111" rx="79" ry="44" />
      <ellipse cx="699" cy="131" rx="75" ry="41" />
      <ellipse cx="785" cy="176" rx="64" ry="38" />
    </g>
    <g opacity=".86">
      <use href="#t33-leaf" x="20" y="66" width="53" height="32" transform="rotate(-22 46 82)" />
      <use href="#t33-leaf" x="93" y="17" width="51" height="31" transform="rotate(18 118 32)" />
      <use href="#t33-leaf" x="190" y="53" width="54" height="32" transform="rotate(-16 217 69)" />
      <use href="#t33-leaf" x="281" y="30" width="51" height="31" transform="rotate(23 306 45)" />
      <use href="#t33-leaf" x="374" y="78" width="54" height="32" transform="rotate(-8 401 94)" />
      <use href="#t33-leaf" x="475" y="71" width="53" height="32" transform="rotate(16 501 87)" />
      <use href="#t33-leaf" x="570" y="83" width="55" height="33" transform="rotate(-20 597 99)" />
      <use href="#t33-leaf" x="672" y="102" width="54" height="32" transform="rotate(11 699 118)" />
      <use href="#t33-leaf" x="741" y="144" width="53" height="32" transform="rotate(-18 767 160)" />
    </g>
    <g fill="#fff" opacity=".85">
      <circle cx="70" cy="475" r="4" /><circle cx="72" cy="466" r="4" /><circle cx="80" cy="471" r="4" />
      <circle cx="884" cy="486" r="4" /><circle cx="886" cy="477" r="4" /><circle cx="894" cy="482" r="4" />
    </g>
  </svg>
}

function frameForProgress(progress: number): number {
  if (progress < 0.12 || progress >= 0.96) return 7
  if (progress < 0.76) return Math.floor(((progress - 0.12) / 0.64) * 16) % 4
  if (progress < 0.84) return 4
  if (progress < 0.90) return 5
  if (progress < 0.96) return 6
  return 7
}

export function AnimatedFruitHarvestPlayer({
  data,
  audioVolume,
  onAudioVolumeChange,
}: {
  data: AnimatedQuestion33Data
  audioVolume?: number
  onAudioVolumeChange?(volume: number): void
}) {
  const [progress, setProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [spriteAvailable, setSpriteAvailable] = useState(false)
  const playerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null)
  const startTimeRef = useRef(0)
  const startProgressRef = useRef(0)
  const progressRef = useRef(progress)
  progressRef.current = progress
  const target = useMemo(() => data.targets.find(item => item.id === data.destinationTargetId), [data])
  const duration = data.durationMs
  const volume = Math.max(0, Math.min(1, audioVolume ?? 1))
  const actorX = target
    ? data.actorStart.x + (target.x - data.actorStart.x) * easeInOut((progress - 0.12) / 0.64)
    : data.actorStart.x
  const actorStyle = {
    left: `${progress < 0.12 ? data.actorStart.x : progress >= 0.76 && target ? target.x : actorX}%`,
    top: `${data.actorStart.y}%`,
    backgroundImage: spriteAvailable ? `url("${data.spriteSheet}")` : undefined,
    backgroundPosition: `${(frameForProgress(progress) % 4) / 3 * 100}% ${Math.floor(frameForProgress(progress) / 4) * 100}%`,
  }

  useEffect(() => {
    let cancelled = false
    const sprite = new Image()
    sprite.onload = () => { if (!cancelled) setSpriteAvailable(true) }
    sprite.onerror = () => { if (!cancelled) setSpriteAvailable(false) }
    sprite.src = data.spriteSheet
    return () => { cancelled = true }
  }, [data.spriteSheet])

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

  const pickProgress = easeInOut((progress - 0.84) / 0.12)

  return <div ref={playerRef} className={styles.player}>
    <div className={styles.scene} aria-label={`Bé gái hái quả ${data.fruitName}`}>
      <OrchardBackground />
      {data.targets.map((fruit: AnimatedQuestion33Target) => {
        const isDestination = fruit.id === data.destinationTargetId
        const isBeingPicked = isDestination && progress >= 0.84
        const basketX = Math.min(96, actorX + 0.8)
        const basketY = 80
        const pickedX = fruit.x + (basketX - fruit.x) * pickProgress
        const pickedY = fruit.y + (basketY - fruit.y) * pickProgress
        return <div
          key={fruit.id}
          className={`${styles.fruit} ${isBeingPicked ? styles.fruitPicked : ''}`}
          style={{
            left: `${isBeingPicked ? pickedX : fruit.x}%`,
            top: `${isBeingPicked ? pickedY : fruit.y}%`,
            opacity: 1,
            transform: `translate(-50%, -50%) scale(${isBeingPicked ? 1 - pickProgress * 0.43 : 1})`,
          }}
        >
          <FruitCropImage visual={fruit.visual} maxDimension={108} />
          <span className={styles.fruitLetter}>{fruit.letter}</span>
        </div>
      })}
      <div className={styles.girl} style={actorStyle} aria-label="Bé gái đi đến hái quả">
        {!spriteAvailable && <span aria-hidden="true">👧🏻</span>}
      </div>
      <span className="sr-only">Bé gái đi đến cây, hái một quả rồi bỏ vào giỏ.</span>
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

export default function AnimatedFruitHarvestQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, onAnswer, playingId, onPlayAudio } = props
  const data = question.data as unknown as AnimatedQuestion33Data
  const voiceId = `${question.id}:fruit-harvest-question`
  const allowedLetters = data.allowedLetters ?? data.options ?? []
  const displayedAnswer = typeof answer !== 'string'
    ? ''
    : question.type === 'text-input'
      ? answer
      : question.options?.find(option => option.id === answer)?.text ?? ''

  return <QuestionFrame {...props}>
    <div className={styles.question}>
      <AnimatedFruitHarvestPlayer
        data={data}
        audioVolume={props.audioVolume}
        onAudioVolumeChange={props.onAudioVolumeChange}
      />
      <div className={styles.answerLine}>
        <span>{data.taskText}</span>
        {question.type === 'text-input' ? <input
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={2}
          value={displayedAnswer}
          disabled={disabled}
          aria-label={`Điền chữ cái trên quả ${data.fruitName} bé gái hái`}
          onChange={event => onAnswer(question.id, sanitizeSingleVietnameseLetter(event.target.value, allowedLetters))}
          className={styles.letterBlank}
        /> : <select
          value={typeof answer === 'string' ? answer : ''}
          disabled={disabled}
          aria-label={`Chọn chữ trên quả ${data.fruitName} bé gái hái`}
          onChange={event => onAnswer(question.id, event.target.value)}
          className={examStyles.inlineQuestionSelect}
        >
          <option value="" disabled>Chọn đáp án</option>
          {(question.options ?? []).map(option => <option key={option.id} value={option.id}>{option.text ?? option.id}</option>)}
        </select>}
        <span>.</span>
      </div>
      <div className={examStyles.answerVoiceRow}>
        <ExamAudioButton
          compact
          active={playingId === voiceId}
          label={`Nghe câu ${question.number}`}
          disabled={data.voice.length === 0}
          onClick={() => { if (data.voice.length) onPlayAudio(voiceId, data.voice) }}
        />
      </div>
    </div>
  </QuestionFrame>
}

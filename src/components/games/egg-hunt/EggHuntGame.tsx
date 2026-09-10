'use client'

import { useEffect, useRef, useState } from 'react'
import { Shuffle } from 'lucide-react'
import GameShell from '../general/GameShell'
import GameCompletion from '../general/GameCompletion'
import GameLoadingScreen from '../general/GameLoadingScreen'
import useBackgroundMusic from '../general/useBackgroundMusic'
import { preloadAssets } from '../general/preloadAssets'
import { GAME_BACKGROUND_MUSIC } from '../general/audio'
import { useGameVoices } from '../general/useGameVoices'
import { availableNumbers, canCollect, createBoard, createRandomBoard, TARGET, type EggStyle } from './board'
import EggArt from './EggArt'
import FireworkBurst from './FireworkBurst'
import styles from './EggHuntGame.module.css'

const VOICES = [
  { key: 'ting', src: '/games/drag-drop/voices/ting.mp3' },
  { key: 'buzzer', src: '/games/drag-drop/voices/buzzer.mp3', volume: 0.25 },
  { key: 'roll-prompt', src: '/games/lessons/lop-1/toan/bai-2/egg-hunt/voices/be_hay_lac_xuc_xac_nao.mp3' },
  { key: 'intro', src: '/games/lessons/lop-1/toan/bai-2/egg-hunt/voices/intro.mp3' },
  { key: 'win', src: '/games/lessons/lop-1/toan/bai-2/egg-hunt/voices/gioi_qua_be_da_nhat_du.mp3' },
  ...Array.from({ length: 5 }, (_, i) => ({ key: `true-${i}`, src: `/games/general/voices/true-${i + 1}.mp3` })),
  ...Array.from({ length: 3 }, (_, i) => ({ key: `false-${i}`, src: `/games/general/voices/false-${i + 1}.mp3` })),
]
const PIPS = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]]
type Phase = 'ready' | 'rolling' | 'choose' | 'wrong' | 'collect' | 'celebrate' | 'done'

export default function EggHuntGame() {
  const [board, setBoard] = useState(createBoard)
  const randomized = useRef(false)
  const rollCounts = useRef<Record<number, number>>({})
  const [phase, setPhase] = useState<Phase>('ready')
  const phaseRef = useRef<Phase>('ready')
  const [muted, setMuted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [dice, setDice] = useState(1)
  const [result, setResult] = useState(1)
  const [score, setScore] = useState(0)
  const [basket, setBasket] = useState<EggStyle[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [hint, setHint] = useState(false)
  const [session, setSession] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const startMusic = useBackgroundMusic(!muted && !paused, isReady && gameStarted)
  const voices = useGameVoices(VOICES, gameStarted && !muted && !paused)
  const voicesRef = useRef(voices)
  voicesRef.current = voices
  const changePhase = (next: Phase) => { phaseRef.current = next; setPhase(next) }

  useEffect(() => {
    let cancelled = false
    void preloadAssets({
      images: [
        '/games/drag-drop/images/optimize/farm-background.png',
        '/games/general/images/optimize/player-avatar.png',
        '/games/general/images/optimize/ready-avatar.png',
        '/games/general/images/optimize/ready-cappy.png',
        '/games/general/images/optimize/ready-wolf.png',
      ],
      audio: [GAME_BACKGROUND_MUSIC, ...VOICES.map(voice => voice.src)],
    }, progress => { if (!cancelled) setLoadProgress(progress) }).then(() => {
      if (!cancelled) setIsReady(true)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!gameStarted) return
    const sessionVoices = voicesRef.current
    sessionVoices.scheduleIntro('intro')
    return () => sessionVoices.reset()
  }, [session, gameStarted])

  // Wait for feedback to finish before inviting another roll or celebrating.
  // Defer playback to avoid re-entering VoiceChannel while it is notifying listeners.
  useEffect(() => {
    if (!gameStarted || paused || muted || (phase !== 'ready' && phase !== 'celebrate' && phase !== 'done')) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const isReady = phase === 'ready'
    const unsubscribe = voices.channel.subscribe(busy => {
      clearTimeout(timer)
      if (busy) return
      timer = setTimeout(() => {
        voices.playOnce(isReady ? 'roll-prompt' : 'completion', isReady ? 'roll-prompt' : 'win', isReady ? 'intro' : 'win')
      }, 250)
    })
    return () => { clearTimeout(timer); unsubscribe() }
  }, [phase, paused, muted, voices, gameStarted])

  useEffect(() => {
    if (!gameStarted || paused) return
    if (phase === 'rolling') {
      const interval = window.setInterval(() => setDice(1 + Math.floor(Math.random() * 6)), 90)
      const timer = window.setTimeout(() => {
        setDice(result)
        changePhase('choose')
      }, 900)
      return () => { clearInterval(interval); clearTimeout(timer) }
    }
    if (phase === 'choose') {
      const timer = window.setTimeout(() => setHint(true), 10000)
      return () => clearTimeout(timer)
    }
    if (phase === 'wrong') {
      const timer = window.setTimeout(() => { setSelected(null); changePhase('choose') }, 750)
      return () => clearTimeout(timer)
    }
    if (phase === 'collect') {
      const timer = window.setTimeout(() => {
        const egg = board.eggs.find(e => e.id === selected)
        if (!egg) return
        setBasket(items => [...items, egg.spriteKey])
        setBoard(current => ({ ...current, eggs: current.eggs.map(e => e.id === selected ? { ...e, collected: true } : e) }))
        setSelected(null)
        changePhase(basket.length + 1 === TARGET ? 'celebrate' : 'ready')
      }, 1000)
      return () => clearTimeout(timer)
    }
    if (phase === 'celebrate') {
      const timer = window.setTimeout(() => changePhase('done'), 2800)
      return () => clearTimeout(timer)
    }
  }, [phase, paused, result, board.eggs, selected, basket.length, voices, gameStarted])

  const restart = () => {
    rollCounts.current = {}
    voices.reset()
    setSession(value => value + 1)
    setBoard(randomized.current ? createRandomBoard() : createBoard()); setBasket([]); setScore(0); setSelected(null)
    setHint(false); setDice(1); setResult(1); setPaused(false); changePhase('ready')
  }
  const shuffleBoard = () => {
    if (!gameStarted || paused) return
    randomized.current = true
    restart()
  }
  const roll = () => {
    if (!gameStarted || paused || phaseRef.current !== 'ready') return
    const numbers = availableNumbers(board.eggs, rollCounts.current)
    if (!numbers.length) return
    voices.reset()
    const nextResult = numbers[Math.floor(Math.random() * numbers.length)]
    rollCounts.current[nextResult] = (rollCounts.current[nextResult] ?? 0) + 1
    setResult(nextResult)
    setHint(false); changePhase('rolling')
  }
  const pick = (id: number) => {
    if (!gameStarted || paused || phaseRef.current !== 'choose') return
    const egg = board.eggs.find(e => e.id === id)
    if (!egg || egg.collected) return
    voices.reset()
    setSelected(id); setHint(false)
    if (canCollect(egg, result)) {
      changePhase('collect'); setScore(value => value + 10)
      voices.playEffect('ting'); voices.play(`true-${Math.floor(Math.random() * 5)}`, 'true')
    } else {
      changePhase('wrong'); setScore(value => Math.max(0, value - 2))
      voices.playEffect('buzzer'); voices.play(`false-${Math.floor(Math.random() * 3)}`, 'false')
    }
  }
  const flying = phase === 'collect' ? board.eggs.find(e => e.id === selected) : undefined

  return <GameShell score={score} currentRound={Math.min(basket.length + 1, TARGET)} totalRounds={TARGET} muted={muted} onMutedChange={setMuted} onPauseChange={setPaused} onRestart={restart} className={styles.shell}>
    <GameLoadingScreen progress={loadProgress} ready={isReady} unlockAudio={startMusic} onStart={() => setGameStarted(true)} />
    <div className={`${styles.play} ${paused ? styles.paused : ''}`}>
      <div className={styles.glass} />
      <button type="button" className={`${styles.dice} ${phase === 'rolling' ? styles.rolling : phase === 'ready' ? styles.invite : styles.diceResult}`} onClick={roll} disabled={paused || phase !== 'ready'} aria-label={phase === 'ready' ? 'Lắc xúc xắc' : `Xúc xắc: ${dice}`}>
        {phase === 'ready' ? <>
          <svg className={styles.idleDice} viewBox="0 0 100 100" aria-hidden="true">
            <ellipse cx="50" cy="88" rx="32" ry="6" fill="#794261" opacity=".16" />
            <path d="M13 25 Q12 18 21 15 L53 7 Q59 6 65 10 L87 23 Q93 27 89 35 L77 74 Q76 80 69 83 L48 93 Q43 95 37 91 L15 77 Q11 74 11 67Z" fill="#eda4c1" stroke="#cf84a7" strokeWidth="1.5" />
            <path d="M14 23 Q13 19 22 16 L53 9 Q58 8 64 11 L86 24 Q90 27 84 30 L48 43 Q44 44 39 41Z" fill="#ffe2ed" />
            <path d="M13 27 L39 44 Q43 46 43 52 L43 91 Q40 92 36 88 L17 76 Q13 73 13 67Z" fill="#ffc2da" />
            <path d="M47 48 Q47 45 52 43 L88 31 L76 73 Q75 78 69 81 L47 91Z" fill="#ed9fc0" />
            <path d="M16 22 L43 43 L85 28 M44 47 L45 89" fill="none" stroke="#fff5fa" strokeWidth="2" strokeLinecap="round" />
            <g fill="#34232e">
              {[[33, 19], [49, 15], [49, 27], [65, 23], [65, 35], [79, 30]].map(([cx, cy], i) => <ellipse key={i} cx={cx} cy={cy} rx="4.7" ry="2.6" transform={`rotate(20 ${cx} ${cy})`} />)}
              {[[21, 39], [33, 49], [26, 59], [20, 69], [34, 79]].map(([cx, cy], i) => <ellipse key={i} cx={cx} cy={cy} rx="3.3" ry="5" transform={`rotate(-15 ${cx} ${cy})`} />)}
              {[[75, 44], [63, 62], [53, 80]].map(([cx, cy], i) => <ellipse key={i} cx={cx} cy={cy} rx="3.7" ry="5.2" transform={`rotate(22 ${cx} ${cy})`} />)}
            </g>
          </svg>
          <span className={styles.sparkle} aria-hidden="true">✦</span>
          <svg className={styles.tapPrompt} viewBox="0 0 56 64" aria-hidden="true">
            <circle className={styles.tapRing} cx="20" cy="16" r="12" fill="none" stroke="#fff5a3" strokeWidth="3" />
            <path d="M15 35 V16 C15 9 24 9 24 16 V30 C26 25 32 27 32 31 C35 27 41 30 40 35 C45 32 50 36 48 42 L45 52 Q43 58 36 59 H28 Q23 59 19 54 L7 40 C3 34 10 30 15 35Z" fill="#fff7e8" stroke="#a4597d" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M24 30 V39 M32 32 V41 M40 36 V44" fill="none" stroke="#dca6b5" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </> : phase === 'rolling' ? <span className={styles.cubeStage} aria-hidden="true">
          <span className={styles.cube}>
            {['rotateY(0deg)', 'rotateY(90deg)', 'rotateX(90deg)', 'rotateX(-90deg)', 'rotateY(-90deg)', 'rotateY(180deg)'].map((rotation, face) => <span key={face} className={styles.cubeFace} style={{ transform: `${rotation} translateZ(8cqw)` }}>
              {Array.from({ length: 9 }, (_, i) => <span key={i} className={PIPS[face].includes(i) ? styles.pip : styles.empty} />)}
            </span>)}
          </span>
        </span> : Array.from({ length: 9 }, (_, i) => <span key={i} className={PIPS[dice - 1].includes(i) ? styles.pip : styles.empty} />)}
      </button>
      <svg className={styles.board} viewBox="0 0 352 420" aria-label="Bảng tam giác và giỏ trứng">
        {board.cells.map(cell => <g key={cell.id}>
          <polygon points={cell.points.map(p => `${p.x},${p.y}`).join(' ')} fill="#f8ffffe8" stroke="#20aaa9" strokeWidth="1.2" strokeLinejoin="round" />
          {cell.value !== null && <text x={cell.x} y={cell.y + 1} textAnchor="middle" dominantBaseline="central" className={hint && cell.value === result ? styles.hint : ''} fill="#35566b" fontSize="18" fontWeight="400">{cell.value}</text>}
        </g>)}
        {board.eggs.filter(e => !e.collected && e.id !== flying?.id).map((egg, index) => <g key={egg.id} transform={`translate(${egg.x} ${egg.y})`}>
          <g role="button" tabIndex={!paused && phase === 'choose' ? 0 : -1} aria-label={`Nhặt trứng ${index + 1}`} aria-disabled={paused || phase !== 'choose'} onClick={() => pick(egg.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pick(egg.id) } }} className={`${styles.egg} ${phase === 'wrong' && selected === egg.id ? styles.shake : ''}`}>
            <circle r="17" fill="transparent" /><EggArt color={egg.spriteKey} />
          </g>
        </g>)}
        <g aria-label={`Giỏ: ${basket.length} trên 6 trứng`}>
          <path d="M50 353 Q176 330 302 353 L289 403 Q176 422 63 403Z" fill="#d79545" stroke="#995423" strokeWidth="3" />
          <path d="M57 371 H295 M61 389 H291" stroke="#edb968" strokeWidth="4" />
          <ellipse cx="176" cy="353" rx="126" ry="13" fill="#79451f" stroke="#efb350" strokeWidth="6" />
          {Array.from({ length: TARGET }, (_, index) => <g key={index} transform={`translate(${76 + index * 40} 383)`}>
            <path d="M0 -16 C-8 -16 -13 -2 -13 6 C-13 22 13 22 13 6 C13 -2 8 -16 0 -16Z" fill="#b97432" stroke="#fff3cf" strokeDasharray="2 2" />
            {basket[index] !== undefined && <EggArt color={basket[index]} />}
          </g>)}
        </g>
        {flying && <g key={`burst-${flying.id}`} transform={`translate(${flying.x} ${flying.y})`}><FireworkBurst /></g>}
        {flying && <g key={flying.id} className={styles.flying} style={{ '--from-x': `${flying.x}px`, '--from-y': `${flying.y}px`, '--to-x': `${76 + basket.length * 40}px` } as React.CSSProperties}><EggArt color={flying.spriteKey} /></g>}
      </svg>
      {phase === 'celebrate' && <svg className={styles.celebration} viewBox="0 0 352 626" aria-hidden="true">
        {[{ x: 85, y: 210, delay: 0 }, { x: 265, y: 180, delay: .4 }, { x: 176, y: 125, delay: .8 }].map(({ x, y, delay }, index) => <g key={index} transform={`translate(${x} ${y})`}>
          <g className={styles.rocket} style={{ '--launch-y': `${570 - y}px`, animationDelay: `${delay}s` } as React.CSSProperties}>
            <path d="M0 3 L0 28" stroke="#ffd75e" strokeWidth="2" strokeLinecap="round" opacity=".65" />
            <circle r="3" fill="#fff4bf" />
          </g>
          <FireworkBurst radius={70} count={24} delay={delay + .65} />
        </g>)}
      </svg>}
      <p className="sr-only" role="status">{phase === 'ready' ? 'Bấm xúc xắc để bắt đầu.' : phase === 'wrong' ? 'Chưa đúng, bé thử lại nhé.' : phase === 'done' ? 'Bé đã nhặt đủ 6 trứng!' : `Xúc xắc ${dice}. Giỏ có ${basket.length} trứng.`}</p>
    </div>
    <button type="button" className={styles.shuffleButton} onClick={shuffleBoard} disabled={paused || phase === 'done' || phase === 'celebrate'} aria-label="Xáo trộn số và trứng, chơi lại từ đầu" title="Xáo trộn và chơi lại"><Shuffle aria-hidden="true" /><span>Xáo trộn số</span></button>
    {phase === 'done' && <GameCompletion score={score} maxScore={60} onRestart={restart} />}
  </GameShell>
}

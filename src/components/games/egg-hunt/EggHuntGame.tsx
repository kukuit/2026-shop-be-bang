'use client'

import { useEffect, useRef, useState } from 'react'
import GameShell from '../general/GameShell'
import GameCompletion from '../general/GameCompletion'
import { useGameVoices } from '../general/useGameVoices'
import { availableNumbers, canCollect, createBoard, EGG_CELLS, TARGET, type EggStyle } from './board'
import EggArt from './EggArt'
import styles from './EggHuntGame.module.css'

const VOICES = [
  { key: 'ting', src: '/games/drag-drop/voices/ting.mp3' },
  { key: 'buzzer', src: '/games/drag-drop/voices/buzzer.mp3', volume: 0.25 },
  { key: 'win', src: '/games/general/voices/win.mp3' },
  ...Array.from({ length: 5 }, (_, i) => ({ key: `true-${i}`, src: `/games/general/voices/true-${i + 1}.mp3` })),
  ...Array.from({ length: 3 }, (_, i) => ({ key: `false-${i}`, src: `/games/general/voices/false-${i + 1}.mp3` })),
]
const PIPS = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]]
type Phase = 'ready' | 'rolling' | 'choose' | 'wrong' | 'collect' | 'celebrate' | 'done'

export default function EggHuntGame() {
  const [board, setBoard] = useState(createBoard)
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
  const voices = useGameVoices(VOICES, !muted && !paused)
  const changePhase = (next: Phase) => { phaseRef.current = next; setPhase(next) }

  useEffect(() => {
    if (muted || paused) window.speechSynthesis?.cancel()
    return () => window.speechSynthesis?.cancel()
  }, [muted, paused])

  useEffect(() => {
    if (paused) return
    if (phase === 'rolling') {
      const interval = window.setInterval(() => setDice(1 + Math.floor(Math.random() * 6)), 90)
      const timer = window.setTimeout(() => {
        setDice(result)
        changePhase('choose')
        if (!muted && 'speechSynthesis' in window) {
          const speech = new SpeechSynthesisUtterance(['Một', 'Hai', 'Ba', 'Bốn', 'Năm', 'Sáu'][result - 1])
          speech.lang = 'vi-VN'
          speech.rate = 0.8
          window.speechSynthesis.cancel()
          window.speechSynthesis.speak(speech)
        }
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
      voices.playOnce('completion', 'win', 'win')
      const timer = window.setTimeout(() => changePhase('done'), 1800)
      return () => clearTimeout(timer)
    }
  }, [phase, paused, result, muted, board.eggs, selected, basket.length, voices])

  const restart = () => {
    voices.reset()
    window.speechSynthesis?.cancel()
    setBoard(createBoard()); setBasket([]); setScore(0); setSelected(null)
    setHint(false); setDice(1); setPaused(false); changePhase('ready')
  }
  const roll = () => {
    if (paused || phaseRef.current !== 'ready') return
    const numbers = availableNumbers(board.eggs)
    if (!numbers.length) return
    voices.reset()
    setResult(numbers[Math.floor(Math.random() * numbers.length)])
    setHint(false); changePhase('rolling')
  }
  const pick = (id: number) => {
    if (paused || phaseRef.current !== 'choose') return
    const egg = board.eggs.find(e => e.id === id)
    if (!egg || egg.collected) return
    window.speechSynthesis?.cancel()
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

  return <GameShell score={score} currentRound={1} totalRounds={1} muted={muted} onMutedChange={setMuted} onPauseChange={setPaused} onRestart={restart} className={styles.shell}>
    <div className={`${styles.play} ${paused ? styles.paused : ''}`}>
      <div className={styles.glass} />
      <button type="button" className={`${styles.dice} ${phase === 'rolling' ? styles.rolling : phase === 'ready' ? styles.invite : ''}`} onClick={roll} disabled={paused || phase !== 'ready'} aria-label={phase === 'ready' ? 'Lắc xúc xắc' : `Xúc xắc: ${dice}`}>
        {Array.from({ length: 9 }, (_, i) => <span key={i} className={PIPS[dice - 1].includes(i) ? styles.pip : styles.empty} />)}
      </button>
      <svg className={styles.board} viewBox="0 0 352 420" aria-label="Bảng tam giác và giỏ trứng">
        {board.cells.map(cell => <g key={cell.id}>
          <polygon points={cell.points.map(p => `${p.x},${p.y}`).join(' ')} fill="#f8ffffe8" stroke="#20aaa9" strokeWidth="1.2" strokeLinejoin="round" />
          {!EGG_CELLS.includes(cell.id) && <text x={cell.x} y={cell.y + 1} textAnchor="middle" dominantBaseline="central" className={hint && cell.value === result ? styles.hint : ''} fill="#35566b" fontSize="16" fontWeight="800">{cell.value}</text>}
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
        {flying && <g key={flying.id} className={styles.flying} style={{ '--from-x': `${flying.x}px`, '--from-y': `${flying.y}px`, '--to-x': `${76 + basket.length * 40}px` } as React.CSSProperties}><EggArt color={flying.spriteKey} /></g>}
      </svg>
      {phase === 'celebrate' && <div className={styles.celebration} aria-hidden="true">✨ ⭐ ✨<br />🎉</div>}
      <p className="sr-only" role="status">{phase === 'ready' ? 'Bấm xúc xắc để bắt đầu.' : phase === 'wrong' ? 'Chưa đúng, bé thử lại nhé.' : phase === 'done' ? 'Bé đã nhặt đủ 6 trứng!' : `Xúc xắc ${dice}. Giỏ có ${basket.length} trứng.`}</p>
    </div>
    {phase === 'done' && <GameCompletion score={score} maxScore={60} onRestart={restart} />}
  </GameShell>
}

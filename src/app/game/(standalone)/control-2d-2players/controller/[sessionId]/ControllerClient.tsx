'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Bomb, Crosshair, Flame, Heart, Smartphone, Snowflake, Wifi } from 'lucide-react'
import { useControl3DConnection } from '@/lib/control-3d/use-control-3d-connection'
import { EMPTY_PLAYER_INPUT } from '@/lib/control-3d/game-rules.mjs'
import type { GameStatusPacket, PlayerInput } from '@/lib/control-3d/types'
import { MAX_PLAYER_HEARTS } from '../../constants'
import styles from './controller.module.css'

type Props = { sessionId: string; playerId: 1 | 2 }
type RemoteInput = { aimX: number; aimY: number; fire: boolean; skillQ: boolean; skillE: boolean; weaponCannon: boolean; weaponIce: boolean }

export default function ControllerClient({ sessionId, playerId }: Props) {
  const [input, setInput] = useState<PlayerInput>({ ...EMPTY_PLAYER_INPUT })
  const [gameStatus, setGameStatus] = useState<GameStatusPacket | null>(null)
  const inputRef = useRef(input)
  const actionTimers = useRef<Partial<Record<'skillQ' | 'skillE' | 'weaponCannon' | 'weaponIce', number>>>({})
  const connectedBefore = useRef(false)
  inputRef.current = input
  const onPacket = useCallback((packet: { type: string; status?: GameStatusPacket }) => {
    if (packet.type === 'GAME_STATUS' && packet.status) setGameStatus(packet.status)
  }, [])
  const { state } = useControl3DConnection({ enabled: true, role: 'controller', sessionId, playerId, input, onPacket })
  const connected = state === 'connected'
  const rejected = state === 'rejected'
  const player = gameStatus?.players?.[playerId - 1]
  const canActivateWeapon = connected && gameStatus?.gameStatus === 'PLAYING' && !player?.weaponMode && (player?.hp ?? 0) > 0

  const publish = useCallback((patch: Partial<RemoteInput>) => {
    const next = { ...inputRef.current, ...patch }
    inputRef.current = next
    setInput(next)
  }, [])
  const aim = useCallback((x: number, y: number) => publish({ aimX: x, aimY: y }), [publish])
  const fire = useCallback((value: boolean) => publish({ fire: value }), [publish])
  const pulseAction = useCallback((action: 'skillQ' | 'skillE' | 'weaponCannon' | 'weaponIce') => {
    window.clearTimeout(actionTimers.current[action])
    publish({ [action]: true })
    actionTimers.current[action] = window.setTimeout(() => publish({ [action]: false }), 140)
  }, [publish])
  const reset = useCallback(() => {
    Object.values(actionTimers.current).forEach((timer) => window.clearTimeout(timer))
    actionTimers.current = {}
    publish({ aimX: 0, aimY: 0, fire: false, skillQ: false, skillE: false, weaponCannon: false, weaponIce: false })
  }, [publish])

  useEffect(() => {
    if (connectedBefore.current && !connected) reset()
    connectedBefore.current = connected
  }, [connected, reset])
  useEffect(() => {
    const clear = () => reset()
    const visibility = () => { if (document.hidden) clear() }
    window.addEventListener('blur', clear)
    window.addEventListener('pagehide', clear)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('blur', clear)
      window.removeEventListener('pagehide', clear)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [reset])

  return <main className={`${styles.controller} ${playerId === 1 ? styles.playerOne : styles.playerTwo}`}>
    <header className={styles.header}>
      <div className={styles.playerTag}><strong>P{playerId}</strong><span className={styles.dot} /><b>{connected ? 'ĐÃ KẾT NỐI' : rejected ? 'PHIÊN HẾT HẠN' : 'ĐANG KẾT NỐI'}</b></div>
      <div className={styles.phoneStatus}><span><Heart size={15} fill="currentColor" /> {player ? `${player.hp}/${player.maxHp} · ${player.maxHealth ? Math.ceil((player.health ?? player.maxHealth) / player.maxHealth * 100) : 100}%` : `${MAX_PLAYER_HEARTS}/${MAX_PLAYER_HEARTS} · 100%`}</span><span><Crosshair size={15} /> {player ? `${player.ammo}/${player.maxAmmo}` : '30/30'}</span>{player?.weaponMode && <span><Bomb size={15} /> {player.weaponMode === 'cannon' ? 'PHÁO' : 'BĂNG'} {Math.ceil((player.weaponRemaining ?? 0) / 1000)}s</span>}</div>
    </header>
    <div className={styles.playDeck}>
      <TouchStick disabled={!connected} onChange={aim} />
      <div className={styles.skillButtons}>
        <button type="button" className={`${styles.skillButton} ${input.skillQ ? styles.skillActive : ''}`} disabled={!connected} onClick={() => pulseAction('skillQ')} aria-label="Dùng kỹ năng lửa Q">
          <Flame size={23} fill="currentColor" /><b>Q</b><small>LỬA</small>
        </button>
        <button type="button" className={`${styles.skillButton} ${styles.skillFreeze} ${input.skillE ? styles.skillActive : ''}`} disabled={!connected} onClick={() => pulseAction('skillE')} aria-label="Dùng kỹ năng đóng băng E">
          <Snowflake size={23} /><b>E</b><small>ĐÓNG</small>
        </button>
      </div>
      <div className={styles.weaponButtons}>
        <button type="button" className={`${styles.weaponButton} ${styles.cannonButton} ${input.weaponCannon ? styles.skillActive : ''}`} disabled={!canActivateWeapon || (player?.weaponInventory?.cannon ?? 0) <= 0} onClick={() => pulseAction('weaponCannon')} aria-label={`Kích hoạt súng pháo bắn nhanh trong 10 giây, còn ${player?.weaponInventory?.cannon ?? 0} lượt`}><Image src="/games/control-2d-2players/weapon-cannon.png" alt="" width={54} height={38} /><small>{player?.weaponMode === 'cannon' ? `${Math.ceil((player.weaponRemaining ?? 0) / 1000)}s` : `PHÁO ×${player?.weaponInventory?.cannon ?? 0}`}</small></button>
        <button type="button" className={`${styles.weaponButton} ${styles.iceButton} ${input.weaponIce ? styles.skillActive : ''}`} disabled={!canActivateWeapon || (player?.weaponInventory?.ice ?? 0) <= 0} onClick={() => pulseAction('weaponIce')} aria-label={`Kích hoạt súng băng gây sát thương gấp đôi trong 10 giây, còn ${player?.weaponInventory?.ice ?? 0} lượt`}><Image src="/games/control-2d-2players/weapon-ice.png" alt="" width={54} height={38} /><small>{player?.weaponMode === 'ice' ? `${Math.ceil((player.weaponRemaining ?? 0) / 1000)}s` : `BĂNG ×${player?.weaponInventory?.ice ?? 0}`}</small></button>
      </div>
      <button
        type="button"
        className={`${styles.fireButton} ${input.fire ? styles.fireActive : ''}`}
        disabled={!connected}
        onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); fire(true) }}
        onPointerUp={() => fire(false)}
        onPointerCancel={() => fire(false)}
        onLostPointerCapture={() => fire(false)}
        aria-label="Giữ để bắn"
      ><span className={styles.fireCore}><Crosshair size={42} strokeWidth={2.4} /></span><strong>BẮN</strong><small>GIỮ ĐỂ BẮN LIÊN TỤC</small></button>
    </div>
    {rejected && <div className={styles.notice}>Phiên chơi không còn hoạt động. Hãy quét lại mã QR trên máy tính.</div>}
    <div className={styles.landscapeNotice}><Smartphone size={22} /><span>Xoay ngang điện thoại để chơi</span></div>
    <footer className={styles.footer}><Wifi size={14} /> Tay cầm P{playerId} · Ngắm, bắn, kỹ năng và súng hỗ trợ</footer>
  </main>
}

function TouchStick({ disabled, onChange }: { disabled: boolean; onChange: (x: number, y: number) => void }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)
  const pointer = useRef<number | null>(null)
  const update = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const radius = Math.min(rect.width, rect.height) * 0.34
    const dx = event.clientX - rect.left - rect.width / 2
    const dy = event.clientY - rect.top - rect.height / 2
    const length = Math.hypot(dx, dy)
    const factor = length > radius ? radius / length : 1
    let x = Math.max(-1, Math.min(1, dx * factor / radius))
    let y = Math.max(-1, Math.min(1, -dy * factor / radius))
    const magnitude = Math.hypot(x, y)
    if (magnitude < 0.1) { x = 0; y = 0 }
    else if (magnitude > 1) { x /= magnitude; y /= magnitude }
    setKnob({ x: dx * factor, y: dy * factor })
    onChange(x, y)
  }
  const end = useCallback((event?: React.PointerEvent<HTMLDivElement>) => {
    if (event && pointer.current !== event.pointerId) return
    pointer.current = null
    setActive(false)
    setKnob({ x: 0, y: 0 })
    onChange(0, 0)
  }, [onChange])
  useEffect(() => { end() }, [end])
  return <div
    className={`${styles.stick} ${active ? styles.stickActive : ''} ${disabled ? styles.disabled : ''}`}
    onPointerDown={(event) => { if (disabled || pointer.current !== null) return; event.preventDefault(); pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); setActive(true); update(event) }}
    onPointerMove={(event) => { if (pointer.current === event.pointerId) update(event) }}
    onPointerUp={end}
    onPointerCancel={end}
    onLostPointerCapture={end}
    role="application"
    aria-label="Joystick ngắm"
  ><span className={styles.stickRing}><Crosshair size={28} /></span><span className={styles.knob} style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} /><b>NGẮM</b></div>
}

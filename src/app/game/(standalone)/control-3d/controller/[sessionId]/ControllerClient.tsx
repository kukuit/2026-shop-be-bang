'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useControl3DConnection } from '@/lib/control-3d/use-control-3d-connection'
import { EMPTY_PLAYER_INPUT } from '@/lib/control-3d/game-rules.mjs'
import type { PlayerInput } from '@/lib/control-3d/types'
import { ArrowUp, Crosshair, Gamepad2, Menu as MenuIcon, RotateCcw, Smartphone } from 'lucide-react'
import styles from './controller.module.css'

type Props = { sessionId: string }
type OneShotAction = 'menu' | 'reload'

export default function ControllerClient({ sessionId }: Props) {
  const [input, setInput] = useState<PlayerInput>({ ...EMPTY_PLAYER_INPUT })
  const [resetVersion, setResetVersion] = useState(0)
  const [activeAction, setActiveAction] = useState<OneShotAction | null>(null)
  const lastConnected = useRef(false)
  const inputRef = useRef(input)
  const actionTimers = useRef<Record<OneShotAction, number | null>>({ menu: null, reload: null })
  inputRef.current = input

  const { state: connectionState, sendInput } = useControl3DConnection({
    enabled: true,
    role: 'controller',
    sessionId,
    input,
  })
  const connected = connectionState === 'connected'
  const rejected = connectionState === 'rejected'
  const connectionLabel = connected ? 'CONNECTED' : connectionState === 'connecting' ? 'CONNECTING' : 'DISCONNECTED'

  const publishInput = useCallback((next: PlayerInput) => {
    inputRef.current = next
    setInput(next)
    sendInput(next)
  }, [sendInput])

  const patchInput = useCallback((patch: Partial<PlayerInput>) => {
    publishInput({ ...inputRef.current, ...patch })
  }, [publishInput])

  const changeMove = useCallback((x: number, y: number) => {
    patchInput({ moveX: x, moveY: y })
  }, [patchInput])
  const changeAim = useCallback((x: number, y: number) => {
    patchInput({ aimX: -x, aimY: -y })
  }, [patchInput])
  const changeFire = useCallback((value: boolean) => patchInput({ fire: value }), [patchInput])
  const changeJump = useCallback((value: boolean) => patchInput({ jump: value }), [patchInput])

  const clearActionTimers = useCallback(() => {
    for (const action of ['menu', 'reload'] as const) {
      const timer = actionTimers.current[action]
      if (timer !== null) window.clearTimeout(timer)
      actionTimers.current[action] = null
    }
  }, [])

  const resetAll = useCallback(() => {
    clearActionTimers()
    publishInput({ ...EMPTY_PLAYER_INPUT })
    setActiveAction(null)
    setResetVersion((value) => value + 1)
  }, [clearActionTimers, publishInput])

  const activateAction = useCallback((action: OneShotAction) => {
    if (!connected || actionTimers.current[action] !== null) return

    patchInput(action === 'menu' ? { menu: true } : { reload: true })
    setActiveAction(action)
    actionTimers.current[action] = window.setTimeout(() => {
      actionTimers.current[action] = null
      patchInput(action === 'menu' ? { menu: false } : { reload: false })
      setActiveAction((current) => current === action ? null : current)
    }, 180)
  }, [connected, patchInput])

  useEffect(() => {
    const clear = () => resetAll()
    const onVisibility = () => { if (document.hidden) clear() }
    window.addEventListener('blur', clear)
    window.addEventListener('pagehide', clear)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('blur', clear)
      window.removeEventListener('pagehide', clear)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [resetAll])

  useEffect(() => {
    if (lastConnected.current && !connected) resetAll()
    lastConnected.current = connected
  }, [connected, resetAll])

  useEffect(() => () => clearActionTimers(), [clearActionTimers])

  const connectionClass = connected ? styles.connected : rejected ? styles.disconnected : styles.connecting

  return <main className={styles.controller} aria-label="Mobile game controller">
    <header className={styles.controllerHeader}>
      <div className={`${styles.playerState} ${connectionClass}`} aria-live="polite">
        <strong>P1</strong><span className={styles.connectionDot} /><span>{connectionLabel}</span>
      </div>
      <div className={styles.headerActions}>
        <ActionButton
          className={`${styles.headerButton} ${styles.menuButton} ${activeAction === 'menu' ? styles.actionActive : ''}`}
          label="MENU"
          icon={<MenuIcon size={16} />}
          disabled={!connected}
          onPress={() => activateAction('menu')}
        />
        <ActionButton
          className={`${styles.headerButton} ${styles.reloadButton} ${activeAction === 'reload' ? styles.actionActive : ''}`}
          label="RELOAD"
          icon={<RotateCcw size={16} />}
          disabled={!connected}
          onPress={() => activateAction('reload')}
        />
      </div>
    </header>

    <div className={styles.controllerDeck} aria-label="Touch controls">
      <TouchStick className={styles.moveStick} label="MOVE" icon={<Gamepad2 size={21} />} resetVersion={resetVersion} disabled={!connected} onChange={changeMove} />
      <TouchStick className={styles.aimStick} label="AIM" icon={<Crosshair size={21} />} resetVersion={resetVersion} disabled={!connected} response="progressive" onChange={changeAim} />
      <div className={styles.actionCluster}>
        <TouchButton className={styles.fireButton} label="FIRE" icon={<Crosshair size={25} />} resetVersion={resetVersion} disabled={!connected} onValue={changeFire} />
        <TouchButton className={styles.jumpButton} label="JUMP" icon={<ArrowUp size={19} />} resetVersion={resetVersion} disabled={!connected} onValue={changeJump} />
      </div>
    </div>

    {!connected && !rejected && <div className={styles.connectionNotice} role="status">Waiting for the game connection</div>}
    {rejected && <div className={styles.connectionNotice} role="alert">This controller session is unavailable. Scan a new QR code on the PC.</div>}
    <div className={styles.portraitMessage}><Smartphone size={23} /><span>Rotate your phone to landscape</span></div>
  </main>
}

function TouchStick({ className, label, icon, resetVersion, disabled, response = 'linear', onChange }: {
  className: string
  label: string
  icon: React.ReactNode
  resetVersion: number
  disabled: boolean
  response?: 'linear' | 'progressive'
  onChange: (x: number, y: number) => void
}) {
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)
  const pointerId = useRef<number | null>(null)

  const update = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const radius = Math.min(rect.width, rect.height) * 0.33
    const dx = event.clientX - rect.left - rect.width / 2
    const dy = event.clientY - rect.top - rect.height / 2
    const length = Math.hypot(dx, dy)
    const factor = length > radius ? radius / length : 1
    let x = Math.max(-1, Math.min(1, dx * factor / radius))
    let y = Math.max(-1, Math.min(1, -dy * factor / radius))
    const deadzone = 0.09
    const magnitude = Math.hypot(x, y)
    if (magnitude < deadzone) {
      x = 0
      y = 0
    } else if (response === 'progressive') {
      const adjustedMagnitude = (magnitude - deadzone) / (1 - deadzone)
      const outputMagnitude = adjustedMagnitude * adjustedMagnitude
      const scale = outputMagnitude / magnitude
      x *= scale
      y *= scale
    }
    setKnob({ x: dx * factor, y: dy * factor })
    onChange(x, y)
  }

  const end = useCallback((event?: React.PointerEvent<HTMLDivElement>) => {
    if (event && pointerId.current !== event.pointerId) return
    pointerId.current = null
    setActive(false)
    setKnob({ x: 0, y: 0 })
    onChange(0, 0)
  }, [onChange])

  useEffect(() => { end() }, [end, resetVersion])

  return <div
    className={`${styles.stick} ${className} ${active ? styles.stickActive : ''} ${disabled ? styles.disabled : ''}`}
    onPointerDown={(event) => {
      if (disabled || pointerId.current !== null) return
      event.preventDefault()
      pointerId.current = event.pointerId
      event.currentTarget.setPointerCapture(event.pointerId)
      setActive(true)
      update(event)
    }}
    onPointerMove={(event) => { if (pointerId.current === event.pointerId) update(event) }}
    onPointerUp={end}
    onPointerCancel={end}
    onLostPointerCapture={end}
    role="application"
    aria-label={`${label} joystick`}
  >
    <span className={styles.stickGlow} />
    <span className={styles.stickRing} />
    <span className={styles.stickCrosshair} />
    <span className={styles.stickKnob} style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}>{icon}</span>
  </div>
}

function TouchButton({ className, label, icon, resetVersion, disabled, onValue }: {
  className: string
  label: string
  icon: React.ReactNode
  resetVersion: number
  disabled: boolean
  onValue: (value: boolean) => void
}) {
  const pointerId = useRef<number | null>(null)
  const [pressed, setPressed] = useState(false)

  const end = useCallback((event?: React.PointerEvent<HTMLButtonElement>) => {
    if (event && pointerId.current !== event.pointerId) return
    pointerId.current = null
    setPressed(false)
    onValue(false)
  }, [onValue])

  useEffect(() => { end() }, [end, resetVersion])

  return <button
    type="button"
    className={`${className} ${pressed ? styles.buttonPressed : ''} ${disabled ? styles.disabled : ''}`}
    disabled={disabled}
    onPointerDown={(event) => {
      if (disabled || pointerId.current !== null) return
      event.preventDefault()
      pointerId.current = event.pointerId
      event.currentTarget.setPointerCapture(event.pointerId)
      setPressed(true)
      onValue(true)
    }}
    onPointerUp={end}
    onPointerCancel={end}
    onLostPointerCapture={end}
    aria-label={label}
  >
    {icon}<span>{label}</span>
  </button>
}

function ActionButton({ className, label, icon, disabled, onPress }: {
  className: string
  label: string
  icon: React.ReactNode
  disabled: boolean
  onPress: () => void
}) {
  const pointerId = useRef<number | null>(null)

  const end = (event?: React.PointerEvent<HTMLButtonElement>) => {
    if (event && pointerId.current !== event.pointerId) return
    pointerId.current = null
  }

  return <button
    type="button"
    className={`${className} ${disabled ? styles.disabled : ''}`}
    disabled={disabled}
    onPointerDown={(event) => {
      if (disabled || pointerId.current !== null) return
      event.preventDefault()
      pointerId.current = event.pointerId
      event.currentTarget.setPointerCapture(event.pointerId)
      onPress()
    }}
    onPointerUp={end}
    onPointerCancel={end}
    onLostPointerCapture={end}
  >
    {icon}<span>{label}</span>
  </button>
}

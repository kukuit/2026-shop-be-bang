'use client'

import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { MoveInput } from './types'
import styles from './demo.module.css'

export default function MobileJoystick({ onMove, onJump, disabled = false, showJump = true, flightMode = false }: { onMove: (move: MoveInput) => void; onJump: () => void; disabled?: boolean; showJump?: boolean; flightMode?: boolean }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const pointerId = useRef<number | null>(null)
  const movement = useRef<MoveInput>({ x: 0, z: 0 })
  const lift = useRef(0)
  const emit = (x: number, z: number) => { movement.current = { x, z }; onMove({ x, z, y: lift.current }) }
  const setLift = (value: number) => { lift.current = value; onMove({ ...movement.current, y: value }) }
  const update = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect(), radius = rect.width * 0.34
    const dx = event.clientX - (rect.left + rect.width / 2), dy = event.clientY - (rect.top + rect.height / 2)
    const length = Math.hypot(dx, dy), scale = length > radius ? radius / length : 1
    const x = dx * scale / radius, y = dy * scale / radius
    setKnob({ x: dx * scale, y: dy * scale }); emit(x, -y)
  }
  const end = () => { pointerId.current = null; setKnob({ x: 0, y: 0 }); emit(0, 0) }
  return <div className={styles.mobileControls} data-camera-ignore style={disabled ? { pointerEvents: 'none' } : undefined}>
    <div className={styles.joystick} onPointerDown={(event) => { event.preventDefault(); pointerId.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); update(event) }} onPointerMove={(event) => { if (pointerId.current === event.pointerId) update(event) }} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} aria-label="Cần điều khiển di chuyển">
      <span className={styles.joystickRing} /><span className={styles.joystickKnob} style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}>✦</span>
    </div>
    {showJump && (flightMode
      ? <div className={styles.flightButtons}>
        <button type="button" className={styles.jumpButton} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setLift(1) }} onPointerUp={() => setLift(0)} onPointerCancel={() => setLift(0)}><span>↑</span>LÊN</button>
        <button type="button" className={styles.jumpButton} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setLift(-1) }} onPointerUp={() => setLift(0)} onPointerCancel={() => setLift(0)}><span>↓</span>XUỐNG</button>
      </div>
      : <button type="button" className={styles.jumpButton} onPointerDown={(event) => { event.preventDefault(); onJump() }}><span>↑</span>JUMP</button>)}
  </div>
}

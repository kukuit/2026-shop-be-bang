'use client'

import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { MoveInput } from './types'
import styles from './demo.module.css'

export default function MobileJoystick({ onMove, onJump }: { onMove: (move: MoveInput) => void; onJump: () => void }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const pointerId = useRef<number | null>(null)
  const update = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect(), radius = rect.width * 0.34
    const dx = event.clientX - (rect.left + rect.width / 2), dy = event.clientY - (rect.top + rect.height / 2)
    const length = Math.hypot(dx, dy), scale = length > radius ? radius / length : 1
    const x = dx * scale / radius, y = dy * scale / radius
    setKnob({ x: dx * scale, y: dy * scale }); onMove({ x, z: -y })
  }
  const end = () => { pointerId.current = null; setKnob({ x: 0, y: 0 }); onMove({ x: 0, z: 0 }) }
  return <div className={styles.mobileControls}>
    <div className={styles.joystick} onPointerDown={(event) => { pointerId.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); update(event) }} onPointerMove={(event) => { if (pointerId.current === event.pointerId) update(event) }} onPointerUp={end} onPointerCancel={end} aria-label="Cần điều khiển di chuyển">
      <span className={styles.joystickRing} /><span className={styles.joystickKnob} style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}>✦</span>
    </div>
    <button type="button" className={styles.jumpButton} onPointerDown={(event) => event.preventDefault()} onClick={onJump}><span>↑</span>JUMP</button>
  </div>
}

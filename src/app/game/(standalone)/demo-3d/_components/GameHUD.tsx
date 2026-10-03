'use client'

import styles from './demo.module.css'
import { Camera } from 'lucide-react'

export default function GameHUD({ soundOn, onToggleSound, onCycleCamera, rocketFlight = false }: { soundOn: boolean; onToggleSound: () => void; onCycleCamera: () => void; rocketFlight?: boolean }) {
  return <header className={styles.hud} data-camera-ignore>
    <div className={styles.avatar} aria-label="Cappy"><span>🐻</span><i /></div>
    <div className={styles.brand}><span>✦</span><strong>CAPPY WORLD</strong><small>3D ADVENTURE</small></div>
    <div className={styles.hudActions}><div className={styles.coins}>🪙 <b>125</b></div><button type="button" className={styles.iconButton} aria-label="Đổi góc camera" title="Đổi góc camera" onClick={onCycleCamera}><Camera size={18} /></button><button type="button" className={styles.iconButton} aria-label={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'} onClick={onToggleSound}>{soundOn ? '♪' : '♫'}</button><button type="button" className={styles.iconButton} aria-label="Hướng dẫn điều khiển" onClick={() => window.alert(rocketFlight ? 'Tên lửa: W / ↑ tăng tốc, S / ↓ lùi, A / D hoặc ← / → quay; Space / Shift ngẩng / cúi. Mobile: joystick lên / xuống tiến / lùi, trái / phải quay; nút LÊN / XUỐNG ngẩng / cúi và bay. Kéo / vuốt đổi hướng, cuộn / chụm zoom.' : 'Di chuyển: WASD hoặc phím mũi tên. Space để nhảy; kéo / vuốt xoay camera; cuộn / chụm để zoom.')}>?</button></div>
  </header>
}

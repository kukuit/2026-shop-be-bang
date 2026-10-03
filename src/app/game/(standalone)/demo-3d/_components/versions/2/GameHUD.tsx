'use client'

import styles from './demo.module.css'
import { Camera } from 'lucide-react'

export default function GameHUD({ soundOn, onToggleSound, onCycleCamera }: { soundOn: boolean; onToggleSound: () => void; onCycleCamera: () => void }) {
  return <header className={styles.hud} data-camera-ignore>
    <div className={styles.avatar} aria-label="Cappy"><span>🐻</span><i /></div>
    <div className={styles.brand}><span>✦</span><strong>CAPPY WORLD</strong><small>3D ADVENTURE</small></div>
    <div className={styles.hudActions}><div className={styles.coins}>🪙 <b>125</b></div><button type="button" className={styles.iconButton} aria-label="Đổi góc camera" title="Đổi góc camera" onClick={onCycleCamera}><Camera size={18} /></button><button type="button" className={styles.iconButton} aria-label={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'} onClick={onToggleSound}>{soundOn ? '♪' : '♫'}</button><button type="button" className={styles.iconButton} aria-label="Hướng dẫn điều khiển" onClick={() => window.alert('Di chuyển: WASD hoặc phím mũi tên · Nhảy: Space · Xoay camera: kéo chuột hoặc vuốt vùng chơi · Cuộn/pinch để zoom · Tới gần cổng để vào chơi')}>?</button></div>
  </header>
}

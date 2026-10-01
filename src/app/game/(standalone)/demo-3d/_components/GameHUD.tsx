'use client'

import styles from './demo.module.css'

export default function GameHUD({ soundOn, onToggleSound }: { soundOn: boolean; onToggleSound: () => void }) {
  return <header className={styles.hud}>
    <div className={styles.avatar} aria-label="Cappy"><span>🐻</span><i /></div>
    <div className={styles.brand}><span>✦</span><strong>CAPPY WORLD</strong><small>3D ADVENTURE</small></div>
    <div className={styles.hudActions}><div className={styles.coins}>🪙 <b>125</b></div><button type="button" className={styles.iconButton} aria-label={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'} onClick={onToggleSound}>{soundOn ? '♪' : '♫'}</button><button type="button" className={styles.iconButton} aria-label="Hướng dẫn điều khiển" onClick={() => window.alert('Di chuyển: WASD hoặc phím mũi tên · Nhảy: Space · Xoay camera: kéo chuột hoặc vuốt bên phải · Tới gần cổng để vào chơi')}>?</button></div>
  </header>
}

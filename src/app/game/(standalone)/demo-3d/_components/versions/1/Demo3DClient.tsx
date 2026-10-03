'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState } from 'react'
import GameHUD from './GameHUD'
import MobileJoystick from './MobileJoystick'
import type { PortalInfo } from './types'
import type { CameraMode } from './camera-config'
import styles from './demo.module.css'

const GameWorld = dynamic(() => import('./GameWorld'), { ssr: false })

export default function Demo3DClient() {
  const [move, setMove] = useState({ x: 0, z: 0 })
  const [jumpVersion, setJumpVersion] = useState(0)
  const [nearPortal, setNearPortal] = useState<PortalInfo | null>(null)
  const [toast, setToast] = useState('')
  const [soundOn, setSoundOn] = useState(false)
  const [cameraMode, setCameraMode] = useState<CameraMode>('normal')
  const [cameraToast, setCameraToast] = useState('')

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault()
      if (event.repeat) return
      if (event.code === 'Space') setJumpVersion((value) => value + 1)
      if (event.key.toLowerCase() === 'e' && nearPortal) enterPortal(nearPortal)
    }
    window.addEventListener('keydown', keyDown)
    return () => window.removeEventListener('keydown', keyDown)
  }, [nearPortal])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2500)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!cameraToast) return
    const timer = window.setTimeout(() => setCameraToast(''), 1100)
    return () => window.clearTimeout(timer)
  }, [cameraToast])

  const enterPortal = useCallback((portal: PortalInfo) => {
    console.log(`ENTER_${portal.id.toUpperCase()}_WORLD`)
    setToast(`Sắp vào ${portal.title}!`)
  }, [])

  const cycleCameraMode = useCallback(() => {
    const modes: CameraMode[] = ['normal', 'far', 'farther', 'panoramic', 'overview', 'firstPerson']
    const next = modes[(modes.indexOf(cameraMode) + 1) % modes.length]
    setCameraMode(next)
    const modeLabels: Record<CameraMode, string> = {
      normal: 'Thường',
      far: 'Xa',
      farther: 'Rất xa',
      panoramic: 'Toàn cảnh',
      overview: 'Toàn bản đồ',
      firstPerson: 'Mắt Cappy',
    }
    setCameraToast(`Góc nhìn: ${modeLabels[next]}`)
  }, [cameraMode])

  return <main className={styles.game} aria-label="Cappy World 3D" data-demo-world>
    <GameWorld move={move} jumpVersion={jumpVersion} soundOn={soundOn} cameraMode={cameraMode} onPortalChange={setNearPortal} />
    <GameHUD soundOn={soundOn} onToggleSound={() => setSoundOn((value) => !value)} onCycleCamera={cycleCameraMode} />
    <div className={styles.controlsHint}>WASD / ↑↓←→ <span>DI CHUYỂN</span><b>SPACE</b> <span>NHẢY</span><b>E</b> <span>VÀO CỔNG</span></div>
    <MobileJoystick onMove={setMove} onJump={() => setJumpVersion((value) => value + 1)} />
    {nearPortal && <section className={styles.portalCard} aria-live="polite" data-camera-ignore>
      <div className={styles.portalEyebrow}>ĐIỂM ĐẾN ĐANG Ở GẦN</div>
      <h1>{nearPortal.title}</h1><p>{nearPortal.description}</p>
      <button type="button" onClick={() => enterPortal(nearPortal)}>VÀO CHƠI <span>→</span></button>
      <small>Nhấn E hoặc chạm để khám phá</small>
    </section>}
    {toast && <div className={styles.toast} role="status">✨ {toast}</div>}
    {cameraToast && <div className={styles.cameraToast} role="status" aria-live="polite">{cameraToast}</div>}
    <div className={styles.worldLabel}><span className={styles.liveDot} /> THẾ GIỚI ĐANG MỞ</div>
  </main>
}

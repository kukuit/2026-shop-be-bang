'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PortalInfo } from './types'
import { useDemo3DGame } from './GameShell'
import VillageEnvironment from './world/VillageEnvironment'
import styles from './demo.module.css'

const GameScene = dynamic(() => import('./GameScene'), { ssr: false })

export default function Demo3DClient() {
  const game = useDemo3DGame()
  const [nearPortal, setNearPortal] = useState<PortalInfo | null>(null)
  const [showMathDockPrompt, setShowMathDockPrompt] = useState(false)
  const [showHousePrompt, setShowHousePrompt] = useState(false)
  const [toast, setToast] = useState('')
  const enterPortalRef = useRef<(portal: PortalInfo) => void>(() => undefined)
  const handledJumpVersion = useRef(game.jumpVersion)

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'e') return
      if (nearPortal) enterPortalRef.current(nearPortal)
    }
    window.addEventListener('keydown', keyDown)
    return () => window.removeEventListener('keydown', keyDown)
  }, [nearPortal, showMathDockPrompt, game])

  useEffect(() => {
    if (game.jumpVersion === handledJumpVersion.current) return
    handledJumpVersion.current = game.jumpVersion
    if (showMathDockPrompt && !game.mathDepartureStage) game.beginMathDeparture()
  }, [game.jumpVersion, showMathDockPrompt, game.mathDepartureStage, game.beginMathDeparture])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2500)
    return () => window.clearTimeout(timer)
  }, [toast])

  const enterPortal = useCallback((portal: PortalInfo) => {
    console.log(`ENTER_${portal.id.toUpperCase()}_WORLD`)
    setToast(`Sắp vào ${portal.title}!`)
  }, [])
  enterPortalRef.current = enterPortal
  const handleHousePorchChange = useCallback((inside: boolean) => setShowHousePrompt(inside), [])
  const handleEnterCappyHouse = useCallback(() => setShowHousePrompt(false), [])
  const handleMathDockChange = useCallback((inside: boolean) => setShowMathDockPrompt(inside), [])

  return <>
    <GameScene world="village" Environment={VillageEnvironment} onPortalChange={setNearPortal} onHousePorchChange={handleHousePorchChange} onMathDockChange={handleMathDockChange} />
    {nearPortal && <section className={styles.portalCard} aria-live="polite" data-camera-ignore>
      <div className={styles.portalEyebrow}>ĐIỂM ĐẾN ĐANG Ở GẦN</div>
      <h1>{nearPortal.title}</h1><p>{nearPortal.description}</p>
      <button type="button" onClick={() => enterPortal(nearPortal)}>VÀO CHƠI <span>→</span></button>
      <small>Nhấn E hoặc chạm để khám phá</small>
    </section>}
    {showMathDockPrompt && !nearPortal && !game.mathDepartureStage && <section className={`${styles.portalCard} ${styles.mathDockCard}`} aria-live="polite" data-camera-ignore>
      <div className={styles.portalEyebrow}>BẾN TÀU CAPPY</div>
      <h1>Quần đảo Toán</h1>
      <p>Ra khơi cùng Cappy để khám phá các đảo Toán học nhé!</p>
      <small>Đi đến cuối cầu rồi nhấn NHẢY để xuống thuyền</small>
    </section>}
    {showHousePrompt && <section className={`${styles.portalCard} ${styles.housePrompt}`} aria-live="polite" data-camera-ignore>
      <button type="button" className={styles.housePromptClose} aria-label="Đóng bảng Nhà Cappy" onClick={() => setShowHousePrompt(false)}>×</button>
      <div className={styles.portalEyebrow}>🏠 NHÀ CAPPY</div>
      <h1>Vào chơi</h1>
      <p>Cappy muốn vào nhà chơi không?</p>
      <button type="button" onClick={handleEnterCappyHouse}>VÀO NHÀ <span>→</span></button>
    </section>}
    {toast && <div className={styles.toast} role="status">✨ {toast}</div>}
  </>
}

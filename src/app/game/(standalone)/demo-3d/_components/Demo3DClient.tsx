'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDemo3DGame } from './GameShell'
import VillageEnvironment from './world/VillageEnvironment'
import styles from './demo.module.css'

const GameScene = dynamic(() => import('./GameScene'), { ssr: false })

export default function Demo3DClient() {
  const game = useDemo3DGame()
  const { jumpVersion, mathDepartureStage, beginMathDeparture } = game
  const [showMathDockPrompt, setShowMathDockPrompt] = useState(false)
  const [showEnglishRocketPrompt, setShowEnglishRocketPrompt] = useState(false)
  const [showHousePrompt, setShowHousePrompt] = useState(false)
  const handledJumpVersion = useRef(jumpVersion)

  useEffect(() => {
    if (jumpVersion === handledJumpVersion.current) return
    handledJumpVersion.current = jumpVersion
    if (showMathDockPrompt && !mathDepartureStage) beginMathDeparture()
  }, [jumpVersion, showMathDockPrompt, mathDepartureStage, beginMathDeparture])

  const handleHousePorchChange = useCallback((inside: boolean) => setShowHousePrompt(inside), [])
  const handleEnterCappyHouse = useCallback(() => setShowHousePrompt(false), [])
  const handleMathDockChange = useCallback((inside: boolean) => setShowMathDockPrompt(inside), [])
  const handleEnglishRocketChange = useCallback((inside: boolean) => setShowEnglishRocketPrompt(inside), [])

  return <>
    <GameScene world="village" Environment={VillageEnvironment} onHousePorchChange={handleHousePorchChange} onMathDockChange={handleMathDockChange} onEnglishRocketChange={handleEnglishRocketChange} />
    {showMathDockPrompt && !game.mathDepartureStage && <section className={`${styles.portalCard} ${styles.mathDockCard}`} aria-live="polite" data-camera-ignore>
      <div className={styles.portalEyebrow}>BẾN TÀU CAPPY</div>
      <h1>Quần đảo Toán</h1>
      <p>Ra khơi cùng Cappy để khám phá các đảo Toán học nhé!</p>
      <small>Đi đến cuối cầu rồi nhấn NHẢY để xuống thuyền</small>
    </section>}
    {showEnglishRocketPrompt && !game.englishLaunchStage && <section className={`${styles.portalCard} ${styles.englishRocketCard}`} aria-live="polite" data-camera-ignore>
      <div className={styles.portalEyebrow}>🚀 VŨ TRỤ TIẾNG ANH</div>
      <h1>Bay vào Vũ trụ Tiếng Anh?</h1>
      <button type="button" onClick={game.beginEnglishLaunch}>BAY THÔI <span>↑</span></button>
      <button type="button" className={styles.mathDockLater} onClick={() => setShowEnglishRocketPrompt(false)}>Để sau</button>
    </section>}
    {showHousePrompt && <section className={`${styles.portalCard} ${styles.housePrompt}`} aria-live="polite" data-camera-ignore>
      <button type="button" className={styles.housePromptClose} aria-label="Đóng bảng Nhà Cappy" onClick={() => setShowHousePrompt(false)}>×</button>
      <div className={styles.portalEyebrow}>🏠 NHÀ CAPPY</div>
      <h1>Vào chơi</h1>
      <p>Cappy muốn vào nhà chơi không?</p>
      <button type="button" onClick={handleEnterCappyHouse}>VÀO NHÀ <span>→</span></button>
    </section>}
  </>
}

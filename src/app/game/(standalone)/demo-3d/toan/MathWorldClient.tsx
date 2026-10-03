'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDemo3DStableGame } from '../_components/GameShell'
import { MATH_ISLANDS, MATH_STATUS_COLORS } from '../_components/world/mathIslands.config'
import type { MathDockTarget } from '../_components/world/MathWorld'
import styles from '../_components/demo.module.css'

const MathWorldCanvas = dynamic(() => import('./MathWorldCanvas'), { ssr: false })

export default function MathWorldClient() {
  const { mathWorldReady, returnFromMathWorld, setMove } = useDemo3DStableGame()
  const router = useRouter()
  const [dock, setDock] = useState<MathDockTarget>(null)
  const handleDockChange = useCallback((target: MathDockTarget) => setDock(target), [])
  const handleReady = useCallback(() => mathWorldReady(), [mathWorldReady])
  const island = useMemo(() => dock?.kind === 'lesson' ? MATH_ISLANDS.find(({ id }) => id === dock.id) ?? null : null, [dock])

  const enterLesson = useCallback(() => {
    if (!island || island.status === 'locked' || !island.route) return
    setMove({ x: 0, z: 0 })
    router.push(island.route)
  }, [island, setMove, router])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'e' || !dock) return
      if (dock.kind === 'home') returnFromMathWorld()
      else if (island?.status === 'locked') setDock(null)
      else enterLesson()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dock, enterLesson, returnFromMathWorld, island])

  return <>
    <MathWorldCanvas onDockChange={handleDockChange} onReady={handleReady} />
    <div className={styles.mathWorldName} data-camera-ignore>QUẦN ĐẢO TOÁN</div>
    {dock?.kind === 'home' && <section className={`${styles.portalCard} ${styles.mathDockCard}`} aria-live="polite" data-camera-ignore>
      <div className={styles.portalEyebrow}>LUỒNG VỀ ĐẤT LIỀN</div>
      <h1>Trở về Cappy World?</h1>
      <p>Đã đến cửa về nhà. Cappy muốn quay lại đất liền không?</p>
      <button type="button" onClick={returnFromMathWorld}>TRỞ VỀ KHU NHÀ <span>→</span></button>
      <button type="button" className={styles.mathDockLater} onClick={() => setDock(null)}>Ở LẠI QUẦN ĐẢO</button>
    </section>}
    {island && <section className={`${styles.portalCard} ${styles.mathIslandCard}`} aria-live="polite" data-camera-ignore>
      <div className={styles.portalEyebrow} style={{ color: MATH_STATUS_COLORS[island.status] }}>ĐÃ CẬP BẾN</div>
      <h1>{island.title}</h1>
      <p>{island.status === 'locked' ? 'Hoàn thành bài trước để mở hòn đảo này.' : `Cappy đã cập bến ${island.title}. Sẵn sàng khám phá chưa?`}</p>
      {island.status === 'locked'
        ? <button type="button" className={styles.mathDockLater} onClick={() => setDock(null)}>TIẾP TỤC LÁI THUYỀN</button>
        : <button type="button" onClick={enterLesson}>VÀO BÀI <span>→</span></button>}
      <button type="button" className={styles.mathDockLater} onClick={() => setDock(null)}>TIẾP TỤC ĐI</button>
    </section>}
  </>
}

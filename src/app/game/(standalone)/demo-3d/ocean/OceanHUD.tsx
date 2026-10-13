'use client'

import styles from './ocean.module.css'
import type { OceanNearbyAction } from './OceanPlayer'

export type OceanOverlay = 'help' | 'exit' | 'recovery' | 'complete' | null

export default function OceanHUD({ oxygen, score, roundIndex, targetNumber, inventory, nearbyAction, feedback, overlay, recovering, onInteract, onHome, onHelp, onDiveAgain, onExploreNext, onReplay, onCloseOverlay, onConfirmExit }: {
  oxygen: number
  score: number
  roundIndex: number
  targetNumber: number
  inventory: { shell: number; starfish: number; pearl: number; gem: number; goldenChest: number }
  nearbyAction: OceanNearbyAction
  feedback: string
  overlay: OceanOverlay
  recovering: boolean
  onInteract: () => void
  onHome: () => void
  onHelp: () => void
  onDiveAgain: () => void
  onExploreNext: () => void
  onReplay: () => void
  onCloseOverlay: () => void
  onConfirmExit: () => void
}) {
  const oxygenPercent = Math.max(0, Math.min(100, oxygen / 90 * 100))
  const oxygenWarning = oxygenPercent < 20
  const complete = roundIndex >= 10
  return <div className={styles.oceanHud} data-camera-ignore>
    <div className={styles.statusRow}>
      <section className={`${styles.oxygenCard} ${oxygenWarning ? styles.oxygenWarning : ''}`} aria-label={`Khí còn ${Math.ceil(oxygen)} giây`}>
        <span className={styles.bubbleIcon} aria-hidden="true">🫧</span>
        <div className={styles.oxygenDetails}>
          <div className={styles.oxygenLabels}><strong>KHÍ LẶN</strong><b>{Math.ceil(oxygen)}s</b></div>
          <div className={styles.oxygenTrack}><span style={{ width: `${oxygenPercent}%` }} /></div>
        </div>
      </section>
      <button type="button" className={styles.homeButton} onClick={onHome} aria-label="Về nhà">⌂ <span>VỀ NHÀ</span></button>
    </div>

    <section className={styles.missionCard} aria-live="polite">
      <div className={styles.missionHeading}><span>{complete ? 'ĐÃ HOÀN THÀNH' : `THỬ THÁCH · ${roundIndex + 1}/10`}</span><button type="button" onClick={onHelp} aria-label="Xem hướng dẫn">?</button></div>
      <strong>{complete ? 'Cappy tìm được mọi rương rồi!' : `Tìm chiếc rương mang số ${targetNumber}`}</strong>
      <div className={styles.missionStats}><span>⭐ {score} điểm</span><span>🌊 MÀN {Math.min(roundIndex + 1, 10)}/10</span></div>
      <div className={styles.collectionRow} aria-label="Đồ nhặt được">
        <span title="Vỏ sò">🐚 {inventory.shell}</span><span title="Sao biển">⭐ {inventory.starfish}</span><span title="Ngọc trai">⚪ {inventory.pearl}</span><span title="Đá quý">💎 {inventory.gem}</span>{inventory.goldenChest > 0 && <span title="Rương vàng">🏆 {inventory.goldenChest}</span>}
      </div>
    </section>

    {feedback && <div className={styles.feedback} role="status">{feedback}</div>}
    {!overlay && !recovering && nearbyAction && <button type="button" className={styles.interactButton} onClick={onInteract}>{nearbyAction.kind === 'golden-chest' ? '✨ ' : '🧰 '}{nearbyAction.label}</button>}
    {!overlay && !recovering && <div className={styles.controlHint}><b>WASD</b> bơi <b>SPACE</b> lên <b>SHIFT</b> xuống <span>• Kéo để xoay</span></div>}

    {overlay && <div className={styles.shade} role="presentation">
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="ocean-dialog-title">
        {overlay === 'help' && <>
          <div className={styles.modalIcon}>🐠</div><h2 id="ocean-dialog-title">Cùng Cappy lặn biển</h2>
          <p>Bơi đến gần rương rồi nhấn <b>E</b> hoặc chạm nút <b>MỞ RƯƠNG</b>.</p>
          <p><b>WASD</b> để bơi · <b>SPACE</b> lên · <b>SHIFT</b> xuống · Kéo màn hình để xoay.</p>
          <button type="button" className={styles.secondaryButton} onClick={onCloseOverlay}>MÌNH BIẾT RỒI</button>
        </>}
        {overlay === 'exit' && <>
          <div className={styles.modalIcon}>🏠</div><h2 id="ocean-dialog-title">Về nhà nhé?</h2>
          <p>Chuyến khám phá này chưa xong. Điểm và đồ nhặt được của lượt sẽ không lưu khi rời biển.</p>
          <button type="button" className={styles.primaryButton} onClick={onConfirmExit}>VỀ NHÀ</button>
          <button type="button" className={styles.secondaryButton} onClick={onCloseOverlay}>Ở LẠI LẶN</button>
        </>}
        {overlay === 'recovery' && <>
          <div className={styles.modalIcon}>🫧</div><h2 id="ocean-dialog-title">Hết khí rồi! Cappy quay về lấy bình khí mới nhé.</h2>
          <p>Điểm và đồ Cappy đã tìm được vẫn ở đây.</p>
          <button type="button" className={styles.primaryButton} onClick={onDiveAgain}>LẶN TIẾP</button>
          <button type="button" className={styles.secondaryButton} onClick={onConfirmExit}>VỀ NHÀ</button>
        </>}
        {overlay === 'complete' && <>
          <div className={styles.modalIcon}>🎉</div><h2 id="ocean-dialog-title">Cappy đã tìm đủ 10 rương!</h2>
          <p>Điểm của bé: <b>{score}</b> · Đồ nhặt được: <b>{inventory.shell + inventory.starfish + inventory.pearl + inventory.gem}</b></p>
          <button type="button" className={styles.primaryButton} onClick={onExploreNext}>KHÁM PHÁ TIẾP</button>
          <button type="button" className={styles.secondaryButton} onClick={onReplay}>CHƠI LẠI</button>
          <button type="button" className={styles.textButton} onClick={onConfirmExit}>VỀ NHÀ</button>
        </>}
      </section>
    </div>}
  </div>
}

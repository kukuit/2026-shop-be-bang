import styles from '../_components/demo.module.css'

export default function VietnameseWorldLoading() {
  return <div className={`${styles.worldTransition} ${styles.worldTransitionCovered}`} role="status">
    <div className={styles.worldTransitionMessage}><span aria-hidden="true">🐹</span><strong>Đang đến Vùng đất Tiếng Việt...</strong></div>
  </div>
}

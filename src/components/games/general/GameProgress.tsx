import StarIcon from './StarIcon'
import styles from './GameProgress.module.css'

type GameProgressProps = { currentRound: number; totalRounds?: number }

export default function GameProgress({ currentRound, totalRounds = 10 }: GameProgressProps) {
  const progress = Math.min(100, Math.max(0, currentRound / totalRounds * 100))
  return <div className={styles.progress}>
    <span className={styles.title}>MÀN {currentRound}</span>
    <div className={styles.bar}>
      <div className={styles.fill} style={{ width: `${progress}%` }} />
      <span className={styles.star} style={{ left: `${Math.min(94, Math.max(6, progress))}%` }}><StarIcon size="small" /></span>
    </div>
    <span className={styles.count}>{currentRound}/{totalRounds}</span>
  </div>
}

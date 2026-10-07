import type { NumberCardData, NumberCardDecoration } from '../../_exam/types'
import styles from '../exam.module.css'

const decorationSymbols: Record<NumberCardDecoration, string> = {
  flower: '🌼',
  heart: '💛',
  leaf: '🍃',
  spiral: '🌀',
  star: '⭐',
  cloud: '☁️',
  butterfly: '🦋',
}

const decorationClass = [
  styles.numberCardDecorationTopLeft,
  styles.numberCardDecorationTopRight,
  styles.numberCardDecorationBottomLeft,
  styles.numberCardDecorationBottomRight,
]

export default function NumberCard({ card }: { card: NumberCardData }) {
  return <div className={styles.numberCard} role="img" aria-label={`Số ${card.value}`}>
    {card.decorations.map((decoration, index) => <span
      key={decoration}
      aria-hidden="true"
      className={`${styles.numberCardDecoration} ${decorationClass[index]}`}
    >{decorationSymbols[decoration]}</span>)}
    <span aria-hidden="true" className={styles.numberCardValue} style={{ color: card.color }}>{card.value}</span>
  </div>
}

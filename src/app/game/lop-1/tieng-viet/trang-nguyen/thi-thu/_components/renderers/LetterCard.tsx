import type { CSSProperties } from 'react'
import type { LetterCardData, LetterCardDecorationPosition, LetterCardShape } from '../../_exam/types'
import styles from '../exam.module.css'

const shapeClass: Record<LetterCardShape, string> = {
  circle: styles.letterInputCardCircle,
  'flower-round': styles.letterInputCardFlower,
  'rounded-blob': styles.letterInputCardBlob,
}

const decorationClass: Record<LetterCardDecorationPosition, string> = {
  'top-left': styles.letterInputCardDecorationTopLeft,
  'top-right': styles.letterInputCardDecorationTopRight,
  'bottom-left': styles.letterInputCardDecorationBottomLeft,
  'bottom-right': styles.letterInputCardDecorationBottomRight,
}

const decorationSymbol: Record<LetterCardData['decorations'][number]['icon'], string> = {
  star: '⭐',
  heart: '💛',
  flower: '🌼',
  leaf: '🍃',
  spiral: '🌀',
  dot: '•',
}

export default function LetterCard({ card }: { card: LetterCardData }) {
  return <div
    className={`${styles.letterInputCard} ${shapeClass[card.shape]}`}
    style={{ '--letter-card-color': card.color, '--letter-card-border': card.borderColor } as CSSProperties}
    role="img"
    aria-label={`Chữ ${card.letter}`}
  >
    {card.shape === 'flower-round' && <svg className={styles.letterInputCardShapeSvg} viewBox="0 0 100 100" aria-hidden="true">
      <path
        d="M50 7 C59 7 61 17 65 22 C72 18 80 13 86 20 C93 27 84 34 80 40 C90 41 94 45 94 50 C94 59 84 61 80 65 C84 72 93 79 86 86 C79 93 72 84 65 80 C61 90 59 94 50 94 C41 94 39 84 35 80 C28 84 21 93 14 86 C7 79 16 72 20 65 C10 61 6 59 6 50 C6 41 16 39 20 35 C16 28 7 21 14 14 C21 7 28 16 35 20 C39 10 41 7 50 7 Z"
        fill="#fff"
        stroke={card.borderColor}
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>}
    {card.decorations.map(({ icon, position }) => <span
      key={`${icon}-${position}`}
      aria-hidden="true"
      className={`${styles.letterInputCardDecoration} ${decorationClass[position]}`}
    >{decorationSymbol[icon]}</span>)}
    <span className={styles.letterInputCardValue}>{card.letter}</span>
  </div>
}

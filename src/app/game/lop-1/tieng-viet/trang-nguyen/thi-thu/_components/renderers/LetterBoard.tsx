import type { LetterBoardData, LetterBoardSlot } from '../../_exam/types'
import styles from '../exam.module.css'

const decorationSymbols: Record<LetterBoardData['decorations'][number], string> = {
  sun: '☀️',
  flower: '🌼',
  apple: '🍎',
  cloud: '☁️',
  heart: '💛',
  star: '⭐',
  leaf: '🍃',
  candy: '🍬',
}

const slotClass: Record<LetterBoardSlot, string> = {
  'top-left': styles.letterBoardSlotTopLeft,
  'top-right': styles.letterBoardSlotTopRight,
  'bottom-left': styles.letterBoardSlotBottomLeft,
  'bottom-right': styles.letterBoardSlotBottomRight,
}

const decorationClass = [
  styles.letterBoardDecorationTopLeft,
  styles.letterBoardDecorationTopRight,
  styles.letterBoardDecorationBottomLeft,
  styles.letterBoardDecorationBottomRight,
]

export default function LetterBoard({ board }: { board: LetterBoardData }) {
  return <div className={styles.letterBoard} role="group" aria-label="Khung hình có ba chữ cái">
    {board.decorations.map((decoration, index) => <span
      key={decoration}
      aria-hidden="true"
      className={`${styles.letterBoardDecoration} ${decorationClass[index]}`}
    >{decorationSymbols[decoration]}</span>)}
    {board.letters.map(({ letter, slot, rotation }) => <span
      key={letter}
      className={`${styles.letterBoardLetter} ${slotClass[slot]}`}
      style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
    >{letter}</span>)}
  </div>
}

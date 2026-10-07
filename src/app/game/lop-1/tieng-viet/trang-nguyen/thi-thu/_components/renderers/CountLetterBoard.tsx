'use client'

import type { CountLetterBoardItem } from '../../_exam/types'
import styles from '../exam.module.css'

export default function CountLetterBoard({ items }: { items: CountLetterBoardItem[] }) {
  return <div className={styles.countLetterBoard} role="img" aria-label="Khung gồm nhiều chữ cái, chữ số và hình nhỏ; hãy đếm chữ cái được hỏi">
    {items.map(item => <span
      key={item.id}
      aria-hidden="true"
      className={styles.countLetterBoardItem}
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        color: item.color,
        fontSize: `${item.size}px`,
        transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
        zIndex: item.zIndex,
      }}
    >{item.value}</span>)}
  </div>
}

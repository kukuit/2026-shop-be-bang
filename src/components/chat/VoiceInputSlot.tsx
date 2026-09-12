import type { ReactNode } from 'react'
import styles from './VoiceInputSlot.module.css'

export default function VoiceInputSlot({ hidden, children }: { hidden: boolean; children: ReactNode }) {
  return <div className={`${styles.slot} ${hidden ? styles.hidden : ''}`} aria-hidden={hidden}>{children}</div>
}

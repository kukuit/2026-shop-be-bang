import type { CSSProperties } from 'react'
import styles from './EggHuntGame.module.css'

const COLORS = ['#ffd75e', '#ff83bc', '#79e4ff', '#a2ed89', '#c4a0ff']

export default function FireworkBurst({ radius = 30, delay = 0, count = 12 }: { radius?: number; delay?: number; count?: number }) {
  return <g aria-hidden="true" className={styles.burst}>
    {Array.from({ length: count }, (_, index) => {
      const angle = index * Math.PI * 2 / count
      const distance = radius * (index % 2 ? .75 : 1)
      return <g key={index} className={styles.burstParticle} style={{
        '--spark-x': `${Math.cos(angle) * distance}px`,
        '--spark-y': `${Math.sin(angle) * distance}px`,
        animationDelay: `${delay}s`,
      } as CSSProperties}>
        <circle r={radius > 40 ? 2.5 : 1.8} fill={COLORS[index % COLORS.length]} />
        <path d="M0 0 L-3 0" transform={`rotate(${index * 360 / count})`} stroke={COLORS[index % COLORS.length]} strokeWidth="1.5" strokeLinecap="round" />
      </g>
    })}
  </g>
}

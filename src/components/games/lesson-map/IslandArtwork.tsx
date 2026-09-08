import styles from './LessonMap.module.css'
import type { LessonStatus } from './data'

export default function IslandArtwork({ variant, status, checkpoint }: { variant: number; status: LessonStatus; checkpoint?: number }) {
  return <svg viewBox="0 0 200 135" aria-hidden="true" className={`${styles.artwork} ${status === 'locked' ? styles.unexplored : ''}`}>
    <ellipse cx="100" cy="113" rx="94" ry="18" fill="#8bd9e9" opacity=".45" />
    <ellipse cx="100" cy="108" rx="81" ry="18" fill="none" stroke="#fff" strokeWidth="2" opacity=".7" />
    <path d="M26 91Q23 121 97 124Q177 124 175 91Z" fill="#d4a768" />
    <ellipse cx="100" cy="91" rx="76" ry="28" fill="#f8dfa0" />
    <path d="M38 83Q49 58 85 65Q116 48 151 72Q180 92 143 102Q91 115 46 98Q29 92 38 83" fill={variant % 2 ? '#66c88e' : '#79d49a'} />
    <path d="M48 92Q93 109 153 90" fill="none" stroke="#45ad78" strokeWidth="4" strokeLinecap="round" />
    <g transform={variant % 2 ? 'translate(31 -2)' : 'translate(0 0)'}>
      <path d="M72 83Q83 57 71 33" fill="none" stroke="#ae784a" strokeWidth="9" strokeLinecap="round" />
      <path d="M72 36Q48 13 32 40Q53 32 72 39M72 36Q81 8 105 24Q84 27 74 40M72 36Q43 28 43 57Q59 41 74 40M73 37Q105 26 111 53Q89 40 73 41" fill="#238e62" />
      <circle cx="73" cy="41" r="5" fill="#91613f" />
    </g>
    {variant === 2 && <path d="M122 85l9-21 15 3 12 22Z" fill="#8da7a5" />}
    {variant === 3 && <><path d="M55 80V48" stroke="#91613f" strokeWidth="3" /><path d="M56 47l23 7-23 9" fill="#ff917b" /></>}
    <path d="M68 101q22-16 42-4" fill="none" stroke="#fae4ab" strokeWidth="7" strokeLinecap="round" />
    {checkpoint && <text x="133" y="76" fontSize="31" textAnchor="middle">{checkpoint === 41 ? '🏰' : checkpoint % 10 === 0 ? '🗼' : '🎁'}</text>}
    <circle cx="49" cy="88" r="3" fill="#ffeab5" /><circle cx="154" cy="88" r="3" fill="#ffeab5" />
  </svg>
}

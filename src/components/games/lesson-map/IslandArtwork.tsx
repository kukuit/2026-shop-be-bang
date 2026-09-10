import styles from './LessonMap.module.css'
import type { LessonStatus } from './data'
import IslandLandmark from './IslandLandmark'
import { getMathIslandLandmark } from './mathIslandLandmarks'

export default function IslandArtwork({ variant, status, lessonOrder }: { variant: number; status: LessonStatus; lessonOrder: number }) {
  return <svg viewBox="0 0 200 135" aria-hidden="true" className={styles.artwork}>
    <g className={status === 'locked' ? styles.unexplored : undefined}>
    <ellipse cx="100" cy="113" rx="94" ry="18" fill="#8bd9e9" opacity=".45" />
    <ellipse cx="100" cy="108" rx="81" ry="18" fill="none" stroke="#fff" strokeWidth="2" opacity=".7" />
    <path d="M26 91Q23 121 97 124Q177 124 175 91Z" fill="#d4a768" />
    <ellipse cx="100" cy="91" rx="76" ry="28" fill="#f8dfa0" />
    <path d="M38 83Q49 58 85 65Q116 48 151 72Q180 92 143 102Q91 115 46 98Q29 92 38 83" fill={variant % 2 ? '#66c88e' : '#79d49a'} />
    <path d="M48 92Q93 109 153 90" fill="none" stroke="#45ad78" strokeWidth="4" strokeLinecap="round" />
    <g transform={variant % 2 ? 'translate(48 -2)' : 'translate(0 0)'}>
      <path d="M72 83Q83 57 71 33" fill="none" stroke="#ae784a" strokeWidth="9" strokeLinecap="round" />
      <path d="M72 36Q48 13 32 40Q53 32 72 39M72 36Q81 8 105 24Q84 27 74 40M72 36Q43 28 43 57Q59 41 74 40M73 37Q105 26 111 53Q89 40 73 41" fill="#238e62" />
      <circle cx="73" cy="41" r="5" fill="#91613f" />
    </g>
    <path d="M68 101q22-16 42-4" fill="none" stroke="#fae4ab" strokeWidth="7" strokeLinecap="round" />
    <circle cx="49" cy="88" r="3" fill="#ffeab5" /><circle cx="154" cy="88" r="3" fill="#ffeab5" />
    </g>
    <IslandLandmark icon={getMathIslandLandmark(lessonOrder)} status={status} palmOnRight={variant % 2 === 1} />
  </svg>
}

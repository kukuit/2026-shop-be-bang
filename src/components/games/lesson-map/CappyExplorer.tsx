import styles from './LessonMap.module.css'

export default function CappyExplorer({ small = false }: { small?: boolean }) {
  return <svg viewBox="0 0 100 110" className={small ? styles.explorerCompanion : styles.cappy} role={small ? undefined : 'img'} aria-hidden={small || undefined} aria-label={small ? undefined : 'Cappy nhà thám hiểm'}>
    <ellipse cx="51" cy="102" rx="35" ry="5" fill="#637d4b" opacity=".16" />
    <rect x="16" y="51" width="23" height="42" rx="9" fill="#778c57" stroke="#52693b" strokeWidth="3" />
    <path d="M37 91v11m27-11v11" stroke="#835d3e" strokeWidth="12" strokeLinecap="round" />
    <rect x="29" y="48" width="48" height="48" rx="20" fill="#c29970" />
    <circle cx="34" cy="31" r="9" fill="#b28660" /><circle cx="70" cy="31" r="9" fill="#b28660" />
    <rect x="27" y="27" width="53" height="45" rx="20" fill="#c29970" />
    <rect x="29" y="44" width="53" height="25" rx="12" fill="#e0b98d" />
    <circle cx="43" cy="43" r="3" fill="#483a2d" /><circle cx="66" cy="43" r="3" fill="#483a2d" />
    <path d="M51 56q5 5 10 0" fill="none" stroke="#614532" strokeWidth="2" strokeLinecap="round" />
    <path d="M29 28q2-24 25-24t24 24" fill="#e4ce96" /><path d="M30 23h47" stroke="#927347" strokeWidth="6" />
    <path d="M22 29h62" stroke="#e4ce96" strokeWidth="8" strokeLinecap="round" />
    <path d="M31 70l19 8 24-8" fill="none" stroke="#769750" strokeWidth="6" />
    <path d="M52 78l13-4 10 4 14-4v22l-14 4-10-4-13 4Z" fill="#fff0c5" stroke="#af955e" strokeWidth="2" />
    <path d="M60 85q9-7 12 3t9-2" fill="none" stroke="#839c62" strokeWidth="2" strokeDasharray="3 2" />
  </svg>
}

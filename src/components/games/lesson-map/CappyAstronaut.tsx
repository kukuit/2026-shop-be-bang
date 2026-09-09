import styles from './LessonMap.module.css'
export default function CappyAstronaut() {
 return <svg viewBox="0 0 100 110" className={styles.cappy} role="img" aria-label="Cappy phi hành gia">
 <path d="M23 70L12 90M78 70L90 87" stroke="#c5d9ff" strokeWidth="12" strokeLinecap="round" />
 <rect x="29" y="64" width="44" height="36" rx="14" fill="#eef4ff" /><path d="M37 93v10m28-10v10" stroke="#adbdff" strokeWidth="13" strokeLinecap="round" />
 <circle cx="50" cy="43" r="37" fill="#dceaff" stroke="#889fff" strokeWidth="3" /><circle cx="50" cy="43" r="30" fill="#273164" />
 <path d="M29 35v-7q5-12 13 0h16q10-13 15 0v26q-2 15-23 15T27 52Z" fill="#bb8b64" /><ellipse cx="51" cy="50" rx="23" ry="15" fill="#dcb18a" />
 <circle cx="39" cy="41" r="3" fill="#352a39" /><circle cx="62" cy="41" r="3" fill="#352a39" /><path d="M48 53q5 5 10 0" fill="none" stroke="#523844" strokeWidth="2" strokeLinecap="round" />
 <path d="M26 28q4-10 15-12" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" opacity=".7" /><rect x="39" y="80" width="23" height="10" rx="3" fill="#7e83dc" /><circle cx="56" cy="85" r="2" fill="#7dffda" />
 </svg>
}

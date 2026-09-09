'use client'
import { useId } from 'react'
import type { LessonStatus } from './data'
import styles from './LessonMap.module.css'
const palettes = [['#89eeff','#3379d9','#203b8b'],['#d7abff','#9860df','#49218e'],['#ffbfe9','#dd6db4','#753286'],['#b6caff','#7786dd','#393b87'],['#7ef0d6','#329ec0','#20537c'],['#d8fcff','#6ec1ee','#476bb0'],['#ffc886','#e87863','#843c75'],['#fff3ae','#deb45a','#866134']]
export default function PlanetArtwork({ id, status }: { id: number; status: LessonStatus }) {
 const uid = useId().replace(/:/g, '')
 const checkpoint = id % 4 === 0
 const [light, middle, dark] = palettes[(id - 1) % palettes.length]
 return <svg viewBox="0 0 200 150" aria-hidden="true" className={`${styles.artwork} ${styles.planet} ${checkpoint ? styles.checkpoint : ''} ${status === 'locked' ? styles.unexplored : ''}`}>
 <defs><radialGradient id={uid} cx="30%" cy="25%" r="80%"><stop stopColor={light} /><stop offset=".55" stopColor={middle} /><stop offset="1" stopColor={dark} /></radialGradient><clipPath id={uid+'clip'}><circle cx="100" cy="76" r="52" /></clipPath></defs>
 {status === 'current' && <ellipse cx="100" cy="77" rx="85" ry="63" fill="none" stroke="#a4caff" strokeDasharray="3 8" opacity=".8" />}
 <circle cx="100" cy="76" r="52" fill={`url(#${uid})`} />
 <g clipPath={`url(#${uid}clip)`} fill="none" stroke={light} opacity=".3" strokeWidth="12" transform={`rotate(${id % 2 ? -20 : 20} 100 76)`}><path d="M40 54q30-15 65 0t65 0M35 84q35-16 70 0t65 0M40 111q30-15 65 0t65 0" /></g>
 <ellipse cx="78" cy="48" rx="12" ry="7" fill="white" opacity=".2" transform="rotate(-35 78 48)" />
 {(checkpoint || id % 3 === 1) && <ellipse cx="100" cy="81" rx="86" ry="21" transform="rotate(-23 100 81)" fill="none" stroke={light} strokeWidth="7" opacity=".85" />}
 {id % 4 === 2 && <circle cx="164" cy="31" r="9" fill={light} />}
 {id === 4 && <g fill="#b7c7ff" stroke="#5663ad" strokeWidth="2"><path d="M137 22h20v18h-20zM167 22h20v18h-20zM157 26h10v10h-10z" /></g>}
 {id === 8 && <g fill="#28463f"><ellipse cx="91" cy="72" rx="5" ry="8" /><ellipse cx="111" cy="72" rx="5" ry="8" /></g>}
 {id === 16 && <path d="M77 27l-4-20 17 11L100 2l10 16 17-11-4 20Z" fill="#ffe497" stroke="#d19a40" strokeWidth="2" />}
 {(status === 'current' || id === 12) && <text x="157" y="36" fontSize="29">🚀</text>}
 </svg>
}

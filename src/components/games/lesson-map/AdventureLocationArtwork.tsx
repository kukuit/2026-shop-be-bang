import type { AdventureNodeType } from './adventureTypes'
import type { LessonStatus } from './data'
import styles from './LessonMap.module.css'

function Tree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}><path d="M0 0v-36" stroke="#8a633d" strokeWidth="8" strokeLinecap="round" /><path d="M-24-20 0-69 24-20Z" fill="#68b865" /><path d="M-21-35 0-79 21-35Z" fill="#8fd17a" /><path d="M-16-51 0-85 16-51Z" fill="#bfe89a" /></g>
}
function House({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}><rect x="-29" y="-43" width="58" height="43" rx="4" fill="#f2e4c8" stroke="#c7af7c" strokeWidth="2" /><path d="M-37-42 0-73 37-42Z" fill="#b17d4f" /><path d="M-30-44 0-68 30-44" fill="none" stroke="#d7ab6b" strokeWidth="4" /><path d="M-7 0v-22q7-10 14 0v22" fill="#89633e" /><rect x="-23" y="-32" width="12" height="13" rx="3" fill="#78d2f2" /><rect x="12" y="-32" width="12" height="13" rx="3" fill="#78d2f2" /></g>
}

function Flowers({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}><path d="M0 0v-11m8 13v-8" stroke="#68b865" strokeWidth="2" /><g fill="#fff7e2"><circle cy="-14" r="4" /><circle cx="-4" cy="-10" r="4" /><circle cx="4" cy="-10" r="4" /></g><circle cy="-10" r="3" fill="#ffd65a" /><circle cx="8" cy="-6" r="4" fill="#ffa83d" /></g>
}
function Rock({ x, y }: { x: number; y: number }) {
  return <path d={`M${x - 9} ${y}q-1-13 9-12 10 1 12 12Z`} fill="#aeb7b0" stroke="#d1d8ce" strokeWidth="2" />
}
function Book({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}><path d="M-24-18q13-6 24 1 11-7 24-1v28q-13-6-24 0-11-6-24 0Z" fill="#fff6d9" stroke="#d9a86b" strokeWidth="3" /><path d="M0-17v27m-18-21 12 2m-12 5 12 2m12-7 12-2m-12 9 12-2" fill="none" stroke="#b3bf94" strokeWidth="2" /></g>
}

const artwork: Record<AdventureNodeType, React.ReactNode> = {
  alphabetZone: <><Tree x={36} y={104} scale={.6} /><path d="M42 119q52-65 119 0" fill="#8fd17a" /><Book x={103} y={102} /><Flowers x={39} y={123} /><Flowers x={167} y={122} /><Rock x={154} y={134} /></>,
  readingForest: <><Tree x={54} y={111} scale={.85} /><Tree x={139} y={113} scale={.95} /><Tree x={97} y={121} scale={1.15} /><path d="M74 132q15-10 40-7" fill="none" stroke="#e6d3a5" strokeWidth="8" strokeLinecap="round" /></>,
  spellingBridge: <><path d="M50 93q20 9 28 33t43 6l32-23" fill="none" stroke="#78d2f2" strokeWidth="21" /><path d="M35 103q65-40 130 0v12q-65-33-130 0Z" fill="#aa7c4d" /><path d="M39 101q61-35 122 0M39 88q61-35 122 0M40 85v30m30-43v32m30-39v31m30-25v32m30-20v31" fill="none" stroke="#d4ac71" strokeWidth="5" strokeLinecap="round" /><Tree x={168} y={94} scale={.48} /></>,
  languageCave: <><path d="M34 119 44 78 74 49 115 47 150 72 171 119Z" fill="#98a091" /><path d="M48 113 60 80 80 61l19 8 17-12 28 28 10 30" fill="#b1b5a3" /><path d="M73 120v-23q0-35 27-35t27 35v23" fill="#555e4a" /><path d="M85 120v-24q0-25 16-25t15 25v24" fill="#394632" /><path d="M45 117l9-13 14 15m67 0 8-18 14 16" fill="#7b8d70" /></>,
  wordVillage: <><House x={57} y={106} scale={.72} /><House x={140} y={105} scale={.76} /><House x={99} y={126} scale={.85} /><Tree x={172} y={119} scale={.45} /><path d="M82 133h39" stroke="#dabb82" strokeWidth="7" strokeLinecap="round" /></>,
  library: <><rect x="48" y="65" width="104" height="56" rx="4" fill="#e7d6ad" /><path d="M36 66 100 30 164 66Z" fill="#64b9c9" /><path d="M51 66h98M53 117h94" stroke="#b89b67" strokeWidth="5" /><path d="M62 74v37m75-37v37" stroke="#f8edce" strokeWidth="10" /><path d="M87 118V88q13-16 26 0v30" fill="#8a633d" /><path d="M80 51v-15q12-3 20 3 8-6 20-3v15q-12-3-20 3-8-6-20-3Z" fill="#fff1c8" stroke="#c0a06a" strokeWidth="2" /></>,
  wordTower: <><path d="M77 119 81 43h38l5 76Z" fill="#d9c69c" stroke="#b29c76" strokeWidth="2" /><path d="M70 44 100 13 130 44Z" fill="#ffa83d" /><path d="M89 118v-22q11-15 22 0v22" fill="#856947" /><path d="M96 56h9v14h-9z" fill="#7c947d" /><path d="M100 15V2l22 6-22 7" fill="#c79951" /><path d="M79 80h14m16 4h12M83 49h13" stroke="#bdac85" strokeWidth="3" /><Tree x={148} y={121} scale={.6} /></>,
  rhymeHill: <><path d="M20 125q7-51 48-47 40-86 82-24 25 24 35 71Z" fill="#8fd17a" /><path d="M36 119q54-88 124 0" fill="#bfe89a" /><path d="M63 135q54-8 36-28t26-40" fill="none" stroke="#f4dca5" strokeWidth="10" /><Flowers x={30} y={127} /><Flowers x={163} y={126} /></>,
  storyGate: <><path d="M44 122V57h29v65m54 0V57h29v65" fill="#c3bd9b" stroke="#989779" strokeWidth="3" /><path d="M40 59V40h10v9h9v-9h10v9h9v10m45 0V40h10v9h9v-9h10v9h7v10" fill="#a7aa88" /><path d="M73 85q27-42 54 0" fill="none" stroke="#b4ad86" strokeWidth="16" /><path d="M82 122V87q18-29 36 0v35" fill="#94734b" /><path d="M91 85v37m17-37v37" stroke="#b89767" strokeWidth="3" /><path d="M98 119h5" stroke="#e2c87f" strokeWidth="3" /></>,
  storyCastle: <><path d="M42 120V56h32v64m52 0V56h32v64M74 120V71h52v49" fill="#e4d6b4" stroke="#b6a27e" strokeWidth="2" /><path d="M36 58 58 26 80 58m40 0 22-32 22 32" fill="#64b9c9" /><path d="M83 73V39h34v34" fill="#efdfb9" /><path d="M77 40 100 9 123 40Z" fill="#4db9e5" /><path d="M100 10V0l23 5-23 8" fill="#d7ad56" /><path d="M89 121V99q11-18 22 0v22" fill="#93734d" /><path d="M52 71h11v16H52zm85 0h11v16h-11zM96 48h8v12h-8z" fill="#91abaa" /><path d="M37 124h128" stroke="#c9b481" strokeWidth="6" strokeLinecap="round" /></>,
}

export default function AdventureLocationArtwork({ type, status, isCheckpoint = false }: { type: AdventureNodeType; status: LessonStatus; isCheckpoint?: boolean }) {
  // Normalize visible scene height, not just the outer SVG box, against a shared ground line.
  const sceneTop: Record<AdventureNodeType, number> = { alphabetZone: 53, rhymeHill: 28, spellingBridge: 53, readingForest: 23, wordVillage: 50, library: 30, languageCave: 47, wordTower: 2, storyGate: 40, storyCastle: 0 }
  const scaleY = 120 / (140 - sceneTop[type])
  return <svg viewBox="-10 -10 220 170" preserveAspectRatio="xMidYMid meet" aria-hidden="true" data-checkpoint={isCheckpoint || undefined} className={`${styles.artwork} ${styles.location} ${status === 'locked' ? styles.unexplored : ''}`}>
    <ellipse cx="100" cy="126" rx="87" ry="18" fill="#8fd17a" /><ellipse cx="100" cy="121" rx="82" ry="17" fill="#bfe89a" />
    <g transform={`translate(0 ${140 * (1 - scaleY)}) scale(1 ${scaleY})`}>
    {artwork[type]}
    {type === 'readingForest' && <><Book x={100} y={117} /></>}
    {type === 'spellingBridge' && <><Rock x={39} y={119} /><Rock x={157} y={129} /><path d="M87 135h18m-6-7h15" stroke="#dff4ff" strokeWidth="2" strokeLinecap="round" /></>}
    {type === 'library' && <><Tree x={31} y={117} scale={.55} /><Book x={156} y={120} /></>}
    {type === 'languageCave' && <><circle cx="100" cy="96" r="16" fill="#ffd65a" opacity=".16" /><path d="M94 91h12v16H94z" fill="#ffd65a" stroke="#9a6a3f" strokeWidth="2" /></>}
    {type === 'storyCastle' && <><Tree x={25} y={124} scale={.45} /><Flowers x={175} y={132} /><path d="M88 22l-3-12 10 6 5-10 5 10 10-6-3 12Z" fill="#ffd65a" /></>}
    </g>
    <path d="M29 127l-3-5m3 5 4-7m130 10 3-6m-3 6-4-5" stroke="#789c61" strokeWidth="2" strokeLinecap="round" />
    {status === 'locked' && <g fill="#e3eade" opacity=".24"><ellipse cx="78" cy="108" rx="57" ry="13" /><ellipse cx="131" cy="121" rx="54" ry="11" /><ellipse cx="112" cy="79" rx="47" ry="8" /></g>}
    {type === 'storyCastle' && status === 'completed' && <path d="M83 26l-4-16 13 8 8-14 8 14 13-8-4 16Z" fill="#ffce67" stroke="#b99547" strokeWidth="2" />}
  </svg>
}

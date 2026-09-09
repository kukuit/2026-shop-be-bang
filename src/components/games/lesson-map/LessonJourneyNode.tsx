import Link from 'next/link'
import { Check, LockKeyhole, Star } from 'lucide-react'
import type { LessonMapItem, LessonStatus } from './data'
import IslandArtwork from './IslandArtwork'
import PlanetArtwork from './PlanetArtwork'
import AdventureLocationArtwork from './AdventureLocationArtwork'
import CappyExplorer from './CappyExplorer'
import type { JourneyTheme } from './LessonJourneyMap'
import styles from './LessonMap.module.css'

export function LessonStars({ stars }: { stars: number }) {
  return <span className={styles.stars} aria-label={`${stars} trên 3 sao`}>{[1, 2, 3].map(value => <Star key={value} size={17} aria-hidden="true" fill={value <= stars ? '#ffc94b' : 'none'} color={value <= stars ? '#b87908' : '#7896a6'} />)}</span>
}

export default function LessonJourneyNode({ theme = 'ocean', lesson, status = lesson.status, stars = lesson.stars, onClick }: { theme?: JourneyTheme; lesson: LessonMapItem; status?: LessonStatus; stars?: number; onClick?: () => void }) {
  const label = `${theme !== 'ocean' ? lesson.title : `Bài ${lesson.id}: ${lesson.title}`}${lesson.mapTitle ? ` - ${lesson.mapTitle}` : ''}${lesson.shortTitle ? `: ${lesson.shortTitle}` : ''}${status === 'locked' ? ', chưa mở' : status === 'completed' ? ', đã hoàn thành' : status === 'current' ? ', tiếp theo' : ''}`
  const content = <>
    <span className={styles.number}>{theme === 'adventure' ? lesson.id : String(lesson.id).padStart(2, '0')}
      {status === 'completed' && <span className={styles.check}><Check size={13} strokeWidth={4} /></span>}
      {status === 'locked' && <span className={styles.lock}><LockKeyhole size={13} /></span>}
    </span>
    {theme === 'adventure' ? <AdventureLocationArtwork type={lesson.nodeType ?? 'alphabetZone'} status={status} isCheckpoint={lesson.isCheckpoint} /> : theme === 'space' ? <PlanetArtwork id={lesson.id} status={status} /> : <IslandArtwork variant={(lesson.id - 1) % 4} status={status} checkpoint={[5, 10, 15, 20, 25, 30, 35, 41].includes(lesson.id) ? lesson.id : undefined} />}
    {theme === 'adventure' && status === 'current' && <CappyExplorer small />}
    <span className={styles.lessonTitle}>{lesson.mapTitle ?? lesson.title}</span>
    {lesson.shortTitle && <span className={styles.shortTitle}>{lesson.shortTitle}</span>}
    {stars !== undefined && <LessonStars stars={stars} />}
    {status === 'current' && <span className={styles.next}>{theme !== 'ocean' ? 'Đang học' : 'Tiếp theo'} <span aria-hidden="true">→</span></span>}
  </>
  const className = `${styles.island} ${styles[status]}`
  return status === 'locked'
    ? <button type="button" className={className} aria-label={label} aria-disabled="true" onClick={onClick}>{content}</button>
    : <Link href={lesson.href} prefetch={false} className={className} aria-label={label} aria-current={status === 'current' ? 'step' : undefined} onClick={onClick} onKeyDown={event => { if (event.key === ' ') { event.preventDefault(); event.currentTarget.click() } }}>{content}</Link>
}

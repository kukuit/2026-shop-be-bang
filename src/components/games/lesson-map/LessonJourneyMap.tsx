'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { getMapPosition, getMapRegion, type LessonMapItem } from './data'
import { getSpaceRegion } from './englishData'
import ClassProgress from './ClassProgress'
import CappyAstronaut from './CappyAstronaut'
import CappyExplorer from './CappyExplorer'
import LessonJourneyNode from './LessonJourneyNode'
import styles from './LessonMap.module.css'

export function scrollToCurrentLesson(node: HTMLElement | null, lessonId: number) {
  if (!node || lessonId <= 4) return
  const rect = node.getBoundingClientRect()
  if (rect.top >= 80 && rect.bottom <= window.innerHeight) return
  node.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
}

function LessonPath({ points, width, height, theme }: { theme: JourneyTheme; points: { x: number; y: number }[]; width: number; height: number }) {
  if (!width || points.length < 2) return null
  const path = points.slice(1).map((point, index) => {
    const previous = points[index]
    if (theme === 'adventure') {
      // Join scene edges, leaving the bridge and other scene interiors unobstructed.
      if (Math.abs(point.y - previous.y) < 80) {
        const direction = Math.sign(point.x - previous.x)
        const start = previous.x + direction * 70
        const end = point.x - direction * 70
        return `M${start},${previous.y} C${(start + end) / 2},${previous.y + 24} ${(start + end) / 2},${point.y + 24} ${end},${point.y}`
      }
      const direction = previous.x > width / 2 ? 1 : -1
      const start = previous.x + direction * 70
      const end = point.x + direction * 70
      const bend = Math.max(12, Math.min(width - 12, Math.max(previous.x * direction, point.x * direction) * direction + direction * 132))
      return `M${start},${previous.y} C${bend},${previous.y} ${bend},${previous.y + 35} ${bend},${previous.y + 70} L${bend},${point.y - 65} Q${bend},${point.y} ${end},${point.y}`
    }
    if (Math.abs(point.y - previous.y) < 1) return `M${previous.x},${previous.y} C${previous.x},${previous.y + 22} ${point.x},${point.y + 22} ${point.x},${point.y}`
    // Leave each island sideways so the route avoids its title and stars.
    const direction = previous.x > width / 2 ? 1 : -1
    const bend = Math.max(8, Math.min(width - 8, previous.x + direction * 125))
    return `M${previous.x},${previous.y} C${bend},${previous.y} ${bend},${previous.y} ${bend},${previous.y + 40} L${bend},${previous.y + 100} C${bend},${point.y - 35} ${point.x},${point.y - 35} ${point.x},${point.y}`
  }).join(' ')
  return <svg className={styles.path} width={width} height={height} aria-hidden="true"><path d={path} fill="none" stroke={theme === 'adventure' ? '#d4ae69' : theme === 'space' ? '#bed2ff' : 'white'} strokeOpacity=".95" strokeWidth="6" strokeDasharray="8 12" strokeLinecap="round" /></svg>
}

function CappyPlaceholder() {
  return <svg className={styles.cappy} viewBox="0 0 90 95" role="img" aria-label="Cappy, bạn đồng hành">
    <ellipse cx="45" cy="85" rx="32" ry="6" fill="#a7dce8" />
    <rect x="20" y="31" width="53" height="51" rx="22" fill="#bf916c" />
    <circle cx="28" cy="33" r="9" fill="#bf916c" /><circle cx="65" cy="33" r="9" fill="#bf916c" />
    <rect x="22" y="42" width="53" height="29" rx="13" fill="#dab18a" />
    <circle cx="36" cy="49" r="3" fill="#493e37" /><circle cx="59" cy="49" r="3" fill="#493e37" />
    <path d="M45 58q5 5 10 0" fill="none" stroke="#493e37" strokeWidth="2" strokeLinecap="round" />
    <path d="M21 31Q43 4 68 31" fill="#fff5d6" /><path d="M16 32h60" stroke="#edc873" strokeWidth="7" strokeLinecap="round" />
    <path d="M24 73l24 9 23-9" fill="none" stroke="#54a9cf" strokeWidth="8" />
  </svg>
}

export type JourneyTheme = 'ocean' | 'space' | 'adventure'
export type LessonJourneyMapProps = {
  theme: JourneyTheme
  items: readonly LessonMapItem[]
  gradeLabel: string
  gradeHref: string
  subjectLabel: string
  title: string
  tagline?: string
  showOverview?: boolean
  autoScroll?: boolean
  guest?: boolean
}
export default function LessonJourneyMap({ theme, items: lessons, gradeLabel, gradeHref, subjectLabel, title, tagline, showOverview = true, autoScroll = false, guest = false }: LessonJourneyMapProps) {
  const isSpace = theme === 'space'
  const isAdventure = theme === 'adventure'
  const gridRef = useRef<HTMLOListElement>(null)
  const [geometry, setGeometry] = useState({ width: 0, height: 0, points: [] as { x: number; y: number }[] })
  const [notice, setNotice] = useState(0)
  const current = lessons.find(lesson => lesson.status === 'current')
  const currentId = current?.id

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const measure = () => {
      const bounds = grid.getBoundingClientRect()
      const points = Array.from(grid.querySelectorAll<HTMLElement>('[data-map-node]')).map(node => {
        const rect = node.getBoundingClientRect()
        return { x: rect.left - bounds.left + rect.width / 2, y: rect.top - bounds.top + 105 }
      })
      setGeometry({ width: bounds.width, height: bounds.height, points })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(grid)
    return () => observer.disconnect()
  }, [lessons.length, theme])

  useEffect(() => {
    if (autoScroll && currentId) scrollToCurrentLesson(gridRef.current?.querySelector<HTMLElement>(`[data-lesson-id="${currentId}"]`) ?? null, currentId)
  }, [autoScroll, currentId])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(0), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])

  return <main className={`${styles.ocean} ${isSpace ? styles.space : isAdventure ? styles.adventure : ''} ${guest ? styles.guest : ''}`}>
    <div className="game-container">
      <nav aria-label="Điều hướng trò chơi" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-bold text-slate-600">
        <Link href="/game" className="text-blue-700 hover:text-blue-800">Game</Link><ChevronRight size={18} aria-hidden="true" /><Link href={gradeHref} className="text-blue-700 hover:text-blue-800">{gradeLabel}</Link><ChevronRight size={18} aria-hidden="true" /><span className="text-slate-800" aria-current="page">{subjectLabel}</span>
      </nav>
      <header className={styles.hero}>
        <div className={styles.intro}>{isSpace ? <CappyAstronaut /> : isAdventure ? <CappyExplorer /> : <CappyPlaceholder />}<div>{showOverview && theme !== 'ocean' && <p className={styles.eyebrow}>{subjectLabel} {gradeLabel}</p>}<h1>{title}</h1>{tagline && <p className={styles.tagline}>{tagline}</p>}</div></div>
        {showOverview && theme !== 'ocean' && <ClassProgress completed={lessons.filter(item => item.status === 'completed').length} total={lessons.length} label={`Tiến độ ${gradeLabel.toLowerCase()}`} unitLabel={isSpace ? 'Unit' : 'bài'} />}
      </header>
      <div className={styles.map}>
        <LessonPath {...geometry} theme={theme} />
        <ol ref={gridRef} className={styles.grid} aria-label={`Hành trình ${lessons.length} ${isSpace ? 'Unit' : 'bài học'}`}>
          {lessons.map((lesson, index) => {
            const desktop = getMapPosition(index, 4)
            const tablet = getMapPosition(index, 2)
            const style = { '--desktop-row': desktop.row, '--desktop-column': desktop.column, '--tablet-row': tablet.row, '--tablet-column': tablet.column, '--mobile-row': index + 1, '--mobile-x': `${[27, 68, 30, 68][index % 4]}%` } as CSSProperties
            return <li key={lesson.lessonId} style={style} data-region={isAdventure ? 'woodland' : isSpace ? getSpaceRegion(lesson.id) : getMapRegion(lesson.id)} data-lesson-id={lesson.id} className={styles.cell}>
              <div data-map-node className={styles.node}><LessonJourneyNode theme={theme} lesson={lesson} lessonOrder={index + 1} onClick={lesson.status === 'locked' ? () => setNotice(value => value + 1) : undefined} /></div>
              {(isAdventure ? index % 3 === 2 : index % 8 === 4) && <span className={styles.decoration} aria-hidden="true">{isAdventure ? '❧' : isSpace ? '✧' : ['🐚', '🪸', '🐟', '⛵', '🐋'][Math.floor(index / 8)]}</span>}
            </li>
          })}
        </ol>
      </div>
      <footer className={styles.finish}><span aria-hidden="true">⚑</span><p>Hoàn thành hành trình {subjectLabel} {gradeLabel.toLowerCase()}</p><small>{lessons.length} {isAdventure ? 'địa điểm' : isSpace ? 'hành tinh' : 'hòn đảo'} đang chờ bé khám phá!</small></footer>
    </div>
    <div role="status" aria-live="polite" className={notice ? styles.toast : styles.hidden}>{notice > 0 && <span key={notice}>🔒 {isAdventure ? 'Khu vực này chưa mở nhé!' : 'Bài học này chưa mở nhé!'}</span>}</div>
  </main>
}

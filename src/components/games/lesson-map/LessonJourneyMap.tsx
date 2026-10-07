'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { getMapPosition, getMapRegion, type LessonMapItem } from './data'
import { getSpaceRegion } from './englishData'
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
export default function LessonJourneyMap({ theme, items: lessons, gradeLabel, subjectLabel, autoScroll = false, guest = false }: LessonJourneyMapProps) {
  const isSpace = theme === 'space'
  const isAdventure = theme === 'adventure'
  const gridRef = useRef<HTMLOListElement>(null)
  const [geometry, setGeometry] = useState({ width: 0, height: 0, points: [] as { x: number; y: number }[] })
  const [notice, setNotice] = useState(0)
  const current = lessons.find(lesson => lesson.status === 'current')
  const currentId = current?.id
  const cappyLessonId = current?.lessonId ?? lessons.find(lesson => lesson.status === 'available')?.lessonId

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
    <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <div className={styles.map}>
        <LessonPath {...geometry} theme={theme} />
        <ol ref={gridRef} className={styles.grid} aria-label={`Hành trình ${lessons.length} ${isSpace ? 'Unit' : 'bài học'}`}>
          {lessons.map((lesson, index) => {
            const desktop = getMapPosition(index, 4)
            const tablet = getMapPosition(index, 2)
            const style = { '--desktop-row': desktop.row, '--desktop-column': desktop.column, '--tablet-row': tablet.row, '--tablet-column': tablet.column, '--mobile-row': index + 1, '--mobile-x': `${[27, 68, 30, 68][index % 4]}%` } as CSSProperties
            return <li key={lesson.lessonId} style={style} data-region={isAdventure ? 'woodland' : isSpace ? getSpaceRegion(lesson.id) : getMapRegion(lesson.id)} data-lesson-id={lesson.id} className={styles.cell}>
              <div data-map-node className={styles.node}><LessonJourneyNode theme={theme} lesson={lesson} lessonOrder={index + 1} showCappy={lesson.lessonId === cappyLessonId} onClick={lesson.status === 'locked' ? () => setNotice(value => value + 1) : undefined} /></div>
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

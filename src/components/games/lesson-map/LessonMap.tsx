'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { buildLessonMapData, demoProgress, getMapPosition, getMapRegion, lessonDefinitions, type LessonProgress } from './data'
import LessonIsland from './LessonIsland'
import styles from './LessonMap.module.css'

export function scrollToCurrentLesson(node: HTMLElement | null, lessonId: number) {
  if (!node || lessonId <= 3) return
  const rect = node.getBoundingClientRect()
  if (rect.top >= 80 && rect.bottom <= window.innerHeight) return
  node.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
}

function LessonPath({ points, width, height }: { points: { x: number; y: number }[]; width: number; height: number }) {
  if (!width || points.length < 2) return null
  const path = points.slice(1).map((point, index) => {
    const previous = points[index]
    if (Math.abs(point.y - previous.y) < 1) return `M${previous.x},${previous.y} C${previous.x},${previous.y + 22} ${point.x},${point.y + 22} ${point.x},${point.y}`
    // Leave each island sideways so the route avoids its title and stars.
    const direction = previous.x > width / 2 ? 1 : -1
    const bend = Math.max(8, Math.min(width - 8, previous.x + direction * 125))
    return `M${previous.x},${previous.y} C${bend},${previous.y} ${bend},${previous.y} ${bend},${previous.y + 40} L${bend},${previous.y + 100} C${bend},${point.y - 35} ${point.x},${point.y - 35} ${point.x},${point.y}`
  }).join(' ')
  return <svg className={styles.path} width={width} height={height} aria-hidden="true"><path d={path} fill="none" stroke="white" strokeOpacity=".95" strokeWidth="6" strokeDasharray="8 12" strokeLinecap="round" /></svg>
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

export default function LessonMap({ progressData }: { progressData?: readonly LessonProgress[] }) {
  const lessons = buildLessonMapData(lessonDefinitions, progressData ?? demoProgress)
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
  }, [])

  useEffect(() => {
    if (progressData && currentId) scrollToCurrentLesson(gridRef.current?.querySelector<HTMLElement>(`[data-lesson-id="${currentId}"]`) ?? null, currentId)
  }, [progressData, currentId])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(0), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])

  return <main className={styles.ocean}>
    <div className="game-container">
      <nav aria-label="Điều hướng trò chơi" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-bold text-slate-600">
        <Link href="/game" className="text-blue-700 hover:text-blue-800">Game</Link><ChevronRight size={18} aria-hidden="true" /><Link href="/game/lop-1" className="text-blue-700 hover:text-blue-800">Lớp 1</Link><ChevronRight size={18} aria-hidden="true" /><span className="text-slate-800" aria-current="page">Toán</span>
      </nav>
      <header className={styles.hero}>
        <div className={styles.intro}><CappyPlaceholder /><h1>Quần đảo toán học</h1></div>
      </header>
      <div className={styles.map}>
        <LessonPath {...geometry} />
        <ol ref={gridRef} className={styles.grid} aria-label="Hành trình 41 bài học">
          {lessons.map((lesson, index) => {
            const desktop = getMapPosition(index, 4)
            const tablet = getMapPosition(index, 2)
            const style = { '--desktop-row': desktop.row, '--desktop-column': desktop.column, '--tablet-row': tablet.row, '--tablet-column': tablet.column, '--mobile-row': index + 1, '--mobile-x': `${[27, 68, 30, 68][index % 4]}%` } as CSSProperties
            return <li key={lesson.lessonId} style={style} data-region={getMapRegion(lesson.id)} data-lesson-id={lesson.id} className={styles.cell}>
              <div data-map-node className={styles.node}><LessonIsland lesson={lesson} onClick={lesson.status === 'locked' ? () => setNotice(value => value + 1) : undefined} /></div>
              {index % 8 === 4 && <span className={styles.decoration} aria-hidden="true">{['🐚', '🪸', '🐟', '⛵', '🐋'][Math.floor(index / 8)]}</span>}
            </li>
          })}
        </ol>
      </div>
      <footer className={styles.finish}><span aria-hidden="true">⚑</span><p>Hoàn thành hành trình Toán lớp 1</p><small>41 hòn đảo đang chờ bé khám phá!</small></footer>
    </div>
    <div role="status" aria-live="polite" className={notice ? styles.toast : styles.hidden}>{notice > 0 && <span key={notice}>🔒 Hoàn thành bài trước để mở bài này nhé!</span>}</div>
  </main>
}

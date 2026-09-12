'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ChevronDown, Circle, RefreshCw } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useGameProfile } from '@/components/games/profile/GameProfileProvider'
import { getActiveProgressGrade, getSubjectLessons, SUBJECTS, type SubjectId } from '@/lib/game-progress/config'
import { subjectProgressOptions } from '@/lib/game-progress/queries'
import LessonGoalAccordion from './LessonGoalAccordion'
import { ProgressError, ProgressLoading } from './ProgressStates'

export default function SubjectProgressView({ subjectId }: { subjectId: SubjectId }) {
  const { user, loading } = useAuth()
  const profile = useGameProfile()
  const grade = getActiveProgressGrade(profile)
  const userId = user?.id ?? ''
  const ready = !loading && !profile.isLoading && !!user?.activeGame
  const query = useQuery({ ...subjectProgressOptions(userId, grade, subjectId), enabled: ready })
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const subject = SUBJECTS.find(item => item.id === subjectId)!
  const lessons = getSubjectLessons(grade, subjectId)
  const data = query.data
  const current = lessons.find(lesson => lesson.lessonId === data?.currentLessonId)
  const scope = `${userId}:${grade}:${subjectId}`

  if (profile.error && profile.isLoading) return <ProgressError message={profile.error} retry={profile.retry} />
  if (!loading && !user?.activeGame) return <p role="status">Vui lòng đăng nhập tài khoản có quyền chơi game.</p>
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm text-slate-500">Tiến trình học</p><h1 className="text-2xl font-black text-slate-900">{subject.label}{!profile.isLoading && ` — Lớp ${grade}`}</h1></div>
      <button type="button" disabled={!ready || query.isFetching} onClick={() => { void query.refetch() }} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw size={16} />Làm mới</button>
    </header>
    {query.isError ? <ProgressError retry={() => { void query.refetch() }} /> : !ready || !data ? <ProgressLoading /> : <>
      <section aria-label="Tổng hợp môn học" className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5"><p className="text-sm font-semibold text-blue-700">Hoàn thành</p><p className="mt-2 text-3xl font-black text-blue-900">{data.completedLessons} / {data.totalLessons} bài</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Độ chính xác</p><p className="mt-2 text-xl font-black text-slate-900">{data.accuracy === null ? 'Chưa có dữ liệu trả lời' : `${data.accuracy}% đúng`}</p><p className="mt-1 text-xs text-slate-500">{data.attempts > 0 && `${data.correct} đúng / ${data.attempts} lượt`}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Đang học</p><p className="mt-2 text-xl font-black text-slate-900">{current ? `Bài ${current.id}` : lessons.length ? 'Đã hoàn thành các bài' : 'Chưa có bài học'}</p><p className="mt-1 text-xs text-slate-500">{current?.title}</p></div>
      </section>
      <section aria-label="Danh sách bài học" className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Các bài học</h2>
        {!lessons.length && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-slate-500">Chưa có cấu hình bài học {subject.label} lớp {grade}.</p>}
        {lessons.map(lesson => {
          const summary = data.lessons[lesson.lessonId]
          const completed = summary?.completed === true
          const isCurrent = lesson.lessonId === data.currentLessonId
          const key = `${scope}:${lesson.lessonId}`
          const isExpanded = expanded[key] === true
          return <article key={key} className={`overflow-hidden rounded-2xl border bg-white ${isCurrent ? 'border-blue-300' : 'border-slate-200'}`}>
            <h3><button type="button" aria-expanded={isExpanded} aria-controls={`goals-${lesson.lessonId}`} onClick={() => setExpanded(value => ({ ...value, [key]: !value[key] }))} className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-blue-500">
              {completed ? <CheckCircle2 size={22} className="shrink-0 text-emerald-600" /> : <Circle size={22} className={`shrink-0 ${isCurrent ? 'fill-blue-100 text-blue-600' : 'text-slate-300'}`} />}
              <span className="min-w-0 flex-1"><span className="block font-bold text-slate-800">Bài {lesson.id} — {lesson.title}</span><span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-normal text-slate-500"><span>{summary?.attempts ? `${summary.accuracy}% đúng` : 'Chưa học'}</span><span>{summary?.completedGames ?? 0}/{new Set(lesson.games).size} game</span><span>{completed ? 'Đã hoàn thành' : isCurrent ? 'Đang học' : lesson.available ? 'Có thể học' : 'Sắp có'}</span></span></span>
              <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-700">{isExpanded ? 'Thu gọn' : 'Xem'}<ChevronDown size={16} className={`transition-transform motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`} /></span>
            </button></h3>
            <div id={`goals-${lesson.lessonId}`} hidden={!isExpanded} className="border-t border-slate-100 p-4 sm:p-5">
              <LessonGoalAccordion userId={userId} grade={grade} subject={subjectId} lessonId={lesson.lessonId} isExpanded={isExpanded} />
              {isExpanded && lesson.available && <Link href={lesson.href} prefetch={false} className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">{completed ? 'Luyện lại bài này' : 'Vào học'} →</Link>}
            </div>
          </article>
        })}
      </section>
    </>}
  </div>
}

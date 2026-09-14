'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useGameProfile } from '@/components/games/profile/GameProfileProvider'
import { getActiveProgressGrade, getSubjectLessons, SUBJECTS } from '@/lib/game-progress/config'
import { subjectOverviewOptions } from '@/lib/game-progress/queries'
import { getOverviewLesson } from '@/lib/game-progress/overview-presentation'

type Subject = (typeof SUBJECTS)[number]

function lessonLabel(lesson: { id: number; title: string }) {
  const title = lesson.title.trim()
  return new RegExp(`^Bài\\s+${lesson.id}(?=\\s|[:.·–—-]|$)`, 'i').test(title)
    ? title
    : `Bài ${lesson.id} · ${title}`
}

export default function SubjectOverviewCard({ subject }: { subject: Subject }) {
  const { user, loading } = useAuth()
  const profile = useGameProfile()
  const grade = getActiveProgressGrade(profile)
  return <SubjectCard key={`${user?.id ?? 'guest'}:${grade}`} subject={subject} userId={user?.id ?? ''}
    grade={grade} ready={!loading && !profile.isLoading && !!user?.activeGame} />
}

function SubjectCard({ subject, userId, grade, ready }: { subject: Subject; userId: string; grade: number; ready: boolean }) {
  const [requested, setRequested] = useState(false)
  const query = useQuery({ ...subjectOverviewOptions(userId, grade, subject.id), enabled: ready && requested,
    refetchOnMount: false, refetchOnReconnect: false })
  const data = requested ? query.data : undefined
  // During a rolling update, a legacy response must never imply an empty assessment.
  const weakGoals = data?.weakGoals ?? (data?.weakestGoal
    ? [{ ...data.weakestGoal, id: data.weakestGoal.title }] : null)
  const loading = requested && query.isPending && !query.isError
  const current = data ? getOverviewLesson(data) : null
  const lessons = getSubjectLessons(grade, subject.id)
  const panelId = `overview-${subject.id}`
  const detailLink = <Link href={subject.route} prefetch={false} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Xem chi tiết <ArrowRight aria-hidden="true" size={16} /></Link>

  return <article className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <header>
      <span className="inline-flex rounded-xl bg-slate-50 p-2.5"><BookOpen aria-hidden="true" size={22} className="text-blue-600" /></span>
      <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{subject.label}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">Theo dõi tiến trình học môn {subject.label}</p>
    </header>
    <div id={panelId} className="relative mt-6 flex-1" aria-busy={loading} aria-live="polite">
      <div className={`space-y-6 ${!data ? 'opacity-40' : ''}`}>
        <dl className="grid grid-cols-2 gap-3">
          <div className="flex min-w-0 flex-col-reverse gap-1"><dt className="text-xs leading-5 text-slate-500">Bài hoàn thành</dt><dd className="text-2xl font-bold tracking-tight text-slate-900">{data ? data.completedLessons : '--'}<span className="text-base font-medium text-slate-500"> / {data ? data.totalLessons : ready ? lessons.length : '--'} bài</span></dd></div>
          <div className="flex min-w-0 flex-col-reverse gap-1"><dt className="text-xs leading-5 text-slate-500">Độ chính xác tích lũy</dt><dd className="text-2xl font-bold tracking-tight text-slate-900">{!data ? '--%' : `${data.accuracy ?? 0}%`}</dd></div>
        </dl>
        {!data ? <div aria-hidden="true" className="min-h-36 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bài hiện tại / tiếp theo</p><div className="h-4 w-4/5 rounded bg-slate-200" /><div className="h-3 w-2/5 rounded bg-slate-200" /><div className="h-3 w-1/3 rounded bg-slate-200" /></div>
          : current?.allCompleted ? <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-700">Đã hoàn thành toàn bộ chương trình</p>
          : current?.lesson && <section className="space-y-2.5 rounded-xl border border-slate-100 bg-slate-50 p-4" aria-label={current.label}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{current.label}</h3>
            <p className="break-words text-sm font-semibold leading-relaxed text-slate-800">{lessonLabel(current.lesson)}</p>
            {current.inProgress && <p className="text-sm text-slate-500">{current.summary?.completionKnown === false ? 'Chưa đủ dữ liệu xác nhận game hoàn thành' : `${current.summary?.completedGames ?? 0} / ${current.summary?.totalGames ?? new Set(current.lesson.games).size} game`}</p>}
            {current.lesson.available ? <Link href={current.lesson.href} prefetch={false} className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:underline">{current.action} <ArrowRight aria-hidden="true" size={16} /></Link>
              : <p className="text-sm text-slate-500">Sắp có</p>}
          </section>}
        {!data ? <div aria-hidden="true"><h3 className="text-sm font-semibold text-slate-700">Cần luyện thêm</h3><div className="mt-2 divide-y divide-slate-100">{[0, 1, 2].map(index => <div key={index} className="space-y-2 py-3"><div className="flex items-center justify-between gap-4"><div className="h-3 w-3/5 rounded bg-slate-200" /><span className="text-sm text-slate-400">--%</span></div><div className="h-2.5 w-4/5 rounded bg-slate-100" /></div>)}</div></div>
          : !!weakGoals?.length ? <section className="text-sm text-slate-800" aria-label="Cần luyện thêm">
          <h3 className="font-semibold">Cần luyện thêm</h3>
          <ul className="mt-2 divide-y divide-slate-100">
            {weakGoals.map(goal => {
              const lesson = lessons.find(item => item.lessonId === goal.lessonId)
              if (!lesson) return null
              return <li key={`${goal.lessonId}:${goal.id}`}><Link href={lesson.href} prefetch={false} className="block rounded-lg py-3 transition-colors hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                <span className="flex items-start justify-between gap-3"><span className="min-w-0 break-words font-semibold">{goal.title}</span><span className="shrink-0 font-bold">{goal.accuracy}%</span></span>
                <span className="mt-1.5 flex items-center gap-2 text-xs text-slate-500"><span className="min-w-0 flex-1 truncate" title={lessonLabel(lesson)}>{lessonLabel(lesson)}</span><ArrowRight aria-hidden="true" size={14} className="shrink-0" /></span>
              </Link></li>
            })}
          </ul>
        </section> : null}
        {data && !data.totalLessons && <p className="text-sm text-slate-500">Chưa có bài học cho lớp {grade}.</p>}
      </div>
      {!data && <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/20 p-3">
        {requested && query.isError ? <div role="alert" className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm shadow-sm"><p className="text-slate-600">Không thể tải tiến trình. Vui lòng thử lại.</p><button type="button" disabled={query.isFetching} onClick={() => { void query.refetch() }} className="mt-3 font-semibold text-blue-700 hover:underline disabled:opacity-50">{query.isFetching ? 'Đang tải...' : 'Thử lại'}</button></div>
          : <button type="button" disabled={!ready || loading} aria-controls={panelId} onClick={() => setRequested(true)} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60">
            {loading && <Loader2 aria-hidden="true" size={16} className="animate-spin motion-reduce:animate-none" />}{loading ? 'Đang tải...' : 'Xem thống kê'}
          </button>}
      </div>}
    </div>
    <footer className="mt-6 pt-1">{detailLink}</footer>
  </article>
}

'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowLeft,
  Award,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock3,
  Gamepad2,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { createDashboardService, dashboardService } from '../_data/dashboard.service'
import type {
  GameEvidence,
  LearningStatus,
  Lesson,
  Objective,
  Student,
  StudentOverview,
  StudentRecord,
  SubjectSummary,
} from '../_data/types'

const statusConfig: Record<LearningStatus, { label: string; className: string }> = {
  mastered: { label: 'Đã đạt', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  practicing: { label: 'Đang luyện', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  needs_practice: { label: 'Cần luyện thêm', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
  no_data: { label: 'Chưa có dữ liệu', className: 'bg-slate-100 text-slate-500 ring-slate-200' },
}

function StatusBadge({ status }: { status: LearningStatus }) {
  const item = statusConfig[status]
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${item.className}`}
    >
      {item.label}
    </span>
  )
}
function ProgressBar({
  value,
  tone = 'pink',
}: {
  value: number
  tone?: 'pink' | 'blue' | 'green'
}) {
  const colors = { pink: 'bg-pink-500', blue: 'bg-sky-500', green: 'bg-emerald-500' }
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all ${colors[tone]}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
function EmptyState({
  title = 'Chưa có dữ liệu',
  detail = 'Dữ liệu học tập sẽ xuất hiện sau khi bé bắt đầu luyện tập.',
}: {
  title?: string
  detail?: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <BookOpen className="mx-auto mb-3 text-slate-300" size={34} />
      <p className="font-bold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  )
}

function Selector({
  label,
  value,
  children,
  onChange,
}: {
  label: string
  value: string | number
  children: React.ReactNode
  onChange: (value: string) => void
}) {
  return (
    <label className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <span className="hidden text-slate-500 sm:inline">{label}:</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="appearance-none bg-transparent pr-6 font-bold text-slate-800 outline-none"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 text-slate-400" size={15} />
    </label>
  )
}

function Header({
  studentId,
  grade,
  onStudent,
  onGrade,
  onMenu,
}: {
  studentId: string
  grade: number
  onStudent: (id: string) => void
  onGrade: (grade: number) => void
  onMenu: () => void
}) {
  const students = dashboardService.getStudents()
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="flex min-h-20 items-center justify-between gap-3 px-4 lg:px-7">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenu}
            className="rounded-lg p-2 text-slate-600 lg:hidden"
            aria-label="Mở menu"
          >
            <Menu />
          </button>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-pink-500 text-white shadow-sm">
            <GraduationCap size={22} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-pink-500">
              Shop Bé Băng
            </p>
            <h1 className="hidden text-lg font-black text-slate-900 sm:block">
              Learning Dashboard
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden text-right xl:block">
            <p className="text-xs text-slate-400">Cập nhật gần nhất</p>
            <p className="text-sm font-semibold text-slate-700">Hôm nay · 20:35</p>
          </div>
          <Selector label="Bé" value={studentId} onChange={onStudent}>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </Selector>
          <Selector label="Lớp" value={grade} onChange={(value) => onGrade(Number(value))}>
            {[1, 2, 3, 4, 5].map((item) => (
              <option key={item} value={item}>
                Lớp {item}
              </option>
            ))}
          </Selector>
        </div>
      </div>
    </header>
  )
}

function Sidebar({
  open,
  subjectId,
  summaries,
  onClose,
  onOverview,
  onSubject,
  onHistory,
}: {
  open: boolean
  subjectId: string | null
  summaries: SubjectSummary[]
  onClose: () => void
  onOverview: () => void
  onSubject: (id: string) => void
  onHistory: () => void
}) {
  return (
    <>
      <button
        aria-label="Đóng menu"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/30 lg:hidden ${open ? 'block' : 'hidden'}`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white p-5 transition-transform lg:sticky lg:top-20 lg:z-20 lg:h-[calc(100vh-5rem)] lg:w-64 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <p className="font-black">Điều hướng</p>
          <button onClick={onClose} className="p-2">
            <X size={20} />
          </button>
        </div>
        <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[.16em] text-slate-400">
          Tổng quan
        </p>
        <button
          onClick={onOverview}
          className={`mb-6 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold ${subjectId === null ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <LayoutDashboard size={18} />
          Tổng quan
        </button>
        <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[.16em] text-slate-400">
          Môn học
        </p>
        <div className="space-y-2">
          {summaries.map(({ subject, progress }) => (
            <button
              key={subject.id}
              onClick={() => onSubject(subject.id)}
              className={`w-full rounded-xl px-3 py-3 text-left ${subjectId === subject.id ? 'bg-sky-50 ring-1 ring-sky-200' : 'hover:bg-slate-50'}`}
            >
              <span className="flex items-center justify-between text-sm font-bold text-slate-700">
                <span className="flex items-center gap-3">
                  <BookOpen size={18} className="text-sky-600" />
                  {subject.name}
                </span>
                <span>{progress}%</span>
              </span>
              <div className="mt-2">
                <ProgressBar value={progress} tone="blue" />
              </div>
              <span className="mt-1 block text-[11px] text-slate-400">{progress}% hoàn thành</span>
            </button>
          ))}
        </div>
        <p className="mb-2 mt-7 px-3 text-[11px] font-black uppercase tracking-[.16em] text-slate-400">
          Khác
        </p>
        <button
          onClick={onHistory}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold ${subjectId === 'history' ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Clock3 size={18} />
          Lịch sử chơi
        </button>
        <button className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
          <TrendingUp size={18} />
          Tiến bộ
        </button>
        <Link href="/admin/users" className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
          <Users size={18} />
          Users
        </Link>
      </aside>
    </>
  )
}

function Breadcrumb({
  studentName,
  grade,
  subjectName,
  lesson,
  onHome,
  onSubject,
}: {
  studentName: string
  grade: number
  subjectName?: string
  lesson?: Lesson
  onHome: () => void
  onSubject: () => void
}) {
  return (
    <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
      <button onClick={onHome} className="font-semibold hover:text-pink-600">
        {studentName}
      </button>
      <ChevronRight size={14} />
      <button onClick={onHome} className="hover:text-pink-600">
        Lớp {grade}
      </button>
      {subjectName && (
        <>
          <ChevronRight size={14} />
          <button onClick={onSubject} className="hover:text-pink-600">
            {subjectName}
          </button>
        </>
      )}
      {lesson && (
        <>
          <ChevronRight size={14} />
          <span className="font-semibold text-slate-800">Bài {lesson.order}</span>
        </>
      )}
    </nav>
  )
}

function Overview({ data, onSubject }: { data: StudentOverview; onSubject: (id: string) => void }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-3xl border border-pink-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-pink-500">
                Tiến độ học tập
              </p>
              <p className="mt-3 text-5xl font-black text-slate-900">{data.progress}%</p>
              <p className="mt-2 text-sm text-slate-500">
                <b className="text-slate-800">
                  {data.masteredObjectives}/{data.totalObjectives}
                </b>{' '}
                mục tiêu đã đạt
              </p>
            </div>
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-pink-50 text-pink-500">
              <Target />
            </span>
          </div>
          <div className="mt-7">
            <ProgressBar value={data.progress} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {data.subjects.map((item) => (
            <button
              key={item.subject.id}
              onClick={() => onSubject(item.subject.id)}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200"
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-800">{item.subject.name}</span>
                <span className="text-xl font-black text-sky-600">{item.progress}%</span>
              </div>
              <div className="mt-4">
                <ProgressBar value={item.progress} tone="blue" />
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <ObjectiveList
          title="Cần chú ý"
          icon={<Target size={19} />}
          items={data.attention}
          empty="Chưa có mục tiêu cần chú ý"
        />
        <ObjectiveList
          title="Đang làm tốt"
          icon={<Award size={19} />}
          items={data.strong}
          empty="Chưa có mục tiêu đã đạt"
        />
      </section>
      <RecentActivities data={data} />
    </div>
  )
}

function ObjectiveList({
  title,
  icon,
  items,
  empty,
}: {
  title: string
  icon: React.ReactNode
  items: StudentOverview['attention']
  empty: string
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 font-black text-slate-900">
        {icon}
        {title}
      </h2>
      {items.length ? (
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <div key={item.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-800">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.subject.name} · Bài {item.lesson.order}
                  </p>
                </div>
                <b className="text-lg text-slate-800">{item.score}%</b>
              </div>
              <div className="mt-2">
                <StatusBadge status={item.status} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-slate-400">{empty}</p>
      )}
    </section>
  )
}

function RecentActivities({ data }: { data: StudentOverview }) {
  const games = dashboardService.getGames()
  const subjects = dashboardService.getSubjects()
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 font-black">
        <Activity size={19} />
        Hoạt động gần đây
      </h2>
      {data.recentActivities.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.recentActivities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex justify-between gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-pink-500">
                  <Gamepad2 size={18} />
                </span>
                <b className="text-lg">{activity.score}%</b>
              </div>
              <p className="mt-3 font-bold">
                {games.find((game) => game.id === activity.gameId)?.name}
              </p>
              <p className="text-xs text-slate-500">
                {subjects.find((subject) => subject.id === activity.subjectId)?.name} ·{' '}
                {activity.correct}/{activity.total} câu đúng
              </p>
              <p className="mt-2 text-xs text-slate-400">{activity.when}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  )
}

function SubjectView({
  summary,
  lessons,
  onLesson,
}: {
  summary: SubjectSummary
  lessons: Lesson[]
  onLesson: (lesson: Lesson) => void
}) {
  const [query, setQuery] = useState('')
  const visible = lessons.filter((lesson) =>
    lesson.title.toLowerCase().includes(query.toLowerCase())
  )
  return (
    <div className="space-y-6">
      <section>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [summary.total, 'Mục tiêu'],
            [summary.mastered, 'Đã đạt'],
            [summary.practicing, 'Đang luyện'],
            [summary.noData, 'Chưa học'],
          ].map(([value, label]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-3xl font-black">{value}</p>
              <p className="text-sm text-slate-500">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex justify-between">
            <b>Tiến độ môn học</b>
            <b className="text-sky-600">{summary.progress}%</b>
          </div>
          <ProgressBar value={summary.progress} tone="blue" />
        </div>
      </section>
      <section>
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="font-black uppercase tracking-wide text-slate-800">Danh sách bài học</h2>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <Search size={16} className="text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm bài học..."
              className="w-48 outline-none"
            />
          </label>
        </div>
        {visible.length ? (
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {visible.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} onClick={() => onLesson(lesson)} />
            ))}
          </div>
        ) : (
          <EmptyState title="Không tìm thấy bài học" detail="Thử một từ khóa khác." />
        )}
      </section>
    </div>
  )
}

function LessonCard({ lesson, onClick }: { lesson: Lesson; onClick: () => void }) {
  const mastered = lesson.objectives.filter((item) => item.status === 'mastered').length
  return (
    <button
      onClick={onClick}
      className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-pink-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-black uppercase tracking-[.16em] text-pink-500">
          Bài {lesson.order}
        </span>
        <ChevronRight className="text-slate-300 group-hover:text-pink-500" />
      </div>
      <h3 className="mt-3 text-lg font-black text-slate-900">{lesson.title}</h3>
      <p className="mt-7 text-sm text-slate-500">
        {mastered}/{lesson.objectives.length} mục tiêu đã đạt
      </p>
      <div className="mt-3">
        <ProgressBar value={lesson.progress} tone={lesson.progress >= 85 ? 'green' : 'pink'} />
      </div>
      <p className="mt-2 text-right text-sm font-bold">{lesson.progress}%</p>
    </button>
  )
}

function GameEvidenceList({ items }: { items: GameEvidence[] }) {
  const gameCatalog = dashboardService.getGames()
  if (!items.length)
    return <p className="text-sm text-slate-400">Chưa có game cung cấp evidence.</p>
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.gameId} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex justify-between">
            <p className="font-bold">
              {gameCatalog.find((game) => game.id === item.gameId)?.name ?? item.gameId}
            </p>
            <b>{item.accuracy}%</b>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {item.attempts} lượt chơi · {item.correct}/{item.total} câu đúng
          </p>
          <div className="mt-3">
            <ProgressBar value={item.accuracy} tone="blue" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ObjectiveCard({ objective }: { objective: Objective }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-pink-500">
            Mục tiêu học tập
          </p>
          <h3 className="mt-2 text-xl font-black text-slate-900">{objective.title}</h3>
          <div className="mt-3">
            <StatusBadge status={objective.status} />
          </div>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-4xl font-black">{objective.score}%</p>
          <p className="text-xs text-slate-400">Điểm tổng hợp</p>
        </div>
      </div>
      <div className="mt-6">
        <p className="mb-3 text-sm font-bold text-slate-700">Game cung cấp dữ liệu đánh giá</p>
        <GameEvidenceList items={objective.games} />
      </div>
      {objective.games.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-500">
          <div>
            <b className="block text-base text-slate-800">{objective.games.at(-1)?.latestScore}%</b>
            Gần nhất
          </div>
          <div>
            <b className="block text-base text-slate-800">
              {Math.max(...objective.games.map((item) => item.bestScore))}%
            </b>
            Tốt nhất
          </div>
          <div>
            <b className="block text-base text-emerald-600">{objective.trend}</b>Xu hướng
          </div>
        </div>
      )}
      <button
        onClick={() => setExpanded((value) => !value)}
        className="mt-5 flex items-center gap-2 text-sm font-bold text-pink-600 hover:text-pink-700"
      >
        {expanded ? 'Thu gọn chi tiết' : 'Xem chi tiết skill key'}
        <ChevronDown size={16} className={expanded ? 'rotate-180' : ''} />
      </button>
      {expanded && <SkillGrid objective={objective} />}
    </article>
  )
}

function SkillGrid({ objective }: { objective: Objective }) {
  const entries = Object.entries(objective.skillPerformance)
  return (
    <div className="mt-5 border-t border-slate-100 pt-5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={18} className="text-amber-500" />
        <p className="font-bold">Hiệu quả theo từng skill key</p>
      </div>
      {entries.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {entries.map(([key, value]) => {
            const status: LearningStatus =
              value.accuracy >= 80
                ? 'mastered'
                : value.accuracy >= 70
                  ? 'practicing'
                  : 'needs_practice'
            return (
              <div
                key={key}
                className={`rounded-2xl p-4 text-center ring-1 ring-inset ${statusConfig[status].className}`}
              >
                <p className="text-xs font-bold uppercase opacity-70">
                  {key.replace('number-', 'Số ')}
                </p>
                <p className="my-2 text-2xl font-black">{value.accuracy}%</p>
                <p className="text-[11px] font-bold">{statusConfig[status].label}</p>
                <p className="mt-2 text-[10px] opacity-60">
                  {value.correct}/{value.attempts} câu đúng
                </p>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  )
}

function LessonView({ lesson, onBack }: { lesson: Lesson; onBack: () => void }) {
  const mastered = lesson.objectives.filter((item) => item.status === 'mastered').length
  const practicing = lesson.objectives.filter(
    (item) => item.status === 'practicing' || item.status === 'needs_practice'
  ).length
  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-pink-600"
      >
        <ArrowLeft size={17} />
        Quay lại danh sách bài
      </button>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[.17em] text-pink-500">
          Bài {lesson.order}
        </p>
        <h2 className="mt-2 text-3xl font-black">{lesson.title}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <b>Tiến độ bài học</b>
              <b>{lesson.progress}%</b>
            </div>
            <ProgressBar value={lesson.progress} />
          </div>
          <div className="flex gap-4 text-sm text-slate-500">
            <span>
              <b className="text-slate-800">{lesson.objectives.length}</b> mục tiêu
            </span>
            <span>
              <b className="text-emerald-600">{mastered}</b> đạt
            </span>
            <span>
              <b className="text-amber-600">{practicing}</b> đang luyện
            </span>
          </div>
        </div>
      </section>
      <div className="space-y-4">
        {lesson.objectives.map((objective) => (
          <ObjectiveCard key={objective.id} objective={objective} />
        ))}
      </div>
    </div>
  )
}

export default function Dashboard({
  initialStudents,
  initialRecords,
}: {
  initialStudents: Student[]
  initialRecords: StudentRecord[]
}) {
  const service = useMemo(
    () => createDashboardService(initialRecords, initialStudents),
    [initialRecords, initialStudents]
  )
  const students = service.getStudents()
  const [studentId, setStudentId] = useState(students[0].id)
  const [grade, setGrade] = useState(students[0].currentGrade)
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [lessonId, setLessonId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const student = students.find((item) => item.id === studentId) ?? students[0]
  const overview = useMemo(
    () => service.getStudentOverview(studentId, grade),
    [service, studentId, grade]
  )
  const subjectSummary =
    subjectId && subjectId !== 'history'
      ? service.getSubjectProgress(studentId, grade, subjectId)
      : null
  const lessons = subjectSummary
    ? service.getLessons(studentId, grade, subjectSummary.subject.id)
    : []
  const lesson = lessons.find((item) => item.id === lessonId)
  const chooseStudent = (id: string) => {
    const next = students.find((item) => item.id === id)
    setStudentId(id)
    setGrade(next?.currentGrade ?? 1)
    setSubjectId(null)
    setLessonId(null)
  }
  const chooseSubject = (id: string) => {
    setSubjectId(id)
    setLessonId(null)
    setMenuOpen(false)
  }
  const showOverview = () => {
    setSubjectId(null)
    setLessonId(null)
    setMenuOpen(false)
  }
  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-900">
      <Header
        studentId={studentId}
        grade={grade}
        onStudent={chooseStudent}
        onGrade={(value) => {
          setGrade(value)
          setSubjectId(null)
          setLessonId(null)
        }}
        onMenu={() => setMenuOpen(true)}
      />
      <div className="lg:grid lg:grid-cols-[16rem_1fr]">
        <Sidebar
          open={menuOpen}
          subjectId={subjectId}
          summaries={overview.subjects}
          onClose={() => setMenuOpen(false)}
          onOverview={showOverview}
          onSubject={chooseSubject}
          onHistory={() => chooseSubject('history')}
        />
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            {subjectId !== 'history' && (
              <Breadcrumb
                studentName={student.name}
                grade={grade}
                subjectName={subjectSummary?.subject.name}
                lesson={lesson}
                onHome={showOverview}
                onSubject={() => setLessonId(null)}
              />
            )}
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[.2em] text-pink-500">
                {student.name} · Lớp {grade}
              </p>
              <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                {subjectId === 'history'
                  ? 'Lịch sử chơi'
                  : lesson
                    ? lesson.title
                    : subjectSummary
                      ? `${subjectSummary.subject.name} · Lớp ${grade}`
                      : 'Tổng quan học tập'}
              </h2>
            </div>
            {subjectId === 'history' ? (
              <RecentActivities data={overview} />
            ) : lesson ? (
              <LessonView lesson={lesson} onBack={() => setLessonId(null)} />
            ) : subjectSummary ? (
              <SubjectView
                summary={subjectSummary}
                lessons={lessons}
                onLesson={(item) => setLessonId(item.id)}
              />
            ) : overview.totalObjectives ? (
              <Overview data={overview} onSubject={chooseSubject} />
            ) : (
              <EmptyState
                title={`Chưa có dữ liệu Lớp ${grade}`}
                detail="Bạn có thể chọn học sinh hoặc khối lớp khác ở phía trên."
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

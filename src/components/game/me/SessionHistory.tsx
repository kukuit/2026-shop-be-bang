'use client'

import { useState } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/auth/AuthProvider'
import { GAME_LABELS, SUBJECTS } from '@/lib/game-progress/config'
import { getLessonDefinition } from '@/components/games/general/tracking/lesson-catalog'
import { progressKeys, sessionOptions, sessionsOptions } from '@/lib/game-progress/queries'
import type { SessionSummary } from '@/lib/game-progress/service'
import { ProgressError, ProgressLoading } from './ProgressStates'

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bangkok',
}).format(new Date(value)) : 'Chưa có thời gian'
const formatDuration = (duration: number) => {
  const seconds = Math.round(duration / 1000)
  return seconds >= 60 ? `${Math.floor(seconds / 60)} phút ${seconds % 60} giây` : `${seconds} giây`
}

function SessionRow({ userId, session }: { userId: string; session: SessionSummary }) {
  const [expanded, setExpanded] = useState(false)
  const detail = useQuery({ ...sessionOptions(userId, session.id), enabled: expanded })
  const lesson = getLessonDefinition(session.lessonId)
  const subject = SUBJECTS.find(item => item.id === lesson?.subjectId)
  return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div><p className="text-xs text-slate-500">{formatDate(session.completedAt)}</p><h2 className="mt-1 font-black text-slate-900">{GAME_LABELS[session.gameId] ?? session.gameId}</h2><p className="mt-1 text-sm text-slate-500">{lesson ? `${subject?.label ?? lesson.subjectLabel} · ${lesson.gradeLabel} · Bài ${lesson.lessonNumber}` : session.lessonId}</p></div>
      <div className="text-sm"><p className="font-bold text-blue-700">{session.score} điểm · {session.correctCount}/{session.totalQuestions} đúng</p><p className="mt-1 text-slate-500">{session.accuracy === null ? 'Chưa có dữ liệu trả lời' : `${session.accuracy}% đúng`} · {formatDuration(session.duration)}</p></div>
      <button type="button" aria-expanded={expanded} aria-controls={`session-${session.id}`} onClick={() => setExpanded(value => !value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-blue-700">{expanded ? 'Thu gọn' : 'Xem chi tiết'}</button>
    </div>
    <div id={`session-${session.id}`} hidden={!expanded} className="border-t border-slate-100 p-4">
      {expanded && (detail.isError ? <ProgressError message="Không thể tải chi tiết phiên." retry={() => { void detail.refetch() }} /> : !detail.data ? <ProgressLoading label="Đang tải lượt trả lời…" /> : !detail.data.results.length ? <p className="text-sm text-slate-500">Phiên này chưa có lượt trả lời.</p> :
        <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm">
          <caption className="sr-only">Chi tiết các lượt trả lời trong phiên</caption>
          <thead className="text-xs text-slate-500"><tr>{['Mục tiêu', 'Đáp án', 'Đã chọn', 'Lần', 'Thời gian', 'Kết quả'].map(label => <th key={label} scope="col" className="px-2 py-3">{label}</th>)}</tr></thead>
          <tbody>{detail.data.results.map((result, index) => <tr key={index} className="border-t border-slate-100">
            <td className="px-2 py-3 font-semibold">{lesson?.learningGoals.find(goal => goal.key === result.learningKey)?.title ?? result.learningKey}</td>
            <td className="px-2">{result.expectedAnswer ?? '—'}</td><td className="px-2">{result.selectedAnswer ?? '—'}</td><td className="px-2">{result.attempt}</td>
            <td className="px-2">{result.responseTime === undefined ? '—' : `${(result.responseTime / 1000).toFixed(1)}s`}</td><td className={`px-2 font-semibold ${result.correct ? 'text-emerald-700' : 'text-rose-700'}`}>{result.correct ? 'Đúng' : 'Sai'}</td>
          </tr>)}</tbody>
        </table></div>)}
    </div>
  </article>
}

export default function SessionHistory() {
  const { user, loading } = useAuth()
  const userId = user?.id ?? ''
  const client = useQueryClient()
  const query = useInfiniteQuery({ ...sessionsOptions(userId), enabled: !loading && !!user?.activeGame })
  const items = Array.from(new Map(query.data?.pages.flatMap(page => page.items).map(item => [item.id, item]) ?? []).values())
  if (!loading && !user?.activeGame) return <p role="status">Vui lòng đăng nhập tài khoản có quyền chơi game.</p>
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black text-slate-900">Phiên chơi</h1><p className="mt-1 text-sm text-slate-500">Các phiên mới nhất của bé, mỗi lần hiển thị 20 phiên.</p></div>
      <button type="button" disabled={loading || query.isFetching} onClick={() => { void client.resetQueries({ queryKey: progressKeys.sessions(userId), exact: true }) }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50">Làm mới</button>
    </header>
    {loading || query.isPending ? <ProgressLoading label="Đang tải phiên chơi…" /> : <>
      {!items.length && !query.isError && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">Chưa có phiên chơi. Hoàn thành một game để bắt đầu lưu lịch sử.</p>}
      {items.map(session => <SessionRow key={`${userId}:${session.id}`} userId={userId} session={session} />)}
      {query.isError && <ProgressError message="Không thể tải lịch sử phiên chơi." retry={() => { if (query.isFetchNextPageError) void query.fetchNextPage(); else void query.refetch() }} />}
      {query.hasNextPage && <div className="text-center"><button type="button" disabled={query.isFetching} onClick={() => { void query.fetchNextPage() }} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{query.isFetchingNextPage ? 'Đang tải…' : 'Xem thêm'}</button></div>}
    </>}
  </div>
}

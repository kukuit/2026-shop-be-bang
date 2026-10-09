'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, Wallet } from 'lucide-react'
import { formatVnd, type TeachingSessionView } from '../_lib/teaching-model'
import { teachingGet } from './teaching-client'
import { useTeachingWorkspace } from './WorkspaceProvider'

type OverviewRow = { studentId: string; studentName: string; studentStatus: 'ACTIVE' | 'INACTIVE'; actualDurationMinutes: number; feeAmount: number; completedSessions: number }
type MonthData = { year: number; month: number; rows: OverviewRow[]; totalActualDurationMinutes: number; totalFeeAmount: number }
type DashboardData = { today: string; todaySessions: TeachingSessionView[]; reviewCount: number; overdueSessions: TeachingSessionView[] }
const hours = (minutes: number) => `${Number((minutes / 60).toFixed(1)).toLocaleString('vi-VN')} giờ`
const monthTitle = (year: number, month: number) => new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(Date.UTC(year, month - 1, 15, 12)))
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: 'numeric', month: 'long' })

export default function TeachingOverview() {
  const { active } = useTeachingWorkspace()
  const vnNow = new Date(Date.now() + 7 * 60 * 60_000)
  const [year, setYear] = useState(vnNow.getUTCFullYear())
  const [month, setMonth] = useState(vnNow.getUTCMonth() + 1)
  const [monthData, setMonthData] = useState<MonthData | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loadRequested, setLoadRequested] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const requestCounter = useRef(0)

  const refresh = useCallback(async () => {
    const requestId = ++requestCounter.current
    setLoading(true)
    setError('')
    try {
      const result = await teachingGet<{ month: MonthData; dashboard: DashboardData }>({ resource: 'overviewPageData', year: String(year), month: String(month) })
      if (requestId !== requestCounter.current) return
      setMonthData(result.month)
      setDashboard(result.dashboard)
      setDataLoaded(true)
      window.dispatchEvent(new CustomEvent('teaching:review-count', { detail: result.dashboard.reviewCount }))
    } catch (reason) {
      if (requestId === requestCounter.current) setError(reason instanceof Error ? reason.message : 'Không tải được tổng quan.')
    } finally { if (requestId === requestCounter.current) setLoading(false) }
  }, [year, month])

  useEffect(() => { if (loadRequested) void refresh() }, [refresh, loadRequested])
  useEffect(() => { if (active?.mode === 'LOCAL') setLoadRequested(true) }, [active?.id, active?.mode])
  useEffect(() => {
    const onChanged = () => { if (loadRequested) void refresh() }
    window.addEventListener('teaching:data-changed', onChanged)
    return () => window.removeEventListener('teaching:data-changed', onChanged)
  }, [refresh, loadRequested])

  const shiftMonth = (delta: number) => {
    const date = new Date(Date.UTC(year, month - 1 + delta, 1))
    setYear(date.getUTCFullYear())
    setMonth(date.getUTCMonth() + 1)
  }
  const nextSession = dashboard?.todaySessions.find(session => session.status === 'SCHEDULED' && Date.parse(session.startAt) + session.scheduledDurationMinutes * 60_000 >= Date.now())
  const today = dashboard?.today ? new Date(`${dashboard.today}T12:00:00+07:00`) : new Date()

  return <>
    <div className="demo-page-heading teaching-heading">
      <div><p className="teaching-eyebrow">{today.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: 'numeric', month: 'long' })}</p><h1>Tổng quan</h1><p>Lịch dạy và học phí trong một chỗ.</p></div>
      <div className="teaching-heading-actions"><button type="button" disabled={loading} onClick={() => loadRequested ? void refresh() : setLoadRequested(true)}>{loading ? 'Đang tải…' : dataLoaded ? 'Làm mới' : 'Tải tổng quan'}</button><Link className="demo-primary" href="/demo/ai-task/tasks?new=1"><Plus size={17} /> Tạo buổi học</Link></div>
    </div>
    {error && <div className="demo-alert teaching-retry" role="alert"><span>{error}</span><button type="button" onClick={() => void refresh()}>Thử lại</button></div>}

    <section className="teaching-dashboard-top" aria-label="Tóm tắt hôm nay">
      {!dataLoaded && loading ? <div className="teaching-kpi-grid" aria-label="Đang tải tổng quan"><div className="teaching-skeleton teaching-kpi-skeleton"/><div className="teaching-skeleton teaching-kpi-skeleton"/><div className="teaching-skeleton teaching-kpi-skeleton"/><div className="teaching-skeleton teaching-kpi-skeleton"/></div> : !dataLoaded ? <div className="teaching-empty-card"><CalendarDays size={24}/><strong>Tổng quan chưa được tải</strong><p>Tải thống kê tháng và lịch hôm nay khi bạn cần xem.</p><button className="demo-primary" type="button" onClick={() => setLoadRequested(true)}>Tải tổng quan</button></div> : loading ? <div className="teaching-kpi-grid" aria-label="Đang tải tổng quan"><div className="teaching-skeleton teaching-kpi-skeleton"/><div className="teaching-skeleton teaching-kpi-skeleton"/><div className="teaching-skeleton teaching-kpi-skeleton"/><div className="teaching-skeleton teaching-kpi-skeleton"/></div> : <>
        <div className="teaching-kpi-grid">
          <article className="teaching-kpi teaching-kpi-primary"><span className="teaching-kpi-icon"><CalendarDays size={19}/></span><span>Buổi hôm nay</span><strong>{dashboard?.todaySessions.length ?? 0}</strong><small>{nextSession ? `Tiếp theo lúc ${timeLabel(nextSession.startAt)}` : 'Không còn buổi sắp tới'}</small></article>
          <Link className={`teaching-kpi teaching-kpi-review${dashboard?.reviewCount ? ' has-review' : ''}`} href="/demo/ai-task/tasks?needsReview=true"><span className="teaching-kpi-icon"><Clock3 size={19}/></span><span>Cần đánh giá</span><strong>{dashboard?.reviewCount ?? 0}</strong><small>{dashboard?.reviewCount ? 'Buổi đã qua giờ kết thúc' : 'Đã cập nhật'}</small></Link>
          <article className="teaching-kpi"><span className="teaching-kpi-icon"><Clock3 size={19}/></span><span>Giờ dạy · {monthTitle(year, month)}</span><strong>{hours(monthData?.totalActualDurationMinutes ?? 0)}</strong><small>{monthData?.rows.reduce((sum, row) => sum + row.completedSessions, 0) ?? 0} buổi đã hoàn thành</small></article>
          <article className="teaching-kpi"><span className="teaching-kpi-icon"><Wallet size={19}/></span><span>Học phí · {monthTitle(year, month)}</span><strong>{formatVnd(monthData?.totalFeeAmount ?? 0)}</strong><small>Tính từ thời lượng thực tế</small></article>
        </div>
        {dashboard?.reviewCount ? <Link className="teaching-review-callout" href="/demo/ai-task/tasks?needsReview=true"><span><strong>{dashboard.reviewCount} buổi đang chờ đánh giá</strong><small>Ghi nhận thời lượng, mục tiêu và nhận xét buổi học.</small></span><span className="teaching-callout-link">Xem danh sách <ArrowRight size={16}/></span></Link> : null}
      </>}
    </section>

    {dataLoaded && <section className="teaching-dashboard-columns">
      <section className="demo-panel teaching-dashboard-card">
        <header className="teaching-section-heading"><div><p className="teaching-eyebrow">Hôm nay</p><h2>Lịch dạy</h2></div><Link href="/demo/ai-task/calendar">Mở lịch <ArrowRight size={15}/></Link></header>
        {loading ? <div className="teaching-skeleton teaching-list-skeleton"/> : !dashboard?.todaySessions.length ? <div className="teaching-empty-card"><CalendarDays size={24}/><strong>Hôm nay chưa có buổi học</strong><p>Tạo buổi lẻ hoặc thêm lịch cố định cho học viên.</p><Link className="demo-primary" href="/demo/ai-task/tasks?new=1"><Plus size={16}/> Lên lịch buổi học</Link></div> : <div className="teaching-today-list">{dashboard.todaySessions.map(session => <article className="teaching-today-item" key={session.id}><div className="teaching-today-time"><strong>{timeLabel(session.startAt)}</strong><span>{session.scheduledDurationMinutes} phút</span></div><div className="teaching-today-info"><strong>{session.studentName}</strong><span>{session.title}{session.subject ? ` · ${session.subject}` : ''}</span></div><span className={`teaching-status teaching-status-${session.status.toLowerCase()}`}>{session.status === 'COMPLETED' ? 'Hoàn thành' : session.status === 'CANCELLED' ? 'Đã hủy' : 'Sắp học'}</span></article>)}</div>}
      </section>

      <section className="demo-panel teaching-dashboard-card teaching-fee-card">
        <header className="teaching-section-heading"><div><p className="teaching-eyebrow">Đối soát</p><h2>Học phí theo học viên</h2></div><div className="teaching-month-nav"><button aria-label="Tháng trước" onClick={() => shiftMonth(-1)}><ChevronLeft size={18}/></button><span>{monthTitle(year, month)}</span><button aria-label="Tháng sau" onClick={() => shiftMonth(1)}><ChevronRight size={18}/></button></div></header>
        {loading ? <div className="teaching-skeleton teaching-list-skeleton"/> : monthData?.rows.length ? <><div className="demo-table-wrap teaching-overview-table"><table aria-label="Học phí theo học viên"><thead><tr><th>Học viên</th><th>Giờ học</th><th>Học phí</th></tr></thead><tbody>{monthData.rows.map(row => <tr key={row.studentId}><td><strong>{row.studentName}</strong>{row.studentStatus === 'INACTIVE' && <small>Đã ngừng hoạt động</small>}</td><td>{hours(row.actualDurationMinutes)}<small>{row.completedSessions} buổi</small></td><td><strong>{formatVnd(row.feeAmount)}</strong></td></tr>)}</tbody><tfoot><tr><th>Tổng</th><th>{hours(monthData.totalActualDurationMinutes)}</th><th>{formatVnd(monthData.totalFeeAmount)}</th></tr></tfoot></table></div><div className="teaching-overview-mobile">{monthData.rows.map(row => <article key={row.studentId}><strong>{row.studentName}</strong><span>{hours(row.actualDurationMinutes)} · {row.completedSessions} buổi</span><b>{formatVnd(row.feeAmount)}</b></article>)}<footer><strong>Tổng</strong><span>{hours(monthData.totalActualDurationMinutes)}</span><b>{formatVnd(monthData.totalFeeAmount)}</b></footer></div></> : <div className="teaching-empty-card compact"><Wallet size={22}/><strong>Chưa có học phí được ghi nhận</strong><p>Học phí sẽ xuất hiện sau khi bạn đánh giá buổi học.</p></div>}
      </section>
    </section>}
    {dataLoaded && dashboard?.overdueSessions.length ? <section className="teaching-overdue-preview" aria-label="Buổi cần đánh giá"><h2>Đã qua giờ học</h2>{dashboard.overdueSessions.map(session => <Link href={`/demo/ai-task/tasks?needsReview=true&sessionId=${encodeURIComponent(session.id)}`} key={session.id}><span><strong>{session.studentName}</strong><small>{dateLabel(session.startAt)} · {session.title}</small></span><ArrowRight size={16}/></Link>)}{dashboard.reviewCount > dashboard.overdueSessions.length && <Link className="teaching-overdue-more" href="/demo/ai-task/tasks?needsReview=true">Còn {dashboard.reviewCount - dashboard.overdueSessions.length} buổi khác</Link>}</section> : null}
  </>
}

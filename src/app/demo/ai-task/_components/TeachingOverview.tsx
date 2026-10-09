'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, CalendarDays, Clock3, Plus, Wallet } from 'lucide-react'
import { formatVnd, type TeachingBillingPeriod, type TeachingSessionView } from '../_lib/teaching-model'
import { teachingGet } from './teaching-client'
import { useTeachingWorkspace } from './WorkspaceProvider'

type OverviewRow = { studentId: string; studentName: string; studentStatus: 'ACTIVE' | 'INACTIVE'; actualDurationMinutes: number; feeAmount: number; openingBalanceAmount: number; paidAmount: number; amountDue: number; remainingAmount: number; completedSessions: number }
type PeriodData = { period: TeachingBillingPeriod; rows: OverviewRow[]; totalActualDurationMinutes: number; totalCompletedSessions: number; totalFeeAmount: number; totalOpeningBalanceAmount: number; totalPaidAmount: number; totalAmountDue: number; totalRemainingAmount: number }
type DashboardData = { today: string; todaySessions: TeachingSessionView[]; reviewCount: number; overdueSessions: TeachingSessionView[] }
const hours = (minutes: number) => `${Number((minutes / 60).toFixed(1)).toLocaleString('vi-VN')} giờ`
const periodDate = (date: string) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(`${date}T12:00:00+07:00`))
const periodTitle = (period: TeachingBillingPeriod) => `${periodDate(period.startDate)} – ${periodDate(period.endDate)}`
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: 'numeric', month: 'long' })

export default function TeachingOverview() {
  const { active } = useTeachingWorkspace()
  const [periodData, setPeriodData] = useState<PeriodData | null>(null)
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
      const result = await teachingGet<{ period: PeriodData; dashboard: DashboardData }>({ resource: 'overviewPageData' })
      if (requestId !== requestCounter.current) return
      setPeriodData(result.period)
      setDashboard(result.dashboard)
      setDataLoaded(true)
      window.dispatchEvent(new CustomEvent('teaching:review-count', { detail: result.dashboard.reviewCount }))
    } catch (reason) {
      if (requestId === requestCounter.current) setError(reason instanceof Error ? reason.message : 'Không tải được tổng quan.')
    } finally { if (requestId === requestCounter.current) setLoading(false) }
  }, [])

  useEffect(() => { if (loadRequested) void refresh() }, [refresh, loadRequested])
  useEffect(() => { if (active?.mode === 'LOCAL') setLoadRequested(true) }, [active?.id, active?.mode])
  useEffect(() => {
    const onChanged = () => { if (loadRequested) void refresh() }
    window.addEventListener('teaching:data-changed', onChanged)
    return () => window.removeEventListener('teaching:data-changed', onChanged)
  }, [refresh, loadRequested])

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
          <article className="teaching-kpi"><span className="teaching-kpi-icon"><Clock3 size={19}/></span><span>Buổi dạy · {periodData ? periodTitle(periodData.period) : 'kỳ hiện tại'}</span><strong>{periodData?.totalCompletedSessions ?? 0} buổi</strong><small>{hours(periodData?.totalActualDurationMinutes ?? 0)} dạy</small></article>
          <article className="teaching-kpi"><span className="teaching-kpi-icon"><Wallet size={19}/></span><span>Còn phải thu · {periodData ? periodTitle(periodData.period) : 'kỳ hiện tại'}</span><strong>{formatVnd(periodData?.totalRemainingAmount ?? 0)}</strong><small>Phát sinh {formatVnd(periodData?.totalFeeAmount ?? 0)} + đầu kỳ {formatVnd(periodData?.totalOpeningBalanceAmount ?? 0)} − đã thu {formatVnd(periodData?.totalPaidAmount ?? 0)}</small></article>
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
        <header className="teaching-section-heading"><div><p className="teaching-eyebrow">Đối soát kỳ hiện tại</p><h2>Học phí theo học viên</h2></div><span className="teaching-period-caption">{periodData ? periodTitle(periodData.period) : ''}</span></header>
        {loading ? <div className="teaching-skeleton teaching-list-skeleton"/> : periodData?.rows.length ? <><div className="demo-table-wrap teaching-overview-table"><table aria-label="Học phí theo học viên trong kỳ hiện tại"><thead><tr><th>Học viên</th><th>Giờ học</th><th>Còn phải thu</th></tr></thead><tbody>{periodData.rows.map(row => <tr key={row.studentId}><td><strong>{row.studentName}</strong>{row.studentStatus === 'INACTIVE' && <small>Đã ngừng hoạt động</small>}</td><td>{hours(row.actualDurationMinutes)}<small>{row.completedSessions} buổi</small></td><td><strong>{formatVnd(row.remainingAmount)}</strong><small>Phát sinh {formatVnd(row.feeAmount)} · đầu kỳ {formatVnd(row.openingBalanceAmount)} · đã thu {formatVnd(row.paidAmount)}</small></td></tr>)}</tbody><tfoot><tr><th>Tổng</th><th>{hours(periodData.totalActualDurationMinutes)}<small>{periodData.totalCompletedSessions} buổi</small></th><th>{formatVnd(periodData.totalRemainingAmount)}<small>Phát sinh {formatVnd(periodData.totalFeeAmount)} · đầu kỳ {formatVnd(periodData.totalOpeningBalanceAmount)} · đã thu {formatVnd(periodData.totalPaidAmount)}</small></th></tr></tfoot></table></div><div className="teaching-overview-mobile">{periodData.rows.map(row => <article key={row.studentId}><strong>{row.studentName}</strong><span>{hours(row.actualDurationMinutes)} · {row.completedSessions} buổi</span><b>{formatVnd(row.remainingAmount)}</b><small>Phát sinh {formatVnd(row.feeAmount)} · đầu kỳ {formatVnd(row.openingBalanceAmount)} · đã thu {formatVnd(row.paidAmount)}</small></article>)}<footer><strong>Tổng còn phải thu</strong><span>{hours(periodData.totalActualDurationMinutes)} · {periodData.totalCompletedSessions} buổi</span><b>{formatVnd(periodData.totalRemainingAmount)}</b><small>Phát sinh {formatVnd(periodData.totalFeeAmount)} · đầu kỳ {formatVnd(periodData.totalOpeningBalanceAmount)} · đã thu {formatVnd(periodData.totalPaidAmount)}</small></footer></div></> : <div className="teaching-empty-card compact"><Wallet size={22}/><strong>Kỳ này chưa có học phí</strong><p>Học phí phát sinh và số dư đầu kỳ sẽ hiển thị tại đây.</p></div>}
      </section>
    </section>}
    {dataLoaded && dashboard?.overdueSessions.length ? <section className="teaching-overdue-preview" aria-label="Buổi cần đánh giá"><h2>Đã qua giờ học</h2>{dashboard.overdueSessions.map(session => <Link href={`/demo/ai-task/tasks?needsReview=true&sessionId=${encodeURIComponent(session.id)}`} key={session.id}><span><strong>{session.studentName}</strong><small>{dateLabel(session.startAt)} · {session.title}</small></span><ArrowRight size={16}/></Link>)}{dashboard.reviewCount > dashboard.overdueSessions.length && <Link className="teaching-overdue-more" href="/demo/ai-task/tasks?needsReview=true">Còn {dashboard.reviewCount - dashboard.overdueSessions.length} buổi khác</Link>}</section> : null}
  </>
}

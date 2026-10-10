'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, CalendarPlus, Plus, Search, X } from 'lucide-react'
import { DEFAULT_BILLING_CYCLE_CUTOFF_DAY, DEFAULT_HOURLY_RATE, DEFAULT_SESSION_RATE, formatVnd, type Student, type TeachingSettings, type TeachingSessionView } from '../_lib/teaching-model'
import { SessionReviewForm, TeachingSessionForm } from './TeachingForms'
import { teachingGet, teachingPost } from './teaching-client'
import { notifyTeachingDataChanged } from './teaching-ui'
import { useTeachingWorkspace } from './WorkspaceProvider'

const statusLabels = { SCHEDULED: 'Sắp học', COMPLETED: 'Đã hoàn thành', CANCELLED: 'Đã hủy' }
const formatDate = (iso: string) => new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short' })
const ended = (session: TeachingSessionView) => Date.parse(session.startAt) + session.scheduledDurationMinutes * 60_000 < Date.now()
const sessionFee = (session: TeachingSessionView) => session.feeAmount ?? (session.status !== 'SCHEDULED' || session.unitRateSnapshot == null ? null : session.pricingModeSnapshot === 'PER_SESSION' ? session.unitRateSnapshot : Math.round(session.unitRateSnapshot * session.scheduledDurationMinutes / 60))
const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi')
type DialogState = { kind: 'session'; session: TeachingSessionView | null; startAt?: string } | { kind: 'review'; session: TeachingSessionView } | { kind: 'detail'; session: TeachingSessionView } | { kind: 'status'; session: TeachingSessionView; action: 'cancel' | 'restore' }
type Filters = { query: string; studentId: string; status: string; needsReview: boolean; fromDate: string; toDate: string }
const emptyFilters: Filters = { query: '', studentId: '', status: '', needsReview: false, fromDate: '', toDate: '' }
type MaterializedRange = { from: string; to: string }
const shiftDateKey = (key: string, amount: number) => { const date = new Date(`${key}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10) }
function isMaterialized(from: string, to: string, ranges: MaterializedRange[]) {
  const today = new Date(Date.now() + 7 * 60 * 60_000).toISOString().slice(0, 10)
  for (let date = from < today ? today : from; date < to; date = shiftDateKey(date, 1)) {
    if (!ranges.some(range => range.from <= date && date < range.to)) return false
  }
  return true
}

function readFilters(): Filters {
  if (typeof window === 'undefined') return emptyFilters
  const p = new URLSearchParams(window.location.search)
  return { query: p.get('query') || '', studentId: p.get('studentId') || '', status: p.get('status') || '', needsReview: p.get('needsReview') === 'true', fromDate: p.get('from') || '', toDate: p.get('to') || '' }
}

function Actions({ session, busy, onEdit, onReview, onStatus }: { session: TeachingSessionView; busy: boolean; onEdit(): void; onReview(): void; onStatus(action: 'cancel' | 'restore'): void }) {
  const isOverdue = session.status === 'SCHEDULED' && ended(session)
  return <div className="teaching-actions">
    {session.status === 'SCHEDULED' && <><button disabled={busy} onClick={onEdit}>Sửa</button>{isOverdue ? <><button className="teaching-button-primary" disabled={busy} onClick={onReview}>Đánh giá</button><button disabled={busy} onClick={() => onStatus('cancel')}>Không học</button></> : <button disabled={busy} onClick={() => onStatus('cancel')}>Hủy buổi</button>}</>}
    {session.status === 'COMPLETED' && <button disabled={busy} onClick={onReview}>Sửa đánh giá</button>}
    {session.status === 'CANCELLED' && <button disabled={busy} onClick={() => onStatus('restore')}>Khôi phục</button>}
  </div>
}

export default function TeachingSessions() {
  const { active } = useTeachingWorkspace()
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [filtersReady, setFiltersReady] = useState(false)
  const [loadRequested, setLoadRequested] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const materializedRanges = useRef<MaterializedRange[]>([])
  const dataLoadedRef = useRef(false)
  const [sessions, setSessions] = useState<TeachingSessionView[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const studentsRef = useRef(students)
  studentsRef.current = students
  const [settings, setSettings] = useState<TeachingSettings>({ id: 'default', userId: '', defaultPricingMode: 'PER_SESSION', defaultSessionRate: DEFAULT_SESSION_RATE, defaultHourlyRate: DEFAULT_HOURLY_RATE, billingCycleCutoffDay: DEFAULT_BILLING_CYCLE_CUTOFF_DAY, createdAt: '', updatedAt: '' })
  const [loading, setLoading] = useState(false)
  const [openingSessionId, setOpeningSessionId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dialogState, setDialogState] = useState<DialogState | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const requestCounter = useRef(0)
  const openingSessionRequest = useRef('')
  const previousFilters = useRef<Filters>(emptyFilters)
  const openNewAfterLoad = useRef(false)

  const refresh = useCallback(async () => {
    const requestId = ++requestCounter.current
    setLoading(true); setError('')
    const params: Record<string, string> = { resource: 'sessions' }
    if (filters.query) params.query = filters.query
    if (filters.studentId) params.studentId = filters.studentId
    if (filters.status) params.status = filters.status
    if (filters.needsReview) params.needsReview = 'true'
    if (filters.fromDate) params.from = `${filters.fromDate}T00:00:00+07:00`
    if (filters.toDate) { const nextDay = new Date(`${filters.toDate}T12:00:00Z`); nextDay.setUTCDate(nextDay.getUTCDate() + 1); params.to = `${nextDay.toISOString().slice(0, 10)}T00:00:00+07:00` }
    try {
      const today = new Date(Date.now() + 7 * 60 * 60_000).toISOString().slice(0, 10)
      const materializeFrom = filters.fromDate || today
      const materializeTo = filters.toDate ? shiftDateKey(filters.toDate, 1) : shiftDateKey(materializeFrom, 62)
      const needsMaterialization = !dataLoadedRef.current || !isMaterialized(materializeFrom, materializeTo, materializedRanges.current)
      if (needsMaterialization) {
        params.resource = 'sessionsPageData'
        const pageData = await teachingGet<{ sessions: TeachingSessionView[]; students: Student[]; settings: TeachingSettings; materializedRanges: MaterializedRange[] }>(params)
        if (requestId === requestCounter.current) {
          setSessions(pageData.sessions); setStudents(pageData.students); setSettings(pageData.settings)
          if (pageData.materializedRanges.length) materializedRanges.current = [...materializedRanges.current, ...pageData.materializedRanges]
          dataLoadedRef.current = true; setDataLoaded(true)
        }
      } else {
        const rangeParams: Record<string, string> = { ...params, resource: 'sessionsRangeData' }
        delete rangeParams.query
        const result = await teachingGet<{ sessions: TeachingSessionView[] }>(rangeParams)
        if (requestId === requestCounter.current) {
          const studentById = new Map(studentsRef.current.map(student => [student.id, student]))
          const query = normalizeSearch(filters.query)
          const enriched = result.sessions.map(session => ({ ...session, studentName: studentById.get(session.studentId)?.name || session.studentName, studentStatus: studentById.get(session.studentId)?.status || null }))
          setSessions(query ? enriched.filter(session => normalizeSearch(`${session.title} ${session.subject || ''} ${session.studentName}`).includes(query)) : enriched)
        }
      }
    } catch (reason) { if (requestId === requestCounter.current) setError(reason instanceof Error ? reason.message : 'Không tải được danh sách buổi học.') }
    finally { if (requestId === requestCounter.current) setLoading(false) }
  }, [filters])

  useEffect(() => { if (!filtersReady || !loadRequested) return; const timer = setTimeout(() => { void refresh() }, filters.query ? 250 : 0); return () => clearTimeout(timer) }, [refresh, filters.query, filtersReady, loadRequested])
  useEffect(() => { if (active?.mode === 'LOCAL') setLoadRequested(true) }, [active?.id, active?.mode])
  useEffect(() => {
    const syncFromUrl = () => {
      const next = readFilters()
      const params = new URLSearchParams(window.location.search)
      if (['query', 'studentId', 'status', 'needsReview', 'from', 'to', 'sessionId', 'new'].some(key => params.has(key))) setLoadRequested(true)
      previousFilters.current = next
      setFilters(next)
    }
    window.addEventListener('popstate', syncFromUrl)
    const fromUrl = readFilters()
    previousFilters.current = fromUrl
    setFilters(fromUrl)
    const params = new URLSearchParams(window.location.search)
    if (['query', 'studentId', 'status', 'needsReview', 'from', 'to', 'sessionId', 'new'].some(key => params.has(key))) setLoadRequested(true)
    if (params.get('new') === '1') {
      setLoadRequested(true)
      openNewAfterLoad.current = true
      params.delete('new')
      const search = params.toString()
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${search ? `?${search}` : ''}`)
    }
    setFiltersReady(true)
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [])
  useEffect(() => {
    if (!dataLoaded || !openNewAfterLoad.current) return
    openNewAfterLoad.current = false
    setDialogState({ kind: 'session', session: null })
  }, [dataLoaded])
  useEffect(() => {
    if (!filtersReady) return
    const previous = previousFilters.current
    const params = new URLSearchParams(window.location.search)
    for (const key of ['query', 'studentId', 'status', 'needsReview', 'from', 'to']) params.delete(key)
    if (filters.query) params.set('query', filters.query)
    if (filters.studentId) params.set('studentId', filters.studentId)
    if (filters.status) params.set('status', filters.status)
    if (filters.needsReview) params.set('needsReview', 'true')
    if (filters.fromDate) params.set('from', filters.fromDate)
    if (filters.toDate) params.set('to', filters.toDate)
    const search = params.toString()
    const currentUrl = `${window.location.pathname}${window.location.search}`
    const targetUrl = `${window.location.pathname}${search ? `?${search}` : ''}`
    const queryOnlyChanged = previous.studentId === filters.studentId && previous.status === filters.status && previous.needsReview === filters.needsReview && previous.fromDate === filters.fromDate && previous.toDate === filters.toDate && previous.query !== filters.query
    if (currentUrl !== targetUrl) {
      const method = queryOnlyChanged ? 'replaceState' : 'pushState'
      window.history[method](window.history.state, '', targetUrl)
    }
    previousFilters.current = filters
  }, [filters, filtersReady])
  const dialogOpen = !!dialogState
  const openSession = useCallback(async (session: TeachingSessionView, kind: 'detail' | 'session' | 'review' = 'detail') => {
    if (session.goalsLoaded !== false) { setDialogState({ kind, session }); return }
    if (openingSessionRequest.current === session.id) return
    openingSessionRequest.current = session.id
    setOpeningSessionId(session.id); setError('')
    try {
      const result = await teachingGet<{ session: TeachingSessionView }>({ resource: 'session', id: session.id })
      setSessions(current => current.map(item => item.id === session.id ? result.session : item))
      setDialogState({ kind, session: result.session })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được chi tiết buổi học.') }
    finally { openingSessionRequest.current = ''; setOpeningSessionId('') }
  }, [])
  useEffect(() => {
    if (dialogOpen && !dialog.current?.open) dialog.current?.showModal()
    else if (!dialogOpen && dialog.current?.open) dialog.current?.close()
  }, [dialogOpen])
  useEffect(() => {
    if (loading || !sessions.length) return
    const params = new URLSearchParams(window.location.search)
    const selectedId = params.get('sessionId')
    const session = selectedId ? sessions.find(item => item.id === selectedId) : undefined
    if (session) {
      void openSession(session)
      params.delete('sessionId')
      const search = params.toString()
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${search ? `?${search}` : ''}`)
    }
  }, [loading, sessions, openSession])

  const saveSession = async (data: Parameters<React.ComponentProps<typeof TeachingSessionForm>['onSave']>[0], allowOverlap = false) => {
    setBusy(true)
    try {
      await teachingPost({ operation: 'saveSession', data, ...(allowOverlap ? { allowOverlap: true } : {}) })
      setDialogState(null); await refresh(); notifyTeachingDataChanged('Đã lưu buổi học.')
    } finally { setBusy(false) }
  }
  const saveReview = async (data: Parameters<React.ComponentProps<typeof SessionReviewForm>['onSave']>[0]) => {
    setBusy(true)
    try { await teachingPost({ operation: 'completeSession', data }); setDialogState(null); await refresh(); notifyTeachingDataChanged('Đã lưu đánh giá buổi học.') }
    finally { setBusy(false) }
  }
  const askStatus = (session: TeachingSessionView, action: 'cancel' | 'restore') => {
    setCancelReason('')
    setDialogState({ kind: 'status', session, action })
  }
  const commitStatus = async () => {
    if (dialogState?.kind !== 'status') return
    setBusy(true); setError('')
    try {
      await teachingPost({ operation: 'sessionStatus', sessionId: dialogState.session.id, action: dialogState.action, ...(dialogState.action === 'cancel' ? { reason: cancelReason.trim() || null } : {}) })
      setDialogState(null); await refresh(); notifyTeachingDataChanged(dialogState.action === 'cancel' ? 'Đã cập nhật trạng thái buổi học.' : 'Đã khôi phục buổi học.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không cập nhật được buổi học.') }
    finally { setBusy(false) }
  }
  const patch = (value: Partial<Filters>) => setFilters(old => ({ ...old, ...value }))
  const closeDialog = () => { if (!busy) setDialogState(null) }
  const clearFilters = () => setFilters(emptyFilters)

  return <>
    <div className="demo-page-heading teaching-heading"><div><p className="teaching-eyebrow">Theo dõi</p><h1>Buổi học</h1><p>Lịch học, kết quả và học phí đã ghi nhận.</p></div><button className="demo-primary teaching-add-session-button" aria-label={dataLoaded ? 'Tạo buổi học' : undefined} disabled={busy || loading} onClick={() => dataLoaded ? setDialogState({ kind: 'session', session: null }) : loadRequested ? void refresh() : setLoadRequested(true)}>{dataLoaded ? <><Plus size={17}/><span className="teaching-add-session-label">Tạo buổi học</span></> : loadRequested ? 'Tải lại buổi học' : 'Tải buổi học'}</button></div>
    <section className="demo-panel teaching-panel">
      <div className="teaching-session-tabs" role="group" aria-label="Lọc nhanh theo trạng thái">{[['all', 'Tất cả'], ['upcoming', 'Sắp học'], ['review', 'Cần đánh giá'], ['COMPLETED', 'Hoàn thành'], ['CANCELLED', 'Không học']] .map(([key, label]) => <button key={key} aria-pressed={key === 'review' ? filters.needsReview : key === 'all' ? !filters.status && !filters.needsReview : key === 'upcoming' ? filters.status === 'SCHEDULED' && !filters.needsReview : filters.status === key} onClick={() => patch({ needsReview: key === 'review', status: key === 'all' || key === 'review' ? '' : key === 'upcoming' ? 'SCHEDULED' : key })}>{label}</button>)}</div>
      <div className="demo-filters teaching-session-filters"><label className="demo-search"><Search size={17}/><input aria-label="Tìm buổi học" placeholder="Tìm buổi học hoặc học viên…" value={filters.query} onChange={event => patch({ query: event.target.value })}/></label>
        <select aria-label="Lọc học viên" value={filters.studentId} onChange={event => patch({ studentId: event.target.value })}><option value="">Tất cả học viên</option>{students.map(student => <option key={student.id} value={student.id}>{student.name}{student.status === 'INACTIVE' ? ' (đã ngừng)' : ''}</option>)}</select>
        <select aria-label="Lọc trạng thái" value={filters.status} onChange={event => patch({ status: event.target.value, needsReview: false })}><option value="">Tất cả trạng thái</option><option value="SCHEDULED">Sắp học</option><option value="COMPLETED">Đã hoàn thành</option><option value="CANCELLED">Đã hủy / không học</option></select>
        <label className="teaching-date-filter">Từ<input aria-label="Từ ngày" type="date" value={filters.fromDate} onChange={event => patch({ fromDate: event.target.value })}/></label><label className="teaching-date-filter">Đến<input aria-label="Đến ngày" type="date" value={filters.toDate} onChange={event => patch({ toDate: event.target.value })}/></label>
        {(filters.query || filters.studentId || filters.status || filters.needsReview || filters.fromDate || filters.toDate) && <button className="teaching-clear-filters" onClick={clearFilters}><X size={15}/> Xóa lọc</button>}
      </div>
      {error && <div role="alert" className="demo-alert teaching-retry"><span>{error}</span><button onClick={() => void refresh()}>Thử lại</button></div>}
      {loading ? <div className="teaching-loading-list" role="status" aria-label="Đang tải buổi học"><div className="teaching-skeleton"/><div className="teaching-skeleton"/><div className="teaching-skeleton"/></div> : !dataLoaded ? <div className="teaching-empty-card"><CalendarPlus size={25}/><strong>Danh sách chưa được tải</strong><p>Tải dữ liệu khi cần xem, lọc hoặc chỉnh sửa buổi học.</p><button className="demo-primary" onClick={() => loadRequested ? void refresh() : setLoadRequested(true)}>{loadRequested ? 'Tải lại danh sách' : 'Tải danh sách'}</button></div> : !sessions.length ? <div className="teaching-empty-card"><CalendarPlus size={25}/><strong>{filters.needsReview ? 'Không có buổi học cần đánh giá' : filters.query || filters.studentId || filters.status || filters.fromDate || filters.toDate ? 'Không tìm thấy buổi học phù hợp' : 'Chưa có buổi học'}</strong><p>{filters.needsReview ? 'Các buổi đã qua giờ kết thúc sẽ xuất hiện tại đây.' : 'Hãy lên lịch buổi học đầu tiên cho học viên.'}</p>{filters.needsReview ? <button onClick={clearFilters}>Xem tất cả buổi học</button> : <button className="demo-primary" onClick={() => setDialogState({ kind: 'session', session: null })}><Plus size={16}/> Tạo buổi học</button>}</div> : <>
        <div className="demo-table-wrap teaching-desktop-list"><table aria-label="Danh sách buổi học"><thead><tr><th>Buổi học</th><th>Học viên</th><th>Thời gian</th><th>Mục tiêu</th><th>Đánh giá · học phí</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
          {sessions.map(session => <tr key={session.id}><td><button className="teaching-title-link" onClick={() => void openSession(session)}><strong>{session.title}</strong></button>{session.source === 'RECURRING' && <small>{session.isOverride ? 'Lịch tuần · sửa riêng' : 'Lịch tuần'}</small>}{session.subject && <small>{session.subject}</small>}</td><td>{session.studentName}{session.studentStatus === 'INACTIVE' && <small>Đã ngừng hoạt động</small>}</td><td>{formatDate(session.startAt)}<small>{session.scheduledDurationMinutes} phút dự kiến</small></td><td>{session.goalsLoaded === false ? <button className="teaching-title-link" disabled={openingSessionId === session.id} onClick={() => void openSession(session)}>{openingSessionId === session.id ? 'Đang tải…' : 'Mở để xem'}</button> : session.goals.length ? `${session.goals.filter(goal => goal.isCompleted).length}/${session.goals.length} · ${session.goalCompletionRate ?? 0}%` : '—'}</td><td>{session.progressPercent == null ? 'Chưa đánh giá' : `${session.progressPercent}%`}{sessionFee(session) != null && <small>{session.status === 'SCHEDULED' ? 'Dự kiến ' : 'Thành tiền '}{formatVnd(sessionFee(session)!)}{session.status === 'COMPLETED' ? ` · ${session.actualDurationMinutes ?? 0} phút thực tế` : ''}</small>}</td><td><span className={`teaching-status teaching-status-${session.status.toLowerCase()}`}>{statusLabels[session.status]}{session.status === 'SCHEDULED' && ended(session) ? ' · Cần đánh giá' : ''}</span></td><td><Actions session={session} busy={busy || openingSessionId === session.id} onEdit={() => void openSession(session, 'session')} onReview={() => void openSession(session, 'review')} onStatus={action => askStatus(session, action)}/></td></tr>)}
        </tbody></table></div>
        <div className="teaching-mobile-list">{sessions.map(session => <article className="teaching-session-card" key={session.id}>
          <header><div><button className="teaching-title-link" onClick={() => void openSession(session)}><h2>{session.title}</h2></button>{session.source === 'RECURRING' && <small>{session.isOverride ? 'Lịch tuần · sửa riêng' : 'Lịch tuần'}</small>}{session.subject && <small>{session.subject}</small>}</div><span className={`teaching-status teaching-status-${session.status.toLowerCase()}`}>{session.status === 'SCHEDULED' && ended(session) ? 'Cần đánh giá' : statusLabels[session.status]}</span></header>
          <p><strong>Học viên:</strong> {session.studentName}{session.studentStatus === 'INACTIVE' && ' (đã ngừng)'}</p><p><strong>Thời gian:</strong> {formatDate(session.startAt)} · {session.scheduledDurationMinutes} phút</p><p><strong>Mục tiêu:</strong> {session.goalsLoaded === false ? 'Mở chi tiết để tải' : session.goals.length ? `${session.goals.filter(goal => goal.isCompleted).length}/${session.goals.length} (${session.goalCompletionRate ?? 0}%)` : 'Chưa đặt'}</p>{session.progressPercent != null && <p><strong>Đánh giá:</strong> {session.progressPercent}%</p>}{sessionFee(session) != null && <p><strong>{session.status === 'SCHEDULED' ? 'Học phí dự kiến:' : 'Học phí:'}</strong> {formatVnd(sessionFee(session)!)} · {session.pricingModeSnapshot === 'PER_HOUR' ? 'theo giờ' : 'theo buổi'}</p>}
          <Actions session={session} busy={busy || openingSessionId === session.id} onEdit={() => void openSession(session, 'session')} onReview={() => void openSession(session, 'review')} onStatus={action => askStatus(session, action)}/>
        </article>)}</div>
      </>}
      <div className="ai-task-pagination"><span>{dataLoaded ? `${sessions.length} buổi học trong khoảng ngày đã chọn` : 'Danh sách chưa tải'}</span>{filters.needsReview && <Link href="/demo/ai-task">Về tổng quan <ArrowRight size={14}/></Link>}</div>
    </section>
    <dialog ref={dialog} className="ai-task-dialog teaching-dialog" onCancel={event => { event.preventDefault(); if (busy) return; if (dialogState?.kind === 'session' || dialogState?.kind === 'review') window.dispatchEvent(new Event('teaching:request-form-close')); else closeDialog() }} onClose={() => setDialogState(null)}>
      {dialogState?.kind === 'session' && <TeachingSessionForm key={dialogState.session?.id || 'new-session'} students={students} settings={settings} initial={dialogState.session} onSave={saveSession} onCancel={closeDialog}/>}
      {dialogState?.kind === 'review' && <SessionReviewForm key={`${dialogState.session.id}-${dialogState.session.updatedAt}`} session={dialogState.session} students={students} settings={settings} onSave={saveReview} onCancel={closeDialog}/>}
      {dialogState?.kind === 'detail' && <SessionDetail session={dialogState.session} onClose={closeDialog} onEdit={() => setDialogState({ kind: 'session', session: dialogState.session })} onReview={() => setDialogState({ kind: 'review', session: dialogState.session })} onStatus={action => askStatus(dialogState.session, action)}/>}
      {dialogState?.kind === 'status' && <section className="teaching-status-dialog"><button className="teaching-dialog-close" aria-label="Đóng" onClick={closeDialog}><X size={18}/></button><p className="teaching-eyebrow">{dialogState.action === 'cancel' ? 'Cập nhật trạng thái' : 'Khôi phục buổi học'}</p><h2>{dialogState.action === 'cancel' ? (ended(dialogState.session) ? 'Buổi học đã diễn ra?' : 'Hủy buổi học?') : 'Đưa buổi học về lịch?'}</h2><p><strong>{dialogState.session.studentName} · {dialogState.session.title}</strong><br/>{formatDate(dialogState.session.startAt)}</p>{dialogState.action === 'cancel' && <label>Lý do nghỉ<textarea maxLength={1000} value={cancelReason} onChange={event => setCancelReason(event.target.value)} placeholder="Ví dụ: học viên xin nghỉ, giáo viên bận…"/><small>Có thể để trống.</small></label>}{error && <p role="alert" className="demo-alert">{error}</p>}<div className="demo-form-actions"><button disabled={busy} onClick={closeDialog}>Quay lại</button><button className={dialogState.action === 'cancel' ? 'teaching-danger-button' : 'demo-primary'} disabled={busy} onClick={() => void commitStatus()}>{busy ? 'Đang lưu…' : dialogState.action === 'cancel' ? 'Xác nhận không học' : 'Khôi phục buổi học'}</button></div></section>}
    </dialog>
    {!students.some(student => student.status === 'ACTIVE') && <p className="teaching-helper">Chưa có học viên đang hoạt động. <Link href="/demo/ai-task/students">Thêm học viên</Link> để lên lịch buổi học.</p>}
  </>
}

function SessionDetail({ session, onClose, onEdit, onReview, onStatus }: { session: TeachingSessionView; onClose(): void; onEdit(): void; onReview(): void; onStatus(action: 'cancel' | 'restore'): void }) {
  const end = new Date(Date.parse(session.startAt) + session.scheduledDurationMinutes * 60_000)
  return <section className="teaching-session-detail"><button className="teaching-dialog-close" aria-label="Đóng" onClick={onClose}><X size={18}/></button><p className="teaching-eyebrow">Chi tiết buổi học</p><h2>{session.title}</h2><p className="teaching-detail-student">{session.studentName}{session.subject ? ` · ${session.subject}` : ''}</p><div className="teaching-detail-grid"><div><small>Thời gian</small><strong>{formatDate(session.startAt)}</strong><span>Kết thúc dự kiến {end.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}</span></div><div><small>Thời lượng</small><strong>{session.actualDurationMinutes ?? session.scheduledDurationMinutes} phút</strong><span>{session.actualDurationMinutes == null ? 'Dự kiến' : `Thực tế · dự kiến ${session.scheduledDurationMinutes} phút`}</span></div><div><small>Học phí</small><strong>{sessionFee(session) == null ? 'Chưa ghi nhận' : formatVnd(sessionFee(session)!)}</strong><span>{session.pricingModeSnapshot === 'PER_HOUR' ? `${formatVnd(session.unitRateSnapshot ?? session.hourlyRateSnapshot ?? 0)}/giờ` : `${formatVnd(session.unitRateSnapshot ?? DEFAULT_SESSION_RATE)}/buổi`}</span></div><div><small>Trạng thái</small><strong><span className={`teaching-status teaching-status-${session.status.toLowerCase()}`}>{statusLabels[session.status]}</span></strong><span>{session.source === 'RECURRING' ? session.isOverride ? 'Lịch tuần · sửa riêng' : 'Lịch tuần' : 'Buổi lẻ'}</span></div></div>
    {session.goals.length ? <><h3>Mục tiêu</h3><ul className="teaching-detail-goals">{session.goals.map(goal => <li key={goal.id}>{goal.isCompleted ? '✓' : '○'} {goal.title}</li>)}</ul></> : <><h3>Mục tiêu</h3><p>Chưa đặt mục tiêu.</p></>}{session.progressPercent != null && <p><strong>Đánh giá:</strong> {session.progressPercent}%</p>}{session.evaluationNote && <><h3>Nhận xét</h3><p className="teaching-detail-note">{session.evaluationNote}</p></>}{session.cancellationReason && <><h3>Lý do nghỉ</h3><p className="teaching-detail-note">{session.cancellationReason}</p></>}<div className="demo-form-actions"><button type="button" onClick={onClose}>Đóng</button>{session.status === 'SCHEDULED' && <><button type="button" onClick={onEdit}>Sửa buổi học</button><button className="demo-primary" type="button" onClick={ended(session) ? onReview : () => onStatus('cancel')}>{ended(session) ? 'Đánh giá' : 'Hủy buổi'}</button>{ended(session) && <button type="button" onClick={() => onStatus('cancel')}>Không học</button>}</>}{session.status === 'COMPLETED' && <button className="demo-primary" type="button" onClick={onReview}>Sửa đánh giá</button>}{session.status === 'CANCELLED' && <button className="demo-primary" type="button" onClick={() => onStatus('restore')}>Khôi phục lịch</button>}</div></section>
}

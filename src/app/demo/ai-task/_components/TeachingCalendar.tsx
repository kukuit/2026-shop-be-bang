'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { DEFAULT_BILLING_CYCLE_CUTOFF_DAY, DEFAULT_HOURLY_RATE, DEFAULT_SESSION_RATE, formatVnd, toVietnamDateTimeLocal, type Student, type TeachingSettings, type TeachingSessionView } from '../_lib/teaching-model'
import { SessionReviewForm, TeachingSessionForm } from './TeachingForms'
import { teachingGet, teachingPost } from './teaching-client'
import { notifyTeachingDataChanged, studentAvatarStyle, studentInitials } from './teaching-ui'
import { useTeachingWorkspace } from './WorkspaceProvider'

type View = 'month' | 'week' | 'day'
const firstVisibleHour = 14
const lastVisibleHour = 21
type DialogState = { kind: 'create'; startAt: string } | { kind: 'detail'; session: TeachingSessionView } | { kind: 'review'; session: TeachingSessionView } | { kind: 'edit'; session: TeachingSessionView } | { kind: 'status'; session: TeachingSessionView; action: 'cancel' | 'restore' }
const pad = (value: number) => String(value).padStart(2, '0')
const keyOf = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
const todayKey = () => keyOf(new Date(Date.now() + 7 * 60 * 60_000))
const atVN = (key: string, hour = 0) => { const [year, month, day] = key.split('-').map(Number); return new Date(Date.UTC(year, month - 1, day, hour - 7)).toISOString() }
const shiftDay = (key: string, amount: number) => { const [year, month, day] = key.split('-').map(Number); return keyOf(new Date(Date.UTC(year, month - 1, day + amount, 12))) }
const dateCaption = (key: string, options: Intl.DateTimeFormatOptions) => { const [year, month, day] = key.split('-').map(Number); return new Intl.DateTimeFormat('vi-VN', { ...options, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(Date.UTC(year, month - 1, day, 12))) }
const monthCaption = (key: string) => dateCaption(`${key.slice(0, 7)}-15`, { month: 'long', year: 'numeric' })
const timeCaption = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })
const sessionAccessibleLabel = (session: TeachingSessionView) => `${session.studentName} — ${session.title}${session.subject ? ` — ${session.subject}` : ''} — ${timeCaption(session.startAt)}`
const statusLabels = { SCHEDULED: 'Sắp học', COMPLETED: 'Đã hoàn thành', CANCELLED: 'Đã hủy' }
const sourceCaption = (session: TeachingSessionView) => session.source === 'RECURRING' ? session.isOverride ? 'Lịch tuần · đã sửa riêng' : 'Lịch tuần' : 'Buổi lẻ'
const ended = (session: TeachingSessionView) => Date.parse(session.startAt) + session.scheduledDurationMinutes * 60_000 < Date.now()
type MaterializedRange = { from: string; to: string }
function isMaterialized(from: string, to: string, ranges: MaterializedRange[]) {
  const today = keyOf(new Date(Date.now() + 7 * 60 * 60_000))
  for (let date = from < today ? today : from; date < to; date = shiftDay(date, 1)) {
    if (!ranges.some(range => range.from <= date && date < range.to)) return false
  }
  return true
}

function visibleRange(selected: string, view: View) {
  if (view === 'day') return { first: selected, days: [selected] }
  if (view === 'week') {
    const [year, month, day] = selected.split('-').map(Number)
    const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()
    const first = shiftDay(selected, -((weekday + 6) % 7))
    return { first, days: Array.from({ length: 7 }, (_, index) => shiftDay(first, index)) }
  }
  const [year, month] = selected.split('-').map(Number)
  const monthStart = `${year}-${pad(month)}-01`
  const weekday = new Date(Date.UTC(year, month - 1, 1, 12)).getUTCDay()
  const leadingDays = (weekday + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month, 0, 12)).getUTCDate()
  const first = shiftDay(monthStart, -leadingDays)
  const cellCount = Math.ceil((leadingDays + daysInMonth) / 7) * 7
  return { first, days: Array.from({ length: cellCount }, (_, index) => shiftDay(first, index)) }
}

export default function TeachingCalendar() {
  const { active } = useTeachingWorkspace()
  const [selected, setSelected] = useState(todayKey)
  const [view, setView] = useState<View>('week')
  const [viewportReady, setViewportReady] = useState(false)
  const [studentFilter, setStudentFilter] = useState('')
  const [sessions, setSessions] = useState<TeachingSessionView[]>([])
  const materializedRanges = useRef<MaterializedRange[]>([])
  const dataLoadedRef = useRef(false)
  const [students, setStudents] = useState<Student[]>([])
  const [settings, setSettings] = useState<TeachingSettings>({ id: 'default', userId: '', defaultPricingMode: 'PER_SESSION', defaultSessionRate: DEFAULT_SESSION_RATE, defaultHourlyRate: DEFAULT_HOURLY_RATE, billingCycleCutoffDay: DEFAULT_BILLING_CYCLE_CUTOFF_DAY, createdAt: '', updatedAt: '' })
  const [loadRequested, setLoadRequested] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const studentsRef = useRef(students)
  studentsRef.current = students
  const [openingSessionId, setOpeningSessionId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dialogState, setDialogState] = useState<DialogState | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const requestCounter = useRef(0)
  const openingSessionRequest = useRef('')
  const range = visibleRange(selected, view)
  const requestFirst = view === 'day' ? shiftDay(selected, -3) : range.first
  const end = view === 'day' ? shiftDay(selected, 4) : shiftDay(range.first, range.days.length)

  const refresh = useCallback(async () => {
    const requestId = ++requestCounter.current
    setLoading(true); setError('')
    try {
      const needsMaterialization = !dataLoadedRef.current || !isMaterialized(requestFirst, end, materializedRanges.current)
      if (needsMaterialization) {
        const pageData = await teachingGet<{ sessions: TeachingSessionView[]; students: Student[]; settings: TeachingSettings; materializedRanges: MaterializedRange[] }>({ resource: 'sessionsPageData', from: atVN(requestFirst), to: atVN(end) })
        if (requestId === requestCounter.current) {
          setSessions(pageData.sessions); setStudents(pageData.students); setSettings(pageData.settings)
          if (pageData.materializedRanges.length) materializedRanges.current = [...materializedRanges.current, ...pageData.materializedRanges]
          dataLoadedRef.current = true; setDataLoaded(true)
        }
      } else {
        const result = await teachingGet<{ sessions: TeachingSessionView[] }>({ resource: 'sessionsRangeData', from: atVN(requestFirst), to: atVN(end), ...(studentFilter ? { studentId: studentFilter } : {}) })
        if (requestId === requestCounter.current) {
          const studentById = new Map(studentsRef.current.map(student => [student.id, student]))
          setSessions(result.sessions.map(session => ({ ...session, studentName: studentById.get(session.studentId)?.name || session.studentName, studentStatus: studentById.get(session.studentId)?.status || null })))
        }
      }
    } catch (reason) { if (requestId === requestCounter.current) setError(reason instanceof Error ? reason.message : 'Không tải được lịch học.') }
    finally { if (requestId === requestCounter.current) setLoading(false) }
  }, [requestFirst, end, studentFilter])
  useEffect(() => { if (viewportReady && loadRequested) void refresh() }, [refresh, viewportReady, loadRequested])
  useEffect(() => { if (active?.mode === 'LOCAL') setLoadRequested(true) }, [active?.id, active?.mode])
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const syncViewport = () => { if (media.matches) setView('day'); setViewportReady(true) }
    syncViewport()
    media.addEventListener('change', syncViewport)
    return () => media.removeEventListener('change', syncViewport)
  }, [])
  const dialogOpen = !!dialogState
  useEffect(() => { if (dialogOpen && !dialog.current?.open) dialog.current?.showModal(); else if (!dialogOpen && dialog.current?.open) dialog.current.close() }, [dialogOpen])
  const openSession = async (session: TeachingSessionView, kind: 'detail' | 'edit' | 'review' = 'detail') => {
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
  }
  const filteredSessions = studentFilter ? sessions.filter(session => session.studentId === studentFilter) : sessions
  const avatarStudentIds = students.map(student => student.id)
  const daySessions = (date: string) => filteredSessions.filter(session => {
    const localStart = toVietnamDateTimeLocal(session.startAt)
    const time = localStart.slice(11, 16)
    return localStart.slice(0, 10) === date && time >= `${pad(firstVisibleHour)}:00` && time < `${pad(lastVisibleHour + 1)}:00`
  }).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
  const openSlot = (date: string, hour = 18) => setDialogState({ kind: 'create', startAt: atVN(date, hour) })
  const shift = (amount: number) => {
    if (view === 'month') {
      const [year, month, day] = selected.split('-').map(Number)
      const date = new Date(Date.UTC(year, month - 1 + amount, 1, 12))
      const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12)).getUTCDate()
      date.setUTCDate(Math.min(day, lastDay))
      setSelected(`${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`)
    } else setSelected(shiftDay(selected, amount * (view === 'week' ? 7 : 1)))
  }
  const saveSession = async (data: Parameters<React.ComponentProps<typeof TeachingSessionForm>['onSave']>[0], allowOverlap = false) => {
    setBusy(true)
    try { await teachingPost({ operation: 'saveSession', data, ...(allowOverlap ? { allowOverlap: true } : {}) }); setDialogState(null); await refresh(); notifyTeachingDataChanged('Đã lưu buổi học.') }
    finally { setBusy(false) }
  }
  const saveReview = async (data: Parameters<React.ComponentProps<typeof SessionReviewForm>['onSave']>[0]) => {
    setBusy(true)
    try { await teachingPost({ operation: 'completeSession', data }); setDialogState(null); await refresh(); notifyTeachingDataChanged('Đã lưu đánh giá buổi học.') }
    finally { setBusy(false) }
  }
  const askStatus = (session: TeachingSessionView, action: 'cancel' | 'restore') => { setCancelReason(''); setDialogState({ kind: 'status', session, action }) }
  const commitStatus = async () => {
    if (dialogState?.kind !== 'status') return
    setBusy(true); setError('')
    try { await teachingPost({ operation: 'sessionStatus', sessionId: dialogState.session.id, action: dialogState.action, ...(dialogState.action === 'cancel' ? { reason: cancelReason.trim() || null } : {}) }); setDialogState(null); await refresh(); notifyTeachingDataChanged('Đã cập nhật trạng thái buổi học.') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không cập nhật được buổi học.') }
    finally { setBusy(false) }
  }
  const goToday = () => setSelected(todayKey())
  const closeDialog = () => { if (!busy) setDialogState(null) }
  const mobileStrip = Array.from({ length: 7 }, (_, index) => shiftDay(selected, index - 3))
  const mobileWeekAgenda = <div className="teaching-mobile-week">{range.days.map(date => {
    const sessionsForDate = daySessions(date)
    return <section className="teaching-mobile-week-day" key={date}>
      <header><button type="button" className="teaching-mobile-week-date" onClick={() => { setSelected(date); setView('day') }}><strong>{dateCaption(date, { weekday: 'long' })}</strong><span>{dateCaption(date, { day: 'numeric', month: 'long' })}</span></button><button type="button" className="teaching-mobile-week-add" aria-label={`Tạo buổi học ngày ${date}`} onClick={() => openSlot(date)}><Plus size={17}/></button></header>
      {sessionsForDate.length ? <div className="teaching-mobile-week-sessions">{sessionsForDate.map(session => <button type="button" className={`teaching-mobile-week-session teaching-event-${session.status.toLowerCase()}`} key={session.id} title={sessionAccessibleLabel(session)} aria-label={sessionAccessibleLabel(session)} onClick={() => void openSession(session)}><span className="teaching-mobile-week-time">{timeCaption(session.startAt)}<small>{session.scheduledDurationMinutes} phút</small></span><span className="teaching-mobile-week-avatar" style={{ ...studentAvatarStyle(session.studentId, avatarStudentIds), borderRadius: '50%' }} aria-hidden="true">{studentInitials(session.studentName)}</span><span className="teaching-mobile-week-info"><strong>{session.studentName}</strong><small>{session.title}{session.subject ? ` · ${session.subject}` : ''}</small></span><span className={`teaching-status teaching-status-${session.status.toLowerCase()}`}>{session.status === 'SCHEDULED' && ended(session) ? 'Cần đánh giá' : statusLabels[session.status]}</span></button>)}</div> : <p className="teaching-mobile-week-empty">Không có buổi học</p>}
    </section>
  })}</div>

  return <>
    <div className="demo-page-heading teaching-heading teaching-calendar-heading"><div><p className="teaching-eyebrow">Kế hoạch</p><h1>Lịch học</h1><p>Xem và quản lý các buổi dạy theo ngày, tuần hoặc tháng.</p></div><button className="demo-primary" disabled={loading || (dataLoaded && openingSessionId !== '')} onClick={() => dataLoaded ? openSlot(selected) : loadRequested ? void refresh() : setLoadRequested(true)}>{dataLoaded ? <><Plus size={17}/> Tạo buổi học</> : loadRequested ? 'Tải lại lịch học' : 'Tải lịch học'}</button></div>
    <section className="demo-panel teaching-calendar-panel">
      <div className="teaching-calendar-toolbar"><div className="teaching-calendar-controls"><button aria-label="Khoảng trước" onClick={() => shift(-1)}><ChevronLeft size={18}/></button><button onClick={goToday}>Hôm nay</button><button aria-label="Khoảng sau" onClick={() => shift(1)}><ChevronRight size={18}/></button><h2>{view === 'month' ? monthCaption(selected) : view === 'week' ? `${dateCaption(range.days[0], { day: 'numeric', month: 'short' })} – ${dateCaption(range.days[6], { day: 'numeric', month: 'short', year: 'numeric' })}` : dateCaption(selected, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2></div>
        <div className="teaching-calendar-tools"><label className="teaching-calendar-date"> <span>Chọn ngày</span><input aria-label="Chọn ngày" type="date" value={selected} onChange={event => event.target.value && setSelected(event.target.value)}/></label><select aria-label="Lọc theo học viên" value={studentFilter} onChange={event => setStudentFilter(event.target.value)}><option value="">Tất cả học viên</option>{students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}</select><div className="teaching-view-switch" role="group" aria-label="Chế độ lịch">{(['month', 'week', 'day'] as View[]).map(option => <button key={option} aria-pressed={view === option} onClick={() => { if (option === 'week') setSelected(todayKey()); setView(option) }}>{option === 'month' ? 'Tháng' : option === 'week' ? 'Tuần' : 'Ngày'}</button>)}</div></div></div>
      {error && <div role="alert" className="demo-alert teaching-retry"><span>{error}</span><button onClick={() => void refresh()}>Thử lại</button></div>}
      {dataLoaded && view === 'day' && <div className="teaching-mobile-day-strip" aria-label="Chọn ngày trong tuần">{mobileStrip.map(date => <button key={date} className={date === selected ? 'is-selected' : ''} onClick={() => setSelected(date)}><span>{dateCaption(date, { weekday: 'short' })}</span><strong>{Number(date.slice(-2))}</strong>{daySessions(date).length > 0 && <i aria-label={`${daySessions(date).length} buổi học`}/>}</button>)}</div>}
      {loading ? <div className="teaching-loading-list" role="status" aria-label="Đang tải lịch"><div className="teaching-skeleton"/><div className="teaching-skeleton"/><div className="teaching-skeleton"/></div> : !dataLoaded ? <div className="teaching-empty-card"><strong>Lịch chưa được tải</strong><p>Tải lịch khi cần xem buổi học. Việc này cũng kiểm tra các buổi định kỳ trong khoảng đang chọn.</p><button className="demo-primary" onClick={() => loadRequested ? void refresh() : setLoadRequested(true)}>{loadRequested ? 'Tải lại lịch học' : 'Tải lịch học'}</button></div> : view === 'month' ? <div className="teaching-month-grid">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(label => <div className="teaching-weekday" key={label}>{label}</div>)}
        {range.days.map(date => {
          const outsideMonth = date.slice(0, 7) !== selected.slice(0, 7)
          return <div key={date} className={`teaching-month-day${outsideMonth ? ' is-outside' : ''}${date === selected ? ' is-selected' : ''}`} onClick={outsideMonth ? undefined : event => { setSelected(date); if (!(event.target as HTMLElement).closest('button')) openSlot(date) }}>
            {!outsideMonth && <>
              <button className="teaching-day-number" onClick={event => { event.stopPropagation(); setSelected(date) }}>{Number(date.slice(-2))}</button><button className="teaching-day-add" aria-label={`Tạo buổi học ngày ${date}`} onClick={event => { event.stopPropagation(); openSlot(date) }}><Plus size={13}/></button>
              {daySessions(date).slice(0, 3).map(session => <button key={session.id} className={`teaching-event teaching-event-${session.status.toLowerCase()}`} title={sessionAccessibleLabel(session)} aria-label={sessionAccessibleLabel(session)} onClick={event => { event.stopPropagation(); void openSession(session) }}><time>{timeCaption(session.startAt)}</time><span className="teaching-event-initials" style={{ ...studentAvatarStyle(session.studentId, avatarStudentIds), borderRadius: '50%' }} aria-hidden="true">{studentInitials(session.studentName)}</span></button>)}{daySessions(date).length > 3 && <small className="teaching-more-events">+{daySessions(date).length - 3} buổi khác</small>}
            </>}
          </div>
        })}
      </div> : view === 'day' ? <div className="teaching-day-agenda"><header><div><p className="teaching-eyebrow">{dateCaption(selected, { weekday: 'long' })}</p><h2>{dateCaption(selected, { day: 'numeric', month: 'long', year: 'numeric' })}</h2></div><button className="teaching-agenda-add" onClick={() => openSlot(selected)}><Plus size={16}/> Thêm buổi</button></header>{daySessions(selected).length ? daySessions(selected).map(session => <button className={`teaching-agenda-item teaching-event-${session.status.toLowerCase()}`} key={session.id} title={sessionAccessibleLabel(session)} aria-label={sessionAccessibleLabel(session)} onClick={() => void openSession(session)}><span className="teaching-agenda-time">{timeCaption(session.startAt)}<small>{session.scheduledDurationMinutes} phút</small></span><span className="teaching-agenda-content"><strong className="teaching-agenda-initials" style={{ ...studentAvatarStyle(session.studentId, avatarStudentIds), borderRadius: '50%' }} aria-hidden="true">{studentInitials(session.studentName)}</strong></span><span className={`teaching-status teaching-status-${session.status.toLowerCase()}`}>{session.status === 'SCHEDULED' && ended(session) ? 'Cần đánh giá' : statusLabels[session.status]}</span></button>) : <div className="teaching-empty-card"><Plus size={22}/><strong>Ngày này chưa có buổi học</strong><p>Chọn thời gian để tạo một buổi học mới.</p><button className="demo-primary" onClick={() => openSlot(selected)}><Plus size={16}/> Lên lịch</button></div>}</div> : <>{mobileWeekAgenda}<div className="teaching-slot-grid teaching-slot-grid-week">
        <div className="teaching-slot-corner"/>{range.days.map(date => <div className="teaching-slot-day-heading" key={date}><strong>{dateCaption(date, { weekday: 'short' })}</strong><span>{dateCaption(date, { day: 'numeric', month: 'numeric' })}</span><button aria-label={`Tạo buổi học ngày ${date}`} onClick={() => openSlot(date)}><Plus size={14}/></button></div>)}
        {Array.from({ length: lastVisibleHour - firstVisibleHour + 1 }, (_, index) => index + firstVisibleHour).map(hour => <div className="teaching-slot-row" key={hour}><time>{pad(hour)}:00</time>{range.days.map(date => { const atHour = daySessions(date).filter(session => Number(toVietnamDateTimeLocal(session.startAt).slice(11, 13)) === hour); return <div key={`${date}-${hour}`} className="teaching-slot-cell" onClick={() => openSlot(date, hour)}>{atHour.map(session => <button key={session.id} className={`teaching-event teaching-event-${session.status.toLowerCase()}`} title={sessionAccessibleLabel(session)} aria-label={sessionAccessibleLabel(session)} onClick={event => { event.stopPropagation(); void openSession(session) }}><time>{timeCaption(session.startAt)}</time><span className="teaching-event-initials" style={{ ...studentAvatarStyle(session.studentId, avatarStudentIds), borderRadius: '50%' }} aria-hidden="true">{studentInitials(session.studentName)}</span></button>)}</div> })}</div>)}
      </div></>}
      <div className="teaching-calendar-legend"><span><i className="teaching-dot teaching-dot-scheduled"/>Sắp học</span><span><i className="teaching-dot teaching-dot-completed"/>Đã hoàn thành</span><span><i className="teaching-dot teaching-dot-cancelled"/>Đã hủy</span></div>
    </section>
    <dialog ref={dialog} className="ai-task-dialog teaching-dialog" onCancel={event => { event.preventDefault(); if (busy) return; if (dialogState?.kind === 'create' || dialogState?.kind === 'edit' || dialogState?.kind === 'review') window.dispatchEvent(new Event('teaching:request-form-close')); else closeDialog() }} onClose={() => setDialogState(null)}>
      {dialogState?.kind === 'create' && <TeachingSessionForm key={dialogState.startAt} students={students} settings={settings} initialStartAt={dialogState.startAt} onSave={saveSession} onCancel={closeDialog}/>}
      {dialogState?.kind === 'edit' && <TeachingSessionForm key={dialogState.session.id} students={students} settings={settings} initial={dialogState.session} onSave={saveSession} onCancel={closeDialog}/>}
      {dialogState?.kind === 'review' && <SessionReviewForm key={`${dialogState.session.id}-${dialogState.session.updatedAt}`} session={dialogState.session} students={students} settings={settings} onSave={saveReview} onCancel={closeDialog}/>}
      {dialogState?.kind === 'detail' && <CalendarSessionDetail session={dialogState.session} onClose={closeDialog} onEdit={() => setDialogState({ kind: 'edit', session: dialogState.session })} onReview={() => setDialogState({ kind: 'review', session: dialogState.session })} onStatus={action => askStatus(dialogState.session, action)}/>}
      {dialogState?.kind === 'status' && <section className="teaching-status-dialog"><button className="teaching-dialog-close" aria-label="Đóng" onClick={closeDialog}><X size={18}/></button><p className="teaching-eyebrow">Cập nhật trạng thái</p><h2>{dialogState.action === 'cancel' ? ended(dialogState.session) ? 'Học viên không tham gia?' : 'Hủy buổi học?' : 'Khôi phục buổi học?'}</h2><p><strong>{dialogState.session.studentName} · {dialogState.session.title}</strong><br/>{dateCaption(toVietnamDateTimeLocal(dialogState.session.startAt).slice(0, 10), { day: 'numeric', month: 'long', year: 'numeric' })} · {timeCaption(dialogState.session.startAt)}</p>{dialogState.action === 'cancel' && <label>Lý do nghỉ<textarea maxLength={1000} value={cancelReason} onChange={event => setCancelReason(event.target.value)} placeholder="Ví dụ: học viên xin nghỉ…"/><small>Có thể để trống.</small></label>}{error && <p role="alert" className="demo-alert">{error}</p>}<div className="demo-form-actions"><button disabled={busy} onClick={closeDialog}>Quay lại</button><button className={dialogState.action === 'cancel' ? 'teaching-danger-button' : 'demo-primary'} disabled={busy} onClick={() => void commitStatus()}>{busy ? 'Đang lưu…' : dialogState.action === 'cancel' ? 'Xác nhận' : 'Khôi phục lịch'}</button></div></section>}
    </dialog>
  </>
}

function CalendarSessionDetail({ session, onClose, onEdit, onReview, onStatus }: { session: TeachingSessionView; onClose(): void; onEdit(): void; onReview(): void; onStatus(action: 'cancel' | 'restore'): void }) {
  const fee = session.feeAmount ?? (session.status === 'SCHEDULED' && session.unitRateSnapshot != null ? session.pricingModeSnapshot === 'PER_SESSION' ? session.unitRateSnapshot : Math.round(session.unitRateSnapshot * session.scheduledDurationMinutes / 60) : null)
  return <section className="teaching-session-detail"><button className="teaching-dialog-close" aria-label="Đóng" onClick={onClose}><X size={18}/></button><p className="teaching-eyebrow">Chi tiết buổi học · {sourceCaption(session)}</p><h2>{session.studentName} · {session.title}</h2><p>{dateCaption(toVietnamDateTimeLocal(session.startAt).slice(0, 10), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {timeCaption(session.startAt)} · {session.scheduledDurationMinutes} phút dự kiến</p>{session.subject && <p>Môn học: {session.subject}</p>}<p>Trạng thái: <span className={`teaching-status teaching-status-${session.status.toLowerCase()}`}>{statusLabels[session.status]}</span>{session.status === 'SCHEDULED' && ended(session) ? ' · Cần đánh giá' : ''}</p><p>{session.status === 'SCHEDULED' ? 'Học phí dự kiến:' : 'Học phí:'} <strong>{fee == null ? 'Chưa ghi nhận' : formatVnd(fee)}</strong>{session.pricingModeSnapshot === 'PER_HOUR' ? ' · theo giờ' : ' · theo buổi'}</p>{session.actualDurationMinutes != null && <p>Thời lượng thực tế: {session.actualDurationMinutes} phút</p>}<h3>Mục tiêu ({session.goals.length})</h3>{session.goals.length ? <ul>{session.goals.map(goal => <li key={goal.id}>{goal.isCompleted ? '✓' : '○'} {goal.title}</li>)}</ul> : <p>Chưa đặt mục tiêu.</p>}{session.progressPercent != null && <p>Đánh giá: <strong>{session.progressPercent}%</strong></p>}{session.evaluationNote && <><h3>Nhận xét</h3><p className="teaching-detail-note">{session.evaluationNote}</p></>}{session.cancellationReason && <><h3>Lý do nghỉ</h3><p className="teaching-detail-note">{session.cancellationReason}</p></>}<div className="demo-form-actions"><button type="button" onClick={onClose}>Đóng</button>{session.status === 'SCHEDULED' && <><button type="button" onClick={onEdit}>Sửa</button>{ended(session) ? <><button className="demo-primary" type="button" onClick={onReview}>Đánh giá</button><button type="button" onClick={() => onStatus('cancel')}>Không học</button></> : <button className="teaching-danger-button" type="button" onClick={() => onStatus('cancel')}>Hủy buổi</button>}</>}{session.status === 'COMPLETED' && <button className="demo-primary" type="button" onClick={onReview}>Sửa đánh giá</button>}{session.status === 'CANCELLED' && <button className="demo-primary" type="button" onClick={() => onStatus('restore')}>Khôi phục lịch</button>}</div></section>
}

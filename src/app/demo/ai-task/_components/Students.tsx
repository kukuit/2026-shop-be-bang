'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, HandCoins, Pencil, Plus, UserRound, X } from 'lucide-react'
import { DEFAULT_BILLING_CYCLE_CUTOFF_DAY, DEFAULT_HOURLY_RATE, DEFAULT_SESSION_RATE, formatVnd, resolveStudentPricing, shiftVietnamDate, vietnamBillingPeriod, vietnamTodayKey, type PricingMode, type Student, type TeachingBillingPeriod, type TeachingSettings, type TeachingStudentBillingRow, type TeachingSessionView, type WeeklySchedule } from '../_lib/teaching-model'
import type { StudentBillingCalculation } from '../_lib/student-billing'
import { SessionReviewForm } from './TeachingForms'
import { teachingGet, teachingPost, TeachingRequestError } from './teaching-client'
import { notifyTeachingDataChanged, studentAvatarStyle, studentInitials } from './teaching-ui'
import { useTeachingWorkspace } from './WorkspaceProvider'

type ScheduleDraft = Omit<Pick<WeeklySchedule, 'seriesId' | 'dayOfWeek' | 'startTime' | 'durationMinutes'>, 'seriesId'> & { seriesId?: string }
type StudentDraft = { id?: string; name: string; hourlyRate: string; pricingSelection: 'DEFAULT' | 'PER_SESSION' | 'PER_HOUR'; sessionRate: string; status: 'ACTIVE' | 'INACTIVE'; note: string; weeklySchedules: ScheduleDraft[]; scheduleEffectiveFrom: string; originalScheduleKey: string }
type StudentBillingDetailsResponse = { period: TeachingBillingPeriod; row: StudentBillingCalculation }
type SchedulePreview = { start: string; end: string; existingSessions: number; overrides: number; projectedOld: number; projectedNew: number; removed: number; added: number }
const blank = (): StudentDraft => ({ name: '', hourlyRate: '', pricingSelection: 'DEFAULT', sessionRate: '', status: 'ACTIVE', note: '', weeklySchedules: [], scheduleEffectiveFrom: vietnamTodayKey(), originalScheduleKey: '[]' })
const weekdayLabels = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']
const scheduleEntriesInWeekOrder = (schedules: Pick<WeeklySchedule, 'seriesId' | 'dayOfWeek' | 'startTime' | 'durationMinutes'>[]) => schedules.map((schedule, index) => ({ schedule, index })).sort((a, b) => (a.schedule.dayOfWeek || 7) - (b.schedule.dayOfWeek || 7) || a.schedule.startTime.localeCompare(b.schedule.startTime))
const scheduleKey = (schedules: ScheduleDraft[]) => JSON.stringify(schedules.map(({ seriesId, dayOfWeek, startTime, durationMinutes }) => ({ seriesId: seriesId || '', dayOfWeek, startTime, durationMinutes })).sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime) || a.seriesId.localeCompare(b.seriesId)))
const billingDate = (value: string) => { const [year, month, day] = value.split('-'); return `${day}/${month}/${year}` }
const billingDateShort = (value: string) => billingDate(value).slice(0, 5)
const collectableAmount = (amount: number) => Math.max(0, amount)
const formatBalance = (amount: number) => amount < 0 ? `Dư ${formatVnd(Math.abs(amount))}` : formatVnd(amount)
const newPaymentId = () => globalThis.crypto?.randomUUID?.() || `payment_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
const shortDateTime = (value: string) => {
  const date = new Date(value)
  const time = date.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const day = date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' })
  return `${time} · ${day}`
}
const paymentDateTime = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const billingHours = (minutes: number) => `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(minutes / 60)} giờ`
const scheduleProjection = (schedules: ScheduleDraft[], start: string, end: string) => {
  const slots = new Set<string>()
  for (let date = start; date < end; date = shiftVietnamDate(date, 1)) {
    const day = new Date(`${date}T12:00:00Z`).getUTCDay()
    for (const schedule of schedules) if (schedule.dayOfWeek === day) slots.add(`${schedule.seriesId || `${day}-${schedule.startTime}`}|${date}|${schedule.startTime}|${schedule.durationMinutes}`)
  }
  return slots
}

export default function Students() {
  const { active } = useTeachingWorkspace()
  const [students, setStudents] = useState<Student[]>([])
  const [settings, setSettings] = useState<Pick<TeachingSettings, 'defaultPricingMode' | 'defaultSessionRate' | 'defaultHourlyRate' | 'billingCycleCutoffDay'>>({ defaultPricingMode: 'PER_SESSION', defaultSessionRate: DEFAULT_SESSION_RATE, defaultHourlyRate: DEFAULT_HOURLY_RATE, billingCycleCutoffDay: DEFAULT_BILLING_CYCLE_CUTOFF_DAY })
  const [billingSummary, setBillingSummary] = useState<{ period: TeachingBillingPeriod; rows: TeachingStudentBillingRow[] } | null>(null)
  const [draft, setDraft] = useState<StudentDraft | null>(null)
  const [baseDraft, setBaseDraft] = useState<StudentDraft | null>(null)
  const [detailStudent, setDetailStudent] = useState<Student | null>(null)
  const [detailBilling, setDetailBilling] = useState<{ studentId: string; period: TeachingBillingPeriod; row: StudentBillingCalculation } | null>(null)
  const [detailBillingLoading, setDetailBillingLoading] = useState(false)
  const [detailBillingError, setDetailBillingError] = useState('')
  const [pendingStudent, setPendingStudent] = useState<Student | null>(null)
  const [pendingSession, setPendingSession] = useState<TeachingSessionView | null>(null)
  const [pendingSessionId, setPendingSessionId] = useState('')
  const [reviewingPendingSession, setReviewingPendingSession] = useState(false)
  const [pendingLoading, setPendingLoading] = useState(false)
  const [pendingBusy, setPendingBusy] = useState(false)
  const [pendingActionId, setPendingActionId] = useState('')
  const [pendingActionKind, setPendingActionKind] = useState<'attended' | 'review' | 'absent' | null>(null)
  const [pendingError, setPendingError] = useState('')
  const [activeTab, setActiveTab] = useState<'profile' | 'schedule' | 'balance'>('profile')
  const [paymentStudent, setPaymentStudent] = useState<Student | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [paymentBilling, setPaymentBilling] = useState<{ studentId: string; period: TeachingBillingPeriod; row: StudentBillingCalculation } | null>(null)
  const [paymentBillingLoading, setPaymentBillingLoading] = useState(false)
  const [paymentBillingError, setPaymentBillingError] = useState('')
  const [paymentBusy, setPaymentBusy] = useState(false)
  const [paymentId, setPaymentId] = useState('')
  const [paymentTab, setPaymentTab] = useState<'payment' | 'history'>('payment')
  const [preview, setPreview] = useState<SchedulePreview | null>(null)
  const [scheduleConflicts, setScheduleConflicts] = useState<TeachingRequestError['scheduleConflicts']>(undefined)
  const [pendingEffectiveDate, setPendingEffectiveDate] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [confirmStatus, setConfirmStatus] = useState(false)
  const [loadRequested, setLoadRequested] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState('')
  const [openingBalanceCalculation, setOpeningBalanceCalculation] = useState<{ studentId: string; result: StudentBillingDetailsResponse } | null>(null)
  const [openingBalanceLoading, setOpeningBalanceLoading] = useState(false)
  const [openingBalanceError, setOpeningBalanceError] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const previewRequest = useRef(0)
  const billingRequested = useRef(false)
  const paymentBillingRequest = useRef(0)
  const detailBillingRequest = useRef(0)
  const openingBalanceRequest = useRef(0)

  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    if (billingRequested.current) setBillingLoading(true)
    try {
      const billingLoad = billingRequested.current
        ? teachingGet<{ period: TeachingBillingPeriod; rows: TeachingStudentBillingRow[] }>({ resource: 'billingSummary' }).then(data => { setBillingSummary(data); setBillingError('') }).catch(reason => { setBillingSummary(null); setBillingError(reason instanceof Error ? reason.message : 'Không tải được thống kê học phí.') })
        : Promise.resolve()
      const [pageData] = await Promise.all([
        teachingGet<{ students: Student[]; settings: TeachingSettings }>({ resource: 'studentsPageData' }),
        billingLoad,
      ])
      setStudents(pageData.students)
      setSettings(pageData.settings)
      setDataLoaded(true)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được danh sách học viên.') }
    finally { setLoading(false); setBillingLoading(false) }
  }, [])
  const loadBillingSummary = useCallback(async () => {
    billingRequested.current = true
    setBillingLoading(true); setBillingError('')
    try {
      const result = await teachingGet<{ period: TeachingBillingPeriod; rows: TeachingStudentBillingRow[] }>({ resource: 'billingSummary' })
      setBillingSummary(result); setBillingError(''); return result
    } catch (reason) { setBillingSummary(null); setBillingError(reason instanceof Error ? reason.message : 'Không tải được thống kê học phí.') }
    finally { setBillingLoading(false) }
    return null
  }, [])
  useEffect(() => { if (loadRequested) void refresh() }, [refresh, loadRequested])
  useEffect(() => {
    const endDate = billingSummary?.period.endDate
    if (!endDate) return
    const nextPeriodStart = shiftVietnamDate(endDate, 1)
    const refreshAt = Date.parse(`${nextPeriodStart}T00:00:05+07:00`)
    const timer = window.setTimeout(() => { void loadBillingSummary() }, Math.max(0, refreshAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [billingSummary?.period.endDate, loadBillingSummary])
  useEffect(() => {
    if (active?.mode !== 'LOCAL') return
    billingRequested.current = true
    setLoadRequested(true)
  }, [active?.id, active?.mode])
  useEffect(() => {
    const onTeachingDataChanged = () => { void refresh() }
    window.addEventListener('teaching:data-changed', onTeachingDataChanged)
    return () => window.removeEventListener('teaching:data-changed', onTeachingDataChanged)
  }, [refresh])
  const dialogOpen = !!draft || !!detailStudent || !!pendingStudent || !!paymentStudent
  useEffect(() => { if (dialogOpen && !dialog.current?.open) dialog.current?.showModal(); else if (!dialogOpen && dialog.current?.open) dialog.current.close() }, [dialogOpen])
  const billingByStudent = useMemo(() => new Map<string, TeachingStudentBillingRow>((billingSummary?.rows || []).map(row => [row.studentId, row] as const)), [billingSummary])
  const dirty = !!draft && !!baseDraft && JSON.stringify(draft) !== JSON.stringify(baseDraft)
  const currentPeriod = billingSummary?.period || vietnamBillingPeriod(settings.billingCycleCutoffDay)
  const openNew = () => { openingBalanceRequest.current += 1; detailBillingRequest.current += 1; const next = blank(); setDraft(next); setBaseDraft(next); setDetailStudent(null); setDetailBillingLoading(false); setPendingStudent(null); setPaymentStudent(null); setOpeningBalanceCalculation(null); setOpeningBalanceLoading(false); setOpeningBalanceError(''); setActiveTab('profile'); setPreview(null); setScheduleConflicts(undefined); setError(''); setConfirmDiscard(false) }
  const makeDraft = (student: Student): StudentDraft => {
    const schedules = (student.weeklySchedules || []).map(({ seriesId, dayOfWeek, startTime, durationMinutes }) => ({ seriesId, dayOfWeek, startTime, durationMinutes }))
    const pricingSelection = student.pricingMode === 'PER_HOUR' ? 'PER_HOUR' : student.pricingMode === 'PER_SESSION' && student.sessionRate != null ? 'PER_SESSION' : 'DEFAULT'
    return { id: student.id, name: student.name, hourlyRate: student.hourlyRate == null ? '' : String(student.hourlyRate), pricingSelection, sessionRate: student.sessionRate == null ? '' : String(student.sessionRate), status: student.status, note: student.note || '', weeklySchedules: schedules, scheduleEffectiveFrom: vietnamTodayKey(), originalScheduleKey: scheduleKey(schedules) }
  }
  const openEdit = (student: Student) => { openingBalanceRequest.current += 1; detailBillingRequest.current += 1; const next = makeDraft(student); setDraft(next); setBaseDraft(next); setDetailStudent(null); setDetailBillingLoading(false); setPendingStudent(null); setPaymentStudent(null); setOpeningBalanceCalculation(null); setOpeningBalanceLoading(false); setOpeningBalanceError(''); setActiveTab('profile'); setPreview(null); setScheduleConflicts(undefined); setError(''); setConfirmDiscard(false) }
  const openStudentDetails = async (student: Student) => {
    const requestId = ++detailBillingRequest.current
    paymentBillingRequest.current += 1
    setDetailStudent(student); setDraft(null); setPendingStudent(null); setPaymentStudent(null); setDetailBilling(null); setDetailBillingLoading(true); setDetailBillingError(''); setError('')
    try {
      const result = await teachingGet<StudentBillingDetailsResponse>({ resource: 'studentBillingDetails', studentId: student.id })
      if (requestId === detailBillingRequest.current) setDetailBilling({ studentId: student.id, ...result })
    } catch (reason) {
      if (requestId === detailBillingRequest.current) setDetailBillingError(reason instanceof Error ? reason.message : 'Không tải được công nợ học viên.')
    } finally { if (requestId === detailBillingRequest.current) setDetailBillingLoading(false) }
  }
  const closeRequest = () => { if (busy || pendingBusy || paymentBusy) return; if (dirty) setConfirmDiscard(true); else { paymentBillingRequest.current += 1; detailBillingRequest.current += 1; openingBalanceRequest.current += 1; setDraft(null); setDetailStudent(null); setDetailBillingLoading(false); setPendingStudent(null); setPaymentStudent(null); setPaymentBilling(null); setPaymentBillingLoading(false); setPendingSession(null); setPendingSessionId(''); setReviewingPendingSession(false); setPreview(null) } }
  const selectStudentTab = async (tab: 'profile' | 'schedule' | 'balance') => {
    setActiveTab(tab)
    if (tab !== 'balance') { openingBalanceRequest.current += 1; setOpeningBalanceLoading(false); return }
    if (!draft?.id) { setOpeningBalanceCalculation(null); setOpeningBalanceError(''); setOpeningBalanceLoading(false); return }
    const studentId = draft.id
    const requestId = ++openingBalanceRequest.current
    setOpeningBalanceLoading(true); setOpeningBalanceError('')
    try {
      const result = await teachingGet<StudentBillingDetailsResponse>({ resource: 'studentBillingDetails', studentId })
      if (requestId === openingBalanceRequest.current) setOpeningBalanceCalculation({ studentId, result })
    } catch (reason) {
      if (requestId === openingBalanceRequest.current) setOpeningBalanceError(reason instanceof Error ? reason.message : 'Không tính được số dư đầu kỳ.')
    } finally { if (requestId === openingBalanceRequest.current) setOpeningBalanceLoading(false) }
  }
  const openPayment = async (student: Student) => {
    const requestId = ++paymentBillingRequest.current
    detailBillingRequest.current += 1
    setPaymentError(''); setPaymentBillingError(''); setPaymentBilling(null); setPaymentBillingLoading(true); setError('')
    setDraft(null); setDetailStudent(null); setDetailBillingLoading(false); setPendingStudent(null); setPendingSession(null)
    setPaymentStudent(student); setPaymentAmount(''); setPaymentId(newPaymentId()); setPaymentTab('payment')
    try {
      const result = await teachingGet<StudentBillingDetailsResponse>({ resource: 'studentBillingDetails', studentId: student.id })
      if (requestId === paymentBillingRequest.current) setPaymentBilling({ studentId: student.id, ...result })
    } catch (reason) {
      if (requestId === paymentBillingRequest.current) setPaymentBillingError(reason instanceof Error ? reason.message : 'Không tải được số dư học phí.')
    } finally { if (requestId === paymentBillingRequest.current) setPaymentBillingLoading(false) }
  }
  const savePayment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!paymentStudent) return
    const amount = Number(paymentAmount)
    const row = paymentBilling?.studentId === paymentStudent.id ? paymentBilling.row : null
    if (!row) { setPaymentError('Hãy chờ tải xong công nợ trước khi ghi nhận thanh toán.'); return }
    if (!Number.isInteger(amount) || amount <= 0) { setPaymentError('Hãy nhập số tiền thanh toán lớn hơn 0.'); return }
    if (!row || amount > Math.max(0, row.remainingAmount)) { setPaymentError('Số tiền không được lớn hơn khoản còn phải thu. Hãy tải lại thống kê học phí.'); return }
    setPaymentBusy(true); setPaymentError('')
    try {
      await teachingPost({ operation: 'recordStudentPayment', data: { studentId: paymentStudent.id, paymentId, amount } })
      setPaymentStudent(null); setPaymentAmount(''); setPaymentId('')
      notifyTeachingDataChanged('Đã ghi nhận thanh toán học phí.')
    } catch (reason) { setPaymentError(reason instanceof Error ? reason.message : 'Không ghi nhận được khoản thanh toán.') }
    finally { setPaymentBusy(false) }
  }
  const openPendingSession = async (sessionId: string, reviewImmediately = false) => {
    setPendingSessionId(sessionId); setPendingSession(null); setReviewingPendingSession(reviewImmediately); setPendingActionId(reviewImmediately ? sessionId : ''); setPendingActionKind(reviewImmediately ? 'review' : null); setPendingError(''); setPendingLoading(true)
    try {
      const result = await teachingGet<{ session: TeachingSessionView }>({ resource: 'session', id: sessionId })
      if (result.session.status !== 'SCHEDULED' || result.session.lifecycleStatus === 'SUPERSEDED') {
        setReviewingPendingSession(false)
        setPendingSessionId('')
        setPendingError('Buổi học vừa được cập nhật ở nơi khác. Danh sách đã được tải lại.')
        await refresh()
      } else setPendingSession(result.session)
    } catch (reason) { setPendingError(reason instanceof Error ? reason.message : 'Không tải được buổi học cần xác nhận.') }
    finally { setPendingLoading(false); setPendingActionId(''); setPendingActionKind(null) }
  }
  const openPending = (student: Student) => {
    setDraft(null); setDetailStudent(null); setPendingStudent(student); setPendingError(''); setPendingSession(null); setPendingSessionId(''); setReviewingPendingSession(false)
  }
  const savePendingReview: React.ComponentProps<typeof SessionReviewForm>['onSave'] = async data => {
    setPendingBusy(true); setPendingError('')
    try {
      await teachingPost({ operation: 'completeSession', data })
      setPendingSession(null); setPendingSessionId(''); setReviewingPendingSession(false); setPendingError('')
      notifyTeachingDataChanged('Đã xác nhận và lưu đánh giá buổi học.')
    } catch (reason) { setPendingError(reason instanceof Error ? reason.message : 'Không lưu được xác nhận buổi học.'); throw reason }
    finally { setPendingBusy(false) }
  }
  const confirmNoAttendance = async (sessionId: string) => {
    setPendingBusy(true); setPendingActionId(sessionId); setPendingActionKind('absent'); setPendingError('')
    try {
      await teachingPost({ operation: 'sessionStatus', sessionId, action: 'cancel' })
      setPendingError('')
      notifyTeachingDataChanged('Đã xác nhận buổi học không diễn ra.')
    } catch (reason) { setPendingError(reason instanceof Error ? reason.message : 'Không lưu được xác nhận buổi học.') }
    finally { setPendingBusy(false); setPendingActionId(''); setPendingActionKind(null) }
  }
  const confirmAttendance = async (sessionId: string) => {
    setPendingBusy(true); setPendingActionId(sessionId); setPendingActionKind('attended'); setPendingError('')
    try {
      await teachingPost({ operation: 'confirmAttendance', data: { sessionId } })
      notifyTeachingDataChanged('Đã xác nhận buổi học và tính học phí theo thời lượng dự kiến.')
    } catch (reason) { setPendingError(reason instanceof Error ? reason.message : 'Không lưu được xác nhận buổi học.') }
    finally { setPendingBusy(false); setPendingActionId(''); setPendingActionKind(null) }
  }
  const updateWeeklySchedule = (index: number, changes: Partial<ScheduleDraft>) => { setPreview(null); setDraft(old => old ? ({ ...old, weeklySchedules: old.weeklySchedules.map((item, i) => i === index ? { ...item, ...changes } : item) }) : old) }
  const changeScheduleEffectiveFrom = (date: string) => {
    if (!draft || date < vietnamTodayKey()) return
    if (draft.id && scheduleKey(draft.weeklySchedules) !== draft.originalScheduleKey) { setPendingEffectiveDate(date); return }
    void applyScheduleEffectiveDate(date)
  }
  const applyScheduleEffectiveDate = async (date: string) => {
    if (!draft) return
    const requestId = ++previewRequest.current
    setPreview(null); setScheduleConflicts(undefined); setError('')
    setPendingEffectiveDate(null)
    setDraft(old => old ? ({ ...old, scheduleEffectiveFrom: date }) : old)
    if (!draft.id || !date) return
    setPreviewLoading(true)
    try {
      const result = await teachingGet<{ weeklySchedules: WeeklySchedule[] }>({ resource: 'weeklySchedules', studentId: draft.id, date })
      if (requestId !== previewRequest.current) return
      const weeklySchedules = result.weeklySchedules.map(({ seriesId, dayOfWeek, startTime, durationMinutes }) => ({ seriesId, dayOfWeek, startTime, durationMinutes }))
      setDraft(old => old ? ({ ...old, scheduleEffectiveFrom: date, weeklySchedules, originalScheduleKey: scheduleKey(weeklySchedules) }) : old)
      setBaseDraft(old => old ? ({ ...old, scheduleEffectiveFrom: date, weeklySchedules, originalScheduleKey: scheduleKey(weeklySchedules) }) : old)
    } catch (reason) { if (requestId === previewRequest.current) setError(reason instanceof Error ? reason.message : 'Không tải được lịch theo ngày hiệu lực.') }
    finally { if (requestId === previewRequest.current) setPreviewLoading(false) }
  }
  const loadSchedulePreview = async (current: StudentDraft) => {
    const start = current.scheduleEffectiveFrom
    const end = shiftVietnamDate(start, 30)
    setPreviewLoading(true); setError('')
    try {
      const result = await teachingGet<{ sessions: TeachingSessionView[] }>({ resource: 'sessions', from: `${start}T00:00:00+07:00`, to: `${end}T00:00:00+07:00`, studentId: current.id || '', materialize: 'false' })
      const recurring = result.sessions.filter(session => session.source === 'RECURRING' && session.occurrenceDate && session.occurrenceDate >= start && session.occurrenceDate < end)
      const currentSchedules = JSON.parse(current.originalScheduleKey) as ScheduleDraft[]
      const oldSlots = scheduleProjection(currentSchedules, start, end)
      const newSlots = scheduleProjection(current.weeklySchedules, start, end)
      const removed = Array.from(oldSlots).filter(slot => !newSlots.has(slot)).length
      const added = Array.from(newSlots).filter(slot => !oldSlots.has(slot)).length
      setPreview({ start, end, existingSessions: recurring.filter(session => session.status === 'SCHEDULED' && !session.isOverride).length, overrides: recurring.filter(session => session.isOverride).length, projectedOld: oldSlots.size, projectedNew: newSlots.size, removed, added })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được bản xem trước lịch.') }
    finally { setPreviewLoading(false) }
  }
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft) return
    const schedulesChanged = scheduleKey(draft.weeklySchedules) !== draft.originalScheduleKey
    if (draft.id && schedulesChanged && !preview) { await loadSchedulePreview(draft); return }
    await persist(draft, false)
  }
  const persist = async (current: StudentDraft, allowScheduleOverlap: boolean) => {
    setBusy(true); setError(''); setScheduleConflicts(undefined)
    const schedulesChanged = scheduleKey(current.weeklySchedules) !== current.originalScheduleKey
    const data = {
      ...(current.id ? { id: current.id } : {}), name: current.name,
      hourlyRate: current.hourlyRate === '' ? null : Number(current.hourlyRate),
      pricingMode: current.pricingSelection === 'DEFAULT' ? null : current.pricingSelection as PricingMode,
      sessionRate: current.pricingSelection === 'PER_SESSION' && current.sessionRate !== '' ? Number(current.sessionRate) : null,
      status: current.status, note: current.note || null,
      ...(!current.id || schedulesChanged ? { weeklySchedules: current.weeklySchedules, scheduleEffectiveFrom: current.scheduleEffectiveFrom } : {}),
    }
    try {
      await teachingPost({ operation: 'saveStudent', data, ...(allowScheduleOverlap ? { allowScheduleOverlap: true } : {}) })
      setDraft(null); setBaseDraft(null); setPreview(null); notifyTeachingDataChanged('Đã lưu thông tin học viên.')
    } catch (reason) {
      if (reason instanceof TeachingRequestError && reason.scheduleConflicts?.length && !allowScheduleOverlap) setScheduleConflicts(reason.scheduleConflicts)
      else setError(reason instanceof Error ? reason.message : 'Không lưu được học viên.')
    } finally { setBusy(false) }
  }
  const toggle = async (student: Student) => {
    setBusy(true); setError('')
    try { await teachingPost({ operation: 'saveStudent', data: { id: student.id, name: student.name, hourlyRate: student.hourlyRate, status: student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE', note: student.note } }); setConfirmStatus(false); setDetailStudent(null); notifyTeachingDataChanged(student.status === 'ACTIVE' ? 'Đã ngừng học viên.' : 'Đã kích hoạt học viên.') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không cập nhật được trạng thái.') }
    finally { setBusy(false) }
  }
  const updateDraft = (patch: Partial<StudentDraft>) => { setPreview(null); setDraft(old => old ? ({ ...old, ...patch }) : old) }
  const currentOpeningBalance = draft && openingBalanceCalculation && openingBalanceCalculation.studentId === draft.id ? openingBalanceCalculation : null
  const openingBalancePeriod = currentOpeningBalance?.result.period || currentPeriod

  return <>
    <div className="demo-page-heading teaching-heading teaching-students-heading"><div><p className="teaching-eyebrow">Danh sách lớp</p><h1>Học viên</h1><p>Hồ sơ, học phí và lịch học cố định theo tuần.</p></div><button className={'demo-primary teaching-add-student-button' + (dataLoaded ? ' is-icon-only' : '')} aria-label={dataLoaded ? 'Thêm học viên' : loadRequested ? 'Tải lại học viên' : 'Tải học viên'} title={dataLoaded ? 'Thêm học viên' : loadRequested ? 'Tải lại học viên' : 'Tải học viên'} disabled={busy || loading} onClick={() => dataLoaded ? openNew() : loadRequested ? void refresh() : setLoadRequested(true)}>{dataLoaded ? <><Plus size={17}/><span className="teaching-add-student-label">Thêm học viên</span></> : loadRequested ? 'Tải lại học viên' : 'Tải học viên'}</button></div>
    <section className="demo-panel teaching-panel">
      {dataLoaded && (
        billingSummary ? (
          <p className="teaching-billing-period">
            <strong className="teaching-billing-period-long">Kỳ học phí: {billingDate(billingSummary.period.startDate)} – {billingDate(billingSummary.period.endDate)}</strong>
            <strong className="teaching-billing-period-short">Kỳ học phí: {billingDateShort(billingSummary.period.startDate)} - {billingDateShort(billingSummary.period.endDate)} (Chốt ngày {billingSummary.period.cutoffDay})</strong>
            <span className="teaching-billing-period-long">Chốt ngày {billingSummary.period.cutoffDay}. Học phí chưa thanh toán sẽ chuyển sang số dư đầu kỳ tháng sau.</span>
          </p>
        ) : (
          <div className="teaching-billing-period">
            <strong>Thống kê học phí chưa tải</strong>
            <span>Thống kê cần đọc các buổi đã hoàn thành từ kỳ có số dư và các buổi quá hạn. <button type="button" disabled={billingLoading} onClick={() => void loadBillingSummary()}>{billingLoading ? 'Đang tải…' : 'Tải thống kê học phí'}</button></span>
            {billingError && <span role="alert">{billingError}</span>}
          </div>
        )
      )}
      {error && <div role="alert" className="demo-alert teaching-retry"><span>{error}</span><button onClick={() => void refresh()}>Thử lại</button></div>}
      {loading ? <div className="teaching-loading-list" role="status" aria-label="Đang tải học viên"><div className="teaching-skeleton"/><div className="teaching-skeleton"/><div className="teaching-skeleton"/></div> : !dataLoaded ? <div className="teaching-empty-card"><UserRound size={24}/><strong>Danh sách chưa được tải</strong><p>Tải hồ sơ khi cần xem hoặc quản lý học viên. Thống kê học phí có thể tải riêng sau đó.</p><button className="demo-primary" onClick={() => loadRequested ? void refresh() : setLoadRequested(true)}>{loadRequested ? 'Tải lại danh sách' : 'Tải danh sách học viên'}</button></div> : !students.length ? <div className="teaching-empty-card"><UserRound size={24}/><strong>Chưa có học viên</strong><p>Thêm học viên để bắt đầu tạo lịch dạy.</p><button className="demo-primary" onClick={openNew}><Plus size={16}/> Thêm học viên</button></div> : <div className="teaching-students-table-wrap"><table className="teaching-students-table"><thead><tr><th>Học viên</th><th>Đã học trong kỳ</th><th>Học phí phát sinh<br/><small>(Số dư đầu kỳ)</small></th><th>Thu tiền</th><th>Buổi đã qua · có học?</th><th className="teaching-student-actions-heading">Thao tác</th></tr></thead><tbody>{students.map(student => {
        const billing = billingByStudent.get(student.id)
        const openingBalance = billingSummary ? billing?.openingBalanceAmount ?? 0 : null
        const billingModes = billing?.billingModes.length ? billing.billingModes : [resolveStudentPricing(student, settings as TeachingSettings).mode]
        const usage = [
          billingModes.includes('PER_SESSION') ? `${billing?.perSessionCompletedSessions || 0} buổi` : '',
          billingModes.includes('PER_HOUR') ? billingHours(billing?.perHourDurationMinutes || 0) : '',
        ].filter(Boolean).join(' · ')
        return <tr key={student.id}>
          <td><div className="teaching-student-table-person"><span className="teaching-student-avatar" style={{ ...studentAvatarStyle(student.id, students.map(item => item.id)), borderRadius: '50%' }} aria-hidden="true">{studentInitials(student.name)}</span><span><button className="teaching-student-table-name" onClick={() => { setConfirmStatus(false); void openStudentDetails(student) }}>{student.name}</button><span className={`teaching-status teaching-status-${student.status.toLowerCase()}`}>{student.status === 'ACTIVE' ? 'Đang học' : 'Đã ngừng'}</span><small>{student.weeklySchedules?.length || 0} buổi/tuần</small></span></div></td>
          <td><strong>{billingSummary ? usage : <span className="teaching-muted-cell">Chưa tải</span>}</strong></td>
          <td><strong className="teaching-student-fee">{billingSummary ? formatVnd(billing?.feeAmount || 0) : '—'}</strong><small className="teaching-student-opening-balance">{openingBalance == null ? '(Chưa tải)' : `(${formatBalance(openingBalance)})`}</small></td>
          <td><div className="teaching-student-collect-cell"><strong className="teaching-student-fee">{billingSummary ? formatVnd(collectableAmount(billing?.remainingAmount || 0)) : '—'}</strong><button type="button" className="teaching-student-pay-icon" aria-label={`Thu tiền từ ${student.name}`} title="Thu tiền" onClick={() => void openPayment(student)}><HandCoins size={22}/></button></div></td>
          <td>{!billingSummary ? <span className="teaching-muted-cell">Chưa tải</span> : billing?.overdueUnconfirmedSessions ? <button type="button" className="teaching-overdue-cell teaching-overdue-trigger" aria-label={`Mở ${billing.overdueUnconfirmedSessions} buổi học chưa xác nhận của ${student.name}`} onClick={() => openPending(student)}><strong>{billing.overdueUnconfirmedSessions} buổi chưa xác nhận</strong><small>{billing.overdueUnconfirmedItems.slice(0, 3).map(item => <span key={item.sessionId}>{shortDateTime(item.startAt)}</span>)}{billing.overdueUnconfirmedSessions > 3 ? <span>+{billing.overdueUnconfirmedSessions - 3} buổi khác</span> : null}</small></button> : <span className="teaching-no-overdue">Không có</span>}</td>
          <td className="teaching-student-actions-cell"><button type="button" className="teaching-student-edit-icon" aria-label={`Sửa ${student.name}`} title="Sửa học viên" onClick={() => openEdit(student)}><Pencil size={22}/></button></td>
        </tr>
      })}</tbody></table></div>}
    </section>

    <dialog ref={dialog} className="ai-task-dialog teaching-dialog teaching-student-dialog" onCancel={event => { event.preventDefault(); if (reviewingPendingSession) window.dispatchEvent(new Event('teaching:request-form-close')); else closeRequest() }} onClose={() => { paymentBillingRequest.current += 1; detailBillingRequest.current += 1; openingBalanceRequest.current += 1; setDraft(null); setDetailStudent(null); setDetailBilling(null); setDetailBillingLoading(false); setDetailBillingError(''); setPendingStudent(null); setPaymentStudent(null); setPaymentAmount(''); setPaymentId(''); setPaymentBilling(null); setPaymentBillingLoading(false); setOpeningBalanceCalculation(null); setOpeningBalanceLoading(false); setPendingSession(null); setPendingSessionId(''); setPendingActionId(''); setPendingActionKind(null); setReviewingPendingSession(false); setPreview(null) }}>
      {detailStudent && !draft && <section className="teaching-student-detail"><button className="teaching-dialog-close" aria-label="Đóng" onClick={closeRequest}><X size={18}/></button><p className="teaching-eyebrow">Hồ sơ học viên</p><h2>{detailStudent.name}</h2><span className={`teaching-status teaching-status-${detailStudent.status.toLowerCase()}`}>{detailStudent.status === 'ACTIVE' ? 'Đang học' : 'Đã ngừng hoạt động'}</span><div className="teaching-detail-grid"><div><small>Học phí</small><strong>{formatVnd(resolveStudentPricing(detailStudent, settings as TeachingSettings).unitRate)}/{resolveStudentPricing(detailStudent, settings as TeachingSettings).mode === 'PER_SESSION' ? 'buổi' : 'giờ'}</strong><span>{detailStudent.pricingMode ? 'Đơn giá riêng' : 'Theo mặc định'}</span></div><div><small>Lịch tuần</small><strong>{detailStudent.weeklySchedules?.length || 0} khung giờ</strong><span>{detailStudent.weeklySchedules?.reduce((sum, item) => sum + item.durationMinutes, 0) || 0} phút/tuần</span></div></div>
        {detailBillingLoading ? <div className="teaching-billing-calculation" role="status"><span className="teaching-skeleton"/><strong>Đang tính số dư đầu kỳ…</strong><small>Đang đối chiếu các buổi đã hoàn thành và khoản thu ở những kỳ trước.</small></div> : detailBillingError ? <div className="teaching-billing-calculation-error"><p role="alert" className="demo-alert">{detailBillingError}</p><button type="button" className="demo-primary" onClick={() => void openStudentDetails(detailStudent)}>Tính lại công nợ</button></div> : detailBilling?.studentId === detailStudent.id ? <><p className="teaching-eyebrow">Kỳ học phí: {billingDate(detailBilling.period.startDate)} – {billingDate(detailBilling.period.endDate)}</p><div className="teaching-payment-summary"><span><small>Số dư đầu kỳ</small><strong>{formatBalance(detailBilling.row.openingBalanceAmount)}</strong></span><span><small>Học phí phát sinh</small><strong>{formatVnd(detailBilling.row.feeAmount)}</strong></span><span><small>Đã thanh toán</small><strong>{formatVnd(detailBilling.row.paidAmount)}</strong></span><span><small>Còn phải thu</small><strong>{formatVnd(collectableAmount(detailBilling.row.remainingAmount))}</strong></span></div><p className="teaching-opening-balance-current">Tự tính từ {billingDate(detailBilling.row.openingBalanceCalculation.anchorPeriodStartDate)}: {detailBilling.row.openingBalanceCalculation.historicalCompletedSessions} buổi hoàn thành, học phí {formatVnd(detailBilling.row.openingBalanceCalculation.historicalFeeAmount)} − đã thu {formatVnd(detailBilling.row.openingBalanceCalculation.historicalPaidAmount)}.</p></> : null}
        <h3>Lịch cố định</h3>{detailStudent.weeklySchedules?.length ? <ul className="teaching-detail-goals">{scheduleEntriesInWeekOrder(detailStudent.weeklySchedules).map(({ schedule: item }) => <li key={item.seriesId}>{weekdayLabels[item.dayOfWeek]} · {item.startTime} · {item.durationMinutes} phút</li>)}</ul> : <p>Chưa có lịch cố định theo tuần.</p>}{detailStudent.note && <><h3>Ghi chú</h3><p className="teaching-detail-note">{detailStudent.note}</p></>}{confirmStatus ? <div className="teaching-inline-confirm"><p>{detailStudent.status === 'ACTIVE' ? 'Ngừng hoạt động học viên này? Lịch và dữ liệu cũ vẫn được giữ.' : 'Kích hoạt lại học viên này?'}</p><button onClick={() => setConfirmStatus(false)}>Quay lại</button><button className={detailStudent.status === 'ACTIVE' ? 'teaching-danger-button' : 'demo-primary'} disabled={busy} onClick={() => void toggle(detailStudent)}>{detailStudent.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt'}</button></div> : null}{error && <p role="alert" className="demo-alert">{error}</p>}<div className="demo-form-actions"><button onClick={closeRequest}>Đóng</button><Link className="teaching-button" href={`/demo/ai-task/tasks?studentId=${encodeURIComponent(detailStudent.id)}`}>Xem buổi học</Link><button className="demo-primary" onClick={() => void openPayment(detailStudent)}>Thu tiền</button><button className="demo-primary" onClick={() => openEdit(detailStudent)}>Sửa hồ sơ</button><button onClick={() => setConfirmStatus(true)}>{detailStudent.status === 'ACTIVE' ? 'Ngừng học' : 'Kích hoạt lại'}</button></div></section>}
      {pendingStudent && !draft && !detailStudent && (() => {
        const billing = billingByStudent.get(pendingStudent.id)
        const pendingItems = billing?.overdueUnconfirmedItems || []
        return <section className="teaching-pending-dialog">
          {!reviewingPendingSession && <button className="teaching-dialog-close" aria-label="Đóng" onClick={closeRequest}><X size={18}/></button>}
          {reviewingPendingSession && pendingSession ? <SessionReviewForm key={pendingSession.id} session={pendingSession} students={students} settings={settings as TeachingSettings} onSave={savePendingReview} onCancel={() => { setReviewingPendingSession(false); setPendingSession(null); setPendingSessionId('') }}/> : <>
            <p className="teaching-eyebrow">Xác nhận lịch học</p>
            <h2>Buổi học chờ xác nhận · {pendingStudent.name}</h2>
            <p className="teaching-pending-question">Đã học tính theo thời lượng dự kiến · Đánh giá nhập thời lượng thực tế · Không học không tính phí.</p>
            {pendingLoading && <p role="status" className="teaching-inline-loading">Đang tải buổi học…</p>}
            {pendingError && <><p role="alert" className="demo-alert">{pendingError}</p>{pendingSessionId && <button type="button" onClick={() => void openPendingSession(pendingSessionId, true)}>Thử tải lại buổi học</button>}</>}
            {pendingItems.length ? <div className="teaching-pending-session-list">{pendingItems.map(item => <article key={item.sessionId} className="teaching-pending-session-row"><span><strong>{shortDateTime(item.startAt)}</strong><small>{item.title} · {item.scheduledDurationMinutes} phút</small></span><div><button type="button" className="teaching-confirm-attended" title="Tính học phí theo thời lượng dự kiến, không nhập đánh giá" disabled={pendingBusy || pendingLoading} onClick={() => void confirmAttendance(item.sessionId)}>{pendingActionId === item.sessionId && pendingActionKind === 'attended' ? 'Đang lưu…' : 'Đã học'}</button><button type="button" className="demo-primary" disabled={pendingBusy || pendingLoading} onClick={() => void openPendingSession(item.sessionId, true)}>{pendingActionId === item.sessionId && pendingActionKind === 'review' ? 'Đang mở…' : 'Đánh giá'}</button><button type="button" className="teaching-confirm-absent" disabled={pendingBusy || pendingLoading} onClick={() => void confirmNoAttendance(item.sessionId)}>{pendingActionId === item.sessionId && pendingActionKind === 'absent' ? 'Đang lưu…' : 'Không học'}</button></div></article>)}</div> : !pendingLoading && !pendingError ? <p className="teaching-pending-complete">Đã xử lý hết các buổi chờ xác nhận.</p> : null}
          </>}
        </section>
      })()}
      {paymentStudent && !draft && !detailStudent && !pendingStudent && (() => {
        const billing = paymentBilling?.studentId === paymentStudent.id ? paymentBilling : null
        const row = billing?.row
        const remaining = collectableAmount(row?.remainingAmount || 0)
        const currentPaymentStudent = students.find(student => student.id === paymentStudent.id) || paymentStudent
        const paymentHistory = [...(currentPaymentStudent.billingPayments || [])].sort((a, b) => Date.parse(b.paidAt) - Date.parse(a.paidAt))
        return <form className="teaching-form teaching-payment-form" onSubmit={savePayment}>
          <button className="teaching-dialog-close" type="button" aria-label="Đóng" onClick={closeRequest}><X size={18}/></button>
          <p className="teaching-eyebrow">Học phí{billing ? ` · ${billingDate(billing.period.startDate)} – ${billingDate(billing.period.endDate)}` : ''}</p>
          <h2>Thu tiền · {paymentStudent.name}</h2>
          <div className="teaching-payment-tabs" role="tablist" aria-label="Thu tiền học viên"><button type="button" role="tab" aria-selected={paymentTab === 'payment'} onClick={() => setPaymentTab('payment')}>Thu tiền</button><button type="button" role="tab" aria-selected={paymentTab === 'history'} onClick={() => setPaymentTab('history')}>Lịch sử thu tiền</button></div>
          {paymentTab === 'payment' ? <>
            {paymentBillingLoading ? <div className="teaching-billing-calculation" role="status"><span className="teaching-skeleton"/><strong>Đang tính số dư đầu kỳ…</strong><small>Đang đối chiếu buổi hoàn thành và các khoản thu ở kỳ trước.</small></div> : paymentBillingError ? <div className="teaching-billing-calculation-error"><p role="alert" className="demo-alert">{paymentBillingError}</p><button type="button" className="demo-primary" onClick={() => void openPayment(paymentStudent)}>Tính lại công nợ</button></div> : row ? <>
              <div className="teaching-payment-summary"><span><small>Số dư đầu kỳ</small><strong>{formatBalance(row.openingBalanceAmount)}</strong></span><span><small>Học phí phát sinh</small><strong>{formatVnd(row.feeAmount)}</strong></span><span><small>Đã thanh toán</small><strong>{formatVnd(row.paidAmount)}</strong></span><span><small>Còn phải thu</small><strong>{formatBalance(remaining)}</strong></span></div>
              <p className="teaching-opening-balance-current">Tự tính từ {billingDate(row.openingBalanceCalculation.anchorPeriodStartDate)}: {row.openingBalanceCalculation.historicalCompletedSessions} buổi hoàn thành, học phí {formatVnd(row.openingBalanceCalculation.historicalFeeAmount)} − đã thu {formatVnd(row.openingBalanceCalculation.historicalPaidAmount)}{row.openingBalanceCalculation.anchorAmount ? ` + số dư đã ghi nhận ${formatVnd(row.openingBalanceCalculation.anchorAmount)}` : ''}.</p>
            </> : null}
            {row && (remaining > 0 ? <label>Số tiền thanh toán (VND)<input autoFocus type="number" required min={1} max={remaining} step={1} value={paymentAmount} onChange={event => setPaymentAmount(event.target.value)} placeholder="Nhập số tiền đã nhận"/><small>Không nhập quá số còn phải thu. Nếu trả một phần, phần còn lại sẽ được chuyển sang kỳ sau.</small></label> : <p className="teaching-payment-clear">Kỳ này không còn khoản cần thu.</p>)}
            {paymentError && <p role="alert" className="demo-alert">{paymentError}</p>}
            <div className="demo-form-actions"><button type="button" disabled={paymentBusy} onClick={closeRequest}>Đóng</button><button className="demo-primary" disabled={paymentBusy || paymentBillingLoading || !row || !remaining}>{paymentBusy ? 'Đang lưu…' : 'Ghi nhận thanh toán'}</button></div>
          </> : <>
            {paymentHistory.length ? <ol className="teaching-payment-history">{paymentHistory.map(payment => <li key={payment.id}><span><strong>{formatVnd(payment.amount)}</strong><small>{paymentDateTime(payment.paidAt)}</small><small>Kỳ từ {billingDate(payment.periodStartDate)}</small></span></li>)}</ol> : <p className="teaching-payment-history-empty">Chưa có khoản thu nào được ghi nhận.</p>}
            <div className="demo-form-actions"><button type="button" onClick={closeRequest}>Đóng</button><button type="button" className="demo-primary" disabled={!remaining} onClick={() => setPaymentTab('payment')}>Thu tiền kỳ này</button></div>
          </>}
        </form>
      })()}
      {draft && <form className="teaching-form teaching-student-form" onSubmit={save}>
        <button className="teaching-dialog-close" type="button" aria-label="Đóng" onClick={closeRequest}><X size={18}/></button><p className="teaching-eyebrow">{draft.id ? 'Hồ sơ' : 'Hồ sơ mới'}</p><h2>{draft.id ? 'Sửa học viên' : 'Thêm học viên'}</h2>
        <div className="teaching-student-tabs" role="tablist" aria-label="Thông tin học viên"><button type="button" role="tab" aria-selected={activeTab === 'profile'} onClick={() => void selectStudentTab('profile')}>Thông tin & học phí</button><button type="button" role="tab" aria-selected={activeTab === 'schedule'} onClick={() => void selectStudentTab('schedule')}>Lịch cố định</button><button type="button" role="tab" aria-selected={activeTab === 'balance'} onClick={() => void selectStudentTab('balance')}>Số dư đầu kỳ</button></div>
        {activeTab === 'profile' ? <div className="teaching-form-tab"><label>Tên học viên *<input autoFocus required maxLength={160} value={draft.name} onChange={event => updateDraft({ name: event.target.value })}/></label>
          <fieldset className="teaching-pricing-options"><legend>Cấu hình học phí</legend><label className="teaching-radio-option"><input type="radio" name="student-pricing" checked={draft.pricingSelection === 'DEFAULT'} onChange={() => updateDraft({ pricingSelection: 'DEFAULT' })}/><span>Dùng giá mặc định<small>{settings.defaultPricingMode === 'PER_SESSION' ? `${formatVnd(settings.defaultSessionRate)}/buổi` : `${formatVnd(settings.defaultHourlyRate)}/giờ`}</small></span></label><label className="teaching-radio-option"><input type="radio" name="student-pricing" checked={draft.pricingSelection === 'PER_SESSION'} onChange={() => updateDraft({ pricingSelection: 'PER_SESSION', sessionRate: draft.sessionRate || String(settings.defaultSessionRate) })}/><span>Đơn giá riêng theo buổi</span></label>{draft.pricingSelection === 'PER_SESSION' && <label>Đơn giá (VND/buổi)<input type="number" min={0} max={100_000_000} step={1} required value={draft.sessionRate} onChange={event => updateDraft({ sessionRate: event.target.value })}/></label>}<label className="teaching-radio-option"><input type="radio" name="student-pricing" checked={draft.pricingSelection === 'PER_HOUR'} onChange={() => updateDraft({ pricingSelection: 'PER_HOUR', hourlyRate: draft.hourlyRate || String(settings.defaultHourlyRate) })}/><span>Đơn giá riêng theo giờ</span></label>{draft.pricingSelection === 'PER_HOUR' && <label>Đơn giá (VND/giờ)<input type="number" min={0} max={100_000_000} step={1} required value={draft.hourlyRate} onChange={event => updateDraft({ hourlyRate: event.target.value })}/></label>}</fieldset>
          <label>Ghi chú<textarea maxLength={2000} value={draft.note} onChange={event => updateDraft({ note: event.target.value })} placeholder="Thông tin cần lưu ý…"/></label>{draft.id && <label>Trạng thái<select value={draft.status} onChange={event => updateDraft({ status: event.target.value as StudentDraft['status'] })}><option value="ACTIVE">Đang học</option><option value="INACTIVE">Đã ngừng hoạt động</option></select></label>}<button type="button" className="teaching-tab-next" onClick={() => setActiveTab('schedule')}>Tiếp tục: lịch cố định <ArrowRight size={16}/></button>
        </div> : activeTab === 'schedule' ? <div className="teaching-form-tab"><fieldset className="teaching-weekly-schedules"><legend>Lịch học cố định theo tuần</legend><p className="teaching-schedule-explainer">Các buổi tương lai được tạo tự động trong 30 ngày tới. Buổi đã học, đã nghỉ hoặc được sửa riêng sẽ được giữ nguyên.</p>
          <label>Áp dụng thay đổi từ ngày<input type="date" required min={vietnamTodayKey()} value={draft.scheduleEffectiveFrom} onChange={event => changeScheduleEffectiveFrom(event.target.value)}/><small>Chỉ chọn hôm nay hoặc ngày trong tương lai.</small></label>{previewLoading && <p role="status" className="teaching-inline-loading">Đang tải lịch và bản xem trước…</p>}
          {pendingEffectiveDate && <div className="teaching-inline-confirm" role="alertdialog" aria-label="Xác nhận tải lịch theo ngày hiệu lực"><p>Đổi ngày hiệu lực sẽ tải mẫu lịch đang áp dụng vào {pendingEffectiveDate}. Các chỉnh sửa lịch chưa lưu hiện tại sẽ bị thay thế.</p><button type="button" onClick={() => setPendingEffectiveDate(null)}>Giữ lịch đang sửa</button><button type="button" className="demo-primary" onClick={() => void applyScheduleEffectiveDate(pendingEffectiveDate)}>Tải lịch ngày này</button></div>}
          {draft.weeklySchedules.map((schedule, index) => <div className="teaching-weekly-row" key={schedule.seriesId || index}><select aria-label={`Ngày học ${index + 1}`} value={schedule.dayOfWeek} onChange={event => updateWeeklySchedule(index, { dayOfWeek: Number(event.target.value) })}>{weekdayLabels.map((label, day) => <option key={day} value={day}>{label}</option>)}</select><label className="teaching-weekly-time">Bắt đầu<input aria-label={`Giờ bắt đầu ${index + 1}`} type="time" required value={schedule.startTime} onChange={event => updateWeeklySchedule(index, { startTime: event.target.value })}/></label><label className="teaching-weekly-duration">Phút<input aria-label={`Thời lượng ${index + 1}`} type="number" required min={1} max={1440} step={1} value={schedule.durationMinutes} onChange={event => updateWeeklySchedule(index, { durationMinutes: Number(event.target.value) })}/></label><button aria-label={`Xóa lịch ${index + 1}`} type="button" onClick={() => { setPreview(null); setDraft(old => old ? ({ ...old, weeklySchedules: old.weeklySchedules.filter((_, i) => i !== index) }) : old) }}>Xóa</button></div>)}
          <button type="button" className="teaching-add-goal" disabled={draft.weeklySchedules.length >= 50} onClick={() => { setPreview(null); setDraft(old => old ? ({ ...old, weeklySchedules: [...old.weeklySchedules, { dayOfWeek: 1, startTime: '18:00', durationMinutes: 90 }] }) : old) }}><Plus size={15}/> Thêm khung giờ mỗi tuần</button>
        </fieldset>
        {preview && <section className="teaching-schedule-preview" aria-label="Xem trước thay đổi lịch"><p className="teaching-eyebrow">Xem trước 30 ngày</p><h3>{preview.start} – {preview.end}</h3><div className="teaching-preview-stats"><span><small>Lịch hiện tại</small><strong>{preview.projectedOld} buổi</strong></span><span><small>Lịch sau thay đổi</small><strong>{preview.projectedNew} buổi</strong></span><span><small>Thay đổi dự kiến</small><strong>−{preview.removed} / +{preview.added}</strong></span></div><p>{preview.existingSessions} buổi định kỳ đã tạo trong khoảng này. {preview.overrides} buổi đã sửa riêng sẽ được giữ nguyên.</p><div className="teaching-inline-confirm"><strong>Xác nhận ngày hiệu lực {preview.start}</strong><small>Buổi đã hoàn thành, đã hủy và ngoại lệ riêng không bị thay đổi.</small><button type="button" onClick={() => setPreview(null)}>Tiếp tục chỉnh sửa</button><button type="button" className="demo-primary" disabled={busy} onClick={() => void persist(draft, false)}>Xác nhận thay đổi lịch</button></div></section>}
        {scheduleConflicts?.length ? <div className="teaching-conflict-panel" role="alert"><strong>Các khung giờ bị trùng</strong><ul>{scheduleConflicts.map((conflict, index) => <li key={index}>{weekdayLabels[conflict.first.dayOfWeek]}: {conflict.first.startTime} ({conflict.first.durationMinutes} phút) chồng với {conflict.second.startTime} ({conflict.second.durationMinutes} phút)</li>)}</ul><div><button type="button" onClick={() => setScheduleConflicts(undefined)}>Chỉnh lại lịch</button><button type="button" className="demo-primary" disabled={busy} onClick={() => void persist(draft, true)}>Vẫn lưu lịch bị trùng</button></div></div> : null}<button type="button" className="teaching-tab-next" onClick={() => void selectStudentTab('profile')}>Quay lại thông tin <ArrowRight size={16}/></button></div> : <div className="teaching-form-tab teaching-opening-balance-tab">
          <div className="teaching-opening-balance-callout"><strong className="teaching-opening-balance-long">Kỳ học phí: {billingDate(openingBalancePeriod.startDate)} – {billingDate(openingBalancePeriod.endDate)}</strong><strong className="teaching-opening-balance-short">Kỳ học phí: {billingDateShort(openingBalancePeriod.startDate)} - {billingDateShort(openingBalancePeriod.endDate)} (Chốt ngày {openingBalancePeriod.cutoffDay})</strong><span className="teaching-opening-balance-long">Số dư tự tính từ học phí các buổi hoàn thành và tiền đã thu ở những kỳ trước.</span></div>
          {!draft.id ? <p className="teaching-opening-balance-current">Học viên mới chưa có lịch sử học phí. Số dư đầu kỳ sẽ tự cập nhật khi có buổi học hoàn thành.</p> : openingBalanceLoading ? <div className="teaching-billing-calculation" role="status"><span className="teaching-skeleton"/><strong>Đang tính số dư đầu kỳ…</strong><small>Đang tải lịch sử buổi học và các khoản thu.</small></div> : openingBalanceError ? <div className="teaching-billing-calculation-error"><p role="alert" className="demo-alert">{openingBalanceError}</p><button type="button" className="demo-primary" onClick={() => void selectStudentTab('balance')}>Tính lại số dư</button></div> : currentOpeningBalance ? (() => {
            const calculated = currentOpeningBalance.result.row.openingBalanceCalculation
            return <><div className="teaching-payment-summary"><span><small>Số dư đầu kỳ</small><strong>{formatBalance(calculated.amount)}</strong></span><span><small>Buổi hoàn thành kỳ trước</small><strong>{calculated.historicalCompletedSessions}</strong></span><span><small>Học phí kỳ trước</small><strong>{formatVnd(calculated.historicalFeeAmount)}</strong></span><span><small>Đã thu kỳ trước</small><strong>{formatVnd(calculated.historicalPaidAmount)}</strong></span></div><p className="teaching-opening-balance-current">Tính từ kỳ bắt đầu {billingDate(calculated.anchorPeriodStartDate)}{calculated.anchorAmount ? `, gồm số dư đã ghi nhận ${formatVnd(calculated.anchorAmount)}` : ''}. Không cần nhập số dư thủ công.</p></>
          })() : <button type="button" className="demo-primary" onClick={() => void selectStudentTab('balance')}>Tính số dư đầu kỳ</button>}
        </div>}
        {error && <p role="alert" className="demo-alert">{error}</p>}{confirmDiscard && <div className="teaching-inline-confirm" role="alertdialog" aria-label="Xác nhận bỏ thay đổi"><p>Bạn có thay đổi chưa lưu. Bỏ các thay đổi này?</p><button type="button" onClick={() => setConfirmDiscard(false)}>Tiếp tục chỉnh sửa</button><button type="button" className="teaching-danger-button" onClick={() => { setDraft(null); setBaseDraft(null); setConfirmDiscard(false) }}>Bỏ thay đổi</button></div>}
        <div className="demo-form-actions"><button type="button" disabled={busy} onClick={closeRequest}>Hủy</button><button className="demo-primary" disabled={busy || previewLoading || !!preview}>{busy ? 'Đang lưu…' : preview ? 'Xác nhận ở phần xem trước' : 'Lưu học viên'}</button></div>
      </form>}
    </dialog>
  </>
}

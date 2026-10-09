'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { calculateSessionFee, formatVnd, fromVietnamDateTimeLocal, pricingUnitLabel, resolveStudentPricing, toVietnamDateTimeLocal, type PricingMode, type Student, type TeachingSettings, type TeachingSessionView } from '../_lib/teaching-model'
import { TeachingRequestError } from './teaching-client'

type SessionDraft = { id?: string; studentId: string; title: string; subject: string; startAt: string; scheduledDurationMinutes: number; pricingOverride: boolean; unitRateSnapshot: string; goals: { id?: string; title: string }[] }
type SessionSaveInput = { id?: string; studentId: string; title: string; subject: string | null; startAt: string; scheduledDurationMinutes: number; pricingOverride?: boolean; unitRateSnapshot?: number; goals: { id?: string; title: string }[] }
const defaultLocalStart = () => toVietnamDateTimeLocal(new Date(Date.now() + 60 * 60_000).toISOString()).slice(0, 16)
const modeName = (mode: PricingMode) => mode === 'PER_SESSION' ? 'Theo buổi' : 'Theo giờ'

export function TeachingSessionForm({ students, settings, initial, initialStartAt, onSave, onCancel }: {
  students: Student[]
  settings: TeachingSettings
  initial?: TeachingSessionView | null
  initialStartAt?: string
  onSave(data: SessionSaveInput, allowOverlap?: boolean): Promise<void>
  onCancel(): void
}) {
  const activeStudents = students.filter(student => student.status === 'ACTIVE' || student.id === initial?.studentId)
  const initialStudent = activeStudents.find(student => student.id === initial?.studentId) || activeStudents[0]
  const initialPricing = initialStudent ? resolveStudentPricing(initialStudent, settings) : { mode: settings.defaultPricingMode, unitRate: settings.defaultSessionRate }
  const [draft, setDraft] = useState<SessionDraft>(() => initial ? {
    id: initial.id,
    studentId: initial.studentId,
    title: initial.title,
    subject: initial.subject || '',
    startAt: toVietnamDateTimeLocal(initial.startAt),
    scheduledDurationMinutes: initial.scheduledDurationMinutes,
    pricingOverride: initial.pricingOverride,
    unitRateSnapshot: String(initial.unitRateSnapshot ?? initial.hourlyRateSnapshot ?? initialPricing.unitRate),
    goals: initial.goals.map(goal => ({ id: goal.id, title: goal.title })),
  } : {
    studentId: initialStudent?.id || '',
    title: '', subject: '', startAt: initialStartAt ? toVietnamDateTimeLocal(initialStartAt) : defaultLocalStart(), scheduledDurationMinutes: 90,
    pricingOverride: false, unitRateSnapshot: String(initialPricing.unitRate), goals: [],
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pendingConflicts, setPendingConflicts] = useState<TeachingRequestError['conflicts']>(undefined)
  const [confirmResetPricing, setConfirmResetPricing] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const originalDraft = useRef(JSON.stringify(draft))
  const selectedStudent = activeStudents.find(student => student.id === draft.studentId)
  const resolvedPricing = selectedStudent ? resolveStudentPricing(selectedStudent, settings) : initialPricing
  const keepsInitialSnapshot = !!initial && draft.studentId === initial.studentId && !draft.pricingOverride
  const displayedMode = keepsInitialSnapshot ? initial.pricingModeSnapshot : resolvedPricing.mode
  const displayedRate = draft.pricingOverride ? Number(draft.unitRateSnapshot) || 0 : keepsInitialSnapshot ? (initial.unitRateSnapshot ?? initial.hourlyRateSnapshot ?? resolvedPricing.unitRate) : resolvedPricing.unitRate
  const updateGoal = (index: number, title: string) => setDraft(old => ({ ...old, goals: old.goals.map((goal, i) => i === index ? { ...goal, title } : goal) }))
  const setPricingOverride = (enabled: boolean) => {
    if (!enabled && draft.pricingOverride) { setConfirmResetPricing(true); return }
    setDraft(old => ({ ...old, pricingOverride: enabled, unitRateSnapshot: String(resolvedPricing.unitRate) }))
    setConfirmResetPricing(false)
  }
  const requestCancel = useCallback(() => {
    if (busy) return
    if (JSON.stringify(draft) !== originalDraft.current) setConfirmCancel(true)
    else onCancel()
  }, [busy, draft, onCancel])
  useEffect(() => {
    const handler = () => requestCancel()
    window.addEventListener('teaching:request-form-close', handler)
    return () => window.removeEventListener('teaching:request-form-close', handler)
  }, [requestCancel])
  const payload = (): SessionSaveInput => ({
    id: draft.id,
    studentId: draft.studentId,
    title: draft.title,
    subject: draft.subject.trim() || null,
    startAt: fromVietnamDateTimeLocal(draft.startAt),
    scheduledDurationMinutes: draft.scheduledDurationMinutes,
    ...(draft.id ? { pricingOverride: draft.pricingOverride, ...(draft.pricingOverride ? { unitRateSnapshot: Number(draft.unitRateSnapshot) } : {}) } : {}),
    goals: draft.goals.map(goal => ({ ...goal, title: goal.title.trim() })).filter(goal => goal.title),
  })
  const persist = async (allowOverlap = false) => {
    setBusy(true); setError(''); setPendingConflicts(undefined)
    try {
      await onSave(payload(), allowOverlap)
    } catch (reason) {
      if (reason instanceof TeachingRequestError && reason.conflicts?.length && !allowOverlap) setPendingConflicts(reason.conflicts)
      else setError(reason instanceof Error ? reason.message : 'Không lưu được buổi học.')
    }
    finally { setBusy(false) }
  }
  const submit = (event: React.FormEvent) => { event.preventDefault(); void persist() }
  return <form className="teaching-form" onSubmit={submit}>
    <h2>{initial ? 'Sửa buổi học' : 'Tạo buổi học'}</h2>
    {initial?.source === 'RECURRING' && <p>{initial.isOverride ? 'Buổi học định kỳ đã được sửa lịch riêng; mức học phí được quản lý độc lập.' : 'Chỉnh sửa buổi này sẽ tạo ngoại lệ lịch riêng, không đổi lịch hàng tuần.'}</p>}
    <label>Học viên *<select required value={draft.studentId} onChange={event => {
      const student = activeStudents.find(item => item.id === event.target.value)
      const pricing = student ? resolveStudentPricing(student, settings) : initialPricing
      setDraft(old => ({ ...old, studentId: event.target.value, pricingOverride: false, unitRateSnapshot: String(pricing.unitRate) }))
    }}><option value="" disabled>Chọn học viên</option>{activeStudents.map(student => <option key={student.id} value={student.id}>{student.name}{student.status === 'INACTIVE' ? ' (đã ngừng)' : ''}</option>)}</select></label>
    {!activeStudents.length && <p className="demo-alert">Hãy thêm hoặc kích hoạt học viên trước khi tạo buổi học.</p>}
    <label>Tên buổi học *<input autoFocus required maxLength={200} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="Ví dụ: Toán lớp 2" /></label>
    <label>Môn học<input maxLength={120} value={draft.subject} onChange={event => setDraft({ ...draft, subject: event.target.value })} placeholder="Ví dụ: Toán" /></label>
    <div className="teaching-form-grid"><label>Ngày và giờ bắt đầu * (giờ Việt Nam)<input type="datetime-local" required value={draft.startAt} onChange={event => setDraft({ ...draft, startAt: event.target.value })} /></label><label>Thời lượng dự kiến (phút) *<input type="number" required min={1} max={1440} step={1} value={draft.scheduledDurationMinutes} onChange={event => setDraft({ ...draft, scheduledDurationMinutes: Number(event.target.value) })} /></label></div>
    <fieldset className="teaching-pricing-summary"><legend>Học phí</legend>
      <p>Hình thức: <strong>{modeName(displayedMode)}</strong></p>
      <p>Đơn giá: <strong>{formatVnd(displayedRate)}/{pricingUnitLabel(displayedMode).replace('đ/', '')}</strong></p>
      {initial && <label className="teaching-checkbox-option"><input type="checkbox" checked={draft.pricingOverride} onChange={event => setPricingOverride(event.target.checked)} /><span>Chỉnh học phí riêng cho buổi này</span></label>}
      {initial && draft.pricingOverride && <label>Đơn giá riêng (VND/{pricingUnitLabel(displayedMode).replace('đ/', '')})<input type="number" min={0} max={100_000_000} step={1} required value={draft.unitRateSnapshot} onChange={event => setDraft({ ...draft, unitRateSnapshot: event.target.value })} /></label>}
      {confirmResetPricing && <div className="teaching-inline-confirm" role="group" aria-label="Xác nhận bỏ giá riêng"><p>Bỏ đơn giá riêng và dùng giá hiện tại của học viên?</p><button type="button" onClick={() => setConfirmResetPricing(false)}>Giữ giá riêng</button><button className="demo-primary" type="button" onClick={() => { setDraft(old => ({ ...old, pricingOverride: false, unitRateSnapshot: String(resolvedPricing.unitRate) })); setConfirmResetPricing(false) }}>Dùng giá học viên</button></div>}
      {!initial && <small>Đơn giá sẽ được lưu cùng buổi học. Buổi học theo giờ dùng thời lượng thực tế khi hoàn thành.</small>}
    </fieldset>
    {pendingConflicts?.length ? <div className="teaching-conflict-panel" role="alert"><strong>Buổi học bị trùng thời gian</strong><p>Kiểm tra các lịch bên dưới trước khi xác nhận lưu chồng lịch.</p><ul>{pendingConflicts.map(conflict => <li key={conflict.id}>{conflict.title} · {new Date(conflict.startAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })}</li>)}</ul><div><button type="button" disabled={busy} onClick={() => setPendingConflicts(undefined)}>Quay lại chỉnh sửa</button><button type="button" className="demo-primary" disabled={busy} onClick={() => void persist(true)}>Lưu dù trùng lịch</button></div></div> : null}
    <fieldset className="teaching-goals"><legend>Mục tiêu buổi học <small>Không bắt buộc, có thể thêm hoặc bỏ trống.</small></legend>
      {draft.goals.map((goal, index) => <div className="teaching-goal-input" key={goal.id || index}><span>{index + 1}.</span><input aria-label={`Mục tiêu ${index + 1}`} maxLength={200} value={goal.title} onChange={event => updateGoal(index, event.target.value)} /><button aria-label={`Xóa mục tiêu ${index + 1}`} type="button" onClick={() => setDraft(old => ({ ...old, goals: old.goals.filter((_, i) => i !== index) }))}><Trash2 size={16} /></button></div>)}
      <button type="button" className="teaching-add-goal" disabled={draft.goals.length >= 50} onClick={() => setDraft(old => ({ ...old, goals: [...old.goals, { title: '' }] }))}><Plus size={15} /> Thêm mục tiêu</button>
    </fieldset>
    {error && <p role="alert" className="demo-alert">{error}</p>}
    {confirmCancel && <div className="teaching-inline-confirm" role="alertdialog" aria-label="Xác nhận bỏ thay đổi"><p>Bạn có thay đổi chưa lưu. Bỏ nội dung buổi học này?</p><button type="button" onClick={() => setConfirmCancel(false)}>Tiếp tục chỉnh sửa</button><button type="button" className="teaching-danger-button" onClick={onCancel}>Bỏ thay đổi</button></div>}
    <div className="demo-form-actions"><button type="button" disabled={busy} onClick={requestCancel}>Hủy</button><button className="demo-primary" disabled={busy || !draft.studentId}>{busy ? 'Đang lưu…' : initial ? 'Lưu thay đổi' : 'Tạo buổi học'}</button></div>
  </form>
}

export function SessionReviewForm({ session, students, settings, onSave, onCancel }: {
  session: TeachingSessionView
  students: Student[]
  settings: TeachingSettings
  onSave(data: { sessionId: string; actualDurationMinutes: number; pricingOverride: boolean; unitRateSnapshot?: number; progressPercent: number; evaluationNote: string; goals: { id: string; isCompleted: boolean }[] }): Promise<void>
  onCancel(): void
}) {
  const [actualDuration, setActualDuration] = useState(String(session.actualDurationMinutes ?? session.scheduledDurationMinutes))
  const [pricingOverride, setPricingOverride] = useState(session.pricingOverride)
  const [unitRate, setUnitRate] = useState(String(session.unitRateSnapshot ?? session.hourlyRateSnapshot ?? 0))
  const [progress, setProgress] = useState(String(session.progressPercent ?? 100))
  const [note, setNote] = useState(session.evaluationNote || '')
  const [goals, setGoals] = useState(session.goals.map(goal => ({ id: goal.id, title: goal.title, isCompleted: goal.isCompleted })))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmResetPricing, setConfirmResetPricing] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const formState = JSON.stringify({ actualDuration, pricingOverride, unitRate, progress, note, goals })
  const originalState = useRef(formState)
  const student = students.find(item => item.id === session.studentId)
  const currentPricing = student ? resolveStudentPricing(student, settings) : { mode: session.pricingModeSnapshot, unitRate: session.unitRateSnapshot ?? 0 }
  const resettingOverride = session.pricingOverride && !pricingOverride
  const pricingMode = pricingOverride ? session.pricingModeSnapshot : resettingOverride ? currentPricing.mode : session.pricingModeSnapshot
  const effectiveRate = pricingOverride ? Number(unitRate) || 0 : resettingOverride ? currentPricing.unitRate : session.unitRateSnapshot ?? session.hourlyRateSnapshot ?? 0
  const fee = calculateSessionFee(pricingMode, effectiveRate, Number(actualDuration) || 0)
  const toggleOverride = (enabled: boolean) => {
    if (!enabled && pricingOverride) { setConfirmResetPricing(true); return }
    setPricingOverride(enabled)
    if (!enabled) setUnitRate(String(currentPricing.unitRate))
    setConfirmResetPricing(false)
  }
  const requestCancel = useCallback(() => {
    if (busy) return
    if (formState !== originalState.current) setConfirmCancel(true)
    else onCancel()
  }, [busy, formState, onCancel])
  useEffect(() => {
    const handler = () => requestCancel()
    window.addEventListener('teaching:request-form-close', handler)
    return () => window.removeEventListener('teaching:request-form-close', handler)
  }, [requestCancel])
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      await onSave({
        sessionId: session.id,
        actualDurationMinutes: Number(actualDuration),
        pricingOverride,
        ...(pricingOverride ? { unitRateSnapshot: Number(unitRate) } : {}),
        progressPercent: Number(progress),
        evaluationNote: note,
        goals: goals.map(({ id, isCompleted }) => ({ id, isCompleted })),
      })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được đánh giá.') }
    finally { setBusy(false) }
  }
  return <form className="teaching-form" onSubmit={submit}>
    <h2>{session.status === 'COMPLETED' ? 'Sửa đánh giá buổi học' : 'Hoàn thành buổi học'}</h2>
    <div className="teaching-review-context"><strong>{session.studentName} · {session.title}</strong><span>{new Date(session.startAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })}</span></div>
    <fieldset className="teaching-review-goals"><legend>Mục tiêu buổi học</legend>{goals.length ? goals.map((goal, index) => <label key={goal.id}><input type="checkbox" checked={goal.isCompleted} onChange={event => setGoals(old => old.map((item, i) => i === index ? { ...item, isCompleted: event.target.checked } : item))} />{goal.title}</label>) : <p>Buổi học chưa có mục tiêu.</p>}
      <p className="teaching-goal-rate">Đã hoàn thành: {goals.length ? `${goals.filter(goal => goal.isCompleted).length}/${goals.length} (${Math.round(goals.filter(goal => goal.isCompleted).length / goals.length * 100)}%)` : 'Chưa có mục tiêu'}</p>
    </fieldset>
    <div className="teaching-form-grid"><label className="teaching-rating-field">Đánh giá của giáo viên (%) *<span className="teaching-rating-controls"><input aria-label="Thanh đánh giá phần trăm" type="range" min={0} max={100} step={1} value={progress} onChange={event => setProgress(event.target.value)} /><input aria-label="Đánh giá phần trăm bằng số" type="number" required min={0} max={100} step={1} value={progress} onChange={event => setProgress(event.target.value)} /></span></label><label>Thời lượng thực tế (phút) *<input type="number" required min={1} max={1440} step={1} value={actualDuration} onChange={event => setActualDuration(event.target.value)} /></label></div>
    <fieldset className="teaching-pricing-summary"><legend>Học phí</legend>
      <p>Hình thức: <strong>{modeName(pricingMode)}</strong></p>
      <p>Đơn giá: <strong>{formatVnd(effectiveRate)}/{pricingUnitLabel(pricingMode).replace('đ/', '')}</strong></p>
      <label className="teaching-checkbox-option"><input type="checkbox" checked={pricingOverride} onChange={event => toggleOverride(event.target.checked)} /><span>Chỉnh học phí riêng cho buổi này</span></label>
      {pricingOverride && <label>Đơn giá riêng (VND/{pricingUnitLabel(session.pricingModeSnapshot).replace('đ/', '')})<input type="number" required min={0} max={100_000_000} step={1} value={unitRate} onChange={event => setUnitRate(event.target.value)} /></label>}
      {confirmResetPricing && <div className="teaching-inline-confirm" role="group" aria-label="Xác nhận bỏ giá riêng"><p>Bỏ đơn giá riêng và dùng giá hiện tại của học viên?</p><button type="button" onClick={() => setConfirmResetPricing(false)}>Giữ giá riêng</button><button className="demo-primary" type="button" onClick={() => { setPricingOverride(false); setUnitRate(String(currentPricing.unitRate)); setConfirmResetPricing(false) }}>Dùng giá học viên</button></div>}
      <div className="teaching-fee-preview"><span>Thành tiền{pricingMode === 'PER_HOUR' ? ` · ${Number(actualDuration) || 0} phút` : ''}</span><strong>{formatVnd(fee)}</strong></div>
    </fieldset>
    <label>Nhận xét *<textarea required maxLength={5000} value={note} onChange={event => setNote(event.target.value)} placeholder="Nhận xét về buổi học…" /></label>
    {error && <p role="alert" className="demo-alert">{error}</p>}
    {confirmCancel && <div className="teaching-inline-confirm" role="alertdialog" aria-label="Xác nhận bỏ đánh giá"><p>Bạn có thay đổi chưa lưu. Bỏ đánh giá này?</p><button type="button" onClick={() => setConfirmCancel(false)}>Tiếp tục chỉnh sửa</button><button type="button" className="teaching-danger-button" onClick={onCancel}>Bỏ thay đổi</button></div>}
    <div className="demo-form-actions"><button type="button" disabled={busy} onClick={requestCancel}>Hủy</button><button className="demo-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Xác nhận'}</button></div>
  </form>
}

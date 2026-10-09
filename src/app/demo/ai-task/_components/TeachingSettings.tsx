'use client'

import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_BILLING_CYCLE_CUTOFF_DAY, DEFAULT_HOURLY_RATE, DEFAULT_SESSION_RATE, formatVnd, type PricingMode, type TeachingSettings as Settings } from '../_lib/teaching-model'
import { teachingGet, teachingPost } from './teaching-client'
import { showTeachingToast } from './teaching-ui'
import { useTeachingWorkspace } from './WorkspaceProvider'
import WorkspaceBackup from './WorkspaceBackup'

export default function TeachingSettings() {
  const { active } = useTeachingWorkspace()
  const [mode, setMode] = useState<PricingMode>('PER_SESSION')
  const [sessionRate, setSessionRate] = useState(String(DEFAULT_SESSION_RATE))
  const [hourlyRate, setHourlyRate] = useState(String(DEFAULT_HOURLY_RATE))
  const [billingCutoffDay, setBillingCutoffDay] = useState(String(DEFAULT_BILLING_CYCLE_CUTOFF_DAY))
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const result = await teachingGet<{ settings: Settings }>({ resource: 'settings' })
      setMode(result.settings.defaultPricingMode)
      setSessionRate(String(result.settings.defaultSessionRate))
      setHourlyRate(String(result.settings.defaultHourlyRate))
      setBillingCutoffDay(String(result.settings.billingCycleCutoffDay))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được cài đặt.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      const result = await teachingPost<{ settings: Settings }>({ operation: 'saveSettings', data: { defaultPricingMode: mode, defaultSessionRate: Number(sessionRate), defaultHourlyRate: Number(hourlyRate), billingCycleCutoffDay: Number(billingCutoffDay) } })
      setMode(result.settings.defaultPricingMode); setSessionRate(String(result.settings.defaultSessionRate)); setHourlyRate(String(result.settings.defaultHourlyRate)); setBillingCutoffDay(String(result.settings.billingCycleCutoffDay)); setMessage('Đã lưu cài đặt học phí.'); showTeachingToast('Đã cập nhật học phí mặc định.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được cài đặt.') }
    finally { setBusy(false) }
  }
  const activeValue = mode === 'PER_SESSION' ? Number(sessionRate) : Number(hourlyRate)
  const activeUnit = mode === 'PER_SESSION' ? 'buổi' : 'giờ'

  return <>
    <div className="demo-page-heading teaching-heading"><div><p className="teaching-eyebrow">Tùy chỉnh</p><h1>Cài đặt</h1><p>Thiết lập học phí mặc định cho học viên chưa có đơn giá riêng.</p></div></div>
    {error && <div role="alert" className="demo-alert teaching-retry"><span>{error}</span><button onClick={() => void load()}>Thử lại</button></div>}
    <section className="demo-panel demo-padded teaching-settings-panel">
      {loading ? <div className="teaching-settings-skeleton" role="status"><span className="teaching-skeleton-line"/><span className="teaching-skeleton-block"/></div> : <form className="teaching-form teaching-settings-form" onSubmit={save}>
        <div><p className="teaching-eyebrow">Học phí</p><h2>Cấu hình mặc định</h2><p>Học viên có đơn giá riêng tiếp tục dùng mức giá đã lưu. Học phí của buổi đã hoàn thành không bị thay đổi khi cập nhật cài đặt.</p></div>
        <fieldset className="teaching-pricing-options"><legend>Hình thức tính phí mặc định</legend><label className="teaching-radio-option"><input type="radio" name="default-pricing" checked={mode === 'PER_SESSION'} onChange={() => setMode('PER_SESSION')}/><span>Theo buổi<small>Thu một mức cố định cho mỗi buổi đã hoàn thành.</small></span></label><label className="teaching-radio-option"><input type="radio" name="default-pricing" checked={mode === 'PER_HOUR'} onChange={() => setMode('PER_HOUR')}/><span>Theo giờ<small>Tính theo thời lượng thực tế khi đánh giá buổi học.</small></span></label></fieldset>
        {mode === 'PER_SESSION' ? <label>Giá mỗi buổi (VND)<input autoComplete="off" type="number" min={0} max={100_000_000} step={1} required value={sessionRate} onChange={event => setSessionRate(event.target.value)}/></label> : <label>Giá mỗi giờ (VND)<input autoComplete="off" type="number" min={0} max={100_000_000} step={1} required value={hourlyRate} onChange={event => setHourlyRate(event.target.value)}/></label>}
        <label>Ngày chốt tháng học phí<input autoComplete="off" type="number" min={1} max={31} step={1} required value={billingCutoffDay} onChange={event => setBillingCutoffDay(event.target.value)}/><small>Ví dụ ngày 15: tháng tính học phí từ ngày 16 tháng trước đến hết ngày 15 tháng này. Tháng không có ngày đã chọn sẽ chốt vào ngày cuối tháng.</small></label>
        {Number.isSafeInteger(activeValue) && activeValue >= 0 && <div className="teaching-rate-preview">Đơn giá mặc định: <strong>{formatVnd(activeValue)}/{activeUnit}</strong></div>}
        <p className="teaching-settings-note">Giá theo giờ cũ và các mức riêng của học viên vẫn được lưu khi bạn đổi hình thức mặc định.</p>
        {error && <p role="alert" className="demo-alert">{error}</p>}{message && <p role="status" className="teaching-success">{message}</p>}
        <button className="demo-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
      </form>}
    </section>
    {active?.mode === 'LOCAL' && <WorkspaceBackup/>}
  </>
}

'use client'
import { useEffect, useId, useState } from 'react'
import { displayDate, scheduledDeadline, type TaskInput } from '../_lib/model'
import DurationPicker from './DurationPicker'

const localDate = (value: string | null) => value ? new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(0, 16) : ''
export function durationText(minutes: number) {
  const days = Math.floor(minutes / 1440), hours = Math.floor(minutes % 1440 / 60), rest = minutes % 60
  return [days && `${days} ngày`, hours && `${hours} giờ`, rest && `${rest} phút`].filter(Boolean).join(' ') || '0 phút'
}

export default function TaskScheduleFields({ value, onChange }: { value: TaskInput; onChange(patch: Partial<TaskInput>): void }) {
  const id = useId()
  const [now, setNow] = useState(Date.now)
  const [emptyMode, setEmptyMode] = useState<'duration' | 'deadline' | null>(null)
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer) }, [])
  const mode = value.scheduleMode === 'duration' && value.duration ? 'duration' : value.scheduleMode === 'deadline' && value.deadline ? 'deadline' : emptyMode || 'none'
  const start = value.startNow ? new Date(now).toISOString() : value.startTime
  const end = scheduledDeadline(start, value.duration)
  const remaining = value.deadline ? Math.ceil((Date.parse(value.deadline) - now) / 60000) : null
  const changeDate = (key: 'startTime' | 'deadline', input: string) => {
    const parsed = input ? new Date(input + ':00+07:00') : null
    if (!parsed || !Number.isNaN(parsed.getTime())) {
      if (key === 'deadline') setEmptyMode('deadline')
      onChange({ [key]: parsed?.toISOString() || null })
    }
  }
  return <section className="ai-task-schedule demo-full" aria-label="Thời gian">
    <h3>Thời gian</h3>
    <fieldset className="ai-task-schedule-choice"><legend>Bắt đầu</legend>
      <label><input type="radio" name={`${id}-start`} checked={!!value.startNow} onChange={() => onChange({ startNow: true, startTime: null })} />Ngay bây giờ</label>
      <label><input type="radio" name={`${id}-start`} checked={!value.startNow} onChange={() => onChange({ startNow: false, startTime: value.startTime || new Date(Math.floor(Date.now() / 60000) * 60000).toISOString() })} />Chọn thời gian</label>
    </fieldset>
    {!value.startNow && <label>Ngày giờ bắt đầu (giờ Việt Nam)<input type="datetime-local" min="1900-01-01T00:00" max="9999-12-31T23:59" value={localDate(value.startTime)} onChange={e => changeDate('startTime', e.target.value)} /></label>}
    <fieldset className="ai-task-schedule-choice"><legend>Hoàn thành</legend>
      <label><input type="radio" name={`${id}-finish`} checked={mode === 'none'} onChange={() => { setEmptyMode(null); onChange({ scheduleMode: 'deadline', duration: null, deadline: null }) }} />Không đặt</label>
      <label><input type="radio" name={`${id}-finish`} checked={mode === 'duration'} onChange={() => { setEmptyMode('duration'); onChange({ scheduleMode: 'duration', duration: value.duration || 1440, deadline: null }) }} />Sau một khoảng thời gian</label>
      <label><input type="radio" name={`${id}-finish`} checked={mode === 'deadline'} onChange={() => { setEmptyMode('deadline'); onChange({ scheduleMode: 'deadline', deadline: value.deadline || end, duration: null }) }} />Vào thời điểm cụ thể</label>
    </fieldset>
    {mode === 'duration' && <><DurationPicker value={value.duration} onChange={duration => { setEmptyMode('duration'); onChange({ duration, deadline: null }) }} />{end && <p className="ai-task-schedule-hint" aria-live="polite">Dự kiến hoàn thành: {displayDate(end)}</p>}</>}
    {mode === 'deadline' && <><label>Deadline (giờ Việt Nam)<input type="datetime-local" min="1900-01-01T00:00" max="9999-12-31T23:59" value={localDate(value.deadline)} onChange={e => changeDate('deadline', e.target.value)} /></label>{remaining !== null && <p className="ai-task-schedule-hint" aria-live="polite">{remaining > 0 ? `Còn khoảng ${durationText(remaining)}` : 'Đã quá hạn'}</p>}</>}
  </section>
}

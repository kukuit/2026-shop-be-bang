'use client'
import { useState } from 'react'

const units = [{ label: 'phút', minutes: 1 }, { label: 'giờ', minutes: 60 }, { label: 'ngày', minutes: 1440 }]
const presets = [{ label: '30 phút', minutes: 30 }, { label: '1 giờ', minutes: 60 }, { label: '2 giờ', minutes: 120 }, { label: '1 ngày', minutes: 1440 }, { label: '2 ngày', minutes: 2880 }]

export default function DurationPicker({ value, onChange }: { value: number | null; onChange(value: number | null): void }) {
  const [unit, setUnit] = useState(() => value && value % 1440 === 0 ? 1440 : value && value % 60 === 0 ? 60 : 1)
  return <div className="ai-task-duration">
    <strong>Thời lượng</strong>
    <div className="ai-task-duration-options" role="group" aria-label="Thời lượng gợi ý">
      {presets.map(item => <button key={item.minutes} type="button" aria-pressed={value === item.minutes} className={value === item.minutes ? 'demo-primary' : ''} onClick={() => { setUnit(item.minutes >= 1440 ? 1440 : item.minutes >= 60 ? 60 : 1); onChange(item.minutes) }}>{item.label}</button>)}
    </div>
    <div className="ai-task-duration-custom">
      <label>Tùy chỉnh<input aria-label="Số lượng thời gian" type="number" min={1 / unit} max={525600 / unit} step="any" value={value === null ? '' : Number((value / unit).toFixed(6))} onChange={e => onChange(e.target.value ? Math.round(Number(e.target.value) * unit) : null)} /></label>
      <label>Đơn vị<select value={unit} onChange={e => { const next = Number(e.target.value); setUnit(next); if (value !== null) onChange(Math.round(value / unit * next)) }}>{units.map(item => <option key={item.minutes} value={item.minutes}>{item.label}</option>)}</select></label>
    </div>
  </div>
}

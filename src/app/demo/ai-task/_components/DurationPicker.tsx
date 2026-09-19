'use client'
import { useId, useState } from 'react'

const units = [
  { label: 'Ngày', suffix: 'ngày', minutes: 1440, count: 4 },
  { label: 'Giờ', suffix: 'giờ', minutes: 60, count: 24 },
  { label: 'Phút', suffix: 'phút', minutes: 1, count: 60 },
]

export default function DurationPicker({ value, onChange }: { value: number | null; onChange(value: number | null): void }) {
  const id = useId()
  const [tab, setTab] = useState(() => value ? Math.max(0, units.findIndex(unit => value % unit.minutes === 0 && value / unit.minutes <= unit.count)) : 0)
  const unit = units[tab]
  const displayUnit = value ? units.find(item => value % item.minutes === 0 && value / item.minutes <= item.count) : undefined
  return <div className="ai-task-duration demo-full">
    <strong>Thời lượng</strong>
    <div className="demo-tabs" role="tablist" aria-label="Đơn vị thời lượng">
      {units.map((item, index) => <button key={item.label} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel`} aria-selected={tab === index} tabIndex={tab === index ? 0 : -1} className={tab === index ? 'demo-primary' : ''} onClick={() => setTab(index)} onKeyDown={event => {
        const next = event.key === 'ArrowRight' ? (index + 1) % units.length : event.key === 'ArrowLeft' ? (index + units.length - 1) % units.length : event.key === 'Home' ? 0 : event.key === 'End' ? units.length - 1 : null
        if (next === null) return
        event.preventDefault(); setTab(next)
        document.getElementById(`${id}-tab-${next}`)?.focus()
      }}>{item.label}</button>)}
    </div>
    <div className="ai-task-duration-options" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab}`}>
      {Array.from({ length: unit.count }, (_, index) => index + 1).map(amount => <button type="button" key={amount} aria-pressed={value === amount * unit.minutes} className={value === amount * unit.minutes ? 'demo-primary' : ''} onClick={() => onChange(amount * unit.minutes)}>{amount} {unit.suffix}</button>)}
    </div>
    <div className="demo-inline"><small aria-live="polite">{value ? `Đã chọn: ${displayUnit ? `${value / displayUnit.minutes} ${displayUnit.suffix}` : `${value} phút`}` : 'Chưa chọn thời lượng'}</small>{value !== null && <button type="button" onClick={() => onChange(null)}>Bỏ chọn</button>}</div>
  </div>
}

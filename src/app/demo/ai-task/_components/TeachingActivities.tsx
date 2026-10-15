'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, RotateCcw } from 'lucide-react'
import { teachingGet, teachingPost } from './teaching-client'

type TeachingActivity = {
  id: string
  operation: string
  label: string
  createdAt: string
  undone: boolean
  undoable: boolean
  undoUnavailableReason?: string
  undoneAt?: string
}
type ActivityResponse = { activities: TeachingActivity[] }

const supportedActions = [
  'Tạo hoặc sửa học viên và lịch học cố định',
  'Thu học phí, gồm cả khoản thu dư',
  'Đổi cài đặt học phí mặc định',
  'Tạo hoặc sửa buổi học',
  'Hủy hoặc khôi phục buổi học',
  'Xác nhận buổi không học',
  'Xác nhận đã học nhanh',
  'Đánh giá buổi học, mục tiêu và ghi chú',
]

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' })
}

export default function TeachingActivities() {
  const [data, setData] = useState<ActivityResponse>({ activities: [] })
  const [loading, setLoading] = useState(true)
  const [undoingId, setUndoingId] = useState<string | null>(null)
  const [activityErrors, setActivityErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const result = await teachingGet<ActivityResponse>({ resource: 'activities' })
      setData(result)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được lịch sử hoạt động.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    void refresh()
    const onActivityChanged = () => { void refresh() }
    window.addEventListener('teaching:activity-changed', onActivityChanged)
    return () => window.removeEventListener('teaching:activity-changed', onActivityChanged)
  }, [refresh])

  const undo = async (item: TeachingActivity) => {
    if (undoingId) return
    setUndoingId(item.id)
    setActivityErrors(current => { const next = { ...current }; delete next[item.id]; return next })
    try {
      const result = await teachingPost<{ activity: { label: string } }>({ operation: 'undoActivity', activityId: item.id })
      window.dispatchEvent(new Event('teaching:data-changed'))
      window.dispatchEvent(new CustomEvent('teaching:toast', { detail: { message: `Đã hoàn tác: ${result.activity.label}`, kind: 'success' } }))
      await refresh()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không thể hoàn tác hoạt động này.'
      setActivityErrors(current => ({ ...current, [item.id]: message }))
      window.dispatchEvent(new CustomEvent('teaching:toast', { detail: { message, kind: 'error' } }))
      await refresh()
    } finally { setUndoingId(null) }
  }

  return <div className="teaching-activities-page">
    <p className="teaching-activity-intro">Các thao tác được lưu trong workspace này. Bạn có thể hoàn tác từng hoạt động nếu dữ liệu liên quan chưa bị thay đổi tiếp.</p>
    <section className="demo-panel teaching-panel">
      <h2 className="teaching-activity-section-title"><Activity size={18} /> Các hoạt động được lưu</h2>
      <ul className="teaching-activity-types">{supportedActions.map(action => <li key={action}>{action}</li>)}</ul>
    </section>

    <section className="demo-panel teaching-panel">
      <h2 className="teaching-activity-section-title">Lịch sử gần đây <span>{data.activities.length}</span></h2>
      {error && <p className="demo-alert" role="alert">{error}</p>}
      {loading ? <p className="teaching-activity-empty">Đang tải lịch sử…</p>
        : data.activities.length ? <ol className="teaching-activity-list">{data.activities.map(item => <li key={item.id} className={item.undone ? 'is-undone' : undefined}>
          <span className="teaching-activity-marker" aria-hidden="true" />
          <div className="teaching-activity-copy"><strong>{item.label}</strong><time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>{!item.undoable && item.undoUnavailableReason && <small className="teaching-activity-note">{item.undoUnavailableReason}</small>}{activityErrors[item.id] && <small className="teaching-activity-error" role="alert">{activityErrors[item.id]}</small>}</div>
          {item.undone ? <span className="teaching-activity-status">Đã hoàn tác</span> : <>
            {!item.undoable && <span className="teaching-activity-status">Chỉ lưu lịch sử</span>}
            <button className="teaching-activity-undo" type="button" aria-label={`Hoàn tác ${item.label}`} disabled={!item.undoable || undoingId !== null || loading} onClick={() => void undo(item)}><RotateCcw size={14} />{undoingId === item.id ? 'Đang hoàn tác…' : 'Hoàn tác'}</button>
          </>}
        </li>)}</ol>
          : <p className="teaching-activity-empty">Chưa có hoạt động. Các thao tác tiếp theo sẽ được lưu tại đây.</p>}
    </section>
  </div>
}

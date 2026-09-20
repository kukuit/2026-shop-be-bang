'use client'
import { Check } from 'lucide-react'
import type { Task } from '../_lib/model'
import { capitalizeTaskTitle } from '../_lib/task-presentation'
import styles from './TaskWorkflow.module.css'

export function ReviewReminderBanner({
  count,
  disabled,
  onReview,
}: {
  count: number
  disabled: boolean
  onReview(): void
}) {
  return (
    <div className={styles.banner}>
      <p>
        {count ? `Bạn có ${count} công việc cần cập nhật.` : 'Cùng nhìn lại công việc của bạn.'}
      </p>
      <button aria-label="Rà soát công việc" disabled={disabled} onClick={onReview}>
        Rà soát công việc{count > 0 && <span className={styles.count}>{count}</span>}
      </button>
    </div>
  )
}
export function ReviewReminderToast({
  task,
  onComplete,
  onLater,
  disabled,
}: {
  task: Task
  onComplete(): void
  onLater(): void
  disabled: boolean
}) {
  return (
    <aside className={styles.toast} role="status">
      <p>{capitalizeTaskTitle(task.title)} đã đến thời gian dự kiến hoàn thành.</p>
      <div>
        <button disabled={disabled} className="demo-primary" onClick={onComplete}>
          <Check size={16} />
          Đã xong
        </button>
        <button onClick={onLater}>Xem sau</button>
      </div>
    </aside>
  )
}

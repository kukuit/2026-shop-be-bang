'use client'
import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { capitalizeTaskTitle } from '../_lib/task-presentation'
import type { ReviewTask } from '../_lib/task-review'
import type { Task } from '../_lib/model'
import styles from './TaskWorkflow.module.css'

export function TaskReviewItem({
  item,
  context,
  leaving,
  disabled,
  onComplete,
  onUpdate,
}: {
  item: ReviewTask
  context: string
  leaving: boolean
  disabled: boolean
  onComplete(task: Task): void
  onUpdate(task: Task, deadline: string | null): Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [error, setError] = useState('')
  const update = async (value: string | null) => {
    setError('')
    try {
      await onUpdate(item.task, value)
      setEditing(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật công việc.')
    }
  }
  return (
    <li className={`${styles.reviewItem} ${leaving ? styles.leaving : ''}`}>
      <div>
        <h3>{capitalizeTaskTitle(item.task.title)}</h3>
        <p>{context}</p>
        <small>{leaving ? '✓ Đã hoàn thành' : item.reason}</small>
      </div>
      <div className={styles.reviewActions}>
        <button
          disabled={disabled || leaving}
          aria-label={`Hoàn thành ${item.task.title}`}
          onClick={() => onComplete(item.task)}
        >
          <Check size={19} />
          Hoàn thành
        </button>
        <button
          disabled={disabled || leaving}
          onClick={() => {
            setDeadline(
              item.task.deadline
                ? new Date(Date.parse(item.task.deadline) + 7 * 3600000).toISOString().slice(0, 16)
                : ''
            )
            setError('')
            setEditing(true)
          }}
        >
          Đổi deadline
        </button>
        <button
          className="demo-danger-text"
          disabled={disabled || leaving}
          onClick={() => void update(null)}
        >
          Hủy công việc
        </button>
      </div>
      {editing && (
        <form
          className={styles.reviewDeadline}
          onSubmit={(event) => {
            event.preventDefault()
            const date = new Date(deadline + ':00+07:00')
            if (!Number.isFinite(date.getTime())) {
              setError('Hãy chọn deadline hợp lệ.')
              return
            }
            void update(date.toISOString())
          }}
        >
          <label>
            Deadline (giờ Việt Nam)
            <input
              type="datetime-local"
              required
              min="1900-01-01T00:00"
              max="9999-12-31T23:59"
              value={deadline}
              disabled={disabled || leaving}
              onChange={(event) => setDeadline(event.target.value)}
              autoFocus
            />
          </label>
          <div className={styles.reviewActions}>
            <button type="submit" disabled={disabled || leaving}>
              Lưu deadline
            </button>
            <button
              type="button"
              disabled={disabled || leaving}
              onClick={() => {
                setEditing(false)
                setError('')
              }}
            >
              Bỏ qua
            </button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="demo-danger-text">
          {error}
        </p>
      )}
    </li>
  )
}
export default function TaskReviewDialog({
  overdueOnly = false,
  items,
  context,
  leaving,
  disabled,
  onComplete,
  onClose,
  onSnooze,
  onUpdate,
}: {
  overdueOnly?: boolean
  items: ReviewTask[]
  context(task: Task): string
  leaving: string | null
  disabled: boolean
  onComplete(task: Task): void
  onClose(): void
  onSnooze(): void
  onUpdate(task: Task, deadline: string | null): Promise<void>
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      className={`ai-task-dialog ${styles.dialog}`}
      aria-labelledby="review-title"
      data-review-dialog
      onCancel={(e) => {
        e.preventDefault()
        if (!disabled) onClose()
      }}
    >
      <header className={styles.heading}>
        <h2 id="review-title">{overdueOnly ? 'Đã quá hạn hoàn thành' : 'Rà soát công việc'}</h2>
        <button aria-label="Đóng rà soát" disabled={disabled} onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      <p className={styles.context}>
        {items.length
          ? `${items.length} công việc ${overdueOnly ? 'đã quá hạn hoàn thành' : 'cần bạn cập nhật'}`
          : overdueOnly
            ? 'Không còn công việc quá hạn hoàn thành.'
            : 'Mọi việc cần rà soát đã được cập nhật.'}
      </p>
      <ul className={styles.reviewList}>
        {items.map((item) => (
          <TaskReviewItem
            key={item.task.id}
            item={item}
            context={context(item.task)}
            leaving={leaving === item.task.id}
            disabled={disabled}
            onComplete={onComplete}
            onUpdate={onUpdate}
          />
        ))}
      </ul>
      <div className="demo-form-actions">
        <button disabled={disabled} onClick={onSnooze}>
          Để sau
        </button>
        <button className="demo-primary" disabled={disabled} onClick={onClose}>
          Xong
        </button>
      </div>
    </dialog>
  )
}

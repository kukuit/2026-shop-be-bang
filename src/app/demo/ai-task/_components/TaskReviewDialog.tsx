'use client'
import { useEffect, useRef } from 'react'
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
}: {
  item: ReviewTask
  context: string
  leaving: boolean
  disabled: boolean
  onComplete(task: Task): void
}) {
  return (
    <li className={`${styles.reviewItem} ${leaving ? styles.leaving : ''}`}>
      <div>
        <h3>{capitalizeTaskTitle(item.task.title)}</h3>
        <p>{context}</p>
        <small>{leaving ? '✓ Đã hoàn thành' : item.reason}</small>
      </div>
      <button
        disabled={disabled || leaving}
        aria-label={`Hoàn thành ${item.task.title}`}
        onClick={() => onComplete(item.task)}
      >
        <Check size={19} />
      </button>
    </li>
  )
}
export default function TaskReviewDialog({
  items,
  context,
  leaving,
  disabled,
  onComplete,
  onClose,
  onSnooze,
}: {
  items: ReviewTask[]
  context(task: Task): string
  leaving: string | null
  disabled: boolean
  onComplete(task: Task): void
  onClose(): void
  onSnooze(): void
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
        <h2 id="review-title">Rà soát công việc</h2>
        <button aria-label="Đóng rà soát" disabled={disabled} onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      <p className={styles.context}>
        {items.length
          ? `${items.length} công việc cần bạn cập nhật`
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

'use client'
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { CompletionRating } from '../_lib/task-review'
import { capitalizeTaskTitle } from '../_lib/task-presentation'
import CompletionSlider from './CompletionSlider'
import styles from './TaskWorkflow.module.css'

export default function CompleteTaskDialog({
  title,
  context,
  onCancel,
  onConfirm,
}: {
  title: string
  context: string
  onCancel(): void
  onConfirm(rating: CompletionRating): Promise<void>
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const lock = useRef(false)
  const [percent, setPercent] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      className={`ai-task-dialog ${styles.dialog}`}
      aria-labelledby="complete-title"
      data-completion-dialog
      onCancel={(e) => {
        e.preventDefault()
        if (!lock.current) onCancel()
      }}
    >
      <header className={styles.heading}>
        <h2 id="complete-title">Hoàn thành công việc</h2>
        <button
          type="button"
          disabled={saving}
          aria-label="Đóng đánh giá hoàn thành"
          onClick={onCancel}
        >
          <X size={20} />
        </button>
      </header>
      <h3 className={styles.taskTitle}>{capitalizeTaskTitle(title)}</h3>
      <p className={styles.context}>{context}</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (lock.current) return
          lock.current = true
          setSaving(true)
          setError('')
          try {
            await onConfirm({ completionPercent: percent, completionNote: note.trim() || null })
          } catch (reason) {
            setError(
              reason instanceof Error ? reason.message : 'Chưa lưu được kết quả. Hãy thử lại.'
            )
            setSaving(false)
            lock.current = false
          }
        }}
      >
        <CompletionSlider value={percent} onChange={setPercent} disabled={saving} />
        <label className={styles.note}>
          Ghi chú
          <textarea
            rows={3}
            maxLength={5000}
            disabled={saving}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi lại kết quả hoặc điều cần lưu ý..."
          />
        </label>
        {error && (
          <p className="demo-alert" role="alert">
            {error}
          </p>
        )}
        <div className="demo-form-actions">
          <button type="button" disabled={saving} onClick={onCancel}>
            Hủy
          </button>
          <button className="demo-primary" disabled={saving}>
            {saving ? 'Đang lưu…' : 'Hoàn thành'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

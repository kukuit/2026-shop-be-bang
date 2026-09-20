import { displayDate, type Task } from '../_lib/model'

export default function CompletionSummary({ task }: { task: Task }) {
  if (task.status !== 'done') return null
  return (
    <div className="ai-task-completion-summary">
      <strong>
        Kết quả hoàn thành{task.completionPercent != null ? ` · ${task.completionPercent}%` : ''}
      </strong>
      {task.completedAt && <small>Hoàn thành lúc {displayDate(task.completedAt)}</small>}
      {task.completionNote && <p>{task.completionNote}</p>}
    </div>
  )
}

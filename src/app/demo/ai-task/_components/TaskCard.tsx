import Link from 'next/link'
import CompletionSummary from './CompletionSummary'
import { displayDate, isOpen, priorityLabels, statusLabels, type Group, type Task } from '../_lib/model'
export default function TaskCard({ task, groups, linked = true, path }: { task: Task; groups: Group[]; linked?: boolean; path?: string }) {
  return <article className={`ai-task-card priority-${task.priority} ${task.status === 'done' ? 'is-done' : ''}`}>
    <strong>{linked ? <Link href={`/demo/ai-task/tasks?query=${encodeURIComponent(task.title)}`}>{task.title}</Link> : task.title}</strong>
    {path && <p className="ai-task-card-path">{path}</p>}
    <div className="demo-inline"><span className={`ai-task-badge priority-${task.priority}`}>{priorityLabels[task.priority]}</span><span className={`ai-task-badge status-${task.status}`}>{statusLabels[task.status]}</span><span>{groups.find(g => g.id === task.groupId)?.name || 'Nhóm không còn khả dụng'}</span>{task.parentId && <span>Công việc con</span>}</div>
    <small className={isOpen(task) && task.deadline && Date.parse(task.deadline) < Date.now() ? 'demo-danger-text' : ''}>{displayDate(task.deadline)}</small>
    {task.startTime && <small>Bắt đầu: {displayDate(task.startTime)}</small>}
    {task.duration && <small>Thời lượng: {task.duration} phút</small>}
    {task.description && <p>{task.description}</p>}
    <CompletionSummary task={task} />
  </article>
}

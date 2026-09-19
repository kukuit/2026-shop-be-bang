import Link from 'next/link'
import { displayDate, isOpen, priorityLabels, statusLabels } from '../_lib/model'
import type { TaskDisplayGroup } from '../_lib/task-display'

export default function TaskResultGroups({ groups }: { groups: TaskDisplayGroup[] }) {
  return <div className="ai-task-results">{groups.map(group => <section className="ai-task-result-group" key={group.parentPathKey}>
    <header><h3>{[group.groupName, ...group.ancestors.map(parent => parent.title)].join(' · ')}</h3><small>{group.tasks.length} công việc</small></header>
    <ul>{group.tasks.map(task => <li className={task.status === 'done' ? 'is-done' : ''} key={task.id}>
      <strong><Link href={`/demo/ai-task/tasks?query=${encodeURIComponent(task.title)}`}>{task.title}</Link></strong>
      <div className="demo-inline"><span className={`ai-task-badge priority-${task.priority}`}>{priorityLabels[task.priority]}</span><span className={`ai-task-badge status-${task.status}`}>{statusLabels[task.status]}</span></div>
      {task.deadline && <small className={isOpen(task) && Date.parse(task.deadline) < Date.now() ? 'demo-danger-text' : ''}>Hạn: {displayDate(task.deadline)}</small>}
      {task.startTime && <small>Bắt đầu: {displayDate(task.startTime)}</small>}
    </li>)}</ul>
  </section>)}</div>
}

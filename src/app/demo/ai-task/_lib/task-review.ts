import { isOpen, type Task, type TaskInput, type Group, type TreeNode } from './model'
import { treePath } from './tree'

const HOUR = 3600000
export const reviewRules = {
  scheduledGrace: HOUR,
  staleStarted: 24 * HOUR,
  staleUnscheduled: 7 * 24 * HOUR,
  snooze: 3 * HOUR,
  longBreak: 3 * HOUR,
}
export type ReviewTask = { task: Task; reason: string; rank: number; since: number }
export function expectedEnd(task: Task): number | null {
  const value = task.deadline
    ? Date.parse(task.deadline)
    : task.startTime && task.duration
      ? Date.parse(task.startTime) + task.duration * 60000
      : NaN
  return Number.isFinite(value) ? value : null
}
export function getReviewableTasks(tasks: Task[], now = Date.now()): ReviewTask[] {
  const parents = new Set(tasks.filter((t) => !t.deletedAt).map((t) => t.parentId))
  return tasks
    .flatMap((task): ReviewTask[] => {
      if (!isOpen(task)) return []
      const end = expectedEnd(task),
        start = task.startTime ? Date.parse(task.startTime) : NaN
      const updated = Date.parse(task.updatedAt || task.createdAt),
        created = Date.parse(task.createdAt)
      if (end !== null && end <= now) {
        const hours = Math.floor((now - end) / HOUR)
        return [
          {
            task,
            rank: task.scheduleMode === 'duration' ? 1 : 0,
            since: end,
            reason:
              task.scheduleMode === 'duration'
                ? 'Đã đến thời gian dự kiến hoàn thành'
                : hours
                  ? `Quá hạn ${hours >= 24 ? Math.floor(hours / 24) + ' ngày' : hours + ' giờ'}`
                  : 'Vừa đến hạn hoàn thành',
          },
        ]
      }
      if (
        (start <= now || task.status === 'in_progress') &&
        now - updated >= reviewRules.staleStarted
      )
        return [{ task, rank: 2, since: updated, reason: 'Đã bắt đầu nhưng lâu chưa cập nhật' }]
      if (task.status === 'todo' && start <= now - reviewRules.scheduledGrace)
        return [{ task, rank: 3, since: start, reason: 'Đã đến lịch bắt đầu · Mới tạo' }]
      if (
        !task.startTime &&
        end === null &&
        !parents.has(task.id) &&
        now - Math.max(created, updated) >= reviewRules.staleUnscheduled
      )
        return [
          {
            task,
            rank: 4,
            since: Math.max(created, updated),
            reason: 'Chưa có lịch · Đã lâu chưa cập nhật',
          },
        ]
      return []
    })
    .sort((a, b) => a.rank - b.rank || a.since - b.since || a.task.id.localeCompare(b.task.id))
}
export function taskContext(
  task: Pick<TaskInput, 'parentId' | 'groupId'>,
  groups: Group[],
  nodes: TreeNode[]
) {
  return [
    groups.find((g) => g.id === task.groupId)?.name,
    task.parentId ? treePath(task.parentId, nodes).replaceAll(' / ', ' › ') : null,
  ]
    .filter(Boolean)
    .join(' › ')
}
export function taskToInput(t: Task): TaskInput {
  return {
    title: t.title,
    description: t.description,
    groupId: t.groupId,
    priority: t.priority,
    status: t.status,
    parentId: t.parentId,
    startTime: t.startTime ?? null,
    deadline: t.deadline,
    duration: t.duration ?? null,
    withinDay: t.withinDay ?? false,
    scheduleMode: t.scheduleMode,
    startNow: false,
  }
}
export type CompletionRating = { completionPercent: number | null; completionNote: string | null }

import { dayKey, type Task } from './model'

export type CalendarView = 'month' | 'week' | 'day'
export type CalendarEvent = {
  task: Task
  kind: 'timed' | 'all-day' | 'multi-day' | 'deadline' | 'unscheduled'
  start: string | null
  end: string | null
  minute: number | null
  endMinute: number | null
}
const DAY = 86400000
export const addDays = (day: string, amount: number) =>
  new Date(Date.parse(day + 'T12:00:00Z') + amount * DAY).toISOString().slice(0, 10)
export const dayDistance = (start: string, end: string) =>
  Math.round((Date.parse(end) - Date.parse(start)) / DAY)
export const weekStart = (day: string) =>
  addDays(day, -((new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7))
export const dateLabel = (
  day: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'numeric' }
) => new Date(day + 'T12:00:00Z').toLocaleDateString('vi-VN', { ...options, timeZone: 'UTC' })
export function moveCalendar(day: string, view: CalendarView, direction: number) {
  if (view !== 'month') return addDays(day, direction * (view === 'week' ? 7 : 1))
  const date = new Date(day + 'T12:00:00Z')
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + direction)
  return date.toISOString().slice(0, 10)
}
const validDate = (value: string | null | undefined) =>
  value && Number.isFinite(Date.parse(value)) ? value : null
const dateOf = (value: string) => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : dayKey(value))
// Persisted timestamps carry a time, including genuine midnight. Do not infer a
// missing clock from 00:00; the current schema does not retain that distinction.
const minuteOf = (value: string | null) =>
  value?.includes('T')
    ? Number(new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(11, 13)) * 60 +
      Number(new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(14, 16))
    : null
export const clockLabel = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
export function classifyTask(task: Task): CalendarEvent {
  const startValue = validDate(task.startTime),
    endValue = validDate(task.deadline)
  const start = startValue ? dateOf(startValue) : null,
    end = endValue ? dateOf(endValue) : null
  const minute = task.withinDay ? null : minuteOf(startValue),
    endMinute = task.withinDay ? null : minuteOf(endValue)
  const kind =
    !start && !end
      ? 'unscheduled'
      : !start
        ? 'deadline'
        : end && end > start
          ? 'multi-day'
          : minute !== null
            ? 'timed'
            : 'all-day'
  return {
    task,
    kind,
    start: start || end,
    end: start && end && end >= start ? end : start || end,
    minute,
    endMinute:
      startValue && endValue && Date.parse(endValue) > Date.parse(startValue) ? endMinute : null,
  }
}
export function calendarEvents(tasks: Task[]) {
  const live = tasks.filter((t) => !t.deletedAt)
  const parents = new Set(live.map((t) => t.parentId).filter(Boolean))
  return live.map(classifyTask).filter((e) => e.kind !== 'unscheduled' || !parents.has(e.task.id))
}
export const onDay = (event: CalendarEvent, day: string) =>
  !!event.start && !!event.end && event.start <= day && event.end >= day
export function eventTime(event: CalendarEvent) {
  if (!event.start) return 'Chưa xếp lịch'
  if (event.kind === 'multi-day')
    return `${dateLabel(event.start)} → ${dateLabel(event.end!)} · ${dayDistance(event.start, event.end!) + 1} ngày`
  if (event.kind === 'deadline')
    return `Hạn: ${dateLabel(event.start)}${event.task.deadline && minuteOf(event.task.deadline) !== null && !event.task.withinDay ? ' · ' + clockLabel(minuteOf(event.task.deadline)!) : ''}`
  if (event.minute !== null)
    return `${clockLabel(event.minute)}${event.endMinute !== null ? ' – ' + clockLabel(event.endMinute) : ''}`
  return 'Cả ngày'
}
export function calendarAttention(task: Task, now: number) {
  if (['done', 'cancelled'].includes(task.status)) return ''
  if (task.deadline && Date.parse(task.deadline) < now) return 'Quá hạn'
  if (task.priority === 'urgent') return 'Gấp'
  if (task.deadline && Date.parse(task.deadline) - now <= DAY) return 'Sắp đến hạn'
  return ''
}
// Shared lanes keep multi-day bars continuous across cells and split at weeks.
export function spanLayout(events: CalendarEvent[], days: string[]) {
  const rows: number[] = []
  return events
    .filter((e) => e.start && e.end && e.start <= days.at(-1)! && e.end >= days[0])
    .sort(
      (a, b) =>
        a.start!.localeCompare(b.start!) ||
        b.end!.localeCompare(a.end!) ||
        Number(['done', 'cancelled'].includes(a.task.status)) -
          Number(['done', 'cancelled'].includes(b.task.status)) ||
        Number(b.task.priority === 'urgent') - Number(a.task.priority === 'urgent') ||
        (a.minute ?? -1) - (b.minute ?? -1) ||
        a.task.id.localeCompare(b.task.id)
    )
    .map((event) => {
      const start = Math.max(0, dayDistance(days[0], event.start!)),
        end = Math.min(days.length - 1, dayDistance(days[0], event.end!))
      let row = rows.findIndex((last) => last < start)
      if (row < 0) row = rows.length
      rows[row] = end
      return { event, start, end, row }
    })
}
// Account for minimum click height when placing overlapping short events.
export function timedLayout(events: CalendarEvent[]) {
  const sorted = events
    .filter((e) => e.kind === 'timed')
    .sort((a, b) => a.minute! - b.minute! || a.task.id.localeCompare(b.task.id))
  const result: {
    event: CalendarEvent
    top: number
    height: number
    column: number
    columns: number
  }[] = []
  let cluster: typeof result = [],
    ends: number[] = [],
    clusterEnd = -1
  const finish = () => {
    cluster.forEach((item) => {
      item.columns = ends.length
    })
    cluster = []
    ends = []
  }
  for (const event of sorted) {
    const height = Math.max(44, (event.endMinute ?? event.minute!) - event.minute!)
    const top = event.minute!
    if (top >= clusterEnd) {
      finish()
      clusterEnd = -1
    }
    let column = ends.findIndex((end) => end <= top)
    if (column < 0) column = ends.length
    ends[column] = top + height
    clusterEnd = Math.max(clusterEnd, top + height)
    const item = { event, top, height, column, columns: 1 }
    cluster.push(item)
    result.push(item)
  }
  finish()
  return result
}

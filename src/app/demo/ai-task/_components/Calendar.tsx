'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, X } from 'lucide-react'
import { api, useTasks } from './Provider'
import TaskForm from './TaskForm'
import { useTaskCompletion } from './TaskWorkflow'
import CompletionSummary from './CompletionSummary'
import { dayKey, priorityLabels, statusLabels, type Task, type TaskInput } from '../_lib/model'
import { capitalizeTaskTitle } from '../_lib/task-presentation'
import { treePath } from '../_lib/tree'
import {
  addDays,
  calendarAttention,
  calendarEvents,
  classifyTask,
  clockLabel,
  dateLabel,
  dayDistance,
  eventTime,
  moveCalendar,
  onDay,
  spanLayout,
  timedLayout,
  weekStart,
  type CalendarEvent,
  type CalendarView,
} from '../_lib/calendar'
import type { TaskOverviewMemory } from '../_lib/task-memory'
import styles from './Calendar.module.css'

const views: [CalendarView, string][] = [
  ['month', 'Tháng'],
  ['week', 'Tuần'],
  ['day', 'Ngày'],
]
const inputFor = (t: Task): TaskInput => ({
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
})

export default function Calendar() {
  const { requestCompletion } = useTaskCompletion()
  const { groups, revision, busy, run, refresh, notify, acceptOverview } = useTasks()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [now, setNow] = useState(Date.now)
  const [day, setDay] = useState(() => dayKey(Date.now()))
  const [view, setView] = useState<CalendarView>('week')
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [actionError, setActionError] = useState('')
  const [requestId, setRequestId] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const timeline = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setView('day')
    const timer = window.setInterval(() => setNow(Date.now()), 60000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    api<{ tasks: Task[] }>(undefined, { resource: 'tree', view: 'all' }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setTasks(data.tasks)
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : 'Không tải được lịch.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [revision, reload])
  useEffect(() => {
    if (selected) dialog.current?.showModal()
    else dialog.current?.close()
  }, [selected])
  useEffect(() => {
    if (timeline.current) timeline.current.scrollTop = 6 * 60
  }, [view, day, loading])
  const events = useMemo(() => calendarEvents(tasks), [tasks])
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const groupMap = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])
  const today = dayKey(now)
  const firstDay =
    view === 'month' ? weekStart(day.slice(0, 7) + '-01') : view === 'week' ? weekStart(day) : day
  const days = Array.from({ length: view === 'month' ? 42 : view === 'week' ? 7 : 1 }, (_, i) =>
    addDays(firstDay, i)
  )
  const visible = events.filter(
    (e) => e.start && e.end && e.start <= days.at(-1)! && e.end >= days[0]
  )
  const unscheduled = events.filter((e) => e.kind === 'unscheduled')
  const active = selected ? taskMap.get(selected) : undefined
  const activeEvent = active ? classifyTask(active) : null
  const context = (task: Task) =>
    [
      groupMap.get(task.groupId)?.name || 'Chưa có nhóm',
      task.parentId ? taskMap.get(task.parentId)?.title : null,
    ]
      .filter(Boolean)
      .join(' · ')
  const openTask = (task: Task) => {
    setEditing(false)
    setActionError('')
    setRequestId(crypto.randomUUID())
    setSelected(task.id)
  }
  const openDay = (value: string) => {
    setDay(value)
    setView('day')
  }
  const save = async (data: TaskInput) => {
    if (!active) return
    await run(async () => {
      const saved = await api<{ result: { overview?: TaskOverviewMemory } }>({
        operation: 'saveTask',
        requestId,
        action: 'UPDATE_TASK',
        taskId: active.id,
        expectedVersion: active.version,
        data,
      })
      if (saved.result.overview) acceptOverview(saved.result.overview)
      setSelected(null)
      setEditing(false)
      notify('Đã cập nhật công việc.')
      setReload((v) => v + 1)
      try {
        await refresh()
      } catch {
        notify('Đã lưu công việc. Chưa tải lại được nhóm; hãy tải lại trang.')
      }
    })
  }
  const eventCard = (
    event: CalendarEvent,
    compact = false,
    extra?: string,
    style?: CSSProperties
  ) => {
    const task = event.task,
      color = groupMap.get(task.groupId)?.color || '#70847a',
      attention = calendarAttention(task, now)
    return (
      <button
        type="button"
        key={task.id}
        className={`${styles.event} ${compact ? styles.compact : ''} ${task.status === 'done' ? styles.done : ''} ${task.status === 'cancelled' ? styles.cancelled : ''}`}
        style={{ '--event-color': color, ...style } as CSSProperties}
        title={`${task.title}\n${context(task)}\n${eventTime(event)}${attention ? '\n' + attention : ''}`}
        aria-label={`${task.title}, ${context(task)}, ${eventTime(event)}${attention ? ', ' + attention : ''}`}
        onClick={() => openTask(task)}
      >
        <strong>
          {task.status === 'done' && <Check size={12} aria-label="Hoàn thành" />}
          {event.kind === 'deadline' && <Clock3 size={12} aria-hidden="true" />}
          {attention && (
            <span className={styles.attention} title={attention} aria-label={attention}>
              •
            </span>
          )}
          {compact && event.kind === 'timed' && (
            <span className={styles.clock}>{clockLabel(event.minute!)} </span>
          )}
          {task.title}
        </strong>
        {!compact && (
          <>
            <small>{extra || eventTime(event)}</small>
            <small>{context(task)}</small>
            {attention && <small>{attention}</small>}
          </>
        )}
      </button>
    )
  }
  const dayHeaders = (values: string[]) => (
    <div
      className={styles.dayHeaders}
      style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}
    >
      {values.map((value) => (
        <button
          key={value}
          className={value === today ? styles.today : ''}
          onClick={() => openDay(value)}
          aria-label={`Xem ngày ${dateLabel(value)}`}
        >
          <small>{dateLabel(value, { weekday: 'short' })}</small>
          <strong>{dateLabel(value)}</strong>
        </button>
      ))}
    </div>
  )
  const title =
    view === 'day'
      ? dateLabel(day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : view === 'week'
        ? `${dateLabel(days[0])} – ${dateLabel(days[6], { day: 'numeric', month: 'numeric', year: 'numeric' })}`
        : dateLabel(day, { month: 'long', year: 'numeric' })

  return (
    <div className={styles.calendar}>
      <div className="demo-page-heading">
        <div>
          <h1>Lịch</h1>
          <p>Nhìn rõ việc hôm nay, chủ động cho những ngày tới.</p>
        </div>
        <span className={styles.timezone}>Giờ Việt Nam · GMT+7</span>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.period}>
          <button aria-label="Kỳ trước" onClick={() => setDay(moveCalendar(day, view, -1))}>
            <ChevronLeft size={18} />
          </button>
          <h2 aria-live="polite">{title}</h2>
          <button aria-label="Kỳ sau" onClick={() => setDay(moveCalendar(day, view, 1))}>
            <ChevronRight size={18} />
          </button>
        </div>
        <div className={styles.controls}>
          <button onClick={() => setDay(dayKey(Date.now()))}>Hôm nay</button>
          <div className={styles.switcher} aria-label="Chế độ lịch">
            {views.map(([value, label]) => (
              <button key={value} aria-pressed={view === value} onClick={() => setView(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {error ? (
        <p className="demo-alert" role="alert">
          {error} <button onClick={() => setReload((v) => v + 1)}>Thử lại</button>
        </p>
      ) : loading ? (
        <p className="demo-empty" role="status">
          Đang tải lịch công việc…
        </p>
      ) : (
        <div className={styles.layout}>
          <section className={styles.board} aria-label="Lịch công việc">
            {!events.some((e) => e.start) && (
              <p className={styles.empty}>
                <CalendarDays size={22} />
                Chưa có công việc nào được xếp lịch.
              </p>
            )}
            {!visible.length && events.some((e) => e.start) && (
              <p className={styles.empty}>
                {view === 'day'
                  ? day === today
                    ? 'Hôm nay chưa có công việc nào. Một ngày khá thoáng.'
                    : 'Ngày này chưa có công việc nào.'
                  : 'Không có công việc trong khoảng thời gian này.'}
              </p>
            )}
            <div className={styles.horizontal}>
              {view === 'month' ? (
                <div className={styles.month}>
                  <div className={styles.weekdays}>
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>
                  {Array.from({ length: 6 }, (_, week) => {
                    const weekDays = days.slice(week * 7, week * 7 + 7),
                      spans = spanLayout(visible, weekDays)
                    return (
                      <div className={styles.monthWeek} key={weekDays[0]}>
                        {weekDays.map((value, column) => (
                          <div
                            key={value}
                            className={`${styles.monthCell} ${value.slice(0, 7) !== day.slice(0, 7) ? styles.outside : ''}`}
                            style={{ gridColumn: column + 1, gridRow: '1 / 6' }}
                          >
                            <button
                              className={value === today ? styles.today : ''}
                              onClick={() => openDay(value)}
                              aria-label={`Xem ngày ${dateLabel(value)}`}
                            >
                              {Number(value.slice(-2))}
                            </button>
                          </div>
                        ))}
                        {spans
                          .filter((s) => s.row < 3)
                          .map((s) => (
                            <div
                              key={s.event.task.id}
                              className={styles.monthEvent}
                              style={{
                                gridColumn: `${s.start + 1} / ${s.end + 2}`,
                                gridRow: s.row + 2,
                              }}
                            >
                              {eventCard(s.event, true)}
                            </div>
                          ))}
                        {weekDays.map((value, column) => {
                          const hidden = spans.filter(
                            (s) => s.row >= 3 && s.start <= column && s.end >= column
                          ).length
                          return hidden ? (
                            <button
                              className={styles.more}
                              style={{ gridColumn: column + 1, gridRow: 5 }}
                              key={value}
                              onClick={() => openDay(value)}
                            >
                              +{hidden} việc
                            </button>
                          ) : null
                        })}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className={view === 'week' ? styles.week : styles.day}>
                  <div className={styles.headerOffset}>{dayHeaders(days)}</div>
                  <div className={styles.allDay}>
                    <h3>Cả ngày & công việc dài</h3>
                    <div
                      className={styles.spans}
                      style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
                    >
                      {spanLayout(
                        visible.filter((e) => e.kind !== 'timed'),
                        days
                      ).map((s) => (
                        <div
                          key={s.event.task.id}
                          style={{
                            gridColumn: `${s.start + 1} / ${s.end + 2}`,
                            gridRow: s.row + 1,
                          }}
                        >
                          {eventCard(
                            s.event,
                            false,
                            view === 'day' && s.event.kind === 'multi-day'
                              ? `Đang thực hiện · ngày ${dayDistance(s.event.start!, day) + 1}/${dayDistance(s.event.start!, s.event.end!) + 1}`
                              : undefined
                          )}
                        </div>
                      ))}
                      {!visible.some((e) => e.kind !== 'timed') && (
                        <p className={styles.quiet}>Không có công việc cả ngày.</p>
                      )}
                    </div>
                  </div>
                  <div
                    className={styles.timelineScroll}
                    ref={timeline}
                    aria-label="Timeline 24 giờ"
                    tabIndex={0}
                  >
                    <div className={styles.timeline}>
                      <div className={styles.hours}>
                        {Array.from({ length: 24 }, (_, h) => (
                          <span key={h} style={{ top: h * 60 }}>
                            {String(h).padStart(2, '0')}:00
                          </span>
                        ))}
                      </div>
                      <div
                        className={styles.columns}
                        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
                      >
                        {days.map((value) => (
                          <div className={styles.timeColumn} key={value}>
                            {timedLayout(visible.filter((e) => onDay(e, value))).map((item) =>
                              eventCard(item.event, false, undefined, {
                                position: 'absolute',
                                top: item.top,
                                height: item.height,
                                left: `calc(${(item.column / item.columns) * 100}% + 2px)`,
                                width: `calc(${100 / item.columns}% - 4px)`,
                              })
                            )}
                            {value === today && (
                              <div
                                className={styles.now}
                                style={{ top: ((now + 7 * 3600000) % 86400000) / 60000 }}
                                aria-label="Giờ hiện tại"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.legend}>
              {groups
                .filter((g) => events.some((e) => e.task.groupId === g.id))
                .map((g) => (
                  <span key={g.id}>
                    <i style={{ background: g.color || '#70847a' }} />
                    {g.name}
                  </span>
                ))}
              <span>• Gấp / gần hạn / quá hạn</span>
            </div>
          </section>
          <aside className={styles.unscheduled}>
            <h2>
              Chưa xếp lịch <span>{unscheduled.length}</span>
            </h2>
            <p>Những việc chưa có ngày bắt đầu hoặc hạn hoàn thành.</p>
            <div className={styles.unscheduledList}>
              {unscheduled.map((e) => eventCard(e))}
              {!unscheduled.length && (
                <p className={styles.quiet}>Không có công việc đang chờ xếp lịch.</p>
              )}
            </div>
          </aside>
        </div>
      )}
      <dialog
        ref={dialog}
        className={`ai-task-dialog ${styles.detail}`}
        aria-labelledby="calendar-task-title"
        onCancel={(e) => {
          e.preventDefault()
          if (!busy) setSelected(null)
        }}
      >
        {active && activeEvent && (
          <>
            <div className={styles.detailHeading}>
              <div>
                <h2 id="calendar-task-title">{editing ? 'Chỉnh sửa công việc' : capitalizeTaskTitle(active.title)}</h2>
                <p className={styles.parent}>
                  {[groupMap.get(active.groupId)?.name, active.parentId ? treePath(active.parentId, tasks).replaceAll(' / ', ' › ') : null].filter(Boolean).join(' › ')}
                </p>
              </div>
              <button aria-label="Đóng chi tiết" disabled={busy} onClick={() => setSelected(null)}>
                <X size={20} />
              </button>
            </div>
            {editing ? (
              <TaskForm
                key={active.id}
                initial={inputFor(active)}
                before={active}
                action="UPDATE_TASK"
                groups={groups}
                busy={busy}
                onCancel={() => setEditing(false)}
                onSubmit={save}
              />
            ) : (
              <>
                <div className={styles.detailTime}>
                  <CalendarDays size={20} />
                  <div>
                    {activeEvent.start &&
                      activeEvent.kind !== 'multi-day' &&
                      activeEvent.kind !== 'deadline' && (
                        <p>
                          {dateLabel(activeEvent.start, {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    <strong>{eventTime(activeEvent)}</strong>
                  </div>
                </div>
                <dl className={styles.facts}>
                  <div>
                    <dt>Ưu tiên</dt>
                    <dd>{priorityLabels[active.priority]}</dd>
                  </div>
                  <div>
                    <dt>Trạng thái</dt>
                    <dd>{statusLabels[active.status]}</dd>
                  </div>
                </dl>
                <div className={styles.notes}>
                  <h3>Ghi chú</h3>
                  <p>{active.description || 'Chưa có ghi chú.'}</p>
                </div>
                <CompletionSummary task={active} />
                {actionError && (
                  <p className="demo-alert" role="alert">
                    {actionError}
                  </p>
                )}
                <div className="demo-form-actions">
                  <button disabled={busy} onClick={() => setEditing(true)}>
                    Chỉnh sửa
                  </button>
                  {!['done', 'cancelled'].includes(active.status) && (
                    <button
                      className="demo-primary"
                      disabled={busy}
                      onClick={() => requestCompletion({ data: inputFor(active), nodes: tasks, onConfirm: save })}
                    >
                      <Check size={16} />
                      {busy ? 'Đang lưu…' : 'Hoàn thành'}
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </dialog>
    </div>
  )
}

'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { api, useTasks } from './Provider'
import { dayKey, isOpen, type Task, type TaskInput, type TreeNode } from '../_lib/model'
import {
  expectedEnd,
  getReviewableTasks,
  reviewRules,
  taskContext,
  taskToInput,
  type CompletionRating,
} from '../_lib/task-review'
import type { TaskOverviewMemory } from '../_lib/task-memory'
import { leafTasks } from '../_lib/task-display'
import CompleteTaskDialog from './CompleteTaskDialog'
import TaskReviewDialog from './TaskReviewDialog'
import { ReviewReminderBanner, ReviewReminderToast } from './ReviewReminders'

type CompletionRequest = {
  data: TaskInput
  nodes?: TreeNode[]
  autoKey?: string
  onConfirm(data: TaskInput): Promise<void>
}
type Workflow = {
  requestCompletion(request: CompletionRequest): void
  openOverdueReview(): Promise<void>
}
const WorkflowContext = createContext<Workflow | null>(null)
export function useTaskCompletion() {
  const value = useContext(WorkflowContext)
  if (!value) throw new Error('Missing task completion provider')
  return value
}
function read(storage: 'localStorage' | 'sessionStorage', key: string) {
  try {
    return window[storage].getItem(key)
  } catch {
    return null
  }
}
function write(storage: 'localStorage' | 'sessionStorage', key: string, value: string) {
  try {
    window[storage].setItem(key, value)
  } catch {
    /* Reminders still work for this mount. */
  }
}

export default function TaskWorkflow({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { groups, revision, busy, run, refresh, notify, acceptOverview, context } = useTasks()
  const prefix = `ai-task-review:${user!.id}:`
  const [tasks, setTasks] = useState<Task[]>([])
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [now, setNow] = useState(Date.now)
  const [reload, setReload] = useState(0)
  const [completion, setCompletion] = useState<CompletionRequest | null>(null)
  const completionRef = useRef<CompletionRequest | null>(null)
  const autoCompletions = useRef(new Set<string>())
  const [reviewOpen, setReviewOpen] = useState(false)
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [leaving, setLeaving] = useState<string | null>(null)
  const [dueToast, setDueToast] = useState<Task | null>(null)
  const [snoozedUntil, setSnoozedUntil] = useState(
    () => Number(read('localStorage', prefix + 'dismissedUntil')) || 0
  )
  const automaticShown = useRef(read('sessionStorage', prefix + 'shown') === '1')
  const reviewedDay = useRef(read('localStorage', prefix + 'day'))
  const lastTick = useRef(Date.now())
  const lastHidden = useRef<number | null>(null)
  const notified = useRef(new Set<string>())
  const departureTimer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(
    () => () => {
      clearTimeout(departureTimer.current)
    },
    []
  )
  useEffect(() => {
    const controller = new AbortController()
    api<{ tasks: Task[] }>(undefined, { resource: 'tree', view: 'all' }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setTasks(data.tasks)
          setReady(true)
          setLoadError('')
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setLoadError(
            reason instanceof Error ? reason.message : 'Chưa tải được công việc cần rà soát.'
          )
      })
    return () => controller.abort()
  }, [revision, reload])
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now())
        setReload((v) => v + 1)
      }
    }
    const visibility = () => {
      if (document.visibilityState === 'hidden') lastHidden.current = Date.now()
      else {
        // Returning after a break refreshes the banner, never interrupts with a modal.
        if (lastHidden.current && Date.now() - lastHidden.current >= reviewRules.longBreak) {
          reviewedDay.current = dayKey(Date.now())
          write('localStorage', prefix + 'day', reviewedDay.current)
        }
        tick()
      }
    }
    const timer = window.setInterval(tick, 60000)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [prefix])
  const items = useMemo(() => getReviewableTasks(tasks, now), [tasks, now])
  const overdueItems = useMemo(() => {
    const ids = new Set(
      leafTasks(tasks.filter(isOpen), tasks)
        .filter((task) => task.deadline && Date.parse(task.deadline) < now)
        .map((task) => task.id)
    )
    return items.filter((item) => ids.has(item.task.id))
  }, [tasks, now, items])
  const requestCompletion = useCallback((request: CompletionRequest) => {
    if (completionRef.current || (request.autoKey && autoCompletions.current.has(request.autoKey)))
      return
    if (request.autoKey) autoCompletions.current.add(request.autoKey)
    completionRef.current = request
    setCompletion(request)
  }, [])
  const closeCompletion = () => {
    completionRef.current = null
    setCompletion(null)
  }
  const markShown = useCallback(() => {
    automaticShown.current = true
    reviewedDay.current = dayKey(Date.now())
    write('sessionStorage', prefix + 'shown', '1')
    write('localStorage', prefix + 'day', reviewedDay.current)
  }, [prefix])
  useEffect(() => {
    if (
      !ready ||
      !items.length ||
      snoozedUntil > now ||
      automaticShown.current ||
      reviewedDay.current === dayKey(now)
    )
      return
    const timer = window.setTimeout(() => {
      if (document.visibilityState !== 'visible') return
      const active = document.activeElement
      const interrupted =
        busy ||
        completionRef.current ||
        context.mode !== 'idle' ||
        document.querySelector(
          'dialog[open], .demo-chat-confirmation, .ai-task-form, .demo-mic.listening'
        ) ||
        active?.matches('input, textarea, select, [contenteditable="true"]') ||
        Array.from(
          document.querySelectorAll<HTMLTextAreaElement>('.demo-chat-input textarea')
        ).some((e) => e.value.trim())
      markShown()
      if (!interrupted) {
        setOverdueOnly(false)
        setReviewOpen(true)
      }
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [ready, items.length, now, snoozedUntil, busy, context.mode, markShown])
  useEffect(() => {
    const from = lastTick.current
    lastTick.current = now
    if (!ready || now <= from || snoozedUntil > now) return
    const due = tasks.find((task) => {
      const end = expectedEnd(task)
      return (
        isOpen(task) &&
        end !== null &&
        end > from &&
        end <= now &&
        !notified.current.has(`${task.id}:${end}`)
      )
    })
    if (due) {
      notified.current.add(`${due.id}:${expectedEnd(due)}`)
      if (!reviewOpen && !completionRef.current) setDueToast(due)
    }
  }, [now, ready, tasks, snoozedUntil, reviewOpen])
  useEffect(() => {
    if (dueToast && !tasks.some((t) => t.id === dueToast.id && isOpen(t))) setDueToast(null)
  }, [tasks, dueToast])
  const completeTask = (task: Task) => {
    const requestId = crypto.randomUUID()
    requestCompletion({
      data: taskToInput(task),
      onConfirm: async (data) => {
        await run(async () => {
          const result = await api<{ result: { overview?: TaskOverviewMemory } }>({
            operation: 'saveTask',
            requestId,
            action: 'UPDATE_TASK',
            taskId: task.id,
            expectedVersion: task.version,
            data,
          })
          if (result.result.overview) acceptOverview(result.result.overview)
          setDueToast(null)
          setLeaving(task.id)
          departureTimer.current = setTimeout(() => {
            setTasks((old) =>
              old.map((t) => (t.id === task.id ? { ...t, ...data, status: 'done' } : t))
            )
            setLeaving(null)
            void refresh().catch(() => setReload((v) => v + 1))
          }, 220)
          notify('Đã hoàn thành công việc.')
        })
      },
    })
  }
  const snooze = () => {
    const until = Date.now() + reviewRules.snooze
    write('localStorage', prefix + 'dismissedUntil', String(until))
    setSnoozedUntil(until)
    setReviewOpen(false)
    setDueToast(null)
    markShown()
  }
  return (
    <WorkflowContext.Provider
      value={{
        requestCompletion,
        openOverdueReview: async () => {
          if (busy || completionRef.current) return
          markShown()
          try {
            await run(async () => {
              const data = await api<{ tasks: Task[] }>(undefined, {
                resource: 'tree',
                view: 'all',
              })
              setTasks(data.tasks)
              setReady(true)
              setLoadError('')
              setNow(Date.now())
              setDueToast(null)
              setOverdueOnly(true)
              setReviewOpen(true)
            })
          } catch (reason) {
            notify(reason instanceof Error ? reason.message : 'Không tải được công việc quá hạn.')
          }
        },
      }}
    >
      {ready && items.length > 0 && snoozedUntil <= now && (
        <ReviewReminderBanner
          count={items.length}
          disabled={busy || !!completion}
          onReview={() => {
            markShown()
            setOverdueOnly(false)
            setDueToast(null)
            setReviewOpen(true)
          }}
        />
      )}
      {loadError && (
        <p className="demo-alert" role="status">
          Chưa tải được phần rà soát.{' '}
          <button onClick={() => setReload((v) => v + 1)}>Thử lại</button>
        </p>
      )}
      {children}
      {reviewOpen && (
        <TaskReviewDialog
          items={overdueOnly ? overdueItems : items}
          overdueOnly={overdueOnly}
          context={(task) => taskContext(task, groups, tasks)}
          leaving={leaving}
          disabled={busy || !!completion}
          onComplete={completeTask}
          onUpdate={async (task, deadline) => {
            await run(async () => {
              const data = {
                ...taskToInput(task),
                ...(deadline === null
                  ? { status: 'cancelled' as const }
                  : { deadline, scheduleMode: 'deadline' as const, duration: null }),
              }
              const saved = await api<{ result: { overview?: TaskOverviewMemory } }>({
                operation: 'saveTask',
                requestId: crypto.randomUUID(),
                action: 'UPDATE_TASK',
                taskId: task.id,
                expectedVersion: task.version,
                data,
              })
              if (saved.result.overview) acceptOverview(saved.result.overview)
              setTasks((old) =>
                old.map((t) =>
                  t.id === task.id
                    ? {
                        ...t,
                        ...data,
                        updatedAt: new Date().toISOString(),
                        version: t.version + 1,
                      }
                    : t
                )
              )
              setDueToast(null)
              notify(deadline === null ? 'Đã hủy công việc.' : 'Đã đổi deadline.')
              await refresh().catch(() => setReload((v) => v + 1))
            })
          }}
          onClose={() => {
            markShown()
            setReviewOpen(false)
          }}
          onSnooze={snooze}
        />
      )}
      {dueToast && !reviewOpen && !completion && snoozedUntil <= now && (
        <ReviewReminderToast
          task={dueToast}
          disabled={busy}
          onComplete={() => completeTask(dueToast)}
          onLater={() => setDueToast(null)}
        />
      )}
      {completion && (
        <CompleteTaskDialog
          title={completion.data.title}
          context={taskContext(completion.data, groups, completion.nodes || tasks)}
          onCancel={closeCompletion}
          onConfirm={async (rating: CompletionRating) => {
            await completion.onConfirm({ ...completion.data, ...rating, status: 'done' })
            closeCompletion()
          }}
        />
      )}
    </WorkflowContext.Provider>
  )
}

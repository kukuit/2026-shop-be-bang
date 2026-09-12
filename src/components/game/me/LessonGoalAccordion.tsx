'use client'

import { useQuery } from '@tanstack/react-query'
import { lessonGoalOptions } from '@/lib/game-progress/queries'
import type { SubjectId } from '@/lib/game-progress/config'
import { goalStatus } from '@/lib/game-progress/model'
import { ProgressError, ProgressLoading } from './ProgressStates'

const tones = {
  empty: 'bg-slate-100 text-slate-500', insufficient: 'bg-slate-100 text-slate-600',
  'needs-practice': 'bg-rose-50 text-rose-700', practicing: 'bg-amber-50 text-amber-800',
  mastered: 'bg-emerald-50 text-emerald-700', excellent: 'bg-blue-50 text-blue-700',
}

export default function LessonGoalAccordion({ userId, grade, subject, lessonId, isExpanded }: {
  userId: string; grade: number; subject: SubjectId; lessonId: string; isExpanded: boolean
}) {
  const query = useQuery({ ...lessonGoalOptions(userId, grade, subject, lessonId), enabled: !!userId && isExpanded })
  if (!isExpanded) return null
  if (query.isError) return <ProgressError retry={() => { void query.refetch() }} message="Không thể tải mục tiêu bài học." />
  if (!query.data) return <ProgressLoading label="Đang tải mục tiêu…" />
  return <div>
    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Mục tiêu bài học</h4>
    {!query.data.goals.length && <p className="mt-3 text-sm text-slate-500">Mục tiêu của bài này đang được bổ sung.</p>}
    <div className="mt-3 divide-y divide-slate-100">
      {query.data.goals.map(goal => {
        const status = goalStatus(goal.correct, goal.attempts)
        return <div key={goal.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-800">{goal.title}</p>
            <p className="mt-1 text-xs text-slate-500">{goal.attempts ? `${goal.correct} đúng · ${goal.wrong} sai / ${goal.attempts} lượt` : 'Chưa có dữ liệu trả lời'}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-sm font-bold text-slate-800">{goal.accuracy === null ? '—' : `${goal.accuracy}% đúng`}</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tones[status.tone]}`}>{status.label}</span>
          </div>
        </div>
      })}
    </div>
    <p className="mt-3 text-xs text-slate-500">Mỗi lượt trả lời đều được tính. Cần ít nhất 5 lượt để đánh giá một mục tiêu.</p>
  </div>
}

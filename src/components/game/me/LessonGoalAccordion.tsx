'use client'

import { useQuery } from '@tanstack/react-query'
import { lessonGoalOptions } from '@/lib/game-progress/queries'
import type { SubjectId } from '@/lib/game-progress/config'
import { currentGoalAccuracy, goalStatus } from '@/lib/game-progress/model'
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
        const status = goalStatus(goal.recent.correct, goal.recent.attempts)
        const assessment = currentGoalAccuracy(goal, goal.recent)
        const trend = goal.improvement ?? 0
        const progressColor = trend > 0 ? 'bg-emerald-100' : trend < 0 ? 'bg-amber-100' : 'bg-slate-200'
        const progressText = trend > 0 ? 'text-emerald-700' : trend < 0 ? 'text-amber-800' : 'text-slate-600'
        return <div key={goal.id} className="grid grid-cols-1 items-center gap-3 py-3 md:grid-cols-[minmax(0,1fr)_16rem] md:gap-6">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-800">{goal.title}</p>
            <p className="mt-1 text-xs text-slate-500">{goal.recent.attempts ? `Gần đây: ${goal.recent.correct} đúng / ${goal.recent.attempts} lượt` : 'Chưa có lượt trả lời cho mục tiêu này trong 50 phiên gần nhất của bài'}</p>
            <p className="mt-1 text-xs text-slate-500">{goal.attempts ? `Toàn bộ lịch sử: ${goal.correct} đúng · ${goal.wrong} sai / ${goal.attempts} lượt (${goal.accuracy}%)` : 'Chưa có dữ liệu tổng hợp lịch sử'}</p>
            {goal.improvement !== null && <p className={`mt-1 text-xs font-semibold ${goal.improvement > 0 ? 'text-emerald-700' : goal.improvement < 0 ? 'text-amber-800' : 'text-slate-600'}`}>
              {goal.improvement > 0 ? `Tiến bộ +${goal.improvement}` : goal.improvement < 0 ? `Giảm ${Math.abs(goal.improvement)}` : 'Không đổi: 0'} điểm phần trăm so với {goal.previous.attempts} lượt trước ({goal.previous.accuracy}%).
            </p>}
          </div>
          <div className="ml-auto flex w-full max-w-64 flex-col items-end gap-2">
            <span className={`relative isolate inline-flex w-full items-center justify-center overflow-hidden bg-slate-50 px-3 py-2 text-sm font-bold ${progressText}`}>
              <span aria-hidden="true" className={`absolute inset-y-0 left-0 -z-10 ${progressColor}`} style={{ width: `${Math.max(0, Math.min(100, assessment.accuracy ?? 0))}%` }} />
              {assessment.accuracy === null ? '—' : `${assessment.accuracy}% ${assessment.source === 'recent' ? 'gần đây' : 'tích lũy'}`}
            </span>
            <span className={`px-2.5 py-1 text-right text-xs font-semibold ${tones[status.tone]}`}>{goal.recent.attempts ? status.label : 'Chưa có đánh giá gần đây'}</span>
          </div>
        </div>
      })}
    </div>
    <p className="mt-3 text-xs text-slate-500">Mỗi lượt trả lời đều được tính, gồm lần thử lại. Tỷ lệ dùng tối đa 20 lượt mới nhất của từng mục tiêu trong 50 phiên gần nhất của bài; dưới 5 lượt gần đây thì dùng tổng đúng / (tổng đúng + tổng sai) của toàn bộ lịch sử. Đánh giá và so sánh tiến bộ vẫn cần ít nhất 5 lượt trong mỗi khoảng.</p>
  </div>
}

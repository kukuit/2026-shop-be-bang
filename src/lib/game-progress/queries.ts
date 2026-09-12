import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { fetchWithAuthRetry } from '@/lib/auth/client-fetch'
import type { SubjectId } from './config'
import type { LessonGoalProgress, SubjectProgress } from './model'
import type { SessionPage, SessionSummary } from './service'
import type { AdminSessionResult } from '@/lib/gameTrackingAdmin'

export const progressKeys = {
  subject: (userId: string, grade: number, subject: SubjectId) => ['game', 'me', 'subject-progress', userId, grade, subject] as const,
  goals: (userId: string, lessonId: string) => ['game', 'me', 'lesson-goal-progress', userId, lessonId] as const,
  sessions: (userId: string) => ['game', 'me', 'sessions', userId] as const,
  session: (userId: string, sessionId: string) => ['game', 'me', 'session-detail', userId, sessionId] as const,
}
export const progressCache = { staleTime: 5 * 60_000, gcTime: 30 * 60_000, refetchOnWindowFocus: false, retry: false } as const

async function readProgress<T extends { userId: string }>(userId: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const response = await fetchWithAuthRetry(`/api/game/me?${new URLSearchParams(params)}`, { cache: 'no-store', signal })
  const body = await response.json()
  if (!response.ok) throw new Error(body.message ?? 'Không thể tải dữ liệu.')
  if (body.userId !== userId) throw new Error('Tài khoản đã thay đổi. Vui lòng tải lại trang.')
  return body as T
}

export const subjectProgressOptions = (userId: string, grade: number, subject: SubjectId) => queryOptions({
  ...progressCache, queryKey: progressKeys.subject(userId, grade, subject),
  queryFn: ({ signal }) => readProgress<SubjectProgress>(userId, { resource: 'subject', grade: String(grade), subject }, signal),
})
export const lessonGoalOptions = (userId: string, grade: number, subject: SubjectId, lessonId: string) => queryOptions({
  ...progressCache, queryKey: progressKeys.goals(userId, lessonId),
  queryFn: ({ signal }) => readProgress<LessonGoalProgress>(userId, { resource: 'goals', grade: String(grade), subject, lessonId }, signal),
})
export const sessionOptions = (userId: string, sessionId: string) => queryOptions({
  ...progressCache, queryKey: progressKeys.session(userId, sessionId),
  queryFn: ({ signal }) => readProgress<SessionSummary & { results: AdminSessionResult[] }>(userId, { resource: 'session', sessionId }, signal),
})
export const sessionsOptions = (userId: string) => infiniteQueryOptions({
  ...progressCache, queryKey: progressKeys.sessions(userId), initialPageParam: null as string | null,
  // Keep earlier immutable pages cached; users explicitly refresh to see newly saved sessions.
  refetchOnMount: false,
  queryFn: ({ pageParam, signal }) => readProgress<SessionPage & { userId: string }>(userId,
    { resource: 'sessions', ...(pageParam ? { cursor: pageParam } : {}) }, signal),
  getNextPageParam: last => last.nextCursor ?? undefined,
})

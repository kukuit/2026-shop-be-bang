'use client'

import { fetchWithAuthRetry } from '@/lib/auth/client-fetch'
import { localTeachingGet, localTeachingPost, LocalGatewayError } from '../_services/offline/local-teaching.gateway'
import { getActiveTeachingWorkspace } from '../_services/offline/workspace-runtime'

export class TeachingRequestError extends Error {
  conflicts?: { id: string; title: string; startAt: string; scheduledDurationMinutes: number }[]
  scheduleConflicts?: { first: { dayOfWeek: number; startTime: string; durationMinutes: number }; second: { dayOfWeek: number; startTime: string; durationMinutes: number } }[]
  constructor(message: string, conflicts?: TeachingRequestError['conflicts'], scheduleConflicts?: TeachingRequestError['scheduleConflicts']) {
    super(message)
    this.name = 'TeachingRequestError'
    this.conflicts = conflicts
    this.scheduleConflicts = scheduleConflicts
  }
}

export async function teachingGet<T>(params: Record<string, string>): Promise<T> {
  if (getActiveTeachingWorkspace()?.mode === 'LOCAL') {
    try { return await localTeachingGet<T>(params) }
    catch (error) { throw asTeachingRequestError(error) }
  }
  return request<T>(`/demo/ai-task/api/teaching?${new URLSearchParams(params)}`, { cache: 'no-store' })
}
export async function teachingPost<T>(body: unknown): Promise<T> {
  if (getActiveTeachingWorkspace()?.mode === 'LOCAL') {
    try { return await localTeachingPost<T>(body) }
    catch (error) { throw asTeachingRequestError(error) }
  }
  return request<T>('/demo/ai-task/api/teaching', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}
function asTeachingRequestError(error: unknown) {
  if (error instanceof TeachingRequestError) return error
  if (error instanceof LocalGatewayError) return new TeachingRequestError(error.message, error.conflicts, error.scheduleConflicts as TeachingRequestError['scheduleConflicts'])
  return error instanceof Error ? new TeachingRequestError(error.message) : new TeachingRequestError('Không thể xử lý yêu cầu.')
}
async function request<T>(url: string, init: RequestInit) {
  const response = await fetchWithAuthRetry(url, init)
  const data = await response.json()
  if (!response.ok) throw new TeachingRequestError(data.error || 'Không thể xử lý yêu cầu.', data.conflicts, data.scheduleConflicts)
  return data as T
}

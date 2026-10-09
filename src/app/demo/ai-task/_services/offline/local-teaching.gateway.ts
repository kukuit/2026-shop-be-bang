'use client'

import { z } from 'zod'
import { attendanceConfirmationInputSchema, completionInputSchema, sessionInputSchema, sessionListFiltersSchema, studentInputSchema, studentPaymentInputSchema, teachingSettingsSchema } from '../../_lib/teaching-model'
import {
  localCompleteSession, localConfirmAttendance, localDashboard, localGetSession, localGetSettings, localListSessions,
  localListStudents, localListWeeklySchedules, localMaterializeRecurringSessions, localMonthOverview,
  localOverviewPageData, localRecordStudentPayment, localReviewCount, localSaveSession, localSaveSettings, localSaveStudent, localSetSessionCancelled,
  localStudentBillingSummary, LocalTeachingError,
} from './local-teaching.repository'
import { getLocalWorkspace } from './workspaces'
import { getActiveTeachingWorkspace } from './workspace-runtime'

export class LocalGatewayError extends Error {
  conflicts?: LocalTeachingError['conflicts']
  scheduleConflicts?: LocalTeachingError['scheduleConflicts']
  constructor(message: string, conflicts?: LocalGatewayError['conflicts'], scheduleConflicts?: LocalGatewayError['scheduleConflicts']) {
    super(message); this.name = 'LocalGatewayError'; this.conflicts = conflicts; this.scheduleConflicts = scheduleConflicts
  }
}

async function requireLocalWorkspace() {
  const active = getActiveTeachingWorkspace()
  if (!active || active.mode !== 'LOCAL') throw new Error('Hãy mở một bộ dữ liệu offline trước khi tiếp tục.')
  const workspace = await getLocalWorkspace(active.id)
  if (!workspace || workspace.mode !== 'LOCAL') throw new Error('Không còn tìm thấy dữ liệu offline này trên thiết bị.')
  return workspace.id
}

function filtersFrom(params: Record<string, string>) {
  return Object.fromEntries(['studentId', 'status', 'needsReview', 'from', 'to', 'query'].flatMap(key => params[key] === undefined ? [] : [[key, params[key]]]))
}

export async function localTeachingGet<T>(params: Record<string, string>): Promise<T> {
  const workspaceId = await requireLocalWorkspace()
  const resource = params.resource || 'sessions'
  switch (resource) {
    case 'students': return { students: await localListStudents(workspaceId) } as T
    case 'studentsPageData': {
      const [students, settings] = await Promise.all([localListStudents(workspaceId), localGetSettings(workspaceId)])
      return { students, settings } as T
    }
    case 'billingSummary': return await localStudentBillingSummary(workspaceId) as T
    case 'weeklySchedules': {
      const input = z.object({ studentId: z.string().min(1), date: z.string().optional() }).strict().parse({ studentId: params.studentId, ...(params.date ? { date: params.date } : {}) })
      return { weeklySchedules: await localListWeeklySchedules(workspaceId, input.studentId, input.date) } as T
    }
    case 'settings': return { settings: await localGetSettings(workspaceId) } as T
    case 'dashboard': return await localDashboard(workspaceId) as T
    case 'reviewCount': return { count: await localReviewCount(workspaceId) } as T
    case 'sessions': {
      const filters = sessionListFiltersSchema.parse(filtersFrom(params))
      if (params.materialize !== 'false') await localMaterializeRecurringSessions(workspaceId, filters.from, filters.to)
      return { sessions: await localListSessions(workspaceId, filtersFrom(params), false) } as T
    }
    case 'sessionsPageData': {
      const filters = sessionListFiltersSchema.parse(filtersFrom(params))
      const prepared = await localMaterializeRecurringSessions(workspaceId, filters.from, filters.to)
      const [sessions, students, settings] = await Promise.all([
        localListSessions(workspaceId, filtersFrom(params), false),
        Promise.resolve(prepared.students), Promise.resolve(prepared.settings),
      ])
      return { sessions, students, settings, materializedRanges: prepared.materializedRanges } as T
    }
    case 'sessionsRangeData': {
      const filters = sessionListFiltersSchema.parse(filtersFrom(params))
      return { sessions: await localListSessions(workspaceId, { ...filtersFrom(params), query: undefined }, false) } as T
    }
    case 'session': return { session: await localGetSession(workspaceId, z.string().min(1).parse(params.id)) } as T
    case 'overview': {
      const year = z.coerce.number().int().min(2000).max(9999).parse(params.year)
      const month = z.coerce.number().int().min(1).max(12).parse(params.month)
      return await localMonthOverview(workspaceId, year, month - 1) as T
    }
    case 'overviewPageData': {
      return await localOverviewPageData(workspaceId) as T
    }
    default: throw new Error('Không tìm thấy tài nguyên.')
  }
}

export async function localTeachingPost<T>(rawBody: unknown): Promise<T> {
  const workspaceId = await requireLocalWorkspace()
  const operation = z.object({ operation: z.string().min(1) }).passthrough().parse(rawBody)
  try {
    switch (operation.operation) {
      case 'saveStudent': {
        const input = z.object({ operation: z.literal('saveStudent'), data: studentInputSchema, allowScheduleOverlap: z.boolean().optional() }).strict().parse(rawBody)
        return { student: await localSaveStudent(workspaceId, input.data, input.allowScheduleOverlap) } as T
      }
      case 'recordStudentPayment': {
        const input = z.object({ operation: z.literal('recordStudentPayment'), data: studentPaymentInputSchema }).strict().parse(rawBody)
        return await localRecordStudentPayment(workspaceId, input.data) as T
      }
      case 'saveSettings': {
        const input = z.object({ operation: z.literal('saveSettings'), data: teachingSettingsSchema }).strict().parse(rawBody)
        return { settings: await localSaveSettings(workspaceId, input.data) } as T
      }
      case 'saveSession': {
        const input = z.object({ operation: z.literal('saveSession'), data: sessionInputSchema, allowOverlap: z.boolean().optional() }).strict().parse(rawBody)
        return { session: await localSaveSession(workspaceId, input.data, input.allowOverlap) } as T
      }
      case 'sessionStatus': {
        const input = z.object({ operation: z.literal('sessionStatus'), sessionId: z.string().min(1), action: z.enum(['cancel', 'restore']), reason: z.string().trim().max(1000).nullable().optional() }).strict().parse(rawBody)
        return { session: await localSetSessionCancelled(workspaceId, input.sessionId, input.action === 'cancel', input.reason || null) } as T
      }
      case 'completeSession': {
        const input = z.object({ operation: z.literal('completeSession'), data: completionInputSchema }).strict().parse(rawBody)
        return { session: await localCompleteSession(workspaceId, input.data) } as T
      }
      case 'confirmAttendance': {
        const input = z.object({ operation: z.literal('confirmAttendance'), data: attendanceConfirmationInputSchema }).strict().parse(rawBody)
        return { session: await localConfirmAttendance(workspaceId, input.data.sessionId) } as T
      }
      default: throw new Error('Không tìm thấy thao tác.')
    }
  } catch (error) {
    if (error instanceof LocalTeachingError) throw new LocalGatewayError(error.message, error.conflicts, error.scheduleConflicts)
    throw error
  }
}

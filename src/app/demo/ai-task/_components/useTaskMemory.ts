'use client'
import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './Provider'
import { newContext, readContext, type TaskConversationMemory, type TaskOverviewMemory } from '../_lib/task-memory'

export function useTaskMemory(userId?: string) {
  const client = useQueryClient()
  const key = ['ai-task', 'memory', userId]
  const storageKey = `ai-task-chat-context:${userId}`
  const [session, setSession] = useState<{ owner?: string; context: TaskConversationMemory }>({ context: newContext() })
  const overviewQuery = useQuery({ queryKey: key, queryFn: () => api<{ overview: TaskOverviewMemory }>(undefined, { resource: 'memory' }), enabled: !!userId, staleTime: Infinity, gcTime: Infinity, retry: false })
  useEffect(() => {
    let context = newContext()
    if (userId) try { context = readContext(JSON.parse(sessionStorage.getItem(storageKey) || 'null')) } catch { /* Storage can be unavailable. */ }
    setSession({ owner: userId, context })
  }, [userId, storageKey])
  const setContext = useCallback((context: TaskConversationMemory) => {
    const next = { ...context, updatedAt: Date.now() }
    setSession({ owner: userId, context: next })
    if (userId) try { sessionStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* Keep the in-memory draft usable. */ }
  }, [userId, storageKey])
  const acceptOverview = (overview: TaskOverviewMemory) => client.setQueryData(key, { overview })
  return { overview: overviewQuery.data?.overview || {}, overviewLoading: overviewQuery.isPending, overviewError: overviewQuery.error,
    reloadOverview: overviewQuery.refetch, acceptOverview, context: session.owner === userId ? session.context : newContext(), setContext,
    contextReady: session.owner === userId }
}

'use client'
import { useRef } from 'react'
import type { Message } from '@/app/demo/ai-task/_lib/model'
import { loadBrowserContext, readBrowserContext, saveBrowserContext } from './browserContext'
import type { AssistantBrowserContext } from '../types'

export function useBrowserContext(uid?: string) {
  const session = useRef<{ uid?: string; value: AssistantBrowserContext }>({
    value: { updatedAt: Date.now() },
  })
  const current = () => {
    if (session.current.uid !== uid)
      session.current = { uid, value: uid ? loadBrowserContext(uid) : { updatedAt: Date.now() } }
    return readBrowserContext(session.current.value)
  }
  const remember = (messages: Message[], confirmedTaskId?: string) => {
    const previous = current()
    const reply = messages.find((message) => message.role === 'assistant')
    if (!reply) return
    const taskId =
      confirmedTaskId ||
      reply.resultTaskId ||
      reply.proposal?.taskId ||
      (reply.recognition?.result.action === 'task.detail'
        ? reply.recognition.result.target?.taskId
        : undefined)
    const ids =
      reply.displayGroups?.flatMap((group) => group.tasks.map((task) => task.id)) ||
      reply.tasks?.map((task) => task.id) ||
      reply.candidates?.map((task) => task.id)
    const value: AssistantBrowserContext = {
      ...previous,
      updatedAt: Date.now(),
      lastMessageId: reply.id,
      ...(reply.recognition?.result.action ? { lastAction: reply.recognition.result.action } : {}),
      ...(reply.recognition ? {
        previousIntent: reply.recognition.result.intent,
        pendingIntent: reply.recognition.result.decision === 'confirm_interpretation' ? reply.recognition.result.intent : undefined,
        pendingEntities: reply.recognition.result.entities,
        recentTurns: [...(previous.recentTurns || []), { text: reply.recognition.originalText.slice(0, 500), intent: reply.recognition.result.intent, at: Date.now() }].slice(-8),
        ...(reply.recognition.result.entities?.person ? { activePerson: reply.recognition.result.entities.person } : {}),
        ...(reply.recognition.result.entities?.project ? { activeProject: reply.recognition.result.entities.project } : {}),
        ...(reply.recognition.result.speechAct === 'CONTEXT_SETTING' ? { activeTopic: reply.recognition.originalText, activePerson: reply.recognition.result.entities?.person } : {}),
      } : {}),
      ...(reply.intent?.filters ? { lastQuery: reply.intent.filters } : {}),
      ...(ids
        ? { lastTaskIds: ids.slice(0, 30), lastTaskId: ids.length === 1 ? ids[0] : undefined }
        : {}),
      ...(taskId ? { lastTaskId: taskId, activeTaskId: taskId, lastTaskIds: [taskId], recentMentionedTaskIds: [taskId, ...(previous.recentMentionedTaskIds || [])].slice(0, 30) } : {}),
      ...(reply.proposal
        ? {
            lastGroupId: reply.proposal.data.groupId,
            lastParentId: reply.proposal.data.parentId,
            ...(!reply.proposal.taskId && reply.status === 'pending'
              ? { lastTaskId: undefined, lastTaskIds: [] }
              : {}),
          }
        : {}),
    }
    session.current = { uid, value }
    if (uid) saveBrowserContext(uid, value)
  }
  const clear = () => {
    const value = { updatedAt: Date.now() }
    session.current = { uid, value }
    if (uid) saveBrowserContext(uid, value)
  }
  return { current, remember, clear }
}

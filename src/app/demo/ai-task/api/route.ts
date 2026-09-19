import { taskReply } from '../_lib/assistant-replies'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/current-user'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { filterSchema, idSchema } from '../_lib/model'
import { findTasks, findTaskTree, getGroups, getMessages, getTurn, getParentOptions, initialize, messageCollection, sessionRef } from '../_services/repository'
import { appendTurn, cancelProposal, chooseTask, confirmProposal, prepareIntent, proposeManual, saveManualTask, saveGroup, summary } from '../_services/task.service'
import { describeMemory } from '../_services/work-memory'
import { contextSchema, overviewSchema, newContext, readContext, resolveTaskMemory } from '../_lib/task-memory'
import { scanTasks } from '../_services/repository'
import { parseTaskIntent } from '../_services/ai-task-parser'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
const mutationSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('initialize') }).strict(),
  z.object({ operation: z.literal('chat'), text: z.string().trim().min(1).max(4000), requestId: idSchema, context: contextSchema.optional(), overview: overviewSchema.optional(), pendingId: idSchema.optional() }).strict(),
  z.object({ operation: z.literal('propose'), requestId: idSchema, action: z.enum(['CREATE_TASK', 'CREATE_SUBTASK', 'UPDATE_TASK', 'DELETE_TASK', 'RESTORE_TASK']), data: z.unknown().optional(), taskId: idSchema.optional(), expectedVersion: z.number().int().positive().optional() }).strict(),
  z.object({ operation: z.literal('saveTask'), requestId: idSchema, action: z.enum(['CREATE_TASK', 'CREATE_SUBTASK', 'UPDATE_TASK']), data: z.unknown(), taskId: idSchema.optional(), expectedVersion: z.number().int().positive().optional() }).strict(),
  z.object({ operation: z.literal('confirm'), messageId: idSchema, data: z.unknown() }).strict(),
  z.object({ operation: z.literal('cancel'), messageId: idSchema }).strict(),
  z.object({ operation: z.literal('choose'), messageId: idSchema, taskId: idSchema, context: contextSchema.optional(), overview: overviewSchema.optional() }).strict(),
  z.object({ operation: z.literal('saveGroup'), id: idSchema.optional(), data: z.unknown() }).strict(),
])
function failure(error: unknown) {
  if (error instanceof z.ZodError) return json({ error: 'Thông tin không hợp lệ. Kiểm tra lại các trường trong form.' }, 400)
  console.error('[ai-task]', error instanceof Error ? error.message : 'Request failed')
  const message = error instanceof Error ? error.message : ''
  // Do not return raw infrastructure errors or credentials to clients.
  return json({ error: /^[A-ZÀ-ỸĐ]/.test(message) && !/firestore|credential|FIREBASE|PERMISSION|quota|index/i.test(message) ? message : 'Không thể xử lý yêu cầu. Vui lòng thử lại.' }, 400)
}
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth.ok) return json({ error: 'Vui lòng đăng nhập.' }, 401)
    const uid = auth.user.id
    const params = req.nextUrl.searchParams
    switch (params.get('resource') || 'tasks') {
      case 'chatState': return json({ pendingId: (await sessionRef(uid).get()).get('pendingId') || null })
      case 'turn': return json(await getTurn(uid, idSchema.parse(params.get('messageId'))))
      case 'memory': return json(await describeMemory(uid))
      case 'groups': return json({ groups: await getGroups(uid) })
      case 'messages': return json(await getMessages(uid, params.has('before') ? z.coerce.number().int().positive().parse(params.get('before')) : undefined))
      case 'summary': return json(await summary(uid))
      case 'parents': return json(await getParentOptions(uid, params.has('taskId') ? idSchema.parse(params.get('taskId')) : undefined))
      case 'tree': {
        const filters = filterSchema.parse(Object.fromEntries(Array.from(params.entries()).filter(([key, value]) => key !== 'resource' && value !== '')))
        return json(await findTaskTree(uid, filters))
      }
      case 'tasks': {
        const page = z.coerce.number().int().min(0).max(100000).parse(params.get('page') || 0)
        const filters = filterSchema.parse(Object.fromEntries(Array.from(params.entries()).filter(([key, value]) => key !== 'resource' && key !== 'page' && value !== '')))
        return json(await findTasks(uid, filters, page))
      }
      default: return json({ error: 'Không tìm thấy tài nguyên.' }, 404)
    }
  } catch (error) { return failure(error) }
}
export async function POST(req: NextRequest) {
  const rejected = rejectCrossSiteMutation(req)
  if (rejected) return rejected
  try {
    const auth = await requireAuth()
    if (!auth.ok) return json({ error: 'Vui lòng đăng nhập.' }, 401)
    const raw = await req.text()
    if (raw.length > 20000) return json({ error: 'Yêu cầu quá lớn.' }, 413)
    const input = mutationSchema.parse(JSON.parse(raw))
    const uid = auth.user.id
    let result: unknown
    switch (input.operation) {
      case 'initialize': await initialize(uid); result = { groups: await getGroups(uid) }; break
      case 'saveGroup': result = await saveGroup(uid, input.data, input.id); break
      case 'propose': result = await proposeManual(uid, input.requestId, input.action, input.data, input.taskId, input.expectedVersion); break
      case 'saveTask': result = await saveManualTask(uid, input.requestId, input.action, input.data, input.taskId, input.expectedVersion); break
      case 'confirm': result = await confirmProposal(uid, input.messageId, input.data); break
      case 'cancel': result = await cancelProposal(uid, input.messageId); break
      case 'choose': result = await chooseTask(uid, input.messageId, input.taskId, readContext(input.context), input.overview || {}); break
      case 'chat': {
        const existing = await messageCollection(uid).doc(input.requestId).get()
        if (existing.exists) { const proposal = existing.get('proposal'); result = { id: existing.id, context: proposal ? { ...readContext(input.context), mode: proposal.taskId ? 'editing-task' : 'creating-task', activeDraft: proposal.data, updatedAt: Date.now() } : readContext(input.context) }; break }
        let context = readContext(input.context)
        const overview = input.overview || {}
        const groups = await getGroups(uid)
        const intent = await parseTaskIntent(input.text, groups, new Date(), { memory: JSON.stringify({ mode: context.mode, activeTitle: context.activeDraft.title }), history: [] })
        // A new create request starts a fresh task; only conversation defaults carry over.
        if (intent.action === 'CREATE_TASK' || intent.action === 'CREATE_SUBTASK') context = { ...context, conversationDefaults: { ...context.conversationDefaults, ...overviewSchema.pick({ groupId: true, parentId: true, priority: true, status: true }).parse(context.activeDraft) }, activeDraft: {}, mode: 'creating-task' }
        let reply = await prepareIntent(uid, intent, undefined, context, overview)
        if (reply.memoryUpdate) {
          const update = reply.memoryUpdate
          if (update.reset) context = newContext()
          else {
            const values = { ...update.values, ...(update.notes !== undefined ? { description: update.notes } : {}) }
            context = { ...context, activeDraft: { ...context.activeDraft, ...values }, updatedAt: Date.now() }
            if (context.mode === 'idle') context.conversationDefaults = { ...context.conversationDefaults, ...overviewSchema.pick({ groupId: true, parentId: true, priority: true, status: true }).parse(values) }
            if (context.activeDraft.title) {
              const resolved = resolveTaskMemory(values, context, overview, groups, await scanTasks(uid))
              if (input.pendingId) {
                const previous = await messageCollection(uid).doc(input.pendingId).get()
                const proposal = previous.get('proposal')
                if (!proposal || previous.get('status') !== 'pending') throw new Error('Bản nháp không còn chờ xác nhận.')
                reply = { status: 'pending', content: `Được, mình sửa “${resolved.data.title}” như bạn vừa nói nhé.`, proposal: { ...proposal, data: resolved.data } }
              } else reply = { status: 'pending', content: taskReply('CREATE_TASK', resolved.data.title), proposal: { action: 'CREATE_TASK', taskId: null, expectedVersion: null, before: null, data: resolved.data } }
            }
          }
        }
        if (reply.proposal) context = { ...context, mode: reply.proposal.taskId ? 'editing-task' : 'creating-task', activeDraft: reply.proposal.data, updatedAt: Date.now() }
        const turn = await appendTurn(uid, input.requestId, input.text, reply, input.pendingId)
        result = { ...turn, context }

        break
      }
    }
    return json({ ok: true, result })
  } catch (error) { return failure(error) }
}

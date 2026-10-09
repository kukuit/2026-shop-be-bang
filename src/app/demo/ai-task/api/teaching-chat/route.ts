import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/current-user'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { teachingChatIdSchema } from '../../_lib/teaching-chat'
import {
  cancelTeachingChatProposal, clearTeachingAssistantMemory, clearTeachingChatContext, clearTeachingChatMessages,
  confirmTeachingChatProposal, getTeachingAssistantMemory, getTeachingChatContext, getTeachingChatMessages,
  getTeachingChatState, getTeachingChatTurn, appendTeachingChatTurn,
} from '../../_services/teaching-chat-store'
import { executeTeachingChatProposal, prepareTeachingChatTurn } from '../../_services/teaching-chat-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
const inputSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('chat'), text: z.string().trim().min(1).max(4000), requestId: teachingChatIdSchema, pendingId: teachingChatIdSchema.optional() }).strict(),
  z.object({ operation: z.literal('confirm'), messageId: teachingChatIdSchema }).strict(),
  z.object({ operation: z.literal('cancel'), messageId: teachingChatIdSchema }).strict(),
  z.object({ operation: z.literal('clearMemory') }).strict(),
  z.object({ operation: z.literal('clearContext') }).strict(),
  z.object({ operation: z.literal('clearHistory') }).strict(),
])

function failure(error: unknown) {
  if (error instanceof z.ZodError) return json({ error: 'Thông tin gửi lên chưa hợp lệ.' }, 400)
  const message = error instanceof Error ? error.message : ''
  const safe = [
    'Hãy ', 'Bạn ', 'Mình ', 'Không tìm thấy', 'Chỉ có thể', 'Buổi học', 'Một mục tiêu',
    'Danh sách mục tiêu', 'Chỉ chọn học viên', 'Ngày hiệu lực', 'Lịch tuần', 'Học viên',
    'Đề xuất', 'Trợ lý', 'Chưa cấu hình',
  ].some(prefix => message.startsWith(prefix))
  if (!safe) console.error('[teaching-chat]', message || 'Request failed')
  return json({ error: safe ? message : 'Không thể xử lý yêu cầu chat. Vui lòng thử lại.' }, 400)
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth.ok) return json({ error: 'Vui lòng đăng nhập.' }, 401)
    const uid = auth.user.id
    const params = req.nextUrl.searchParams
    switch (params.get('resource') || 'messages') {
      case 'state': return json(await getTeachingChatState(uid))
      case 'memory': {
        const [memory, context, state] = await Promise.all([getTeachingAssistantMemory(uid), getTeachingChatContext(uid), getTeachingChatState(uid)])
        return json({ memory, context, pendingId: state.pendingId })
      }
      case 'messages': return json(await getTeachingChatMessages(uid, 10))
      case 'turn': return json(await getTeachingChatTurn(uid, teachingChatIdSchema.parse(params.get('messageId'))))
      default: return json({ error: 'Không tìm thấy tài nguyên chat.' }, 404)
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
    if (raw.length > 20000) return json({ error: 'Yêu cầu chat quá lớn.' }, 413)
    const input = inputSchema.parse(JSON.parse(raw))
    const uid = auth.user.id
    if (input.operation === 'clearMemory') return json({ ok: true, memory: await clearTeachingAssistantMemory(uid) })
    if (input.operation === 'clearContext') return json({ ok: true, context: await clearTeachingChatContext(uid) })
    if (input.operation === 'clearHistory') {
      await clearTeachingChatMessages(uid)
      return json({ ok: true })
    }
    if (input.operation === 'cancel') {
      await cancelTeachingChatProposal(uid, input.messageId)
      return json({ ok: true })
    }
    if (input.operation === 'confirm') {
      const result = await confirmTeachingChatProposal(uid, input.messageId, executeTeachingChatProposal)
      return json({ ok: true, result })
    }

    const existing = await getTeachingChatTurn(uid, input.requestId)
    if (existing.messages.length) return json({ ok: true, result: { id: input.requestId } })
    const prepared = await prepareTeachingChatTurn(uid, input.text, input.requestId, input.pendingId)
    const result = await appendTeachingChatTurn({
      uid, requestId: input.requestId, text: input.text, reply: prepared.reply, context: prepared.context, replacePendingId: input.pendingId,
    })
    return json({ ok: true, result })
  } catch (error) { return failure(error) }
}

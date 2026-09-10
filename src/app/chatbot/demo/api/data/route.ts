import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDemoData } from '../../_services/repository'
import { mutate, resetDemo } from '../../_services/business'
import { seedDemo } from '../../_services/seed'
import { chat, cancelChat, clearChat } from '../../_services/chat'
import { entities } from '../../_lib/model'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET() { try { return NextResponse.json(await getDemoData(), { headers: { 'Cache-Control': 'no-store' } }) } catch { return NextResponse.json({ error: 'Không kết nối được Firestore. Kiểm tra FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL và FIREBASE_PRIVATE_KEY trên server.' }, { status: 503 }) } }
export async function POST(req: NextRequest) {
  try {
    if (req.headers.get('origin') && req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Origin không hợp lệ' }, { status: 403 })
    const raw = await req.text(); if (raw.length > 100000) throw new Error('Yêu cầu quá lớn')
    const body = JSON.parse(raw)
    let result: unknown
    if (body.action === 'seed') result = await seedDemo()
    else if (body.action === 'reset') result = await resetDemo(body.confirmation)
    else if (body.action === 'chat') result = await chat(z.string().max(4000).parse(body.text), body.source === 'voice' ? 'voice' : 'chat')
    else if (body.action === 'cancelChat') result = await cancelChat(z.string().parse(body.id))
    else if (body.action === 'clearChat' && body.confirmation === 'CLEAR CHAT') result = await clearChat()
    else {
      const input = z.object({ entity: z.enum(entities), operation: z.enum(['save', 'delete', 'pay']), id: z.string().optional(), data: z.unknown().optional(), amount: z.number().optional(), source: z.enum(['form', 'chat', 'voice', 'import']).optional(), requestId: z.string(), confirmationId: z.string().optional() }).parse(body)
      if (['chat', 'voice'].includes(input.source || '') && !input.confirmationId) throw new Error('Chat cần xác nhận trước khi lưu')
      result = await mutate(input, input.confirmationId ? { id: input.confirmationId } : undefined)
    }
    return NextResponse.json({ ok: true, result })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể xử lý yêu cầu' }, { status: 400 }) }
}

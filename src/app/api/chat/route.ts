// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { callChatModel, ClientMessage } from '@/lib/chat/provider'
import { isChatContext } from '@/lib/chat/constants'

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = (await req.json()) as { messages: ClientMessage[]; context: unknown }

    if (!isChatContext(context)) {
      return NextResponse.json({ error: 'Ngữ cảnh chatbot không hợp lệ.' }, { status: 400 })
    }

    const reply = await callChatModel(messages, context)

    return NextResponse.json({ reply })
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      {
        error: error?.message || 'An error occurred, please try again later.',
      },
      { status: 500 }
    )
  }
}

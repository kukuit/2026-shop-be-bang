'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Mic, Send, Trash2 } from 'lucide-react'
import ChatMessage from '@/components/chat/ChatMessage'
import VoiceInputSlot from '@/components/chat/VoiceInputSlot'
import { useVoice } from '@/hooks/useVoice'
import { fetchWithAuthRetry } from '@/lib/auth/client-fetch'
import { useAuth } from '@/components/auth/AuthProvider'
import type { TeachingAssistantMemory, TeachingChatContext, TeachingChatMessage } from '../_lib/teaching-chat'
import { newTeachingChatContext } from '../_lib/teaching-chat'

async function chatApi<T>(body?: unknown, resource?: string, signal?: AbortSignal): Promise<T> {
  const query = resource ? '?' + (resource.includes('=') ? resource : 'resource=' + encodeURIComponent(resource)) : ''
  const response = await fetchWithAuthRetry('/demo/ai-task/api/teaching-chat' + query, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal }
    : { cache: 'no-store', signal })
  const data = await response.json()
  if (!response.ok) throw new Error(response.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : data.error || 'Không thể xử lý yêu cầu chat.')
  return data
}

type ChatState = { pendingId: string | null; context: TeachingChatContext }
const emptyMemory: TeachingAssistantMemory = { note: null, defaultSubject: null, defaultDurationMinutes: null, updatedAt: null }

export default function Chat() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<TeachingChatMessage[]>([])
  const [chatState, setChatState] = useState<ChatState>({ pendingId: null, context: newTeachingChatContext() })
  const [memory, setMemory] = useState(emptyMemory)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [text, setText] = useState('')
  const [voiceText, setVoiceText] = useState(false)
  const [outgoing, setOutgoing] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const request = useRef<{ text: string; id: string } | null>(null)
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const pendingRef = useRef<HTMLDivElement>(null)
  const pending = messages.find(message => message.status === 'pending')
  const lastMessageId = messages[messages.length - 1]?.id
  const hideVoice = !voiceText && !!text
  const voice = useVoice(value => { setText(value); setVoiceText(true) }, setNotice, !busy && !loading && !error && !hideVoice)

  const mergeMessages = useCallback((incoming: TeachingChatMessage[]) => setMessages(old => {
    const merged = new Map(old.map(message => [message.id, message]))
    incoming.forEach(message => merged.set(message.id, message))
    return Array.from(merged.values()).sort((a, b) => a.sequence - b.sequence)
  }), [])

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [state, memoryData, history] = await Promise.all([
        chatApi<ChatState>(undefined, 'state', signal),
        chatApi<{ memory: TeachingAssistantMemory; context: TeachingChatContext; pendingId: string | null }>(undefined, 'memory', signal),
        chatApi<{ messages: TeachingChatMessage[] }>(undefined, 'messages', signal),
      ])
      if (signal?.aborted) return
      setChatState({ pendingId: state.pendingId, context: memoryData.context })
      setMemory(memoryData.memory)
      mergeMessages(history.messages)
      setError('')
    } catch (reason) {
      if (!signal?.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được cuộc trò chuyện.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [mergeMessages])

  const loadTurn = async (messageId: string) => {
    const data = await chatApi<{ messages: TeachingChatMessage[] }>(undefined, 'resource=turn&messageId=' + encodeURIComponent(messageId))
    mergeMessages(data.messages)
    return data.messages
  }

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load, user?.id])

  useLayoutEffect(() => {
    const area = input.current
    if (!area) return
    area.style.height = 'auto'
    area.style.height = Math.min(area.scrollHeight, 180) + 'px'
  }, [text])

  useEffect(() => {
    const container = list.current
    if (!container) return
    if (pendingRef.current) {
      container.scrollTo({ top: container.scrollTop + pendingRef.current.getBoundingClientRect().top - container.getBoundingClientRect().top - 60 })
    } else container.scrollTop = container.scrollHeight
  }, [lastMessageId, pending?.status, outgoing])

  const perform = async (body: Record<string, unknown>) => {
    setBusy(true)
    setNotice('')
    try {
      await chatApi({ ...body })
      await load()
      return true
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Không xử lý được yêu cầu.')
      return false
    } finally { setBusy(false) }
  }

  const send = async () => {
    const submitted = text.trim()
    if (!submitted || busy || loading || voice.listening || error) return
    const previousRequest = request.current
    const requestId = previousRequest && previousRequest.text === submitted ? previousRequest.id : crypto.randomUUID()
    request.current = { text: submitted, id: requestId }
    setBusy(true)
    setOutgoing(submitted)
    setNotice('')
    try {
      const response = await chatApi<{ result: { id: string } }>({
        operation: 'chat', text: submitted, requestId,
        ...(chatState.pendingId ? { pendingId: chatState.pendingId } : {}),
      })
      const id = response.result?.id || requestId
      await loadTurn(id)
      const history = await chatApi<{ messages: TeachingChatMessage[] }>(undefined, 'messages')
      mergeMessages(history.messages)
      setText('')
      setVoiceText(false)
      request.current = null
      const state = await chatApi<ChatState>(undefined, 'state')
      const memoryData = await chatApi<{ memory: TeachingAssistantMemory; context: TeachingChatContext }>(undefined, 'memory')
      setChatState(state)
      setMemory(memoryData.memory)
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Gửi tin nhắn thất bại.')
    } finally {
      setBusy(false)
      setOutgoing('')
    }
  }

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const history = await chatApi<{ messages: TeachingChatMessage[] }>(undefined, 'messages')
      mergeMessages(history.messages)
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Không tải được lịch sử chat.')
    } finally { setHistoryLoading(false) }
  }

  const clearContext = async () => {
    if (await perform({ operation: 'clearContext' })) setChatState({ pendingId: null, context: newTeachingChatContext() })
  }
  const clearMemory = async () => {
    if (await perform({ operation: 'clearMemory' })) setMemory(emptyMemory)
  }
  const clearHistory = async () => {
    if (!window.confirm('Xóa toàn bộ lịch sử chat trợ lý dạy thêm? Bộ nhớ dài hạn vẫn được giữ.')) return
    if (await perform({ operation: 'clearHistory' })) {
      setMessages([])
      setChatState({ pendingId: null, context: newTeachingChatContext() })
    }
  }

  return <div className="demo-chat-view ai-task-chat ai-teaching-chat">
    <div className="demo-page-heading ai-task-chat-heading">
      <h1>Trợ lý dạy thêm</h1>
      <details className="ai-task-memory">
        <summary>Bộ nhớ dạy thêm</summary>
        <div className="ai-task-before ai-task-memory-panel">
          <section>
            <strong>Bộ nhớ lâu dài</strong>
            <p>{memory.note || 'Chưa có ghi nhớ riêng. Bạn có thể yêu cầu “hãy nhớ…” trong chat.'}</p>
            {memory.defaultSubject && <p>Môn mặc định: {memory.defaultSubject}</p>}
            {memory.defaultDurationMinutes && <p>Thời lượng mặc định: {memory.defaultDurationMinutes} phút</p>}
            {memory.updatedAt && <small>Cập nhật {formatTime(memory.updatedAt)}</small>}
            <button type="button" disabled={busy || !hasMemory(memory)} onClick={() => void clearMemory()}>Xóa bộ nhớ lâu dài</button>
          </section>
          <section>
            <strong>Ngữ cảnh hội thoại</strong>
            <p>Học viên đang nhắc: {chatState.context.activeStudentName || 'Chưa chọn'}</p>
            <p>Buổi học đang nhắc: {chatState.context.activeSessionSummary || 'Chưa chọn'}</p>
            <p>{chatState.context.pendingDraft ? 'Đề xuất: ' + chatState.context.pendingDraft.summary : 'Không có đề xuất chờ xác nhận.'}</p>
            <small>Ngữ cảnh tự hết hạn sau 2 giờ không hoạt động.</small>
            <button type="button" disabled={busy} onClick={() => void clearContext()}>Xóa ngữ cảnh chat</button>
          </section>
          <button type="button" className="ai-task-chat-clear" disabled={busy || !messages.length} onClick={() => void clearHistory()}><Trash2 size={14} /> Xóa lịch sử chat</button>
        </div>
      </details>
    </div>
    <section className="demo-chat">
      {messages.length > 0 && <button className="ai-task-history" type="button" disabled={busy || historyLoading} onClick={() => void loadHistory()}>{historyLoading ? 'Đang tải…' : '↻ Tải lại 10 tin nhắn gần nhất'}</button>}
      <div className="demo-chat-messages" ref={list} aria-label="Cuộc trò chuyện với trợ lý dạy thêm">
        {loading && <p role="status">Đang mở trợ lý dạy thêm…</p>}
        {error && <div className="demo-alert" role="alert">{error} <button type="button" onClick={() => void load()}>Thử lại</button></div>}
        {!loading && !error && !messages.length && <div className="ai-teaching-welcome">
          <strong>Chào bạn, mình có thể hỗ trợ quản lý việc dạy thêm.</strong>
          <p>Ví dụ: “Hôm nay có những buổi nào?”, “Thêm học viên Minh Anh”, “Lịch sử học phí tháng này”.</p>
        </div>}
        {messages.map(message => <div className={'demo-chat-turn ' + message.role} key={message.id}>
          <ChatMessage role={message.role} content={message.content} assistantName="AI Dạy thêm" />
          {message.proposal && message.status === 'pending' && <div className="demo-chat-confirmation ai-teaching-proposal" ref={pendingRef}>
            <strong>Đề xuất cần xác nhận</strong>
            <p>{message.proposal.summary}</p>
            <details><summary>Xem dữ liệu sẽ lưu</summary><pre>{JSON.stringify(message.proposal.data, null, 2)}</pre></details>
            <div className="ai-teaching-proposal-actions">
              <button type="button" className="demo-primary" disabled={busy} onClick={() => void perform({ operation: 'confirm', messageId: message.id })}>Xác nhận và lưu</button>
              <button type="button" disabled={busy} onClick={() => void perform({ operation: 'cancel', messageId: message.id })}>Hủy</button>
            </div>
          </div>}
          {message.proposal && message.status === 'confirmed' && <small className="ai-teaching-message-state">Đã xác nhận</small>}
          {message.proposal && message.status === 'cancelled' && <small className="ai-teaching-message-state">Đã hủy đề xuất</small>}
        </div>)}
        {chatState.pendingId && !pending && <p className="demo-alert">Có đề xuất chưa mở. <button type="button" disabled={busy} onClick={() => void loadTurn(chatState.pendingId!)}>Mở đề xuất</button> <button type="button" disabled={busy} onClick={() => void perform({ operation: 'cancel', messageId: chatState.pendingId })}>Hủy</button></p>}
        {outgoing && <div className="demo-chat-turn user"><ChatMessage role="user" content={outgoing} assistantName="AI Dạy thêm" /><p role="status">Đang xem lịch và thông tin dạy thêm…</p></div>}
      </div>
      {notice && <p className="ai-teaching-chat-notice" role="status">{notice}</p>}
      <form className="demo-chat-input demo-chat-voice-input" onSubmit={event => { event.preventDefault(); void send() }}>
        <VoiceInputSlot hidden={hideVoice}><button type="button" className={'demo-mic ' + (voice.listening ? 'listening' : '')} disabled={!voice.supported || busy || loading || !!error || hideVoice} tabIndex={hideVoice ? -1 : 0} onClick={voice.toggle} aria-pressed={voice.listening} aria-label={voice.listening ? 'Dừng ghi âm' : 'Nhập bằng giọng nói'} title={!voice.supported ? 'Trình duyệt chưa hỗ trợ nhập giọng nói' : undefined}><Mic size={24} /></button></VoiceInputSlot>
        <textarea ref={input} rows={1} maxLength={4000} placeholder="Hỏi về học viên, lịch dạy hoặc học phí…" aria-label="Tin nhắn cho trợ lý dạy thêm" disabled={busy || loading || !!error} value={text} onChange={event => { setText(event.target.value); setVoiceText(false) }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send() } }} />
        <button className="demo-primary" aria-label="Gửi tin nhắn" disabled={busy || loading || !!error || voice.listening || !text.trim()}><Send size={20} /></button>
      </form>
      <p className={'demo-chat-hint' + (voice.listening ? '' : ' ai-task-keyboard-hint')}>{voice.listening ? 'Đang nghe… Dừng ghi âm rồi kiểm tra nội dung và bấm Gửi.' : 'Enter để gửi · Shift + Enter để xuống dòng · Dữ liệu theo giờ Việt Nam'}</p>
    </section>
  </div>
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })
}
function hasMemory(value: TeachingAssistantMemory) {
  return !!(value.note || value.defaultSubject || value.defaultDurationMinutes)
}

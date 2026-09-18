'use client'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Mic, Send } from 'lucide-react'
import ChatMessage from '@/components/chat/ChatMessage'
import VoiceInputSlot from '@/components/chat/VoiceInputSlot'
import { useVoice } from '@/hooks/useVoice'
import { api, useTasks } from './Provider'
import TaskForm from './TaskForm'
import TaskCard from './TaskCard'
import type { Message } from '../_lib/model'

export default function Chat() {
  const { groups, revision, busy, run, refresh, notify } = useTasks()
  const [messages, setMessages] = useState<Message[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [voiceText, setVoiceText] = useState(false)
  const [outgoing, setOutgoing] = useState('')
  const request = useRef<{ text: string; id: string } | null>(null)
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const pendingRef = useRef<HTMLDivElement>(null)
  const pending = messages.find(m => m.status === 'pending' || m.status === 'choose')
  const lastMessageId = messages[messages.length - 1]?.id
  const hideVoice = !voiceText && !!text
  const voice = useVoice(t => { setText(t); setVoiceText(true) }, notify, !busy && !loading && !pending && !hideVoice)
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await api<{ messages: Message[]; hasMore: boolean }>(undefined, { resource: 'messages' }, signal)
      setMessages(data.messages); setHasMore(data.hasMore); setError('')
    } catch (reason) { if (!signal?.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được lịch sử.') }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [])
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load, revision])
  useLayoutEffect(() => {
    const area = input.current
    if (!area) return
    area.style.height = 'auto'; area.style.height = `${Math.min(area.scrollHeight, 240)}px`
  }, [text])
  useEffect(() => {
    const container = list.current
    if (!container) return
    if (pendingRef.current) container.scrollTo({ top: container.scrollTop + pendingRef.current.getBoundingClientRect().top - container.getBoundingClientRect().top - 60 })
    else container.scrollTop = container.scrollHeight
  }, [lastMessageId, pending?.status, outgoing])
  const perform = async (body: unknown) => {
    await run(async () => { await api(body); await load(); await refresh() })
  }
  const cancel = (id: string) => { void perform({ operation: 'cancel', messageId: id }).catch(e => notify(e.message)) }
  const send = async () => {
    const submitted = text.trim()
    if (!submitted || busy || pending || voice.listening || loading || error) return
    if (request.current?.text !== submitted) request.current = { text: submitted, id: crypto.randomUUID() }
    try {
      await run(async () => { setOutgoing(submitted); await api({ operation: 'chat', text: submitted, requestId: request.current!.id }); setText(''); setVoiceText(false); request.current = null; await load() })
    } catch (reason) { notify(reason instanceof Error ? reason.message : 'Gửi thất bại.') }
    finally { setOutgoing('') }
  }
  return <div className="demo-chat-view ai-task-chat">
    <div className="demo-page-heading"><div><h1>Trợ lý công việc</h1><p>Nói điều bạn cần làm. Xem lại và xác nhận trước khi lưu.</p></div></div>
    <section className="demo-chat">
      <div className="demo-chat-messages" ref={list} aria-label="Cuộc trò chuyện">
        {hasMore && <button disabled={busy} onClick={() => { void run(async () => { const container = list.current; const height = container?.scrollHeight || 0; const data = await api<{ messages: Message[]; hasMore: boolean }>(undefined, { resource: 'messages', before: String(messages[0].sequence) }); setMessages(old => [...data.messages, ...old]); setHasMore(data.hasMore); requestAnimationFrame(() => { if (container) container.scrollTop += container.scrollHeight - height }) }).catch(e => notify(e.message)) }}>Xem tin nhắn trước</button>}
        {loading && <p role="status">Đang tải lịch sử…</p>}
        {error && <div className="demo-alert" role="alert">{error} <button onClick={() => void load()}>Thử lại</button></div>}
        {messages.map(m => <div className={`demo-chat-turn ${m.role}`} key={m.id}>
          <ChatMessage role={m.role} content={m.content} assistantName="AI Task" />
          {m.tasks && <div className="ai-task-results">{m.tasks.map(t => <TaskCard key={t.id} task={t} groups={groups} />)}</div>}
          {m.status === 'choose' && <div className="demo-chat-confirmation ai-task-choice" ref={pendingRef}><p>Chọn công việc:</p>{m.candidates?.map(t => <div key={t.id}><TaskCard task={t} groups={groups} linked={false} path={m.candidatePaths?.[t.id]} /><button disabled={busy} onClick={() => { void perform({ operation: 'choose', messageId: m.id, taskId: t.id }).catch(e => notify(e.message)) }}>Chọn {t.title}</button></div>)}<button disabled={busy} onClick={() => cancel(m.id)}>Hủy yêu cầu</button></div>}
          {m.proposal && (m.status === 'pending' ? <div className="demo-chat-confirmation demo-inline-confirmation" ref={pendingRef}><TaskForm key={m.id} initial={m.proposal.data} before={m.proposal.before} action={m.proposal.action} groups={groups} busy={busy} onCancel={() => cancel(m.id)} submitLabel={m.proposal.action === 'DELETE_TASK' ? 'Xác nhận xóa' : m.proposal.action === 'RESTORE_TASK' ? 'Xác nhận khôi phục' : 'Xác nhận lưu'} onSubmit={data => perform({ operation: 'confirm', messageId: m.id, data })} /></div> : <div className="demo-confirm-card"><strong>{m.proposal.data.title}</strong><p>{m.status === 'confirmed' ? '✓ Đã xác nhận và lưu' : 'Đã hủy đề xuất'}</p></div>)}
          {!m.proposal && m.status === 'cancelled' && <small>Đã hủy yêu cầu</small>}
        </div>)}
        {outgoing && <div className="demo-chat-turn user"><ChatMessage role="user" content={outgoing} assistantName="AI Task" /><p role="status">Đang phân tích…</p></div>}
      </div>
      {pending && <p className="demo-chat-pending">Xác nhận, chọn công việc hoặc hủy yêu cầu phía trên để tiếp tục.</p>}
      <form className="demo-chat-input demo-chat-voice-input" onSubmit={e => { e.preventDefault(); void send() }}>
        <VoiceInputSlot hidden={hideVoice}><button type="button" className={`demo-mic ${voice.listening ? 'listening' : ''}`} disabled={!voice.supported || busy || loading || !!pending || !!error || hideVoice} tabIndex={hideVoice ? -1 : 0} onClick={voice.toggle} aria-pressed={voice.listening} aria-label={voice.listening ? 'Dừng ghi âm' : 'Nhập bằng giọng nói'} title={!voice.supported ? 'Trình duyệt chưa hỗ trợ nhập giọng nói' : undefined}><Mic size={24} /></button></VoiceInputSlot>
        <textarea ref={input} rows={1} maxLength={4000} placeholder="Ví dụ: EDA đang làm…" aria-label="Tin nhắn" disabled={busy || loading || !!pending || !!error} value={text} onChange={e => { setText(e.target.value); setVoiceText(false) }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send() } }} />
        <button className="demo-primary" aria-label="Gửi tin nhắn" disabled={busy || loading || !!pending || !!error || voice.listening || !text.trim()}><Send size={20} /></button>
      </form><p className="demo-chat-hint">{voice.listening ? 'Đang nghe… Dừng ghi âm rồi kiểm tra nội dung và bấm Gửi.' : 'Enter để gửi · Shift + Enter để xuống dòng · Giờ Việt Nam'}</p>
    </section>
  </div>
}

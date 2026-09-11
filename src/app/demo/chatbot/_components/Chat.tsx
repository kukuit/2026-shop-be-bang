'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Bot, Check, Mic, Send, Sparkles, Trash2 } from 'lucide-react'
import { Entity, Row, modules, formatVND, displayName } from '../_lib/model'
import { sortChatMessages } from '../_lib/chat-order'
import { api, useDemo } from './Provider'
import EntityForm from './EntityForm'
import { useVoice } from '../_hooks/useVoice'

type Action = { entity: Entity; data: Partial<Row>; operation: 'save'; source: string }

export default function Chat({ compact = false }: { compact?: boolean }) {
  const { data, refresh, notify, loading, error, chatBusy, runChatOperation } = useDemo()
  const [text, setText] = useState('')
  const [source, setSource] = useState('chat')
  const [sending, setSending] = useState(false)
  const [outgoing, setOutgoing] = useState<{ text: string; replyId?: string } | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messageList = useRef<HTMLDivElement>(null)
  const confirmationRef = useRef<HTMLDivElement>(null)
  const messages = sortChatMessages(data.chatMessages)
  const pending = messages.find(m => m.status === 'waiting_confirmation')
  const blocked = loading || Boolean(error) || chatBusy || Boolean(pending)
  const voice = useVoice(t => { setText(t); setSource('voice') }, notify)
  const showOutgoing = outgoing && (!outgoing.replyId || !messages.some(m => m.id === outgoing.replyId))

  useEffect(() => {
    if (outgoing?.replyId && data.chatMessages.some(m => m.id === outgoing.replyId)) setOutgoing(null)
  }, [outgoing, data.chatMessages])

  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input) return
    const resize = () => {
      input.style.height = 'auto'
      input.style.height = Math.min(input.scrollHeight, 240) + 'px'
      input.style.overflowY = input.scrollHeight > input.clientHeight ? 'auto' : 'hidden'
    }
    resize()
    let width = input.clientWidth
    const observer = new ResizeObserver(() => {
      if (input.clientWidth !== width) { width = input.clientWidth; resize() }
    })
    observer.observe(input)
    return () => observer.disconnect()
  }, [text])

  useEffect(() => {
    const list = messageList.current
    if (!list) return
    const confirmation = confirmationRef.current
    // Keep the user's request visible above the reply and the beginning of its form.
    const anchor = confirmation?.closest('.demo-chat-turn')?.previousElementSibling || confirmation
    const top = anchor
      ? list.scrollTop + anchor.getBoundingClientRect().top - list.getBoundingClientRect().top - 12
      : list.scrollHeight
    list.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [messages.length, pending?.id, sending])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || blocked || sending || voice.listening) return
    const submitted = text.trim()
    try {
      await runChatOperation(async () => {
        setSending(true)
        setOutgoing({ text: submitted })
        try {
          const response = await api({ action: 'chat', text: submitted, source })
          setOutgoing({ text: submitted, replyId: response.result.id })
          setText('')
          setSource('chat')
          await refresh()
        } catch (e) { setOutgoing(null); throw e }
        finally { setSending(false) }
      })
    } catch (e) { notify(e instanceof Error ? e.message : 'Gửi thất bại') }
  }
  const cancel = async (id: string) => {
    try { await runChatOperation(async () => { await api({ action: 'cancelChat', id }); await refresh() }) }
    catch (e) { notify(e instanceof Error ? e.message : 'Không thể hủy yêu cầu') }
  }
  const clear = async () => {
    if (chatBusy || !confirm('Xóa toàn bộ lịch sử chat demo?')) return
    try { await runChatOperation(async () => { await api({ action: 'clearChat', confirmation: 'CLEAR CHAT' }); setOutgoing(null); await refresh() }) }
    catch (e) { notify(e instanceof Error ? e.message : 'Không thể xóa lịch sử') }
  }

  return <div className={compact ? 'demo-chat-view demo-chat-compact' : 'demo-chat-view'}>
    {!compact && <div className="demo-page-heading"><div><small>TRỢ LÝ CỦA BẠN</small><h1>Trò chuyện cùng Aqua</h1><p>Hỏi số liệu, thêm công việc, ghi nhận thu chi và thu hoạch.</p></div><button disabled={chatBusy || loading} onClick={clear}><Trash2 size={17} />Xóa lịch sử</button></div>}
    <section className="demo-chat">
      {compact && <div className="demo-chat-toolbar"><span>Lịch sử chat demo</span><button disabled={chatBusy || loading} onClick={clear} aria-label="Xóa lịch sử chat demo"><Trash2 size={14} /></button></div>}
      <div className="demo-chat-messages" ref={messageList} aria-label="Cuộc trò chuyện">
        {loading ? <p>Đang tải lịch sử…</p> : !messages.length && !showOutgoing && <div className="demo-chat-welcome"><span><Sparkles size={30} /></span><h2>Tôi có thể giúp gì cho trại nuôi?</h2><p>Nhập yêu cầu hoặc nói bằng microphone.<br />Kiểm tra form rồi xác nhận để lưu dữ liệu.</p></div>}
        {messages.map(m => {
          const action = m.actionData as unknown as Action | null
          const waiting = m.status === 'waiting_confirmation'
          return <div className={`demo-chat-turn ${m.role}`} key={m.id}>
            <article className={`demo-message ${m.role}`}>
              <small>{m.role === 'user' ? 'Bạn' : <><Bot size={13} /> Aqua · Trợ lý</>}</small>
              <p>{m.content}</p>
            </article>
            {action && (waiting ? <div className="demo-chat-confirmation" ref={m.id === pending?.id ? confirmationRef : undefined}>
              <EntityForm inline entity={action.entity} initial={action.data} confirmationId={m.id} source={action.source} onClose={() => { void cancel(m.id) }} />
            </div> : <div className={`demo-confirm-card ${m.status === 'cancelled' ? 'is-cancelled' : ''}`}>
              <strong>{modules[action.entity]?.title}</strong>
              {modules[action.entity]?.fields.filter(f => action.data[f.key] !== '' && action.data[f.key] !== undefined && action.data[f.key] !== null).map(f => <div className="demo-stat-row" key={f.key}><span>{f.label}</span><b>{f.ref ? displayName(data[f.ref].find(r => r.id === action.data[f.key])) : f.kind === 'money' ? formatVND(action.data[f.key]) : String(action.data[f.key])}</b></div>)}
              <span className={`demo-badge demo-confirm-status ${m.status === 'confirmed' ? 'success' : ''}`}>{m.status === 'confirmed' && <Check size={16} className="demo-confirm-check" aria-hidden="true" />}{m.status === 'confirmed' ? 'Đã lưu' : 'Đã hủy'}</span>
            </div>)}
          </div>
        })}
        {showOutgoing && <div className="demo-chat-turn user"><article className="demo-message user"><small>Bạn</small><p>{outgoing.text}</p></article></div>}
        {sending && <p className="demo-muted" role="status">Aqua đang trả lời…</p>}
      </div>
      {pending && <p className="demo-chat-pending" role="status">Xác nhận hoặc hủy form phía trên để tiếp tục chat.</p>}
      <form onSubmit={send} className="demo-chat-input">
        <button type="button" className={voice.listening ? 'demo-mic listening' : 'demo-mic'} disabled={!voice.supported || blocked} onClick={voice.toggle} aria-label={voice.listening ? 'Dừng ghi âm' : 'Nhập bằng giọng nói'}><Mic size={24} /></button>
        <textarea ref={inputRef} rows={1} maxLength={4000} disabled={blocked} aria-label="Tin nhắn" value={text} onChange={e => { setText(e.target.value); setSource('chat') }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(e) } }} />
        <button className="demo-primary" disabled={blocked || voice.listening || !text.trim()} aria-label="Gửi tin nhắn"><Send size={20} /></button>
      </form>
      <p className="demo-chat-hint">{voice.listening ? 'Đang nghe…' : 'Enter để gửi · Shift + Enter để xuống dòng'}</p>
    </section>
  </div>
}

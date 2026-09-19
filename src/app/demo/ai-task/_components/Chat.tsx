'use client'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Mic, Send } from 'lucide-react'
import ChatMessage from '@/components/chat/ChatMessage'
import VoiceInputSlot from '@/components/chat/VoiceInputSlot'
import { useVoice } from '@/hooks/useVoice'
import { api, useTasks } from './Provider'
import { taskReply } from '../_lib/assistant-replies'
import TaskForm from './TaskForm'
import TaskResultGroups from './TaskResultGroups'
import TaskCard from './TaskCard'
import { displayDate, priorityLabels, statusLabels, type Message, type TreeNode } from '../_lib/model'
import { newContext, readContext, type TaskConversationMemory, type TaskOverviewMemory } from '../_lib/task-memory'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/components/auth/AuthProvider'

export default function Chat() {
  const { groups, revision, busy, run, refresh, notify, overview, overviewLoading, overviewError, reloadOverview, acceptOverview, context, setContext, contextReady } = useTasks()
  const { user } = useAuth()
  const parents = useQuery({ queryKey: ['ai-task', 'parent-labels', user?.id, revision], queryFn: () => api<{ nodes: TreeNode[] }>(undefined, { resource: 'parents' }), enabled: !!user?.id })
  const [messages, setMessages] = useState<Message[]>([])
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const [historyLoading, setHistoryLoading] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
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
  const blocked = overviewLoading || !contextReady || !!overviewError || !!pendingId && (!pending || pending.status === 'choose' || !pending.proposal || !['CREATE_TASK', 'CREATE_SUBTASK', 'UPDATE_TASK'].includes(pending.proposal.action))
  const hideVoice = !voiceText && !!text
  const voice = useVoice(t => { setText(t); setVoiceText(true) }, notify, !busy && !loading && !blocked && !hideVoice)
  const mergeMessages = useCallback((incoming: Message[]) => setMessages(old => {
    const merged = new Map(old.map(message => [message.id, message]))
    incoming.forEach(message => merged.set(message.id, message))
    return Array.from(merged.values()).sort((a, b) => a.sequence - b.sequence)
  }), [])
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const state = await api<{ pendingId: string | null }>(undefined, { resource: 'chatState' }, signal)
      if (signal?.aborted) return
      if (state.pendingId && !messagesRef.current.some(m => m.id === state.pendingId)) {
        const turn = await api<{ messages: Message[] }>(undefined, { resource: 'turn', messageId: state.pendingId }, signal)
        if (signal?.aborted) return
        mergeMessages(turn.messages)
      }
      setPendingId(state.pendingId); setError('')
    } catch (reason) { if (!signal?.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được trạng thái chat.') }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [mergeMessages])
  const loadTurn = async (messageId: string) => {
    const data = await api<{ messages: Message[] }>(undefined, { resource: 'turn', messageId })
    mergeMessages(data.messages)
    return data.messages
  }
  const loadHistory = async () => {
    setHistoryLoading(true)
    try { const data = await api<{ messages: Message[] }>(undefined, { resource: 'messages' }); mergeMessages(data.messages) }
    catch (reason) { notify(reason instanceof Error ? reason.message : 'Không tải được lịch sử. Bạn vẫn có thể chat.') }
    finally { setHistoryLoading(false) }
  }
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
  const perform = async (body: { operation: string; messageId?: string; [key: string]: unknown }) => {
    await run(async () => {
      const response = await api<{ result?: { id?: string; overview?: TaskOverviewMemory } }>({ ...body, ...(body.operation === 'choose' ? { context: readContext(context), overview } : {}) })
      const id = body.messageId || response.result?.id
      const turn = id ? await loadTurn(id) : []
      if (response.result?.overview) {
        const saved = response.result.overview
        acceptOverview(saved)
        setContext({ ...newContext(), conversationDefaults: { groupId: saved.groupId, parentId: saved.parentId, priority: saved.priority, status: saved.status } })
      } else if (body.operation === 'cancel' || body.operation === 'confirm') setContext({ ...newContext(), conversationDefaults: context.conversationDefaults })
      else if (body.operation === 'choose') {
        const proposal = turn.find(m => m.status === 'pending')?.proposal
        if (proposal) setContext({ ...context, mode: proposal.taskId ? 'editing-task' : 'creating-task', activeDraft: proposal.data })
      }
      await load(); await refresh()
    })
  }
  const cancel = (id: string) => { void perform({ operation: 'cancel', messageId: id }).catch(e => notify(e.message)) }
  const send = async () => {
    const submitted = text.trim()
    if (!submitted || busy || blocked || voice.listening || loading || error) return
    if (request.current?.text !== submitted) request.current = { text: submitted, id: crypto.randomUUID() }
    try {
      await run(async () => {
        setOutgoing(submitted)
        const response = await api<{ result: { id: string; context: TaskConversationMemory } }>({ operation: 'chat', text: submitted, requestId: request.current!.id, context: readContext(context), overview, ...(pendingId ? { pendingId } : {}) })
        setContext(response.result.context)
        if (pendingId) await loadTurn(pendingId)
        await loadTurn(response.result.id); setText(''); setVoiceText(false); request.current = null; await load()
      })
    } catch (reason) { notify(reason instanceof Error ? reason.message : 'Gửi thất bại.') }
    finally { setOutgoing('') }
  }
  return <div className="demo-chat-view ai-task-chat">
    <div className="demo-page-heading"><div><h1>Trợ lý công việc</h1><p>Nói điều bạn cần làm. Xem lại và xác nhận trước khi lưu.</p></div></div>
    <details className="ai-task-before"><summary>Bộ nhớ tổng quan và ngữ cảnh</summary>
      <MemoryDetails title="Bộ nhớ tổng quan" values={overview} groups={groups} nodes={parents.data?.nodes || []} />
      <MemoryDetails title="Bộ nhớ ngữ cảnh" values={{ ...context.conversationDefaults, ...context.activeDraft }} groups={groups} nodes={parents.data?.nodes || []} />
      <p>{context.mode === 'idle' ? 'Chưa có task đang tạo.' : context.mode === 'editing-task' ? 'Đang sửa task.' : 'Đang tạo task.'} Ngữ cảnh giữ trong tab này tối đa 2 giờ không hoạt động.</p>
      <button disabled={busy || loading || !!pendingId} onClick={() => setContext(newContext())}>Xóa ngữ cảnh</button>
    </details>
    {overviewError && <p role="alert">Không tải được bộ nhớ tổng quan. <button onClick={() => void reloadOverview()}>Thử lại</button></p>}
    <section className="demo-chat">
      <div className="demo-chat-messages" ref={list} aria-label="Cuộc trò chuyện">
        <button type="button" disabled={busy || historyLoading} onClick={() => void loadHistory()}>{historyLoading ? 'Đang tải 10 tin nhắn…' : 'Tải lại lịch sử chat'}</button>
        {!messages.length && !outgoing && <p className="demo-chat-hint">Bạn có thể chat ngay hoặc tải 10 tin nhắn gần nhất.</p>}
        {loading && <p role="status">Đang mở chat…</p>}
        {pendingId && !pending && <p className="demo-alert">Có yêu cầu chưa xử lý. <button disabled={busy} onClick={() => void loadTurn(pendingId).catch(e => notify(e.message))}>Mở yêu cầu đang chờ</button> <button disabled={busy} onClick={() => cancel(pendingId)}>Hủy yêu cầu cũ</button></p>}
        {error && <div className="demo-alert" role="alert">{error} <button onClick={() => void load()}>Thử lại</button></div>}
        {messages.map(m => <div className={`demo-chat-turn ${m.role}`} key={m.id}>
          <ChatMessage role={m.role} content={m.proposal && m.status === 'confirmed' ? taskReply(m.proposal.action, m.proposal.data.title, true) : m.proposal && m.status === 'cancelled' ? 'Mình bỏ yêu cầu này nhé.' : m.proposal && /Đã điền các trường|Mình đã chuẩn bị thông tin|Kiểm tra thông tin/.test(m.content) ? taskReply(m.proposal.action, m.proposal.data.title) : m.content} assistantName="AI Task" />
          {m.displayGroups ? <TaskResultGroups groups={m.displayGroups} /> : m.tasks && <div className="ai-task-results">{m.tasks.map(t => <TaskCard key={t.id} task={t} groups={groups} />)}</div>}
          {m.status === 'choose' && <div className="demo-chat-confirmation ai-task-choice" ref={pendingRef}><p>Chọn công việc:</p>{m.candidates?.map(t => <div key={t.id}><TaskCard task={t} groups={groups} linked={false} path={m.candidatePaths?.[t.id]} /><button disabled={busy} onClick={() => { void perform({ operation: 'choose', messageId: m.id, taskId: t.id }).catch(e => notify(e.message)) }}>Chọn {t.title}</button></div>)}<button disabled={busy} onClick={() => cancel(m.id)}>Hủy yêu cầu</button></div>}
          {m.proposal && (m.status === 'pending' ? <div className="demo-chat-confirmation demo-inline-confirmation" ref={pendingRef}><TaskForm compact key={`${m.id}:${JSON.stringify(m.proposal.data)}`} initial={m.id === pendingId && context.mode !== 'idle' ? { ...m.proposal.data, ...context.activeDraft } : m.proposal.data} onDraftChange={data => setContext({ ...context, mode: m.proposal!.taskId ? 'editing-task' : 'creating-task', activeDraft: data })} before={m.proposal.before} action={m.proposal.action} groups={groups} busy={busy} onCancel={() => cancel(m.id)} submitLabel={m.proposal.action === 'DELETE_TASK' ? 'Xác nhận xóa' : m.proposal.action === 'RESTORE_TASK' ? 'Xác nhận khôi phục' : 'Xác nhận lưu'} onSubmit={data => perform({ operation: 'confirm', messageId: m.id, data })} /></div> : null)}
          {!m.proposal && m.status === 'cancelled' && <small>Đã hủy yêu cầu</small>}
        </div>)}
        {outgoing && <div className="demo-chat-turn user"><ChatMessage role="user" content={outgoing} assistantName="AI Task" /><p role="status">Đang phân tích…</p></div>}
      </div>
      {pending && <p className="demo-chat-pending">Bạn có thể nhắn bổ sung cho bản nháp, xác nhận lưu hoặc hủy yêu cầu.</p>}
      <form className="demo-chat-input demo-chat-voice-input" onSubmit={e => { e.preventDefault(); void send() }}>
        <VoiceInputSlot hidden={hideVoice}><button type="button" className={`demo-mic ${voice.listening ? 'listening' : ''}`} disabled={!voice.supported || busy || loading || blocked || !!error || hideVoice} tabIndex={hideVoice ? -1 : 0} onClick={voice.toggle} aria-pressed={voice.listening} aria-label={voice.listening ? 'Dừng ghi âm' : 'Nhập bằng giọng nói'} title={!voice.supported ? 'Trình duyệt chưa hỗ trợ nhập giọng nói' : undefined}><Mic size={24} /></button></VoiceInputSlot>
        <textarea ref={input} rows={1} maxLength={4000} placeholder="Ví dụ: EDA đang làm…" aria-label="Tin nhắn" disabled={busy || loading || blocked || !!error} value={text} onChange={e => { setText(e.target.value); setVoiceText(false) }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send() } }} />
        <button className="demo-primary" aria-label="Gửi tin nhắn" disabled={busy || loading || blocked || !!error || voice.listening || !text.trim()}><Send size={20} /></button>
      </form><p className="demo-chat-hint">{voice.listening ? 'Đang nghe… Dừng ghi âm rồi kiểm tra nội dung và bấm Gửi.' : 'Enter để gửi · Shift + Enter để xuống dòng · Giờ Việt Nam'}</p>
    </section>
  </div>
}

function MemoryDetails({ title, values, groups, nodes }: { title: string; values: TaskConversationMemory['activeDraft']; groups: { id: string; name: string }[]; nodes: TreeNode[] }) {
  return <div><strong>{title}</strong>
    {values.title && <p>Công việc: {values.title}</p>}
    <p>Nhóm: {values.groupId ? groups.find(g => g.id === values.groupId)?.name || 'Nhóm không còn khả dụng' : 'Chưa chọn'}</p>
    <p>Task cha: {values.parentId ? nodes.find(n => n.id === values.parentId)?.title || 'Task không còn khả dụng' : 'Không có · Task gốc'}</p>
    <p>Ưu tiên: {values.priority ? priorityLabels[values.priority] : 'Chưa chọn'} · Trạng thái: {values.status ? statusLabels[values.status] : 'Chưa chọn'}</p>
    {(values.startNow || values.startClock || values.startTime) && <p>Bắt đầu: {values.startNow ? 'Ngay khi xác nhận' : values.startTime ? displayDate(values.startTime) : values.startClock}</p>}
    {values.duration && <p>Thời lượng: {values.duration} phút</p>}{values.deadline && <p>Deadline: {displayDate(values.deadline)}</p>}{values.description && <p>Ghi chú: {values.description}</p>}
  </div>
}

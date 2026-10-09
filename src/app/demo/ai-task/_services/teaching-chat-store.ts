import 'server-only'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { userRoot } from './repository'
import { newTeachingChatContext, readTeachingAssistantMemory, readTeachingChatContext, type TeachingAssistantMemory, type TeachingChatContext, type TeachingChatMessage } from '../_lib/teaching-chat'

const assistantCollection = (uid: string) => userRoot(uid).collection('teachingAssistant')
export const teachingChatRef = (uid: string) => assistantCollection(uid).doc('chat')
export const teachingChatMessages = (uid: string) => teachingChatRef(uid).collection('messages')
const teachingMemoryRef = (uid: string) => assistantCollection(uid).doc('memory')

function serialize(value: unknown): any {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (Array.isArray(value)) return value.map(serialize)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]))
  return value
}
function messageRow(doc: FirebaseFirestore.DocumentSnapshot) {
  return { ...serialize(doc.data()), id: doc.id } as TeachingChatMessage
}

export async function getTeachingAssistantMemory(uid: string): Promise<TeachingAssistantMemory> {
  const snapshot = await teachingMemoryRef(uid).get()
  return readTeachingAssistantMemory(snapshot.data() || {})
}
export async function setTeachingAssistantMemory(uid: string, memory: Omit<TeachingAssistantMemory, 'updatedAt'>) {
  const value = { ...memory, updatedAt: new Date().toISOString() }
  await teachingMemoryRef(uid).set(value)
  return value
}
export async function clearTeachingAssistantMemory(uid: string) {
  await teachingMemoryRef(uid).delete()
  return readTeachingAssistantMemory(null)
}
export async function getTeachingChatContext(uid: string): Promise<TeachingChatContext> {
  const snapshot = await teachingChatRef(uid).get()
  return readTeachingChatContext(snapshot.get('contextMemory'))
}
export async function getTeachingChatState(uid: string) {
  const snapshot = await teachingChatRef(uid).get()
  return {
    pendingId: (snapshot.get('pendingId') as string | undefined) || null,
    context: readTeachingChatContext(snapshot.get('contextMemory')),
    historyResetSequence: Number(snapshot.get('historyResetSequence') || 0),
  }
}
export async function getTeachingChatMessages(uid: string, limit = 10, afterSequence = 0) {
  const snapshot = await teachingChatMessages(uid).orderBy('sequence', 'desc').limit(limit).get()
  const messages = snapshot.docs.map(messageRow).filter(message => message.sequence > afterSequence).reverse()
  return { messages, hasMore: snapshot.size === limit }
}
export async function getTeachingChatTurn(uid: string, messageId: string) {
  const docs = await Promise.all([
    teachingChatMessages(uid).doc('user_' + messageId).get(),
    teachingChatMessages(uid).doc(messageId).get(),
  ])
  return { messages: docs.filter(doc => doc.exists).map(messageRow).sort((a, b) => a.sequence - b.sequence) }
}

export async function appendTeachingChatTurn(input: {
  uid: string
  requestId: string
  text: string
  reply: Omit<TeachingChatMessage, 'id' | 'role' | 'sequence' | 'createdAt'>
  context: TeachingChatContext
  replacePendingId?: string
}) {
  const userRef = teachingChatMessages(input.uid).doc('user_' + input.requestId)
  const assistantRef = teachingChatMessages(input.uid).doc(input.requestId)
  const chatRef = teachingChatRef(input.uid)
  return getAdminDb().runTransaction(async tx => {
    const existing = await tx.get(assistantRef)
    if (existing.exists) return { id: assistantRef.id }
    const chat = await tx.get(chatRef)
    const pendingId = chat.get('pendingId') as string | undefined
    const previousRef = input.replacePendingId ? teachingChatMessages(input.uid).doc(input.replacePendingId) : null
    const previous = previousRef ? await tx.get(previousRef) : null
    if (pendingId && (pendingId !== input.replacePendingId || !previous?.exists || !['pending'].includes(String(previous.get('status'))))) {
      throw new Error('Hãy xác nhận hoặc hủy đề xuất đang chờ trước.')
    }
    if (input.replacePendingId && pendingId !== input.replacePendingId) throw new Error('Đề xuất đã thay đổi. Hãy tải lại chat trước khi tiếp tục.')
    const sequence = Number(chat.get('sequence') || 0) + 2
    const now = FieldValue.serverTimestamp()
    if (previousRef && previous?.exists) tx.update(previousRef, { status: 'cancelled' })
    tx.set(userRef, { role: 'user', content: input.text, sequence: sequence - 1, createdAt: now, status: 'normal' })
    tx.set(assistantRef, { ...input.reply, role: 'assistant', sequence, createdAt: now })
    tx.set(chatRef, {
      sequence,
      pendingId: input.reply.status === 'pending' ? assistantRef.id : null,
      contextMemory: { ...input.context, updatedAt: Date.now() },
      updatedAt: now,
    }, { merge: true })
    return { id: assistantRef.id }
  })
}

export async function confirmTeachingChatProposal(
  uid: string,
  messageId: string,
  execute: (userId: string, proposal: NonNullable<TeachingChatMessage['proposal']>) => Promise<{ content: string; data?: unknown }>,
) {
  const messageRef = teachingChatMessages(uid).doc(messageId)
  const chatRef = teachingChatRef(uid)
  const pending = await getAdminDb().runTransaction(async tx => {
    const [message, chat] = await Promise.all([tx.get(messageRef), tx.get(chatRef)])
    const proposal = message.get('proposal') as NonNullable<TeachingChatMessage['proposal']> | undefined
    if (message.get('status') !== 'pending' || chat.get('pendingId') !== messageId || !proposal) throw new Error('Đề xuất không còn chờ xác nhận.')
    tx.update(messageRef, { status: 'committing' })
    return proposal
  })
  let result: { content: string; data?: unknown }
  try {
    result = await execute(uid, pending)
  } catch (error) {
    await getAdminDb().runTransaction(async tx => {
      const message = await tx.get(messageRef)
      if (message.get('status') === 'committing') tx.update(messageRef, { status: 'pending' })
    })
    throw error
  }
  await getAdminDb().runTransaction(async tx => {
    const [current, chat] = await Promise.all([tx.get(messageRef), tx.get(chatRef)])
    if (current.get('status') !== 'committing' || chat.get('pendingId') !== messageId) throw new Error('Đề xuất đã được xử lý.')
    const saved = result.data && typeof result.data === 'object' ? result.data as Record<string, unknown> : {}
    const context = readTeachingChatContext(chat.get('contextMemory'))
    const savedTime = typeof saved.startAt === 'string'
      ? new Date(saved.startAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })
      : ''
    const nextContext = {
      ...context,
      pendingDraft: null,
      ...(typeof saved.id === 'string' && typeof saved.studentName === 'string'
        ? { activeSessionId: saved.id, activeStudentId: typeof saved.studentId === 'string' ? saved.studentId : context.activeStudentId, activeStudentName: saved.studentName, activeSessionSummary: String(saved.subject || saved.title || 'Buổi học') + (savedTime ? ' · ' + savedTime : '') }
        : {}),
      ...(typeof saved.id === 'string' && typeof saved.name === 'string'
        ? { activeStudentId: saved.id, activeStudentName: saved.name }
        : {}),
      updatedAt: Date.now(),
    }
    tx.update(messageRef, { status: 'confirmed', content: result.content, result: result.data })
    tx.set(chatRef, { pendingId: null, contextMemory: nextContext }, { merge: true })
  })
  return result
}

export async function cancelTeachingChatProposal(uid: string, messageId: string) {
  const messageRef = teachingChatMessages(uid).doc(messageId)
  const chatRef = teachingChatRef(uid)
  await getAdminDb().runTransaction(async tx => {
    const [message, chat] = await Promise.all([tx.get(messageRef), tx.get(chatRef)])
    if (message.get('status') !== 'pending' || chat.get('pendingId') !== messageId) throw new Error('Đề xuất đã được xử lý.')
    tx.update(messageRef, { status: 'cancelled', content: 'Bạn đã hủy đề xuất này.' })
    tx.set(chatRef, { pendingId: null, contextMemory: { ...readTeachingChatContext(chat.get('contextMemory')), pendingDraft: null, updatedAt: Date.now() } }, { merge: true })
  })
}

export async function clearTeachingChatContext(uid: string) {
  const ref = teachingChatRef(uid)
  await getAdminDb().runTransaction(async tx => {
    const chat = await tx.get(ref)
    const pendingId = chat.get('pendingId') as string | undefined
    if (pendingId) {
      const message = teachingChatMessages(uid).doc(pendingId)
      const snapshot = await tx.get(message)
      if (snapshot.exists && snapshot.get('status') === 'committing') throw new Error('Đề xuất đang được lưu. Đợi thao tác hoàn tất rồi xóa ngữ cảnh nhé.')
      if (snapshot.exists && snapshot.get('status') === 'pending') tx.update(message, { status: 'cancelled', content: 'Đề xuất đã được hủy khi xóa ngữ cảnh.' })
    }
    tx.set(ref, {
      pendingId: null,
      contextMemory: newTeachingChatContext(),
      historyResetSequence: Number(chat.get('sequence') || 0),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
  })
  return newTeachingChatContext()
}

export async function clearTeachingChatMessages(uid: string) {
  const state = await getTeachingChatState(uid)
  if (state.pendingId) {
    const pending = await teachingChatMessages(uid).doc(state.pendingId).get()
    if (pending.exists && pending.get('status') === 'committing') throw new Error('Đề xuất đang được lưu. Đợi thao tác hoàn tất rồi xóa lịch sử chat nhé.')
  }
  const snapshot = await teachingChatMessages(uid).get()
  const batchSize = 400
  for (let offset = 0; offset < snapshot.docs.length; offset += batchSize) {
    const batch = getAdminDb().batch()
    snapshot.docs.slice(offset, offset + batchSize).forEach(doc => batch.delete(doc.ref))
    await batch.commit()
  }
  await teachingChatRef(uid).set({ sequence: 0, pendingId: null, historyResetSequence: 0, contextMemory: newTeachingChatContext() }, { merge: true })
}

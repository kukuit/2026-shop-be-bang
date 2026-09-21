import 'server-only'
import { leafTasks } from '../_lib/task-display'
import { taskReply, taskListReply, conversationalReply } from '../_lib/assistant-replies'
import { type Conversation, type MemoryUpdate, type WorkDefaults } from '../_lib/work-memory'
import { confirmedOverview, newContext, resolveTaskMemory, type TaskConversationMemory, type TaskOverviewMemory } from '../_lib/task-memory'
import type { RecognitionRecord, TaskAction } from '@/modules/ai-task/action-recognition/types'
import { learnSafely } from '@/modules/ai-task/action-recognition/feedback/feedbackService'
type PreparedReply = Partial<Message> & { memoryUpdate?: MemoryUpdate; recognition?: RecognitionRecord }
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { finalizeSchedule, filterSchema, groupInputSchema, idSchema, isOpen, normalize, slugify, taskInputSchema, type Action, type Group, type Intent, type Message, type Proposal, type Task, type TaskInput } from '../_lib/model'
import { findDisplayTasks, getGroups, groupCollection, messageCollection, migrateTaskTree, row, scanTasks, sessionRef, taskCollection, userRoot } from './repository'
import { descendants, treePath, treePositions, upgradeParentField, validParents } from '../_lib/tree'

export async function saveGroup(uid: string, raw: unknown, id?: string) {
  const input = groupInputSchema.parse(raw)
  const ref = id ? groupCollection(uid).doc(idSchema.parse(id)) : groupCollection(uid).doc()
  return getAdminDb().runTransaction(async tx => {
    const root = await tx.get(userRoot(uid))
    const groups = await tx.get(groupCollection(uid))
    const current = groups.docs.find(d => d.id === ref.id)
    if (id && !current) throw new Error('Nhóm không tồn tại.')
    if (current?.get('isDefault') && !input.isActive) throw new Error('Không thể ẩn Inbox.')
    if (groups.docs.some(d => d.id !== ref.id && normalize(String(d.get('name'))) === normalize(input.name))) throw new Error('Tên nhóm đã tồn tại.')
    const slug = slugify(input.name)
    const uniqueSlug = groups.docs.some(d => d.id !== ref.id && d.get('slug') === slug) ? `${slug}-${ref.id.slice(-6)}` : slug
    tx.set(ref, { ...input, slug: uniqueSlug, isDefault: current?.get('isDefault') === true, createdAt: current?.get('createdAt') || FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
    tx.set(userRoot(uid), { revision: Number(root.get('revision') || 0) + 1 }, { merge: true })
    return { id: ref.id }
  })
}

function taskInput(t: Task): TaskInput {
  return taskInputSchema.parse({ title: t.title, description: t.description, groupId: t.groupId, priority: t.priority, status: t.status, parentId: t.parentId, deadline: t.deadline, startTime: t.startTime, duration: t.duration, withinDay: t.withinDay, scheduleMode: t.scheduleMode, startNow: false, completionPercent: t.completionPercent, completionNote: t.completionNote })
}
function resolveGroup(groups: Group[], name?: string) {
  const inbox = groups.find(g => g.isDefault && g.isActive) || groups.find(g => g.isActive)
  if (!inbox) throw new Error('Không có nhóm đang hoạt động.')
  if (!name) return { group: inbox, note: '' }
  const found = groups.filter(g => g.isActive && [g.id, g.name, g.slug].some(n => normalize(n) === normalize(name)))
  return found.length === 1 ? { group: found[0], note: '' } : { group: inbox, note: `Mình chưa thấy nhóm “${name}”, tạm chọn “${inbox.name}” nhé.\n` }
}

export async function prepareIntent(uid: string, intent: Intent | Conversation, chosenId?: string, context: TaskConversationMemory = newContext(), overview: TaskOverviewMemory = {}, recognizedAction?: TaskAction): Promise<PreparedReply> {
  const groups = await getGroups(uid)
  if (intent.action === 'CHAT') {
    if (!intent.memory) return { status: 'normal', content: conversationalReply(intent.reply) }
    const { scope, groupName, parentQuery, notes, reset, ...values } = intent.memory
    const update: MemoryUpdate = { scope, values, ...(notes !== undefined ? { notes } : {}), ...(reset ? { reset: true } : {}) }
    if (groupName !== undefined) {
      const group = groupName === null ? groups.find(g => g.isDefault && g.isActive) : groups.find(g => g.isActive && [g.id, g.name, g.slug].some(name => normalize(name) === normalize(groupName)))
      if (!group) return { status: 'normal', content: 'Mình chưa tìm thấy nhóm đó. Bạn cho mình tên nhóm đã có nhé.' }
      update.values.groupId = group.id
    }
    if (parentQuery !== undefined) {
      if (parentQuery === null) update.values.parentId = null
      else {
        const tasks = await scanTasks(uid)
        const matches = validParents(tasks).filter(t => isOpen(t) && (normalize(t.title) === normalize(parentQuery) || normalize(treePath(t.id, tasks)).replace(/\s*[/>→]\s*/g, '/') === normalize(parentQuery).replace(/\s*[/>→]\s*/g, '/')))
        if (matches.length !== 1) return { status: 'normal', content: matches.length ? 'Có vài việc cùng tên. Bạn muốn đặt dưới việc nào?' : 'Mình chưa thấy việc đó. Bạn muốn đặt dưới việc nào khác?' }
        update.values.parentId = matches[0].id
        update.values.groupId = tasks.find(t => t.id === matches[0].id)!.groupId
      }
    }
    if ('startClock' in values && values.startClock) update.values.startNow = false
    if (values.startNow) update.values.startClock = null
    return { status: 'normal', content: reset ? 'Được, mình bỏ các lựa chọn vừa rồi nhé.' : 'Được, mình dùng lựa chọn này nhé.', memoryUpdate: update }
  }
  if (intent.action === 'GET_TASKS') {
    const { groupName, ...rest } = intent.filters || {}
    let groupId: string | undefined
    if (groupName) {
      const found = groups.filter(g => [g.id, g.name, g.slug].some(n => normalize(n) === normalize(groupName)))
      if (found.length !== 1) return { content: `Không tìm thấy nhóm “${groupName}”. Hãy chọn tên nhóm trong Tổng quan.`, status: 'normal' }
      groupId = found[0].id
    }
    const filters = filterSchema.parse({ ...rest, ...(groupId ? { groupId } : {}) })
    const result = await findDisplayTasks(uid, filters)
    return { content: taskListReply(filters, result.total, result.tasks.length), tasks: result.tasks, total: result.total, intent, status: 'normal' }
  }
  let target: Task | undefined
  if (intent.action !== 'CREATE_TASK') {
    const query = normalize(intent.target!.query)
    const tasks = await scanTasks(uid)
    const candidates = tasks.filter(t => (intent.action === 'RESTORE_TASK' ? !!t.deletedAt : !t.deletedAt) && normalize(t.title).includes(query))
    if (chosenId) target = candidates.find(t => t.id === chosenId)
    else if (candidates.length === 1) target = candidates[0]
    if (!target) {
      if (chosenId) throw new Error('Công việc đã thay đổi hoặc không còn phù hợp. Hãy gửi lại yêu cầu.')
      if (!candidates.length) return { content: 'Mình chưa thấy việc đó. Bạn nói rõ tên giúp mình nhé?', status: 'normal' }
      if (candidates.length > 30) return { content: `Có ${candidates.length} việc gần giống. Bạn nói rõ hơn tên việc cần tìm nhé?`, status: 'normal' }
      return { content: 'Bạn đang nói đến việc nào trong những việc này?', status: 'choose', candidates, candidatePaths: Object.fromEntries(candidates.map(t => [t.id, treePath(t.id, tasks)])), intent }
    }
    if (intent.action === 'GET_TASK_DETAIL') {
      const children = (await scanTasks(uid)).filter(t => t.parentId === target!.id && !t.deletedAt)
      return { content: children.length > 29 ? `Đây là “${target.title}” và 29 việc nhỏ bên dưới.` : `Đây là “${target.title}”${children.length ? " và các việc nhỏ bên dưới" : ""}.`, tasks: [target, ...children.slice(0, 29)], intent, status: 'normal' }
    }
  }
  const fields = intent.action === 'UPDATE_TASK' ? intent.changes || {} : intent.data || {}
  const { groupName, parentQuery, ...changes } = fields
  if (recognizedAction === 'task.note' && changes.description && target) changes.description = [target.description, changes.description].filter(Boolean).join('\n')
  if (recognizedAction === 'task.progress' && changes.completionPercent != null && changes.completionPercent < 100) changes.status = 'in_progress'
  let parentPatch: { parentId?: string | null } = {}
  if (parentQuery !== undefined) {
    const parents = validParents(await scanTasks(uid), target?.id).filter(t => isOpen(t) && normalize(t.title) === normalize(parentQuery || ''))
    if (parentQuery !== null && parents.length !== 1) return { status: 'normal', content: 'Bạn cho mình tên công việc cha cụ thể hơn nhé. Bạn cũng có thể chọn cha trong form chỉnh sửa.' }
    parentPatch = { parentId: parentQuery === null ? null : parents[0].id }
  }
  const resolved = resolveGroup(groups, groupName)
  let data: TaskInput
  if (intent.action === 'CREATE_TASK' || intent.action === 'CREATE_SUBTASK') {
    const explicit = { ...changes, ...parentPatch, ...(groupName !== undefined ? { groupId: resolved.group.id } : {}), ...(target ? { parentId: target.id, groupId: target.groupId } : {}) }
    const result = resolveTaskMemory(explicit, context, overview, groups, await scanTasks(uid))
    data = result.data

  } else {
    data = taskInput(target!)
    if (intent.action === 'UPDATE_TASK') data = taskInputSchema.parse({ ...data, ...changes, ...parentPatch, ...('deadline' in changes ? { scheduleMode: 'deadline' } : 'duration' in changes ? { scheduleMode: 'duration' } : {}), ...(groupName ? { groupId: resolved.group.id } : {}) })
    if (intent.action === 'UPDATE_TASK' && data.parentId) {
      const parent = (await scanTasks(uid)).find(t => t.id === data.parentId)
      if (parent) data.groupId = parent.groupId
    }
    if (intent.action === 'COMPLETE_TASK') data.status = 'done'
    if (intent.action === 'CANCEL_TASK') data.status = 'cancelled'
  }
  const create = ['CREATE_TASK', 'CREATE_SUBTASK'].includes(intent.action)
  const contextValues: WorkDefaults = {}
  if (create || intent.action === 'UPDATE_TASK') {
    if (groupName !== undefined || intent.action === 'CREATE_SUBTASK') { contextValues.groupId = data.groupId; contextValues.parentId = data.parentId }
    for (const key of ['duration', 'priority', 'startNow', 'startTime', 'deadline', 'scheduleMode'] as const) if (key in changes) Object.assign(contextValues, { [key]: data[key] })
    if ('startTime' in changes) { contextValues.startNow = false; contextValues.startClock = data.startTime ? new Date(Date.parse(data.startTime) + 7 * 3600000).toISOString().slice(11, 16) : null }
    if (changes.startNow) { contextValues.startTime = null; contextValues.startClock = null }
    if ('duration' in changes && !('deadline' in changes)) { contextValues.deadline = null; contextValues.scheduleMode = 'duration' }
  }
  return { ...(Object.keys(contextValues).length ? { memoryUpdate: { scope: 'context' as const, values: contextValues } } : {}), status: 'pending', content: `${groupName ? resolved.note : ''}${taskReply(intent.action, data.title)}`, proposal: { action: intent.action, data, taskId: create ? null : target!.id, expectedVersion: create ? null : target!.version, before: create ? null : target! } }
}

export async function appendTurn(uid: string, requestId: string, text: string, reply: PreparedReply, replacePendingId?: string) {
  idSchema.parse(requestId)
  const ref = messageCollection(uid).doc(requestId)
  return getAdminDb().runTransaction(async tx => {
    const existing = await tx.get(ref)
    if (existing.exists) return { id: ref.id }
    const session = await tx.get(sessionRef(uid))
    const pendingId = session.get('pendingId')
    const previous = replacePendingId ? await tx.get(messageCollection(uid).doc(idSchema.parse(replacePendingId))) : null
    if (pendingId && (pendingId !== replacePendingId || !['pending', 'choose'].includes(previous?.get('status')))) throw new Error('Hãy xác nhận hoặc hủy yêu cầu đang chờ trước.')
    if (replacePendingId && pendingId !== replacePendingId) throw new Error('Bản nháp đã thay đổi. Hãy tải lại trước khi tiếp tục.')
    const { memoryUpdate, ...messageReply } = reply
    const sequence = Number(session.get('sequence') || 0) + 2
    const now = FieldValue.serverTimestamp()
    const replaces = previous && (reply.proposal || reply.status === 'choose' || reply.recognition?.correctionOf === replacePendingId)
    if (replaces) tx.update(previous.ref, { status: 'cancelled' })
    tx.set(messageCollection(uid).doc(`user_${requestId}`), { role: 'user', content: text, sequence: sequence - 1, createdAt: now, status: 'normal' })
    tx.set(ref, { role: 'assistant', sequence, createdAt: now, ...messageReply })
    tx.set(sessionRef(uid), { sequence, pendingId: ['pending', 'choose'].includes(reply.status || '') ? ref.id : replaces ? null : pendingId || null }, { merge: true })
    return { id: ref.id, memoryUpdate }
  })
}

export async function proposeManual(uid: string, requestId: string, action: Action, raw?: unknown, taskId?: string, expectedVersion?: number) {
  await migrateTaskTree(uid)
  const create = action === 'CREATE_TASK' || action === 'CREATE_SUBTASK'
  let before: Task | null = null
  if (!create) {
    const snapshot = await taskCollection(uid).doc(idSchema.parse(taskId)).get()
    if (!snapshot.exists) throw new Error('Công việc không tồn tại.')
    before = row<Task>(snapshot)
    if (before.version !== expectedVersion) throw new Error('Công việc đã thay đổi. Hãy tải lại danh sách.')
    if (action === 'RESTORE_TASK' ? !before.deletedAt : !!before.deletedAt) throw new Error('Trạng thái công việc đã thay đổi.')
  }
  const data = taskInputSchema.parse(raw || (before && taskInput(before)))
  const proposal: Proposal = { action, data, taskId: before?.id || null, expectedVersion: before?.version || null, before }
  return appendTurn(uid, requestId, `Yêu cầu ${create ? 'tạo' : action === 'DELETE_TASK' ? 'xóa' : action === 'RESTORE_TASK' ? 'khôi phục' : 'sửa'}: ${data.title}`, { status: 'pending', content: taskReply(action, data.title), proposal })
}

export async function chooseTask(uid: string, messageId: string, taskId: string, context: TaskConversationMemory = newContext(), overview: TaskOverviewMemory = {}) {
  const ref = messageCollection(uid).doc(idSchema.parse(messageId))
  const snapshot = await ref.get()
  const old = row<Message>(snapshot)
  if (old.status !== 'choose' || !old.intent || !old.candidates?.some(t => t.id === taskId)) throw new Error('Lựa chọn không hợp lệ.')
  const recognition = snapshot.get('recognition') as RecognitionRecord | undefined
  const reply = await prepareIntent(uid, old.intent, idSchema.parse(taskId), context, overview, recognition?.result.action)
  await getAdminDb().runTransaction(async tx => {
    const current = await tx.get(ref)
    const session = await tx.get(sessionRef(uid))
    if (current.get('status') !== 'choose' || session.get('pendingId') !== messageId) throw new Error('Yêu cầu đã được xử lý.')
    const { memoryUpdate, ...messageReply } = reply
    tx.update(ref, { ...messageReply, candidates: [], intent: null, ...(recognition ? { recognition: { ...recognition, result: { ...recognition.result, target: { ...recognition.result.target, taskId } } } } : {}) })
    tx.set(sessionRef(uid), { pendingId: reply.status === 'pending' ? messageId : null }, { merge: true })
  })
}

export async function cancelProposal(uid: string, messageId: string) {
  const ref = messageCollection(uid).doc(idSchema.parse(messageId))
  await getAdminDb().runTransaction(async tx => {
    const message = await tx.get(ref)
    const session = await tx.get(sessionRef(uid))
    if (message.get('status') === 'cancelled') return
    if (!['pending', 'choose'].includes(message.get('status')) || session.get('pendingId') !== messageId) throw new Error('Yêu cầu đã được xử lý.')
    tx.update(ref, { status: 'cancelled' })
    tx.set(sessionRef(uid), { pendingId: null }, { merge: true })
  })
}

export async function confirmProposal(uid: string, messageId: string, raw: unknown) {
  const result = await persistTask(uid, messageId, raw)
  await learnSafely(uid, messageId, 'confirmation')
  return result
}
export async function saveManualTask(uid: string, requestId: string, action: 'CREATE_TASK' | 'CREATE_SUBTASK' | 'UPDATE_TASK', raw: unknown, taskId?: string, expectedVersion?: number) {
  if (!['CREATE_TASK', 'CREATE_SUBTASK', 'UPDATE_TASK'].includes(action)) throw new Error('Hành động lưu không hợp lệ.')
  if (action === 'UPDATE_TASK' && (!taskId || !expectedVersion) || action !== 'UPDATE_TASK' && taskId) throw new Error('Thông tin công việc cần lưu không hợp lệ.')
  const data = taskInputSchema.parse(raw)
  return persistTask(uid, requestId, data, { action, data, taskId: taskId || null, expectedVersion: expectedVersion || null, before: null })
}
async function persistTask(uid: string, messageId: string, raw: unknown, direct?: Proposal) {
  await migrateTaskTree(uid)
  const ref = (direct ? userRoot(uid).collection('taskSaves') : messageCollection(uid)).doc(idSchema.parse(messageId))
  const newTaskRef = taskCollection(uid).doc()
  return getAdminDb().runTransaction(async tx => {
    const message = await tx.get(ref)
    if (message.get('status') === 'confirmed') return { id: message.get('resultTaskId') as string, overview: message.get('confirmedOverview') as TaskOverviewMemory | undefined }
    const session = await tx.get(sessionRef(uid))
    const root = await tx.get(userRoot(uid))
    if (!direct && (message.get('status') !== 'pending' || session.get('pendingId') !== messageId)) throw new Error('Yêu cầu không còn chờ xác nhận.')
    const storedProposal = direct || message.get('proposal') as Proposal
    const proposal = { ...storedProposal, data: upgradeParentField(storedProposal.data) }
    const deleting = proposal.action === 'DELETE_TASK'
    const restoring = proposal.action === 'RESTORE_TASK'
    const parsedData = taskInputSchema.parse(deleting || restoring ? proposal.data : raw)
    const data = deleting || restoring ? parsedData : finalizeSchedule(parsedData)
    if (!['CREATE_TASK', 'CREATE_SUBTASK', 'UPDATE_TASK'].includes(proposal.action) && data.parentId !== proposal.data.parentId) throw new Error('Hành động này không thay đổi công việc cha. Hãy dùng Sửa công việc.')
    if (proposal.action === 'CREATE_SUBTASK' && !data.parentId) throw new Error('Hãy chọn công việc cha cho công việc con.')
    if (proposal.action === 'COMPLETE_TASK' && data.status !== 'done' || proposal.action === 'CANCEL_TASK' && data.status !== 'cancelled') throw new Error('Trạng thái không khớp hành động.')
    const taskRef = proposal.taskId ? taskCollection(uid).doc(idSchema.parse(proposal.taskId)) : newTaskRef
    const current = await tx.get(taskRef)
    const old = current.exists ? row<Task>(current) : null
    if (proposal.taskId && (!old || old.version !== proposal.expectedVersion)) throw new Error(direct ? 'Công việc đã thay đổi. Hãy đóng form và mở lại công việc để xem dữ liệu mới.' : 'Công việc đã thay đổi. Hủy đề xuất này và mở lại công việc để xem dữ liệu mới.')
    if (old && (restoring ? !old.deletedAt : !!old.deletedAt)) throw new Error('Công việc đã đổi trạng thái xóa.')
    const group = await tx.get(groupCollection(uid).doc(data.groupId))
    if (!group.exists || (!group.get('isActive') && (!old || old.groupId !== data.groupId))) throw new Error('Nhóm đã bị ẩn hoặc không tồn tại. Chọn nhóm đang hoạt động.')
    const snapshot = await tx.get(taskCollection(uid))
    const tasks = snapshot.docs.map(d => row<Task>(d))
    const beforePositions = treePositions(tasks)
    const nodes = tasks.map(t => ({ ...t, ...beforePositions.get(t.id)! }))
    if (data.parentId === taskRef.id) throw new Error('Công việc không được làm cha của chính nó.')
    const branch = descendants(nodes, taskRef.id)
    if (data.parentId && branch.has(data.parentId)) throw new Error('Không thể chuyển công việc vào nhánh con của chính nó vì sẽ tạo quan hệ vòng.')
    if (data.parentId && !deleting && !validParents(nodes, old?.id).some(t => t.id === data.parentId)) throw new Error('Công việc cha không hợp lệ, thuộc tài khoản khác hoặc nhánh cha đã bị xóa.')
    if (data.parentId && !deleting && !nodes.some(t => t.id === data.parentId && t.groupId === data.groupId && isOpen(t))) throw new Error('Công việc cha không hoạt động hoặc không thuộc nhóm đã chọn.')
    if (!deleting) {
      const byId = new Map(nodes.map(t => [t.id, t]))
      let ancestorId = data.parentId
      while (ancestorId) {
        const ancestor = byId.get(ancestorId)!
        if (ancestor.groupId !== data.groupId) throw new Error('Nhánh cha đang có công việc khác nhóm. Hãy sửa nhóm ở công việc gốc trước.')
        ancestorId = ancestor.parentId
      }
    }
    if (deleting) {
      if (nodes.some(t => branch.has(t.id) && !t.deletedAt)) throw new Error('Hãy xử lý/xóa công việc con trong toàn bộ nhánh trước khi xóa công việc cha.')
    }
    const positions = treePositions([...nodes.filter(t => t.id !== taskRef.id), { id: taskRef.id, parentId: data.parentId }])
    const now = FieldValue.serverTimestamp()
    const timestamp = (value: string | null) => value ? Timestamp.fromDate(new Date(value)) : null
    tx.set(taskRef, {
      ...data, ...positions.get(taskRef.id)!, deadline: timestamp(data.deadline), startTime: timestamp(data.startTime), createdAt: old ? current.get('createdAt') : now, updatedAt: now,
      version: (old?.version || 0) + 1,
      completedAt: data.status === 'done' ? old?.status === 'done' ? current.get('completedAt') ?? null : now : null,
      completionPercent: data.status === 'done' && old?.status === 'done' ? old.completionPercent ?? null : data.completionPercent !== undefined ? data.completionPercent : old?.completionPercent ?? null,
      completionNote: data.status === 'done' ? old?.status === 'done' ? old.completionNote ?? null : data.completionNote?.trim() || null : null,
      cancelledAt: data.status === 'cancelled' ? old?.status === 'cancelled' ? current.get('cancelledAt') : now : null,
      deletedAt: deleting ? now : restoring ? null : old ? current.get('deletedAt') : null,
    })
    // Updating the whole branch atomically avoids stale roots/depths and invalidates
    // outstanding descendant proposals. Deleted descendants keep their links too.
    if (old && !deleting) {
      for (const document of snapshot.docs) if (branch.has(document.id) && (old.parentId !== data.parentId || document.get('groupId') !== data.groupId)) {
        tx.update(document.ref, { ...positions.get(document.id)!, groupId: data.groupId, version: Number(document.get('version') || 0) + 1, updatedAt: now })
      }
    }
    if (direct) tx.set(ref, { status: 'confirmed', resultTaskId: taskRef.id, createdAt: now })
    else {
      tx.update(ref, { status: 'confirmed', content: taskReply(proposal.action, data.title, true), proposal: { ...proposal, data }, resultTaskId: taskRef.id })
      tx.set(sessionRef(uid), { pendingId: null, contextMemory: FieldValue.delete() }, { merge: true })
    }
    const learnsForm = ['CREATE_TASK', 'CREATE_SUBTASK', 'UPDATE_TASK'].includes(proposal.action)
    const overview = learnsForm ? confirmedOverview(parsedData, new Date().toISOString()) : undefined
    if (overview) tx.set(ref, { confirmedOverview: overview }, { merge: true })
    tx.set(userRoot(uid), { revision: Number(root.get('revision') || 0) + 1, ...(overview ? { overviewMemory: { ...overview, updatedAt: now }, workMemory: FieldValue.delete() } : {}) }, { merge: true })
    return { id: taskRef.id, overview }

  })
}

export async function summary(uid: string) {
  const tasks = await scanTasks(uid)
  const open = leafTasks(tasks.filter(isOpen), tasks)
  const today = filterSchema.parse({ view: 'today' })
  const { matches } = await import('../_lib/model')
  return { today: open.filter(t => matches(t, today)).length, urgent: open.filter(t => t.priority === 'urgent').length, inProgress: open.filter(t => t.status === 'in_progress').length, waiting: open.filter(t => t.status === 'waiting').length, overdue: open.filter(t => t.deadline && Date.parse(t.deadline) < Date.now()).length, groups: Object.fromEntries((await getGroups(uid)).map(g => [g.id, open.filter(t => t.groupId === g.id).length])) }
}

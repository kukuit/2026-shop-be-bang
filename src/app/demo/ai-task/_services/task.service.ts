import 'server-only'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { filterSchema, groupInputSchema, idSchema, isOpen, normalize, slugify, taskInputSchema, type Action, type Group, type Intent, type Message, type Proposal, type Task, type TaskInput } from '../_lib/model'
import { findTasks, getGroups, groupCollection, messageCollection, migrateTaskTree, row, scanTasks, sessionRef, taskCollection, userRoot } from './repository'
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
  return taskInputSchema.parse({ title: t.title, description: t.description, groupId: t.groupId, priority: t.priority, status: t.status, parentId: t.parentId, deadline: t.deadline })
}
function resolveGroup(groups: Group[], name?: string) {
  const inbox = groups.find(g => g.isDefault && g.isActive)
  if (!inbox) throw new Error('Không tìm thấy Inbox.')
  if (!name) return { group: inbox, note: '' }
  const found = groups.filter(g => g.isActive && [g.name, g.slug].some(n => normalize(n) === normalize(name)))
  return found.length === 1 ? { group: found[0], note: '' } : { group: inbox, note: `Không xác định được nhóm “${name}”; đang đề xuất Inbox. Bạn có thể đổi nhóm trong form.\n` }
}

export async function prepareIntent(uid: string, intent: Intent, chosenId?: string): Promise<Partial<Message>> {
  const groups = await getGroups(uid)
  if (intent.action === 'GET_TASKS') {
    const { groupName, ...rest } = intent.filters || {}
    let groupId: string | undefined
    if (groupName) {
      const found = groups.filter(g => [g.name, g.slug].some(n => normalize(n) === normalize(groupName)))
      if (found.length !== 1) return { content: `Không tìm thấy nhóm “${groupName}”. Hãy chọn tên nhóm trong Tổng quan.`, status: 'normal' }
      groupId = found[0].id
    }
    const filters = filterSchema.parse({ ...rest, ...(groupId ? { groupId } : {}) })
    const result = await findTasks(uid, filters)
    return { content: filters.recommend ? `Các việc nên ưu tiên theo quá hạn, mức gấp và deadline (${result.total} việc phù hợp).` : `Tìm thấy ${result.total} công việc${result.total > 30 ? ', đang hiển thị 30 việc đầu; hãy thêm điều kiện để thu hẹp' : ''}.`, tasks: result.tasks, total: result.total, status: 'normal' }
  }
  let target: Task | undefined
  if (intent.action !== 'CREATE_TASK') {
    const query = normalize(intent.target!.query)
    const tasks = await scanTasks(uid)
    const candidates = tasks.filter(t => (intent.action === 'RESTORE_TASK' ? !!t.deletedAt : !t.deletedAt) && normalize(t.title).includes(query))
    if (chosenId) target = candidates.find(t => t.id === chosenId)
    else if (candidates.length === 1) target = candidates[0]
    if (!target) {
      if (chosenId) throw new Error('Task đã thay đổi hoặc không còn phù hợp. Hãy gửi lại yêu cầu.')
      if (!candidates.length) return { content: 'Không tìm thấy công việc phù hợp. Hãy nhập tên cụ thể hơn.', status: 'normal' }
      if (candidates.length > 30) return { content: `Có ${candidates.length} công việc phù hợp. Hãy thêm từ vào tên task để thu hẹp (tối đa 30 lựa chọn).`, status: 'normal' }
      return { content: 'Có nhiều công việc phù hợp. Chọn đúng công việc để tiếp tục.', status: 'choose', candidates, candidatePaths: Object.fromEntries(candidates.map(t => [t.id, treePath(t.id, tasks)])), intent }
    }
    if (intent.action === 'GET_TASK_DETAIL') {
      const children = (await scanTasks(uid)).filter(t => t.parentId === target!.id && !t.deletedAt)
      return { content: `Chi tiết công việc${children.length ? ` và ${children.length} task con${children.length > 29 ? ' (hiển thị 29 task con đầu)' : ''}` : ''}.`, tasks: [target, ...children.slice(0, 29)], status: 'normal' }
    }
  }
  const fields = intent.action === 'UPDATE_TASK' ? intent.changes || {} : intent.data || {}
  const { groupName, ...changes } = fields
  const resolved = resolveGroup(groups, groupName)
  let data: TaskInput
  if (intent.action === 'CREATE_TASK' || intent.action === 'CREATE_SUBTASK') {
    data = taskInputSchema.parse({ ...changes, groupId: groupName ? resolved.group.id : target?.groupId || resolved.group.id, parentId: target?.id || null })
  } else {
    data = taskInput(target!)
    if (intent.action === 'UPDATE_TASK') data = taskInputSchema.parse({ ...data, ...changes, ...(groupName ? { groupId: resolved.group.id } : {}) })
    if (intent.action === 'COMPLETE_TASK') data.status = 'done'
    if (intent.action === 'CANCEL_TASK') data.status = 'cancelled'
  }
  const create = ['CREATE_TASK', 'CREATE_SUBTASK'].includes(intent.action)
  return { status: 'pending', content: `${groupName ? resolved.note : ''}Kiểm tra thông tin rồi xác nhận để ${intent.action === 'DELETE_TASK' ? 'chuyển công việc vào thùng rác' : intent.action === 'RESTORE_TASK' ? 'khôi phục công việc' : 'lưu công việc'}.`, proposal: { action: intent.action, data, taskId: create ? null : target!.id, expectedVersion: create ? null : target!.version, before: create ? null : target! } }
}

export async function appendTurn(uid: string, requestId: string, text: string, reply: Partial<Message>) {
  idSchema.parse(requestId)
  const ref = messageCollection(uid).doc(requestId)
  return getAdminDb().runTransaction(async tx => {
    const existing = await tx.get(ref)
    if (existing.exists) return { id: ref.id }
    const session = await tx.get(sessionRef(uid))
    if (session.get('pendingId')) throw new Error('Hãy xác nhận hoặc hủy yêu cầu đang chờ trước.')
    const sequence = Number(session.get('sequence') || 0) + 2
    const now = FieldValue.serverTimestamp()
    tx.set(messageCollection(uid).doc(`user_${requestId}`), { role: 'user', content: text, sequence: sequence - 1, createdAt: now, status: 'normal' })
    tx.set(ref, { role: 'assistant', sequence, createdAt: now, ...reply })
    tx.set(sessionRef(uid), { sequence, pendingId: ['pending', 'choose'].includes(reply.status || '') ? ref.id : null }, { merge: true })
    return { id: ref.id }
  })
}

export async function proposeManual(uid: string, requestId: string, action: Action, raw?: unknown, taskId?: string, expectedVersion?: number) {
  await migrateTaskTree(uid)
  const create = action === 'CREATE_TASK' || action === 'CREATE_SUBTASK'
  let before: Task | null = null
  if (!create) {
    const snapshot = await taskCollection(uid).doc(idSchema.parse(taskId)).get()
    if (!snapshot.exists) throw new Error('Task không tồn tại.')
    before = row<Task>(snapshot)
    if (before.version !== expectedVersion) throw new Error('Task đã thay đổi. Hãy tải lại danh sách.')
    if (action === 'RESTORE_TASK' ? !before.deletedAt : !!before.deletedAt) throw new Error('Trạng thái task đã thay đổi.')
  }
  const data = taskInputSchema.parse(raw || (before && taskInput(before)))
  const proposal: Proposal = { action, data, taskId: before?.id || null, expectedVersion: before?.version || null, before }
  return appendTurn(uid, requestId, `Yêu cầu ${create ? 'tạo' : action === 'DELETE_TASK' ? 'xóa' : action === 'RESTORE_TASK' ? 'khôi phục' : 'sửa'}: ${data.title}`, { status: 'pending', content: 'Kiểm tra thông tin và xác nhận để lưu.', proposal })
}

export async function chooseTask(uid: string, messageId: string, taskId: string) {
  const ref = messageCollection(uid).doc(idSchema.parse(messageId))
  const snapshot = await ref.get()
  const old = row<Message>(snapshot)
  if (old.status !== 'choose' || !old.intent || !old.candidates?.some(t => t.id === taskId)) throw new Error('Lựa chọn không hợp lệ.')
  const reply = await prepareIntent(uid, old.intent, idSchema.parse(taskId))
  await getAdminDb().runTransaction(async tx => {
    const current = await tx.get(ref)
    const session = await tx.get(sessionRef(uid))
    if (current.get('status') !== 'choose' || session.get('pendingId') !== messageId) throw new Error('Yêu cầu đã được xử lý.')
    tx.update(ref, { ...reply, candidates: [], intent: null })
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
  await migrateTaskTree(uid)
  const ref = messageCollection(uid).doc(idSchema.parse(messageId))
  const newTaskRef = taskCollection(uid).doc()
  return getAdminDb().runTransaction(async tx => {
    const message = await tx.get(ref)
    if (message.get('status') === 'confirmed') return { id: message.get('resultTaskId') as string }
    const session = await tx.get(sessionRef(uid))
    const root = await tx.get(userRoot(uid))
    if (message.get('status') !== 'pending' || session.get('pendingId') !== messageId) throw new Error('Yêu cầu không còn chờ xác nhận.')
    const storedProposal = message.get('proposal') as Proposal
    const proposal = { ...storedProposal, data: upgradeParentField(storedProposal.data) }
    const deleting = proposal.action === 'DELETE_TASK'
    const restoring = proposal.action === 'RESTORE_TASK'
    const data = taskInputSchema.parse(deleting || restoring ? proposal.data : raw)
    if (!['CREATE_TASK', 'CREATE_SUBTASK', 'UPDATE_TASK'].includes(proposal.action) && data.parentId !== proposal.data.parentId) throw new Error('Hành động này không thay đổi task cha. Hãy dùng Sửa công việc.')
    if (proposal.action === 'CREATE_SUBTASK' && !data.parentId) throw new Error('Hãy chọn task cha cho công việc con.')
    if (proposal.action === 'COMPLETE_TASK' && data.status !== 'done' || proposal.action === 'CANCEL_TASK' && data.status !== 'cancelled') throw new Error('Trạng thái không khớp hành động.')
    const taskRef = proposal.taskId ? taskCollection(uid).doc(idSchema.parse(proposal.taskId)) : newTaskRef
    const current = await tx.get(taskRef)
    const old = current.exists ? row<Task>(current) : null
    if (proposal.taskId && (!old || old.version !== proposal.expectedVersion)) throw new Error('Task đã thay đổi. Hủy đề xuất này và mở lại task để xem dữ liệu mới.')
    if (old && (restoring ? !old.deletedAt : !!old.deletedAt)) throw new Error('Task đã đổi trạng thái xóa.')
    const group = await tx.get(groupCollection(uid).doc(data.groupId))
    if (!group.exists || (!group.get('isActive') && (!old || old.groupId !== data.groupId))) throw new Error('Nhóm đã bị ẩn hoặc không tồn tại. Chọn nhóm đang hoạt động.')
    const snapshot = await tx.get(taskCollection(uid))
    const tasks = snapshot.docs.map(d => row<Task>(d))
    const beforePositions = treePositions(tasks)
    const nodes = tasks.map(t => ({ ...t, ...beforePositions.get(t.id)! }))
    if (data.parentId === taskRef.id) throw new Error('Task không được làm cha của chính nó.')
    const branch = descendants(nodes, taskRef.id)
    if (data.parentId && branch.has(data.parentId)) throw new Error('Không thể chuyển task vào nhánh con của chính nó vì sẽ tạo quan hệ vòng.')
    if (data.parentId && !deleting && !validParents(nodes, old?.id).some(t => t.id === data.parentId)) throw new Error('Task cha không hợp lệ, thuộc tài khoản khác hoặc nhánh cha đã bị xóa.')
    if (deleting) {
      if (nodes.some(t => branch.has(t.id) && !t.deletedAt)) throw new Error('Hãy xử lý/xóa task con trong toàn bộ nhánh trước khi xóa task cha.')
    }
    const positions = treePositions([...nodes.filter(t => t.id !== taskRef.id), { id: taskRef.id, parentId: data.parentId }])
    const now = FieldValue.serverTimestamp()
    const timestamp = (value: string | null) => value ? Timestamp.fromDate(new Date(value)) : null
    tx.set(taskRef, {
      ...data, ...positions.get(taskRef.id)!, deadline: timestamp(data.deadline), createdAt: old ? current.get('createdAt') : now, updatedAt: now,
      version: (old?.version || 0) + 1,
      completedAt: data.status === 'done' ? old?.status === 'done' ? current.get('completedAt') : now : null,
      cancelledAt: data.status === 'cancelled' ? old?.status === 'cancelled' ? current.get('cancelledAt') : now : null,
      deletedAt: deleting ? now : restoring ? null : old ? current.get('deletedAt') : null,
    })
    // Updating the whole branch atomically avoids stale roots/depths and invalidates
    // outstanding descendant proposals. Deleted descendants keep their links too.
    if (old && old.parentId !== data.parentId) {
      for (const document of snapshot.docs) if (branch.has(document.id)) {
        tx.update(document.ref, { ...positions.get(document.id)!, version: Number(document.get('version') || 0) + 1, updatedAt: now })
      }
    }
    tx.update(ref, { status: 'confirmed', proposal: { ...proposal, data }, resultTaskId: taskRef.id })
    tx.set(sessionRef(uid), { pendingId: null }, { merge: true })
    tx.set(userRoot(uid), { revision: Number(root.get('revision') || 0) + 1 }, { merge: true })
    return { id: taskRef.id }
  })
}

export async function summary(uid: string) {
  const tasks = await scanTasks(uid)
  const open = tasks.filter(isOpen)
  const today = filterSchema.parse({ view: 'today' })
  const { matches } = await import('../_lib/model')
  return { today: open.filter(t => matches(t, today)).length, urgent: open.filter(t => t.priority === 'urgent').length, inProgress: open.filter(t => t.status === 'in_progress').length, waiting: open.filter(t => t.status === 'waiting').length, overdue: open.filter(t => t.deadline && Date.parse(t.deadline) < Date.now()).length, groups: Object.fromEntries((await getGroups(uid)).map(g => [g.id, open.filter(t => t.groupId === g.id).length])) }
}

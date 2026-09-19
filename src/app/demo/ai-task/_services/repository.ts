import 'server-only'
import { buildTaskDisplayGroups, leafTasks } from '../_lib/task-display'
import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { idSchema, isOpen, matches, rankTasks, type Filters, type Group, type Message, type Task, type TreeNode } from '../_lib/model'
import { treePositions, upgradeParentField, validParents } from '../_lib/tree'

export function userRoot(userId: string) {
  return getAdminDb().collection('demo').doc('ai-task').collection('users').doc(idSchema.parse(userId))
}
export const taskCollection = (uid: string) => userRoot(uid).collection('tasks')
export const groupCollection = (uid: string) => userRoot(uid).collection('taskGroups')
export const sessionRef = (uid: string) => userRoot(uid).collection('chatSessions').doc('main')
export const messageCollection = (uid: string) => sessionRef(uid).collection('messages')
export function serialize(value: unknown): any {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (Array.isArray(value)) return value.map(serialize)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]))
  return value
}
export const row = <T>(doc: FirebaseFirestore.DocumentSnapshot) => ({ ...serialize(doc.data()), id: doc.id }) as T
export async function initialize(uid: string) {
  const root = userRoot(uid)
  if ((await root.get()).get('initialized')) { await migrateTaskTree(uid); return }
  await getAdminDb().runTransaction(async tx => {
    if ((await tx.get(root)).get('initialized')) return
    const now = FieldValue.serverTimestamp()
    ;[['inbox', 'Inbox'], ['ainka', 'Ainka'], ['personal', 'Cá nhân'], ['idea', 'Ý tưởng']].forEach(([id, name], order) => tx.set(groupCollection(uid).doc(id), { name, slug: id, color: null, order, isDefault: id === 'inbox', isActive: true, createdAt: now, updatedAt: now }))
    tx.set(root, { initialized: true, revision: 0, createdAt: now })
  })
  await migrateTaskTree(uid)
}

/** One atomic migration per owner. Only structural fields change; old proposal
 * versions remain valid. Dangling links/cycles fail before any writes occur. */
export async function migrateTaskTree(uid: string) {
  const root = userRoot(uid)
  if ((await root.get()).get('treeSchemaVersion') === 2) return
  await getAdminDb().runTransaction(async tx => {
    const owner = await tx.get(root)
    if (owner.get('treeSchemaVersion') === 2) return
    const snapshot = await tx.get(taskCollection(uid))
    const nodes = snapshot.docs.map(d => {
      const task = upgradeParentField(row<Task>(d))
      return { id: d.id, parentId: task.parentId ?? null }
    })
    const positions = treePositions(nodes)
    snapshot.docs.forEach(d => tx.update(d.ref, { ...positions.get(d.id)!, parentTaskId: FieldValue.delete() }))
    tx.set(root, { treeSchemaVersion: 2, revision: Number(owner.get('revision') || 0) + 1 }, { merge: true })
  })
}
export async function getGroups(uid: string): Promise<Group[]> {
  return (await groupCollection(uid).get()).docs.map(d => row<Group>(d)).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
}
// Exhaustive paged scan for personal-sized datasets: results/counts are never silently
// truncated. No composite indexes or external full-text service are required in MVP.
export async function scanTasks(uid: string): Promise<Task[]> {
  const result: Task[] = []
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined
  while (true) {
    let query = taskCollection(uid).orderBy(FieldPath.documentId()).limit(300)
    if (cursor) query = query.startAfter(cursor)
    const snapshot = await query.get()
    result.push(...snapshot.docs.map(d => row<Task>(d)))
    if (snapshot.size < 300) break
    cursor = snapshot.docs[snapshot.docs.length - 1]
  }
  const compatible = result.map(t => { const task = upgradeParentField(t); return { ...task, parentId: task.parentId ?? null } })
  const positions = treePositions(compatible)
  return compatible.map(t => ({ ...t, ...positions.get(t.id)! }))
}

export async function getParentOptions(uid: string, taskId?: string) {
  if (taskId) idSchema.parse(taskId)
  const tasks = await scanTasks(uid)
  const nodes: TreeNode[] = tasks.map(({ id, title, parentId, rootTaskId, depth, deletedAt, groupId, status }) => ({ id, title, parentId, rootTaskId, depth, deletedAt, groupId, status }))
  if (taskId && !nodes.some(n => n.id === taskId)) throw new Error('Task không tồn tại trong tài khoản này.')
  return { nodes, candidates: validParents(tasks, taskId).filter(isOpen).map(t => nodes.find(n => n.id === t.id)!) }
}

export async function findTaskTree(uid: string, filters: Filters) {
  const tasks = await scanTasks(uid)
  const byId = new Map(tasks.map(t => [t.id, t]))
  const matchingIds = tasks.filter(t => matches(t, filters)).map(t => t.id)
  const included = new Set<string>()
  for (const id of matchingIds) {
    let current: string | null = id
    while (current && !included.has(current)) {
      included.add(current); current = byId.get(current)?.parentId || null
    }
  }
  // Keep ancestors as context even when they do not match the current filter.
  // Tree responses must not cut across a subtree at the flat-list page boundary.
  return { tasks: tasks.filter(t => included.has(t.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)), matchingIds, total: matchingIds.length }
}
export async function findTasks(uid: string, filters: Filters, page = 0) {
  let tasks = (await scanTasks(uid)).filter(t => matches(t, filters))
  tasks = filters.recommend ? rankTasks(tasks) : tasks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))
  return { tasks: tasks.slice(page * 30, (page + 1) * 30), total: tasks.length, page }
}
// Presentation query: preserve filter/ranking semantics, then exclude containers
// before pagination so counts and the 30 displayed rows agree.
export async function findDisplayTasks(uid: string, filters: Filters, page = 0) {
  const lookup = await scanTasks(uid)
  let tasks = leafTasks(lookup.filter(task => matches(task, filters)), lookup)
  tasks = filters.recommend ? rankTasks(tasks) : tasks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))
  return { tasks: tasks.slice(page * 30, (page + 1) * 30), total: tasks.length, page }
}

async function withDisplayGroups(uid: string, messages: Message[]): Promise<Message[]> {
  if (!messages.some(message => message.tasks && message.intent?.action !== 'GET_TASK_DETAIL')) return messages
  const [lookup, groups] = await Promise.all([scanTasks(uid), getGroups(uid)])
  return messages.map(message => message.tasks && message.intent?.action !== 'GET_TASK_DETAIL'
    ? { ...message, displayGroups: buildTaskDisplayGroups(message.tasks, groups, lookup) }
    : message)
}

export async function getMessages(uid: string, before?: number) {
  let query = messageCollection(uid).orderBy('sequence', 'desc').limit(10)
  if (before !== undefined) query = query.startAfter(before)
  const snapshot = await query.get()
  return { messages: await withDisplayGroups(uid, snapshot.docs.map(d => {
    const message = row<Message>(d)
    if (message.proposal) message.proposal = { ...message.proposal, data: upgradeParentField(message.proposal.data), before: upgradeParentField(message.proposal.before) }
    if (message.tasks) message.tasks = message.tasks.map(upgradeParentField)
    if (message.candidates) message.candidates = message.candidates.map(upgradeParentField)
    return message
  }).reverse()), hasMore: snapshot.size === 10 }
}

export async function getTurn(uid: string, messageId: string) {
  idSchema.parse(messageId)
  const docs = await Promise.all([messageCollection(uid).doc(`user_${messageId}`).get(), messageCollection(uid).doc(messageId).get()])
  return { messages: await withDisplayGroups(uid, docs.filter(doc => doc.exists).map(doc => {
    const message = row<Message>(doc)
    if (message.proposal) message.proposal = { ...message.proposal, data: upgradeParentField(message.proposal.data), before: upgradeParentField(message.proposal.before) }
    return message
  })) }
}

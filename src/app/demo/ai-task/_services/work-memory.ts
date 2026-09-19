import 'server-only'
import { dayKey, type Group, type TaskInput } from '../_lib/model'
import { emptyContext, emptyMemory, familiarDefaults, rememberForm, type ContextMemory, type WorkMemory } from '../_lib/work-memory'
import { treePath, validParents } from '../_lib/tree'
import { getGroups, getMessages, scanTasks, sessionRef, userRoot } from './repository'

export async function getContextMemory(uid: string): Promise<ContextMemory> {
  const session = await sessionRef(uid).get()
  if (session.get('contextMemory')) return { ...emptyContext(), ...session.get('contextMemory') }
  const legacy = (await userRoot(uid).get()).get('workMemory')
  return { ...emptyContext(), values: legacy?.context || {} }
}

export async function getWorkMemory(uid: string): Promise<WorkMemory> {
  const value = (await userRoot(uid).get()).get('workMemory')
  if (value) return { ...emptyMemory(), ...value }
  // Bootstrap only from an actual confirmed form, never infer from arbitrary tasks.
  // A reset stores an empty memory object, so it cannot resurrect old history.
  let before: number | undefined
  while (true) {
    const page = await getMessages(uid, before)
    const latest = [...page.messages].reverse().find(message => message.status === 'confirmed' && message.proposal && ['CREATE_TASK', 'CREATE_SUBTASK', 'UPDATE_TASK'].includes(message.proposal.action))
    if (latest?.proposal) return rememberForm(emptyMemory(), latest.proposal.data, latest.createdAt, latest.proposal.taskId || latest.id)
    if (!page.hasMore || !page.messages.length) return emptyMemory()
    before = page.messages[0].sequence
  }
}

export async function describeMemory(uid: string) {
  const [memory, contextMemory, groups, tasks] = await Promise.all([getWorkMemory(uid), getContextMemory(uid), getGroups(uid), scanTasks(uid)])
  const general = familiarDefaults({ ...memory, context: {} })
  const defaults = { ...general, ...contextMemory.values }
  return { memory, contextMemory, generalSummary: JSON.stringify({ ...general, notes: memory.notes }), summary: [
    defaults.groupId ? `Nhóm: ${groups.find(g => g.id === defaults.groupId && g.isActive)?.name || 'không còn khả dụng'}` : '',
    defaults.parentId ? `Nhánh: ${treePath(defaults.parentId, tasks)}` : 'Nhánh: task gốc',
    defaults.duration ? `Thời lượng: ${defaults.duration} phút` : '',
    defaults.startNow ? 'Bắt đầu: ngay khi xác nhận' : defaults.startClock ? `Giờ bắt đầu: ${defaults.startClock} (giờ Việt Nam)` : '',
    contextMemory.notes || memory.notes,
  ].filter(Boolean).join(' · ') }
}

export async function suggestedTaskFields(uid: string, groups: Group[], explicitGroup: boolean, now = Date.now()) {
  const memory = await getWorkMemory(uid)
  const contextMemory = await getContextMemory(uid)
  const defaults = { ...familiarDefaults({ ...memory, context: {} }), ...contextMemory.values }
  const fields: Partial<TaskInput> = {}
  const notes: string[] = []
  if (!explicitGroup && defaults.groupId && groups.some(g => g.id === defaults.groupId && g.isActive)) {
    fields.groupId = defaults.groupId
    notes.push(`nhóm ${groups.find(g => g.id === fields.groupId)!.name}`)
    if (defaults.parentId) {
      const tasks = await scanTasks(uid)
      if (validParents(tasks).some(t => t.id === defaults.parentId) && tasks.find(t => t.id === defaults.parentId)?.groupId === fields.groupId) {
        fields.parentId = defaults.parentId
        notes.push(`nhánh ${treePath(defaults.parentId, tasks)}`)
      }
    }
  }
  if (defaults.duration !== undefined) fields.duration = defaults.duration
  if (defaults.priority !== undefined) fields.priority = defaults.priority
  if (defaults.startNow) { fields.startNow = true; fields.startTime = null }
  else if (defaults.startClock) {
    let start = new Date(`${dayKey(now)}T${defaults.startClock}:00+07:00`).getTime()
    if (start < now) start += 86400000
    fields.startTime = new Date(start).toISOString(); fields.startNow = false
  }
  if (!defaults.startNow && defaults.startTime && Date.parse(defaults.startTime) > now) { fields.startTime = defaults.startTime; fields.startNow = false }
  if (defaults.deadline && Date.parse(defaults.deadline) > now) { fields.deadline = defaults.deadline; fields.scheduleMode = 'deadline'; fields.duration = null }
  return { fields, notes }
}

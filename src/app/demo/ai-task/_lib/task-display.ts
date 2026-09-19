import type { Group, Task, TreeNode } from './model'

export type TaskDisplayGroup = {
  parentPathKey: string
  groupId: string
  groupName: string
  ancestors: { id: string; title: string }[]
  tasks: Task[]
}

// Use the full lookup, not just filtered results: a hidden/non-matching child
// still makes its parent a container. No task or stored tree field is modified.
export function leafTasks(tasks: Task[], lookup: readonly TreeNode[] = tasks): Task[] {
  const parentIds = new Set(lookup.flatMap(task => task.parentId ? [task.parentId] : []))
  return tasks.filter(task => !parentIds.has(task.id))
}

export function buildTaskDisplayGroups(tasks: Task[], groups: readonly Group[], lookup: readonly TreeNode[] = tasks): TaskDisplayGroup[] {
  const taskById = new Map(lookup.map(task => [task.id, task]))
  const groupById = new Map(groups.map(group => [group.id, group.name]))
  const result = new Map<string, TaskDisplayGroup>()
  for (const task of leafTasks(tasks, lookup)) {
    const ancestors: TaskDisplayGroup['ancestors'] = []
    const visited = new Set([task.id])
    let parentId = task.parentId
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId)
      const parent = taskById.get(parentId)
      if (!parent) break
      ancestors.push({ id: parent.id, title: parent.title })
      parentId = parent.parentId
    }
    ancestors.reverse()
    // Retain a missing ancestor in the key so unrelated orphan branches
    // cannot accidentally merge; IDs are never displayed in the heading.
    const parentPathKey = [task.groupId, ...(parentId && !taskById.has(parentId) ? [parentId] : []), ...ancestors.map(parent => parent.id)].join('/')
    let group = result.get(parentPathKey)
    if (!group) {
      group = { parentPathKey, groupId: task.groupId, groupName: groupById.get(task.groupId) || 'Nhóm không còn khả dụng', ancestors, tasks: [] }
      result.set(parentPathKey, group)
    }
    group.tasks.push(task)
  }
  return Array.from(result.values())
}

import type { TreeNode } from './model'

type Link = { id: string; parentId: string | null }
export type TreePosition = { parentId: string | null; rootTaskId: string; depth: number }

/** Derive metadata from links, never from client-provided depth/root. Iterative:
 * neither a product depth limit nor a JavaScript recursion limit applies. */
export function treePositions(nodes: readonly Link[]): Map<string, TreePosition> {
  const byId = new Map(nodes.map(n => [n.id, n]))
  const positions = new Map<string, TreePosition>()
  for (const node of nodes) {
    const chain: Link[] = []
    const visiting = new Set<string>()
    let current: Link | undefined = node
    while (current && !positions.has(current.id)) {
      if (visiting.has(current.id)) throw new Error('Không thể tạo quan hệ vòng: task không được làm cha của chính nó hoặc chuyển vào nhánh con của nó.')
      visiting.add(current.id)
      chain.push(current)
      if (current.parentId === null) break
      const parent = byId.get(current.parentId)
      if (!parent) throw new Error('Task cha không tồn tại trong tài khoản này. Cần xử lý quan hệ cũ trước.')
      current = parent
    }
    while (chain.length) {
      const item = chain.pop()!
      const parent = item.parentId ? positions.get(item.parentId)! : null
      positions.set(item.id, { parentId: item.parentId, rootTaskId: parent?.rootTaskId || item.id, depth: parent ? parent.depth + 1 : 0 })
    }
  }
  return positions
}

export function descendants(nodes: readonly Link[], id: string): Set<string> {
  const children = new Map<string, string[]>()
  for (const n of nodes) if (n.parentId) children.set(n.parentId, [...(children.get(n.parentId) || []), n.id])
  const found = new Set<string>()
  const queue = [...(children.get(id) || [])]
  for (let i = 0; i < queue.length; i++) {
    const child = queue[i]
    if (found.has(child)) continue
    found.add(child); queue.push(...(children.get(child) || []))
  }
  return found
}

/** Exclude deleted branches, self and the entire subtree from parent choices. */
export function validParents<T extends TreeNode>(nodes: readonly T[], taskId?: string): T[] {
  const forbidden = taskId ? descendants(nodes, taskId) : new Set<string>()
  if (taskId) forbidden.add(taskId)
  const unavailable = new Set(nodes.filter(n => n.deletedAt).map(n => n.id))
  const ordered = [...nodes].sort((a, b) => a.depth - b.depth || a.title.localeCompare(b.title, 'vi'))
  return ordered.filter(n => {
    if (n.parentId && unavailable.has(n.parentId)) unavailable.add(n.id)
    return !unavailable.has(n.id) && !forbidden.has(n.id)
  })
}

export function treePath(id: string | null, nodes: readonly TreeNode[]): string {
  if (!id) return 'Không có · Task gốc'
  const byId = new Map(nodes.map(n => [n.id, n]))
  const path: string[] = [], seen = new Set<string>()
  let current = id
  while (current && !seen.has(current)) {
    seen.add(current)
    const node = byId.get(current)
    if (!node) { path.push('Task không còn khả dụng'); break }
    path.push(node.title); current = node.parentId || ''
  }
  return path.reverse().join(' / ')
}

/** Preorder traversal keeps each subtree together; hidden descendants stay hidden. */
export function visibleTree<T extends Link>(nodes: readonly T[], collapsed: ReadonlySet<string> = new Set()): T[] {
  const children = new Map<string | null, T[]>()
  const ids = new Set(nodes.map(n => n.id))
  for (const n of nodes) {
    const parent = n.parentId && ids.has(n.parentId) ? n.parentId : null
    children.set(parent, [...(children.get(parent) || []), n])
  }
  const stack = [...(children.get(null) || [])].reverse(), result: T[] = [], seen = new Set<string>()
  while (stack.length) {
    const node = stack.pop()!
    if (seen.has(node.id)) continue
    seen.add(node.id); result.push(node)
    if (!collapsed.has(node.id)) {
      const branch = children.get(node.id) || []
      for (let i = branch.length - 1; i >= 0; i--) stack.push(branch[i])
    }
  }
  return result
}

/** Old persisted proposals/history remain readable after parentTaskId migration. */
export function upgradeParentField<T>(value: T): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const record = { ...value } as Record<string, unknown>
  if (!Object.prototype.hasOwnProperty.call(record, 'parentId') && Object.prototype.hasOwnProperty.call(record, 'parentTaskId')) record.parentId = record.parentTaskId ?? null
  delete record.parentTaskId
  return record as T
}

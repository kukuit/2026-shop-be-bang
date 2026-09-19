import 'server-only'
import { overviewSchema, type TaskOverviewMemory } from '../_lib/task-memory'
import { userRoot } from './repository'
export async function getOverviewMemory(uid: string): Promise<TaskOverviewMemory> {
  const root = await userRoot(uid).get()
  const stored = root.get('overviewMemory')
  const value = stored || root.get('workMemory')?.lastForm || {}
  return overviewSchema.parse({ ...value, updatedAt: stored?.updatedAt?.toDate?.().toISOString() ?? value.updatedAt ?? null })
}
export async function describeMemory(uid: string) { return { overview: await getOverviewMemory(uid) } }

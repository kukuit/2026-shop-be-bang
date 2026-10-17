import 'server-only'
import { requireAdmin } from './current-user'

export async function requireAdminForApi() {
  try {
    return await requireAdmin()
  } catch (error) {
    console.error('[AdminAPI] Admin authorization check failed', error)
    return { ok: false as const, status: 500 as const }
  }
}

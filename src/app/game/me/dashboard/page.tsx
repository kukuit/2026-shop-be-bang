import Dashboard from './_components/Dashboard'
import { getRealDashboardData } from './_data/dashboard.server'
import { requireGameUser } from '@/lib/auth/current-user'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const auth = await requireGameUser()
  if (!auth.ok) return null
  const data = await getRealDashboardData(auth.user)
  return <Dashboard initialStudents={data.students} initialRecords={data.records} />
}

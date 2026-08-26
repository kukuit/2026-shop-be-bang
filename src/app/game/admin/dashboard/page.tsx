import Dashboard from './_components/Dashboard'
import { getRealDashboardData } from './_data/dashboard.server'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const data = await getRealDashboardData()
  return <Dashboard initialStudents={data.students} initialRecords={data.records} />
}

import { notFound } from 'next/navigation'
import { Entity, entities } from '../_lib/model'
import Records from '../_components/Records'
import Dashboard from '../_components/Dashboard'
import Chat from '../_components/Chat'
import ImportExport from '../_components/ImportExport'
import Audit from '../_components/Audit'
export default function Page({ params }: { params: { module: string } }) {
  if (params.module === 'dashboard') return <Dashboard />
  if (params.module === 'chat') return <Chat />
  if (params.module === 'import-export') return <ImportExport />
  if (params.module === 'audit') return <Audit />
  if (params.module === 'debts') return <><Records entity="receivables" /><Records entity="payables" /></>
  const entity = (params.module === 'crop-expenses' ? 'cropExpenses' : params.module) as Entity
  if (!entities.includes(entity)) notFound()
  return <Records entity={entity} />
}

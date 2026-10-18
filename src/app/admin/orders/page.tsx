import AdminOrderList from '@/components/admin/orders/AdminOrderList'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Quản lý đơn hàng | Admin', robots: { index: false, follow: false } }
export default function AdminOrdersPage() { return <AdminOrderList /> }

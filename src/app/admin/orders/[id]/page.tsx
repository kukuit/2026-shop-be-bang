import AdminOrderDetail from '@/components/admin/orders/AdminOrderDetail'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Chi tiết đơn hàng | Admin', robots: { index: false, follow: false } }
export default function AdminOrderDetailPage({ params }: { params: { id: string } }) { return <AdminOrderDetail id={params.id} /> }

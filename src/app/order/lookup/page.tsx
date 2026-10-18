import type { Metadata } from 'next'
import OrderLookupClient from '@/components/orders/OrderLookupClient'

export const metadata: Metadata = { title: 'Tra cứu đơn hàng', robots: { index: false, follow: false } }
export default function OrderLookupPage() { return <OrderLookupClient /> }

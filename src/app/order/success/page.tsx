import type { Metadata } from 'next'
import OrderSuccessClient from '@/components/orders/OrderSuccessClient'

export const metadata: Metadata = { title: 'Đã nhận yêu cầu đặt hàng', robots: { index: false, follow: false } }
export default function OrderSuccessPage() { return <OrderSuccessClient /> }

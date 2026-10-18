import type { Metadata } from 'next'
import CheckoutClient from '@/components/cart/CheckoutClient'

export const metadata: Metadata = { title: 'Thông tin đặt hàng', robots: { index: false, follow: false } }
export default function CheckoutPage() { return <CheckoutClient /> }

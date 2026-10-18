import type { Metadata } from 'next'
import CartPageClient from '@/components/cart/CartPageClient'
import { listPublicProducts } from '@/lib/products/service'

export const metadata: Metadata = { title: 'Giỏ hàng', robots: { index: false, follow: false } }
export default async function CartPage() {
  const { products } = await listPublicProducts({ limit: 12, sort: 'newest' }).catch(() => ({ products: [], nextCursor: null }))
  return <CartPageClient recommendedProducts={products} />
}

import ProductForm from '@/components/admin/products/ProductForm'
import type { ProductType } from '@/lib/products/types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Thêm sản phẩm | Admin' }

export default function NewProductPage({ searchParams }: { searchParams: { type?: string } }) {
  const initialType: ProductType = searchParams.type === 'COMBO' ? 'COMBO' : 'SIMPLE'
  return <ProductForm initialType={initialType} />
}

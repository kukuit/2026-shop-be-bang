import { notFound } from 'next/navigation'
import ProductForm from '@/components/admin/products/ProductForm'
import { getAdminProduct } from '@/lib/products/service'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const product = await getAdminProduct(params.id)
  return { title: product ? `Sửa ${product.name} | Admin` : 'Sửa sản phẩm | Admin' }
}

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const product = await getAdminProduct(params.id)
  if (!product) notFound()
  return <ProductForm key={`${product.id}:${product.updatedAt ?? ''}`} product={product} />
}

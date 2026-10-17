import ProductCard from '@/components/home/ProductCard'
import { getHomeSaleProducts } from '@/lib/products/service'

export default async function SaleSection() {
  const products = await getHomeSaleProducts().catch(error => {
    console.error('[HomeProducts] Could not load sale products', error)
    return []
  })
  return (
    <section id="sale" className="scroll-mt-20 py-6 md:py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">Quần áo sale</h2>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">Ưu đãi đang áp dụng</span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Ưu đãi đặc biệt cho những sản phẩm bé yêu thích.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
      {!products.length && <p className="rounded-xl border border-dashed border-zinc-200 bg-white p-5 text-sm text-zinc-500">Hiện chưa có sản phẩm sale.</p>}
    </section>
  )
}

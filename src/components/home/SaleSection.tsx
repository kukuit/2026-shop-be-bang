import ProductCard from '@/components/home/ProductCard'
import { saleProducts } from '@/data/home-products'

export default function SaleSection() {
  return (
    <section id="sale" className="scroll-mt-20 py-6 md:py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">Quần áo sale</h2>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">Giảm đến 50%</span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Ưu đãi đặc biệt cho những sản phẩm bé yêu thích.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {saleProducts.map((product) => <ProductCard key={product.id} product={product} mode="sale" />)}
      </div>
    </section>
  )
}

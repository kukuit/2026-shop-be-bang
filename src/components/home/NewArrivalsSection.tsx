import ProductCard from '@/components/home/ProductCard'
import { newArrivalProducts } from '@/data/home-products'

export default function NewArrivalsSection() {
  return (
    <section id="new-arrivals" className="scroll-mt-20 py-6 md:py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">Quần áo mới về</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Những thiết kế mới nhất, xinh xắn và thoải mái cho bé yêu.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {newArrivalProducts.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  )
}

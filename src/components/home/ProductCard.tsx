import Image from 'next/image'
import type { HomeProduct } from '@/data/home-products'

function formatPrice(price: number) {
  return `${new Intl.NumberFormat('vi-VN').format(price)}đ`
}

export default function ProductCard({ product, mode = 'new' }: { product: HomeProduct; mode?: 'new' | 'sale' }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-100 bg-white transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#fff8f5]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          loading="lazy"
          sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 360px"
          className="object-cover transition-transform duration-300 hover:scale-[1.03]"
        />
        {mode === 'sale' && product.salePercent ? (
          <span className="absolute left-3 top-3 rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white">
            -{product.salePercent}%
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <h3 className="min-h-12 text-base font-medium leading-6 text-zinc-800">{product.name}</h3>
        {mode === 'sale' && product.oldPrice ? (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm text-zinc-400 line-through">{formatPrice(product.oldPrice)}</span>
            <span className="text-lg font-semibold text-rose-500">{formatPrice(product.price)}</span>
          </div>
        ) : (
          <p className="mt-2 text-lg font-semibold text-zinc-900">{formatPrice(product.price)}</p>
        )}
      </div>
    </article>
  )
}

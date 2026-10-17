import Link from 'next/link'
import type { PublicProduct } from '@/lib/products/types'
import { getProductDiscountPercent, getProductEffectivePrice, isProductOnSale } from '@/lib/products/pricing'
import ProductImageView from '@/components/products/ProductImageView'

function formatPrice(price: number) {
  return `${new Intl.NumberFormat('vi-VN').format(price)}đ`
}

export default function ProductCard({ product, now = new Date() }: { product: PublicProduct; now?: Date }) {
  const onSale = isProductOnSale(product, now)
  const thumbnailImage = product.images.find(image => image.url === product.thumbnail)
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-100 bg-white transition-shadow hover:shadow-md">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#fff8f5]">
          <ProductImageView src={product.thumbnail} publicId={thumbnailImage?.publicId} variant="card" alt={product.name} sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 360px" className="object-cover transition-transform duration-300 hover:scale-[1.03]" />
          {product.isNewArrival && <span className="absolute left-3 top-3 rounded-full bg-pink-500 px-3 py-1 text-xs font-semibold text-white">Mới về</span>}
          {onSale && <span className="absolute right-3 top-3 rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white">-{getProductDiscountPercent(product, now)}%</span>}
        </div>
        <div className="p-4">
          <h3 className="min-h-12 text-base font-medium leading-6 text-zinc-800">{product.name}</h3>
          {onSale ? <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm text-zinc-400 line-through">{formatPrice(product.price)}</span>
            <span className="text-lg font-semibold text-rose-500">{formatPrice(getProductEffectivePrice(product, now))}</span>
          </div> : <p className="mt-2 text-lg font-semibold text-zinc-900">{formatPrice(product.price)}</p>}
        </div>
      </Link>
    </article>
  )
}

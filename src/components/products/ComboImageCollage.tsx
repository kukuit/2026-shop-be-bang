import ProductImageView from '@/components/products/ProductImageView'

export type ComboDisplayImage = { id: string; url: string; name: string }

export default function ComboImageCollage({ images, className = '', variant = 'card' }: {
  images: ComboDisplayImage[]
  className?: string
  variant?: 'card' | 'thumbnail'
}) {
  const visibleImages = images.slice(0, 4)
  if (!visibleImages.length) return null

  return <div
    role="img"
    aria-label={`Ảnh sản phẩm trong combo: ${images.map(image => image.name).join(', ')}`}
    className={`grid h-full w-full overflow-hidden bg-white ${visibleImages.length === 1 ? 'grid-cols-1 grid-rows-1' : visibleImages.length === 2 ? 'grid-cols-2 grid-rows-1' : 'grid-cols-2 grid-rows-2'} ${className}`}
  >
    {visibleImages.map((image, index) => <div key={image.id} className={`relative min-h-0 min-w-0 overflow-hidden bg-[#fff8f5] ${visibleImages.length === 3 && index === 2 ? 'col-span-2' : ''}`}>
      <ProductImageView src={image.url} variant={variant} alt="" sizes={variant === 'card' ? '(max-width: 639px) 50vw, 180px' : '80px'} className="object-cover" />
      {index === 3 && images.length > 4 && <span className="absolute inset-0 grid place-items-center bg-zinc-950/55 text-sm font-black text-white">+{images.length - 4}</span>}
    </div>)}
  </div>
}

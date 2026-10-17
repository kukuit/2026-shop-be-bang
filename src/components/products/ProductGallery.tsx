'use client'

import { useState } from 'react'
import type { ProductImage } from '@/lib/products/types'
import ProductImageView from './ProductImageView'

export default function ProductGallery({ name, thumbnail, images }: { name: string; thumbnail: string; images: ProductImage[] }) {
  const allImages = images.length ? images : [{ id: 'thumbnail', url: thumbnail, alt: name, sortOrder: 0 }]
  const [selected, setSelected] = useState(allImages[0])
  return <div>
    <div className="relative aspect-square overflow-hidden rounded-3xl bg-[#fff8f5]"><ProductImageView src={selected.url} publicId={selected.publicId} variant="detail" alt={selected.alt || name} sizes="(max-width: 1023px) 100vw, 50vw" className="object-contain" /></div>
    {allImages.length > 1 && <div className="mt-3 grid grid-cols-5 gap-2">{allImages.map(image => <button key={image.id} type="button" onClick={() => setSelected(image)} aria-label={`Xem ảnh ${image.alt || name}`} className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-[#fff8f5] ${selected.id === image.id ? 'border-pink-500' : 'border-transparent'}`}><ProductImageView src={image.url} publicId={image.publicId} variant="thumbnail" alt="" sizes="100px" className="object-cover" /></button>)}</div>}
  </div>
}

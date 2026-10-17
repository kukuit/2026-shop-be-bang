'use client'

import Image from 'next/image'
import { useState } from 'react'

type ImageVariant = 'card' | 'detail' | 'thumbnail' | 'admin'

function cloudinaryDeliveryUrl(src: string, publicId?: string, variant: ImageVariant = 'detail') {
  if (!publicId || !/^shopbebang\/products\/[a-zA-Z0-9_-]{1,180}\/[a-f0-9-]{36}$/i.test(publicId)) return src
  const uploadMarker = '/image/upload/'
  const uploadIndex = src.indexOf(uploadMarker)
  if (!src.startsWith('https://res.cloudinary.com/') || uploadIndex < 0) return src
  const transformations: Record<ImageVariant, string> = {
    card: 'c_fill,w_720,h_540,g_auto/f_auto/q_auto:good',
    detail: 'c_limit,w_1600/f_auto/q_auto:good',
    thumbnail: 'c_fill,w_240,h_240,g_auto/f_auto/q_auto:good',
    admin: 'c_limit,w_640/f_auto/q_auto:good',
  }
  const boundary = uploadIndex + uploadMarker.length
  return `${src.slice(0, boundary)}${transformations[variant]}/${src.slice(boundary)}`
}

export default function ProductImageView({ src, alt, sizes, className = '', publicId, variant = 'detail' }: { src: string; alt: string; sizes: string; className?: string; publicId?: string; variant?: ImageVariant }) {
  const [failed, setFailed] = useState(false)
  return <Image
    src={failed || !src ? '/images/product-placeholder.svg' : cloudinaryDeliveryUrl(src, publicId, variant)}
    alt={alt}
    fill
    unoptimized
    sizes={sizes}
    onError={() => setFailed(true)}
    className={className}
  />
}

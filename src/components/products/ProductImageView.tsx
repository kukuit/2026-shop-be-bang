'use client'

import { useState } from 'react'
import CloudinaryImage from '@/components/common/CloudinaryImage'

type ImageVariant = 'card' | 'detail' | 'thumbnail' | 'admin'

export default function ProductImageView({ src, alt, sizes, className = '', variant = 'detail', priority = false }: { src: string; alt: string; sizes: string; className?: string; publicId?: string; variant?: ImageVariant; priority?: boolean }) {
  const [failed, setFailed] = useState(false)
  const imageSrc = failed || !src ? '/images/product-placeholder.svg' : src
  const pixelSizes = /(?:vw|vh|%|calc\()/i.test(sizes)
    ? []
    : Array.from(sizes.matchAll(/(\d+(?:\.\d+)?)px/g), match => Number(match[1]))
  const fixedSize = pixelSizes.length ? Math.max(...pixelSizes) : null
  const imageTransform = variant === 'thumbnail'
    ? { cropMode: 'fill' as const, aspectRatio: 1, gravity: 'auto' }
    : variant === 'card'
      ? { cropMode: 'fill' as const, aspectRatio: 4 / 3, gravity: 'auto' }
      : { cropMode: 'fit' as const }
  const commonProps = {
    src: imageSrc,
    alt,
    priority,
    onError: () => setFailed(true),
    className: fixedSize ? `h-full w-full ${className}` : className,
    ...imageTransform,
  }

  return fixedSize
    ? <CloudinaryImage {...commonProps} width={Math.round(fixedSize)} height={Math.round(fixedSize)} />
    : <CloudinaryImage {...commonProps} fill sizes={sizes} />
}

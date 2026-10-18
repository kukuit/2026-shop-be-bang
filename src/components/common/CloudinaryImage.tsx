import Image, { type ImageLoaderProps, type ImageProps } from 'next/image'
import { createCloudinaryImageLoader, isCloudinaryImageUrl, type CloudinaryCropMode } from '@/lib/cloudinary-image'

type CloudinaryImageProps = Omit<ImageProps, 'loader' | 'src'> & {
  src: string
  cropMode?: CloudinaryCropMode
  aspectRatio?: number
  gravity?: string
}

function isNextOptimizableSource(src: string) {
  if (src.startsWith('/') && !src.startsWith('//')) return true
  try {
    const url = new URL(src)
    return url.protocol === 'https:' && url.hostname === 'firebasestorage.googleapis.com'
  } catch {
    return false
  }
}

export default function CloudinaryImage({
  src,
  cropMode = 'fill',
  aspectRatio,
  gravity,
  ...imageProps
}: CloudinaryImageProps) {
  if (isCloudinaryImageUrl(src)) {
    const sourceAspectRatio = aspectRatio
      ?? (typeof imageProps.width === 'number' && typeof imageProps.height === 'number' && imageProps.height > 0
        ? imageProps.width / imageProps.height
        : undefined)
    const cloudinaryLoader = createCloudinaryImageLoader({ crop: cropMode, aspectRatio: sourceAspectRatio, gravity })
    const loader = (props: ImageLoaderProps) => cloudinaryLoader(props)
    return <Image {...imageProps} alt={imageProps.alt} src={src} loader={loader} />
  }

  return <Image {...imageProps} alt={imageProps.alt} src={src} unoptimized={!isNextOptimizableSource(src)} />
}

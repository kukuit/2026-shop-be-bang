export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_PRODUCT_IMAGE_COUNT = 8

export type ProductImageFormat = 'jpg' | 'png' | 'webp'

export function detectProductImageFormat(bytes: Uint8Array): ProductImageFormat | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return 'png'
  if (bytes.length >= 12 && String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === 'RIFF'
    && String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === 'WEBP') return 'webp'
  return null
}

export function matchesProductImageMime(mime: string, format: ProductImageFormat) {
  return mime === (format === 'jpg' ? 'image/jpeg' : `image/${format}`)
}

'use client'

import { detectProductImageFormat, MAX_PRODUCT_IMAGE_BYTES } from '@/lib/products/image-validation'

export async function prepareProductImage(file: File, options: { maxEdge?: number; quality?: number } = {}) {
  if (file.size < 1 || file.size > MAX_PRODUCT_IMAGE_BYTES) throw new Error('Ảnh đầu vào phải nhỏ hơn hoặc bằng 5 MB.')
  if (!detectProductImageFormat(new Uint8Array(await file.slice(0, 16).arrayBuffer()))) throw new Error('Chỉ nhận ảnh JPEG, PNG hoặc WebP hợp lệ.')
  if (typeof createImageBitmap !== 'function') return file
  let bitmap: ImageBitmap
  try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }) }
  catch { return file }
  try {
    const ratio = Math.min(1, (options.maxEdge ?? 1200) / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * ratio))
    const height = Math.max(1, Math.round(bitmap.height * ratio))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', options.quality ?? 0.84))
    if (!blob || blob.type !== 'image/webp' || blob.size < 1 || blob.size > MAX_PRODUCT_IMAGE_BYTES) return file
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp', lastModified: Date.now() })
  } finally {
    bitmap.close()
  }
}

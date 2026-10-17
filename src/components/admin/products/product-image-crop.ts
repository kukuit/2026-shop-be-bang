import type { Area } from 'react-easy-crop'
import { detectProductImageFormat, matchesProductImageMime, MAX_PRODUCT_IMAGE_BYTES } from '@/lib/products/image-validation'

export const PRODUCT_IMAGE_OUTPUT_SIZE = 800
export const MIN_PRODUCT_IMAGE_CROP_SIZE = 128
const MAX_PRODUCT_IMAGE_PIXELS = 40_000_000

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Không đọc được ảnh. Hãy chọn một ảnh JPEG, PNG hoặc WebP khác.'))
    image.src = source
  })
}

export async function validateProductCropSource(file: File) {
  if (file.size < 1) throw new Error('Ảnh trống. Hãy chọn một ảnh khác.')
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) throw new Error('Ảnh gốc phải nhỏ hơn hoặc bằng 5 MB.')
  const format = detectProductImageFormat(new Uint8Array(await file.slice(0, 16).arrayBuffer()))
  if (!format || !matchesProductImageMime(file.type, format)) {
    throw new Error('Chỉ nhận ảnh JPEG, PNG hoặc WebP có nội dung khớp định dạng.')
  }

  let bitmap: ImageBitmap | undefined
  try {
    if (typeof createImageBitmap === 'function') {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      if (bitmap.width * bitmap.height > MAX_PRODUCT_IMAGE_PIXELS) {
        throw new Error('Ảnh có độ phân giải quá lớn để xử lý an toàn trên thiết bị này.')
      }
      if (bitmap.width < 1 || bitmap.height < 1) throw new Error('Ảnh không có kích thước hợp lệ.')
    } else {
      const source = URL.createObjectURL(file)
      try {
        const image = await loadImage(source)
        if (image.naturalWidth * image.naturalHeight > MAX_PRODUCT_IMAGE_PIXELS) {
          throw new Error('Ảnh có độ phân giải quá lớn để xử lý an toàn trên thiết bị này.')
        }
        if (!image.naturalWidth || !image.naturalHeight) throw new Error('Ảnh không có kích thước hợp lệ.')
      } finally {
        URL.revokeObjectURL(source)
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Ảnh ')) throw error
    throw new Error('Không thể mở ảnh này. Hãy thử chọn lại ảnh JPEG, PNG hoặc WebP.')
  } finally {
    bitmap?.close()
  }
}

function rotatedBounds(width: number, height: number, rotation: number) {
  const radians = rotation * Math.PI / 180
  return {
    width: Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
    height: Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
  }
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Không xử lý được ảnh. Hãy thử ảnh khác hoặc giảm độ phân giải ảnh gốc.'))
        return
      }
      if (blob.type !== 'image/webp') {
        reject(new Error('Trình duyệt này không hỗ trợ xuất WebP. Hãy cập nhật trình duyệt rồi thử lại.'))
        return
      }
      resolve(blob)
    }, 'image/webp', quality)
  })
}

export async function createCroppedProductWebp(
  source: string,
  crop: Area,
  rotation: number,
  options: { outputSize?: number; quality?: number } = {},
) {
  const image = await loadImage(source)
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('Ảnh không có kích thước hợp lệ.')
  if (image.naturalWidth * image.naturalHeight > MAX_PRODUCT_IMAGE_PIXELS) {
    throw new Error('Ảnh có độ phân giải quá lớn để xử lý an toàn trên thiết bị này.')
  }

  const cropSize = Math.min(crop.width, crop.height)
  if (!Number.isFinite(cropSize) || cropSize < MIN_PRODUCT_IMAGE_CROP_SIZE) {
    throw new Error(`Vùng cắt quá nhỏ. Hãy chọn ảnh có vùng cắt tối thiểu ${MIN_PRODUCT_IMAGE_CROP_SIZE} × ${MIN_PRODUCT_IMAGE_CROP_SIZE} px.`)
  }

  const outputSize = options.outputSize ?? PRODUCT_IMAGE_OUTPUT_SIZE
  const outputEdge = Math.floor(Math.min(outputSize, cropSize))
  const scale = outputEdge / cropSize
  const bounds = rotatedBounds(image.naturalWidth, image.naturalHeight, rotation)
  const canvas = document.createElement('canvas')
  canvas.width = outputEdge
  canvas.height = outputEdge

  try {
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) throw new Error('Thiết bị không thể xử lý ảnh. Hãy thử lại bằng trình duyệt mới hơn.')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.setTransform(scale, 0, 0, scale, -crop.x * scale, -crop.y * scale)
    context.translate(bounds.width / 2, bounds.height / 2)
    context.rotate(rotation * Math.PI / 180)
    context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)

    const blob = await canvasToWebp(canvas, options.quality ?? 0.82)
    if (blob.size < 1) throw new Error('Ảnh WebP sau xử lý bị trống. Hãy thử lại.')
    if (blob.size > MAX_PRODUCT_IMAGE_BYTES) throw new Error('Ảnh sau xử lý vẫn lớn hơn 5 MB. Hãy chọn ảnh khác.')
    const file = new File([blob], `product-${crypto.randomUUID()}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    })
    return { file, width: outputEdge, height: outputEdge }
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}

export function formatImageSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

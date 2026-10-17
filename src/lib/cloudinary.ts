import 'server-only'
import { v2 as cloudinary } from 'cloudinary'

export type CloudinaryFolderMode = 'dynamic' | 'fixed'

let folderModeRequest: Promise<CloudinaryFolderMode> | undefined

export function getCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()
  if (!cloudName || !apiKey || !apiSecret) throw new Error('CLOUDINARY_NOT_CONFIGURED')
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true })
  return cloudinary
}

export function getCloudinaryFolderMode() {
  if (!folderModeRequest) {
    folderModeRequest = getCloudinary().api.config({ settings: true })
      .then(response => {
        const mode = response.settings?.folder_mode
        if (mode !== 'dynamic' && mode !== 'fixed') throw new Error('CLOUDINARY_FOLDER_MODE_UNAVAILABLE')
        return mode
      })
      .catch(error => {
        folderModeRequest = undefined
        throw error
      })
  }
  return folderModeRequest
}

export function getProductImagePublicId(productId: string, imageName: string) {
  return `shopbebang/products/${productId}/${imageName}`
}

export function isProductImagePublicIdFor(publicId: string, productId: string) {
  return publicId.startsWith(`shopbebang/products/${productId}/`)
    && /^shopbebang\/products\/[a-zA-Z0-9_-]{1,180}\/(?:[a-f0-9-]{36}|image-[a-f0-9-]{36})$/i.test(publicId)
}

export function isCloudinaryImageUrl(value: string) {
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    return hostname === 'cloudinary.com' || hostname.endsWith('.cloudinary.com')
  } catch {
    return false
  }
}

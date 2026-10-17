import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import type { UploadApiOptions, UploadApiResponse } from 'cloudinary'
import { NextResponse } from 'next/server'
import { requireAdminForApi } from '@/lib/auth/admin-api'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { getCloudinary, getCloudinaryFolderMode, getProductImagePublicId, isProductImagePublicIdFor } from '@/lib/cloudinary'
import { detectProductImageFormat, matchesProductImageMime, MAX_PRODUCT_IMAGE_BYTES, MAX_PRODUCT_IMAGE_COUNT } from '@/lib/products/image-validation'
import { isValidProductDraftToken } from '@/lib/products/draft-token'
import { findReferencedCloudinaryPublicIds, getAdminProduct } from '@/lib/products/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_FILES = MAX_PRODUCT_IMAGE_COUNT
const MAX_REQUEST_BYTES = MAX_PRODUCT_IMAGE_BYTES * MAX_FILES + 512 * 1024
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX_FILES = 40
const rateWindows = new Map<string, { startedAt: number; count: number }>()
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })

function isFile(value: FormDataEntryValue): value is File {
  return typeof value !== 'string' && typeof value.arrayBuffer === 'function'
}

async function parseBoundedFormData(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''
  if (!/^multipart\/form-data;\s*boundary=/i.test(contentType) || !request.body) throw new Error('INVALID_MULTIPART_REQUEST')
  const reader = request.body.getReader()
  const chunks: ArrayBuffer[] = []
  let totalBytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > MAX_REQUEST_BYTES) {
      await reader.cancel()
      throw new Error('UPLOAD_REQUEST_TOO_LARGE')
    }
    chunks.push(Uint8Array.from(value).buffer)
  }
  // Blob normalizes MIME types to lowercase, which can lowercase the
  // case-sensitive multipart boundary and make FormData parsing fail.
  // Keep the original header value on the reconstructed response instead.
  const body = new Blob(chunks)
  return new Response(body, { headers: { 'content-type': contentType } }).formData()
}

function consumeUploadLimit(adminId: string, fileCount: number) {
  const now = Date.now()
  rateWindows.forEach((value, id) => { if (now - value.startedAt >= RATE_WINDOW_MS) rateWindows.delete(id) })
  const current = rateWindows.get(adminId)
  if (current && current.count + fileCount > RATE_MAX_FILES) return false
  rateWindows.set(adminId, current ? { ...current, count: current.count + fileCount } : { startedAt: now, count: fileCount })
  return true
}

function getSafeCloudinaryError(error: unknown) {
  const value = error && typeof error === 'object' ? error as {
    name?: unknown
    message?: unknown
    code?: unknown
    http_code?: unknown
    request_id?: unknown
  } : {}
  let message = typeof value.message === 'string' ? value.message : 'Unknown Cloudinary error'
  message = message.replace(/[\r\n\t]+/g, ' ').slice(0, 400)
  for (const secret of [process.env.CLOUDINARY_API_SECRET, process.env.CLOUDINARY_API_KEY]) {
    if (secret?.trim()) message = message.replaceAll(secret.trim(), '[redacted]')
  }
  message = message.replace(/(api[_ -]?key|api[_ -]?secret|authorization)\s*[:=]\s*\S+/gi, '$1=[redacted]')

  return {
    name: typeof value.name === 'string' ? value.name.slice(0, 80) : 'Error',
    code: typeof value.code === 'string' ? value.code.slice(0, 80) : undefined,
    httpCode: typeof value.http_code === 'number' ? value.http_code : undefined,
    requestId: typeof value.request_id === 'string' ? value.request_id.slice(0, 100) : undefined,
    message,
  }
}

function getUploadFailure(error: unknown) {
  const details = getSafeCloudinaryError(error)
  const message = details.message.toLowerCase()
  if (details.httpCode === 401 || details.httpCode === 403 || /invalid (api key|signature|cloud name)|unknown api key|must supply api_key/.test(message)) {
    return { status: 502, code: 'CLOUDINARY_AUTH_FAILED', message: 'Cloudinary từ chối xác thực. Kiểm tra CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET trong .env.local, sau đó khởi động lại server.' }
  }
  if (details.httpCode === 429) {
    return { status: 502, code: 'CLOUDINARY_RATE_LIMITED', message: 'Cloudinary đang giới hạn lượt tải ảnh. Vui lòng đợi một chút rồi thử lại.' }
  }
  if (details.httpCode === 400 || /invalid image|unsupported image|not a valid image|unknown format/.test(message)) {
    return { status: 415, code: 'CLOUDINARY_REJECTED_IMAGE', message: `Cloudinary từ chối ảnh này${details.message ? `: ${details.message}` : '.'}` }
  }
  if (details.httpCode && details.httpCode >= 500) {
    return { status: 502, code: 'CLOUDINARY_SERVICE_ERROR', message: `Cloudinary đang gặp lỗi dịch vụ (HTTP ${details.httpCode}). Vui lòng thử lại sau.` }
  }
  return {
    status: 502,
    code: 'CLOUDINARY_UPLOAD_FAILED',
    message: `Tải ảnh lên Cloudinary thất bại${details.message && details.message !== 'Unknown Cloudinary error' ? `: ${details.message}` : '. Vui lòng thử lại.'}`,
  }
}

function uploadStream(buffer: Buffer, options: UploadApiOptions) {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    let settled = false
    let timeout: NodeJS.Timeout | undefined
    const source = Readable.from([buffer])
    const destination = getCloudinary().uploader.upload_stream(options, (error, result) => {
      if (settled) return
      settled = true
      if (timeout) clearTimeout(timeout)
      if (error || !result) reject(error ?? new Error('CLOUDINARY_UPLOAD_FAILED'))
      else resolve(result)
    })
    const fail = (error: Error) => {
      if (settled) return
      settled = true
      if (timeout) clearTimeout(timeout)
      source.destroy()
      destination.destroy()
      reject(error)
    }
    source.on('error', fail)
    destination.on('error', fail)
    timeout = setTimeout(() => fail(new Error('CLOUDINARY_UPLOAD_TIMEOUT')), 45_000)
    source.pipe(destination)
  })
}

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await requireAdminForApi()
  if (!auth.ok) return json({ message: auth.status === 401 ? 'Chưa đăng nhập.' : auth.status === 403 ? 'Không đủ quyền.' : 'Không thể xác thực quyền Admin. Hãy thử lại.' }, auth.status)

  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_REQUEST_BYTES) return json({ message: 'Tổng dung lượng ảnh trong một lần gửi vượt quá giới hạn.' }, 413)

  const uploadedPublicIds: string[] = []
  let stage = 'đọc dữ liệu yêu cầu'
  try {
    const form = await parseBoundedFormData(request)
    const productId = form.get('productId')
    const draftToken = form.get('draftToken')
    const files = [...form.getAll('files'), ...form.getAll('file')]
    const clientIds = form.getAll('clientIds').map(value => typeof value === 'string' ? value : '')
    if (typeof productId !== 'string' || !/^[a-zA-Z0-9_-]{1,180}$/.test(productId))
      return json({ message: 'Mã sản phẩm chưa hợp lệ.' }, 400)
    const draftAuthorized = isValidProductDraftToken(productId, auth.user.id, draftToken)
    if (!draftAuthorized && !(await getAdminProduct(productId)))
      return json({ message: 'Sản phẩm không tồn tại hoặc mã sản phẩm tạm thời không hợp lệ.' }, 403)
    if (!files.length || files.length > MAX_FILES || files.some(value => !isFile(value)))
      return json({ message: 'Chọn từ 1 đến 8 ảnh cho mỗi lần tải lên.' }, 400)
    if (clientIds.length && (clientIds.length !== files.length || clientIds.some(id => !/^[a-zA-Z0-9_-]{1,100}$/.test(id))))
      return json({ message: 'Danh sách ảnh gửi lên chưa hợp lệ.' }, 400)
    if (!consumeUploadLimit(auth.user.id, files.length)) return json({ message: 'Đã chạm giới hạn tải ảnh tạm thời. Hãy thử lại sau 10 phút.' }, 429)

    const prepared: Array<{ file: File; bytes: Buffer; format: string; clientId: string }> = []
    let totalBytes = 0
    for (let index = 0; index < files.length; index++) {
      stage = `kiểm tra ảnh ${index + 1}`
      const file = files[index] as File
      if (file.size < 1 || file.size > MAX_PRODUCT_IMAGE_BYTES) return json({ message: 'Mỗi ảnh phải nhỏ hơn hoặc bằng 5 MB.' }, 413)
      totalBytes += file.size
      if (totalBytes > MAX_REQUEST_BYTES) return json({ message: 'Tổng dung lượng ảnh trong một lần gửi vượt quá giới hạn.' }, 413)
      const bytes = Buffer.from(await file.arrayBuffer())
      const format = detectProductImageFormat(bytes)
      if (!format || !matchesProductImageMime(file.type, format)) return json({ message: 'Chỉ nhận ảnh JPEG, PNG hoặc WebP có nội dung khớp định dạng.' }, 415)
      if (file.type !== 'image/webp' || format !== 'webp') return json({ message: 'Ảnh mới cần được crop và chuyển sang WebP trước khi tải lên.' }, 415)
      prepared.push({ file, bytes, format, clientId: clientIds[index] || randomUUID() })
    }

    stage = 'kết nối Cloudinary'
    const cloudinary = getCloudinary()
    const folderMode = await getCloudinaryFolderMode()
    const images = []
    for (let index = 0; index < prepared.length; index++) {
      const item = prepared[index]
      stage = `tải ảnh ${index + 1} lên Cloudinary`
      const imageId = randomUUID()
      const imageName = `image-${imageId}`
      const folder = `shopbebang/products/${productId}`
      const publicId = getProductImagePublicId(productId, imageName)
      const folderOptions: UploadApiOptions = folderMode === 'dynamic'
        ? { asset_folder: folder, public_id_prefix: folder, public_id: imageName, display_name: imageName }
        : { folder, public_id: imageName }
      const uploaded = await uploadStream(item.bytes, {
        ...folderOptions,
        resource_type: 'image',
        type: 'upload',
        overwrite: false,
        use_filename: false,
        unique_filename: false,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto:good' }],
      })
      if (isProductImagePublicIdFor(uploaded.public_id, productId)) uploadedPublicIds.push(uploaded.public_id)
      if (uploaded.public_id !== publicId || !uploaded.secure_url.startsWith('https://res.cloudinary.com/'))
        throw new Error('CLOUDINARY_UPLOAD_INVALID_RESPONSE')
      const assetFolder = folderMode === 'dynamic' ? uploaded.asset_folder : uploaded.folder
      if (assetFolder && assetFolder !== folder) throw new Error('CLOUDINARY_UPLOAD_WRONG_FOLDER')
      images.push({
        clientId: item.clientId,
        id: imageName,
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        width: uploaded.width,
        height: uploaded.height,
        format: uploaded.format,
        sortOrder: images.length,
      })
    }
    return json({ images }, 201)
  } catch (error) {
    if (uploadedPublicIds.length) {
      try {
        const cloudinary = getCloudinary()
        await Promise.allSettled(uploadedPublicIds.map(publicId => cloudinary.uploader.destroy(publicId, { resource_type: 'image', type: 'upload', invalidate: true })))
      } catch (cleanupError) {
        console.error('[CloudinaryProductImages] Cleanup after failed upload', getSafeCloudinaryError(cleanupError))
      }
    }
    if (error instanceof Error && error.message === 'UPLOAD_REQUEST_TOO_LARGE')
      return json({ message: 'Tổng dung lượng ảnh trong một lần gửi vượt quá giới hạn.' }, 413)
    if (error instanceof Error && error.message === 'INVALID_MULTIPART_REQUEST')
      return json({ message: 'Yêu cầu phải là multipart/form-data.' }, 400)
    if (error instanceof Error && error.message === 'CLOUDINARY_NOT_CONFIGURED')
      return json({ message: 'Cloudinary chưa được cấu hình. Hãy kiểm tra CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET.' }, 503)
    if (error instanceof Error && error.message === 'CLOUDINARY_UPLOAD_TIMEOUT')
      return json({ message: 'Cloudinary phản hồi quá thời gian cho phép. Hãy thử lưu ảnh lại.' }, 504)
    const details = getSafeCloudinaryError(error)
    const failure = getUploadFailure(error)
    console.error('[CloudinaryProductImages] Upload failed', { stage, ...details })
    const message = stage.includes('Cloudinary') || stage.includes('lên Cloudinary')
      ? failure.message
      : `Không thể ${stage}${details.message !== 'Unknown Cloudinary error' ? `: ${details.message}` : '. Vui lòng thử lại.'}`
    return json({ message, code: failure.code, requestId: details.requestId }, failure.status)
  }
}

export async function DELETE(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await requireAdminForApi()
  if (!auth.ok) return json({ message: auth.status === 401 ? 'Chưa đăng nhập.' : auth.status === 403 ? 'Không đủ quyền.' : 'Không thể xác thực quyền Admin. Hãy thử lại.' }, auth.status)
  const body = await request.json().catch(() => null) as { publicId?: unknown; draftToken?: unknown } | null
  const publicId = typeof body?.publicId === 'string' ? body.publicId : ''
  const owner = publicId.match(/^shopbebang\/products\/([a-zA-Z0-9_-]{1,180})\/(?:[a-f0-9-]{36}|image-[a-f0-9-]{36})$/i)
  if (!owner) return json({ message: 'Mã ảnh Cloudinary chưa hợp lệ.' }, 400)
  const productId = owner[1]
  if (!isProductImagePublicIdFor(publicId, productId)) return json({ message: 'Ảnh không thuộc thư mục sản phẩm.' }, 403)
  try {
    const draftAuthorized = isValidProductDraftToken(productId, auth.user.id, body?.draftToken)
    if (!draftAuthorized && !(await getAdminProduct(productId)))
      return json({ message: 'Sản phẩm không tồn tại hoặc mã sản phẩm tạm thời không hợp lệ.' }, 403)
    if ((await findReferencedCloudinaryPublicIds([publicId])).length)
      return json({ message: 'Ảnh vẫn đang được sản phẩm sử dụng.' }, 409)
    const result = await getCloudinary().uploader.destroy(publicId, { resource_type: 'image', type: 'upload', invalidate: true })
    if (result.result !== 'ok' && result.result !== 'not found') throw new Error('CLOUDINARY_DELETE_FAILED')
    return json({ deleted: true, result: result.result })
  } catch (error) {
    if (error instanceof Error && error.message === 'CLOUDINARY_NOT_CONFIGURED')
      return json({ message: 'Cloudinary chưa được cấu hình.' }, 503)
    console.error('[CloudinaryProductImages] Delete failed')
    return json({ message: 'Chưa xóa được ảnh khỏi Cloudinary.' }, 502)
  }
}

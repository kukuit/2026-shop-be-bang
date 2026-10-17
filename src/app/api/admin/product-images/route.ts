import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/current-user'
import { rejectCrossSiteMutation } from '@/lib/auth/request-security'
import { getAdminStorageBucket } from '@/lib/firebaseAdmin'
import { findReferencedStoragePaths } from '@/lib/products/service'
import { findReferencedCategoryStoragePaths } from '@/lib/product-categories/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function detectImage(bytes: Buffer) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { extension: 'jpg', mime: 'image/jpeg' }
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { extension: 'png', mime: 'image/png' }
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return { extension: 'webp', mime: 'image/webp' }
  return null
}

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await requireAdmin()
  if (!auth.ok) return json({ message: auth.status === 401 ? 'Chưa đăng nhập.' : 'Không đủ quyền.' }, auth.status)
  try {
    const form = await request.formData()
    const ownerType = form.get('ownerType')
    const ownerId = form.get('ownerId')
    const imageId = form.get('imageId')
    const file = form.get('file')
    if ((ownerType !== 'product' && ownerType !== 'category') || typeof ownerId !== 'string' || !/^[a-zA-Z0-9_-]{1,180}$/.test(ownerId)
      || typeof imageId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(imageId)
      || !file || typeof file !== 'object' || typeof (file as File).arrayBuffer !== 'function')
      return json({ message: 'Thông tin ảnh chưa hợp lệ.' }, 400)
    if (file.size < 1 || file.size > MAX_IMAGE_BYTES) return json({ message: 'Ảnh phải nhỏ hơn hoặc bằng 5 MB.' }, 400)
    const bytes = Buffer.from(await file.arrayBuffer())
    const detected = detectImage(bytes)
    if (!detected) return json({ message: 'File không phải ảnh JPEG, PNG hoặc WebP hợp lệ.' }, 415)
    if (file.type && file.type.startsWith('image/') && file.type !== detected.mime)
      return json({ message: 'Định dạng ảnh không khớp với nội dung file.' }, 415)
    const storagePath = `${ownerType === 'product' ? 'products' : 'product-categories'}/${ownerId}/${imageId}.${detected.extension}`
    const token = randomUUID()
    const bucket = getAdminStorageBucket()
    await bucket.file(storagePath).save(bytes, {
      resumable: false,
      metadata: {
        contentType: detected.mime,
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: { firebaseStorageDownloadTokens: token, uploadedBy: auth.user.id },
      },
    })
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`
    return json({ image: { id: imageId, url, storagePath, alt: '', sortOrder: 0 } }, 201)
  } catch (error) {
    console.error('[ProductImage] Upload failed', error)
    return json({ message: error instanceof Error && error.message === 'Missing FIREBASE_STORAGE_BUCKET'
      ? 'Firebase Storage chưa được cấu hình. Hãy thêm FIREBASE_STORAGE_BUCKET.'
      : 'Chưa tải được ảnh. Hãy kiểm tra cấu hình Firebase Storage.' }, 503)
  }
}

export async function DELETE(request: Request) {
  const rejected = rejectCrossSiteMutation(request)
  if (rejected) return rejected
  const auth = await requireAdmin()
  if (!auth.ok) return json({ message: auth.status === 401 ? 'Chưa đăng nhập.' : 'Không đủ quyền.' }, auth.status)
  const body = await request.json().catch(() => null)
  const storagePath = body && typeof body.storagePath === 'string' ? body.storagePath : ''
  if (!/^(?:products|product-categories)\/[a-zA-Z0-9_-]{1,180}\/[a-zA-Z0-9_-]{1,100}\.(?:jpg|png|webp)$/.test(storagePath))
    return json({ message: 'Đường dẫn ảnh chưa hợp lệ.' }, 400)
  try {
    const [productRefs, categoryRefs] = await Promise.all([
      findReferencedStoragePaths([storagePath]),
      findReferencedCategoryStoragePaths([storagePath]),
    ])
    if (productRefs.length || categoryRefs.length) return json({ message: 'Ảnh vẫn đang được sản phẩm hoặc danh mục khác sử dụng.' }, 409)
    await getAdminStorageBucket().file(storagePath).delete({ ignoreNotFound: true })
    return json({ deleted: true })
  } catch (error) {
    console.error('[ProductImage] Delete failed', error)
    return json({ message: error instanceof Error && error.message === 'Missing FIREBASE_STORAGE_BUCKET'
      ? 'Firebase Storage chưa được cấu hình.'
      : 'Chưa xóa được ảnh khỏi Firebase Storage.' }, 503)
  }
}

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Image as ImageIcon, Info, PackageCheck, Tags } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { Product, ProductImage } from '@/lib/products/types'
import type { ProductCategory } from '@/lib/product-categories/types'
import { getProductDiscountPercent } from '@/lib/products/pricing'
import { MAX_PRODUCT_IMAGE_COUNT } from '@/lib/products/image-validation'
import { slugify } from '@/lib/products/slug'
import ProductImageEditor, { type ProductImageItem } from './ProductImageEditor'

type Fields = {
  name: string; slug: string; categoryId: string; shortDescription: string; description: string
  price: string; salePrice: string; saleStartAt: string; saleEndAt: string
  isNewArrival: boolean; arrivalAt: string; stock: string; sortOrder: string
}
const blank: Fields = { name: '', slug: '', categoryId: '', shortDescription: '', description: '', price: '', salePrice: '', saleStartAt: '', saleEndAt: '', isNewArrival: false, arrivalAt: '', stock: '0', sortOrder: '0' }
const formatPrice = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`
const localDateTime = (value: string | null | undefined) => {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const dateOnly = (value: string | null | undefined) => {
  if (!value) return ''
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}
const toISO = (value: string) => value ? new Date(value).toISOString() : null
const bangkokDayStart = (value: string) => value ? new Date(`${value}T00:00:00+07:00`).toISOString() : null
const imageKey = (image: ProductImageItem) => image.localId ?? image.id
const persistedImage = ({ file: _file, previewUrl: _previewUrl, localId: _localId, uploadStatus: _uploadStatus, uploadProgress: _uploadProgress, uploadError: _uploadError, ...image }: ProductImageItem): ProductImage => image

async function readApiResponse<T extends Record<string, unknown>>(response: Response): Promise<T> {
  const text = await response.text()
  try {
    return JSON.parse(text) as T
  } catch {
    const preformatted = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i)?.[1]
    const detail = preformatted
      ?.replace(/<[^>]*>/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180)
    throw new Error(detail
      ? `Máy chủ trả về lỗi thay vì dữ liệu JSON (HTTP ${response.status}): ${detail}`
      : `Máy chủ trả về phản hồi không hợp lệ (HTTP ${response.status}). Hãy kiểm tra log server.`)
  }
}

export default function ProductForm({ product }: { product?: Product }) {
  const router = useRouter()
  const [savedId, setSavedId] = useState<string | null>(product?.id ?? null)
  const [fields, setFields] = useState<Fields>(product ? {
    name: product.name, slug: product.slug, categoryId: product.categoryId,
    shortDescription: product.shortDescription, description: product.description,
    price: String(product.price), salePrice: product.salePrice === null ? '' : String(product.salePrice),
    saleStartAt: localDateTime(product.saleStartAt), saleEndAt: localDateTime(product.saleEndAt),
    isNewArrival: product.isNewArrival, arrivalAt: dateOnly(product.arrivalAt), stock: String(product.stock),
    sortOrder: String(product.sortOrder),
  } : blank)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoryReload, setCategoryReload] = useState(0)
  const [images, setImages] = useState<ProductImageItem[]>(() => {
    const initial = (product?.images ?? []).map(image => ({ ...image }))
    const mainIndex = initial.findIndex(image => image.url === product?.thumbnail)
    if (mainIndex > 0) initial.unshift(initial.splice(mainIndex, 1)[0])
    return initial.map((image, sortOrder) => ({ ...image, sortOrder }))
  })
  const [thumbnailId, setThumbnailId] = useState(() => product?.images.find(image => image.url === product.thumbnail)?.id ?? product?.images[0]?.id ?? '')
  const [slugEdited, setSlugEdited] = useState(Boolean(product))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [draftReady, setDraftReady] = useState(Boolean(product))
  const [draftError, setDraftError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const savedImagesRef = useRef<ProductImage[]>(product?.images ?? [])
  const createdDuringFormRef = useRef(false)
  const draftIdRef = useRef<string>(product?.id ?? '')
  const draftTokenRef = useRef<string | null>(null)
  const createdCloudinaryIdsRef = useRef(new Set<string>())
  const pendingDirectUploadsRef = useRef(0)
  const imagesRef = useRef(images)
  imagesRef.current = images
  const editing = Boolean(savedId)
  const isActive = product?.isActive ?? true

  useEffect(() => {
    let active = true
    setCategoriesLoading(true)
    setCategoryError('')
    fetch('/api/admin/product-categories?limit=100', { cache: 'no-store' })
      .then(async response => {
        const body = await readApiResponse<{ message?: string; categories: ProductCategory[] }>(response)
        if (!response.ok) throw new Error(body.message ?? 'Không tải được danh mục.')
        return body.categories
      })
      .then(value => { if (active) setCategories(value.filter(category => category.isActive)) })
      .catch(reason => { if (active) setCategoryError(reason instanceof Error ? reason.message : 'Không tải được danh mục.') })
      .finally(() => { if (active) setCategoriesLoading(false) })
    return () => { active = false }
  }, [categoryReload])

  useEffect(() => {
    if (product) {
      draftIdRef.current = product.id
      draftTokenRef.current = null
      setDraftReady(true)
      return
    }
    let active = true
    setDraftReady(false)
    setDraftError('')
    fetch('/api/admin/products/draft', { method: 'POST', headers: { accept: 'application/json' } })
      .then(async response => {
        const body = await readApiResponse<{ id: string; token: string; message?: string }>(response)
        if (!response.ok || !body.id || !body.token) throw new Error(body.message ?? 'Không cấp được mã sản phẩm tạm thời.')
        return body
      })
      .then(body => {
        if (!active) return
        draftIdRef.current = body.id
        draftTokenRef.current = body.token
        setDraftReady(true)
      })
      .catch(reason => {
        if (active) setDraftError(reason instanceof Error ? reason.message : 'Không cấp được mã sản phẩm tạm thời.')
      })
    return () => { active = false }
  }, [product])

  useEffect(() => () => {
    for (const image of imagesRef.current) if (image.previewUrl) URL.revokeObjectURL(image.previewUrl)
  // Object URLs are owned by this editor and revoked when it closes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const price = Number(fields.price)
  const salePrice = fields.salePrice ? Number(fields.salePrice) : null
  const salePreview = useMemo(() => {
    if (!Number.isSafeInteger(price) || !Number.isSafeInteger(salePrice) || price <= 0 || salePrice! <= 0 || salePrice! >= price) return null
    const now = new Date()
    return getProductDiscountPercent({ price, salePrice, saleStartAt: null, saleEndAt: null } as Product, now)
  }, [price, salePrice])

  const formIssues = [
    images.length > MAX_PRODUCT_IMAGE_COUNT ? `Ảnh sản phẩm: giảm từ ${images.length} xuống tối đa ${MAX_PRODUCT_IMAGE_COUNT} ảnh` : '',
    !fields.name.trim() ? 'Tên sản phẩm' : '',
    !fields.slug.trim() ? 'Slug' : '',
    !fields.categoryId ? 'Danh mục' : '',
    !fields.price.trim() ? 'Giá gốc' : !Number.isSafeInteger(price) || price < 1 ? 'Giá gốc phải là số nguyên lớn hơn 0' : '',
    fields.salePrice && (!Number.isSafeInteger(salePrice) || salePrice! < 1 || salePrice! >= price) ? 'Giá sale phải là số nguyên dương và thấp hơn giá gốc' : '',
    fields.saleStartAt && fields.saleEndAt && new Date(fields.saleEndAt) < new Date(fields.saleStartAt) ? 'Thời gian kết thúc sale phải sau thời gian bắt đầu' : '',
    !fields.stock.trim() || !Number.isSafeInteger(Number(fields.stock)) || Number(fields.stock) < 0 ? 'Tồn kho phải là số nguyên không âm' : '',
    !fields.sortOrder.trim() || !Number.isSafeInteger(Number(fields.sortOrder)) || Number(fields.sortOrder) < 0 ? 'Thứ tự hiển thị phải là số nguyên không âm' : '',
  ].filter((issue): issue is string => Boolean(issue))

  const setField = <K extends keyof Fields>(key: K, value: Fields[K]) => setFields(current => ({ ...current, [key]: value }))

  function uploadImage(item: ProductImageItem, ownerId: string, onProgress: (percent: number) => void) {
    return new Promise<ProductImageItem>((resolve, reject) => {
      const key = imageKey(item)
      const form = new FormData()
      form.set('productId', ownerId)
      if (draftTokenRef.current) form.set('draftToken', draftTokenRef.current)
      form.append('files', item.file!, item.file!.name)
      form.append('clientIds', key)
      const request = new XMLHttpRequest()
      request.open('POST', '/api/admin/uploads/images')
      request.responseType = 'json'
      request.timeout = 60_000
      request.upload.addEventListener('progress', event => {
        if (event.lengthComputable) onProgress(Math.min(100, Math.round(event.loaded / event.total * 100)))
      })
      request.addEventListener('load', () => {
        const body = request.response ?? (() => { try { return JSON.parse(request.responseText) } catch { return {} } })()
        if (request.status < 200 || request.status >= 300) {
          reject(new Error(body.message ?? 'Tải ảnh lên Cloudinary thất bại.'))
          return
        }
        const image = body.images?.find((value: { clientId?: string }) => value.clientId === key)
        if (!image) {
          reject(new Error('Cloudinary không trả về thông tin ảnh đã tải.'))
          return
        }
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
        const { clientId: _clientId, ...metadata } = image
        resolve({ ...metadata, localId: key, alt: item.alt ?? '', sortOrder: item.sortOrder, uploadStatus: 'uploaded', uploadProgress: 100 })
      })
      request.addEventListener('error', () => reject(new Error('Mất kết nối khi tải ảnh. Hãy thử lại.')))
      request.addEventListener('timeout', () => reject(new Error('Tải ảnh quá thời gian cho phép. Hãy thử lại.')))
      request.send(form)
    })
  }

  async function uploadConfirmedImage(item: ProductImageItem, onProgress: (percent: number) => void) {
    const ownerId = savedId ?? draftIdRef.current
    if (!ownerId || (!savedId && !draftTokenRef.current)) throw new Error(draftError || 'Đang cấp mã sản phẩm. Hãy thử lại sau.')
    pendingDirectUploadsRef.current += 1
    setBusy(true)
    try {
      const uploaded = await uploadImage(item, ownerId, onProgress)
      if (uploaded.publicId) createdCloudinaryIdsRef.current.add(uploaded.publicId)
      return uploaded
    } finally {
      pendingDirectUploadsRef.current -= 1
      setBusy(pendingDirectUploadsRef.current > 0)
    }
  }

  async function cancelForm() {
    if (busy) return
    setBusy(true)
    const previouslySaved = new Set(savedImagesRef.current.map(image => image.publicId).filter((value): value is string => Boolean(value)))
    const unsavedPublicIds = Array.from(new Set([
      ...images.map(image => image.publicId),
      ...Array.from(createdCloudinaryIdsRef.current),
    ].filter((value): value is string => Boolean(value && !previouslySaved.has(value)))))
    for (const publicId of unsavedPublicIds) {
      await fetch('/api/admin/uploads/images', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ publicId, draftToken: draftTokenRef.current }) }).catch(() => null)
      createdCloudinaryIdsRef.current.delete(publicId)
    }
    if (createdDuringFormRef.current && savedId) {
      await fetch(`/api/admin/products/${savedId}`, { method: 'DELETE' }).catch(() => null)
    }
    router.push('/admin/products')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (pendingDirectUploadsRef.current > 0 || busy) {
      setError('Vui lòng đợi ảnh tải lên xong rồi lưu sản phẩm.')
      return
    }
    setBusy(true); setError(''); setMessage('')
    if (!fields.name.trim() || !fields.slug.trim() || !fields.categoryId) {
      setBusy(false); setError('Hãy nhập tên, slug và chọn danh mục sản phẩm.'); return
    }
    if (!Number.isSafeInteger(price) || price < 1) {
      setBusy(false); setError('Giá gốc phải là số nguyên lớn hơn 0.'); return
    }
    if (salePrice !== null && (!Number.isSafeInteger(salePrice) || salePrice < 1 || salePrice >= price)) {
      setBusy(false); setError('Giá sale phải là số nguyên lớn hơn 0 và thấp hơn giá gốc.'); return
    }
    const startAt = toISO(fields.saleStartAt)
    const endAt = toISO(fields.saleEndAt)
    if (startAt && endAt && new Date(endAt) < new Date(startAt)) {
      setBusy(false); setError('Thời gian kết thúc sale phải sau thời gian bắt đầu.'); return
    }
    const stock = Number(fields.stock), sortOrder = Number(fields.sortOrder)
    if (!Number.isSafeInteger(stock) || stock < 0 || !Number.isSafeInteger(sortOrder) || sortOrder < 0) {
      setBusy(false); setError('Kho và thứ tự hiển thị phải là số nguyên không âm.'); return
    }
    const payload = {
      name: fields.name.trim(), slug: fields.slug.trim(), categoryId: fields.categoryId,
      shortDescription: fields.shortDescription, description: fields.description,
      price, salePrice, saleStartAt: startAt, saleEndAt: endAt,
      isNewArrival: fields.isNewArrival, arrivalAt: bangkokDayStart(fields.arrivalAt),
      stock, isActive, sortOrder,
    }

    let id = savedId
    try {
      if (!id) {
        if (!draftReady || !draftIdRef.current || !draftTokenRef.current) throw new Error(draftError || 'Đang cấp mã sản phẩm. Hãy thử lại sau.')
        const response = await fetch('/api/admin/products', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: draftIdRef.current, draftToken: draftTokenRef.current, ...payload, isActive: false, thumbnail: '', images: [] }) })
        const body = await readApiResponse<{ message?: string; product?: Product }>(response)
        if (!response.ok || !body.product) throw new Error(body.message ?? 'Không lưu được sản phẩm.')
        id = body.product.id
        createdDuringFormRef.current = true
        setSavedId(id)
      }
      if (!id) throw new Error('Không tạo được mã sản phẩm.')

      const resolvedByKey = new Map<string, ProductImageItem>()
      const uploadErrors: string[] = []
      for (const item of images) {
        if (!item.file) {
          resolvedByKey.set(imageKey(item), item)
          continue
        }
        const key = imageKey(item)
        setImages(current => current.map(value => imageKey(value) === key ? { ...value, uploadStatus: 'uploading', uploadProgress: 0, uploadError: '' } : value))
        try {
          const uploaded = await uploadImage(item, id, uploadProgress => {
            setImages(current => current.map(value => imageKey(value) === key ? { ...value, uploadProgress } : value))
          })
          resolvedByKey.set(key, uploaded)
          setImages(current => current.map(value => imageKey(value) === key ? uploaded : value))
        } catch (cause) {
          const uploadError = cause instanceof Error ? cause.message : 'Tải ảnh thất bại.'
          resolvedByKey.set(key, { ...item, uploadStatus: 'error', uploadError })
          setImages(current => current.map(value => imageKey(value) === key ? { ...value, uploadStatus: 'error', uploadError } : value))
          uploadErrors.push(uploadError)
        }
      }
      const hasUploadFailures = uploadErrors.length > 0
      const presentationImages = images.map(image => resolvedByKey.get(imageKey(image)) ?? image)
      const persistedImages = presentationImages.filter(image => !image.file)
      const selected = persistedImages.find(image => imageKey(image) === thumbnailId) ?? persistedImages[0]
      const selectedKey = selected ? imageKey(selected) : ''
      const mainIndex = selectedKey ? presentationImages.findIndex(image => imageKey(image) === selectedKey) : -1
      if (mainIndex > 0) presentationImages.unshift(presentationImages.splice(mainIndex, 1)[0])
      const orderedPresentationImages = presentationImages.map((image, sortOrder) => ({ ...image, sortOrder }))
      const nextImages = orderedPresentationImages.filter(image => !image.file).map((image, sortOrder) => ({ ...image, sortOrder }))
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...payload, thumbnail: selected?.url ?? '', images: nextImages.map(persistedImage) }),
      })
      const body = await readApiResponse<{ message?: string }>(response)
      if (!response.ok) throw new Error(body.message ?? 'Không lưu được sản phẩm.')
      createdDuringFormRef.current = false

      const oldImages = savedImagesRef.current
      const currentPaths = new Set(nextImages.map(image => image.storagePath).filter(Boolean))
      const removedPaths = oldImages.map(image => image.storagePath).filter((path): path is string => Boolean(path && !currentPaths.has(path)))
      for (const storagePath of removedPaths) {
        const removeResponse = await fetch('/api/admin/product-images', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ storagePath }) })
        if (!removeResponse.ok && removeResponse.status !== 409) uploadErrors.push('Chưa xóa được một ảnh cũ khỏi Firebase Storage.')
      }
      const currentPublicIds = new Set(nextImages.map(image => image.publicId).filter((value): value is string => Boolean(value)))
      const removedPublicIds = Array.from(new Set([
        ...oldImages.map(image => image.publicId),
        ...Array.from(createdCloudinaryIdsRef.current),
      ].filter((value): value is string => Boolean(value && !currentPublicIds.has(value)))))
      for (const publicId of removedPublicIds) {
        const removeResponse = await fetch('/api/admin/uploads/images', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ publicId }) })
        if (!removeResponse.ok && removeResponse.status !== 409) uploadErrors.push('Ảnh đã được gỡ khỏi sản phẩm nhưng chưa xóa được khỏi Cloudinary; có thể dọn lại bằng script quản trị.')
        else createdCloudinaryIdsRef.current.delete(publicId)
      }
      currentPublicIds.forEach(publicId => createdCloudinaryIdsRef.current.delete(publicId))
      savedImagesRef.current = nextImages.map(persistedImage)
      setImages(orderedPresentationImages)
      setThumbnailId(selectedKey)
      setMessage(uploadErrors.length ? `Đã lưu thông tin sản phẩm. ${uploadErrors[0]}${hasUploadFailures ? ' Hãy bấm Lưu sản phẩm để thử tải lại ảnh lỗi.' : ''}` : 'Đã lưu sản phẩm.')
      if (!uploadErrors.length) router.push('/admin/products')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không lưu được sản phẩm.')
    } finally { setBusy(false) }
  }

  return <div className="mx-auto max-w-5xl">
    <Link href="/admin/products" onClick={event => { event.preventDefault(); void cancelForm() }} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-pink-600"><ArrowLeft size={17} /> Danh sách sản phẩm</Link>
    <header className="my-5 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-black uppercase tracking-[.18em] text-pink-500">Quản trị hệ thống</p><h2 className="mt-1 text-3xl font-black">{editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h2><p className="mt-1 text-sm text-slate-500">Cập nhật thông tin, hình ảnh, giá và tồn kho.</p></div>
      {savedId && !createdDuringFormRef.current && <Link href={`/products/${fields.slug}`} target="_blank" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">Xem trang sản phẩm</Link>}
    </header>
    {message && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p>}
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
    <form ref={formRef} onSubmit={event => void save(event)} className="space-y-5 pb-24">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h3 className="flex items-center gap-2 text-lg font-black"><Info size={19} className="text-pink-500" />Thông tin sản phẩm</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Tên sản phẩm *"><input required maxLength={160} value={fields.name} onChange={event => { const name = event.target.value; setField('name', name); if (!slugEdited) setField('slug', slugify(name)) }} className="input" /></Field>
          <Field label="Slug *"><input required maxLength={180} value={fields.slug} onChange={event => { setSlugEdited(true); setField('slug', slugify(event.target.value)) }} className="input" /><span className="mt-1 block text-xs text-slate-400">Đường dẫn: /products/{fields.slug || 'ten-san-pham'}</span></Field>
          <Field label="Danh mục *"><select required value={fields.categoryId} onChange={event => setField('categoryId', event.target.value)} className="input"><option value="">Chọn danh mục</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{categoryError && <span className="mt-1 block text-xs text-rose-600">{categoryError}</span>}{!categories.length && !categoryError && <Link href="/admin/product-categories" className="mt-1 inline-block text-xs font-semibold text-pink-600">Tạo danh mục trước</Link>}</Field>
          <Field label="Mô tả ngắn"><input maxLength={500} value={fields.shortDescription} onChange={event => setField('shortDescription', event.target.value)} className="input" /></Field>
          <div className="sm:col-span-2"><Field label="Mô tả chi tiết"><textarea maxLength={10000} rows={5} value={fields.description} onChange={event => setField('description', event.target.value)} className="input min-h-32 resize-y" /></Field></div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h3 className="flex items-center gap-2 text-lg font-black"><ImageIcon size={19} className="text-pink-500" />Hình ảnh</h3>
        <p className="mt-1 text-sm text-slate-500">Ảnh mới được crop vuông, nén WebP và tải lên Cloudinary sau khi xác nhận. Bấm Lưu sản phẩm để gắn ảnh vào dữ liệu. Tối đa 8 ảnh mỗi sản phẩm.</p>
        <div className="mt-4"><ProductImageEditor items={images} onChange={setImages} thumbnailId={thumbnailId} onThumbnailChange={setThumbnailId} onRetryUpload={() => formRef.current?.requestSubmit()} onUploadImage={uploadConfirmedImage} disabled={!draftReady} /></div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h3 className="flex items-center gap-2 text-lg font-black"><Tags size={19} className="text-pink-500" />Giá bán</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Giá gốc (VND) *"><input required type="number" min="1" step="1" value={fields.price} onChange={event => setField('price', event.target.value)} className="input" /></Field>
          <Field label="Giá sale (không bắt buộc)"><input type="number" min="1" step="1" value={fields.salePrice} onChange={event => setField('salePrice', event.target.value)} className="input" /></Field>
          <Field label="Bắt đầu sale"><input type="datetime-local" value={fields.saleStartAt} onChange={event => setField('saleStartAt', event.target.value)} className="input" /></Field>
          <Field label="Kết thúc sale"><input type="datetime-local" value={fields.saleEndAt} onChange={event => setField('saleEndAt', event.target.value)} className="input" /></Field>
        </div>
        {fields.salePrice && <p className={`mt-4 rounded-xl p-3 text-sm font-semibold ${salePreview === null ? 'bg-rose-50 text-rose-700' : 'bg-pink-50 text-pink-700'}`}>
          {salePreview === null ? 'Giá sale phải thấp hơn giá gốc.' : <>Giá gốc: {formatPrice(price)} · Giá sale: {formatPrice(salePrice!)} · Giảm {salePreview}%</>}
        </p>}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h3 className="flex items-center gap-2 text-lg font-black"><PackageCheck size={19} className="text-pink-500" />Quản lý hiển thị</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Ngày hàng về"><input type="date" value={fields.arrivalAt} onChange={event => setField('arrivalAt', event.target.value)} disabled={!fields.isNewArrival} className="input disabled:bg-slate-50" /></Field>
          <Field label="Tồn kho *"><input required type="number" min="0" step="1" value={fields.stock} onChange={event => setField('stock', event.target.value)} className="input" /></Field>
          <Field label="Thứ tự hiển thị *"><input required type="number" min="0" step="1" value={fields.sortOrder} onChange={event => setField('sortOrder', event.target.value)} className="input" /></Field>
          <div className="flex flex-wrap gap-4 pt-7">
            <Check label="Sản phẩm mới về" checked={fields.isNewArrival} onChange={value => setField('isNewArrival', value)} />
          </div>
        </div>
      </section>
      <div className="space-y-3 pb-8">
        {categoriesLoading && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">Đang tải danh mục. Nút lưu sẽ dùng được sau khi danh mục tải xong.</p>}
        {!product && !draftReady && !draftError && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">Đang cấp mã sản phẩm trước khi tải ảnh…</p>}
        {!product && draftError && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">Không cấp được mã sản phẩm: {draftError} <button type="button" onClick={() => window.location.reload()} className="ml-2 font-bold underline">Tải lại biểu mẫu</button></div>}
        {!categoriesLoading && categoryError && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800"><span>Không tải được danh mục: {categoryError}</span><div className="flex items-center gap-3"><Link href="/admin/product-categories" className="font-bold text-pink-700 underline">Quản lý danh mục</Link><button type="button" onClick={() => setCategoryReload(value => value + 1)} className="font-bold underline">Thử lại</button></div></div>}
        {!categoriesLoading && !categoryError && categories.length === 0 && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Chưa có danh mục nào đang hoạt động nên chưa thể lưu sản phẩm. <Link href="/admin/product-categories" className="underline">Tạo danh mục</Link> trước.</p>}
        {formIssues.length > 0 && <div id="product-save-guidance" aria-live="polite" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><p className="font-bold">Cần bổ sung hoặc kiểm tra trước khi lưu:</p><ul className="mt-1 list-inside list-disc">{formIssues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto max-w-[1500px]">
          <div className="pointer-events-auto border-t border-slate-200 bg-[#f7f8fb]/95 px-4 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.06)] backdrop-blur sm:px-6 lg:ml-64 lg:px-8">
            <div className="mx-auto flex max-w-5xl justify-end gap-3">
              <button type="button" disabled={busy} onClick={() => void cancelForm()} className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 disabled:opacity-50">Hủy</button>
              <button type="submit" disabled={busy || categoriesLoading || categories.length === 0 || !draftReady} aria-describedby={formIssues.length ? 'product-save-guidance' : undefined} className="rounded-xl bg-pink-500 px-6 py-3 font-bold text-white shadow-sm hover:bg-pink-600 disabled:opacity-50">{busy ? 'Đang lưu…' : categoriesLoading ? 'Đang tải danh mục…' : !draftReady ? 'Đang chuẩn bị mã sản phẩm…' : categories.length === 0 ? 'Cần có danh mục để lưu' : 'Lưu sản phẩm'}</button>
            </div>
          </div>
        </div>
      </div>
    </form>
  </div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>{children}</label>
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4 accent-pink-500" />{label}</label>
}

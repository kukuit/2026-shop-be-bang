'use client'

import Cropper, { type Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ImagePlus, RotateCcw, RotateCw, Star, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import type { ProductImage } from '@/lib/products/types'
import { MAX_PRODUCT_IMAGE_COUNT } from '@/lib/products/image-validation'
import { createCroppedProductWebp, formatImageSize, PRODUCT_IMAGE_OUTPUT_SIZE, validateProductCropSource } from './product-image-crop'

const itemKey = (item: ProductImageItem) => item.localId ?? item.id

export type ProductImageItem = ProductImage & {
  file?: File
  previewUrl?: string
  localId?: string
  uploadStatus?: 'queued' | 'uploading' | 'uploaded' | 'error'
  uploadProgress?: number
  uploadError?: string
}

type ImageUpload = (item: ProductImageItem, onProgress: (progress: number) => void) => Promise<ProductImageItem>
type CropStep = 'crop' | 'preview'

export default function ProductImageEditor({
  items,
  onChange,
  thumbnailId,
  onThumbnailChange,
  onRetryUpload,
  onUploadImage,
  disabled = false,
}: {
  items: ProductImageItem[]
  onChange: (items: ProductImageItem[]) => void
  thumbnailId: string
  onThumbnailChange: (id: string) => void
  onRetryUpload: () => void
  onUploadImage: ImageUpload
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const itemsRef = useRef(items)
  const confirmingRef = useRef(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [queue, setQueue] = useState<File[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [sourceUrl, setSourceUrl] = useState('')
  const [step, setStep] = useState<CropStep>('crop')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processedFile, setProcessedFile] = useState<File | null>(null)
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState('')
  const [processedSize, setProcessedSize] = useState<{ width: number; height: number } | null>(null)
  const [processing, setProcessing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [modalError, setModalError] = useState('')

  itemsRef.current = items
  const currentOriginal = queue[activeIndex]

  useEffect(() => {
    if (!currentOriginal) {
      setSourceUrl('')
      return
    }
    const objectUrl = URL.createObjectURL(currentOriginal)
    setSourceUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [currentOriginal])

  useEffect(() => {
    if (!processedPreviewUrl) return
    return () => URL.revokeObjectURL(processedPreviewUrl)
  }, [processedPreviewUrl])

  useEffect(() => {
    if (!queue.length || uploading || processing) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelQueue()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // The handlers intentionally use the latest state through refs/state setters.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length, uploading, processing])

  const updateItem = (key: string, update: (item: ProductImageItem) => ProductImageItem) => {
    const next = itemsRef.current.map(item => itemKey(item) === key ? update(item) : item)
    itemsRef.current = next
    onChange(next)
  }

  const setMainImage = (key: string) => {
    const index = itemsRef.current.findIndex(item => itemKey(item) === key)
    if (index < 0) return
    const ordered = [...itemsRef.current]
    const [main] = ordered.splice(index, 1)
    ordered.unshift(main)
    const normalized = ordered.map((item, sortOrder) => ({ ...item, sortOrder }))
    itemsRef.current = normalized
    onChange(normalized)
    onThumbnailChange(key)
  }

  const clearProcessedPreview = () => {
    setProcessedPreviewUrl('')
    setProcessedFile(null)
    setProcessedSize(null)
  }

  const resetCrop = () => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setCroppedAreaPixels(null)
    clearProcessedPreview()
    setModalError('')
  }

  function cancelQueue() {
    if (confirmingRef.current || processing || uploading) return
    setQueue([])
    setActiveIndex(0)
    setStep('crop')
    setProcessing(false)
    setUploading(false)
    setUploadProgress(0)
    setModalError('')
    resetCrop()
  }

  const addFiles = async (files: FileList | File[] | null) => {
    if (disabled || !files?.length || queue.length || preparing) return
    setError('')
    setPreparing(true)
    const incoming = Array.from(files)
    const available = Math.max(0, MAX_PRODUCT_IMAGE_COUNT - items.length)
    const accepted = incoming.slice(0, available)
    let firstError = incoming.length > available ? `Mỗi sản phẩm tối đa ${MAX_PRODUCT_IMAGE_COUNT} ảnh.` : ''
    const valid: File[] = []
    for (const file of accepted) {
      try {
        await validateProductCropSource(file)
        valid.push(file)
      } catch (cause) {
        if (!firstError) firstError = cause instanceof Error ? cause.message : 'Ảnh không hợp lệ.'
      }
    }
    if (valid.length) {
      setQueue(valid)
      setActiveIndex(0)
      resetCrop()
    }
    setError(firstError)
    setPreparing(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const createPreview = async () => {
    if (!sourceUrl || !croppedAreaPixels || processing || uploading) return
    setProcessing(true)
    setModalError('')
    try {
      const result = await createCroppedProductWebp(sourceUrl, croppedAreaPixels, rotation, { outputSize: PRODUCT_IMAGE_OUTPUT_SIZE, quality: 0.82 })
      const previewUrl = URL.createObjectURL(result.file)
      setProcessedFile(result.file)
      setProcessedSize({ width: result.width, height: result.height })
      setProcessedPreviewUrl(previewUrl)
      setStep('preview')
    } catch (cause) {
      setModalError(cause instanceof Error ? cause.message : 'Không xử lý được ảnh. Hãy thử lại.')
    } finally {
      setProcessing(false)
    }
  }

  const advanceQueue = () => {
    clearProcessedPreview()
    setModalError('')
    setUploadProgress(0)
    setStep('crop')
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setCroppedAreaPixels(null)
    if (activeIndex + 1 >= queue.length) {
      setQueue([])
      setActiveIndex(0)
    } else {
      setActiveIndex(index => index + 1)
    }
  }

  const confirmAndUpload = async () => {
    if (!processedFile || confirmingRef.current || uploading) return
    confirmingRef.current = true
    setUploading(true)
    setUploadProgress(0)
    setModalError('')

    const localId = crypto.randomUUID()
    const previewUrl = URL.createObjectURL(processedFile)
    const newItem: ProductImageItem = {
      id: localId,
      localId,
      file: processedFile,
      url: previewUrl,
      previewUrl,
      alt: '',
      sortOrder: itemsRef.current.length,
      uploadStatus: 'uploading',
      uploadProgress: 0,
    }
    const next = [...itemsRef.current, newItem]
    itemsRef.current = next
    onChange(next)
    if (!thumbnailId && next[0]) onThumbnailChange(itemKey(next[0]))

    try {
      const uploaded = await onUploadImage(newItem, progress => {
        setUploadProgress(progress)
        updateItem(localId, item => ({ ...item, uploadStatus: 'uploading', uploadProgress: progress, uploadError: '' }))
      })
      updateItem(localId, item => ({
        ...uploaded,
        sortOrder: item.sortOrder,
        localId,
        uploadStatus: 'uploaded',
        uploadProgress: 100,
        uploadError: '',
      }))
    } catch (cause) {
      const uploadError = cause instanceof Error ? cause.message : 'Tải ảnh thất bại.'
      updateItem(localId, item => ({ ...item, uploadStatus: 'error', uploadError }))
    } finally {
      confirmingRef.current = false
      setUploading(false)
      advanceQueue()
    }
  }

  const reorder = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= items.length) return
    const next = [...items]
    ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
    const ordered = next.map((item, sortOrder) => ({ ...item, sortOrder }))
    itemsRef.current = ordered
    onChange(ordered)
    if (ordered[0]) onThumbnailChange(itemKey(ordered[0]))
  }

  const addUrl = () => {
    if (disabled) return
    const value = url.trim()
    if (items.length >= MAX_PRODUCT_IMAGE_COUNT) {
      setError(`Mỗi sản phẩm tối đa ${MAX_PRODUCT_IMAGE_COUNT} ảnh.`)
      return
    }
    if (!value || (!value.startsWith('/') && !/^https?:\/\//i.test(value))) {
      setError('Nhập đường dẫn ảnh nội bộ hoặc URL http(s) hợp lệ.')
      return
    }
    let hostname = ''
    try { hostname = new URL(value).hostname.toLowerCase() } catch { /* local paths are allowed */ }
    if (hostname === 'cloudinary.com' || hostname.endsWith('.cloudinary.com')) {
      setError('Ảnh Cloudinary cần được tải bằng nút chọn ảnh để xác thực quyền sở hữu.')
      return
    }
    const id = crypto.randomUUID()
    const item: ProductImageItem = { id, localId: id, url: value, alt: '', sortOrder: items.length }
    const next = [...itemsRef.current, item]
    itemsRef.current = next
    onChange(next)
    if (!thumbnailId) onThumbnailChange(itemKey(item))
    setUrl('')
    setError('')
  }

  const remove = (item: ProductImageItem) => {
    if (item.uploadStatus === 'uploading') return
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    const next = itemsRef.current.filter(candidate => itemKey(candidate) !== itemKey(item)).map((image, sortOrder) => ({ ...image, sortOrder }))
    itemsRef.current = next
    onChange(next)
    if (thumbnailId === itemKey(item)) onThumbnailChange(next[0] ? itemKey(next[0]) : '')
  }

  const dropOnItem = (event: DragEvent<HTMLElement>, targetIndex: number) => {
    event.preventDefault()
    const sourceIndex = items.findIndex(item => itemKey(item) === draggingKey)
    if (sourceIndex < 0 || sourceIndex === targetIndex) return
    const next = [...items]
    const [moved] = next.splice(sourceIndex, 1)
    next.splice(targetIndex, 0, moved)
    const ordered = next.map((item, sortOrder) => ({ ...item, sortOrder }))
    itemsRef.current = ordered
    onChange(ordered)
    if (ordered[0]) onThumbnailChange(itemKey(ordered[0]))
    setDraggingKey(null)
  }

  const reductionPercent = processedFile && currentOriginal
    ? Math.round((1 - processedFile.size / currentOriginal.size) * 100)
    : 0

  return <div>
    <div
      onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }}
      onDrop={event => { event.preventDefault(); if (!disabled) void addFiles(Array.from(event.dataTransfer.files)) }}
      className="rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/50 px-4 py-5 text-center"
    >
      <Upload className="mx-auto mb-2 text-pink-500" size={22} />
      <p className="text-sm font-bold text-slate-700">Kéo ảnh vào đây hoặc chọn từ thiết bị</p>
      <p className="mt-1 text-xs text-slate-500">JPEG, PNG, WebP · tối đa 5 MB/ảnh · crop vuông và chuyển WebP · {items.length}/{MAX_PRODUCT_IMAGE_COUNT} ảnh</p>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || preparing || queue.length > 0 || items.length >= MAX_PRODUCT_IMAGE_COUNT} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-pink-200 bg-white px-4 py-2 text-sm font-bold text-pink-700 disabled:opacity-50">
        <ImagePlus size={17} />{preparing ? 'Đang kiểm tra ảnh…' : 'Chọn ảnh'}
      </button>
      <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={disabled} onChange={event => void addFiles(event.target.files)} />
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      <input value={url} onChange={event => setUrl(event.target.value)} disabled={disabled} className="input min-w-0 flex-1 disabled:opacity-50" placeholder="Hoặc thêm đường dẫn ảnh cũ (nội bộ/Firebase)" />
      <button type="button" onClick={addUrl} disabled={disabled || items.length >= MAX_PRODUCT_IMAGE_COUNT} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">Thêm ảnh cũ</button>
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item, index) => {
        const key = itemKey(item)
        const uploadingItem = item.uploadStatus === 'uploading'
        return <article
          key={key}
          draggable={!uploadingItem}
          onDragStart={event => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', key); setDraggingKey(key) }}
          onDragEnd={() => setDraggingKey(null)}
          onDragOver={event => event.preventDefault()}
          onDrop={event => dropOnItem(event, index)}
          className={`overflow-hidden rounded-xl border bg-white ${thumbnailId === key ? 'border-pink-400 ring-2 ring-pink-100' : 'border-slate-200'} ${draggingKey === key ? 'opacity-50' : ''}`}
        >
          <div className="relative aspect-[4/3] bg-[#fff8f5]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.previewUrl ?? item.url} alt={item.alt ?? ''} className="h-full w-full object-cover" />
            {thumbnailId === key && <span className="absolute left-2 top-2 rounded-full bg-pink-600 px-2 py-1 text-xs font-bold text-white">Ảnh chính</span>}
          </div>
          <div className="space-y-2 p-2">
            <input value={item.alt ?? ''} onChange={event => {
              const next = itemsRef.current.map(value => itemKey(value) === key ? { ...value, alt: event.target.value } : value)
              itemsRef.current = next
              onChange(next)
            }} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" placeholder="Alt text" />
            {uploadingItem && <div aria-live="polite"><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-pink-500 transition-[width]" style={{ width: `${item.uploadProgress ?? 0}%` }} /></div><p className="mt-1 text-xs text-slate-500">Đang gửi ảnh · {item.uploadProgress ?? 0}%</p></div>}
            {item.uploadError && <div className="text-xs text-rose-600"><p>{item.uploadError}</p><button type="button" onClick={onRetryUpload} className="mt-1 font-bold underline">Thử tải lại</button></div>}
            {!uploadingItem && !item.uploadError && <p className="text-xs text-slate-500">{item.file ? 'Đang chờ tải lại ảnh' : item.publicId ? 'Đã tải lên Cloudinary' : 'Ảnh hiện có'}</p>}
            <div className="flex items-center justify-between gap-1">
              <button type="button" onClick={() => setMainImage(key)} aria-label="Đưa ảnh lên đầu và đặt làm ảnh chính" title="Đưa ảnh lên đầu và đặt làm ảnh chính" className="rounded-lg p-1.5 text-amber-500 hover:bg-amber-50"><Star size={16} fill={thumbnailId === key ? 'currentColor' : 'none'} /></button>
              <div className="flex gap-1">
                <button type="button" onClick={() => reorder(index, -1)} disabled={index === 0 || uploadingItem} aria-label="Di chuyển ảnh lên" className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-30"><ArrowUp size={15} /></button>
                <button type="button" onClick={() => reorder(index, 1)} disabled={index === items.length - 1 || uploadingItem} aria-label="Di chuyển ảnh xuống" className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-30"><ArrowDown size={15} /></button>
                <button type="button" onClick={() => remove(item)} disabled={uploadingItem} aria-label="Xóa ảnh khỏi sản phẩm" className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-30"><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        </article>
      })}
    </div>
    {!items.length && <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Chưa có ảnh. Ảnh sản phẩm không bắt buộc.</p>}

    {queue.length > 0 && currentOriginal && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) cancelQueue() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="product-crop-title" className="flex max-h-[calc(100dvh-1rem)] w-full max-w-[900px] flex-col overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl" onMouseDown={event => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <h3 id="product-crop-title" className="text-lg font-black text-slate-900 sm:text-xl">{step === 'crop' ? 'Cắt ảnh sản phẩm' : 'Xem trước ảnh WebP'}</h3>
            <p className="mt-1 text-sm text-slate-500">Ảnh {activeIndex + 1}/{queue.length} · khung vuông 1:1</p>
          </div>
          <button type="button" onClick={cancelQueue} disabled={uploading || processing} aria-label="Đóng hộp thoại" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><X size={20} /></button>
        </header>

        <div className="min-h-0 flex-1 px-4 py-4 sm:px-6">
          {step === 'crop' ? <>
            <div className="relative mx-auto aspect-square w-full max-w-[480px] overflow-hidden rounded-xl bg-slate-950">
              {sourceUrl && <Cropper
                image={sourceUrl}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                minZoom={1}
                maxZoom={4}
                cropShape="rect"
                objectFit="contain"
                showGrid
                zoomSpeed={0.15}
                zoomWithScroll
                roundCropAreaPixels
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                style={{}}
                classes={{}}
                restrictPosition
                mediaProps={{ draggable: false, alt: 'Ảnh gốc cần cắt' }}
                cropperProps={{ 'aria-label': 'Khung crop ảnh vuông' }}
                keyboardStep={0.1}
              />}
            </div>
            <div className="mx-auto mt-4 flex w-full max-w-[480px] flex-wrap items-center gap-3">
              <label htmlFor="product-image-zoom" className="shrink-0 text-sm font-semibold text-slate-600">Thu phóng</label>
              <input id="product-image-zoom" aria-label="Thu phóng ảnh" type="range" min="1" max="4" step="0.01" value={zoom} onChange={event => setZoom(Number(event.target.value))} className="min-w-0 flex-1 accent-pink-500" />
              <span className="w-12 text-right text-xs tabular-nums text-slate-500">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="mx-auto mt-3 flex w-full max-w-[480px] items-center justify-center gap-2">
              <button type="button" onClick={() => setRotation(value => (value + 270) % 360)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RotateCcw size={16} /> Xoay trái</button>
              <button type="button" onClick={() => setRotation(value => (value + 90) % 360)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RotateCw size={16} /> Xoay phải</button>
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">Kéo ảnh để căn chỉnh · cuộn hoặc dùng hai ngón tay để thu phóng</p>
          </> : <>
            <div className="mx-auto aspect-square w-full max-w-[480px] overflow-hidden rounded-xl bg-slate-50">
              {processedPreviewUrl && <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={processedPreviewUrl} alt="Ảnh sản phẩm đã crop và nén WebP" className="h-full w-full object-contain" />
              </>}
            </div>
            <div className="mx-auto mt-4 grid w-full max-w-[480px] grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-3">
              <p className="min-w-0 break-all"><span className="block text-xs text-slate-500">Ảnh gốc</span><strong>{currentOriginal.name} · {formatImageSize(currentOriginal.size)}</strong></p>
              <p><span className="block text-xs text-slate-500">Ảnh WebP</span><strong>{processedSize?.width} × {processedSize?.height} px · {processedFile ? formatImageSize(processedFile.size) : '—'}</strong></p>
              <p><span className="block text-xs text-slate-500">Dung lượng</span><strong className={reductionPercent >= 0 ? 'text-emerald-700' : 'text-amber-700'}>{reductionPercent >= 0 ? `Tiết kiệm ${reductionPercent}%` : `Tăng ${Math.abs(reductionPercent)}%`}</strong></p>
            </div>
          </>}
          {modalError && <p role="alert" className="mx-auto mt-3 max-w-[480px] rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{modalError}</p>}
          {uploading && <div className="mx-auto mt-3 max-w-[480px]" aria-live="polite"><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-pink-500 transition-[width]" style={{ width: `${uploadProgress}%` }} /></div><p className="mt-1 text-center text-xs font-semibold text-slate-600">Đang tải ảnh {activeIndex + 1}/{queue.length} lên Cloudinary · {uploadProgress}%</p></div>}
        </div>

        <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
          {step === 'crop' ? <>
            <button type="button" onClick={cancelQueue} disabled={processing || uploading} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50">Hủy</button>
            <div className="flex gap-2">
              <button type="button" onClick={resetCrop} disabled={processing || uploading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50"><RotateCcw size={16} />Reset</button>
              <button type="button" onClick={() => void createPreview()} disabled={!croppedAreaPixels || processing || uploading} className="inline-flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-pink-600 disabled:opacity-50">{processing ? 'Đang xử lý…' : 'Tiếp tục'}<ArrowRight size={16} /></button>
            </div>
          </> : <>
            <div className="flex gap-2">
              <button type="button" onClick={cancelQueue} disabled={uploading} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50">Hủy</button>
              <button type="button" onClick={() => { setStep('crop'); clearProcessedPreview(); setModalError('') }} disabled={uploading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50"><ArrowLeft size={16} />Quay lại chỉnh sửa</button>
            </div>
            <button type="button" onClick={() => void confirmAndUpload()} disabled={!processedFile || uploading} className="inline-flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-pink-600 disabled:opacity-50"><Upload size={16} />{uploading ? 'Đang tải ảnh…' : 'Xác nhận & Upload'}</button>
          </>}
        </footer>
      </section>
    </div>}
  </div>
}

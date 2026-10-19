'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, Image as ImageIcon, Info, Layers3, Link2, Package, Plus, Search, Tag, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { Product, ProductAttributes, ProductComboComponent, ProductDiscount, ProductImage, ProductSizeGuide, ProductType, ProductVariant, ProductVariantConfig } from '@/lib/products/types'
import type { ProductCategory } from '@/lib/product-categories/types'
import { getProductDiscountPercent } from '@/lib/products/pricing'
import { MAX_PRODUCT_IMAGE_COUNT } from '@/lib/products/image-validation'
import { calculateTotalStock, MAX_PRODUCT_VARIANTS, MAX_VARIANT_STOCK, syncVariantSizesWithSizeGuide } from '@/lib/products/variants'
import { slugify } from '@/lib/products/slug'
import ProductImageEditor, { type ProductImageItem } from './ProductImageEditor'
import { ProductAttributesSection, ProductSizeGuideSection, ProductVariantsSection } from './ProductConfigurationEditor'
import ShortLinkManager from '@/components/admin/short-links/ShortLinkManager'
import ProductImageView from '@/components/products/ProductImageView'
import ComboImageCollage, { type ComboDisplayImage } from '@/components/products/ComboImageCollage'
import { getProductEffectivePrice } from '@/lib/products/pricing'

type Fields = {
  name: string; slug: string; categoryId: string; shortDescription: string; description: string
  seoTitle: string; seoDescription: string
  price: string; salePrice: string; saleStartAt: string; saleEndAt: string
  isNewArrival: boolean; showOnHomeBanner: boolean; arrivalAt: string; stock: string; sortOrder: string
}
const blank: Fields = { name: '', slug: '', categoryId: '', shortDescription: '', description: '', seoTitle: '', seoDescription: '', price: '', salePrice: '', saleStartAt: '', saleEndAt: '', isNewArrival: false, showOnHomeBanner: false, arrivalAt: '', stock: '0', sortOrder: '0' }
const productFormTabs = [
  { id: 'info', label: 'Thông tin', icon: Info },
  { id: 'variants', label: 'Phân loại', icon: Layers3 },
  { id: 'images', label: 'Hình ảnh', icon: ImageIcon },
  { id: 'price', label: 'Giá', icon: Tag },
  { id: 'stock', label: 'Kho', icon: Package },
  { id: 'short-link', label: 'Short link', icon: Link2 },
] as const
type ProductFormTabId = (typeof productFormTabs)[number]['id']
function getFormIssueTab(issue: string): ProductFormTabId {
  if (issue.startsWith('Ảnh')) return 'images'
  if (issue.startsWith('Tên sản phẩm') || issue === 'Slug' || issue === 'Danh mục') return 'info'
  if (issue.startsWith('Bảng size') || issue.startsWith('Danh sách màu') || issue.startsWith('Danh sách size') || issue.startsWith('Phân loại') || issue.startsWith('SKU biến thể') || issue.startsWith('Giá riêng') || issue.startsWith('Cần xác nhận tổng tồn kho biến thể') || issue.startsWith('Tồn kho ') && issue.includes('từ 0 đến')) return 'variants'
  if (issue.startsWith('Giá') || issue.startsWith('Thời gian') || issue.startsWith('Combo') || issue.startsWith('Đang tải') || issue.startsWith('Sản phẩm thành phần') || issue.startsWith('Mức giảm')) return 'price'
  return 'stock'
}
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

function buildInitialVariantEditorState(product?: Product) {
  const config = product?.variantConfig ?? { colors: [], sizes: [] }
  const variants = product?.variants ?? []
  const sizeGuide = [...(product?.sizeGuide ?? [])]
  const normalizeSize = (value: string) => value.trim().normalize('NFC').toLocaleLowerCase('vi-VN')
  const guideNames = new Set(sizeGuide.map(row => normalizeSize(row.size)))

  if (!sizeGuide.length) {
    sizeGuide.push(...config.sizes.map(size => ({ id: size.id, size: size.name })))
  } else {
    for (const size of config.sizes) {
      const key = normalizeSize(size.name)
      if (!sizeGuide.some(row => row.id === size.id) && !guideNames.has(key)) {
        sizeGuide.push({ id: size.id, size: size.name })
        guideNames.add(key)
      }
    }
  }

  const synchronized = syncVariantSizesWithSizeGuide(sizeGuide, config, variants, product?.slug ?? '')
  return {
    sizeGuide,
    variantConfig: synchronized.config,
    variants: synchronized.variants ?? variants,
  }
}

export default function ProductForm({ product, initialType = 'SIMPLE' }: { product?: Product; initialType?: ProductType }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<(typeof productFormTabs)[number]['id']>('info')
  const [initialVariantState] = useState(() => buildInitialVariantEditorState(product))
  const [savedId, setSavedId] = useState<string | null>(product?.id ?? null)
  const [productType, setProductType] = useState<ProductType>(product?.type ?? initialType)
  const [comboComponents, setComboComponents] = useState<ProductComboComponent[]>(product?.components ?? [])
  const [discountType, setDiscountType] = useState<ProductDiscount['type']>(product?.discount?.type ?? 'PERCENT')
  const [discountValue, setDiscountValue] = useState(String(product?.discount?.value ?? 10))
  const [comboProducts, setComboProducts] = useState<Record<string, Product>>({})
  const [comboPickerOpen, setComboPickerOpen] = useState(false)
  const [componentSearch, setComponentSearch] = useState('')
  const [componentCandidates, setComponentCandidates] = useState<Product[]>([])
  const [componentLoading, setComponentLoading] = useState(false)
  const [pendingComponent, setPendingComponent] = useState<Product | null>(null)
  const [pendingVariantId, setPendingVariantId] = useState('')
  const [isActive, setIsActive] = useState(product?.isActive ?? initialType !== 'COMBO')
  const [fields, setFields] = useState<Fields>(product ? {
    name: product.name, slug: product.slug, categoryId: product.categoryId,
    shortDescription: product.shortDescription, description: product.description,
    seoTitle: product.seoTitle ?? '', seoDescription: product.seoDescription ?? '',
    price: String(product.price), salePrice: product.salePrice === null ? '' : String(product.salePrice),
    saleStartAt: localDateTime(product.saleStartAt), saleEndAt: localDateTime(product.saleEndAt),
    isNewArrival: product.isNewArrival, showOnHomeBanner: product.showOnHomeBanner, arrivalAt: dateOnly(product.arrivalAt), stock: String(product.stock),
    sortOrder: String(product.sortOrder),
  } : blank)
  const [attributes, setAttributes] = useState<ProductAttributes>(product?.attributes ?? {})
  const [sizeGuide, setSizeGuide] = useState<ProductSizeGuide[]>(initialVariantState.sizeGuide)
  const [hasVariants, setHasVariants] = useState(product?.hasVariants === true)
  const [variantConfig, setVariantConfig] = useState<ProductVariantConfig>(initialVariantState.variantConfig)
  const [variants, setVariants] = useState<ProductVariant[]>(initialVariantState.variants)
  const [pendingSizeGuideRemoval, setPendingSizeGuideRemoval] = useState<{ id: string; name: string; affectedStock: number } | null>(null)
  const [sizeGuideSyncError, setSizeGuideSyncError] = useState('')
  const [legacyStockAtEnable, setLegacyStockAtEnable] = useState(product?.stock ?? Number(blank.stock))
  const [confirmedVariantStockTotal, setConfirmedVariantStockTotal] = useState<number | null>(null)
  const [pendingDisableVariants, setPendingDisableVariants] = useState(false)
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
  const formSnapshot = JSON.stringify({
    fields, productType, comboComponents, discountType, discountValue, isActive, attributes, sizeGuide,
    hasVariants, variantConfig, variants, thumbnailId,
    images: images.map(image => ({ id: imageKey(image), url: image.url, alt: image.alt, sortOrder: image.sortOrder, storagePath: image.storagePath, publicId: image.publicId, file: image.file ? [image.file.name, image.file.size, image.file.lastModified] : null })),
  })
  const initialFormSnapshotRef = useRef<string | null>(null)
  if (initialFormSnapshotRef.current === null) initialFormSnapshotRef.current = formSnapshot
  const isDirty = formSnapshot !== initialFormSnapshotRef.current
  const variantStock = calculateTotalStock(variants)
  const stockConfirmationRequired = hasVariants && !product?.hasVariants && variantStock !== legacyStockAtEnable
  const canPreviewProduct = Boolean(savedId && fields.slug.trim() && isActive && !createdDuringFormRef.current)

  const focusTabField = (tabId: ProductFormTabId) => {
    setActiveTab(tabId)
    window.requestAnimationFrame(() => {
      const panel = document.getElementById(`product-panel-${tabId}`)
      panel?.querySelector<HTMLElement>('[aria-invalid="true"], :invalid, input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)')?.focus()
    })
  }

  useEffect(() => {
    if (!isDirty) return
    const formUrl = new URL(window.location.href)
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    const handleNavigationClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target
      const link = target instanceof Element ? target.closest<HTMLAnchorElement>('a[href]') : null
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return
      const destination = new URL(link.href, window.location.href)
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname && destination.search === window.location.search) return
      if (!window.confirm('Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?')) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }
    const handlePopState = (event: PopStateEvent) => {
      const destination = new URL(window.location.href)
      if (destination.pathname === formUrl.pathname && destination.search === formUrl.search) return
      if (!window.confirm('Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?')) {
        event.stopImmediatePropagation()
        window.history.forward()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('click', handleNavigationClick, true)
    window.addEventListener('popstate', handlePopState, true)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleNavigationClick, true)
      window.removeEventListener('popstate', handlePopState, true)
    }
  }, [isDirty])

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
    const missingIds = Array.from(new Set(comboComponents.map(component => component.productId).filter(id => !comboProducts[id])))
    if (!missingIds.length) return
    let active = true
    Promise.all(missingIds.map(async id => {
      const response = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok || !body.product) throw new Error(body.message ?? 'Không tải được sản phẩm thành phần.')
      return body.product as Product
    })).then(products => {
      if (active) setComboProducts(current => ({ ...current, ...Object.fromEntries(products.map(item => [item.id, item])) }))
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Không tải được sản phẩm thành phần.') })
    return () => { active = false }
  }, [comboComponents, comboProducts])

  useEffect(() => {
    if (!comboPickerOpen) return
    let active = true
    const timeout = window.setTimeout(async () => {
      setComponentLoading(true)
      try {
        const params = new URLSearchParams({ limit: '30', status: 'active' })
        if (componentSearch.trim()) params.set('search', componentSearch.trim())
        const response = await fetch(`/api/admin/products?${params}`, { cache: 'no-store' })
        const body = await response.json()
        if (!response.ok) throw new Error(body.message ?? 'Không thể tìm sản phẩm.')
        if (active) setComponentCandidates((body.products ?? []).filter((candidate: Product) => candidate.type !== 'COMBO' && candidate.id !== product?.id))
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Không thể tìm sản phẩm.')
      } finally {
        if (active) setComponentLoading(false)
      }
    }, 250)
    return () => { active = false; window.clearTimeout(timeout) }
  }, [comboPickerOpen, componentSearch, product?.id])

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

  const comboDiscountValue = Number(discountValue)
  const comboSubtotal = useMemo(() => comboComponents.reduce((sum, component) => {
    const source = comboProducts[component.productId]
    if (!source) return sum
    const variant = source.hasVariants && component.variantId ? source.variants?.find(item => item.id === component.variantId) : null
    if (source.hasVariants && component.variantId && !variant) return sum
    const unitPrice = variant?.price ?? getProductEffectivePrice(source, new Date())
    return sum + unitPrice * component.quantity
  }, 0), [comboComponents, comboProducts])
  const comboDiscountAmount = Number.isSafeInteger(comboDiscountValue) && comboDiscountValue > 0
    ? discountType === 'PERCENT' ? Math.round(comboSubtotal * comboDiscountValue / 100) : comboDiscountValue
    : 0
  const comboFinalPrice = comboSubtotal - comboDiscountAmount
  const comboAvailable = comboComponents.length ? comboComponents.reduce((available, component) => {
    const source = comboProducts[component.productId]
    if (!source) return 0
    const variant = source.hasVariants && component.variantId ? source.variants?.find(item => item.id === component.variantId) : null
    const stock = source.hasVariants
      ? component.variantId ? variant?.stock ?? 0 : Math.max(0, ...(source.variants ?? []).map(item => item.stock))
      : source.stock
    return Math.min(available, Math.floor(stock / component.quantity))
  }, Number.MAX_SAFE_INTEGER) : 0
  const comboPreviewImages = useMemo<ComboDisplayImage[]>(() => {
    const ownImage = images.find(image => imageKey(image) === thumbnailId) ?? images[0]
    if (ownImage) return [{ id: imageKey(ownImage), url: ownImage.previewUrl ?? ownImage.url, name: fields.name || 'Ảnh combo' }]
    return comboComponents.flatMap((component, index) => {
      const source = comboProducts[component.productId]
      if (!source) return []
      const variant = source.hasVariants ? source.variants?.find(item => item.id === component.variantId) : null
      const colorOption = variant?.colorId ? source.variantConfig?.colors.find(option => option.id === variant.colorId) : undefined
      const url = variant?.imageUrl || colorOption?.imageUrl || source.thumbnail || source.images[0]?.url || ''
      return url ? [{ id: `${component.productId}-${component.variantId ?? 'base'}-${index}`, url, name: source.name }] : []
    })
  }, [images, thumbnailId, fields.name, comboComponents, comboProducts])
  const price = productType === 'COMBO' ? comboSubtotal : Number(fields.price)
  const salePrice = productType === 'COMBO' ? comboFinalPrice : fields.salePrice ? Number(fields.salePrice) : null
  const salePreview = useMemo(() => {
    if (!Number.isSafeInteger(price) || !Number.isSafeInteger(salePrice) || price <= 0 || salePrice! <= 0 || salePrice! >= price) return null
    const now = new Date()
    return getProductDiscountPercent({ price, salePrice, saleStartAt: null, saleEndAt: null } as Product, now)
  }, [price, salePrice])

  const duplicateGuideSize = new Set<string>()
  const duplicateSku = new Set<string>()
  const duplicateColor = new Set<string>()
  const duplicateSize = new Set<string>()
  const configurationIssues: string[] = []
  sizeGuide.forEach((row, index) => {
    const key = row.size.trim().toLocaleLowerCase('vi-VN')
    if (!key) configurationIssues.push(`Bảng size: dòng ${index + 1} cần có tên size`)
    else if (duplicateGuideSize.has(key)) configurationIssues.push(`Bảng size: size “${row.size}” bị trùng`)
    duplicateGuideSize.add(key)
    for (const [from, to, label] of [['minWeight', 'maxWeight', 'cân nặng'], ['minHeight', 'maxHeight', 'chiều cao']] as const) {
      const lower = row[from], upper = row[to]
      if (lower !== undefined && (!Number.isFinite(lower) || lower < 0) || upper !== undefined && (!Number.isFinite(upper) || upper < 0)) configurationIssues.push(`Bảng size: ${label} phải là số không âm`)
      if (lower !== undefined && upper !== undefined && lower > upper) configurationIssues.push(`Bảng size: ${label} từ không được lớn hơn đến`)
    }
  })
  if (hasVariants) {
    variantConfig.colors.forEach(color => {
      const key = color.name.trim().toLocaleLowerCase('vi-VN')
      if (!key || duplicateColor.has(key)) configurationIssues.push('Danh sách màu không được để trống hoặc trùng tên')
      duplicateColor.add(key)
    })
    variantConfig.sizes.forEach(size => {
      const key = size.name.trim().toLocaleLowerCase('vi-VN')
      if (!key || duplicateSize.has(key)) configurationIssues.push('Danh sách size không được để trống hoặc trùng tên')
      duplicateSize.add(key)
    })
    if (!variantConfig.colors.length && !variantConfig.sizes.length) configurationIssues.push('Phân loại: cần khai báo ít nhất một màu hoặc một size')
    if (!variants.length) configurationIssues.push('Phân loại: cần có ít nhất một biến thể hợp lệ')
    if (variants.length > MAX_PRODUCT_VARIANTS) configurationIssues.push(`Phân loại: tối đa ${MAX_PRODUCT_VARIANTS} biến thể`)
    variants.forEach(variant => {
      const sku = variant.sku.trim().toLocaleUpperCase('vi-VN')
      if (!sku || duplicateSku.has(sku)) configurationIssues.push('SKU biến thể không được để trống hoặc trùng nhau')
      duplicateSku.add(sku)
      if (!Number.isSafeInteger(variant.stock) || variant.stock < 0 || variant.stock > MAX_VARIANT_STOCK) configurationIssues.push(`Tồn kho ${[variant.color, variant.size].filter(Boolean).join(' / ')} phải là số nguyên từ 0 đến ${MAX_VARIANT_STOCK}`)
      if (variant.price !== null && variant.price !== undefined && (!Number.isSafeInteger(variant.price) || variant.price < 1)) configurationIssues.push(`Giá riêng ${[variant.color, variant.size].filter(Boolean).join(' / ')} phải là số nguyên lớn hơn 0`)
    })
    if (stockConfirmationRequired && confirmedVariantStockTotal !== variantStock) configurationIssues.push('Cần xác nhận tổng tồn kho biến thể trước khi lưu')
  }

  const comboConfigurationIssues = [
    comboComponents.reduce((total, component) => total + component.quantity, 0) < 2 ? 'Combo cần có ít nhất 2 sản phẩm tính cả số lượng' : '',
    comboComponents.some(component => !comboProducts[component.productId]) ? 'Đang tải hoặc thiếu thông tin sản phẩm thành phần' : '',
    comboComponents.some(component => {
      const source = comboProducts[component.productId]
      return source?.hasVariants === true && (!source.variants?.length || Boolean(component.variantId) && !source.variants.some(variant => variant.id === component.variantId))
    }) ? 'Sản phẩm thành phần không có biến thể hợp lệ' : '',
    !Number.isSafeInteger(comboDiscountValue) || comboDiscountValue < 1 ? 'Mức giảm phải là số nguyên dương' : '',
    discountType === 'PERCENT' && comboDiscountValue >= 100 ? 'Mức giảm phần trăm phải nhỏ hơn 100%' : '',
    comboDiscountAmount <= 0 || comboDiscountAmount >= comboSubtotal || comboFinalPrice < 1 ? 'Mức giảm phải nhỏ hơn giá gốc của combo' : '',
  ].filter(Boolean)

  const formIssues = [
    images.length > MAX_PRODUCT_IMAGE_COUNT ? `Ảnh sản phẩm: giảm từ ${images.length} xuống tối đa ${MAX_PRODUCT_IMAGE_COUNT} ảnh` : '',
    !fields.name.trim() ? 'Tên sản phẩm' : '',
    !fields.slug.trim() ? 'Slug' : '',
    !fields.categoryId ? 'Danh mục' : '',
    productType === 'SIMPLE' && !fields.price.trim() ? 'Giá gốc' : !Number.isSafeInteger(price) || price < 1 ? 'Giá gốc phải là số nguyên lớn hơn 0' : '',
    productType === 'SIMPLE' && fields.salePrice && (!Number.isSafeInteger(salePrice) || salePrice! < 1 || salePrice! >= price) ? 'Giá sale phải là số nguyên dương và thấp hơn giá gốc' : '',
    productType === 'SIMPLE' && fields.saleStartAt && fields.saleEndAt && new Date(fields.saleEndAt) < new Date(fields.saleStartAt) ? 'Thời gian kết thúc sale phải sau thời gian bắt đầu' : '',
    productType === 'SIMPLE' && !hasVariants && (!fields.stock.trim() || !Number.isSafeInteger(Number(fields.stock)) || Number(fields.stock) < 0) ? 'Tồn kho phải là số nguyên không âm' : '',
    !fields.sortOrder.trim() || !Number.isSafeInteger(Number(fields.sortOrder)) || Number(fields.sortOrder) < 0 ? 'Thứ tự hiển thị phải là số nguyên không âm' : '',
    ...(productType === 'COMBO' ? comboConfigurationIssues : configurationIssues),
  ].filter((issue): issue is string => Boolean(issue))

  const setField = <K extends keyof Fields>(key: K, value: Fields[K]) => setFields(current => ({ ...current, [key]: value }))

  const applySizeGuideRows = (nextRows: ProductSizeGuide[]) => {
    const synchronized = syncVariantSizesWithSizeGuide(nextRows, variantConfig, variants, fields.slug)
    if (!synchronized.variants) {
      setSizeGuideSyncError(`Tổ hợp vượt quá ${MAX_PRODUCT_VARIANTS} biến thể. Hãy giảm số màu hoặc size trước khi thêm size.`)
      return false
    }
    setSizeGuide(nextRows)
    setVariantConfig(synchronized.config)
    setVariants(synchronized.variants)
    setSizeGuideSyncError('')
    setPendingSizeGuideRemoval(null)
    return true
  }

  const requestSizeGuideChange = (nextRows: ProductSizeGuide[]) => {
    const removed = sizeGuide.find(row => !nextRows.some(next => next.id === row.id))
    if (removed) {
      const affectedStock = calculateTotalStock(variants.filter(variant => variant.sizeId === removed.id))
      if (affectedStock > 0) {
        setPendingSizeGuideRemoval({ id: removed.id, name: removed.size, affectedStock })
        return
      }
    }
    applySizeGuideRows(nextRows)
  }

  const requestRemoveSizeGuideRow = (id: string) => {
    requestSizeGuideChange(sizeGuide.filter(row => row.id !== id))
  }

  const toggleVariants = (enabled: boolean) => {
    if (enabled) {
      setLegacyStockAtEnable(Number(fields.stock) || 0)
      setConfirmedVariantStockTotal(null)
      setHasVariants(true)
      return
    }
    if (hasVariants && variants.length) setPendingDisableVariants(true)
    else setHasVariants(false)
  }

  const confirmDisableVariants = () => {
    setFields(current => ({ ...current, stock: String(variantStock) }))
    setHasVariants(false)
    setPendingDisableVariants(false)
    setConfirmedVariantStockTotal(null)
  }

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
    if (isDirty && !window.confirm('Bạn có thay đổi chưa lưu. Hủy và bỏ các thay đổi này?')) return
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
      setBusy(false); setError('Hãy nhập tên, slug và chọn danh mục sản phẩm.'); focusTabField('info'); return
    }
    if (!Number.isSafeInteger(price) || price < 1) {
      setBusy(false); setError('Giá gốc phải là số nguyên lớn hơn 0.'); focusTabField('price'); return
    }
    if (salePrice !== null && (!Number.isSafeInteger(salePrice) || salePrice < 1 || salePrice >= price)) {
      setBusy(false); setError('Giá sale phải là số nguyên lớn hơn 0 và thấp hơn giá gốc.'); focusTabField('price'); return
    }
    const startAt = productType === 'COMBO' ? null : toISO(fields.saleStartAt)
    const endAt = productType === 'COMBO' ? null : toISO(fields.saleEndAt)
    if (startAt && endAt && new Date(endAt) < new Date(startAt)) {
      setBusy(false); setError('Thời gian kết thúc sale phải sau thời gian bắt đầu.'); focusTabField('price'); return
    }
    const stock = productType === 'COMBO' ? 0 : hasVariants ? variantStock : Number(fields.stock), sortOrder = Number(fields.sortOrder)
    if (!Number.isSafeInteger(stock) || stock < 0 || stock > MAX_PRODUCT_VARIANTS * MAX_VARIANT_STOCK || !Number.isSafeInteger(sortOrder) || sortOrder < 0) {
      setBusy(false); setError('Kho và thứ tự hiển thị phải là số nguyên không âm.'); focusTabField('stock'); return
    }
    if (formIssues.length) {
      setBusy(false); setError('Hãy xử lý các mục đang được đánh dấu trước khi lưu sản phẩm.'); focusTabField(getFormIssueTab(formIssues[0])); return
    }
    const payload = {
      name: fields.name.trim(), slug: fields.slug.trim(), categoryId: fields.categoryId,
      shortDescription: fields.shortDescription, description: fields.description,
      seoTitle: fields.seoTitle, seoDescription: fields.seoDescription,
      price, salePrice, saleStartAt: startAt, saleEndAt: endAt,
      isNewArrival: fields.isNewArrival, showOnHomeBanner: fields.showOnHomeBanner, arrivalAt: bangkokDayStart(fields.arrivalAt),
      stock, isActive, sortOrder,
      attributes: productType === 'COMBO' ? {} : attributes,
      sizeGuide,
      hasVariants: productType === 'COMBO' ? false : hasVariants,
      variantConfig: productType === 'COMBO' || !hasVariants ? { colors: [], sizes: [] } : variantConfig,
      variants: productType === 'COMBO' || !hasVariants ? [] : variants,
      type: productType,
      components: productType === 'COMBO' ? comboComponents : [],
      discount: productType === 'COMBO' ? { type: discountType, value: comboDiscountValue } : null,
    }

    let id = savedId
    try {
      if (!id) {
        if (!draftReady || !draftIdRef.current || !draftTokenRef.current) throw new Error(draftError || 'Đang cấp mã sản phẩm. Hãy thử lại sau.')
      const draftPayload = { ...payload, stock: productType === 'COMBO' ? 0 : Number(fields.stock) || 0, hasVariants: false, variantConfig: { colors: [], sizes: [] }, variants: [], isActive: false, thumbnail: '', images: [] }
        const response = await fetch('/api/admin/products', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: draftIdRef.current, draftToken: draftTokenRef.current, ...draftPayload }) })
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
      const availableImageUrls = new Set(nextImages.map(image => image.url))
      const nextVariantConfig = hasVariants ? {
        colors: variantConfig.colors.map(color => ({ ...color, ...(color.imageUrl && availableImageUrls.has(color.imageUrl) ? {} : { imageUrl: undefined }) })),
        sizes: variantConfig.sizes,
      } : { colors: [], sizes: [] }
      const nextVariants = hasVariants ? variants.map(variant => ({
        ...variant,
        ...(variant.imageUrl && availableImageUrls.has(variant.imageUrl) ? {} : { imageUrl: undefined }),
      })) : []
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...payload, stock: hasVariants ? calculateTotalStock(nextVariants) : stock, variantConfig: nextVariantConfig, variants: nextVariants, thumbnail: selected?.url ?? '', images: nextImages.map(persistedImage) }),
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

  return <div className="flex min-h-full w-full min-w-0 flex-1 flex-col">
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
      <div className="min-w-0">
        {!editing && <nav aria-label="Đường dẫn sản phẩm" className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Link href="/admin/products" className="hover:text-pink-700">Sản phẩm</Link><span aria-hidden="true">/</span><span aria-current="page">Thêm sản phẩm</span>
        </nav>}
        <h2 className="text-2xl font-black sm:text-3xl">{editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h2>
        <p className="mt-1 hidden text-sm text-slate-500 md:block">Cập nhật thông tin, hình ảnh, giá và tồn kho.</p>
      </div>
      {canPreviewProduct ? <Link href={`/products/${fields.slug}`} target="_blank" aria-label="Xem trang sản phẩm" title="Xem trang sản phẩm" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 sm:px-4"><Eye size={19} /><span className="hidden sm:inline">Xem trang sản phẩm</span></Link> : <button type="button" disabled aria-label="Chưa có trang sản phẩm để xem" title="Sản phẩm chưa có URL công khai" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-bold text-slate-400 sm:px-4"><Eye size={19} /><span className="hidden sm:inline">Xem trang sản phẩm</span></button>}
    </header>
    {message && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p>}
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
    <form ref={formRef} onSubmit={event => void save(event)} noValidate className="flex min-w-0 flex-1 flex-col gap-4">
      <div role="tablist" aria-label="Nhóm thông tin sản phẩm" className="sticky top-14 z-30 grid w-full min-w-0 grid-cols-6 gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur sm:gap-2 sm:p-2 lg:top-20">
        {productFormTabs.map((tab, index) => {
          const Icon = tab.icon
          return <button key={tab.id} id={`product-tab-${tab.id}`} type="button" role="tab" tabIndex={activeTab === tab.id ? 0 : -1} aria-label={tab.label} aria-selected={activeTab === tab.id} aria-controls={`product-panel-${tab.id}`} title={tab.label} onClick={() => setActiveTab(tab.id)} onKeyDown={event => {
            let nextIndex: number | null = null
            if (event.key === 'ArrowRight') nextIndex = (index + 1) % productFormTabs.length
            else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + productFormTabs.length) % productFormTabs.length
            else if (event.key === 'Home') nextIndex = 0
            else if (event.key === 'End') nextIndex = productFormTabs.length - 1
            if (nextIndex !== null) {
              event.preventDefault()
              const nextTab = productFormTabs[nextIndex]
              setActiveTab(nextTab.id)
              document.getElementById(`product-tab-${nextTab.id}`)?.focus()
            }
          }} className={`flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl px-1.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 sm:px-2 ${activeTab === tab.id ? 'bg-pink-100 text-pink-700 ring-1 ring-inset ring-pink-300' : 'bg-slate-50 text-slate-600 hover:bg-white hover:text-slate-900'}`}><Icon size={20} aria-hidden="true" /><span className="hidden lg:inline">{tab.label}</span></button>
        })}
      </div>
      <div id="product-panel-info" role="tabpanel" tabIndex={0} aria-labelledby="product-tab-info" hidden={activeTab !== 'info'} className="min-w-0 scroll-mt-36 space-y-4 lg:scroll-mt-40">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="flex items-center gap-2 text-lg font-black"><Info size={19} className="text-pink-500" />Thông tin sản phẩm</h3>
        {!product ? <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(['SIMPLE', 'COMBO'] as const).map(type => <button key={type} type="button" onClick={() => setProductType(type)} aria-pressed={productType === type} className={`rounded-2xl border p-4 text-left transition ${productType === type ? 'border-pink-300 bg-pink-50 ring-1 ring-pink-200' : 'border-slate-200 hover:bg-slate-50'}`}><span className="block font-black">{type === 'COMBO' ? 'Combo sản phẩm' : 'Sản phẩm thường'}</span><span className="mt-1 block text-sm text-slate-500">{type === 'COMBO' ? 'Gộp nhiều sản phẩm, dùng chung tồn kho thành phần.' : 'Một sản phẩm hoặc sản phẩm có phân loại.'}</span></button>)}
        </div> : <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">Loại: {productType === 'COMBO' ? 'Combo sản phẩm' : 'Sản phẩm thường'}</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Tên sản phẩm *"><input required maxLength={160} value={fields.name} onChange={event => { const name = event.target.value; setField('name', name); if (!slugEdited) setField('slug', slugify(name)) }} className="input" /></Field>
          <Field label="Slug *"><input required maxLength={180} value={fields.slug} onChange={event => { setSlugEdited(true); setField('slug', slugify(event.target.value)) }} className="input" /><span className="mt-1 block text-xs text-slate-400">Đường dẫn: /products/{fields.slug || 'ten-san-pham'}</span></Field>
          <Field label="Danh mục *"><select required value={fields.categoryId} onChange={event => setField('categoryId', event.target.value)} className="input"><option value="">Chọn danh mục</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{categoryError && <span className="mt-1 block text-xs text-rose-600">{categoryError}</span>}{!categories.length && !categoryError && <Link href="/admin/product-categories" className="mt-1 inline-block text-xs font-semibold text-pink-600">Tạo danh mục trước</Link>}</Field>
          <Field label="Mô tả ngắn"><input maxLength={500} value={fields.shortDescription} onChange={event => setField('shortDescription', event.target.value)} className="input" /></Field>
          <div className="sm:col-span-2"><Field label="Mô tả chi tiết"><textarea maxLength={10000} rows={5} value={fields.description} onChange={event => setField('description', event.target.value)} className="input min-h-32 resize-y" /></Field></div>
          <Field label="Tiêu đề SEO"><input maxLength={200} value={fields.seoTitle} onChange={event => setField('seoTitle', event.target.value)} className="input" placeholder={fields.name || 'Tiêu đề hiển thị trên Google'} /></Field>
          <Field label="Mô tả SEO"><textarea maxLength={320} rows={2} value={fields.seoDescription} onChange={event => setField('seoDescription', event.target.value)} className="input resize-y" placeholder="Mô tả ngắn cho kết quả tìm kiếm" /></Field>
        </div>
      </section>

      {productType === 'SIMPLE' && <ProductAttributesSection value={attributes} onChange={setAttributes} />}
      </div>

      <div id="product-panel-variants" role="tabpanel" tabIndex={0} aria-labelledby="product-tab-variants" hidden={activeTab !== 'variants'} className="min-w-0 scroll-mt-36 space-y-4 lg:scroll-mt-40">
      {productType === 'SIMPLE' ? <>
      {productType === 'SIMPLE' && <ProductSizeGuideSection rows={sizeGuide} onChange={requestSizeGuideChange} onRequestRemove={requestRemoveSizeGuideRow} />}
      {productType === 'SIMPLE' && sizeGuideSyncError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{sizeGuideSyncError}</p>}
      {pendingSizeGuideRemoval && <div role="alertdialog" aria-label="Xác nhận xóa size" className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
        <p className="font-bold">Xóa size “{pendingSizeGuideRemoval.name || 'chưa đặt tên'}” khỏi bảng hướng dẫn?</p>
        <p className="mt-1">Các biến thể của size này đang có tổng tồn kho {pendingSizeGuideRemoval.affectedStock}. Xóa size sẽ xóa các dòng biến thể liên quan khỏi biểu mẫu; thay đổi chỉ được lưu khi bạn lưu sản phẩm.</p>
        <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setPendingSizeGuideRemoval(null)} className="rounded-lg border border-rose-300 bg-white px-3 py-2 font-bold">Giữ lại size</button><button type="button" onClick={() => applySizeGuideRows(sizeGuide.filter(row => row.id !== pendingSizeGuideRemoval.id))} className="rounded-lg bg-rose-700 px-3 py-2 font-bold text-white">Xóa size và biến thể</button></div>
      </div>}
      <ProductVariantsSection
        hasVariants={hasVariants}
        config={variantConfig}
        variants={variants}
        images={images.filter(image => !image.file && Boolean(image.url))}
        productSlug={fields.slug}
        originalStock={legacyStockAtEnable}
        busy={busy}
        stockConfirmationRequired={stockConfirmationRequired}
        confirmedStockTotal={confirmedVariantStockTotal}
        pendingDisable={pendingDisableVariants}
        onToggle={toggleVariants}
        onConfigChange={setVariantConfig}
        onVariantsChange={setVariants}
        onConfirmStock={setConfirmedVariantStockTotal}
        onCancelDisable={() => setPendingDisableVariants(false)}
        onConfirmDisable={confirmDisableVariants}
      />
      </> : <section className="rounded-3xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm sm:p-6">Combo không có hướng dẫn size hoặc phân loại riêng. Bạn có thể cố định biến thể, hoặc để khách chọn size và màu cho từng sản phẩm thành phần trong tab Giá.</section>}
      </div>

      <div id="product-panel-images" role="tabpanel" tabIndex={0} aria-labelledby="product-tab-images" hidden={activeTab !== 'images'} className="min-w-0 scroll-mt-36 space-y-4 lg:scroll-mt-40">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="flex items-center gap-2 text-lg font-black"><ImageIcon size={19} className="text-pink-500" />Hình ảnh</h3>
        <p className="mt-1 text-sm text-slate-500">Ảnh mới được crop vuông, nén WebP và tải lên Cloudinary sau khi xác nhận. Bấm Lưu sản phẩm để gắn ảnh vào dữ liệu. Tối đa 8 ảnh mỗi sản phẩm.</p>
        <div className="mt-4"><ProductImageEditor items={images} onChange={setImages} thumbnailId={thumbnailId} onThumbnailChange={setThumbnailId} onRetryUpload={() => formRef.current?.requestSubmit()} onUploadImage={uploadConfirmedImage} disabled={!draftReady} /></div>
      </section>
      </div>

      <div id="product-panel-price" role="tabpanel" tabIndex={0} aria-labelledby="product-tab-price" hidden={activeTab !== 'price'} className="min-w-0 scroll-mt-36 space-y-4 lg:scroll-mt-40">
      {productType === 'SIMPLE' ? <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="flex items-center gap-2 text-lg font-black"><Tag size={19} className="text-pink-500" />Giá bán</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Giá gốc (VND) *"><input required type="number" min="1" step="1" value={fields.price} onChange={event => setField('price', event.target.value)} className="input" /></Field>
          <Field label="Giá sale (không bắt buộc)"><input type="number" min="1" step="1" value={fields.salePrice} onChange={event => setField('salePrice', event.target.value)} className="input" /></Field>
          <Field label="Bắt đầu sale"><input type="datetime-local" value={fields.saleStartAt} onChange={event => setField('saleStartAt', event.target.value)} className="input" /></Field>
          <Field label="Kết thúc sale"><input type="datetime-local" value={fields.saleEndAt} onChange={event => setField('saleEndAt', event.target.value)} className="input" /></Field>
        </div>
        {fields.salePrice && <p className={`mt-4 rounded-xl p-3 text-sm font-semibold ${salePreview === null ? 'bg-rose-50 text-rose-700' : 'bg-pink-50 text-pink-700'}`}>
          {salePreview === null ? 'Giá sale phải thấp hơn giá gốc.' : <>Giá gốc: {formatPrice(price)} · Giá sale: {formatPrice(salePrice!)} · Giảm {salePreview}%</>}
        </p>}
      </section> : <ComboConfigurationSection
        components={comboComponents}
        products={comboProducts}
        candidates={componentCandidates}
        loading={componentLoading}
        search={componentSearch}
        pendingProduct={pendingComponent}
        pendingVariantId={pendingVariantId}
        discountType={discountType}
        discountValue={discountValue}
        subtotal={comboSubtotal}
        discountAmount={comboDiscountAmount}
        finalPrice={comboFinalPrice}
        available={comboAvailable}
        productName={fields.name}
        previewImages={comboPreviewImages}
        onOpenPicker={() => { setComboPickerOpen(true); setComponentSearch(''); setPendingComponent(null) }}
        onSearch={setComponentSearch}
        onSelectCandidate={candidate => { setPendingComponent(candidate); setPendingVariantId(''); setComboProducts(current => ({ ...current, [candidate.id]: candidate })) }}
        onSelectVariant={setPendingVariantId}
        onAdd={() => {
          if (!pendingComponent) return
          const variantId = pendingComponent.hasVariants && pendingVariantId ? pendingVariantId : null
          const existing = comboComponents.find(item => comboComponentKey(item.productId, item.variantId) === comboComponentKey(pendingComponent.id, variantId))
          if (existing) {
            if (existing.quantity >= 99) return
            setComboComponents(current => current.map(item => comboComponentKey(item.productId, item.variantId) === comboComponentKey(pendingComponent.id, variantId)
              ? { ...item, quantity: item.quantity + 1 }
              : item))
          } else {
            if (comboComponents.length >= 20) return
            setComboComponents(current => [...current, { productId: pendingComponent.id, variantId, quantity: 1 }])
          }
          setPendingComponent(null)
          setPendingVariantId('')
        }}
        onQuantityChange={(component, quantity) => setComboComponents(current => current.map(item => comboComponentKey(item.productId, item.variantId) === comboComponentKey(component.productId, component.variantId) ? { ...item, quantity } : item))}
        onRemove={component => setComboComponents(current => current.filter(item => comboComponentKey(item.productId, item.variantId) !== comboComponentKey(component.productId, component.variantId)))}
        onDiscountTypeChange={setDiscountType}
        onDiscountValueChange={setDiscountValue}
        onClosePicker={() => setComboPickerOpen(false)}
        pickerOpen={comboPickerOpen}
      />}
      </div>

      <div id="product-panel-stock" role="tabpanel" tabIndex={0} aria-labelledby="product-tab-stock" hidden={activeTab !== 'stock'} className="min-w-0 scroll-mt-36 space-y-4 lg:scroll-mt-40">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="flex items-center gap-2 text-lg font-black"><Package size={19} className="text-pink-500" />Kho &amp; hiển thị</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Ngày hàng về"><input type="date" value={fields.arrivalAt} onChange={event => setField('arrivalAt', event.target.value)} disabled={!fields.isNewArrival} className="input disabled:bg-slate-50" /></Field>
          {productType === 'COMBO' ? <Field label="Số combo có thể bán"><input type="number" value={comboAvailable} readOnly className="input bg-slate-50" /><span className="mt-1 block text-xs text-slate-500">Được tính từ tồn kho các thành phần; combo không có tồn kho riêng.</span></Field> : hasVariants ? <Field label="Tồn kho tổng"><input type="number" value={variantStock} readOnly className="input bg-slate-50" /><span className="mt-1 block text-xs text-slate-500">Tồn kho được tính từ các phân loại sản phẩm.</span></Field> : <Field label="Tồn kho *"><input required type="number" min="0" step="1" value={fields.stock} onChange={event => setField('stock', event.target.value)} className="input" /></Field>}
          <Field label="Thứ tự hiển thị *"><input required type="number" min="0" step="1" value={fields.sortOrder} onChange={event => setField('sortOrder', event.target.value)} className="input" /></Field>
          <div className="flex flex-wrap gap-4 pt-7">
            <Check label="Sản phẩm mới về" checked={fields.isNewArrival} onChange={value => setField('isNewArrival', value)} />
            <Check label="Hiển thị trên banner trang chủ" checked={fields.showOnHomeBanner} onChange={value => setField('showOnHomeBanner', value)} />
          </div>
          {productType === 'COMBO' && <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-bold text-slate-700">Trạng thái combo</legend><div className="flex flex-wrap gap-2"><button type="button" aria-pressed={!isActive} onClick={() => setIsActive(false)} className={`rounded-xl border px-4 py-2 text-sm font-bold ${!isActive ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-600'}`}>Lưu nháp</button><button type="button" aria-pressed={isActive} onClick={() => setIsActive(true)} className={`rounded-xl border px-4 py-2 text-sm font-bold ${isActive ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600'}`}>Kích hoạt combo</button></div></fieldset>}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">Banner chỉ hiển thị một sản phẩm; nếu chọn nhiều, sản phẩm có thứ tự hiển thị thấp hơn được ưu tiên. Tối đa 3 ảnh của sản phẩm sẽ xuất hiện.</p>
      </section>
      </div>

      <div id="product-panel-short-link" role="tabpanel" tabIndex={0} aria-labelledby="product-tab-short-link" hidden={activeTab !== 'short-link'} className="min-w-0 scroll-mt-36 space-y-4 lg:scroll-mt-40">
      <ShortLinkManager targetType="product" targetId={savedId && !createdDuringFormRef.current ? savedId : undefined} targetUrl={`/products/${fields.slug}`} title={fields.name} />
      </div>
      {categoriesLoading && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">Đang tải danh mục. Nút lưu sẽ dùng được sau khi danh mục tải xong.</p>}
      {!product && !draftReady && !draftError && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">Đang cấp mã sản phẩm trước khi tải ảnh…</p>}
      {!product && draftError && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">Không cấp được mã sản phẩm: {draftError} <button type="button" onClick={() => window.location.reload()} className="ml-2 font-bold underline">Tải lại biểu mẫu</button></div>}
      {!categoriesLoading && categoryError && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800"><span>Không tải được danh mục: {categoryError}</span><div className="flex items-center gap-3"><Link href="/admin/product-categories" className="font-bold text-pink-700 underline">Quản lý danh mục</Link><button type="button" onClick={() => setCategoryReload(value => value + 1)} className="font-bold underline">Thử lại</button></div></div>}
      {!categoriesLoading && !categoryError && categories.length === 0 && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Chưa có danh mục nào đang hoạt động nên chưa thể lưu sản phẩm. <Link href="/admin/product-categories" className="underline">Tạo danh mục</Link> trước.</p>}
      {formIssues.length > 0 && <div id="product-save-guidance" aria-live="polite" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><p className="font-bold">Cần bổ sung hoặc kiểm tra trước khi lưu:</p><ul className="mt-1 list-inside list-disc">{formIssues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}
      <section aria-label="Thao tác sản phẩm" className="sticky bottom-0 z-40 mt-auto -mx-3 -mb-4 flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:-mx-4 sm:-mb-6 sm:gap-3 sm:px-4 sm:py-3 sm:pb-3 lg:-mx-6 lg:-mb-8 lg:justify-end lg:px-6 xl:-mx-8 xl:px-8">
        <button type="button" disabled={busy} onClick={() => void cancelForm()} className="min-h-11 flex-1 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-bold text-slate-700 disabled:opacity-50 sm:flex-none sm:px-5">Hủy</button>
        <button type="submit" disabled={busy || categoriesLoading || categories.length === 0 || !draftReady} aria-describedby={formIssues.length ? 'product-save-guidance' : undefined} className="min-h-11 min-w-0 flex-[2] truncate whitespace-nowrap rounded-xl bg-pink-500 px-3 py-2.5 font-bold text-white hover:bg-pink-600 disabled:opacity-50 sm:flex-none sm:px-6">{busy ? 'Đang lưu…' : categoriesLoading ? 'Đang tải danh mục…' : !draftReady ? 'Đang chuẩn bị mã sản phẩm…' : categories.length === 0 ? 'Cần có danh mục để lưu' : 'Lưu sản phẩm'}</button>
      </section>
    </form>
  </div>
}

type ComboConfigurationProps = {
  components: ProductComboComponent[]
  products: Record<string, Product>
  candidates: Product[]
  loading: boolean
  search: string
  pendingProduct: Product | null
  pendingVariantId: string
  discountType: ProductDiscount['type']
  discountValue: string
  subtotal: number
  discountAmount: number
  finalPrice: number
  available: number
  productName: string
  previewImages: ComboDisplayImage[]
  pickerOpen: boolean
  onOpenPicker: () => void
  onSearch: (value: string) => void
  onSelectCandidate: (product: Product) => void
  onSelectVariant: (variantId: string) => void
  onAdd: () => void
  onQuantityChange: (component: ProductComboComponent, quantity: number) => void
  onRemove: (component: ProductComboComponent) => void
  onDiscountTypeChange: (type: ProductDiscount['type']) => void
  onDiscountValueChange: (value: string) => void
  onClosePicker: () => void
}

function comboComponentKey(productId: string, variantId?: string | null) {
  return JSON.stringify([productId, variantId ?? null])
}

function ComboConfigurationSection(props: ComboConfigurationProps) {
  const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`
  const totalComponentQuantity = props.components.reduce((total, component) => total + component.quantity, 0)
  const pendingVariantId = props.pendingProduct?.hasVariants ? props.pendingVariantId || null : null
  const pendingComponent = props.pendingProduct
    ? props.components.find(component => comboComponentKey(component.productId, component.variantId) === comboComponentKey(props.pendingProduct!.id, pendingVariantId))
    : undefined
  const canAddPending = Boolean(props.pendingProduct && (pendingComponent ? pendingComponent.quantity < 99 : props.components.length < 20))
  return <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-black">Thành phần combo</h3><p className="mt-1 text-sm text-slate-500">Có thể chọn nhiều sản phẩm khác nhau hoặc tăng số lượng của cùng một sản phẩm.</p><p className="mt-1 text-xs font-bold text-slate-600">Tổng số lượng: {totalComponentQuantity} sản phẩm · Combo cần ít nhất 2 sản phẩm.</p></div><button type="button" onClick={props.onOpenPicker} className="inline-flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-pink-600"><Plus size={16} />Chọn sản phẩm</button></div>
    {!props.components.length ? <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Chưa chọn sản phẩm thành phần.</p> : <div className="mt-4 space-y-2">
      {props.components.map(component => {
        const source = props.products[component.productId]
        const variant = source?.hasVariants ? source.variants?.find(item => item.id === component.variantId) : null
        const unitPrice = source ? variant?.price ?? getProductEffectivePrice(source, new Date()) : 0
        const stock = source ? source.hasVariants
          ? component.variantId ? variant?.stock ?? 0 : Math.max(0, ...(source.variants ?? []).map(item => item.stock))
          : source.stock
          : 0
        return <article key={comboComponentKey(component.productId, component.variantId)} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3 sm:flex-row sm:items-center">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">{source?.thumbnail && <ProductImageView src={source.thumbnail} alt="" sizes="64px" variant="thumbnail" className="object-cover" />}</div>
          <div className="min-w-0 flex-1"><p className="truncate font-bold text-slate-800">{source?.name ?? 'Đang tải sản phẩm…'}</p><p className="mt-0.5 text-xs text-slate-500">{variant ? [variant.color, variant.size, variant.sku ? `SKU ${variant.sku}` : null].filter(Boolean).join(' · ') : source?.hasVariants ? 'Khách chọn biến thể khi mua' : 'Không có biến thể'} · Kho {stock}</p><p className="mt-1 text-sm font-bold text-pink-700">{money(unitPrice)} / sản phẩm</p></div>
          <label className="flex h-10 items-center gap-2 rounded-lg border px-2 text-xs font-bold text-slate-600">SL<input type="number" min={1} max={99} value={component.quantity} onChange={event => props.onQuantityChange(component, Math.max(1, Math.min(99, Number(event.target.value) || 1)))} className="w-14 border-0 p-0 text-center text-sm font-bold outline-none" /></label>
          <button type="button" onClick={() => props.onRemove(component)} aria-label={`Bỏ ${source?.name ?? 'sản phẩm'} khỏi combo`} className="self-end rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 sm:self-auto"><X size={17} /></button>
        </article>
      })}
    </div>}

    <div className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
      <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">Kiểu giảm giá</span><select value={props.discountType} onChange={event => props.onDiscountTypeChange(event.target.value as ProductDiscount['type'])} className="input"><option value="PERCENT">Phần trăm (%)</option><option value="FIXED_AMOUNT">Số tiền (VNĐ)</option></select></label>
      <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">Mức giảm</span><input type="number" min={1} max={props.discountType === 'PERCENT' ? 99 : 1000000000} step={1} value={props.discountValue} onChange={event => props.onDiscountValueChange(event.target.value)} className="input" /></label>
      <div className="space-y-2 text-sm sm:col-span-2"><div className="flex justify-between gap-3"><span className="text-slate-600">Tổng giá gốc</span><strong>{money(props.subtotal)}</strong></div><div className="flex justify-between gap-3"><span className="text-slate-600">Tiết kiệm</span><strong className="text-emerald-700">−{money(props.discountAmount)}</strong></div><div className="flex justify-between gap-3 border-t border-slate-200 pt-2 text-base"><span className="font-bold">Giá combo</span><strong className="text-pink-700">{money(props.finalPrice)}</strong></div><p className="text-xs text-slate-500">Giá được tính lại từ giá và biến thể hiện tại khi lưu và khi đặt hàng.</p></div>
    </div>

    <div className="mt-5"><h4 className="text-sm font-black text-slate-700">Xem trước card sản phẩm</h4><article className="mt-2 flex max-w-md gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#fff8f5]">{props.previewImages.length > 1 ? <ComboImageCollage images={props.previewImages} variant="thumbnail" /> : props.previewImages[0] ? <ProductImageView src={props.previewImages[0].url} alt="" sizes="80px" variant="thumbnail" className="object-cover" /> : null}</div><div className="min-w-0 flex-1"><span className="inline-flex rounded-full bg-pink-50 px-2 py-0.5 text-[11px] font-black text-pink-700">COMBO</span><p className="mt-1 truncate text-sm font-bold">{props.productName || 'Tên combo'}</p><div className="mt-1 flex flex-wrap items-baseline gap-x-2"><span className="text-xs text-slate-400 line-through">{money(props.subtotal)}</span><strong className="text-sm text-pink-700">{money(props.finalPrice)}</strong></div><p className="mt-0.5 text-xs text-slate-500">{props.available > 0 ? `Còn ${props.available} combo` : 'Hết hàng'}</p></div></article></div>

    {props.pickerOpen && <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/55 p-3 sm:p-6" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) props.onClosePicker() }}><section role="dialog" aria-modal="true" aria-labelledby="combo-component-picker-title" className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
      <header className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-pink-500">Combo</p><h4 id="combo-component-picker-title" className="text-xl font-black">Chọn sản phẩm thành phần</h4></div><button type="button" onClick={props.onClosePicker} aria-label="Đóng" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></header>
      <label className="relative mt-4 block"><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input value={props.search} onChange={event => props.onSearch(event.target.value)} className="input pl-9" placeholder="Tìm tên sản phẩm" /></label>
      {props.loading ? <p className="py-8 text-center text-sm text-slate-500">Đang tìm sản phẩm…</p> : <div className="mt-3 max-h-72 divide-y overflow-y-auto rounded-xl border border-slate-100">{props.candidates.map(candidate => <div key={candidate.id} className="flex items-center gap-3 p-3"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">{candidate.thumbnail && <ProductImageView src={candidate.thumbnail} alt="" sizes="48px" variant="thumbnail" className="object-cover" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{candidate.name}</p><p className="text-xs text-slate-500">{money(getProductEffectivePrice(candidate, new Date()))} · Kho {candidate.stock}</p></div><button type="button" onClick={() => props.onSelectCandidate(candidate)} className="rounded-lg border border-pink-200 px-3 py-2 text-xs font-bold text-pink-700 hover:bg-pink-50">Chọn</button></div>)}{!props.candidates.length && <p className="p-6 text-center text-sm text-slate-500">Không có sản phẩm thường phù hợp.</p>}</div>}
      {props.pendingProduct && <div className="mt-4 rounded-2xl border border-pink-200 bg-pink-50 p-4"><p className="font-bold">{props.pendingProduct.name}</p>{props.pendingProduct.hasVariants && <label className="mt-3 block text-sm font-bold">Màu / size cố định<select value={props.pendingVariantId} onChange={event => props.onSelectVariant(event.target.value)} className="input mt-1.5"><option value="">Để khách chọn màu / size khi mua</option>{(props.pendingProduct.variants ?? []).map(variant => <option key={variant.id} value={variant.id}>{[variant.color ? `Màu: ${variant.color}` : null, variant.size ? `Size: ${variant.size}` : null, variant.sku ? `SKU: ${variant.sku}` : null].filter(Boolean).join(' · ')} · Kho {variant.stock} · {money(variant.price ?? getProductEffectivePrice(props.pendingProduct!, new Date()))}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-600">Chọn một dòng để cố định cả màu và size; bỏ trống để khách chọn khi mua.</span></label>}<div className="mt-3 flex justify-end"><button type="button" disabled={!canAddPending} onClick={props.onAdd} className="rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{pendingComponent ? 'Tăng số lượng' : 'Thêm vào combo'}</button></div></div>}
    </section></div>}
  </section>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>{children}</label>
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4 accent-pink-500" />{label}</label>
}

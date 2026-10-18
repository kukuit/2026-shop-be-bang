'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Eye, EyeOff, Layers, Link2, MoreHorizontal, Package, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import type { Product } from '@/lib/products/types'
import type { ProductCategory } from '@/lib/product-categories/types'
import ProductImageView from '@/components/products/ProductImageView'
import { getProductEffectivePrice, isProductOnSale } from '@/lib/products/pricing'
import ShortLinkManager from '@/components/admin/short-links/ShortLinkManager'
import type { ShortLink } from '@/lib/short-links/types'

type AdminProduct = Product & { categoryName: string }
type Filters = { search: string; categoryId: string; status: string; group: string; sort: string }
const initialFilters: Filters = { search: '', categoryId: '', status: 'all', group: 'all', sort: 'newest' }
const priceText = (price: number) => `${new Intl.NumberFormat('vi-VN').format(price)}đ`
const dateText = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value)) : '—'

export default function ProductList() {
  const [filters, setFilters] = useState(initialFilters)
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [pages, setPages] = useState<(string | null)[]>([null])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState('')
  const [notice, setNotice] = useState('')
  const [previewProduct, setPreviewProduct] = useState<AdminProduct | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState('')
  const [actionMenu, setActionMenu] = useState<{ productId: string; top: number; left: number } | null>(null)
  const [shortLinkProduct, setShortLinkProduct] = useState<AdminProduct | null>(null)
  const [shortLinkByProduct, setShortLinkByProduct] = useState<Record<string, ShortLink | null>>({})
  const [checkingShortLink, setCheckingShortLink] = useState('')
  const now = new Date()

  useEffect(() => {
    if (!previewProduct && !actionMenu) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewProduct(null)
        setActionMenu(null)
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [previewProduct, actionMenu])

  useEffect(() => {
    if (!actionMenu) return
    const closeOnScroll = () => setActionMenu(null)
    window.addEventListener('scroll', closeOnScroll, true)
    return () => window.removeEventListener('scroll', closeOnScroll, true)
  }, [actionMenu])

  useEffect(() => {
    const timeout = setTimeout(() => setFilters(current => current.search === search ? current : { ...current, search }), 300)
    return () => clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    let active = true
    fetch('/api/admin/product-categories?limit=100', { cache: 'no-store' }).then(response => response.json()).then(body => {
      if (active && Array.isArray(body.categories)) setCategories(body.categories)
    }).catch(() => {})
    return () => { active = false }
  }, [])

  const load = useCallback(async (pageCursor: string | null) => {
    setLoading(true); setError('')
    const params = new URLSearchParams({ limit: '20', sort: filters.sort, status: filters.status, group: filters.group })
    if (filters.search) params.set('search', filters.search)
    if (filters.categoryId) params.set('categoryId', filters.categoryId)
    if (pageCursor) params.set('cursor', pageCursor)
    try {
      const response = await fetch(`/api/admin/products?${params}`, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.message ?? 'Không tải được sản phẩm.')
      setProducts(body.products ?? []); setNextCursor(body.nextCursor ?? null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được sản phẩm.') }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { setPages([null]); setCursor(null); void load(null) }, [filters, load])

  const changeFilter = (key: keyof Filters, value: string) => setFilters(current => ({ ...current, [key]: value }))

  const goNext = () => {
    if (!nextCursor) return
    const nextPages = [...pages, nextCursor]
    setPages(nextPages); setCursor(nextCursor); void load(nextCursor)
  }
  const goPrevious = () => {
    if (pages.length <= 1) return
    const nextPages = pages.slice(0, -1)
    const previous = nextPages.at(-1) ?? null
    setPages(nextPages); setCursor(previous); void load(previous)
  }

  const mutate = async (product: AdminProduct, action: 'toggle' | 'delete') => {
    if (action === 'delete' && !window.confirm(`Xóa mềm sản phẩm “${product.name}”? Sản phẩm sẽ ẩn khỏi website.`)) return
    setActionId(product.id); setNotice('')
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        headers: { 'content-type': 'application/json' },
        ...(action === 'toggle' ? { body: JSON.stringify({ isActive: !product.isActive }) } : {}),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.message ?? 'Không cập nhật được sản phẩm.')
      setNotice(action === 'delete' ? 'Đã xóa mềm sản phẩm.' : product.isActive ? 'Đã ngưng bán sản phẩm.' : 'Đã mở bán sản phẩm.')
      await load(cursor)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không cập nhật được sản phẩm.') }
    finally { setActionId('') }
  }

  const showPreview = (product: AdminProduct) => {
    setActionMenu(null)
    setPreviewProduct(product)
    setPreviewImageUrl(product.thumbnail || product.images[0]?.url || '')
  }

  const loadProductShortLink = async (productId: string) => {
    if (Object.prototype.hasOwnProperty.call(shortLinkByProduct, productId)) return
    setCheckingShortLink(productId)
    try {
      const params = new URLSearchParams({ targetType: 'product', targetId: productId, limit: '1' })
      const response = await fetch(`/api/admin/short-links?${params}`, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.message ?? 'Không thể kiểm tra Short Link.')
      setShortLinkByProduct(current => ({ ...current, [productId]: body.links?.[0] ?? null }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể kiểm tra Short Link.')
    } finally {
      setCheckingShortLink(current => current === productId ? '' : current)
    }
  }

  const toggleActionMenu = (event: MouseEvent<HTMLButtonElement>, productId: string) => {
    if (actionMenu?.productId === productId) {
      setActionMenu(null)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const menuWidth = 190
    const menuHeight = 160
    const top = rect.bottom + menuHeight + 8 > window.innerHeight
      ? Math.max(8, rect.top - menuHeight - 8)
      : rect.bottom + 8
    const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8)
    setActionMenu({ productId, top, left })
    void loadProductShortLink(productId)
  }

  const openProductShortLinks = (product: AdminProduct) => {
    setActionMenu(null)
    setShortLinkProduct(product)
  }

  const copyProductShortLink = async (product: AdminProduct) => {
    const link = shortLinkByProduct[product.id]
    if (!link) return openProductShortLinks(product)
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${link.code}`)
      setNotice(`Đã sao chép Short Link /${link.code}.`)
      setError('')
    } catch {
      setError('Không thể sao chép Short Link. Hãy kiểm tra quyền clipboard của trình duyệt.')
    }
    setActionMenu(null)
  }

  const renderActions = (product: AdminProduct, compact = false) => <div className={`flex items-center ${compact ? 'gap-1' : 'gap-2'}`}>
    <button type="button" onClick={() => showPreview(product)} title="Xem trước sản phẩm" aria-label="Xem trước sản phẩm" className={`rounded-lg ${compact ? 'p-2' : 'p-1.5'} text-slate-500 hover:bg-slate-100`}><Eye size={16} /></button>
    <Link href={`/admin/products/${product.id}/edit`} title="Sửa sản phẩm" aria-label="Sửa sản phẩm" className={`rounded-lg ${compact ? 'p-2' : 'p-1.5'} text-blue-600 hover:bg-blue-50`}><Pencil size={16} /></Link>
    <button type="button" onClick={event => toggleActionMenu(event, product.id)} aria-haspopup="menu" aria-expanded={actionMenu?.productId === product.id} aria-label="Thao tác khác" title="Thao tác khác" className={`rounded-lg ${compact ? 'p-2' : 'p-1.5'} text-slate-600 hover:bg-slate-100`}><MoreHorizontal size={18} /></button>
  </div>

  const actionMenuProduct = actionMenu ? products.find(product => product.id === actionMenu.productId) : null
  const previewImages = previewProduct
    ? [
        ...(previewProduct.thumbnail && !previewProduct.images.some(image => image.url === previewProduct.thumbnail)
          ? [{ id: `${previewProduct.id}-thumbnail`, url: previewProduct.thumbnail, publicId: undefined, alt: previewProduct.name, sortOrder: -1 }]
          : []),
        ...previewProduct.images,
      ]
    : []
  const selectedPreviewImage = previewImages.find(image => image.url === previewImageUrl) ?? previewImages[0]

  return <div className="mx-auto max-w-7xl">
    <header className="my-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-xs font-black uppercase tracking-[.18em] text-pink-500">Quản trị hệ thống</p><h2 className="mt-1 text-3xl font-black">Quản lý sản phẩm</h2><p className="mt-1 text-sm text-slate-500">Quản lý quần áo, giá bán và sản phẩm hiển thị trên website.</p></div>
      <div className="flex flex-wrap gap-2"><Link href="/admin/products/new?type=COMBO" className="flex items-center justify-center gap-2 rounded-xl border border-pink-200 bg-white px-4 py-3 text-sm font-bold text-pink-700 shadow-sm hover:bg-pink-50"><Layers size={18} />Tạo combo</Link><Link href="/admin/products/new" className="flex items-center justify-center gap-2 rounded-xl bg-pink-500 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-pink-600"><Plus size={18} />Thêm sản phẩm</Link></div>
    </header>
    {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</p>}
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-5">
        <label className="relative sm:col-span-2 xl:col-span-1"><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} className="input pl-9" placeholder="Tìm tên sản phẩm…" /></label>
        <Select label="Danh mục" value={filters.categoryId} onChange={value => changeFilter('categoryId', value)} options={ [['', 'Tất cả danh mục'], ...categories.map(category => [category.id, category.name] as [string, string])] } />
        <Select label="Trạng thái" value={filters.status} onChange={value => changeFilter('status', value)} options={ [['all', 'Tất cả trạng thái'], ['active', 'Đang bán'], ['hidden', 'Ngưng bán']] } />
        <Select label="Nhóm" value={filters.group} onChange={value => changeFilter('group', value)} options={ [['all', 'Tất cả nhóm'], ['new', 'Mới về'], ['sale', 'Đang sale']] } />
        <Select label="Sắp xếp" value={filters.sort} onChange={value => changeFilter('sort', value)} options={ [['newest', 'Mới tạo'], ['price-asc', 'Giá tăng'], ['price-desc', 'Giá giảm'], ['sort-order', 'Thứ tự hiển thị']] } />
      </div>
      {loading ? <div className="p-10 text-center text-sm text-slate-500">Đang tải sản phẩm…</div> : <>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['Sản phẩm', 'Danh mục', 'Giá', 'Kho', 'Nhóm', 'Trạng thái', 'Ngày tạo', 'Action'].map(label => <th key={label} className="px-4 py-4">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {products.map(product => <tr key={product.id} className="hover:bg-slate-50/70">
                <td className="max-w-[280px] px-4 py-3"><div className="flex items-center gap-3"><span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#fff8f5]"><ProductImageView src={product.thumbnail} alt="" sizes="56px" className="object-cover" /></span><div className="min-w-0"><b className="block truncate">{product.name}</b><span className="block truncate text-xs text-slate-400">/{product.slug}</span></div></div></td>
                <td className="px-4 py-3">{product.categoryName}</td>
                <td className="px-4 py-3"><span className="font-bold text-slate-800">{priceText(getProductEffectivePrice(product, now))}</span>{isProductOnSale(product, now) && <span className="block text-xs text-slate-400 line-through">{priceText(product.price)}</span>}</td>
                <td className="px-4 py-3">{product.stock}</td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{product.isNewArrival && <Badge label="Mới" tone="pink" />}{isProductOnSale(product, now) && <Badge label="Sale" tone="rose" />}{!product.isNewArrival && !isProductOnSale(product, now) && '—'}</div></td>
                <td className="px-4 py-3"><Badge label={product.isActive ? 'Đang bán' : 'Ngưng bán'} tone={product.isActive ? 'green' : 'slate'} /></td>
                <td className="px-4 py-3 text-slate-500">{dateText(product.createdAt)}</td>
                <td className="px-4 py-3">{renderActions(product)}</td>
              </tr>)}
              {!products.length && <tr><td colSpan={8} className="px-5 py-14 text-center text-sm text-slate-500"><Package className="mx-auto mb-2 text-slate-300" />Chưa có sản phẩm phù hợp.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-slate-100 lg:hidden">
          {products.map(product => <article key={product.id} className="flex gap-3 p-3 sm:p-4">
            <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#fff8f5]"><ProductImageView src={product.thumbnail} alt="" sizes="80px" className="object-cover" /></span>
            <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate text-sm font-bold">{product.name}</h3><p className="truncate text-xs text-slate-400">{product.categoryName} · {product.stock} trong kho</p></div><Badge label={product.isActive ? 'Đang bán' : 'Ngưng bán'} tone={product.isActive ? 'green' : 'slate'} /></div>
              <p className="mt-1 font-bold text-slate-800">{priceText(getProductEffectivePrice(product, now))}{isProductOnSale(product, now) && <span className="ml-2 text-xs text-slate-400 line-through">{priceText(product.price)}</span>}</p>
              <div className="mt-2 flex items-center justify-between gap-2"><div className="flex gap-1">{product.isNewArrival && <Badge label="Mới" tone="pink" />}{isProductOnSale(product, now) && <Badge label="Sale" tone="rose" />}</div>{renderActions(product, true)}</div>
            </div>
          </article>)}
          {!products.length && <p className="p-10 text-center text-sm text-slate-500">Chưa có sản phẩm phù hợp.</p>}
        </div>
      </>}
      <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500"><span>Trang {pages.length}</span><div className="flex gap-2"><button disabled={pages.length <= 1 || loading} onClick={goPrevious} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:opacity-40"><ChevronLeft size={16} />Trước</button><button disabled={!nextCursor || loading} onClick={goNext} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:opacity-40">Tiếp<ChevronRight size={16} /></button></div></footer>
    </section>
    {actionMenu && actionMenuProduct && <>
      <button type="button" aria-label="Đóng menu thao tác" className="fixed inset-0 z-[70] cursor-default bg-transparent" onClick={() => setActionMenu(null)} />
      <div role="menu" className="fixed z-[71] min-w-[190px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl" style={{ top: actionMenu.top, left: actionMenu.left }}>
        {checkingShortLink === actionMenuProduct.id && <p className="px-3 py-2 text-xs text-slate-500">Đang kiểm tra Short Link…</p>}
        {checkingShortLink !== actionMenuProduct.id && shortLinkByProduct[actionMenuProduct.id] && <button type="button" role="menuitem" onClick={() => void copyProductShortLink(actionMenuProduct)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"><Link2 size={16} className="text-pink-600" />Copy Short Link</button>}
        {checkingShortLink !== actionMenuProduct.id && !shortLinkByProduct[actionMenuProduct.id] && <button type="button" role="menuitem" onClick={() => openProductShortLinks(actionMenuProduct)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"><Link2 size={16} className="text-pink-600" />Tạo Short Link</button>}
        {checkingShortLink !== actionMenuProduct.id && shortLinkByProduct[actionMenuProduct.id] && <button type="button" role="menuitem" onClick={() => openProductShortLinks(actionMenuProduct)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"><Link2 size={16} className="text-pink-600" />Quản lý Short Links</button>}
        <button type="button" role="menuitem" disabled={actionId === actionMenuProduct.id} onClick={() => { setActionMenu(null); void mutate(actionMenuProduct, 'toggle') }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {actionMenuProduct.isActive ? <EyeOff size={16} className="text-amber-600" /> : <Eye size={16} className="text-amber-600" />}
          {actionMenuProduct.isActive ? 'Ngưng bán' : 'Mở bán'}
        </button>
        <button type="button" role="menuitem" disabled={actionId === actionMenuProduct.id} onClick={() => { setActionMenu(null); void mutate(actionMenuProduct, 'delete') }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 size={16} />Xóa sản phẩm</button>
      </div>
    </>}
    {shortLinkProduct && <ShortLinkManager targetType="product" targetId={shortLinkProduct.id} targetUrl={`/products/${shortLinkProduct.slug}`} title={shortLinkProduct.name} presentation="dialog" onClose={() => setShortLinkProduct(null)} />}
    {previewProduct && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-3 sm:p-6" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setPreviewProduct(null) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="product-preview-title" className="max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
          <div><p className="text-xs font-black uppercase tracking-[.16em] text-pink-500">Xem trước sản phẩm</p><h2 id="product-preview-title" className="mt-1 text-lg font-black text-slate-900">{previewProduct.name}</h2></div>
          <button type="button" onClick={() => setPreviewProduct(null)} aria-label="Đóng xem trước" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
        </header>
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-2">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#fff8f5]">
              <ProductImageView src={selectedPreviewImage?.url ?? previewProduct.thumbnail} publicId={selectedPreviewImage?.publicId} alt={selectedPreviewImage?.alt || previewProduct.name} sizes="(max-width: 1023px) 100vw, 50vw" variant="detail" className="object-contain" />
            </div>
            {previewImages.length > 1 && <div className="mt-3 grid grid-cols-5 gap-2">{previewImages.map(image => <button key={image.id} type="button" onClick={() => setPreviewImageUrl(image.url)} aria-label={`Xem ảnh ${image.alt || previewProduct.name}`} className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-[#fff8f5] ${selectedPreviewImage?.url === image.url ? 'border-pink-500' : 'border-transparent'}`}><ProductImageView src={image.url} publicId={image.publicId} alt="" sizes="100px" variant="thumbnail" className="object-cover" /></button>)}</div>}
          </div>
          <div className="flex flex-col">
            <div className="flex flex-wrap gap-2">
              <Badge label={previewProduct.isActive ? 'Đang bán' : 'Ngưng bán'} tone={previewProduct.isActive ? 'green' : 'slate'} />
              {previewProduct.isNewArrival && <Badge label="Mới về" tone="pink" />}
              {isProductOnSale(previewProduct, now) && <Badge label="Đang sale" tone="rose" />}
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-500">{previewProduct.categoryName}</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{previewProduct.name}</h3>
            {previewProduct.shortDescription && <p className="mt-3 leading-6 text-slate-600">{previewProduct.shortDescription}</p>}
            <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {isProductOnSale(previewProduct, now) && <span className="text-lg text-slate-400 line-through">{priceText(previewProduct.price)}</span>}
              <span className={`text-2xl font-black ${isProductOnSale(previewProduct, now) ? 'text-rose-600' : 'text-slate-900'}`}>{priceText(getProductEffectivePrice(previewProduct, now))}</span>
            </div>
            <p className={`mt-3 text-sm font-semibold ${previewProduct.stock > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>{previewProduct.stock > 0 ? `Còn hàng · ${previewProduct.stock} sản phẩm` : 'Tạm hết hàng'}</p>
            <p className="mt-3 break-all text-xs text-slate-400">/products/{previewProduct.slug}</p>
            {previewProduct.description && <div className="mt-5 border-t border-slate-100 pt-4"><h4 className="font-bold text-slate-800">Thông tin sản phẩm</h4><p className="mt-2 whitespace-pre-line leading-6 text-slate-600">{previewProduct.description}</p></div>}
            <div className="mt-auto pt-6">
              <Link href={`/products/${previewProduct.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-pink-500 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-pink-600">Xem trang chính thức<ExternalLink size={16} /></Link>
            </div>
          </div>
        </div>
      </section>
    </div>}
  </div>
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <label className="block"><span className="sr-only">{label}</span><select value={value} onChange={event => onChange(event.target.value)} className="input">{options.map(([option, name]) => <option key={option} value={option}>{name}</option>)}</select></label>
}
function Badge({ label, tone }: { label: string; tone: 'pink' | 'rose' | 'green' | 'slate' }) {
  const style = { pink: 'bg-pink-50 text-pink-700', rose: 'bg-rose-50 text-rose-700', green: 'bg-emerald-50 text-emerald-700', slate: 'bg-slate-100 text-slate-600' }[tone]
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>{label}</span>
}

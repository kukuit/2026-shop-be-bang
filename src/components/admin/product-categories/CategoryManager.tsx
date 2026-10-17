'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import type { ProductCategory } from '@/lib/product-categories/types'
import { slugify } from '@/lib/products/slug'
import { prepareProductImage } from '@/components/admin/products/image-utils'
import ProductImageView from '@/components/products/ProductImageView'

type CategoryFields = { name: string; slug: string; description: string; imageUrl: string; imageStoragePath: string; parentId: string; isActive: boolean; sortOrder: string }
const blank: CategoryFields = { name: '', slug: '', description: '', imageUrl: '', imageStoragePath: '', parentId: '', isActive: true, sortOrder: '0' }
type AdminCategory = ProductCategory

export default function CategoryManager() {
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [pages, setPages] = useState<(string | null)[]>([null])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminCategory | null>(null)
  const [fields, setFields] = useState<CategoryFields>(blank)
  const [slugEdited, setSlugEdited] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [imageError, setImageError] = useState('')
  const [imageBusy, setImageBusy] = useState(false)
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null)
  const [seedingDefaults, setSeedingDefaults] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(query.trim()), 250)
    return () => clearTimeout(timeout)
  }, [query])

  const load = useCallback(async (pageCursor: string | null) => {
    setLoading(true); setError('')
    const params = new URLSearchParams({ limit: '50' })
    if (search) params.set('search', search)
    if (pageCursor) params.set('cursor', pageCursor)
    try {
      const response = await fetch(`/api/admin/product-categories?${params}`, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.message ?? 'Không tải được danh mục.')
      setCategories(body.categories ?? []); setNextCursor(body.nextCursor ?? null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được danh mục.') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { setCursor(null); setPages([null]); void load(null) }, [load])

  const clearImagePreview = () => { if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview); setImagePreview('') }
  const openCreate = () => {
    setEditing(null); setSavingCategoryId(null); setFields({ ...blank, sortOrder: String(categories.length) }); setSlugEdited(false)
    setImageFile(null); clearImagePreview(); setImageError(''); setError(''); setFormOpen(true)
  }
  const openEdit = (category: AdminCategory) => {
    setEditing(category); setSavingCategoryId(category.id); setSlugEdited(true)
    setFields({ name: category.name, slug: category.slug, description: category.description, imageUrl: category.imageUrl, imageStoragePath: category.imageStoragePath ?? '', parentId: category.parentId ?? '', isActive: category.isActive, sortOrder: String(category.sortOrder) })
    setImageFile(null); clearImagePreview(); setImageError(''); setError(''); setFormOpen(true)
  }
  const change = <K extends keyof CategoryFields>(key: K, value: CategoryFields[K]) => setFields(current => ({ ...current, [key]: value }))

  const chooseImage = async (file?: File) => {
    if (!file) return
    setImageError(''); setImageBusy(true)
    try {
      const prepared = await prepareProductImage(file)
      clearImagePreview()
      setImageFile(prepared)
      setImagePreview(URL.createObjectURL(prepared))
    } catch (cause) { setImageError(cause instanceof Error ? cause.message : 'Ảnh không hợp lệ.') }
    finally { setImageBusy(false) }
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    const sortOrder = Number(fields.sortOrder)
    if (!fields.name.trim() || !fields.slug.trim() || !Number.isSafeInteger(sortOrder) || sortOrder < 0) {
      setBusy(false); setError('Hãy nhập tên, slug và thứ tự hợp lệ.'); return
    }
    const id = savingCategoryId ?? crypto.randomUUID()
    const oldStoragePath = editing?.imageStoragePath ?? ''
    const body = { name: fields.name.trim(), slug: fields.slug.trim(), description: fields.description, imageUrl: fields.imageUrl, imageStoragePath: fields.imageStoragePath || null, parentId: fields.parentId || null, isActive: fields.isActive, sortOrder }
    try {
      const isSaved = Boolean(savingCategoryId)
      const response = await fetch(isSaved ? `/api/admin/product-categories/${id}` : '/api/admin/product-categories', {
        method: isSaved ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(isSaved ? body : { ...body, id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message ?? 'Không lưu được danh mục.')
      setSavingCategoryId(id)
      setEditing(result.category)

      let savedStoragePath = body.imageStoragePath ?? ''
      if (imageFile) {
        const form = new FormData()
        form.set('ownerType', 'category'); form.set('ownerId', id); form.set('imageId', crypto.randomUUID()); form.set('file', imageFile)
        const upload = await fetch('/api/admin/product-images', { method: 'POST', body: form })
        const uploaded = await upload.json()
        if (!upload.ok) throw new Error(uploaded.message ?? 'Chưa tải được ảnh danh mục.')
        const update = await fetch(`/api/admin/product-categories/${id}`, {
          method: 'PATCH', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...body, imageUrl: uploaded.image.url, imageStoragePath: uploaded.image.storagePath }),
        })
        const updated = await update.json()
        if (!update.ok) throw new Error(updated.message ?? 'Chưa gắn được ảnh vào danh mục.')
        setFields(current => ({ ...current, imageUrl: uploaded.image.url, imageStoragePath: uploaded.image.storagePath }))
        setEditing(updated.category)
        savedStoragePath = uploaded.image.storagePath
        setImageFile(null); clearImagePreview()
      }
      if (oldStoragePath && oldStoragePath !== savedStoragePath) {
        const remove = await fetch('/api/admin/product-images', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ storagePath: oldStoragePath }) })
        if (!remove.ok && remove.status !== 409) setNotice('Đã lưu danh mục; chưa dọn được ảnh cũ trong Storage.')
      }
      setNotice(imageFile ? 'Đã lưu danh mục và ảnh.' : 'Đã lưu danh mục.')
      setFormOpen(false); await load(cursor)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không lưu được danh mục.') }
    finally { setBusy(false) }
  }

  const mutate = async (category: AdminCategory, action: 'toggle' | 'delete' | 'up' | 'down') => {
    if (action === 'delete' && !window.confirm(`Xóa danh mục “${category.name}”?`)) return
    setError(''); setNotice('')
    try {
      let response: Response
      if (action === 'delete') response = await fetch(`/api/admin/product-categories/${category.id}`, { method: 'DELETE' })
      else if (action === 'up' || action === 'down') {
        const ordered = [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
        const index = ordered.findIndex(item => item.id === category.id)
        const neighbor = ordered[index + (action === 'up' ? -1 : 1)]
        if (!neighbor) return
        const updateOrder = (item: AdminCategory, sortOrder: number) => fetch(`/api/admin/product-categories/${item.id}`, {
          method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sortOrder }),
        })
        const [first, second] = await Promise.all([updateOrder(category, neighbor.sortOrder), updateOrder(neighbor, category.sortOrder)])
        const failed = !first.ok ? first : !second.ok ? second : null
        if (failed) {
          const result = await failed.json()
          throw new Error(result.message ?? 'Không cập nhật được thứ tự danh mục.')
        }
        setNotice('Đã cập nhật thứ tự hiển thị.')
        await load(cursor)
        return
      }
      else {
        response = await fetch(`/api/admin/product-categories/${category.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ isActive: !category.isActive }) })
      }
      const body = await response.json()
      if (!response.ok) throw new Error(body.message ?? 'Không cập nhật được danh mục.')
      setNotice(action === 'delete' ? 'Đã xóa danh mục.' : action === 'toggle' ? 'Đã cập nhật trạng thái danh mục.' : 'Đã cập nhật thứ tự hiển thị.')
      await load(cursor)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không cập nhật được danh mục.') }
  }

  const goNext = () => { if (!nextCursor) return; setCursor(nextCursor); setPages(current => [...current, nextCursor]); void load(nextCursor) }
  const goPrevious = () => { if (pages.length <= 1) return; const next = pages.slice(0, -1); const previous = next.at(-1) ?? null; setPages(next); setCursor(previous); void load(previous) }

  const seedDefaults = async () => {
    setSeedingDefaults(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/admin/product-categories/defaults', { method: 'POST' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.message ?? 'Không tạo được danh mục mặc định.')
      setNotice('Đã tạo các danh mục mặc định còn thiếu.')
      await load(null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tạo được danh mục mặc định.') }
    finally { setSeedingDefaults(false) }
  }

  return <div className="mx-auto max-w-7xl">
    <header className="my-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[.18em] text-pink-500">Quản trị hệ thống</p><h2 className="mt-1 text-3xl font-black">Danh mục sản phẩm</h2><p className="mt-1 text-sm text-slate-500">Tổ chức sản phẩm theo danh mục cha và danh mục con.</p></div><div className="flex flex-wrap gap-2">{!loading && categories.length === 0 && <button disabled={seedingDefaults} onClick={() => void seedDefaults()} className="rounded-xl border border-pink-200 bg-white px-4 py-3 text-sm font-bold text-pink-700 disabled:opacity-50">{seedingDefaults ? 'Đang tạo…' : 'Tạo danh mục mặc định'}</button>}<button onClick={openCreate} className="flex items-center justify-center gap-2 rounded-xl bg-pink-500 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-pink-600"><Plus size={18} />Thêm danh mục</button></div></header>
    {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</p>}{error && !formOpen && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4"><label className="relative block max-w-lg"><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} className="input pl-9" placeholder="Tìm theo tên danh mục…" /></label></div>
      {loading ? <p className="p-10 text-center text-sm text-slate-500">Đang tải danh mục…</p> : <>
        <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['Tên', 'Slug', 'Danh mục cha', 'Số sản phẩm', 'Trạng thái', 'Action'].map(label => <th key={label} className="px-5 py-4">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{categories.map(category => <tr key={category.id} className="hover:bg-slate-50/70"><td className="px-5 py-4 font-bold">{category.parentId && <span className="mr-2 text-slate-300">↳</span>}{category.name}</td><td className="px-5 py-4 text-slate-500">/{category.slug}</td><td className="px-5 py-4">{categories.find(parent => parent.id === category.parentId)?.name ?? '—'}</td><td className="px-5 py-4">{category.productCount}</td><td className="px-5 py-4"><Badge active={category.isActive} /></td><td className="px-5 py-4"><div className="flex items-center gap-2"><button title="Lên" onClick={() => void mutate(category, 'up')} className="rounded-lg p-1.5 hover:bg-slate-100"><ArrowUp size={15} /></button><button title="Xuống" onClick={() => void mutate(category, 'down')} className="rounded-lg p-1.5 hover:bg-slate-100"><ArrowDown size={15} /></button><button title="Sửa" onClick={() => openEdit(category)} className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50"><Pencil size={16} /></button><button title={category.isActive ? 'Ẩn' : 'Hiện'} onClick={() => void mutate(category, 'toggle')} className="rounded-lg px-2 py-1 text-xs font-bold text-amber-700 hover:bg-amber-50">{category.isActive ? 'Ẩn' : 'Hiện'}</button><button title="Xóa" onClick={() => void mutate(category, 'delete')} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></button></div></td></tr>)}{!categories.length && <tr><td colSpan={6} className="px-5 py-14 text-center text-sm text-slate-500">Chưa có danh mục phù hợp.</td></tr>}</tbody></table></div>
        <div className="divide-y divide-slate-100 lg:hidden">{categories.map(category => <article key={category.id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-bold">{category.parentId && <span className="mr-1 text-slate-300">↳</span>}{category.name}</h3><p className="truncate text-xs text-slate-400">/{category.slug}</p></div><Badge active={category.isActive} /></div><p className="mt-2 text-xs text-slate-500">Cha: {categories.find(parent => parent.id === category.parentId)?.name ?? '—'} · {category.productCount} sản phẩm</p><div className="mt-3 flex justify-end gap-1"><button onClick={() => void mutate(category, 'up')} aria-label="Lên" className="rounded-lg p-2 hover:bg-slate-100"><ArrowUp size={16} /></button><button onClick={() => void mutate(category, 'down')} aria-label="Xuống" className="rounded-lg p-2 hover:bg-slate-100"><ArrowDown size={16} /></button><button onClick={() => openEdit(category)} aria-label="Sửa" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><Pencil size={16} /></button><button onClick={() => void mutate(category, 'toggle')} className="rounded-lg px-2 text-xs font-bold text-amber-700 hover:bg-amber-50">{category.isActive ? 'Ẩn' : 'Hiện'}</button><button onClick={() => void mutate(category, 'delete')} aria-label="Xóa" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></button></div></article>)}{!categories.length && <p className="p-10 text-center text-sm text-slate-500">Chưa có danh mục phù hợp.</p>}</div>
      </>}
      <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500"><span>Trang {pages.length}</span><div className="flex gap-2"><button disabled={pages.length <= 1 || loading} onClick={goPrevious} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:opacity-40">Trước</button><button disabled={!nextCursor || loading} onClick={goNext} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:opacity-40">Tiếp</button></div></footer>
    </section>
    {formOpen && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-3" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setFormOpen(false) }}><section role="dialog" aria-modal="true" aria-labelledby="category-form-title" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7"><header className="flex items-center justify-between"><h3 id="category-form-title" className="text-xl font-black">{editing ? 'Sửa danh mục' : 'Thêm danh mục'}</h3><button disabled={busy} onClick={() => setFormOpen(false)} aria-label="Đóng" className="rounded-lg p-2 hover:bg-slate-100"><X /></button></header>
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <form onSubmit={event => void save(event)} className="mt-5 space-y-4">
        <Field label="Tên danh mục *"><input required maxLength={100} value={fields.name} onChange={event => { const name = event.target.value; change('name', name); if (!slugEdited) change('slug', slugify(name)) }} className="input" /></Field>
        <Field label="Slug *"><input required maxLength={140} value={fields.slug} onChange={event => { setSlugEdited(true); change('slug', slugify(event.target.value)) }} className="input" /></Field>
        <Field label="Mô tả"><textarea maxLength={2000} rows={3} value={fields.description} onChange={event => change('description', event.target.value)} className="input resize-y" /></Field>
        <Field label="Danh mục cha"><select value={fields.parentId} onChange={event => change('parentId', event.target.value)} className="input"><option value="">Không có</option>{categories.filter(category => category.id !== editing?.id).map(category => <option key={category.id} value={category.id}>{category.parentId ? '↳ ' : ''}{category.name}</option>)}</select></Field>
        <div><span className="mb-1.5 block text-sm font-bold text-slate-700">Ảnh danh mục (không bắt buộc)</span><div className="flex flex-wrap items-center gap-3"><div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-pink-50 text-pink-300">{imagePreview || fields.imageUrl ? <ProductImageView src={imagePreview || fields.imageUrl} alt="" sizes="80px" className="object-cover" /> : <ImagePlus />}</div><label className="cursor-pointer rounded-xl border border-pink-200 bg-pink-50 px-4 py-2 text-sm font-bold text-pink-700">{imageBusy ? 'Đang xử lý…' : 'Chọn ảnh'}<input hidden type="file" accept="image/jpeg,image/png,image/webp" disabled={imageBusy} onChange={event => void chooseImage(event.target.files?.[0])} /></label><input value={fields.imageUrl} onChange={event => { setImageFile(null); clearImagePreview(); change('imageUrl', event.target.value); change('imageStoragePath', '') }} className="input min-w-0 flex-1" placeholder="Hoặc nhập URL ảnh" /><button type="button" onClick={() => { setImageFile(null); clearImagePreview(); change('imageUrl', ''); change('imageStoragePath', '') }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Xóa ảnh</button></div>{imageError && <p role="alert" className="mt-2 text-sm text-rose-600">{imageError}</p>}</div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Thứ tự"><input required type="number" min="0" step="1" value={fields.sortOrder} onChange={event => change('sortOrder', event.target.value)} className="input" /></Field><label className="flex items-center gap-2 pt-7 text-sm font-semibold"><input type="checkbox" checked={fields.isActive} onChange={event => change('isActive', event.target.checked)} className="h-4 w-4 accent-pink-500" />Đang hiển thị</label></div>
        <div className="flex justify-end gap-3 pt-2"><button type="button" disabled={busy} onClick={() => setFormOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold">Hủy</button><button disabled={busy} className="rounded-xl bg-pink-500 px-5 py-2.5 font-bold text-white disabled:opacity-50">{busy ? 'Đang lưu…' : 'Lưu danh mục'}</button></div>
      </form></section></div>}
  </div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>{children}</label> }
function Badge({ active }: { active: boolean }) { return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{active ? 'Đang hiển thị' : 'Đang ẩn'}</span> }

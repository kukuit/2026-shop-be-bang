'use client'

import { useCallback, useEffect, useState } from 'react'
import { Ban, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Pencil, Plus, RotateCcw, Search, X } from 'lucide-react'
import type { ShortLink, ShortLinkMode, ShortLinkRedirectType, ShortLinkStatus, ShortLinkTargetType } from '@/lib/short-links/types'

type ResponseBody = { links?: ShortLink[]; nextCursor?: string | null; message?: string; link?: ShortLink; code?: string }
type Filters = { search: string; targetType: string; status: string; targetId: string }
const initialFilters: Filters = { search: '', targetType: '', status: '', targetId: '' }
const typeLabels: Record<ShortLinkTargetType, string> = { product: 'Sản phẩm', article: 'Bài viết', category: 'Danh mục', game: 'Game', custom: 'Custom' }
const dateText = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value)) : '—'
const shortUrl = (code: string) => `${window.location.origin}/${code}`

async function readBody(response: Response): Promise<ResponseBody> {
  const body = await response.json() as ResponseBody
  if (!response.ok) throw new Error(body.message || 'Không thể tải Short Link.')
  return body
}

export default function ShortLinkList() {
  const [filters, setFilters] = useState(initialFilters)
  const [search, setSearch] = useState('')
  const [links, setLinks] = useState<ShortLink[]>([])
  const [page, setPage] = useState(0)
  const [cursors, setCursors] = useState<(string | null)[]>([null])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<ShortLink | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editTargetUrl, setEditTargetUrl] = useState('')
  const [editStatus, setEditStatus] = useState<ShortLinkStatus>('ACTIVE')
  const [editRedirectType, setEditRedirectType] = useState<ShortLinkRedirectType>(302)
  const [saving, setSaving] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createType, setCreateType] = useState<ShortLinkTargetType>('custom')
  const [createTargetId, setCreateTargetId] = useState('')
  const [createTargetUrl, setCreateTargetUrl] = useState('')
  const [createTitle, setCreateTitle] = useState('')
  const [createMode, setCreateMode] = useState<ShortLinkMode>('auto')
  const [createCode, setCreateCode] = useState('')

  const createNeedsId = createType === 'product' || createType === 'category'
  const createInputValid = createNeedsId ? Boolean(createTargetId.trim()) : Boolean(createTargetUrl.trim())
  const createCodeValid = createMode === 'auto' || /^[a-z0-9]{4,32}$/.test(createCode)

  useEffect(() => {
    const timeout = window.setTimeout(() => setFilters(current => current.search === search ? current : { ...current, search }), 300)
    return () => window.clearTimeout(timeout)
  }, [search])

  const load = useCallback(async (cursor: string | null) => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ limit: '20' })
    if (filters.search) params.set('search', filters.search)
    if (filters.targetType) params.set('targetType', filters.targetType)
    if (filters.status) params.set('status', filters.status)
    if (filters.targetId) params.set('targetId', filters.targetId.trim())
    if (cursor) params.set('cursor', cursor)
    try {
      const body = await readBody(await fetch(`/api/admin/short-links?${params}`, { cache: 'no-store' }))
      setLinks(body.links ?? [])
      setNextCursor(body.nextCursor ?? null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải Short Link.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    setPage(0)
    setCursors([null])
    void load(null)
  }, [filters, load])

  const changeFilter = (key: keyof Filters, value: string) => setFilters(current => ({ ...current, [key]: value }))
  const nextPage = () => {
    if (!nextCursor) return
    const cursorStack = [...cursors.slice(0, page + 1), nextCursor]
    setCursors(cursorStack)
    setPage(page + 1)
    void load(nextCursor)
  }
  const previousPage = () => {
    if (page <= 0) return
    const previous = cursors[page - 1] ?? null
    setPage(page - 1)
    void load(previous)
  }

  const copy = async (link: ShortLink) => {
    try {
      await navigator.clipboard.writeText(shortUrl(link.code))
      setNotice(`Đã sao chép /${link.code}.`)
      setError('')
    } catch {
      setError('Không thể sao chép liên kết. Hãy kiểm tra quyền clipboard của trình duyệt.')
    }
  }

  const update = async (link: ShortLink, changes: Record<string, unknown>, successMessage: string) => {
    setError('')
    setNotice('')
    try {
      await readBody(await fetch(`/api/admin/short-links/${encodeURIComponent(link.code)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes),
      }))
      setNotice(successMessage)
      await load(cursors[page] ?? null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật Short Link.')
    }
  }

  const openEdit = (link: ShortLink) => {
    setEditing(link)
    setEditTitle(link.title)
    setEditTargetUrl(link.targetUrl)
    setEditStatus(link.status)
    setEditRedirectType(link.redirectType)
  }

  const createLink = async () => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/short-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: createType,
          ...(createNeedsId ? { targetId: createTargetId.trim() } : { targetUrl: createTargetUrl.trim() }),
          mode: createMode,
          ...(createMode === 'manual' ? { customCode: createCode } : {}),
          title: createTitle,
        }),
      })
      const body = await readBody(response)
      setCreateOpen(false)
      setCreateTitle('')
      setCreateTargetId('')
      setCreateTargetUrl('')
      setCreateCode('')
      setCreateMode('auto')
      setNotice(`Đã tạo Short Link /${body.code}.`)
      await load(null)
      if (body.code) {
        try { await navigator.clipboard.writeText(shortUrl(body.code)); setNotice(`Đã tạo và sao chép Short Link /${body.code}.`) } catch { /* Clipboard can be unavailable in some browser contexts. */ }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tạo Short Link.')
    } finally {
      setSaving(false)
    }
  }

  const saveEdit = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await update(editing, {
        title: editTitle,
        ...(editing.targetType === 'custom' ? { targetUrl: editTargetUrl } : {}),
        status: editStatus,
        redirectType: editRedirectType,
      }, 'Đã cập nhật Short Link.')
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  return <div className="mx-auto max-w-7xl px-1">
    <header className="my-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-pink-500">Quản trị hệ thống</p><h1 className="mt-1 text-3xl font-black">Short Link Manager</h1><p className="mt-1 text-sm text-slate-500">Quản lý liên kết ngắn, đích chuyển hướng và lượt click.</p></div><button type="button" onClick={() => { setCreateOpen(true); setError('') }} className="inline-flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-pink-600"><Plus size={17} />Tạo Short Link</button></header>
    {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</p>}
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
    {createOpen && <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/55 p-3 sm:p-6" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setCreateOpen(false) }}><section role="dialog" aria-modal="true" aria-labelledby="create-short-link-title" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
      <header className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.15em] text-pink-500">Short Link</p><h2 id="create-short-link-title" className="mt-1 text-xl font-black text-slate-900">Tạo Short Link</h2></div><button type="button" disabled={saving} onClick={() => setCreateOpen(false)} aria-label="Đóng" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={20} /></button></header>
      <div className="mt-5 space-y-4">
        <Field label="Loại đích"><select value={createType} onChange={event => setCreateType(event.target.value as ShortLinkTargetType)} className="input">{Object.entries(typeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select></Field>
        {createNeedsId ? <Field label={createType === 'product' ? 'ID sản phẩm' : 'ID danh mục'}><input value={createTargetId} onChange={event => setCreateTargetId(event.target.value)} maxLength={180} className="input" placeholder={createType === 'product' ? 'Nhập ID sản phẩm đã lưu' : 'Nhập ID danh mục đang hiển thị'} /><span className="mt-1 block text-xs text-slate-500">Hệ thống tự lấy URL hiện tại theo ID; sản phẩm và danh mục phải đang hiển thị công khai.</span></Field> : <Field label="URL đích"><input value={createTargetUrl} onChange={event => setCreateTargetUrl(event.target.value)} maxLength={2048} className="input" placeholder="/duong-dan-noi-bo hoặc https://example.com" /></Field>}
        <Field label="Tiêu đề"><input value={createTitle} onChange={event => setCreateTitle(event.target.value)} maxLength={160} className="input" placeholder="Tên gợi nhớ cho liên kết" /></Field>
        <fieldset><legend className="mb-2 text-sm font-bold text-slate-700">Kiểu tạo</legend><div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setCreateMode('auto')} aria-pressed={createMode === 'auto'} className={`rounded-xl border p-3 text-left ${createMode === 'auto' ? 'border-pink-300 bg-pink-50 ring-1 ring-pink-200' : 'border-slate-200 hover:bg-slate-50'}`}><span className="block text-sm font-bold text-slate-800">Tự động</span><span className="mt-1 block text-xs text-slate-500">Mã 6 ký tự chữ thường và số.</span></button><button type="button" onClick={() => setCreateMode('manual')} aria-pressed={createMode === 'manual'} className={`rounded-xl border p-3 text-left ${createMode === 'manual' ? 'border-pink-300 bg-pink-50 ring-1 ring-pink-200' : 'border-slate-200 hover:bg-slate-50'}`}><span className="block text-sm font-bold text-slate-800">Tùy chỉnh</span><span className="mt-1 block text-xs text-slate-500">Mã dễ nhớ, dài 4–32 ký tự.</span></button></div></fieldset>
        {createMode === 'manual' && <Field label="Mã tùy chỉnh"><div className="flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-pink-400"><span className="flex items-center bg-slate-50 px-3 text-sm text-slate-500">{typeof window === 'undefined' ? 'shopbebang.com/' : `${window.location.host}/`}</span><input value={createCode} onChange={event => setCreateCode(event.target.value)} maxLength={32} autoCapitalize="none" autoCorrect="off" className="min-w-0 flex-1 px-3 py-2.5 text-sm outline-none" placeholder="sale26" /></div>{createCode && !createCodeValid && <span className="mt-1 block text-xs font-semibold text-rose-600">Chỉ dùng chữ thường và số, từ 4 đến 32 ký tự.</span>}</Field>}
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={saving} onClick={() => setCreateOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Hủy</button><button type="button" disabled={saving || !createInputValid || !createCodeValid || (createMode === 'manual' && !createCode)} onClick={() => void createLink()} className="inline-flex items-center gap-2 rounded-xl bg-pink-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-600 disabled:opacity-50">{saving ? 'Đang tạo…' : <><Plus size={16} />Tạo Short Link</>}</button></div>
      </div>
    </section></div>}
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="relative sm:col-span-2 xl:col-span-1"><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} className="input pl-9" placeholder="Tìm theo mã hoặc tiêu đề" /></label>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">Loại</span><select value={filters.targetType} onChange={event => changeFilter('targetType', event.target.value)} className="input"><option value="">Tất cả loại</option>{Object.entries(typeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select></label>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">Trạng thái</span><select value={filters.status} onChange={event => changeFilter('status', event.target.value)} className="input"><option value="">Tất cả trạng thái</option><option value="ACTIVE">Đang hoạt động</option><option value="DISABLED">Đã tắt</option></select></label>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">Mã đối tượng đích</span><input value={filters.targetId} onChange={event => changeFilter('targetId', event.target.value)} className="input" placeholder="Lọc theo targetId" /></label>
      </div>
      {loading ? <div className="p-10 text-center text-sm text-slate-500">Đang tải Short Links…</div> : <>
        <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['Short Link', 'Tiêu đề', 'Loại', 'URL đích', 'Lượt click', 'Trạng thái', 'Ngày tạo', 'Thao tác'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{links.map(link => <tr key={link.code} className="hover:bg-slate-50/70">
            <td className="px-4 py-3"><a href={shortUrl(link.code)} target="_blank" rel="noreferrer" className="font-bold text-pink-700 underline">/{link.code}</a></td>
            <td className="max-w-48 truncate px-4 py-3">{link.title || '—'}</td>
            <td className="px-4 py-3">{typeLabels[link.targetType]}{link.targetId ? <span className="block max-w-36 truncate text-xs text-slate-400">{link.targetId}</span> : null}</td>
            <td className="max-w-56 truncate px-4 py-3 text-slate-500" title={link.resolvedTargetUrl || link.targetUrl}>{link.resolvedTargetUrl || link.targetUrl}</td>
            <td className="px-4 py-3">{link.clickCount === null ? 'Chưa có thống kê' : link.clickCount}</td>
            <td className="px-4 py-3"><StatusBadge status={link.status} /></td>
            <td className="px-4 py-3 text-slate-500">{dateText(link.createdAt)}</td>
            <td className="px-4 py-3"><Actions link={link} onCopy={() => void copy(link)} onEdit={() => openEdit(link)} onToggle={() => void update(link, { status: link.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' }, link.status === 'ACTIVE' ? 'Đã vô hiệu hóa Short Link.' : 'Đã bật lại Short Link.')} /></td>
          </tr>)}{!links.length && <tr><td colSpan={8} className="px-5 py-14 text-center text-sm text-slate-500">Không có Short Link phù hợp.</td></tr>}</tbody>
        </table></div>
        <div className="divide-y divide-slate-100 lg:hidden">{links.map(link => <article key={link.code} className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><a href={shortUrl(link.code)} target="_blank" rel="noreferrer" className="font-bold text-pink-700 underline">/{link.code}</a><p className="mt-1 truncate text-sm font-semibold text-slate-800">{link.title || 'Không có tiêu đề'}</p></div><StatusBadge status={link.status} /></div>
          <p className="text-xs text-slate-500">{typeLabels[link.targetType]}{link.targetId ? ` · ${link.targetId}` : ''} · {link.clickCount === null ? 'Chưa có thống kê' : `${link.clickCount} lượt click`} · {dateText(link.createdAt)}</p>
          <p className="break-all text-xs text-slate-500">Đích: {link.resolvedTargetUrl || link.targetUrl}</p>
          <Actions link={link} onCopy={() => void copy(link)} onEdit={() => openEdit(link)} onToggle={() => void update(link, { status: link.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' }, link.status === 'ACTIVE' ? 'Đã vô hiệu hóa Short Link.' : 'Đã bật lại Short Link.')} />
        </article>)}{!links.length && <p className="p-10 text-center text-sm text-slate-500">Không có Short Link phù hợp.</p>}</div>
      </>}
      <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500"><span>Trang {page + 1}</span><div className="flex gap-2"><button type="button" disabled={page === 0 || loading} onClick={previousPage} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:opacity-40"><ChevronLeft size={16} />Trước</button><button type="button" disabled={!nextCursor || loading} onClick={nextPage} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:opacity-40">Tiếp<ChevronRight size={16} /></button></div></footer>
    </section>

    {editing && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-3 sm:p-6" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setEditing(null) }}><section role="dialog" aria-modal="true" aria-labelledby="edit-short-link-title" className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
      <header className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-pink-500">/{editing.code}</p><h2 id="edit-short-link-title" className="mt-1 text-xl font-black">Chỉnh sửa Short Link</h2></div><button type="button" onClick={() => setEditing(null)} aria-label="Đóng" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></header>
      <div className="mt-5 space-y-4"><Field label="Tiêu đề"><input value={editTitle} onChange={event => setEditTitle(event.target.value)} maxLength={160} className="input" /></Field>
        <Field label="URL đích"><input value={editTargetUrl} onChange={event => setEditTargetUrl(event.target.value)} readOnly={editing.targetType !== 'custom'} className="input read-only:bg-slate-50 read-only:text-slate-500" /></Field>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Trạng thái"><select value={editStatus} onChange={event => setEditStatus(event.target.value as ShortLinkStatus)} className="input"><option value="ACTIVE">Đang hoạt động</option><option value="DISABLED">Đã tắt</option></select></Field><Field label="Kiểu chuyển hướng"><select value={editRedirectType} onChange={event => setEditRedirectType(Number(event.target.value) as ShortLinkRedirectType)} className="input"><option value={302}>302 · Tạm thời</option><option value={301}>301 · Vĩnh viễn</option></select></Field></div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={saving} onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Hủy</button><button type="button" disabled={saving} onClick={() => void saveEdit()} className="rounded-xl bg-pink-500 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button></div>
      </div>
    </section></div>}
  </div>
}

function Actions({ link, onCopy, onEdit, onToggle }: { link: ShortLink; onCopy: () => void; onEdit: () => void; onToggle: () => void }) {
  return <div className="flex flex-wrap items-center gap-1">
    <button type="button" onClick={onCopy} title="Sao chép" aria-label={`Sao chép /${link.code}`} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Copy size={16} /></button>
    <a href={shortUrl(link.code)} target="_blank" rel="noreferrer" title="Mở Short Link" aria-label={`Mở /${link.code}`} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><ExternalLink size={16} /></a>
    <a href={link.resolvedTargetUrl || link.targetUrl} target="_blank" rel="noreferrer" title="Mở URL đích" aria-label={`Mở đích của /${link.code}`} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><ExternalLink size={16} className="text-pink-600" /></a>
    <button type="button" onClick={onEdit} title="Chỉnh sửa" aria-label={`Chỉnh sửa /${link.code}`} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Pencil size={16} /></button>
    <button type="button" onClick={onToggle} title={link.status === 'ACTIVE' ? 'Vô hiệu hóa' : 'Bật lại'} aria-label={link.status === 'ACTIVE' ? 'Vô hiệu hóa' : 'Bật lại'} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">{link.status === 'ACTIVE' ? <Ban size={16} /> : <RotateCcw size={16} />}</button>
  </div>
}

function StatusBadge({ status }: { status: ShortLinkStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã tắt'}</span>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>{children}</label>
}

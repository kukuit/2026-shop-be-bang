'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Ban, Check, Copy, ExternalLink, Link2, LoaderCircle, Plus, RotateCcw, X } from 'lucide-react'
import type { ShortLink, ShortLinkMode, ShortLinkTargetType } from '@/lib/short-links/types'
import { isValidShortCodeFormat, isReservedShortCode } from '@/lib/short-links/code-format'

type ShortLinkManagerProps = {
  targetType: ShortLinkTargetType
  targetId?: string
  targetUrl?: string
  title?: string
  presentation?: 'section' | 'dialog'
  onClose?: () => void
}

type ApiBody = { link?: ShortLink; links?: ShortLink[]; nextCursor?: string | null; code?: string; message?: string }

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value))
  : '—'

function shortUrl(code: string) {
  return typeof window === 'undefined' ? `/${code}` : `${window.location.origin}/${code}`
}

async function readBody(response: Response): Promise<ApiBody> {
  const body = await response.json() as ApiBody
  if (!response.ok) throw new Error(body.message || 'Không thể thực hiện thao tác với Short Link.')
  return body
}

export default function ShortLinkManager({ targetType, targetId, targetUrl, title = '', presentation = 'section', onClose }: ShortLinkManagerProps) {
  const [links, setLinks] = useState<ShortLink[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [mode, setMode] = useState<ShortLinkMode>('auto')
  const [customCode, setCustomCode] = useState('')
  const [draftTitle, setDraftTitle] = useState(title)
  const [draftTargetUrl, setDraftTargetUrl] = useState(targetUrl ?? '')
  const [copiedCode, setCopiedCode] = useState('')

  const canCreate = Boolean(targetId || (targetUrl && targetType !== 'product' && targetType !== 'category'))
  const codeError = mode === 'manual' && customCode
    ? !isValidShortCodeFormat(customCode) ? 'Mã cần có 4–32 ký tự thường hoặc số.' : isReservedShortCode(customCode) ? 'Mã này trùng với một đường dẫn có sẵn.' : ''
    : ''
  const effectiveTargetUrl = targetUrl || draftTargetUrl
  const previewUrl = useMemo(() => mode === 'manual' && isValidShortCodeFormat(customCode) && !isReservedShortCode(customCode)
    ? shortUrl(customCode)
    : '', [customCode, mode])

  const loadLinks = useCallback(async (cursor?: string | null, append = false) => {
    if (!targetId) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ targetType, targetId, limit: '50' })
      if (cursor) params.set('cursor', cursor)
      const body = await readBody(await fetch(`/api/admin/short-links?${params.toString()}`, { cache: 'no-store' }))
      setLinks(current => append ? [...current, ...(body.links ?? [])] : body.links ?? [])
      setNextCursor(body.nextCursor ?? null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải Short Link.')
    } finally {
      setLoading(false)
    }
  }, [targetId, targetType])

  useEffect(() => { void loadLinks() }, [loadLinks])

  const copyLink = async (code: string) => {
    try {
      await navigator.clipboard.writeText(shortUrl(code))
      setCopiedCode(code)
      setNotice('Đã sao chép Short Link.')
      window.setTimeout(() => setCopiedCode(current => current === code ? '' : current), 1800)
    } catch {
      setError('Không thể sao chép liên kết. Hãy kiểm tra quyền clipboard của trình duyệt.')
    }
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
          targetType,
          targetId,
          targetUrl: effectiveTargetUrl,
          mode,
          ...(mode === 'manual' ? { customCode } : {}),
          title: draftTitle,
        }),
      })
      const body = await readBody(response)
      setCreateOpen(false)
      setMode('auto')
      setCustomCode('')
      setNotice(`Đã tạo Short Link ${body.code ? `/${body.code}` : ''}.`)
      await loadLinks()
      if (body.code) await copyLink(body.code)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tạo Short Link.')
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (link: ShortLink) => {
    setError('')
    setNotice('')
    try {
      await readBody(await fetch(`/api/admin/short-links/${encodeURIComponent(link.code)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: link.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' }),
      }))
      setNotice(link.status === 'ACTIVE' ? 'Đã vô hiệu hóa Short Link.' : 'Đã bật lại Short Link.')
      await loadLinks()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật Short Link.')
    }
  }

  const content = <>
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-black text-slate-900"><Link2 size={19} className="text-pink-500" />Short Link</h3>
        <p className="mt-1 text-sm text-slate-500">Tạo nhiều liên kết ngắn cho cùng một đối tượng.</p>
      </div>
      {presentation === 'dialog' && <button type="button" onClick={onClose} aria-label="Đóng quản lý Short Link" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>}
    </header>

    {!targetId && targetType === 'product' && <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">Vui lòng lưu sản phẩm trước khi tạo Short Link.</p>}
    {targetId && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
      <div className="min-w-0"><p className="text-sm font-bold text-slate-800">{title || targetType}</p><p className="mt-1 truncate text-xs text-slate-500">URL đích: {targetUrl || 'Chưa khai báo URL'}</p></div>
      <button type="button" onClick={() => { setDraftTitle(title); setDraftTargetUrl(targetUrl ?? ''); setCreateOpen(true); setError('') }} disabled={!canCreate} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} />Tạo Short Link</button>
    </div>}

    {notice && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</p>}
    {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}

    {targetId && <div className="mt-4">
      {loading && links.length === 0 ? <p className="py-5 text-center text-sm text-slate-500">Đang tải liên kết…</p> : !links.length ? <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">Sản phẩm chưa có Short Link.</p> : <div className="space-y-2">
        {links.map((link, index) => <article key={link.code} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><a href={shortUrl(link.code)} target="_blank" rel="noreferrer" className="font-bold text-pink-700 underline decoration-pink-200 underline-offset-2">/{link.code}</a>{index === 0 && link.status === 'ACTIVE' && <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[11px] font-bold text-pink-700">Mới nhất</span>}<span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${link.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{link.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã tắt'}</span></div>
            {link.title && <p className="mt-1 truncate text-sm font-semibold text-slate-800">{link.title}</p>}
            <p className="mt-1 truncate text-xs text-slate-500">{link.resolvedTargetUrl || link.targetUrl} · {link.clickCount === null ? 'Chưa có thống kê' : `${link.clickCount} lượt click`} · {formatDate(link.createdAt)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => void copyLink(link.code)} aria-label={`Sao chép /${link.code}`} title="Sao chép" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">{copiedCode === link.code ? <Check size={17} className="text-emerald-600" /> : <Copy size={17} />}</button>
            <a href={shortUrl(link.code)} target="_blank" rel="noreferrer" aria-label={`Mở /${link.code}`} title="Mở Short Link" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><ExternalLink size={17} /></a>
            <button type="button" onClick={() => void changeStatus(link)} aria-label={link.status === 'ACTIVE' ? 'Vô hiệu hóa' : 'Bật lại'} title={link.status === 'ACTIVE' ? 'Vô hiệu hóa' : 'Bật lại'} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">{link.status === 'ACTIVE' ? <Ban size={17} /> : <RotateCcw size={17} />}</button>
          </div>
        </article>)}
      </div>}
      {nextCursor && <button type="button" onClick={() => void loadLinks(nextCursor, true)} disabled={loading} className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">{loading ? 'Đang tải…' : 'Tải thêm'}</button>}
    </div>}

    {createOpen && <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/55 p-3 sm:p-6" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setCreateOpen(false) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="create-short-link-title" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
        <header className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.15em] text-pink-500">Short Link</p><h4 id="create-short-link-title" className="mt-1 text-xl font-black text-slate-900">Tạo Short Link</h4></div><button type="button" disabled={saving} onClick={() => setCreateOpen(false)} aria-label="Đóng" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={20} /></button></header>
        <div className="mt-5 space-y-4">
          <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">Tiêu đề</span><input value={draftTitle} onChange={event => setDraftTitle(event.target.value)} maxLength={160} className="input" placeholder="Tên gợi nhớ cho liên kết" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">URL đích</span><input value={effectiveTargetUrl} onChange={event => setDraftTargetUrl(event.target.value)} readOnly={Boolean(targetUrl)} className="input read-only:bg-slate-50 read-only:text-slate-500" placeholder="/duong-dan-dich" /></label>
          <fieldset><legend className="mb-2 text-sm font-bold text-slate-700">Kiểu tạo</legend><div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => setMode('auto')} className={`rounded-xl border p-3 text-left ${mode === 'auto' ? 'border-pink-300 bg-pink-50 ring-1 ring-pink-200' : 'border-slate-200 hover:bg-slate-50'}`}><span className="block text-sm font-bold text-slate-800">Tự động</span><span className="mt-1 block text-xs text-slate-500">Hệ thống tạo mã 6 ký tự thường và số.</span></button>
            <button type="button" onClick={() => setMode('manual')} className={`rounded-xl border p-3 text-left ${mode === 'manual' ? 'border-pink-300 bg-pink-50 ring-1 ring-pink-200' : 'border-slate-200 hover:bg-slate-50'}`}><span className="block text-sm font-bold text-slate-800">Tùy chỉnh</span><span className="mt-1 block text-xs text-slate-500">Chọn mã dễ nhớ, dài 4–32 ký tự.</span></button>
          </div></fieldset>
          {mode === 'manual' && <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">Mã tùy chỉnh</span><div className="flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-pink-400"><span className="flex items-center bg-slate-50 px-3 text-sm text-slate-500">{typeof window === 'undefined' ? 'shopbebang.com/' : `${window.location.host}/`}</span><input value={customCode} onChange={event => setCustomCode(event.target.value)} maxLength={32} autoCapitalize="none" autoCorrect="off" className="min-w-0 flex-1 px-3 py-2.5 text-sm outline-none" placeholder="sale26" /></div>{codeError && <span className="mt-1 block text-xs font-semibold text-rose-600">{codeError}</span>}{previewUrl && !codeError && <span className="mt-1 block text-xs text-slate-500">Xem trước: {previewUrl}</span>}</label>}
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={saving} onClick={() => setCreateOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Hủy</button><button type="button" onClick={() => void createLink()} disabled={saving || !canCreate || !effectiveTargetUrl || Boolean(codeError) || (mode === 'manual' && !customCode)} className="inline-flex items-center gap-2 rounded-xl bg-pink-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-600 disabled:opacity-50">{saving ? <><LoaderCircle size={16} className="animate-spin" />Đang tạo…</> : <><Plus size={16} />Tạo Short Link</>}</button></div>
        </div>
      </section>
    </div>}
  </>

  if (presentation === 'dialog') return <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/55 p-3 sm:p-6" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose?.() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="short-link-manager-title" className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
      <div id="short-link-manager-title" className="sr-only">Quản lý Short Link</div>
      {content}
    </section>
  </div>

  return <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">{content}</section>
}

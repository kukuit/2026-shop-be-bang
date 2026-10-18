'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

type AdminOrder = { id: string; orderCode: string; status: string; paymentStatus: string; customer: { name: string; phone: string }; subtotal: number; total: number | null; createdAt: string }
const statusLabels: Record<string, string> = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', FAILED: 'Giao thất bại', CANCELLED: 'Đã hủy' }
const money = (value: number | null) => value === null ? 'Chưa xác nhận' : `${new Intl.NumberFormat('vi-VN').format(value)}₫`
const date = (value: string) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

export default function AdminOrderList() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [pages, setPages] = useState<(string | null)[]>([null])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [counts, setCounts] = useState({ pending: 0, shipping: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => setSearchFilter(search.trim()), 300)
    return () => clearTimeout(timeout)
  }, [search])

  const load = useCallback(async (pageCursor: string | null) => {
    setLoading(true); setError('')
    const params = new URLSearchParams({ limit: '25', status })
    if (searchFilter) params.set('search', searchFilter)
    if (from) params.set('from', String(new Date(`${from}T00:00:00`).getTime()))
    if (to) params.set('to', String(new Date(`${to}T23:59:59.999`).getTime()))
    if (pageCursor) params.set('cursor', pageCursor)
    try {
      const response = await fetch(`/api/admin/orders?${params}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message ?? 'Không tải được đơn hàng.')
      setOrders(result.orders ?? []); setNextCursor(result.nextCursor ?? null); setCounts(result.counts ?? { pending: 0, shipping: 0 })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được đơn hàng.') }
    finally { setLoading(false) }
  }, [status, searchFilter, from, to])

  useEffect(() => { setPages([null]); setCursor(null); void load(null) }, [load])
  const changePage = (next: boolean) => {
    if (next && nextCursor) {
      const nextPages = [...pages, nextCursor]; setPages(nextPages); setCursor(nextCursor); void load(nextCursor)
    } else if (!next && pages.length > 1) {
      const nextPages = pages.slice(0, -1); const previous = nextPages.at(-1) ?? null
      setPages(nextPages); setCursor(previous); void load(previous)
    }
  }

  return <section className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold text-pink-600">Bán hàng</p><h2 className="mt-1 text-3xl font-black">Đơn hàng</h2></div><button type="button" onClick={() => void load(cursor)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold hover:bg-slate-50">Làm mới</button></div>
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-amber-800">Chờ xác nhận</p><p className="mt-1 text-2xl font-black text-amber-900">{counts.pending}</p></div><div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-blue-800">Đang giao</p><p className="mt-1 text-2xl font-black text-blue-900">{counts.shipping}</p></div></div>
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4"><label className="relative sm:col-span-2 self-end"><span className="sr-only">Tìm đơn hàng, tên hoặc số điện thoại</span><Search size={17} className="absolute left-3 top-3.5 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm mã đơn, tên hoặc số điện thoại" className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-pink-500" /></label><label className="text-xs font-bold text-slate-600">Trạng thái<select value={status} onChange={event => setStatus(event.target.value)} className="mt-1 block h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal"><option value="ALL">Tất cả</option><option value="PENDING">Chờ xác nhận</option><option value="CONFIRMED">Đã xác nhận</option><option value="SHIPPING">Đang giao</option><option value="DELIVERED">Đã giao</option><option value="FAILED">Giao thất bại</option><option value="CANCELLED">Đã hủy</option></select></label><div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-slate-600">Từ ngày<input type="date" value={from} onChange={event => setFrom(event.target.value)} className="mt-1 block h-11 w-full rounded-xl border border-slate-200 px-2 text-sm font-normal" /></label><label className="text-xs font-bold text-slate-600">Đến ngày<input type="date" value={to} onChange={event => setTo(event.target.value)} className="mt-1 block h-11 w-full rounded-xl border border-slate-200 px-2 text-sm font-normal" /></label></div></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Mã đơn / ngày</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Tiền hàng</th><th className="px-4 py-3">Tổng tiền</th><th className="px-4 py-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{orders.map(order => <tr key={order.id} className="hover:bg-slate-50"><td className="px-4 py-3"><strong>{order.orderCode}</strong><p className="mt-1 text-xs text-slate-500">{date(order.createdAt)}</p></td><td className="px-4 py-3"><strong>{order.customer?.name}</strong><p className="mt-1 text-xs text-slate-500">{order.customer?.phone}</p></td><td className="px-4 py-3"><StatusBadge status={order.status} /></td><td className="px-4 py-3">{money(order.subtotal)}</td><td className="px-4 py-3 font-bold">{money(order.total)}</td><td className="px-4 py-3 text-right"><Link href={`/admin/orders/${order.id}`} className="font-bold text-pink-700 hover:underline">Mở đơn</Link></td></tr>)}</tbody></table></div>
      <div className="divide-y divide-slate-100 md:hidden">{orders.map(order => <Link key={order.id} href={`/admin/orders/${order.id}`} className="block space-y-2 p-4 hover:bg-slate-50"><div className="flex items-center justify-between gap-3"><strong>{order.orderCode}</strong><StatusBadge status={order.status} /></div><p className="text-sm">{order.customer?.name} · {order.customer?.phone}</p><div className="flex justify-between text-xs text-slate-500"><span>{date(order.createdAt)}</span><strong className="text-slate-800">{money(order.total)}</strong></div></Link>)}</div>
      {loading && <p className="p-8 text-center text-sm text-slate-500">Đang tải đơn hàng…</p>}{!loading && !orders.length && <p className="p-10 text-center text-sm text-slate-500">Chưa có đơn hàng phù hợp.</p>}
      <div className="flex items-center justify-between border-t border-slate-100 p-3"><span className="text-xs text-slate-500">Trang {pages.length}</span><div className="flex gap-2"><button type="button" disabled={pages.length <= 1 || loading} onClick={() => changePage(false)} aria-label="Trang trước" className="grid h-9 w-9 place-items-center rounded-lg border disabled:opacity-40"><ChevronLeft size={18} /></button><button type="button" disabled={!nextCursor || loading} onClick={() => changePage(true)} aria-label="Trang sau" className="grid h-9 w-9 place-items-center rounded-lg border disabled:opacity-40"><ChevronRight size={18} /></button></div></div>
    </div>
  </section>
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'PENDING' ? 'bg-amber-50 text-amber-800' : status === 'SHIPPING' ? 'bg-blue-50 text-blue-800' : status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-800' : status === 'CANCELLED' || status === 'FAILED' ? 'bg-rose-50 text-rose-800' : 'bg-slate-100 text-slate-700'
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${color}`}>{statusLabels[status] ?? status}</span>
}

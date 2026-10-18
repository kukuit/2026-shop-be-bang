'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import ProductImageView from '@/components/products/ProductImageView'

type OrderComponent = { productName: string; color: string | null; size: string | null; sku: string | null; quantity: number; unitPrice: number; lineTotal: number; imageUrl: string | null }
type OrderItem = { productName: string; productSlug: string; color: string | null; size: string | null; sku: string | null; quantity: number; unitPrice: number; lineTotal: number; imageUrl: string | null; isCombo?: boolean; comboComponents?: OrderComponent[] }
type AdminOrder = { id: string; orderCode: string; status: string; paymentMethod: string; paymentStatus: string; subtotal: number; shippingFee: number | null; total: number | null; shippingStatus: string; stockReserved: boolean; stockRestored: boolean; shippingConsent: boolean; shippingConsentAt: string | null; customerAcceptedTotalAt: string | null; customerAcceptedTotalBy: string | null; createdAt: string | null; failureReason?: string; customer: { name: string; phone: string; address: string; note: string }; items: OrderItem[]; statusHistory: Array<{ status: string; at: string; actor: string; action?: string; note?: string | null }> }
const statusLabels: Record<string, string> = { PENDING: 'Chờ shop xác nhận', CONFIRMED: 'Đã xác nhận', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', FAILED: 'Giao hàng thất bại', CANCELLED: 'Đã hủy' }
const money = (value: number | null) => value === null ? 'Chưa xác nhận' : `${new Intl.NumberFormat('vi-VN').format(value)}₫`
const date = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

export default function AdminOrderDetail({ id }: { id: string }) {
  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [shippingFee, setShippingFee] = useState('')
  const [failureReason, setFailureReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message ?? 'Không tải được đơn hàng.')
      setOrder(result.order)
      setShippingFee(result.order.shippingFee === null ? '' : String(result.order.shippingFee))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được đơn hàng.') }
    finally { setLoading(false) }
  }, [id])
  useEffect(() => { void load() }, [load])

  async function action(actionName: string, extra: Record<string, unknown> = {}) {
    if (!order || busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: actionName, ...extra }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message ?? 'Không cập nhật được đơn hàng.')
      setOrder(result.order); setNotice('Đã cập nhật đơn hàng.')
      if (actionName === 'set_shipping_fee') setShippingFee(String(result.order.shippingFee))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không cập nhật được đơn hàng.') }
    finally { setBusy(false) }
  }

  if (loading && !order) return <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Đang tải đơn hàng…</p>
  if (!order) return <section className="rounded-2xl bg-white p-8"><p role="alert" className="text-sm text-red-700">{error || 'Không tìm thấy đơn hàng.'}</p><Link href="/admin/orders" className="mt-4 inline-flex font-bold text-pink-700">← Danh sách đơn hàng</Link></section>

  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/admin/orders" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-pink-700"><ArrowLeft size={16} />Đơn hàng</Link><h2 className="mt-2 text-2xl font-black sm:text-3xl">{order.orderCode}</h2><p className="mt-1 text-sm text-slate-500">Tạo lúc {date(order.createdAt)}</p></div><button type="button" onClick={() => void load()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"><RefreshCw size={15} />Làm mới</button></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}{notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</p>}
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-black">Sản phẩm</h3><span className="rounded-full bg-pink-50 px-3 py-1 text-sm font-bold text-pink-800">{statusLabels[order.status] ?? order.status}</span></div><div className="mt-4 divide-y divide-slate-100">{order.items.map((item, index) => <div key={`${item.productName}-${index}`} className="flex gap-3 py-4 first:pt-0 last:pb-0"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">{item.imageUrl && <ProductImageView src={item.imageUrl} alt="" sizes="64px" variant="thumbnail" className="object-cover" />}</div><div className="min-w-0 flex-1"><p className="font-bold">{item.productName}</p>{item.isCombo ? <><p className="mt-1 text-xs font-black text-violet-700">COMBO · {money(item.unitPrice)} × {item.quantity}</p><ul className="mt-2 space-y-1 text-xs text-slate-500">{item.comboComponents?.map((component, componentIndex) => <li key={`${component.productName}-${componentIndex}`}>{component.productName}{[component.color, component.size].filter(Boolean).length ? ` · ${[component.color, component.size].filter(Boolean).join(' / ')}` : ''} × {component.quantity * item.quantity}</li>)}</ul></> : <><p className="mt-1 text-xs text-slate-500">{[item.color, item.size, item.sku ? `SKU ${item.sku}` : null].filter(Boolean).join(' · ')}</p><p className="mt-1 text-sm text-slate-600">{money(item.unitPrice)} × {item.quantity}</p></>}</div><strong className="whitespace-nowrap text-sm">{money(item.lineTotal)}</strong></div>)}</div><div className="mt-4 space-y-2 border-t pt-4 text-sm"><div className="flex justify-between"><span>Tiền hàng</span><strong>{money(order.subtotal)}</strong></div><div className="flex justify-between"><span>Phí vận chuyển</span><strong>{money(order.shippingFee)}</strong></div><div className="flex justify-between border-t pt-2 text-base"><span className="font-bold">Tổng thanh toán</span><strong>{money(order.total)}</strong></div></div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-lg font-black">Thông tin nhận hàng</h3><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs font-bold uppercase text-slate-500">Khách hàng</dt><dd className="mt-1 font-semibold">{order.customer.name}</dd></div><div><dt className="text-xs font-bold uppercase text-slate-500">Điện thoại</dt><dd className="mt-1"><a href={`tel:${order.customer.phone}`} className="font-bold text-pink-700 underline">{order.customer.phone}</a></dd></div><div className="sm:col-span-2"><dt className="text-xs font-bold uppercase text-slate-500">Địa chỉ</dt><dd className="mt-1 leading-6">{order.customer.address}</dd></div>{order.customer.note && <div className="sm:col-span-2"><dt className="text-xs font-bold uppercase text-slate-500">Ghi chú</dt><dd className="mt-1">{order.customer.note}</dd></div>}</dl><p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Đồng ý được khách ghi nhận lúc {date(order.shippingConsentAt)}: {order.shippingConsent ? 'Có, shop được liên hệ xác nhận phí vận chuyển và tổng tiền.' : 'Không có'}</p></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-lg font-black">Lịch sử trạng thái</h3><ol className="mt-4 space-y-4 border-l-2 border-pink-100 pl-4">{(order.statusHistory ?? []).map((entry, index) => <li key={`${entry.status}-${index}`} className="relative text-sm"><span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-pink-500" /><p className="font-bold">{statusLabels[entry.status] ?? entry.status}{entry.action ? ` · ${entry.action}` : ''}</p>{entry.note && <p className="mt-1 text-slate-600">{entry.note}</p>}<time className="mt-1 block text-xs text-slate-500">{date(entry.at)} · {entry.actor === 'customer' ? 'Khách hàng' : 'Admin'}</time></li>)}</ol></section>
      </div>
      <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 xl:sticky xl:top-6"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Thanh toán</p><p className="mt-1 font-black">COD · {order.paymentStatus === 'PAID' ? 'Đã thu tiền' : 'Chưa thu tiền'}</p></div><div className="rounded-xl bg-slate-50 p-3 text-sm"><p>Giữ tồn kho: <strong>{order.stockReserved ? 'Có' : 'Không'}</strong></p><p className="mt-1">Đã hoàn kho: <strong>{order.stockRestored ? 'Có' : 'Không'}</strong></p></div>
        {order.status === 'PENDING' && <div className="space-y-3 border-t pt-4"><label className="block text-sm font-bold">Phí vận chuyển (₫)<input type="number" min={0} step={1000} value={shippingFee} onChange={event => setShippingFee(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3 font-normal" /></label><button type="button" disabled={busy || !shippingFee || !Number.isSafeInteger(Number(shippingFee))} onClick={() => void action('set_shipping_fee', { shippingFee: Number(shippingFee) })} className="w-full rounded-xl border border-pink-200 px-4 py-2.5 text-sm font-bold text-pink-700 disabled:opacity-40">{order.shippingFee === null ? 'Ghi nhận phí ship' : 'Cập nhật phí ship'}</button>{order.total !== null && <div className="rounded-xl bg-amber-50 p-3 text-sm"><p>Tổng cần báo khách</p><p className="mt-1 font-black text-amber-900">{money(order.total)}</p>{order.customerAcceptedTotalAt ? <p className="mt-3 text-xs font-semibold text-emerald-800">Khách đã đồng ý tổng tiền lúc {date(order.customerAcceptedTotalAt)}.</p> : <button type="button" disabled={busy} onClick={() => void action('accept_customer_total')} className="mt-3 w-full rounded-lg bg-amber-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40">Đã liên hệ và ghi nhận khách đồng ý</button>}</div>}<button type="button" disabled={busy || order.shippingFee === null || !order.customerAcceptedTotalAt} onClick={() => void action('confirm')} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:bg-slate-300">Xác nhận đơn</button><button type="button" disabled={busy} onClick={() => window.confirm('Hủy đơn này và hoàn tồn kho?') && void action('cancel')} className="w-full rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 disabled:opacity-40">Hủy đơn</button></div>}
        {order.status === 'CONFIRMED' && <div className="space-y-3 border-t pt-4"><p className="text-sm text-slate-600">Khách đã đồng ý tổng tiền. Có thể chuyển đơn cho đơn vị vận chuyển.</p><button type="button" disabled={busy} onClick={() => void action('ship')} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-40">Bắt đầu giao hàng</button><button type="button" disabled={busy} onClick={() => window.confirm('Hủy đơn đã xác nhận và hoàn tồn kho?') && void action('cancel')} className="w-full rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 disabled:opacity-40">Hủy đơn</button></div>}
        {order.status === 'SHIPPING' && <div className="space-y-3 border-t pt-4"><button type="button" disabled={busy} onClick={() => void action('deliver')} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-40">Đánh dấu đã giao</button><label className="block text-sm font-bold">Lý do giao thất bại<input value={failureReason} onChange={event => setFailureReason(event.target.value)} maxLength={300} className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3 font-normal" /></label><button type="button" disabled={busy || !failureReason.trim()} onClick={() => void action('fail', { reason: failureReason })} className="w-full rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 disabled:opacity-40">Ghi nhận giao thất bại</button></div>}
        {order.status === 'FAILED' && !order.stockRestored && <div className="space-y-3 border-t pt-4"><p className="text-sm text-slate-600">Tồn kho vẫn đang được giữ. Chỉ hoàn kho khi hàng đã quay về shop.</p><button type="button" disabled={busy} onClick={() => window.confirm('Xác nhận hàng đã về shop và hoàn lại tồn kho?') && void action('restore_failed_return')} className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-black text-white disabled:opacity-40">Hàng đã về shop · Hoàn tồn kho</button></div>}
        {order.status === 'DELIVERED' && order.paymentStatus !== 'PAID' && <div className="border-t pt-4"><p className="mb-3 text-sm text-slate-600">Xác nhận COD sau khi shop/đơn vị giao hàng đã thu tiền.</p><button type="button" disabled={busy} onClick={() => window.confirm('Đã thu đủ COD từ khách?') && void action('mark_cod_paid')} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-40">Đã thu tiền COD</button></div>}
      </aside>
    </div>
  </section>
}

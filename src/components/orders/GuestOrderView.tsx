'use client'

import { useState } from 'react'
import ProductImageView from '@/components/products/ProductImageView'
export interface GuestOrder {
  orderCode: string
  status: string
  paymentStatus: string
  subtotal: number
  shippingFee: number | null
  total: number | null
  customerAcceptedTotal: boolean
  customerAcceptedTotalAt: string | null
  shippingStatus: string
  items: Array<{ productName: string; color: string | null; size: string | null; quantity: number; unitPrice: number; lineTotal: number; imageUrl: string | null; isCombo?: boolean; comboComponents?: Array<{ productName: string; color: string | null; size: string | null; quantity: number; unitPrice: number; lineTotal: number; imageUrl: string | null }> }>
  createdAt: string | null
  updatedAt: string | null
  statusHistory: Array<{ status: string; at: string | null; note: string | null }>
}

const statuses: Record<string, string> = { PENDING: 'Chờ shop xác nhận', CONFIRMED: 'Đã xác nhận', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', FAILED: 'Giao hàng thất bại', CANCELLED: 'Đã hủy' }
const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}₫`

export default function GuestOrderView({ order: initialOrder, accessToken, layout = 'default' }: { order: GuestOrder; accessToken?: string; layout?: 'default' | 'split' }) {
  const [currentOrder, setCurrentOrder] = useState(initialOrder)
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState('')
  async function acceptTotal() {
    if (!accessToken || accepting) return
    setAccepting(true); setAcceptError('')
    try {
      const response = await fetch('/api/orders/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessToken }), cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message ?? 'Không ghi nhận được xác nhận.')
      setCurrentOrder(result.order)
    } catch (reason) { setAcceptError(reason instanceof Error ? reason.message : 'Không ghi nhận được xác nhận.') }
    finally { setAccepting(false) }
  }
  const order = currentOrder
  return <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-pink-600">Mã đơn hàng</p><p className="mt-1 text-xl font-black">{order.orderCode}</p></div><span className="rounded-full bg-pink-50 px-3 py-1.5 text-sm font-bold text-pink-800">{statuses[order.status] ?? order.status}</span></div>
    <div className="grid gap-3 rounded-xl bg-zinc-50 p-4 text-sm sm:grid-cols-2"><p><span className="text-zinc-500">Thanh toán</span><br /><strong>COD · {order.paymentStatus === 'PAID' ? 'Đã thu tiền' : 'Chưa thu tiền'}</strong></p><p><span className="text-zinc-500">Phí vận chuyển</span><br /><strong>{order.shippingFee === null ? 'Shop sẽ xác nhận' : money(order.shippingFee)}</strong></p><p><span className="text-zinc-500">Tiền hàng</span><br /><strong>{money(order.subtotal)}</strong></p><p><span className="text-zinc-500">Tổng thanh toán</span><br /><strong>{order.total === null ? 'Chưa xác nhận' : money(order.total)}</strong></p></div>
    {order.status === 'PENDING' && order.total !== null && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm leading-6 text-amber-950">Shop đã báo phí vận chuyển và tổng tiền. Chỉ xác nhận nếu bạn đồng ý với tổng thanh toán.</p>{order.customerAcceptedTotal ? <p className="mt-3 text-sm font-bold text-emerald-800">Bạn đã đồng ý tổng thanh toán{order.customerAcceptedTotalAt ? ` lúc ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(order.customerAcceptedTotalAt))}` : ''}. Shop sẽ tiếp tục xác nhận đơn.</p> : accessToken ? <button type="button" disabled={accepting} onClick={() => void acceptTotal()} className="mt-3 min-h-11 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{accepting ? 'Đang ghi nhận…' : 'Tôi đồng ý phí ship và tổng tiền'}</button> : null}{acceptError && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{acceptError}</p>}</div>}
    <div className={layout === 'split' ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]' : 'space-y-5'}>
      <div><h2 className="font-black">Sản phẩm</h2><div className="mt-3 space-y-3">{order.items.map((item, index) => <div key={`${item.productName}-${index}`} className="flex items-start gap-3"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100">{item.imageUrl && <ProductImageView src={item.imageUrl} alt="" sizes="56px" variant="thumbnail" className="object-cover" />}</div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-bold">{item.productName}</p>{item.isCombo && <p className="text-[11px] font-black text-violet-700">COMBO · SL {item.quantity}</p>}{!item.isCombo && <p className="text-xs text-zinc-500">{[item.color, item.size].filter(Boolean).join(' · ')}{item.color || item.size ? ' · ' : ''}SL {item.quantity}</p>}{item.isCombo && item.comboComponents?.map((component, componentIndex) => <p key={`${component.productName}-${componentIndex}`} className="text-xs text-zinc-500">{component.productName}{[component.color, component.size].filter(Boolean).length ? ` · ${[component.color, component.size].filter(Boolean).join(' / ')}` : ''} × {component.quantity * item.quantity}</p>)}</div><strong className="whitespace-nowrap text-sm">{money(item.lineTotal)}</strong></div>)}</div></div>
      <div><h2 className="font-black">Cập nhật đơn hàng</h2><ol className="mt-3 space-y-3 border-l-2 border-pink-100 pl-4">{order.statusHistory.map((entry, index) => <li key={`${entry.status}-${index}`} className="relative text-sm"><span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-pink-500" /><p className="font-bold">{statuses[entry.status] ?? entry.status}</p>{entry.note && <p className="mt-0.5 text-zinc-600">{entry.note}</p>}{entry.at && <time className="mt-0.5 block text-xs text-zinc-500">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.at))}</time>}</li>)}</ol></div>
    </div>
  </section>
}

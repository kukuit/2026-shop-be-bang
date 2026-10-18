'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import GuestOrderView, { type GuestOrder } from './GuestOrderView'

export default function OrderSuccessClient() {
  const [order, setOrder] = useState<GuestOrder | null>(null)
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? ''
    setToken(value)
    if (!value) return
    fetch('/api/orders/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessToken: value }), cache: 'no-store' })
      .then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.message); setOrder(result.order) })
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Không thể tải thông tin đơn hàng.'))
  }, [])
  async function copyLookupLink() {
    try { await navigator.clipboard.writeText(`${window.location.origin}/order/lookup#token=${encodeURIComponent(token)}`); setCopied(true) }
    catch { setCopied(false) }
  }
  return <main className="mx-auto min-h-[65vh] max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
    <div className="mb-6 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl font-black text-emerald-700" aria-hidden="true">✓</div><h1 className="mt-4 text-3xl font-black">Shop đã nhận yêu cầu đặt hàng</h1><p className="mt-2 text-sm leading-6 text-zinc-600">Đơn hàng đang chờ shop liên hệ xác nhận phí vận chuyển và tổng thanh toán. Đây chưa phải xác nhận giao hàng hay thanh toán.</p></div>
    {order ? <><GuestOrderView order={order} accessToken={token} layout="split" /><div className="mt-4 flex flex-wrap justify-center gap-3"><button type="button" onClick={() => window.location.reload()} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-700">Cập nhật trạng thái</button><button type="button" onClick={copyLookupLink} disabled={!token} className="rounded-xl border border-pink-200 px-4 py-2.5 text-sm font-bold text-pink-700">{copied ? 'Đã sao chép link tra cứu' : 'Sao chép link tra cứu'}</button><Link href="/" className="rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-bold text-white">Tiếp tục mua sắm</Link></div></> : error ? <div role="alert" className="rounded-2xl bg-amber-50 p-5 text-center text-sm text-amber-900">{error}<p className="mt-3"><Link className="font-bold underline" href="/order/lookup">Mở trang tra cứu đơn hàng</Link></p></div> : <p className="rounded-2xl border bg-white p-8 text-center text-sm text-zinc-500">Đang tải thông tin đơn hàng…</p>}
  </main>
}

'use client'

import { FormEvent, useEffect, useState } from 'react'
import GuestOrderView, { type GuestOrder } from './GuestOrderView'

export default function OrderLookupClient() {
  const [token, setToken] = useState('')
  const [order, setOrder] = useState<GuestOrder | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const fragmentToken = new URLSearchParams(window.location.hash.slice(1)).get('token')
    if (fragmentToken) { setToken(fragmentToken); void lookup(fragmentToken) }
  }, [])
  async function lookup(value: string) {
    setLoading(true); setError(''); setOrder(null)
    try {
      const response = await fetch('/api/orders/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessToken: value.trim() }), cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message ?? 'Không tìm thấy đơn hàng.')
      setOrder(result.order)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tra cứu đơn hàng.') }
    finally { setLoading(false) }
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (token.trim().length >= 32) void lookup(token) }
  return <main className="mx-auto min-h-[65vh] max-w-3xl px-4 py-10 sm:px-6">
    <div className="mb-6"><p className="text-sm font-bold text-pink-600">Đơn hàng khách</p><h1 className="mt-1 text-3xl font-black">Tra cứu đơn hàng</h1><p className="mt-2 text-sm leading-6 text-zinc-600">Dán mã tra cứu bảo mật từ link shop gửi cho bạn. Mã này chỉ hiển thị thông tin trạng thái và sản phẩm.</p></div>
    <form onSubmit={submit} className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6"><label htmlFor="order-access-token" className="text-sm font-bold">Mã tra cứu bảo mật</label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input id="order-access-token" type="password" autoComplete="off" value={token} onChange={event => setToken(event.target.value)} minLength={32} maxLength={256} required className="min-h-11 min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 font-normal outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100" /><button type="submit" disabled={loading} className="min-h-11 rounded-xl bg-pink-600 px-5 text-sm font-black text-white disabled:bg-zinc-300">{loading ? 'Đang tra cứu…' : 'Tra cứu'}</button></div>{error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}</form>
    {order && <div className="mt-5"><GuestOrderView order={order} accessToken={token} /></div>}
  </main>
}

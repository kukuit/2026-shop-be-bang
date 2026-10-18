'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BUY_NOW_STORAGE_KEY, cartItemKey, type CartItem, type CartResolvedLine } from '@/lib/cart/model'
import { readBuyNow, useCart } from './CartProvider'
import ProductImageView from '@/components/products/ProductImageView'

const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}₫`
const IDEMPOTENCY_STORAGE_KEY = 'shopbebang_checkout_request_v1'

export default function CheckoutClient() {
  const router = useRouter()
  const { items: cartItems, hydrated, subtractPurchased, refresh } = useCart()
  const [buyNowItems, setBuyNowItems] = useState<CartItem[] | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [resolvedLines, setResolvedLines] = useState<CartResolvedLine[]>([])
  const [resolvedFingerprint, setResolvedFingerprint] = useState('')
  const [resolving, setResolving] = useState(false)
  const [resolutionAttempt, setResolutionAttempt] = useState(0)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [shippingConsent, setShippingConsent] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isBuyNow = Boolean(buyNowItems?.length)
  const checkoutItems = buyNowItems ?? cartItems
  const itemFingerprint = useMemo(() => JSON.stringify(checkoutItems), [checkoutItems])

  useEffect(() => {
    setBuyNowItems(readBuyNow().length ? readBuyNow() : null)
    setInitialized(true)
  }, [])

  useEffect(() => {
    setResolvedLines([]); setResolvedFingerprint('')
    if (!initialized || !hydrated || !checkoutItems.length) return
    let active = true
    setResolving(true)
    fetch('/api/cart/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: checkoutItems }), cache: 'no-store' })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.message ?? 'Không thể kiểm tra giỏ hàng.')
        if (active) { setResolvedLines(data.lines ?? []); setResolvedFingerprint(itemFingerprint) }
      })
      .catch(() => { if (active) setResolvedLines([]) })
      .finally(() => { if (active) setResolving(false) })
    return () => { active = false }
  }, [initialized, hydrated, itemFingerprint, checkoutItems, resolutionAttempt])

  const subtotal = resolvedLines.reduce((sum, line) => sum + (line.lineTotal ?? 0), 0)
  const ready = initialized && hydrated && !resolving && resolvedFingerprint === itemFingerprint && checkoutItems.length > 0 && resolvedLines.length === checkoutItems.length && resolvedLines.every(line => line.available)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready || submitting) return
    if (!shippingConsent) { setError('Hãy xác nhận để shop liên hệ báo phí vận chuyển và tổng tiền trước khi gửi hàng.'); return }
    setError('')
    setSubmitting(true)
    const body = {
      customer: { name: name.trim(), phone: phone.trim(), address: address.trim(), note: note.trim() },
      shippingConsent: true as const,
      items: checkoutItems.map(item => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })),
    }
    const fingerprint = JSON.stringify(body)
    let idempotencyKey = ''
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(IDEMPOTENCY_STORAGE_KEY) ?? 'null') as { fingerprint?: string; key?: string } | null
      if (saved?.fingerprint === fingerprint && saved.key) idempotencyKey = saved.key
    } catch { /* Replace invalid local retry metadata. */ }
    if (!idempotencyKey) {
      idempotencyKey = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
      window.sessionStorage.setItem(IDEMPOTENCY_STORAGE_KEY, JSON.stringify({ fingerprint, key: idempotencyKey }))
    }
    try {
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, idempotencyKey }) })
      const result = await response.json()
      if (!response.ok) {
        setError(result.message ?? 'Không thể tạo đơn hàng. Vui lòng thử lại.')
        void refresh()
        setResolutionAttempt(value => value + 1)
        return
      }
      window.sessionStorage.removeItem(IDEMPOTENCY_STORAGE_KEY)
      if (isBuyNow) window.sessionStorage.removeItem(BUY_NOW_STORAGE_KEY)
      else subtractPurchased(checkoutItems)
      router.replace(`/order/success#token=${encodeURIComponent(result.accessToken)}`)
    } catch {
      setError('Kết nối bị gián đoạn. Bạn có thể gửi lại, thông tin đặt hàng đã được giữ nguyên.')
    } finally { setSubmitting(false) }
  }

  return <main className="mx-auto min-h-[65vh] max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="mb-6"><p className="text-sm font-bold text-pink-600">Thanh toán COD</p><h1 className="mt-1 text-3xl font-black">Thông tin đặt hàng</h1><p className="mt-2 text-sm text-zinc-600">Không cần tạo tài khoản. Shop sẽ liên hệ xác nhận phí vận chuyển và tổng tiền.</p></div>
    {!initialized || !hydrated ? <div className="rounded-2xl border bg-white p-8 text-center text-zinc-500">Đang tải giỏ hàng…</div> : checkoutItems.length === 0 ? <section className="rounded-2xl border bg-white p-8 text-center"><p className="font-bold">Chưa có sản phẩm để đặt.</p><Link href="/" className="mt-4 inline-block font-bold text-pink-700 underline">Tiếp tục mua sắm</Link></section> : <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7">
        <section><h2 className="text-lg font-black">Thông tin nhận hàng</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">Họ và tên <span className="text-red-600">*</span><input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={event => setName(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-zinc-300 px-3 font-normal outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100" /></label>
          <label className="text-sm font-bold">Số điện thoại <span className="text-red-600">*</span><input required type="tel" inputMode="tel" autoComplete="tel" maxLength={30} value={phone} onChange={event => setPhone(event.target.value)} placeholder="09xx xxx xxx" className="mt-1.5 min-h-11 w-full rounded-xl border border-zinc-300 px-3 font-normal outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100" /></label>
          <label className="text-sm font-bold sm:col-span-2">Địa chỉ nhận hàng <span className="text-red-600">*</span><textarea required minLength={8} maxLength={300} autoComplete="street-address" rows={3} value={address} onChange={event => setAddress(event.target.value)} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" className="mt-1.5 w-full rounded-xl border border-zinc-300 p-3 font-normal outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100" /></label>
          <label className="text-sm font-bold sm:col-span-2">Ghi chú <span className="font-normal text-zinc-500">(không bắt buộc)</span><textarea maxLength={500} rows={2} value={note} onChange={event => setNote(event.target.value)} className="mt-1.5 w-full rounded-xl border border-zinc-300 p-3 font-normal outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100" /></label>
        </div></section>
        <section className="border-t border-zinc-100 pt-5"><h2 className="text-lg font-black">Phương thức thanh toán</h2><div className="mt-3 rounded-xl border border-pink-200 bg-pink-50 p-4"><p className="font-bold text-pink-900">Thanh toán khi nhận hàng (COD)</p><p className="mt-1 text-sm text-pink-900/80">Trả tiền trực tiếp cho đơn vị giao hàng khi nhận sản phẩm.</p></div></section>
        <label className="flex cursor-pointer gap-3 rounded-xl border border-zinc-200 p-4 text-sm leading-6"><input type="checkbox" checked={shippingConsent} onChange={event => setShippingConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-pink-600" /><span>Tôi đồng ý để shop liên hệ xác nhận phí vận chuyển và tổng thanh toán trước khi giao hàng.</span></label>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <button type="submit" disabled={!ready || !shippingConsent || submitting} className="min-h-12 w-full rounded-xl bg-pink-600 px-5 py-3 font-black text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:bg-zinc-300">{submitting ? 'Đang gửi đơn…' : 'Đặt hàng COD'}</button>
      </form>
      <aside className="rounded-2xl border border-zinc-200 bg-white p-5 lg:sticky lg:top-24"><h2 className="text-lg font-black">Đơn hàng của bạn</h2><div className="mt-4 max-h-80 space-y-3 overflow-y-auto">{checkoutItems.map(item => {
        const line = resolvedLines.find(candidate => candidate.key === cartItemKey(item))
        return <div key={cartItemKey(item)} className="flex gap-3"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">{line?.imageUrl && <ProductImageView src={line.imageUrl} alt="" sizes="64px" variant="thumbnail" className="object-cover" />}</div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-bold">{line?.productName ?? 'Đang kiểm tra sản phẩm…'}</p>{line?.isCombo && <p className="text-[11px] font-black text-violet-700">COMBO</p>}<p className="text-xs text-zinc-500">{[line?.color, line?.size].filter(Boolean).join(' · ')} · SL {item.quantity}</p>{line?.comboComponents?.map((component, index) => <p key={`${component.productId}-${index}`} className="text-[11px] text-zinc-500">{component.productName} × {component.quantity * item.quantity}</p>)}</div><span className="whitespace-nowrap text-sm font-bold">{line?.lineTotal == null ? '—' : money(line.lineTotal)}</span></div>
      })}</div><div className="mt-4 space-y-3 border-t pt-4 text-sm"><div className="flex justify-between"><span className="text-zinc-600">Tiền hàng</span><strong>{money(subtotal)}</strong></div><div className="flex justify-between gap-4"><span className="text-zinc-600">Phí vận chuyển</span><span className="text-right text-zinc-600">Shop sẽ xác nhận</span></div></div><p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Đơn hàng chưa có tổng thanh toán cuối cùng. Shop sẽ báo phí ship để bạn đồng ý trước khi xác nhận.</p>
        {resolvedLines.some(line => !line.available) && <div className="mt-3 space-y-1 text-xs font-semibold text-red-600">{resolvedLines.filter(line => !line.available).map(line => <p key={line.key}>{line.productName}: {line.unavailableReason}</p>)}</div>}
        {resolving && <p className="mt-3 text-xs text-zinc-500">Đang kiểm tra giá và tồn kho…</p>}
      </aside>
    </div>}
  </main>
}

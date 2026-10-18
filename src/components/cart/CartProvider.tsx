'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingBag, X } from 'lucide-react'
import { BUY_NOW_STORAGE_KEY, CART_STORAGE_KEY, cartItemKey, mergeCartItem, parseStoredCart, removeCartItem, setCartItemQuantity, type CartItem, type CartResolvedLine } from '@/lib/cart/model'
import ProductImageView from '@/components/products/ProductImageView'

interface CartContextValue {
  items: CartItem[]
  lines: CartResolvedLine[]
  resolvedFingerprint: string
  hydrated: boolean
  drawerOpen: boolean
  notice: string
  openDrawer: () => void
  closeDrawer: () => void
  addItem: (item: CartItem, stockLimit?: number) => boolean
  setQuantity: (key: string, quantity: number) => void
  removeItem: (key: string) => void
  subtractPurchased: (items: CartItem[]) => void
  refresh: () => Promise<void>
  announce: (message: string) => void
}

const CartContext = createContext<CartContextValue | null>(null)
const formatMoney = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}₫`

export function CartProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [items, setItems] = useState<CartItem[]>([])
  const [lines, setLines] = useState<CartResolvedLine[]>([])
  const [resolvedFingerprint, setResolvedFingerprint] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resolutionVersion = useRef(0)

  useEffect(() => {
    setItems(parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY)))
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  }, [hydrated, items])

  const refresh = useCallback(async () => {
    if (!hydrated) return
    const fingerprint = JSON.stringify(items)
    const version = ++resolutionVersion.current
    setLines([]); setResolvedFingerprint('')
    if (!items.length) return
    try {
      const response = await fetch('/api/cart/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }), cache: 'no-store' })
      const data = await response.json()
      if (version === resolutionVersion.current && response.ok && Array.isArray(data.lines)) { setLines(data.lines); setResolvedFingerprint(fingerprint) }
    } catch { /* Retain the last server resolution while offline. */ }
  }, [hydrated, items])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    setDrawerOpen(false)
    if (pathname !== '/checkout') window.sessionStorage.removeItem(BUY_NOW_STORAGE_KEY)
  }, [pathname])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const announce = useCallback((message: string) => {
    setNotice(message)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setNotice(''), 3200)
  }, [])
  const addItem = useCallback((item: CartItem, stockLimit = 99) => {
    const next = mergeCartItem(items, item, stockLimit)
    if (!next) { announce(stockLimit <= 0 ? 'Sản phẩm đã hết hàng.' : 'Số lượng vượt quá tồn kho hoặc giới hạn giỏ hàng.'); return false }
    setItems(next)
    setDrawerOpen(true)
    announce('Đã thêm sản phẩm vào giỏ hàng.')
    return true
  }, [announce, items])
  const setQuantity = useCallback((key: string, quantity: number) => setItems(current => setCartItemQuantity(current, key, quantity)), [])
  const removeItem = useCallback((key: string) => setItems(current => removeCartItem(current, key)), [])
  const subtractPurchased = useCallback((purchased: CartItem[]) => setItems(current => {
    const quantities = new Map(purchased.map(item => [cartItemKey(item), item.quantity]))
    return current.flatMap(item => {
      const remaining = item.quantity - (quantities.get(cartItemKey(item)) ?? 0)
      return remaining > 0 ? [{ ...item, quantity: remaining }] : []
    })
  }), [])
  const value = useMemo<CartContextValue>(() => ({ items, lines, resolvedFingerprint, hydrated, drawerOpen, notice, openDrawer: () => setDrawerOpen(true), closeDrawer: () => setDrawerOpen(false), addItem, setQuantity, removeItem, subtractPurchased, refresh, announce }), [items, lines, resolvedFingerprint, hydrated, drawerOpen, notice, addItem, setQuantity, removeItem, subtractPurchased, refresh, announce])

  return <CartContext.Provider value={value}>{children}<CartDrawer /></CartContext.Provider>
}

export function useCart() {
  const value = useContext(CartContext)
  if (!value) throw new Error('useCart must be used inside CartProvider')
  return value
}

export function CartButton() {
  const { items, hydrated, openDrawer } = useCart()
  const count = items.reduce((sum, item) => sum + item.quantity, 0)
  return <button type="button" onClick={openDrawer} aria-label={`Mở giỏ hàng${count ? `, ${count} sản phẩm` : ''}`} className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 hover:bg-pink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-500">
    <ShoppingBag size={21} />
    {hydrated && count > 0 && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-pink-600 px-1 text-[10px] font-black text-white">{count > 99 ? '99+' : count}</span>}
  </button>
}

function CartDrawer() {
  const { items, lines, drawerOpen, closeDrawer, setQuantity, removeItem } = useCart()
  const panel = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!drawerOpen) return
    const previous = document.activeElement as HTMLElement | null
    closeButton.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeDrawer(); previous?.focus(); return }
      if (event.key !== 'Tab' || !panel.current) return
      const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled)'))
      const first = focusable[0], last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('keydown', onKeyDown); previous?.focus() }
  }, [drawerOpen, closeDrawer])
  if (!drawerOpen) return null
  return <div className="fixed inset-0 z-[70]" onMouseDown={event => { if (event.target === event.currentTarget) closeDrawer() }}>
    <button type="button" aria-label="Đóng giỏ hàng" className="absolute inset-0 h-full w-full bg-slate-950/40" onClick={closeDrawer} />
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl bg-white shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:w-[min(440px,100vw)] md:max-h-none md:rounded-none">
      <div className="flex items-center justify-between border-b px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-wider text-pink-600">Shop Bé Băng</p><h2 id="cart-drawer-title" className="text-xl font-black">Giỏ hàng <span className="text-sm font-semibold text-zinc-500">({items.reduce((sum, item) => sum + item.quantity, 0)})</span></h2></div><button ref={closeButton} onClick={closeDrawer} type="button" className="rounded-full p-2 hover:bg-zinc-100" aria-label="Đóng giỏ hàng"><X size={21} /></button></div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {!items.length ? <div className="grid min-h-48 place-items-center text-center text-zinc-500"><div><ShoppingBag className="mx-auto mb-3 text-pink-300" size={38} /><p>Giỏ hàng đang trống.</p></div></div> : items.map(item => {
          const line = lines.find(candidate => candidate.key === cartItemKey(item))
          return <div key={cartItemKey(item)} className="relative flex gap-3 rounded-2xl border border-zinc-100 p-3 pr-10">
            <button type="button" onClick={() => removeItem(cartItemKey(item))} aria-label={`Xóa ${line?.productName ?? 'sản phẩm'} khỏi giỏ hàng`} className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-500"><X size={16} /></button>
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100">{line?.imageUrl && <ProductImageView src={line.imageUrl} alt="" sizes="80px" variant="thumbnail" className="object-cover" />}</div>
            <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-bold text-zinc-900">{line?.productName ?? 'Đang cập nhật sản phẩm…'}</p><p className="mt-1 text-xs text-zinc-500">{[line?.color, line?.size].filter(Boolean).join(' · ')}</p>{line?.unitPrice !== null && line?.unitPrice !== undefined && <p className="mt-1 text-sm font-black text-pink-700">{formatMoney(line.unitPrice)}</p>}
              <div className="mt-2 flex items-center"><div className="flex items-center rounded-lg border"><button type="button" aria-label="Giảm số lượng" className="px-2 py-1" onClick={() => setQuantity(cartItemKey(item), item.quantity - 1)}>−</button><span className="min-w-7 text-center text-xs">{item.quantity}</span><button type="button" aria-label="Tăng số lượng" className="px-2 py-1" disabled={line?.available === false || item.quantity >= (line?.stockAvailable ?? 99)} onClick={() => setQuantity(cartItemKey(item), item.quantity + 1)}>+</button></div></div>
              {line && !line.available && <p className="mt-1 text-xs font-semibold text-red-600">{line.unavailableReason}</p>}
            </div>
          </div>
        })}
      </div>
      <div className="space-y-2 border-t p-4"><Link href="/cart" onClick={closeDrawer} className="block rounded-xl border border-pink-200 py-3 text-center text-sm font-bold text-pink-700 hover:bg-pink-50">Xem giỏ hàng</Link><Link href="/checkout" onClick={closeDrawer} aria-disabled={!items.length} className={`block rounded-xl py-3 text-center text-sm font-black text-white ${items.length ? 'bg-pink-600 hover:bg-pink-700' : 'pointer-events-none bg-zinc-300'}`}>Tiến hành đặt hàng</Link></div>
    </div>
  </div>
}

export function readBuyNow() {
  if (typeof window === 'undefined') return []
  const items = parseStoredCart(window.sessionStorage.getItem(BUY_NOW_STORAGE_KEY))
  return items
}

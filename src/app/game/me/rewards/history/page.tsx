'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Lịch sử đổi quà' }

type Redemption = { id: string; rewardName: string; rewardImageUrl: string | null; coinCost: number; status: 'pending' | 'received' | 'cancelled'; redeemedAt: string; receivedAt: string | null }
const formatDate = (date: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(date))
export default function RewardHistoryPage() {
  const [items, setItems] = useState<Redemption[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | Redemption['status']>('all')
  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try { const response = await fetch('/api/game/rewards?resource=redemptions', { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setItems(data.redemptions) }
    catch { setError('Không thể tải lịch sử đổi quà.') } finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  const markReceived = async (item: Redemption) => {
    try { const response = await fetch(`/api/game/rewards/redemptions/${encodeURIComponent(item.id)}/received`, { method: 'POST' }); if (!response.ok) throw new Error(); setItems(current => current.map(row => row.id === item.id ? { ...row, status: 'received', receivedAt: new Date().toISOString() } : row)) }
    catch { setError('Không thể cập nhật lịch sử đổi quà.') }
  }
  const cancelRedemption = async (item: Redemption) => {
    if (!window.confirm(`Hủy đổi quà ${item.rewardName} và hoàn ${item.coinCost} xu?`)) return
    try { const response = await fetch(`/api/game/rewards/redemptions/${encodeURIComponent(item.id)}/cancel`, { method: 'POST' }); if (!response.ok) throw new Error(); setItems(current => current.map(row => row.id === item.id ? { ...row, status: 'cancelled' } : row)) }
    catch { setError('Không thể hủy lượt đổi quà.') }
  }
  const filteredItems = filter === 'all' ? items : items.filter(item => item.status === filter)
  return <div className="space-y-6"><header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-black text-slate-900">Lịch sử đổi quà</h1><p className="mt-2 text-sm text-slate-500">Theo dõi quà bé đã đổi và xác nhận khi đã trao.</p></div><button type="button" onClick={() => void refresh()} disabled={loading} aria-label="Làm mới lịch sử" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-blue-700 disabled:opacity-50"><RefreshCw size={16} /></button></header>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
    <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc lịch sử đổi quà">{([['all', 'Tất cả'], ['pending', 'Chờ xác nhận'], ['received', 'Đã nhận'], ['cancelled', 'Đã hủy']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-xl px-4 py-2 text-sm font-bold ${filter === value ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{label}{value === 'all' ? ` (${items.length})` : ` (${items.filter(item => item.status === value).length})`}</button>)}</div>
    {loading ? <p className="rounded-2xl bg-white p-6 text-slate-500">Đang tải lịch sử…</p> : !filteredItems.length ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">{items.length ? 'Không có lượt đổi quà ở trạng thái này.' : 'Chưa có lượt đổi quà nào.'}</p> : <div className="space-y-3">{filteredItems.map(item => <article key={item.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">{item.rewardImageUrl ? <Image src={item.rewardImageUrl} alt="" width={56} height={56} className="h-14 w-14 rounded-xl bg-amber-50 object-contain" /> : <span className="grid h-14 w-14 place-items-center rounded-xl bg-amber-50 text-2xl">🎁</span>}<div className="min-w-0 flex-1"><p className="text-xs text-slate-500">{formatDate(item.redeemedAt)}</p><h2 className="font-black text-slate-800">{item.rewardName}</h2><p className="text-sm font-bold text-amber-600">{item.coinCost} xu</p></div><div className="text-right"><p className={`text-sm font-black ${item.status === 'pending' ? 'text-orange-600' : item.status === 'received' ? 'text-emerald-700' : 'text-slate-500'}`}>{item.status === 'pending' ? 'Chờ xác nhận' : item.status === 'received' ? 'Đã nhận' : 'Đã hủy · đã hoàn xu'}</p>{item.status === 'received' && item.receivedAt && <p className="mt-1 text-xs text-slate-500">{formatDate(item.receivedAt)}</p>}</div>{item.status === 'pending' && <div className="flex gap-2"><button type="button" onClick={() => void markReceived(item)} className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-black text-white">Xác nhận đã nhận</button><button type="button" onClick={() => void cancelRedemption(item)} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-600">Hủy và hoàn xu</button></div>}</article>)}</div>}</div>
}
